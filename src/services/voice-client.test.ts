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
