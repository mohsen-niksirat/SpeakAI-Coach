import { CoachRole, VoiceName, Provider } from '../types';
import {
  VoiceClient,
  VoiceClientCallbacks,
  getRolePrompt,
  TOOL_DECLARATIONS,
  handleToolCall,
} from './voice-client';
import { normalizeBaseUrl, cleanApiKey, isGoogleApiKey } from './providers';
import { t } from '../i18n/store';
import { ProviderError, asProviderError, classifyHttpStatus } from './errors';

interface ChatToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ChatToolCall[];
  tool_call_id?: string;
}

const SILENCE_COMMIT_MS = 1500;
const MAX_TOOL_HOPS = 4;
const GREETING_PROMPT =
  '(The speaking session has just begun. Greet the student warmly in English with one short sentence and one simple question.)';

const OPENROUTER_FALLBACK_MODELS = [
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3.8-27b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'inclusionai/ling-3.0-flash-sante:free',
];

const GROQ_FALLBACK_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
];

const CEREBRAS_FALLBACK_MODELS = [
  'llama-3.3-70b',
  'llama3.1-8b',
];

const GEMINI_REST_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
];

const INLINE_COACHING_TAG_INSTRUCTION = `

INLINE COACHING TAGS (when function tools are not called):
- Whenever the student makes a grammar, vocabulary, or phrasing mistake, append at the very end of your reply:
[[CORRECTION: exact phrase student wrote/said | natural native alternative | short explanation | grammar]]
- Whenever you introduce or notice a high-value B2/C1/C2 word or idiom, append at the very end of your reply:
[[VOCAB: word | IPA phonetic | short English definition | example sentence]]
Keep your conversational reply natural and concise (1-3 sentences) and place any [[...]] tags strictly at the end.`;

// Voice & Text Chat client for chat providers (and Gemini REST fallback): browser SpeechRecognition (STT)
// or direct text input → provider chat/completions or Gemini generateContent → browser speechSynthesis (TTS).
export class BrowserChatVoiceClient implements VoiceClient {
  private callbacks: VoiceClientCallbacks;
  private provider: Provider;
  private apiKey: string;
  private role: CoachRole;
  private topicPrompt?: string;
  private textOnly: boolean;

  private messages: ChatMessage[] = [];
  private recognition: any = null;
  private wantRunning = false;
  private muted = false;
  private stopped = false;
  private setupCompleted = false;
  private effectiveModel: string;
  private toolsDisabled = false;

  private utterance = '';
  private silenceTimer: number | null = null;

  private queue: Promise<void> = Promise.resolve();

