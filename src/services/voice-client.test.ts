import { describe, it, expect } from 'vitest';
import { handleToolCall, getRolePrompt, toWebSocketUrl, TOOL_DECLARATIONS } from './voice-client';
import { PRACTICE_TOPICS, buildCustomTopic, getSuggestedCategoriesForRole } from './topics';

describe('handleToolCall', () => {
  it('builds a vocab card from record_vocabulary', () => {
    const result = handleToolCall('record_vocabulary', {
      word: 'ubiquitous',
      phonetic: 'juːˈbɪkwɪtəs',
      definition: 'present everywhere',
      contextSentence: 'Smartphones are ubiquitous now.',
    });
    expect(result?.card).toBeDefined();
    expect(result?.card?.word).toBe('ubiquitous');
    expect(result?.card?.phonetic).toBe('juːˈbɪkwɪtəs');
    expect(result?.card?.definition).toBe('present everywhere');
    expect(result?.card?.timestamp).toBeTruthy();
  });

  it('defaults phonetic to an empty string when missing', () => {
    const result = handleToolCall('record_vocabulary', {
      word: 'test',
      definition: 'd',
      contextSentence: 's',
    });
    expect(result?.card?.phonetic).toBe('');
  });

  it('builds a feedback log from flag_grammar_mistake with defaults', () => {
    const result = handleToolCall('flag_grammar_mistake', {
      userSpoke: 'He go to school',
      betterAlternative: 'He goes to school',
      explanation: 'Third person singular needs -s',
    });
    expect(result?.feedback?.type).toBe('grammar');
    expect(result?.feedback?.betterAlternative).toBe('He goes to school');
  });

  it('returns null for unknown tools', () => {
    expect(handleToolCall('do_something', {})).toBeNull();
  });
});

describe('tool declarations', () => {
  it('declares exactly the two coaching tools with required fields', () => {
    expect(TOOL_DECLARATIONS.map((d) => d.name)).toEqual([
      'record_vocabulary',
      'flag_grammar_mistake',
    ]);
    const vocab = TOOL_DECLARATIONS[0].parameters;
    expect(vocab.type).toBe('object');
    expect(vocab.required).toContain('word');
  });
});

describe('getRolePrompt & toWebSocketUrl', () => {
  it('returns a distinct prompt per role and appends topicPrompt when provided', () => {
    const ielts = getRolePrompt('ielts_examiner');
    const friendly = getRolePrompt('friendly_chat');
    expect(ielts).toContain('IELTS');
    expect(ielts).not.toBe(friendly);

    const withTopic = getRolePrompt('ielts_examiner', 'Focus on Part 2 Cue Card: A Memorable Journey');
    expect(withTopic).toContain('SESSION TOPIC / TASK:');
    expect(withTopic).toContain('A Memorable Journey');
  });

  it('normalizes http/https URLs to ws/wss for WebSocket connections', () => {
    expect(toWebSocketUrl('https://api.openai.com/v1')).toBe('wss://api.openai.com/v1');
    expect(toWebSocketUrl('http://localhost:8080/v1')).toBe('ws://localhost:8080/v1');
    expect(toWebSocketUrl('wss://example.com')).toBe('wss://example.com');
  });
});

describe('PRACTICE_TOPICS & buildCustomTopic', () => {
  it('includes IELTS Part 2 cue cards with prep and speak timers', () => {
    const part2 = PRACTICE_TOPICS.filter((tp) => tp.category === 'ielts_part2');
    expect(part2.length).toBeGreaterThanOrEqual(3);
    expect(part2[0].cueBullets?.length).toBeGreaterThanOrEqual(3);
    expect(part2[0].prepSeconds).toBe(60);
    expect(part2[0].speakSeconds).toBe(120);
  });

  it('builds a custom topic and filters categories by coach role', () => {
    const custom = buildCustomTopic('System design for distributed cache');
    expect(custom.category).toBe('custom');
    expect(custom.prompt).toContain('System design for distributed cache');
    expect(getSuggestedCategoriesForRole('ielts_examiner')).toContain('ielts_part2');
    expect(getSuggestedCategoriesForRole('job_interview')).toContain('interview');
  });
});

