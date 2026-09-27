import { CoachRole, VoiceName, Provider } from '../types';
import { VoiceClient, VoiceClientCallbacks, getRolePrompt, TOOL_DECLARATIONS, handleToolCall } from './voice-client';

const MAX_SETUP_STAGE = 2; // 0: full, 1: no transcription, 2: minimal

function geminiType(value: string): string {
  return value === 'object' ? 'OBJECT' : value === 'string' ? 'STRING' : value;
}

function toGeminiTool(decl: (typeof TOOL_DECLARATIONS)[number]) {
  const params = decl.parameters as unknown as {
    type: string;
    properties: Record<string, { type: string; enum?: string[]; description?: string }>;
    required: string[];
  };
  return {
    name: decl.name,
    description: decl.description,
    parameters: {
      type: geminiType(params.type),
      properties: Object.fromEntries(
        Object.entries(params.properties).map(([key, prop]) => [
          key,
          {
            type: geminiType(prop.type),
            ...(prop.enum ? { enum: prop.enum } : {}),
            ...(prop.description ? { description: prop.description } : {}),
          },
        ]),
      ),
      required: params.required,
    },
  };
}

function stripModelsPrefix(model: string): string {
  return model.replace(/^models\//, '');
}

export class GeminiLiveClient implements VoiceClient {
  private ws: WebSocket | null = null;
  private callbacks: VoiceClientCallbacks;
  private provider: Provider;
  private apiKey: string;
  private role: CoachRole;
  private voice: VoiceName;

  private stage = 0;
  private setupDone = false;
  private effectiveModel = '';
  private notices: string[] = [];
  private disposed = false;

  constructor(callbacks: VoiceClientCallbacks, provider: Provider, apiKey: string, role: CoachRole, voice: VoiceName) {
    this.callbacks = callbacks;
    this.provider = provider;
    this.apiKey = apiKey;
    this.role = role;
    this.voice = voice;
  }

  connect() {
    this.preflight()
      .then(() => {
        if (!this.disposed) this.openSocket();
      })
      .catch((err) => {
        if (this.disposed) return;
        this.callbacks.onError(err instanceof Error ? err.message : String(err));
      });
  }

  // Classifies failures before opening the socket: network block, invalid
  // key, or missing model — each with a distinct, actionable message.
  private async preflight(): Promise<void> {
    const base = (this.provider.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
    const model = stripModelsPrefix(this.provider.model);
    this.effectiveModel = model;

    const fetchWithTimeout = async (url: string): Promise<Response> => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        return await fetch(url, { signal: ctrl.signal });
      } catch {
        throw new Error(
          `Cannot reach ${base} — the network or VPN is blocking this endpoint. Try another VPN.`,
        );
      } finally {
        clearTimeout(timer);
      }
    };

    const res = await fetchWithTimeout(`${base}/v1beta/models/${encodeURIComponent(model)}?key=${this.apiKey}`);

    if (res.status === 200) return;

    if (res.status === 404) {
      try {
        const listRes = await fetchWithTimeout(`${base}/v1beta/models?key=${this.apiKey}`);
        if (listRes.ok) {
          const data = await listRes.json();
          const live: string[] = (data.models ?? [])
            .map((m: { name?: string }) => String(m.name ?? ''))
            .filter((n: string) => /live|native-audio/i.test(n));
          if (live.length > 0) {
            const preferred = live.find((n) => /gemini-live/i.test(n)) ?? live[0];
            const found = stripModelsPrefix(preferred);
            if (found !== model) {
              this.effectiveModel = found;
              this.notices.push(
                `Model "${model}" is not available for this key — using "${found}" instead. You can update it in Settings.`,
              );
            }
          }
        }
      } catch {
        // discovery is best-effort; the WebSocket attempt is the source of truth
      }
      return;
    }

    let message = `HTTP ${res.status} from ${base}`;
    try {
      const body = await res.json();
      message = body?.error?.message || message;
    } catch {
      // keep the status fallback
    }
    if (res.status === 403 || /api key/i.test(message)) {
      throw new Error(`API key rejected: ${message}`);
    }
    throw new Error(message);
  }

  private openSocket() {
    const base = (this.provider.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
    const url = `${base}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.sendSetup();
    };

    this.ws.onmessage = (event) => {
      this.handleServerMessage(event.data);
    };

    this.ws.onerror = () => {
      if (!this.disposed && !this.setupDone) {
        this.callbacks.onError('WebSocket connection error. Check your API key, base URL and network.');
      }
    };

    this.ws.onclose = (event) => {
      if (this.disposed) return;
      // 1008 = the server rejected our setup message. Retry with fewer
      // optional fields to isolate the offending one instead of failing.
      if (!this.setupDone && event.code === 1008 && this.stage < MAX_SETUP_STAGE) {
        this.stage += 1;
        if (this.ws) {
          this.ws.onclose = null;
          this.ws.onerror = null;
          this.ws.onmessage = null;
          this.ws = null;
        }
        this.openSocket();
        return;
      }
      this.callbacks.onClose(event.code, event.reason || '');
    };
  }

  private sendSetup() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setup: Record<string, unknown> = {
      model: `models/${this.effectiveModel}`,
      generationConfig: {
        responseModalities: ['audio'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: this.voice,
            },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: getRolePrompt(this.role) }],
      },
    };

    if (this.stage <= 1) {
      (setup as Record<string, unknown>).inputAudioTranscription = { languageCodes: ['en'] };
      (setup as Record<string, unknown>).outputAudioTranscription = { languageCodes: ['en'] };
    }
    if (this.stage === 0) {
      setup.tools = [
        {
          functionDeclarations: TOOL_DECLARATIONS.map(toGeminiTool),
        },
      ];
    }

    this.ws.send(JSON.stringify({ setup }));
  }

  sendAudioChunk(base64Pcm16: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const realtimeInput = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Pcm16,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(realtimeInput));
  }

  private handleServerMessage(data: string) {
    try {
      const msg = JSON.parse(data);

      if (msg.setupComplete) {
        this.setupDone = true;
        if (this.stage > 0) {
          this.notices.push(
            this.stage === 1
              ? 'Connected without live transcription — this endpoint rejected the transcription fields.'
              : 'Connected in basic mode — transcription and live tools were rejected by this endpoint.',
          );
        }
        for (const n of this.notices) this.callbacks.onNotice?.(n);
        this.notices = [];
        this.callbacks.onSetupComplete();
        return;
      }

      if (msg.serverContent?.modelTurn?.parts) {
        for (const part of msg.serverContent.modelTurn.parts) {
          if (part.inlineData?.data) {
            this.callbacks.onAudioData(part.inlineData.data);
          }
        }
      }

      const inputT = msg.serverContent?.inputTranscription;
      if (inputT?.text) {
        this.callbacks.onTranscript('user', inputT.text, !!inputT.finished);
      }

      const outputT = msg.serverContent?.outputTranscription;
      if (outputT?.text) {
        this.callbacks.onTranscript('model', outputT.text, !!outputT.finished);
      }

      if (msg.serverContent?.interrupted) {
        this.callbacks.onInterrupted();
      }

      if (msg.toolCall?.functionCalls) {
        const functionResponses = [];

        for (const call of msg.toolCall.functionCalls) {
          const result = handleToolCall(call.name, call.args || {});
          if (result?.card) this.callbacks.onVocabDiscovered(result.card);
          if (result?.feedback) this.callbacks.onFeedbackGiven(result.feedback);
          functionResponses.push({
            name: call.name,
            id: call.id,
            response: {
              result: result?.card
                ? 'Saved to student flashcards.'
                : result?.feedback
                  ? 'Logged for feedback report.'
                  : 'Unknown tool.',
            },
          });
        }

        if (functionResponses.length > 0) {
          this.ws?.send(
            JSON.stringify({
              toolResponse: {
                functionResponses,
              },
            })
          );
        }
      }
    } catch (err) {
      console.error('Error parsing live WS payload:', err);
    }
  }

  disconnect() {
    this.disposed = true;
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.close();
    }
  }
}
