import React from 'react';
import { SessionHistoryEntry } from '../types';
import { X, History, TrendingUp, Clock, Award, Trash2, Eye } from 'lucide-react';
import { useT } from '../i18n/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: SessionHistoryEntry[];
  onClearHistory: () => void;
  onSelectEntry: (entry: SessionHistoryEntry) => void;
}

export const HistoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  entries,
  onClearHistory,
  onSelectEntry,
}) => {
  const t = useT();
  if (!isOpen) return null;

  const totalSessions = entries.length;
  const avgBand =
    totalSessions > 0
      ? Math.round((entries.reduce((acc, e) => acc + e.overallBand, 0) / totalSessions) * 10) / 10
      : 0;
  const totalSeconds = entries.reduce((acc, e) => acc + e.durationSeconds, 0);
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));

  const recentChronological = [...entries].slice(0, 10).reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-5 pr-8">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            {t('history.title')}
          </h2>
          {entries.length > 0 && (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1 text-[11px] bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 px-2.5 py-1 rounded-lg border border-rose-500/30 transition"
              title={t('history.clear')}
            >
              <Trash2 className="w-3 h-3" /> {t('history.clear')}
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 italic">
            {t('history.empty')}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
                <TrendingUp className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                <div className="text-[11px] text-slate-400">{t('history.sessions')}</div>
                <div className="text-sm font-bold text-white">{totalSessions}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
                <Award className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <div className="text-[11px] text-slate-400">{t('history.avgBand')}</div>
                <div className="text-sm font-bold text-emerald-400">{avgBand.toFixed(1)}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
                <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="text-[11px] text-slate-400">{t('history.totalTime')}</div>
                <div className="text-sm font-bold text-white">
                  {totalSeconds < 60 ? `${totalSeconds}s` : `${totalMinutes}m`}
                </div>
              </div>
            </div>

            {recentChronological.length > 1 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 mb-4">
                <div className="text-[11px] font-semibold text-slate-400 mb-2">
                  IELTS Band Trend (Last {recentChronological.length})
                </div>
                <div className="flex items-end gap-2 h-20 pt-2">
                  {recentChronological.map((item) => {
                    const heightPct = Math.max(15, Math.min(100, (item.overallBand / 9) * 100));
                    return (
                      <div key={item.id} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-indigo-300">
                          {item.overallBand.toFixed(1)}
                        </span>
                        <div className="w-full bg-slate-800 rounded-t-md h-12 flex items-end overflow-hidden">
                          <div
                            className="w-full bg-gradient-to-t from-indigo-600 to-emerald-400 rounded-t-md"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {entries.map((entry) => {
                const dateStr = new Date(entry.dateIso).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const mins = Math.floor(entry.durationSeconds / 60);
                const secs = entry.durationSeconds % 60;
                return (
                  <div
                    key={entry.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-300">
                          Band {entry.overallBand.toFixed(1)}
                        </span>
                        <span className="text-[11px] text-slate-400">• {t(`roles.${entry.role}`)}</span>
                      </div>
                      {entry.topicTitle && (
                        <div className="text-[11px] text-slate-300 truncate mt-0.5">{entry.topicTitle}</div>
                      )}
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {dateStr} • {mins}m {secs}s • {t('summary.words', { n: entry.wordsRecordedCount })} •{' '}
                        {t('summary.flaws', { n: entry.correctionsCount })}
                      </div>
                    </div>
                    <button
                      onClick={() => onSelectEntry(entry)}
                      className="flex items-center gap-1 text-[11px] bg-indigo-600/25 hover:bg-indigo-600/45 text-indigo-300 px-2.5 py-1.5 rounded-lg border border-indigo-500/30 transition shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {t('history.viewReport')}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
