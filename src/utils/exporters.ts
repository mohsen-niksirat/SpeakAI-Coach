import { VocabCard } from '../types';

export function csvEscape(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildCsv(cards: VocabCard[]): string {
  const header = 'Word,Phonetic,Definition,Context Sentence\n';
  const rows = cards
    .map((c) => [c.word, c.phonetic || '', c.definition, c.contextSentence].map(csvEscape).join(','))
    .join('\n');
  return header + rows;
}

export function buildJson(cards: VocabCard[]): string {
  return JSON.stringify(cards, null, 2);
}

export function buildAnki(cards: VocabCard[]): string {
  return cards
    .map((c) => {
      const phonetic = c.phonetic ? ` /${c.phonetic}/` : '';
      const back = `${c.definition}<br><i>${c.contextSentence}</i>${phonetic}`;
      return `${c.word}\t${back.replace(/\t/g, ' ')}`;
    })
    .join('\n');
}

export function buildLeitnerProJson(cards: VocabCard[]): string {
  const now = Date.now();
  const payload = {
    version: 2,
    source: 'SpeakAI-Coach',
    exportedAt: new Date(now).toISOString(),
    cards: cards.map((c, idx) => ({
      id: `speakai_${c.id}_${idx}`,
      word: c.word,
      meaning: c.definition,
      phonetic: c.phonetic ? `/${c.phonetic.replace(/^\/|\/$/g, '')}/` : '',
      example: c.contextSentence,
      tag: 'SpeakAI',
      box: 1,
      created: now,
      nextReview: now,
      reps: 0,
      lapses: 0,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function speakText(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.trim());
    utter.lang = 'en-US';
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  } catch {
    // ignore speechSynthesis errors
  }
}
