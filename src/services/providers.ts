import { Provider, ProviderKind, ProviderSettings } from '../types';

const STORAGE_KEY = 'speakai_providers';
const LEGACY_KEY = 'gemini_api_key';

export const GEMINI_VOICES = ['Aoede', 'Kore', 'Puck', 'Charon', 'Fenrir'];
export const OPENAI_VOICES = ['alloy', 'coral', 'shimmer', 'sage', 'verse', 'ash', 'ballad', 'echo'];

export const KIND_LABELS: Record<ProviderKind, string> = {
  'gemini-live': 'Gemini Live (realtime voice)',
  'openai-realtime': 'OpenAI Realtime (realtime voice)',
  'openai-chat': 'OpenAI-compatible (chat + browser voice)',
};

export const KIND_DEFAULTS: Record<ProviderKind, { baseUrl: string; model: string; reportModel: string }> = {
  'gemini-live': {
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: 'gemini-2.5-flash-native-audio-latest',
    reportModel: 'gemini-2.5-flash',
  },
  'openai-realtime': {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-realtime-preview',
    reportModel: 'gpt-4.1-mini',
  },
  'openai-chat': {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    reportModel: 'gpt-4.1-mini',
  },
};

export interface ModelOption {
  value: string;
  label: string;
}

export interface ProviderPreset {
  id: string;
  labelEn: string;
  labelFa: string;
  defaultName: string;
  kind: ProviderKind;
  baseUrl: string;
  voiceModels: ModelOption[];
  reportModels: ModelOption[];
  keyPlaceholder: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'google-gemini',
    labelEn: 'Google Gemini (AI Studio — Recommended)',
    labelFa: 'گوگل جمینای (Google Gemini — پیشنهادی)',
    defaultName: 'Google Gemini',
    kind: 'gemini-live',
    baseUrl: 'https://generativelanguage.googleapis.com',
    voiceModels: [
      { value: 'gemini-2.5-flash-native-audio-latest', label: 'gemini-2.5-flash-native-audio-latest ⭐' },
      { value: 'gemini-2.5-flash-native-audio-preview-12-2025', label: 'gemini-2.5-flash-native-audio-preview-12-2025' },
      { value: 'gemini-3.1-flash-live-preview', label: 'gemini-3.1-flash-live-preview (Newest)' },
      { value: 'gemini-live-2.5-flash', label: 'gemini-live-2.5-flash' },
      { value: 'gemini-2.0-flash-live-001', label: 'gemini-2.0-flash-live-001' },
    ],
    reportModels: [
      { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash ⭐' },
      { value: 'gemini-flash-latest', label: 'gemini-flash-latest' },
      { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro (Analytical)' },
      { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
    ],
    keyPlaceholder: 'AIzaSy...',
  },
  {
    id: 'openai-realtime',
    labelEn: 'OpenAI Realtime (Low-Latency Voice)',
    labelFa: 'اوپن‌ای‌آی بلادرنگ (OpenAI Realtime)',
    defaultName: 'OpenAI Realtime',
    kind: 'openai-realtime',
    baseUrl: 'https://api.openai.com/v1',
    voiceModels: [
      { value: 'gpt-4o-realtime-preview', label: 'gpt-4o-realtime-preview ⭐' },
      { value: 'gpt-4o-mini-realtime-preview', label: 'gpt-4o-mini-realtime-preview (Fast)' },
      { value: 'gpt-realtime', label: 'gpt-realtime' },
    ],
    reportModels: [
      { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini ⭐' },
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
      { value: 'gpt-4o', label: 'gpt-4o' },
    ],
    keyPlaceholder: 'sk-proj-...',
  },
  {
    id: 'openrouter',
    labelEn: 'OpenRouter (Multi-Model Gateway)',
    labelFa: 'اوپن‌روتر (OpenRouter)',
    defaultName: 'OpenRouter',
    kind: 'openai-chat',
    baseUrl: 'https://openrouter.ai/api/v1',
    voiceModels: [
      { value: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash ⭐' },
      { value: 'openai/gpt-4o-mini', label: 'openai/gpt-4o-mini' },
      { value: 'anthropic/claude-3.5-haiku', label: 'anthropic/claude-3.5-haiku' },
      { value: 'deepseek/deepseek-chat', label: 'deepseek/deepseek-chat (DeepSeek V3)' },
      { value: 'meta-llama/llama-3.3-70b-instruct', label: 'meta-llama/llama-3.3-70b-instruct' },
    ],
    reportModels: [
      { value: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash ⭐' },
      { value: 'openai/gpt-4o-mini', label: 'openai/gpt-4o-mini' },
      { value: 'deepseek/deepseek-chat', label: 'deepseek/deepseek-chat' },
    ],
    keyPlaceholder: 'sk-or-v1-...',
  },
  {
    id: 'groq',
    labelEn: 'Groq Cloud (Ultra-Fast Llama)',
    labelFa: 'گروک (Groq — فوق سریع)',
    defaultName: 'Groq',
    kind: 'openai-chat',
    baseUrl: 'https://api.groq.com/openai/v1',
    voiceModels: [
      { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile ⭐' },
      { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant (Fastest)' },
      { value: 'gemma2-9b-it', label: 'gemma2-9b-it' },
    ],
    reportModels: [
      { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile ⭐' },
      { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant' },
    ],
    keyPlaceholder: 'gsk_...',
  },
  {
    id: 'openai-chat',
    labelEn: 'OpenAI Chat (Standard API + Browser Voice)',
    labelFa: 'اوپن‌ای‌آی چت (OpenAI Chat)',
    defaultName: 'OpenAI',
    kind: 'openai-chat',
    baseUrl: 'https://api.openai.com/v1',
    voiceModels: [
      { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini ⭐' },
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
      { value: 'gpt-4o', label: 'gpt-4o' },
    ],
    reportModels: [
      { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini ⭐' },
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
      { value: 'gpt-4o', label: 'gpt-4o' },
    ],
    keyPlaceholder: 'sk-proj-...',
  },
  {
    id: 'deepseek',
    labelEn: 'DeepSeek Official',
    labelFa: 'دیپ‌سیک (DeepSeek)',
    defaultName: 'DeepSeek',
    kind: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    voiceModels: [
      { value: 'deepseek-chat', label: 'deepseek-chat (DeepSeek V3 ⭐)' },
    ],
    reportModels: [
      { value: 'deepseek-chat', label: 'deepseek-chat (DeepSeek V3 ⭐)' },
    ],
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'custom',
    labelEn: 'Custom Gateway / Proxy',
    labelFa: 'درگاه سفارشی / پروکسی شخصی (Custom)',
    defaultName: 'Custom Provider',
    kind: 'openai-chat',
    baseUrl: 'https://api.openai.com/v1',
    voiceModels: [],
    reportModels: [],
    keyPlaceholder: 'sk-...',
  },
];

export function detectPresetId(provider: Pick<Provider, 'kind' | 'baseUrl'>): string {
  const cleanUrl = normalizeBaseUrl(provider.baseUrl).toLowerCase();
  const match = PROVIDER_PRESETS.find(
    (p) => p.id !== 'custom' && p.kind === provider.kind && normalizeBaseUrl(p.baseUrl).toLowerCase() === cleanUrl,
  );
  if (match) return match.id;
  if (provider.kind === 'gemini-live') return 'google-gemini';
  if (provider.kind === 'openai-realtime') return 'openai-realtime';
  return 'custom';
}

export function isVoiceCapable(kind: ProviderKind): boolean {
  // chat-only providers speak through the browser STT/TTS pipeline
  return kind === 'gemini-live' || kind === 'openai-realtime' || kind === 'openai-chat';
}

export function voicesForKind(kind: ProviderKind): string[] {
  if (kind === 'openai-chat') return []; // browser default voice
  return kind === 'gemini-live' ? GEMINI_VOICES : OPENAI_VOICES;
}

export function newProviderId(): string {
  return `prov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function migrateLegacyKey(settings: ProviderSettings): ProviderSettings {
  if (settings.providers.length > 0) return settings;
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (!legacy) return settings;

  const defaults = KIND_DEFAULTS['gemini-live'];
  const provider: Provider = {
    id: newProviderId(),
    name: 'Google AI Studio',
    kind: 'gemini-live',
    baseUrl: defaults.baseUrl,
    model: defaults.model,
    reportModel: defaults.reportModel,
    keys: [legacy],
    keyIndex: 0,
  };
  localStorage.removeItem(LEGACY_KEY);
  return {
    providers: [provider],
    voiceProviderId: provider.id,
    reportProviderId: provider.id,
  };
}

export function loadProviderSettings(): ProviderSettings {
  const empty: ProviderSettings = { providers: [], voiceProviderId: null, reportProviderId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateLegacyKey(empty);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.providers)) return migrateLegacyKey(empty);
    return migrateLegacyKey({
      providers: parsed.providers,
      voiceProviderId: parsed.voiceProviderId ?? null,
      reportProviderId: parsed.reportProviderId ?? null,
    });
  } catch {
    return empty;
  }
}

export function saveProviderSettings(settings: ProviderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable; settings will not persist
  }
}

export function activeKey(provider: Provider): string {
  if (provider.keys.length === 0) return '';
  const idx = Math.min(provider.keyIndex, provider.keys.length - 1);
  return provider.keys[idx];
}

// Advance to the next key after a failure; returns the updated provider.
export function rotateKey(provider: Provider): Provider {
  if (provider.keys.length <= 1) return provider;
  return { ...provider, keyIndex: (provider.keyIndex + 1) % provider.keys.length };
}

export function findProvider(settings: ProviderSettings, id: string | null): Provider | null {
  if (!id) return null;
  return settings.providers.find((p) => p.id === id) ?? null;
}
