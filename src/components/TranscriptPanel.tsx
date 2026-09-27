import React, { useEffect, useRef } from 'react';
import { TranscriptEntry } from '../types';
import { MessagesSquare } from 'lucide-react';
import { useT } from '../i18n/store';

interface Props {
  entries: TranscriptEntry[];
}

export const TranscriptPanel: React.FC<Props> = ({ entries }) => {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <div className="bg-surface/80 backdrop-blur border border-slate-800 rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <MessagesSquare className="w-4 h-4 text-indigo-400" />
        {t('transcript.title')}
      </h3>

      <div ref={scrollRef} className="h-40 md:h-48 overflow-y-auto space-y-2 pr-1">
        {entries.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 italic text-center px-2">
            {t('transcript.empty')}
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  entry.role === 'user'
                    ? 'bg-emerald-600/15 border border-emerald-500/25 text-emerald-200'
                    : 'bg-indigo-600/15 border border-indigo-500/25 text-indigo-200'
                }`}
              >
                <span className="block text-[10px] uppercase tracking-wider opacity-60 mb-0.5">
                  {entry.role === 'user' ? t('transcript.you') : t('transcript.coach')}
                </span>
                {entry.text}
                {!entry.done && <span className="inline-block w-1.5 h-3 bg-current opacity-70 animate-pulse ml-0.5" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
