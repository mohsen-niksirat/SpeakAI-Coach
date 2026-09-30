import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatKeyPreview, testSingleKey, testProviderConnection } from './connection-tester';
import { Provider } from '../types';

const geminiProvider: Provider = {
  id: 'g1',
  name: 'Google Gemini',
  kind: 'gemini-live',
  baseUrl: 'https://generativelanguage.googleapis.com',
  model: 'gemini-2.5-flash-native-audio-latest',
  keys: ['AIzaSyValidKey123456789012345'],
  keyIndex: 0,
};

const groqProvider: Provider = {
  id: 'gr1',
  name: 'Groq',
  kind: 'openai-chat',
  baseUrl: 'https://api.groq.com/openai/v1',
  model: 'llama-3.3-70b-versatile',
  keys: ['gsk_validKey1234567890'],
  keyIndex: 0,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('connection-tester', () => {
  it('formats masked key preview accurately', () => {
    expect(formatKeyPreview('AIzaSyAbcdefghijklmnop1234')).toBe('AIzaSy...1234');
    expect(formatKeyPreview('')).toBe('—');
  });

  it('rejects non-AIza keys for Gemini provider before network call', async () => {
    const res = await testSingleKey(geminiProvider, 'not-a-gemini-key');
    expect(res.ok).toBe(false);
    expect(res.messageFa).toContain('AIzaSy');
  });

  it('reports geo-block clearly when Google API returns User location is not supported', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: 400, message: 'User location is not supported for the API use.' },
        }),
        { status: 400 },
      ),
    );

    const res = await testSingleKey(geminiProvider, 'AIzaSyValidKey123456789012345');
    expect(res.ok).toBe(false);
    expect(res.messageFa).toContain('User location is not supported');
  });

  it('verifies Groq / OpenRouter chat connection and returns latency and model', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
        }),
        { status: 200 },
      ),
    );

    const res = await testProviderConnection(groqProvider);
    expect(res.ok).toBe(true);
    expect(res.results.length).toBe(1);
    expect(res.results[0].ok).toBe(true);
    expect(res.results[0].model).toBe('llama-3.3-70b-versatile');
  });
});
