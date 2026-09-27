import React from 'react';
import { FeedbackLog } from '../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useT } from '../i18n/store';

interface Props {
  logs: FeedbackLog[];
}

export const LiveFeedbackPanel: React.FC<Props> = ({ logs }) => {
  const t = useT();
  return (
    <div className="bg-surface/80 backdrop-blur border border-slate-800 rounded-2xl p-4 flex flex-col h-full max-h-[350px]">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        {t('feedback.title', { n: logs.length })}
      </h3>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 italic text-center px-2">
            {t('feedback.empty')}
          </div>
        ) : (
          logs.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs flex flex-col gap-1.5 shadow-sm"
            >
              <div className="flex items-center gap-1.5 text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="line-through opacity-90">{item.userSpoke}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{item.betterAlternative}</span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">{item.explanation}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
