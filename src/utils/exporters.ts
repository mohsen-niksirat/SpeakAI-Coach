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
