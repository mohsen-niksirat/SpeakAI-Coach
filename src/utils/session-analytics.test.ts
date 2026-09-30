import { describe, it, expect } from 'vitest';
import { computeSessionAnalytics } from './session-analytics';
import { FeedbackLog, SessionReport, SessionStats, TranscriptEntry, VocabCard } from '../types';

describe('computeSessionAnalytics', () => {
  const baseStats: SessionStats = {
    durationSeconds: 120,
    wordsRecordedCount: 3,
    correctionsCount: 2,
    estimatedBandScore: 7.0,
  };

  const sampleTranscript: TranscriptEntry[] = [
    {
      id: '1',
      role: 'model',
      text: 'Hello! Tell me about your hometown and what you enjoy most about living there.',
      done: true,
    },
    {
      id: '2',
      role: 'user',
      text: 'Actually, I live in a vibrant metropolitan city. However, what I appreciate most is the historical architecture and the welcoming atmosphere.',
      done: true,
    },
    {
      id: '3',
      role: 'model',
      text: 'That sounds fascinating. For example, how has transportation changed in recent years?',
      done: true,
    },
    {
      id: '4',
      role: 'user',
      text: 'In my opinion, public transportation has improved significantly because the municipality invested in underground metro lines, for example in the downtown area.',
      done: true,
    },
  ];

  const sampleFeedback: FeedbackLog[] = [
    {
      id: 'f1',
      userSpoke: 'has improve',
      betterAlternative: 'has improved',
      explanation: 'Use past participle after has.',
      type: 'grammar',
      timestamp: '10:01',
    },
    {
      id: 'f2',
      userSpoke: 'architec-ture',
      betterAlternative: 'ˈɑː.kɪ.tek.tʃər',
      explanation: 'Stress the first syllable.',
      type: 'pronunciation',
      timestamp: '10:02',
    },
  ];

  const sampleVocab: VocabCard[] = [
    {
      id: 'v1',
      word: 'metropolitan',
      phonetic: 'ˌmet.rəˈpɒl.ɪ.tən',
      definition: 'Relating to a large city',
      contextSentence: 'I live in a vibrant metropolitan city.',
      timestamp: '10:01',
    },
  ];

  const sampleReport: SessionReport = {
    overallBand: 7.0,
    criteria: [
      { key: 'fluency', label: 'Fluency & Coherence', band: 7.0, comment: 'Smooth delivery with good connectors.' },
      { key: 'lexical', label: 'Lexical Resource', band: 7.5, comment: 'Strong collocations like metropolitan city.' },
      { key: 'grammar', label: 'Grammatical Range & Accuracy', band: 6.5, comment: 'Good complex structures with minor tense slip.' },
      { key: 'pronunciation', label: 'Pronunciation', band: 7.0, comment: 'Clear and intelligible.' },
    ],
    strengths: ['Natural use of discourse markers', 'Rich topic vocabulary'],
    improvements: ['Watch present perfect participle forms'],
  };

  it('computes 8 skill dimensions, 6 radar axes, WPM, CEFR level, and discourse markers', () => {
    const analytics = computeSessionAnalytics(
      baseStats,
      sampleReport,
      sampleTranscript,
      sampleFeedback,
      sampleVocab,
    );

    expect(analytics.overallBand).toBe(7.0);
    expect(analytics.cefrLevel).toBe('C1');
    expect(analytics.skills).toHaveLength(8);
    expect(analytics.radarSkills).toHaveLength(6);
    expect(analytics.userWordCount).toBeGreaterThan(30);
    expect(analytics.uniqueWordsCount).toBeGreaterThan(20);
    expect(analytics.wpm).toBeGreaterThan(40);
    expect(analytics.discourseMarkersUsed).toEqual(
      expect.arrayContaining(['however', 'actually', 'in my opinion', 'for example']),
    );
    expect(analytics.errorBreakdown.grammar).toBe(1);
    expect(analytics.errorBreakdown.pronunciation).toBe(1);
    expect(analytics.errorBreakdown.total).toBe(2);
    expect(analytics.topAdvancedWords).toContain('metropolitan');
  });

  it('produces complete heuristic analytics even when AI report is null and transcript is empty', () => {
    const analytics = computeSessionAnalytics(
      {
        durationSeconds: 30,
        wordsRecordedCount: 0,
        correctionsCount: 0,
        estimatedBandScore: 6.5,
      },
      null,
      [],
      [],
      [],
    );

    expect(analytics.overallBand).toBe(6.5);
    expect(analytics.cefrLevel).toBe('B2');
    expect(analytics.skills).toHaveLength(8);
    expect(analytics.radarSkills).toHaveLength(6);
    expect(analytics.strengthsFa.length).toBeGreaterThan(0);
    expect(analytics.actionPlanFa.length).toBeGreaterThan(0);
  });
});