  private speaking = false;
  private speakGen = 0;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor(
    callbacks: VoiceClientCallbacks,
    provider: Provider,
    apiKey: string,
    role: CoachRole,
    _voice: VoiceName,
    topicPrompt?: string,
    textOnly = false,
  ) {
    this.callbacks = callbacks;
    this.provider = provider;
    this.apiKey = cleanApiKey(apiKey);
    this.role = role;
    this.topicPrompt = topicPrompt;
    this.textOnly = textOnly;
    this.effectiveModel = (provider.model || '').trim();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.recognition || this.stopped) return;
    if (muted) {
      this.wantRunning = false;
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    } else if (!this.textOnly) {
      this.wantRunning = true;
      try {
        this.recognition.start();
      } catch {
        // ignore
      }
    }
  }

  connect() {
    this.messages = [
      {
        role: 'system',
        content: `${getRolePrompt(this.role, this.topicPrompt)}${INLINE_COACHING_TAG_INSTRUCTION}`,
      },
    ];

    const SR =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!this.textOnly && SR) {
      try {
        this.recognition = new SR();
        this.recognition.lang = 'en-US';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;

        this.recognition.onresult = (event: any) => {
          if (this.stopped || this.muted) return;
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              this.utterance += result[0].transcript;
            }
          }
          this.resetSilenceTimer();
        };

        this.recognition.onerror = (event: any) => {
          if (this.stopped) return;
          const code = event?.error;
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            this.textOnly = true;
            this.wantRunning = false;
            this.callbacks.onNotice?.(
              'دسترسی میکروفون بسته است — جلسه در حالت چت متنی ادامه دارد و می‌توانید پیام خود را تایپ کنید.',
            );
          }
        };

        this.recognition.onend = () => {
          if (this.stopped || !this.wantRunning || this.muted || this.textOnly) return;
          window.setTimeout(() => {
            if (this.stopped || !this.wantRunning || this.muted || this.textOnly || !this.recognition) return;
            try {
              this.recognition.start();
            } catch {
              // already started
            }
          }, 200);
        };
      } catch {
        this.textOnly = true;
      }
    } else if (!this.textOnly && !SR) {
      this.textOnly = true;
      this.callbacks.onNotice?.(
        'تشخیص گفتار صوتی در این مرورگر پشتیبانی نمی‌شود — حالت چت متنی هوشمند فعال شد.',
      );
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const load = () => {
        this.cachedVoices = window.speechSynthesis.getVoices();
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }

    this.enqueue(async () => {
      this.messages.push({ role: 'user', content: GREETING_PROMPT });
      await this.runAssistantTurn();
    });
  }

  private markReadyAndStartRecognition() {
    if (this.setupCompleted || this.stopped) return;
    this.setupCompleted = true;
    if (!this.textOnly && this.recognition) {
      this.wantRunning = true;
      try {
        this.recognition.start();
      } catch {
        // ignore double-start
      }
    }
    this.callbacks.onSetupComplete();
  }

  // Mic audio goes through SpeechRecognition instead of raw PCM chunks.
  sendAudioChunk(_base64Pcm: string) {
    // no-op
  }

  sendTextMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || this.stopped) return;

    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.utterance = '';

    if (this.speaking) {
      this.stopSpeaking();
    }

    this.callbacks.onTranscript('user', trimmed, true);
    this.enqueue(async () => {
      this.messages.push({ role: 'user', content: trimmed });
      await this.runAssistantTurn();
    });
  }

  private resetSilenceTimer() {
    if (this.silenceTimer !== null) clearTimeout(this.silenceTimer);
    this.silenceTimer = window.setTimeout(() => {
      this.silenceTimer = null;
      this.commitUtterance();
    }, SILENCE_COMMIT_MS);
  }

  private commitUtterance() {
    const text = this.utterance.trim();
    this.utterance = '';
    if (!text || this.stopped) return;

    if (this.speaking) {
      this.stopSpeaking(); // barge-in: cut the coach off
    }

    this.callbacks.onTranscript('user', text, true);
    this.enqueue(async () => {
      this.messages.push({ role: 'user', content: text });
      await this.runAssistantTurn();
    });
  }

  private enqueue(fn: () => Promise<void>) {
    this.queue = this.queue.then(fn).catch((err) => {
      if (this.stopped) return;
      this.callbacks.onError(asProviderError(err, t('err.unknown')));
    });
  }

  private isGeminiRest(): boolean {
    const base = normalizeBaseUrl(this.provider.baseUrl);
    return (
      /generativelanguage\.googleapis\.com|aiplatform\.googleapis\.com/i.test(base) ||
      isGoogleApiKey(this.apiKey)
    );
  }

  private async chatGeminiRest(): Promise<any> {
    const rawBase = normalizeBaseUrl(this.provider.baseUrl);
    const base =
      /generativelanguage\.googleapis\.com|aiplatform\.googleapis\.com/i.test(rawBase)
        ? rawBase
        : 'https://generativelanguage.googleapis.com';

    const initialModel =
      !this.effectiveModel || /native-audio|live/i.test(this.effectiveModel)
        ? 'gemini-2.5-flash'
        : this.effectiveModel.replace(/^models\//, '');

    const candidates = Array.from(new Set([initialModel, ...GEMINI_REST_FALLBACK_MODELS]));
    const systemMsg = this.messages.find((m) => m.role === 'system')?.content || '';
    const contents = this.messages
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content) }],
      }));

    let lastStatus = 500;
    let lastErrMsg = '';
    const payload = JSON.stringify({
      ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg }] } } : {}),
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 512 },
    });

    for (const model of candidates) {
      if (this.stopped) return null;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      try {
        const endpointUrl = /aiplatform\.googleapis\.com/i.test(base)
          ? `${base}/v1beta1/publishers/google/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`
          : `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
        let res = await fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: ctrl.signal,
        });
        clearTimeout(timer);

        // If AQ. key received 401/403 on generativelanguage.googleapis.com, try Vertex AI Express Mode
        if (!res.ok && (res.status === 401 || res.status === 403) && /^AQ\./i.test(this.apiKey) && !/aiplatform\.googleapis\.com/i.test(base)) {
          const vCtrl = new AbortController();
          const vTimer = setTimeout(() => vCtrl.abort(), 20000);
          try {
            const vRes = await fetch(
              `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                signal: vCtrl.signal,
              },
            );
            clearTimeout(vTimer);
            if (vRes.ok) {
              res = vRes;
            }
          } catch {
            clearTimeout(vTimer);
          }
        }

        if (res.ok) {
          const data = await res.json();
          const replyText =
            data?.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text || '')
              .join('') || '';
          if (replyText) {
            this.effectiveModel = model;
            return { choices: [{ message: { role: 'assistant', content: replyText } }] };
          }
        } else {
          lastStatus = res.status;
          const body = await res.json().catch(() => null);
          lastErrMsg = body?.error?.message || `HTTP ${res.status}`;
          if (/User location is not supported/i.test(lastErrMsg)) {
            throw new ProviderError(
              'setup_rejected',
              'User location is not supported for the API use — سرور API گوگل (generativelanguage.googleapis.com) موقعیت جغرافیایی فعلی را پشتیبانی نمی‌کند. علت در گوشی: برنامه فیلترشکن دامنه‌های googleapis.com را دور می‌زند (Split-Tunneling / قوانین Direct) یا سرور فعلی فیلترشکن برای API توسعه‌دهندگان گوگل مسدود است. راه‌حل: در فیلترشکن حالت مسیریابی (Routing) را روی Global / All بگذارید، یا سرور دیگری انتخاب کنید، یا از سرویس‌های بدون محدودیت آی‌پی مثل Groq و OpenRouter استفاده کنید.',
            );
          }
          if (res.status === 401 || res.status === 403 || /api_key_invalid|api key not valid|invalid authentication/i.test(lastErrMsg)) {
            throw new ProviderError('invalid_key', t('err.keyRejected', { msg: lastErrMsg }));
          }
        }
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof ProviderError) throw err;
        lastErrMsg = err instanceof Error ? err.message : String(err);
      }
    }

    throw new ProviderError(
      classifyHttpStatus(lastStatus, lastErrMsg),
      lastErrMsg || t('err.providerError', { status: lastStatus }),
    );
  }

  private buildCandidateModels(base: string): string[] {
    const primary = this.effectiveModel || this.provider.model || 'gpt-4o-mini';
    if (/openrouter\.ai/i.test(base)) {
      return Array.from(new Set([primary, ...OPENROUTER_FALLBACK_MODELS]));
    }
    if (/groq\.com/i.test(base)) {
      return Array.from(new Set([primary, ...GROQ_FALLBACK_MODELS]));
    }
    if (/cerebras\.ai/i.test(base)) {
      return Array.from(new Set([primary, ...CEREBRAS_FALLBACK_MODELS]));
    }
    return [primary];
  }

  private async chat(): Promise<any> {
    if (this.isGeminiRest()) {
      return this.chatGeminiRest();
    }

    const base = normalizeBaseUrl(this.provider.baseUrl) || 'https://api.openai.com/v1';
    const isOpenRouter = /openrouter\.ai/i.test(base);
    const candidates = this.buildCandidateModels(base);

    let lastStatus = 500;
    let lastMessage = '';

    for (let i = 0; i < candidates.length; i++) {
      const candidateModel = candidates[i];
      // OpenRouter :free and router models often return 404 when 'tools' is requested
      const isFreeRouterModel = isOpenRouter && (/:free$/i.test(candidateModel) || candidateModel === 'openrouter/free');
      const tryToolsFirst = !this.toolsDisabled && !isFreeRouterModel && i === 0;

      const modes = tryToolsFirst ? [true, false] : [false];

      for (const useTools of modes) {
        if (this.stopped) return null;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 30000);
        let res: Response;
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          };
          if (isOpenRouter && typeof window !== 'undefined') {
            headers['HTTP-Referer'] = window.location.origin || 'https://mohsen-niksirat.github.io';
            headers['X-Title'] = 'SpeakAI Coach';
          }

          const cleanMessages = useTools
            ? this.messages
            : this.messages
                .filter((m) => m.role !== 'tool' && !m.tool_calls)
                .map((m) => ({ role: m.role, content: m.content || '' }));

          res = await fetch(`${base}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: candidateModel,
              temperature: 0.6,
              messages: cleanMessages,
              ...(useTools
                ? {
                    tools: TOOL_DECLARATIONS.map((td) => ({ type: 'function', function: td })),
                    tool_choice: 'auto',
                  }
                : {}),
            }),
            signal: ctrl.signal,
          });
        } catch {
          clearTimeout(timer);
          throw new ProviderError('network', t('err.chatTimeout'));
        } finally {
          clearTimeout(timer);
        }

        if (res.ok) {
          const json = await res.json();
          if (candidateModel !== this.effectiveModel) {
            this.effectiveModel = candidateModel;
            this.callbacks.onNotice?.(
              t('notice.modelFallback', { old: this.provider.model, new: candidateModel }),
            );
          }
          if (!useTools && tryToolsFirst) {
            this.toolsDisabled = true;
          }
          return json;
        }

        lastStatus = res.status;
        try {
          const errBody = await res.json();
          lastMessage =
            errBody?.error?.message ||
            errBody?.message ||
            (typeof errBody?.error === 'string' ? errBody.error : '');
        } catch {
          lastMessage = '';
        }

        // If the API key itself is rejected (401/403), stop trying other models immediately
        if (res.status === 401 || res.status === 403) {
          throw new ProviderError(
            'invalid_key',
            t('err.keyRejected', { msg: lastMessage || `HTTP ${res.status}` }),
          );
        }

        // If tools caused a 400/404/422 error, disable tools and retry same model without tools
        if (useTools) {
          this.toolsDisabled = true;
          continue;
        }
      }
    }

    const detail = lastMessage ? `${t('err.providerError', { status: lastStatus })} (${lastMessage})` : t('err.providerError', { status: lastStatus });
    throw new ProviderError(classifyHttpStatus(lastStatus, lastMessage), detail);
  }

  private async runAssistantTurn(): Promise<void> {
    for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
      if (this.stopped) return;
      const data = await this.chat();
      if (!data || this.stopped) return;
      const message = data?.choices?.[0]?.message;
      if (!message) throw new Error(t('err.emptyResponse'));

      this.markReadyAndStartRecognition();

      if (message.tool_calls?.length) {
        this.messages.push(message);
        for (const tc of message.tool_calls as ChatToolCall[]) {
          let args: Record<string, unknown> = {};
          try {
            args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
          } catch {
            console.warn('Could not parse tool arguments:', tc.function?.arguments);
          }
          const result = handleToolCall(tc.function.name, args);
          if (result?.card) this.callbacks.onVocabDiscovered(result.card);
          if (result?.feedback) this.callbacks.onFeedbackGiven(result.feedback);
          this.messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify({ status: 'recorded' }),
          });
        }
        continue;
      }

      const rawText = String(message.content ?? '').trim();
      const cleanText = this.extractInlineCoachingTags(rawText);
      this.messages.push({ role: 'assistant', content: cleanText || rawText });
      if (cleanText) {
        this.callbacks.onTranscript('model', cleanText, true);
        this.speak(cleanText);
      }
      return;
    }
  }

  private extractInlineCoachingTags(text: string): string {
    if (!text) return '';
    let cleaned = text;

    const corrRegex = /\[\[\s*CORRECTION\s*:\s*([^\]]+?)\s*\]\]/gi;
    let match: RegExpExecArray | null;
    while ((match = corrRegex.exec(text)) !== null) {
      const parts = match[1].split('|').map((s) => s.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const rawType = (parts[3] || 'grammar').toLowerCase();
        const type =
          rawType === 'vocabulary' || rawType === 'pronunciation' ? rawType : 'grammar';
        const res = handleToolCall('flag_grammar_mistake', {
          userSpoke: parts[0],
          betterAlternative: parts[1],
          explanation: parts[2] || 'Suggested native phrasing.',
          type,
        });
        if (res?.feedback) this.callbacks.onFeedbackGiven(res.feedback);
      }
    }
    cleaned = cleaned.replace(corrRegex, '');

    const vocabRegex = /\[\[\s*VOCAB\s*:\s*([^\]]+?)\s*\]\]/gi;
    while ((match = vocabRegex.exec(text)) !== null) {
      const parts = match[1].split('|').map((s) => s.trim());
      if (parts.length >= 2 && parts[0]) {
        const res = handleToolCall('record_vocabulary', {
          word: parts[0],
          phonetic: parts.length >= 3 ? parts[1] : '',
          definition: parts.length >= 3 ? parts[2] : parts[1],
          contextSentence: parts[3] || parts[2] || parts[0],
        });
        if (res?.card) this.callbacks.onVocabDiscovered(res.card);
      }
    }
    cleaned = cleaned.replace(vocabRegex, '');

    return cleaned.trim();
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    const voices = this.cachedVoices.length ? this.cachedVoices : window.speechSynthesis.getVoices();
    return (
      voices.find((v) => /^en[-_]US/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      voices[0] ||
      null
    );
  }

  private speak(text: string) {
    if (!('speechSynthesis' in window) || this.stopped) return;

    this.stopSpeaking();
    const gen = ++this.speakGen;
    const sentences = (text.match(/[^.!?]+[.!?]*/g) || [text])
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (sentences.length === 0) return;

    this.speaking = true;
    this.callbacks.onTalkingChange?.(true);

    let index = 0;
    const speakNext = () => {
      if (gen !== this.speakGen || this.stopped) return;
      if (index >= sentences.length) {
        this.speaking = false;
        this.callbacks.onTalkingChange?.(false);
        return;
      }
      const utter = new SpeechSynthesisUtterance(sentences[index++]);
      const voice = this.pickVoice();
      if (voice) utter.voice = voice;
      utter.lang = voice?.lang || 'en-US';
      utter.rate = 1.0;
      utter.onend = () => speakNext();
      utter.onerror = () => speakNext();
      window.speechSynthesis.speak(utter);
    };

    window.setTimeout(() => {
      if (gen === this.speakGen) speakNext();
    }, 50);
  }

  private stopSpeaking() {
    this.speakGen += 1;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.speaking) {
      this.speaking = false;
      this.callbacks.onTalkingChange?.(false);
    }
  }

  disconnect() {
    this.stopped = true;
    this.wantRunning = false;
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.stopSpeaking();
  }
}
