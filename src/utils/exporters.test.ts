import { describe, it, expect } from 'vitest';
import { buildCsv, buildJson, buildAnki, buildLeitnerProJson, csvEscape } from './exporters';
import { VocabCard } from '../types';

const cards: VocabCard[] = [
  {
    id: '1',
    word: 'serendipity',
    phonetic: 'ˌsɛrənˈdɪpɪti',
    definition: 'a fortunate discovery made by accident',
    contextSentence: 'It was pure serendipity that we met.',
    timestamp: '10:00',
  },
  {
    id: '2',
    word: 'quote "hi"',
    definition: 'says "hi"',
    contextSentence: 'He wrote "hi" on the board.',
    timestamp: '10:01',
  },
];

describe('csvEscape', () => {
  it('wraps in quotes and doubles inner quotes', () => {
    expect(csvEscape('plain')).toBe('"plain"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });
});

describe('buildCsv', () => {
  it('starts with the header row', () => {
    expect(buildCsv(cards).startsWith('Word,Phonetic,Definition,Context Sentence')).toBe(true);
  });

  it('escapes quotes in every field', () => {
    const csv = buildCsv([cards[1]]);
    // input `quote "hi"` → field "quote ""hi"""
    expect(csv).toContain('"quote ""hi"""');
    expect(csv).toContain('"says ""hi"""');
  });
});

describe('buildJson', () => {
  it('round-trips through JSON.parse', () => {
    expect(JSON.parse(buildJson(cards))).toHaveLength(2);
  });
});

describe('buildAnki', () => {
  it('produces front<TAB>back lines', () => {
    const lines = buildAnki([cards[0]]).split('\n');
    expect(lines).toHaveLength(1);
    const [front, back] = lines[0].split('\t');
    expect(front).toBe('serendipity');
    expect(back).toContain('fortunate discovery');
    expect(back).toContain('<br>');
    expect(back).toContain('/ˌsɛrənˈdɪpɪti/');
  });

  it('never leaks tabs into the back field', () => {
    const weird: VocabCard[] = [{ ...cards[0], definition: 'a\tb' }];
    const [front, ...rest] = buildAnki(weird).split('\t');
    expect(front).toBe('serendipity');
    expect(rest.join('\t')).not.toContain('\t');
  });
});

describe('buildLeitnerProJson', () => {
  it('exports a Leitner-Pro-Max compatible v2 deck with box=1 and SpeakAI tag', () => {
    const parsed = JSON.parse(buildLeitnerProJson(cards));
    expect(parsed.version).toBe(2);
    expect(parsed.source).toBe('SpeakAI-Coach');
    expect(parsed.cards).toHaveLength(2);
    expect(parsed.cards[0]).toMatchObject({
      word: 'serendipity',
      meaning: 'a fortunate discovery made by accident',
      phonetic: '/ˌsɛrənˈdɪpɪti/',
      example: 'It was pure serendipity that we met.',
      tag: 'SpeakAI',
      box: 1,
    });
  });
});
