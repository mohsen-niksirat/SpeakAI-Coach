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
import { ProviderError, asProviderError, classifyCloseCode, classifyHttpStatus } from './errors';
import { cleanApiKey } from './providers';

const MAX_SETUP_STAGE = 3; // 0: full … 3: bare (model + system prompt only)
const MAX_MODEL_HOPS = 5;
const SOCKET_WATCHDOG_MS = 12000;

// Used when the models list cannot be fetched; newest first.
const HARDCODED_LIVE_MODELS = [
  'gemini-2.5-flash-native-audio-latest',
  'gemini-2.5-flash-native-audio-preview-12-2025',
  'gemini-3.1-flash-live-preview',
  'gemini-2.0-flash-live-001',
  'gemini-live-2.5-flash',
  'gemini-live-2.5-flash-preview',
];

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

const MODEL_ERROR_RE = /not found|not supported|unknown model|does not exist|invalid model|unavailable/i;

export class GeminiLiveClient implements VoiceClient {
  private ws: WebSocket | null = null;
  private callbacks: VoiceClientCallbacks;
  private provider: Provider;
  private apiKey: string;
  private role: CoachRole;
  private voice: VoiceName;
  private topicPrompt?: string;

  private stage = 0;
  private modelIdx = 0;
  private modelHops = 0;
  private stallRetries = 0;
  private socketOpened = false;
  private socketTimer: ReturnType<typeof setTimeout> | null = null;
  private candidates: string[] = [];
  private setupDone = false;
  private effectiveModel = '';
  private notices: string[] = [];
  private disposed = false;
  private messageQueue: Promise<void> = Promise.resolve();

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
    this.apiKey = cleanApiKey(apiKey);
    this.role = role;
    this.voice = voice;
    this.topicPrompt = topicPrompt;
  }

  connect() {
    this.preflight()
      .then(() => {
        if (!this.disposed) this.openSocket();
      })
      .catch((err) => {
        if (this.disposed) return;
        this.callbacks.onError(asProviderError(err, t('err.unknown')));
      });
  }

  // One models.list call both validates network/key and builds the queue of
  // models we can fall back to when the configured one is rejected by WS.
  private async preflight(): Promise<void> {
    const rawBase = (this.provider.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
    const base = /api\.openai\.com|groq\.com|openrouter\.ai/i.test(rawBase)
      ? 'https://generativelanguage.googleapis.com'
      : rawBase;
    const configured = stripModelsPrefix(this.provider.model);
    this.candidates = [configured];
    this.effectiveModel = configured;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(`${base}/v1beta/models?key=${encodeURIComponent(this.apiKey)}&pageSize=1000`, {
        signal: ctrl.signal,
      });
    } catch {
      throw new ProviderError('network', t('err.cannotReach', { base }));
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      let message = t('err.http', { status: res.status, base });
      try {
        const body = await res.json();
        message = body?.error?.message || message;
      } catch {
        // keep the status fallback
      }
      if (/User location is not supported/i.test(message)) {
        throw new ProviderError(
          'setup_rejected',
          'User location is not supported for the API use — سرور API گوگل (generativelanguage.googleapis.com) موقعیت جغرافیایی فعلی را پشتیبانی نمی‌کند. علت در گوشی: برنامه فیلترشکن دامنه‌های googleapis.com را دور می‌زند (Split-Tunneling / قوانین Direct) یا سرور فعلی فیلترشکن برای API توسعه‌دهندگان گوگل مسدود است. راه‌حل: در فیلترشکن حالت مسیریابی (Routing) را روی Global / All بگذارید، یا سرور دیگری انتخاب کنید، یا از سرویس‌های بدون محدودیت آی‌پی مثل Groq و OpenRouter استفاده کنید.',
        );
      }
      if (/Expected OAuth 2 access token/i.test(message)) {
        const preview = this.apiKey
          ? `${this.apiKey.slice(0, 6)}...${this.apiKey.slice(-4)}`
          : 'خالی';
        if (!/^AIza/i.test(this.apiKey)) {
          message = `${message} — کلید ذخیره‌شده فعلی («${preview}») فرمت کلید Google AI Studio (که با AIzaSy شروع می‌شود) را ندارد. لطفاً در تنظیمات روی آیکون مداد کنار Google Gemini بزنید و کلید صحیح (AIzaSy...) را وارد و ذخیره کنید.`;
        } else {
          message = `${message} — کلید («${preview}») توسط سرور گوگل پذیرفته نشد. لطفاً کلید را در تنظیمات بررسی یا کلید جدیدی از aistudio.google.com دریافت کنید.`;
        }
      }
      const kind = classifyHttpStatus(res.status, message);
      if (kind === 'invalid_key') {
        throw new ProviderError('invalid_key', t('err.keyRejected', { msg: message }));
      }
      throw new ProviderError(kind, message);
    }

    try {
      const data = await res.json();
      const entries: Array<{ name: string; methods: string[] }> = (data.models ?? []).map(
        (m: { name?: string; supportedGenerationMethods?: string[] }) => ({
          name: stripModelsPrefix(String(m.name ?? '')),
          methods: m.supportedGenerationMethods ?? [],
        }),
      );
      const bidi = entries.filter((m) => m.methods.includes('bidiGenerateContent')).map((m) => m.name);
      const liveNamed = entries.filter((m) => /live|native-audio/i.test(m.name)).map((m) => m.name);
      const pool = bidi.length > 0 ? bidi : liveNamed;

      // If the API explicitly tells us which models support bidiGenerateContent and the
      // configured model is not among them, start directly with the first supported bidi model.
      if (bidi.length > 0 && !bidi.includes(configured)) {
        this.candidates = [];
        for (const name of [...bidi, configured, ...HARDCODED_LIVE_MODELS]) {
          if (name && !this.candidates.includes(name)) this.candidates.push(name);
        }
        this.effectiveModel = this.candidates[0];
        this.notices.push(
          t('notice.modelFallback', {
            old: configured,
            new: this.effectiveModel,
          }),
        );
      } else {
        for (const name of [...pool, ...HARDCODED_LIVE_MODELS]) {
          if (name && !this.candidates.includes(name)) this.candidates.push(name);
        }
      }
    } catch {
      for (const name of HARDCODED_LIVE_MODELS) {
        if (!this.candidates.includes(name)) this.candidates.push(name);
      }
    }
  }

  private clearSocketTimer() {
    if (this.socketTimer !== null) {
      clearTimeout(this.socketTimer);
      this.socketTimer = null;
    }
  }

  private restartSocket() {
    this.clearSocketTimer();
    if (this.ws) {
      const old = this.ws;
      this.ws = null;
      old.onclose = null;
      old.onerror = null;
      old.onmessage = null;
      old.onopen = null;
      try {
        old.close();
      } catch {
        // already closed
      }
    }
    this.openSocket();
  }

  private openSocket() {
    const rawBase = (this.provider.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
    const safeBase = /api\.openai\.com|groq\.com|openrouter\.ai/i.test(rawBase)
      ? 'https://generativelanguage.googleapis.com'
      : rawBase;
    const base = toWebSocketUrl(safeBase);
    const url = `${base}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(this.apiKey)}`;

    this.ws = new WebSocket(url);
    this.socketOpened = false;

    this.ws.onopen = () => {
      this.socketOpened = true;
      this.sendSetup();
    };

    this.ws.onmessage = (event) => {
      const raw = event.data;
      this.messageQueue = this.messageQueue
        .then(async () => {
          if (this.disposed) return;
          if (typeof raw === 'string') {
            this.handleServerMessage(raw);
          } else if (typeof Blob !== 'undefined' && raw instanceof Blob) {
            const text = await raw.text();
            if (!this.disposed) this.handleServerMessage(text);
          } else if (raw instanceof ArrayBuffer) {
            const text = new TextDecoder().decode(raw);
            if (!this.disposed) this.handleServerMessage(text);
          } else if (ArrayBuffer.isView(raw)) {
            const text = new TextDecoder().decode(raw);
            if (!this.disposed) this.handleServerMessage(text);
          }
        })
        .catch((err) => {
          console.error('Error reading live WS payload:', err);
        });
    };

    this.ws.onerror = () => {
      if (!this.disposed && !this.setupDone) {
        this.callbacks.onError(new ProviderError('network', t('err.wsGeneric')));
      }
    };

    this.ws.onclose = (event) => {
      this.clearSocketTimer();
      if (this.disposed) return;
      if (!this.setupDone && (event.code === 1008 || event.code === 1007)) {
        const reason = event.reason || '';
        if (/location.*not supported/i.test(reason)) {
          this.callbacks.onClose(event.code, reason, 'setup_rejected');
          return;
        }
        // Model rejected → jump to the next candidate (fresh full setup).
        if (
          MODEL_ERROR_RE.test(reason) &&
          this.modelIdx + 1 < this.candidates.length &&
          this.modelHops < MAX_MODEL_HOPS
        ) {
          this.modelHops += 1;
          this.modelIdx += 1;
          this.effectiveModel = this.candidates[this.modelIdx];
          this.stage = 0;
          this.notices.push(
            t('notice.modelFallback', {
              old: this.candidates[this.modelIdx - 1],
              new: this.effectiveModel,
            }),
          );
          this.restartSocket();
          return;
        }
        // Setup field rejected → strip more optional fields.
        if (this.stage < MAX_SETUP_STAGE) {
          this.stage += 1;
          this.restartSocket();
          return;
        }
        // Even bare setup failed on this model → try the next model candidate.
        if (this.modelIdx + 1 < this.candidates.length && this.modelHops < MAX_MODEL_HOPS) {
          this.modelHops += 1;
          this.modelIdx += 1;
          this.effectiveModel = this.candidates[this.modelIdx];
          this.stage = 0;
          this.notices.push(
            t('notice.modelFallback', {
              old: this.candidates[this.modelIdx - 1],
              new: this.effectiveModel,
            }),
          );
          this.restartSocket();
          return;
        }
      }
      this.callbacks.onClose(event.code, event.reason || '', classifyCloseCode(event.code, event.reason || ''));
    };

    // If the socket opens but setupComplete never arrives, the VPN is
    // likely stalling the live connection — fail fast with a clear cause.
    this.clearSocketTimer();
    this.socketTimer = setTimeout(() => {
      if (this.disposed || this.setupDone) return;
      if (this.stallRetries < 1) {
        this.stallRetries += 1;
        this.restartSocket();
        return;
      }
      if (!this.socketOpened) {
        this.callbacks.onError(new ProviderError('network', t('err.stallHandshake')));
      } else {
        this.callbacks.onError(new ProviderError('network', t('err.stallSetup')));
      }
    }, SOCKET_WATCHDOG_MS);
  }

  private sendSetup() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setup: Record<string, unknown> = {
      model: `models/${this.effectiveModel}`,
      systemInstruction: {
        parts: [{ text: getRolePrompt(this.role, this.topicPrompt) }],
      },
    };

    if (this.stage <= 2) {
      setup.generationConfig = {
        responseModalities: ['AUDIO'],
        ...(this.stage <= 1 && this.voice
          ? {
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: this.voice,
                  },
                },
              },
            }
          : {}),
      };
    }
    if (this.stage <= 1) {
      setup.inputAudioTranscription = {};
      setup.outputAudioTranscription = {};
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

  setMuted(muted: boolean) {
    if (muted && this.ws && this.ws.readyState === WebSocket.OPEN && this.setupDone) {
      this.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    }
  }

  sendAudioChunk(base64Pcm16: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupDone) return;

    const realtimeInput = {
      realtimeInput: {
        audio: {
          mimeType: 'audio/pcm;rate=16000',
          data: base64Pcm16,
        },
      },
    };

    this.ws.send(JSON.stringify(realtimeInput));
  }

  private handleServerMessage(data: string) {
    try {
      const msg = JSON.parse(data);

      if (msg.setupComplete) {
        this.clearSocketTimer();
        this.setupDone = true;
        if (this.stage > 0) {
          this.notices.push(
            this.stage === 1
              ? t('notice.stage1')
              : this.stage === 2
                ? t('notice.stage2')
                : t('notice.stage3'),
          );
        }
        const combined = this.notices.join(' ');
        if (combined) this.callbacks.onNotice?.(combined);
        this.notices = [];
        this.callbacks.onSetupComplete();
        const greetingPrompt =
          'Hello! Please greet me briefly according to your persona and ask your opening question.';
        if (/^gemini-3/i.test(this.effectiveModel)) {
          this.ws?.send(
            JSON.stringify({
              realtimeInput: {
                text: greetingPrompt,
              },
            }),
          );
        } else {
          this.ws?.send(
            JSON.stringify({
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [{ text: greetingPrompt }],
                  },
                ],
                turnComplete: true,
              },
            }),
          );
        }
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
    this.clearSocketTimer();
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
