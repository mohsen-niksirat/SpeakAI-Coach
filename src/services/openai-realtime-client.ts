import { CoachRole, VoiceName, Provider } from '../types';
import {
  VoiceClient,
  VoiceClientCallbacks,
  getRolePrompt,
  toWebSocketUrl,
  TOOL_DECLARATIONS,
  handleToolCall,
} from './voice-client';
import { t } from '../i18n/store';
import { ProviderError, classifyCloseCode, classifyHttpStatus, ProviderErrorKind } from './errors';

interface FunctionCallItem {
  call_id?: string;
  name?: string;
  arguments?: string;
}

export class OpenAIRealtimeClient implements VoiceClient {
  private ws: WebSocket | null = null;
  private callbacks: VoiceClientCallbacks;
  private provider: Provider;
  private apiKey: string;
  private role: CoachRole;
  private voice: VoiceName;
  private topicPrompt?: string;

  private sessionReady = false;
  private updateSent = false;
  private disposed = false;
  private handledCallIds = new Set<string>();
  private pendingModelTranscript = '';

  constructor(
    callbacks: VoiceClientCallbacks,
    provider: Provider,
    apiKey: string,
    role: CoachRole,
    voice: VoiceName,
    topicPrompt?: string,
  ) {
    this.callbacks = callbacks;
    this.provider = provider;
    this.apiKey = apiKey;
    this.role = role;
    this.voice = voice;
    this.topicPrompt = topicPrompt;
  }

  connect() {
    const base = toWebSocketUrl((this.provider.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, ''));
    const url = `${base}/realtime?model=${encodeURIComponent(this.provider.model)}&api_key=${encodeURIComponent(this.apiKey)}`;

    try {
      this.ws = new WebSocket(url, [
        'realtime',
        `openai-insecure-api-key.${this.apiKey}`,
        'openai-beta.realtime-v1',
      ]);
    } catch (err) {
      this.callbacks.onError(new ProviderError('network', t('err.realtimeOpen')));
      return;
    }

    this.ws.onopen = () => {
      this.sendSessionUpdate();
    };

    this.ws.onmessage = (event) => {
      const raw = event.data;
      if (typeof raw === 'string') {
        this.handleServerMessage(raw);
      } else if (typeof Blob !== 'undefined' && raw instanceof Blob) {
        raw
          .text()
          .then((text) => {
            if (!this.disposed) this.handleServerMessage(text);
          })
          .catch((err) => {
            console.error('Error reading realtime WS Blob payload:', err);
          });
      } else if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) {
        const text = new TextDecoder().decode(raw);
        this.handleServerMessage(text);
      }
    };

    this.ws.onerror = () => {
      if (this.disposed) return;
      this.callbacks.onError(new ProviderError('network', t('err.wsGeneric')));
    };

    this.ws.onclose = (event) => {
      if (this.disposed) return;
      this.callbacks.onClose(event.code, event.reason || '', classifyCloseCode(event.code, event.reason || ''));
    };
  }

  private send(obj: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  private sendSessionUpdate() {
    if (this.updateSent) return;
    this.updateSent = true;

    this.send({
      type: 'session.update',
      session: {
        modalities: ['audio', 'text'],
        instructions: getRolePrompt(this.role, this.topicPrompt),
        voice: this.voice || 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
          create_response: true,
          interrupt_response: true,
        },
        tools: TOOL_DECLARATIONS.map((t) => ({ type: 'function', ...t })),
        tool_choice: 'auto',
      },
    });
  }

  sendAudioChunk(base64Pcm24: string) {
    if (!this.sessionReady) return;
    this.send({ type: 'input_audio_buffer.append', audio: base64Pcm24 });
  }

  private emitModelTranscript(text: string, finished: boolean) {
    if (!text) return;
    this.callbacks.onTranscript('model', text, finished);
  }

  private flushModelTranscript() {
    if (this.pendingModelTranscript) {
      this.emitModelTranscript(this.pendingModelTranscript, true);
      this.pendingModelTranscript = '';
    }
  }

  private handleFunctionCall(item: FunctionCallItem) {
    const callId = item.call_id;
    if (!callId || !item.name || this.handledCallIds.has(callId)) return;
    this.handledCallIds.add(callId);

    let args: Record<string, unknown> = {};
    try {
      args = item.arguments ? JSON.parse(item.arguments) : {};
    } catch {
      console.warn('Could not parse function call arguments:', item.arguments);
    }

    const result = handleToolCall(item.name, args);
    if (result?.card) this.callbacks.onVocabDiscovered(result.card);
    if (result?.feedback) this.callbacks.onFeedbackGiven(result.feedback);

    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify({ status: 'recorded' }),
      },
    });
  }

  private handleServerError(payload: { code?: number | string; message?: string }) {
    const message = payload?.message || 'Realtime API error';
    const rawCode = payload?.code;
    const numericCode = typeof rawCode === 'number' ? rawCode : undefined;
    const kind: ProviderErrorKind = numericCode
      ? classifyHttpStatus(numericCode, message)
      : classifyHttpStatus(0, `${rawCode ?? ''} ${message}`);
    const fatal =
      !this.sessionReady ||
      kind === 'invalid_key' ||
      kind === 'rate_limited' ||
      kind === 'model_unavailable';

    if (fatal) {
      this.callbacks.onError(new ProviderError(kind, message));
    } else {
      console.warn('Realtime API warning:', message);
    }
  }

  private handleServerMessage(data: string) {
    if (this.disposed) return;
    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case 'session.created':
          this.sendSessionUpdate();
          break;

        case 'session.updated':
          if (!this.sessionReady) {
            this.sessionReady = true;
            this.callbacks.onSetupComplete();
            this.send({ type: 'response.create' });
          }
          break;

        case 'input_audio_buffer.speech_started':
          this.callbacks.onInterrupted();
          break;

        case 'conversation.item.input_audio_transcription.completed':
          if (msg.transcript) {
            this.callbacks.onTranscript('user', msg.transcript, true);
          }
          break;

        case 'response.audio.delta':
        case 'response.output_audio.delta':
          if (msg.delta) this.callbacks.onAudioData(msg.delta);
          break;

        case 'response.audio_transcript.delta':
        case 'response.output_audio_transcript.delta':
          if (msg.delta) this.pendingModelTranscript += msg.delta;
          break;

        case 'response.audio_transcript.done':
        case 'response.output_audio_transcript.done':
          if (msg.transcript) {
            this.pendingModelTranscript = '';
            this.emitModelTranscript(msg.transcript, true);
          } else {
            this.flushModelTranscript();
          }
          break;

        case 'response.function_call_arguments.done':
          this.handleFunctionCall({
            call_id: msg.call_id,
            name: msg.name,
            arguments: msg.arguments,
          });
          break;

        case 'response.output_item.done':
          if (msg.item?.type === 'function_call') {
            this.handleFunctionCall(msg.item);
          }
          break;

        case 'response.cancelled':
        case 'response.done':
          this.flushModelTranscript();
          break;

        case 'error':
          this.handleServerError(msg.error || {});
          break;

        default:
          break;
      }
    } catch (err) {
      console.error('Error parsing realtime WS payload:', err);
    }
  }

  disconnect() {
    this.disposed = true;
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    }
  }
}
