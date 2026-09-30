import { describe, it, expect } from 'vitest';
import {
  normalizeBaseUrl,
  rotateKey,
  activeKey,
  newProviderId,
  isVoiceCapable,
  PROVIDER_PRESETS,
  detectPresetId,
  cleanApiKey,
  detectPresetFromKey,
  sanitizeProvider,
  reconcileProvidersList,
} from './providers';
import { Provider } from '../types';

function provider(keys: string[], keyIndex = 0): Provider {
  return {
    id: 'p1',
    name: 'Test',
    kind: 'gemini-live',
    baseUrl: 'https://example.com',
    model: 'm',
    keys,
    keyIndex,
  };
}

describe('normalizeBaseUrl', () => {
  it('trims whitespace and strips trailing slashes', () => {
    expect(normalizeBaseUrl('  https://api.openai.com/v1/// ')).toBe('https://api.openai.com/v1');
    expect(normalizeBaseUrl('https://x.com')).toBe('https://x.com');
    expect(normalizeBaseUrl('   ')).toBe('');
  });
});

describe('rotateKey', () => {
  it('advances to the next key', () => {
    const next = rotateKey(provider(['a', 'b', 'c'], 0));
    expect(next.keyIndex).toBe(1);
  });

  it('wraps around from the last key', () => {
    const next = rotateKey(provider(['a', 'b'], 1));
    expect(next.keyIndex).toBe(0);
  });

  it('is a no-op for a single key', () => {
    const single = provider(['only'], 0);
    expect(rotateKey(single).keyIndex).toBe(0);
  });
});

describe('activeKey', () => {
  it('returns the key at the active index', () => {
    expect(activeKey(provider(['a', 'b'], 1))).toBe('b');
  });

  it('clamps an out-of-range index instead of crashing', () => {
    expect(activeKey(provider(['a'], 7))).toBe('a');
    expect(activeKey(provider([], 0))).toBe('');
  });
});

describe('provider helpers & presets', () => {
  it('generates unique ids', () => {
    expect(newProviderId()).not.toBe(newProviderId());
  });

  it('marks every current kind as voice capable (browser voice for chat)', () => {
    expect(isVoiceCapable('gemini-live')).toBe(true);
    expect(isVoiceCapable('openai-realtime')).toBe(true);
    expect(isVoiceCapable('openai-chat')).toBe(true);
  });

  it('provides Google Gemini as default preset with selectable voice and report models', () => {
    const gemini = PROVIDER_PRESETS[0];
    expect(gemini.id).toBe('google-gemini');
    expect(gemini.baseUrl).toBe('https://generativelanguage.googleapis.com');
    expect(gemini.voiceModels.length).toBeGreaterThanOrEqual(4);
    expect(gemini.reportModels.length).toBeGreaterThanOrEqual(3);
  });

  it('detects preset id from provider kind and baseUrl', () => {
    expect(detectPresetId({ kind: 'gemini-live', baseUrl: 'https://generativelanguage.googleapis.com' })).toBe(
      'google-gemini',
    );
    expect(detectPresetId({ kind: 'openai-chat', baseUrl: 'https://openrouter.ai/api/v1' })).toBe('openrouter');
    expect(detectPresetId({ kind: 'openai-chat', baseUrl: 'https://api.groq.com/openai/v1' })).toBe('groq');
    expect(detectPresetId({ kind: 'openai-chat', baseUrl: 'https://my-proxy.local/v1' })).toBe('custom');
  });

  it('cleans invisible characters, quotes, URL query strings, and Bearer prefix from API keys', () => {
    expect(cleanApiKey(' \u200B"Bearer AIzaSyTest123"\uFEFF ')).toBe('AIzaSyTest123');
    expect(cleanApiKey('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyRealKey123456789012345')).toBe(
      'AIzaSyRealKey123456789012345',
    );
    expect(detectPresetFromKey('gsk_abc123')).toBe('groq');
    expect(detectPresetFromKey('sk-or-v1-abc123')).toBe('openrouter');
    expect(detectPresetFromKey('AIzaSyAbc123')).toBe('google-gemini');
    expect(detectPresetFromKey('AQ.Ab8RN6KnyqHtoQ1M7Whqr4Dxrs0BicXj3jGiZMAt_rtBF7IKg')).toBe('google-gemini');
  });

  it('auto-repairs misconfigured Groq, OpenRouter, and Gemini providers via sanitizeProvider', () => {
    const misconfiguredGroq = sanitizeProvider({
      id: 'g1',
      name: 'Google Gemini',
      kind: 'gemini-live',
      baseUrl: 'https://generativelanguage.googleapis.com',
      model: 'gemini-2.5-flash-native-audio-latest',
      keys: ['gsk_testKey123'],
      keyIndex: 0,
    });
    expect(misconfiguredGroq.kind).toBe('openai-chat');
    expect(misconfiguredGroq.baseUrl).toBe('https://api.groq.com/openai/v1');
    expect(misconfiguredGroq.model).toBe('llama-3.3-70b-versatile');

    const retiredOpenRouter = sanitizeProvider({
      id: 'or1',
      name: 'OpenRouter',
      kind: 'openai-chat',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      reportModel: 'deepseek/deepseek-chat-v3-0324:free',
      keys: ['sk-or-v1-test123'],
      keyIndex: 0,
    });
    expect(retiredOpenRouter.model).toBe('openrouter/free');
    expect(retiredOpenRouter.reportModel).toBe('openrouter/free');
  });

  it('reconciles duplicate gemini-live providers and preserves both AIza and AQ.Ab8 Google keys', () => {
    const reconciled = reconcileProvidersList([
      {
        id: 'prov-leitner-gemini',
        name: 'Google Gemini',
        kind: 'gemini-live',
        baseUrl: 'https://generativelanguage.googleapis.com',
        model: 'gemini-2.5-flash-native-audio-latest',
        keys: ['invalid-non-google-token'],
        keyIndex: 0,
      },
      {
        id: 'prov-user-gemini',
        name: 'Google Gemini',
        kind: 'gemini-live',
        baseUrl: 'https://generativelanguage.googleapis.com',
        model: 'gemini-2.5-flash-native-audio-latest',
        keys: ['AQ.Ab8RN6KnyqHtoQ1M7Whqr4Dxrs0BicXj3jGiZMAt_rtBF7IKg', 'AIzaSyValidUserKey1234567890'],
        keyIndex: 0,
      },
    ]);

    const geminiProviders = reconciled.filter((p) => p.kind === 'gemini-live');
    expect(geminiProviders.length).toBe(1);
    expect(geminiProviders[0].keys).toEqual([
      'AQ.Ab8RN6KnyqHtoQ1M7Whqr4Dxrs0BicXj3jGiZMAt_rtBF7IKg',
      'AIzaSyValidUserKey1234567890',
    ]);
  });
});
