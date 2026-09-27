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
    model: 'gemini-live-2.5-flash-preview',
    reportModel: 'gemini-flash-latest',
  },
  'openai-realtime': {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-realtime',
    reportModel: 'gpt-4.1-mini',
  },
  'openai-chat': {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    reportModel: 'gpt-4.1-mini',
  },
};

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
