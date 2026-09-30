import { describe, it, expect } from 'vitest';
import { evaluateShadowing, analyzeFluency, levenshteinSimilarity, SHADOWING_DECK } from './shadowing';
import { TranscriptEntry } from '../types';

describe('shadowing evaluation & fluency metrics', () => {
  it('computes 100% accuracy for an exact sentence match ignoring punctuation and casing', () => {
    const target = "Let's grab a bite to eat before the movie starts at seven.";
    const spoken = 'lets grab a bite to eat before the movie starts at seven';
    const res = evaluateShadowing(target, spoken, 5);
    expect(res.accuracyPct).toBe(100);
    expect(res.grade).toBe('excellent');
    expect(res.words.every((w) => w.status === 'exact')).toBe(true);
    expect(res.wpm).toBe(144);
  });

  it('marks close morphological/phonetic matches as close and missing words as missed', () => {
    const target = 'While urbanization boosts economic growth';
    const spoken = 'While urbanization boost growth';
    const res = evaluateShadowing(target, spoken, 3);
    expect(res.words[0].status).toBe('exact'); // While
    expect(res.words[1].status).toBe('exact'); // urbanization
    expect(res.words[2].status).toBe('close'); // boosts vs boost
    expect(res.words[3].status).toBe('missed'); // economic (skipped)
    expect(res.words[4].status).toBe('exact'); // growth
    expect(res.accuracyPct).toBeGreaterThan(65);
  });

  it('computes Levenshtein similarity accurately', () => {
    expect(levenshteinSimilarity('through', 'through')).toBe(1);
    expect(levenshteinSimilarity('boosts', 'boost')).toBeGreaterThan(0.8);
    expect(levenshteinSimilarity('apple', 'zebra')).toBeLessThan(0.3);
  });

  it('analyzes live fluency metrics including WPM, lexical diversity, and filler words', () => {
    const entries: TranscriptEntry[] = [
      { id: '1', role: 'model', text: 'Tell me about your job.', done: true },
      {
        id: '2',
        role: 'user',
        text: 'Um I basically work as a software engineer and like you know I build web applications.',
        done: true,
      },
    ];
    const metrics = analyzeFluency(entries, 16);
    expect(metrics.totalWords).toBe(16);
    expect(metrics.fillerCount).toBeGreaterThanOrEqual(4); // um, basically, like, you know
    expect(metrics.wpm).toBeGreaterThan(0);
    expect(metrics.lexicalDiversityPct).toBeGreaterThan(70);
  });

  it('provides curated shadowing sentences across all 4 levels', () => {
    expect(SHADOWING_DECK.some((d) => d.level === 'daily')).toBe(true);
    expect(SHADOWING_DECK.some((d) => d.level === 'ielts')).toBe(true);
    expect(SHADOWING_DECK.some((d) => d.level === 'ted')).toBe(true);
    expect(SHADOWING_DECK.some((d) => d.level === 'twisters')).toBe(true);
  });
});
