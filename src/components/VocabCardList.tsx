import React from 'react';
import { VocabCard } from '../types';
import { BookMarked, Download, Trash2, Volume2, X } from 'lucide-react';
import { useT } from '../i18n/store';
import { buildCsv, buildJson, buildAnki, buildLeitnerProJson, speakText } from '../utils/exporters';

interface Props {
  cards: VocabCard[];
  onClear: () => void;
  onDeleteCard?: (id: string) => void;
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

export const VocabCardList: React.FC<Props> = ({ cards, onClear, onDeleteCard }) => {
  const t = useT();
  const dateStamp = new Date().toISOString().slice(0, 10);

  const exportToCSV = () => {
    if (cards.length === 0) return;
    downloadFile(buildCsv(cards), `Leitner_Vocab_${dateStamp}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportToJSON = () => {
    if (cards.length === 0) return;
    downloadFile(buildJson(cards), `Leitner_Vocab_${dateStamp}.json`, 'application/json');
  };

  const exportToAnki = () => {
    if (cards.length === 0) return;
    downloadFile(buildAnki(cards), `Leitner_Vocab_${dateStamp}.txt`, 'text/plain;charset=utf-8;');
  };

  const exportToLeitnerPro = () => {
    if (cards.length === 0) return;
    downloadFile(
      buildLeitnerProJson(cards),
      `LeitnerProMax_Deck_${dateStamp}.json`,
      'application/json',
    );
  };

  const buttonClass =
    'text-[11px] bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/30 transition';

  return (
    <div className="bg-surface/80 backdrop-blur border border-slate-800 rounded-2xl p-4 flex flex-col h-full max-h-[350px]">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 shrink-0">
          <BookMarked className="w-4 h-4 text-indigo-400" />
          {t('vocab.title', { n: cards.length })}
        </h3>
        {cards.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={exportToLeitnerPro}
              className="text-[11px] bg-emerald-600/25 hover:bg-emerald-600/45 text-emerald-300 px-2 py-1 rounded-lg border border-emerald-500/30 transition font-medium"
              title={t('vocab.exportLeitner')}
            >
              <Download className="w-3 h-3 inline mr-0.5" />Leitner Pro
            </button>
            <button onClick={exportToCSV} className={buttonClass} title={t('vocab.exportCsv')}>
              CSV
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
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs flex flex-col gap-1 group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-bold text-indigo-300 text-sm truncate">{card.word}</span>
                  {card.phonetic && <span className="text-[11px] text-slate-400 font-mono">/{card.phonetic}/</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => speakText(card.word)}
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition"
                    title={t('vocab.listen')}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  {onDeleteCard && (
                    <button
                      onClick={() => onDeleteCard(card.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                      title={t('vocab.deleteCard')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
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
