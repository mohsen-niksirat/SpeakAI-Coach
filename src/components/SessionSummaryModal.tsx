import React from 'react';
import { SessionStats, SessionReport, ReportStatus } from '../types';
import { Award, Clock, BookOpen, AlertCircle, X, Loader2, ThumbsUp, TrendingUp } from 'lucide-react';
import { useT } from '../i18n/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stats: SessionStats;
  report: SessionReport | null;
  reportStatus: ReportStatus;
}

export const SessionSummaryModal: React.FC<Props> = ({ isOpen, onClose, stats, report, reportStatus }) => {
  const t = useT();
  if (!isOpen) return null;

  const minutes = Math.floor(stats.durationSeconds / 60);
  const seconds = stats.durationSeconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <Award className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-white mb-1 text-center">{t('summary.title')}</h2>
        <p className="text-xs text-slate-400 mb-6 text-center">{t('summary.subtitle')}</p>

        <div className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-4 mb-4 text-center">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{t('summary.band')}</span>

          {reportStatus === 'loading' ? (
            <div className="flex flex-col items-center gap-2 mt-2 pb-1">
              <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
              <span className="text-[11px] text-slate-400">{t('summary.analyzing')}</span>
            </div>
          ) : (
            <>
              <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 mt-1">
                {stats.estimatedBandScore.toFixed(1)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {reportStatus === 'ready' ? t('summary.aiEvaluated') : t('summary.heuristic')}
              </p>
            </>
          )}
        </div>

        <p className="text-[10px] text-slate-500 text-center -mt-2 mb-4 leading-relaxed">
          {t('summary.disclaimer')}
        </p>

        {reportStatus === 'ready' && report && (
          <div className="space-y-4 mb-4">
            <div className="space-y-2">
              {report.criteria.map((c) => (
                <div key={c.key} className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200">{t(`criteria.${c.key}`)}</span>
                    <span className="text-xs font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded-lg px-2 py-0.5">
                      {c.band.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{c.comment}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed">{t('summary.pronunciationNote')}</p>

            {report.strengths.length > 0 && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                <h4 className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5 mb-1.5">
                  <ThumbsUp className="w-3.5 h-3.5" /> {t('summary.strengths')}
                </h4>
                <ul className="space-y-1">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="text-[11px] text-slate-300 leading-snug">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.improvements.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> {t('summary.focus')}
                </h4>
                <ul className="space-y-1">
                  {report.improvements.map((s, i) => (
                    <li key={i} className="text-[11px] text-slate-300 leading-snug">• {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-start">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-400 mb-1" />
            <div className="text-[11px] text-slate-500">{t('summary.duration')}</div>
            <div className="text-xs font-semibold text-slate-200">
              {minutes}m {seconds}s
            </div>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400 mb-1" />
            <div className="text-[11px] text-slate-500">{t('summary.vocab')}</div>
            <div className="text-xs font-semibold text-slate-200">
              {t('summary.words', { n: stats.wordsRecordedCount })}
            </div>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 mb-1" />
            <div className="text-[11px] text-slate-500">{t('summary.alerts')}</div>
            <div className="text-xs font-semibold text-slate-200">
              {t('summary.flaws', { n: stats.correctionsCount })}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl text-xs transition"
        >
          {t('settings.done')}
        </button>
      </div>
    </div>
  );
};
