import { describe, it, expect } from 'vitest';
import { handleToolCall, getRolePrompt, TOOL_DECLARATIONS } from './voice-client';

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

describe('getRolePrompt', () => {
  it('returns a distinct prompt per role', () => {
    const ielts = getRolePrompt('ielts_examiner');
    const friendly = getRolePrompt('friendly_chat');
    expect(ielts).toContain('IELTS');
    expect(ielts).not.toBe(friendly);
  });
});
