import { describe, it, expect } from 'vitest';
import { normalizeBaseUrl, rotateKey, activeKey, newProviderId, isVoiceCapable } from './providers';
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

describe('provider helpers', () => {
  it('generates unique ids', () => {
    expect(newProviderId()).not.toBe(newProviderId());
  });

  it('marks every current kind as voice capable (browser voice for chat)', () => {
    expect(isVoiceCapable('gemini-live')).toBe(true);
    expect(isVoiceCapable('openai-realtime')).toBe(true);
    expect(isVoiceCapable('openai-chat')).toBe(true);
  });
});
