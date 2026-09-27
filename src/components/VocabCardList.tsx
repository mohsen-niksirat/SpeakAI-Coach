import React from 'react';
import { VocabCard } from '../types';
import { BookMarked, Download, Trash2 } from 'lucide-react';
import { useT } from '../i18n/store';

interface Props {
  cards: VocabCard[];
  onClear: () => void;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export const VocabCardList: React.FC<Props> = ({ cards, onClear }) => {
  const t = useT();
  const dateStamp = new Date().toISOString().slice(0, 10);

  const exportToCSV = () => {
    if (cards.length === 0) return;
    const header = 'Word,Phonetic,Definition,Context Sentence\n';
    const rows = cards
      .map((c) => [c.word, c.phonetic || '', c.definition, c.contextSentence].map(csvEscape).join(','))
      .join('\n');
    downloadFile(header + rows, `Leitner_Vocab_${dateStamp}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportToJSON = () => {
    if (cards.length === 0) return;
    downloadFile(JSON.stringify(cards, null, 2), `Leitner_Vocab_${dateStamp}.json`, 'application/json');
  };

  const exportToAnki = () => {
    if (cards.length === 0) return;
    const rows = cards.map((c) => {
      const phonetic = c.phonetic ? ` /${c.phonetic}/` : '';
      const back = `${c.definition}<br><i>${c.contextSentence}</i>${phonetic}`;
      return `${c.word}\t${back.replace(/\t/g, ' ')}`;
    });
    downloadFile(rows.join('\n'), `Leitner_Vocab_${dateStamp}.txt`, 'text/plain;charset=utf-8;');
  };

  const buttonClass =
    'text-[11px] bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/30 transition';

  return (
    <div className="bg-surface/80 backdrop-blur border border-slate-800 rounded-2xl p-4 flex flex-col h-full max-h-[350px]">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 shrink-0">
          <BookMarked className="w-4 h-4 text-indigo-400" />
          {t('vocab.title', { n: cards.length })}
        </h3>
        {cards.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button onClick={exportToCSV} className={buttonClass} title={t('vocab.exportCsv')}>
              <Download className="w-3 h-3 inline mr-0.5" />CSV
            </button>
            <button onClick={exportToJSON} className={buttonClass} title={t('vocab.exportJson')}>
              JSON
            </button>
            <button onClick={exportToAnki} className={buttonClass} title={t('vocab.exportAnki')}>
              Anki
            </button>
            <button
              onClick={onClear}
              className="text-[11px] bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 px-2 py-1 rounded-lg border border-rose-500/30 transition"
              title={t('vocab.clear')}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {cards.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 italic text-center px-2">
            {t('vocab.empty')}
          </div>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs flex flex-col gap-1"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-indigo-300 text-sm">{card.word}</span>
                {card.phonetic && <span className="text-[11px] text-slate-400 font-mono">/{card.phonetic}/</span>}
              </div>
              <p className="text-slate-200">{card.definition}</p>
              <p className="text-slate-400 text-[11px] italic bg-slate-950/50 p-1.5 rounded mt-1">
                "{card.contextSentence}"
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