describe('GeminiLiveClient binary WebSocket frame decoding', () => {
  it('decodes Blob and ArrayBuffer setupComplete and serverContent frames from Google BidiGenerateContent', async () => {
    const { GeminiLiveClient } = await import('./gemini-live-client');

    const sentPayloads: string[] = [];
    let activeSocket: {
      readyState: number;
      onopen: (() => void) | null;
      onmessage: ((ev: { data: unknown }) => void) | null;
      onerror: (() => void) | null;
      onclose: ((ev: { code: number; reason: string }) => void) | null;
      send: (data: string) => void;
      close: () => void;
    } | null = null;

    const origFetch = globalThis.fetch;
    const origWS = globalThis.WebSocket;

    try {
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            models: [
              {
                name: 'models/gemini-2.5-flash-native-audio-latest',
                supportedGenerationMethods: ['bidiGenerateContent'],
              },
            ],
          }),
          { status: 200 },
        )) as typeof fetch;

      class MockWebSocket {
        static OPEN = 1;
        readyState = 1;
        onopen: (() => void) | null = null;
        onmessage: ((ev: { data: unknown }) => void) | null = null;
        onerror: (() => void) | null = null;
        onclose: ((ev: { code: number; reason: string }) => void) | null = null;
        constructor() {
          activeSocket = this;
        }
        send(data: string) {
          sentPayloads.push(data);
        }
        close() {}
      }

      globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;

      let setupCompleted = false;
      const receivedAudio: string[] = [];
      const transcripts: Array<{ speaker: string; text: string }> = [];

      const client = new GeminiLiveClient(
        {
          onSetupComplete: () => {
            setupCompleted = true;
          },
          onAudioData: (b64) => receivedAudio.push(b64),
          onInterrupted: () => {},
          onTranscript: (speaker, text) => transcripts.push({ speaker, text }),
          onVocabDiscovered: () => {},
          onFeedbackGiven: () => {},
          onError: (err) => {
            throw err;
          },
          onClose: () => {},
        },
        {
          id: 'p-gemini',
          name: 'Google Gemini',
          kind: 'gemini-live',
          baseUrl: 'https://generativelanguage.googleapis.com',
          model: 'gemini-2.5-flash-native-audio-latest',
          keys: ['AIzaTestKey'],
          keyIndex: 0,
        },
        'AIzaTestKey',
        'ielts_examiner',
        'Aoede',
      );

      client.connect();

      // Wait for preflight() promise microtasks to open the socket
      for (let i = 0; i < 10 && !activeSocket; i++) {
        await new Promise((r) => setTimeout(r, 5));
      }
      expect(activeSocket).not.toBeNull();

      activeSocket!.onopen?.();
      expect(sentPayloads.length).toBe(1);
      const setupMsg = JSON.parse(sentPayloads[0]);
      expect(setupMsg.setup.model).toBe('models/gemini-2.5-flash-native-audio-latest');
      expect(setupMsg.setup.inputAudioTranscription).toEqual({});
      expect(setupMsg.setup.outputAudioTranscription).toEqual({});

      // Simulate Google sending setupComplete as a binary Blob (browser behavior)
      const setupBlob = new Blob([JSON.stringify({ setupComplete: {} })], {
        type: 'application/json',
      });
      activeSocket!.onmessage?.({ data: setupBlob });

      // Simulate audio + transcript arriving as an ArrayBuffer frame
      const contentBytes = new TextEncoder().encode(
        JSON.stringify({
          serverContent: {
            modelTurn: {
              parts: [{ inlineData: { mimeType: 'audio/pcm', data: 'AAAA' } }],
            },
            outputTranscription: { text: 'Hello! Let us begin Part 1.', finished: true },
          },
        }),
      );
      activeSocket!.onmessage?.({ data: contentBytes.buffer });

      // Allow async Blob.text() and messageQueue to settle
      await new Promise((r) => setTimeout(r, 25));

      expect(setupCompleted).toBe(true);
      expect(receivedAudio).toEqual(['AAAA']);
      expect(transcripts).toEqual([{ speaker: 'model', text: 'Hello! Let us begin Part 1.' }]);

      client.disconnect();
    } finally {
      globalThis.fetch = origFetch;
      globalThis.WebSocket = origWS;
    }
  });
});
