import { CoachRole, VoiceName, Provider } from '../types';
import {
  VoiceClient,
  VoiceClientCallbacks,
  getRolePrompt,
  TOOL_DECLARATIONS,
  handleToolCall,
} from './voice-client';
import { normalizeBaseUrl } from './providers';
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

// Voice for chat-only providers: browser SpeechRecognition (STT) → provider
// chat/completions → browser speechSynthesis (TTS). Works with any
// OpenAI-compatible text provider; no audio endpoints required.
export class BrowserChatVoiceClient implements VoiceClient {
  private callbacks: VoiceClientCallbacks;
  private provider: Provider;
  private apiKey: string;
  private role: CoachRole;

  private messages: ChatMessage[] = [];
  private recognition: any = null;
  private wantRunning = false;
  private stopped = false;

  private utterance = '';
  private silenceTimer: number | null = null;

  private queue: Promise<void> = Promise.resolve();

  private speaking = false;
  private speakGen = 0;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor(callbacks: VoiceClientCallbacks, provider: Provider, apiKey: string, role: CoachRole, _voice: VoiceName) {
    this.callbacks = callbacks;
    this.provider = provider;
    this.apiKey = apiKey;
    this.role = role;
  }

  connect() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.callbacks.onError(t('err.noSr'));
      return;
    }
    if (!('speechSynthesis' in window)) {
      this.callbacks.onError(t('err.noTts'));
      return;
    }

    this.messages = [{ role: 'system', content: getRolePrompt(this.role) }];

    try {
      this.recognition = new SR();
    } catch {
      this.callbacks.onError(t('err.srStart'));
      return;
    }
    this.recognition.lang = 'en-US';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event: any) => {
      if (this.stopped) return;
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
        this.stopped = true;
        this.callbacks.onError(t('err.micDenied'));
      }
      // 'no-speech' / 'aborted' are routine; onend will restart
    };

    this.recognition.onend = () => {
      if (this.stopped || !this.wantRunning) return;
      window.setTimeout(() => {
        if (this.stopped || !this.wantRunning || !this.recognition) return;
        try {
          this.recognition.start();
        } catch {
          // already started
        }
      }, 200);
    };

    if ('speechSynthesis' in window) {
      const load = () => {
        this.cachedVoices = window.speechSynthesis.getVoices();
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }

    this.wantRunning = true;
    try {
      this.recognition.start();
    } catch {
      // ignore double-start
    }

    this.callbacks.onSetupComplete();

    this.enqueue(async () => {
      this.messages.push({ role: 'user', content: GREETING_PROMPT });
      await this.runAssistantTurn();
    });
  }

  // Mic audio goes through SpeechRecognition instead of raw PCM chunks.
  sendAudioChunk(_base64Pcm: string) {
    // no-op
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

  private async chat(): Promise<any> {
    const base = normalizeBaseUrl(this.provider.baseUrl) || 'https://api.openai.com/v1';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    let res: Response;
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.provider.model,
          temperature: 0.6,
          messages: this.messages,
          tools: TOOL_DECLARATIONS.map((t) => ({ type: 'function', function: t })),
          tool_choice: 'auto',
        }),
        signal: ctrl.signal,
      });
    } catch {
      throw new ProviderError('network', t('err.chatTimeout'));
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      throw new ProviderError(classifyHttpStatus(res.status), t('err.providerError', { status: res.status }));
    }
    return res.json();
  }

  private async runAssistantTurn(): Promise<void> {
    for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
      if (this.stopped) return;
      const data = await this.chat();
      const message = data?.choices?.[0]?.message;
      if (!message) throw new Error(t('err.emptyResponse'));

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

      const text = String(message.content ?? '').trim();
      this.messages.push({ role: 'assistant', content: text });
      if (text) {
        this.callbacks.onTranscript('model', text, true);
        this.speak(text);
      }
      return;
    }
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
