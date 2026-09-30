import { Provider, ProviderKind, ProviderSettings } from '../types';

const STORAGE_KEY = 'speakai_providers';
const LEGACY_KEY = 'gemini_api_key';

export const GEMINI_VOICES = ['Aoede', 'Kore', 'Puck', 'Charon', 'Fenrir'];
export const OPENAI_VOICES = ['marin', 'cedar', 'alloy', 'coral', 'shimmer', 'sage', 'verse', 'ash', 'ballad', 'echo'];

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
    model: 'gpt-realtime',
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
    labelEn: 'Google Gemini Live (AI Studio — Free Daily Quota ⭐)',
    labelFa: 'گوگل جمینای زنده (Google Gemini Live — سهمیه رایگان روزانه ⭐)',
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
      { value: 'gemini-3.8-flash', label: 'gemini-3.8-flash (Newest)' },
      { value: 'gemini-3.6-flash', label: 'gemini-3.6-flash' },
      { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro (Analytical)' },
      { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
    ],
    keyPlaceholder: 'AIzaSy...',
  },
  {
    id: 'google-gemini-hybrid',
    labelEn: 'Google Gemini Hybrid Voice (REST + Browser Voice — Works on All VPNs 🛡️)',
    labelFa: 'گوگل جمینای ضدتحریم (مکالمه صوتی با API معمولی — بدون نیاز به WebSocket 🛡️)',
    defaultName: 'Google Gemini (Hybrid)',
    kind: 'openai-chat',
    baseUrl: 'https://generativelanguage.googleapis.com',
    voiceModels: [
      { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash ⭐ (Fast & Reliable)' },
      { value: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite (High Free Quota)' },
      { value: 'gemini-3.8-flash', label: 'gemini-3.8-flash (Newest 3.8)' },
      { value: 'gemini-3.6-flash', label: 'gemini-3.6-flash' },
      { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
    ],
    reportModels: [
      { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash ⭐' },
      { value: 'gemini-3.8-flash', label: 'gemini-3.8-flash' },
      { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
    ],
    keyPlaceholder: 'AIzaSy...',
  },
  {
    id: 'groq',
    labelEn: 'Groq Cloud (Free Daily Quota — Ultra-Fast ⭐)',
    labelFa: 'گروک (Groq — سهمیه رایگان روزانه و فوق‌سریع ⭐)',
    defaultName: 'Groq',
    kind: 'openai-chat',
    baseUrl: 'https://api.groq.com/openai/v1',
    voiceModels: [
      { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile ⭐ (1K req/day Free)' },
      { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant ⚡ (14.4K req/day Free)' },
      { value: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b (Smart)' },
      { value: 'openai/gpt-oss-20b', label: 'openai/gpt-oss-20b (Fast)' },
      { value: 'qwen/qwen3.6-27b', label: 'qwen/qwen3.6-27b' },
      { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'meta-llama/llama-4-scout-17b-16e-instruct' },
    ],
    reportModels: [
      { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile ⭐' },
      { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant' },
      { value: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b' },
    ],
    keyPlaceholder: 'gsk_...',
  },
  {
    id: 'openrouter',
    labelEn: 'OpenRouter (Includes Free :free Models)',
    labelFa: 'اوپن‌روتر (OpenRouter — دارای مدل‌های رایگان :free)',
    defaultName: 'OpenRouter',
    kind: 'openai-chat',
    baseUrl: 'https://openrouter.ai/api/v1',
    voiceModels: [
      { value: 'openrouter/free', label: '🔄 openrouter/free ⭐ (Auto-Select Best Working Free Model)' },
      { value: 'google/gemma-4-31b-it:free', label: 'google/gemma-4-31b-it:free 🆓' },
      { value: 'google/gemma-4-26b-a4b-it:free', label: 'google/gemma-4-26b-a4b-it:free 🆓' },
      { value: 'qwen/qwen3.8-27b:free', label: 'qwen/qwen3.8-27b:free 🆓' },
      { value: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'nvidia/nemotron-3-super-120b-a12b:free 🆓' },
      { value: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'nvidia/nemotron-3-ultra-550b-a55b:free 🆓' },
      { value: 'inclusionai/ling-3.0-flash-sante:free', label: 'inclusionai/ling-3.0-flash-sante:free 🆓' },
      { value: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash (Paid)' },
      { value: 'openai/gpt-4o-mini', label: 'openai/gpt-4o-mini (Paid)' },
    ],
    reportModels: [
      { value: 'openrouter/free', label: '🔄 openrouter/free ⭐ (Auto-Select Free Model)' },
      { value: 'google/gemma-4-31b-it:free', label: 'google/gemma-4-31b-it:free 🆓' },
      { value: 'qwen/qwen3.8-27b:free', label: 'qwen/qwen3.8-27b:free 🆓' },
      { value: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'nvidia/nemotron-3-super-120b-a12b:free 🆓' },
      { value: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash' },
    ],
    keyPlaceholder: 'sk-or-v1-...',
  },
  {
    id: 'cerebras',
    labelEn: 'Cerebras Cloud (Free 1M Tokens/Day)',
    labelFa: 'سربراس (Cerebras — روزانه ۱ میلیون توکن رایگان)',
    defaultName: 'Cerebras',
    kind: 'openai-chat',
    baseUrl: 'https://api.cerebras.ai/v1',
    voiceModels: [
      { value: 'llama-3.3-70b', label: 'llama-3.3-70b ⭐ (Free Tier)' },
      { value: 'llama3.1-8b', label: 'llama3.1-8b (Instant)' },
      { value: 'gpt-oss-120b', label: 'gpt-oss-120b' },
      { value: 'gemma-4-31b', label: 'gemma-4-31b' },
    ],
    reportModels: [
      { value: 'llama-3.3-70b', label: 'llama-3.3-70b ⭐' },
      { value: 'llama3.1-8b', label: 'llama3.1-8b' },
      { value: 'gpt-oss-120b', label: 'gpt-oss-120b' },
    ],
    keyPlaceholder: 'csk-...',
  },
  {
    id: 'github-models',
    labelEn: 'GitHub Models (Free with GitHub Account)',
    labelFa: 'مدل‌های گیت‌هاب (GitHub Models — رایگان با اکانت گیت‌هاب)',
    defaultName: 'GitHub Models',
    kind: 'openai-chat',
    baseUrl: 'https://models.inference.ai.azure.com',
    voiceModels: [
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini ⭐ (Free Daily Quota)' },
      { value: 'gpt-4o', label: 'gpt-4o (Free Rate-Limited)' },
      { value: 'Llama-3.3-70B-Instruct', label: 'Llama-3.3-70B-Instruct' },
    ],
    reportModels: [
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini ⭐' },
      { value: 'gpt-4o', label: 'gpt-4o' },
    ],
    keyPlaceholder: 'ghp_... or github_pat_...',
  },
  {
    id: 'openai-realtime',
    labelEn: 'OpenAI Realtime GA (/v1/realtime — Paid Credit Required)',
    labelFa: 'اوپن‌ای‌آی بلادرنگ (OpenAI Realtime GA — نیازمند شارژ دلاری)',
    defaultName: 'OpenAI Realtime',
    kind: 'openai-realtime',
    baseUrl: 'https://api.openai.com/v1',
    voiceModels: [
      { value: 'gpt-realtime', label: 'gpt-realtime ⭐ (GA Official)' },
      { value: 'gpt-realtime-mini', label: 'gpt-realtime-mini (GA Fast & Economical)' },
      { value: 'gpt-4o-realtime-preview', label: 'gpt-4o-realtime-preview' },
      { value: 'gpt-4o-mini-realtime-preview', label: 'gpt-4o-mini-realtime-preview' },
    ],
    reportModels: [
      { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini ⭐' },
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
      { value: 'gpt-4o', label: 'gpt-4o' },
    ],
    keyPlaceholder: 'sk-proj-...',
  },
  {
    id: 'openai-chat',
    labelEn: 'OpenAI Chat (Standard API + Browser Voice — Paid)',
    labelFa: 'اوپن‌ای‌آی چت (OpenAI Chat — نیازمند شارژ دلاری)',
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

const RETIRED_OPENROUTER_MODELS = new Set([
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'deepseek/deepseek-r1:free',
  'google/gemini-2.0-flash-exp:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'openai/gpt-oss-20b:free',
]);

export function cleanApiKey(raw: string): string {
  const str = String(raw || '').replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '').trim();
  if (!str) return '';
  // If a Google AI Studio key (AIza...) is embedded inside a URL, query param, or labeled line, extract it directly
  const aizaMatch = str.match(/AIza[0-9A-Za-z_-]{20,}/);
  if (aizaMatch) return aizaMatch[0];
  const groqMatch = str.match(/gsk_[0-9A-Za-z_-]{20,}/);
  if (groqMatch) return groqMatch[0];
  const orMatch = str.match(/sk-or-v1-[0-9A-Za-z_-]{20,}/i);
  if (orMatch) return orMatch[0];

  return str
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/^key\s*=\s*/i, '')
    .replace(/["'`\s]/g, '')
    .trim();
}

export function detectPresetFromKey(rawKey: string): string | null {
  const key = cleanApiKey(rawKey);
  if (!key) return null;
  if (/^AIza[0-9A-Za-z_-]{4,}/.test(key)) return 'google-gemini';
  if (/^gsk_[0-9A-Za-z_-]{4,}/i.test(key)) return 'groq';
  if (/^sk-or-/i.test(key)) return 'openrouter';
  if (/^csk-/i.test(key)) return 'cerebras';
  if (/^(ghp_|github_pat_)/i.test(key)) return 'github-models';
  if (/^sk-(proj-|svcacct-|[0-9A-Za-z]{16,})/i.test(key)) return 'openai-realtime';
  return null;
}

export function sanitizeProvider(provider: Provider): Provider {
  const cleanedKeys = (provider.keys || []).map(cleanApiKey).filter(Boolean);
  const firstKey = cleanedKeys[0] || '';
  const detectedFromKey = detectPresetFromKey(firstKey);
  const cleanUrl = normalizeBaseUrl(provider.baseUrl || '');

  let kind = provider.kind;
  let baseUrl = cleanUrl || KIND_DEFAULTS[kind].baseUrl;
  let model = (provider.model || '').trim() || KIND_DEFAULTS[kind].model;
  let reportModel = (provider.reportModel || '').trim();
  let keys = cleanedKeys;

  // Auto-fix Groq providers (where user pasted a gsk_ key or named it Groq without changing preset/baseUrl)
  if (detectedFromKey === 'groq' || /groq\.com/i.test(baseUrl) || /^groq$/i.test(provider.name.trim())) {
    kind = 'openai-chat';
    baseUrl = 'https://api.groq.com/openai/v1';
    if (
      !model ||
      /^gemini/i.test(model) ||
      /^gpt-4/i.test(model) ||
      /^gpt-realtime/i.test(model) ||
      /:free$/i.test(model) ||
      model === 'openrouter/free' ||
      /mixtral/i.test(model)
    ) {
      model = 'llama-3.3-70b-versatile';
    }
    if (!reportModel || /^gemini/i.test(reportModel) || /^gpt-4/i.test(reportModel) || /:free$/i.test(reportModel)) {
      reportModel = 'llama-3.3-70b-versatile';
    }
    const groqOnly = keys.filter((k) => /^gsk_/i.test(k));
    if (groqOnly.length > 0) keys = groqOnly;
  }
  // Auto-fix OpenRouter providers (and migrate retired :free models that return 404)
  else if (detectedFromKey === 'openrouter' || /openrouter\.ai/i.test(baseUrl) || /^openrouter$/i.test(provider.name.trim())) {
    kind = 'openai-chat';
    baseUrl = 'https://openrouter.ai/api/v1';
    if (
      !model ||
      RETIRED_OPENROUTER_MODELS.has(model) ||
      /^gemini-2\.5-flash-native/i.test(model) ||
      /^gpt-realtime/i.test(model) ||
      model === 'gpt-4.1-mini' ||
      model === 'llama-3.3-70b-versatile'
    ) {
      model = 'openrouter/free';
    }
    if (!reportModel || RETIRED_OPENROUTER_MODELS.has(reportModel) || reportModel === 'gpt-4.1-mini') {
      reportModel = 'openrouter/free';
    }
    const orOnly = keys.filter((k) => /^sk-or-/i.test(k));
    if (orOnly.length > 0) keys = orOnly;
  }
  // Auto-fix Cerebras providers
  else if (detectedFromKey === 'cerebras' || /cerebras\.ai/i.test(baseUrl)) {
    kind = 'openai-chat';
    baseUrl = 'https://api.cerebras.ai/v1';
    if (!model || /^gemini/i.test(model) || /^gpt-4/i.test(model) || /:free$/i.test(model)) {
      model = 'llama-3.3-70b';
    }
  }
  // Auto-fix GitHub Models providers
  else if (detectedFromKey === 'github-models' || /inference\.ai\.azure\.com/i.test(baseUrl)) {
    kind = 'openai-chat';
    baseUrl = 'https://models.inference.ai.azure.com';
    if (!model || /^gemini/i.test(model) || /:free$/i.test(model)) {
      model = 'gpt-4o-mini';
    }
  }
  // Auto-fix OpenAI key accidentally pasted into a Gemini provider
  else if (detectedFromKey === 'openai-realtime' && kind === 'gemini-live') {
    kind = 'openai-realtime';
    baseUrl = 'https://api.openai.com/v1';
    if (/^gemini/i.test(model)) {
      model = 'gpt-realtime';
    }
    if (!reportModel || /^gemini/i.test(reportModel)) {
      reportModel = 'gpt-4.1-mini';
    }
  }
  // Auto-fix Google Gemini providers (both Live and Hybrid)
  else if (kind === 'gemini-live' || detectedFromKey === 'google-gemini' || /generativelanguage\.googleapis\.com/i.test(baseUrl)) {
    if (/api\.openai\.com|groq\.com|openrouter\.ai/i.test(baseUrl)) {
      baseUrl = 'https://generativelanguage.googleapis.com';
    }
    // If multiple keys exist and some are real AIza Google keys while others are foreign/corrupted, keep AIza keys first
    const aizaKeys = keys.filter((k) => /^AIza[0-9A-Za-z_-]{4,}/.test(k));
    if (aizaKeys.length > 0) {
      keys = aizaKeys;
    }
    if (kind === 'openai-chat' && /native-audio|live/i.test(model)) {
      model = 'gemini-2.5-flash';
    }
  }

  const clampedIndex = keys.length > 0 ? Math.min(Math.max(provider.keyIndex || 0, 0), keys.length - 1) : 0;

  return {
    ...provider,
    kind,
    baseUrl,
    model,
    reportModel: reportModel || undefined,
    keys,
    keyIndex: clampedIndex,
  };
}

function rescueAizaKeysFromStorage(): string[] {
  const found: string[] = [];
  try {
    if (typeof localStorage === 'undefined') return found;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k === STORAGE_KEY || k === LEGACY_KEY) continue;
      const val = localStorage.getItem(k);
      if (!val || !val.includes('AIza')) continue;
      const matches = val.match(/AIza[0-9A-Za-z_-]{25,45}/g);
      if (matches) {
        for (const m of matches) {
          if (!found.includes(m)) found.push(m);
        }
      }
    }
  } catch {
    // ignore storage access errors
  }
  return found;
}

export function reconcileProvidersList(rawProviders: Provider[]): Provider[] {
  const sanitized = rawProviders.map(sanitizeProvider);

  // Collect all valid AIza keys across all providers (in case a user's Gemini key was in a second Gemini entry)
  const providerAizaKeys = Array.from(
    new Set(
      sanitized
        .flatMap((p) => p.keys)
        .filter((k) => /^AIza[0-9A-Za-z_-]{4,}/.test(k)),
    ),
  );
  const allAizaKeys = providerAizaKeys.length > 0 ? providerAizaKeys : rescueAizaKeysFromStorage();

  const result: Provider[] = [];
  let primaryGemini: Provider | null = null;

  for (const p of sanitized) {
    if (p.kind === 'gemini-live') {
      const validAiza = p.keys.filter((k) => /^AIza[0-9A-Za-z_-]{4,}/.test(k));
      const effectiveKeys = validAiza.length > 0 ? validAiza : allAizaKeys.length > 0 ? allAizaKeys : p.keys;

      // Drop auto-synced prov-leitner-gemini if it has no valid AIza keys and another provider exists
      if (p.id === 'prov-leitner-gemini' && validAiza.length === 0 && allAizaKeys.length === 0 && sanitized.length > 1) {
        continue;
      }

      if (!primaryGemini) {
        primaryGemini = {
          ...p,
          keys: effectiveKeys,
          keyIndex: Math.min(p.keyIndex || 0, Math.max(0, effectiveKeys.length - 1)),
        };
        result.push(primaryGemini);
      } else {
        // Merge duplicate gemini-live providers into the primary one
        const merged = Array.from(new Set([...primaryGemini.keys, ...effectiveKeys]));
        primaryGemini.keys = merged;
      }
    } else {
      result.push(p);
    }
  }

  return result;
}

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
  const provider: Provider = sanitizeProvider({
    id: newProviderId(),
    name: 'Google AI Studio',
    kind: 'gemini-live',
    baseUrl: defaults.baseUrl,
    model: defaults.model,
    reportModel: defaults.reportModel,
    keys: [legacy],
    keyIndex: 0,
  });
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
    const sanitizedProviders = reconcileProvidersList(parsed.providers);
    const validVoiceId =
      parsed.voiceProviderId && sanitizedProviders.some((p) => p.id === parsed.voiceProviderId)
        ? parsed.voiceProviderId
        : sanitizedProviders[0]?.id ?? null;
    const validReportId =
      parsed.reportProviderId && sanitizedProviders.some((p) => p.id === parsed.reportProviderId)
        ? parsed.reportProviderId
        : sanitizedProviders[0]?.id ?? null;
    return migrateLegacyKey({
      providers: sanitizedProviders,
      voiceProviderId: validVoiceId,
      reportProviderId: validReportId,
    });
  } catch {
    return empty;
  }
}

export function saveProviderSettings(settings: ProviderSettings): void {
  try {
    const reconciled = reconcileProvidersList(settings.providers || []);
    const sanitized: ProviderSettings = {
      ...settings,
      providers: reconciled,
      voiceProviderId:
        settings.voiceProviderId && reconciled.some((p) => p.id === settings.voiceProviderId)
          ? settings.voiceProviderId
          : reconciled[0]?.id ?? null,
      reportProviderId:
        settings.reportProviderId && reconciled.some((p) => p.id === settings.reportProviderId)
          ? settings.reportProviderId
          : reconciled[0]?.id ?? null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // storage unavailable; settings will not persist
  }
}

export function activeKey(provider: Provider): string {
  if (provider.keys.length === 0) return '';
  const idx = Math.min(provider.keyIndex, provider.keys.length - 1);
  return cleanApiKey(provider.keys[idx]);
}

// Advance to the next key after a failure; returns the updated provider.
export function rotateKey(provider: Provider): Provider {
  if (provider.keys.length <= 1) return provider;
  return { ...provider, keyIndex: (provider.keyIndex + 1) % provider.keys.length };
}

export function findProvider(settings: ProviderSettings, id: string | null): Provider | null {
  if (!id) return settings.providers[0] ? sanitizeProvider(settings.providers[0]) : null;
  const found = settings.providers.find((p) => p.id === id) ?? settings.providers[0] ?? null;
  return found ? sanitizeProvider(found) : null;
}
