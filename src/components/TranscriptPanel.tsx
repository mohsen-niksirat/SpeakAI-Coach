import React, { useEffect, useRef, useState, useMemo } from 'react';
import { TranscriptEntry } from '../types';
import { speakText } from '../utils/exporters';
import { analyzeFluency } from '../utils/shadowing';
import { MessagesSquare, Volume2, Turtle, Headphones, Copy, Check } from 'lucide-react';
import { useT } from '../i18n/store';

interface Props {
  entries: TranscriptEntry[];
  sessionSeconds?: number;
  onShadowSentence?: (text: string) => void;
}

export const TranscriptPanel: React.FC<Props> = ({
  entries,
  sessionSeconds = 0,
  onShadowSentence,
}) => {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const metrics = useMemo(() => analyzeFluency(entries, sessionSeconds), [entries, sessionSeconds]);

  const handleCopy = () => {
    if (entries.length === 0 || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const text = entries
      .map((e) => `${e.role === 'user' ? 'You' : 'Coach'}: ${e.text}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="bg-surface/80 backdrop-blur border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <MessagesSquare className="w-4 h-4 text-indigo-400" />
          {t('transcript.title')}
        </h3>

        <div className="flex items-center gap-2 flex-wrap">
          {metrics.totalWords > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                {t('fluency.wpm', { n: metrics.wpm })}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                {t('fluency.words', { n: metrics.totalWords })}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300">
                {t('fluency.diversity', { n: metrics.lexicalDiversityPct })}
              </span>
              {metrics.fillerCount > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300"
                  title={metrics.topFillers.join(', ')}
                >
                  {t('fluency.fillers', { n: metrics.fillerCount })}
                </span>
              )}
            </div>
          )}

          {entries.length > 0 && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] transition"
              title={t('transcript.copy')}
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? t('transcript.copied') : t('transcript.copy')}</span>
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="h-44 md:h-52 overflow-y-auto space-y-2 pr-1">
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
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed group ${
                  entry.role === 'user'
                    ? 'bg-emerald-600/15 border border-emerald-500/25 text-emerald-200'
                    : 'bg-indigo-600/15 border border-indigo-500/25 text-indigo-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-0.5">
                  <span className="block text-[10px] uppercase tracking-wider opacity-60">
                    {entry.role === 'user' ? t('transcript.you') : t('transcript.coach')}
                  </span>

                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                    <button
                      onClick={() => speakText(entry.text, 0.95)}
                      className="p-0.5 rounded hover:bg-slate-800/70 text-slate-300 hover:text-white transition"
                      title={t('transcript.listen')}
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => speakText(entry.text, 0.7)}
                      className="p-0.5 rounded hover:bg-slate-800/70 text-slate-300 hover:text-amber-300 transition"
                      title={t('transcript.slow')}
                    >
                      <Turtle className="w-3 h-3" />
                    </button>
                    {onShadowSentence && entry.text.trim().length > 6 && (
                      <button
                        onClick={() => onShadowSentence(entry.text)}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-200 text-[10px] font-medium transition"
                        title={t('transcript.shadowThis')}
                      >
                        <Headphones className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">{t('transcript.shadowThis')}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div dir="ltr">
                  {entry.text}
                  {!entry.done && (
                    <span className="inline-block w-1.5 h-3 bg-current opacity-70 animate-pulse ml-0.5" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
