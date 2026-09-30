import React, { useState, useEffect } from 'react';
import { PracticeTopic } from '../types';
import { ClipboardList, Timer, Play, RotateCcw } from 'lucide-react';
import { useLang, useT } from '../i18n/store';

interface Props {
  topic: PracticeTopic;
}

export const CueCardWidget: React.FC<Props> = ({ topic }) => {
  const t = useT();
  const [lang] = useLang();
  const [mode, setMode] = useState<'idle' | 'prep' | 'speak'>('idle');
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const prepTotal = topic.prepSeconds ?? 60;
  const speakTotal = topic.speakSeconds ?? 120;

  useEffect(() => {
    setMode('idle');
    setSecondsLeft(0);
  }, [topic.id]);

  useEffect(() => {
    if (mode === 'idle' || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (mode === 'prep') {
            setMode('speak');
            return speakTotal;
          }
          setMode('idle');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [mode, secondsLeft, speakTotal]);

  if (!topic.cueBullets || topic.cueBullets.length === 0) return null;

  const startPrep = () => {
    setMode('prep');
    setSecondsLeft(prepTotal);
  };

  const startSpeak = () => {
    setMode('speak');
    setSecondsLeft(speakTotal);
  };

  const resetTimer = () => {
    setMode('idle');
    setSecondsLeft(0);
  };

  const totalForMode = mode === 'prep' ? prepTotal : mode === 'speak' ? speakTotal : 1;
  const pct = mode === 'idle' ? 0 : Math.max(0, Math.min(100, (secondsLeft / totalForMode) * 100));

  const formatMmSs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-md bg-indigo-950/35 border border-indigo-500/30 rounded-2xl p-4 mb-3 text-xs shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 font-bold text-indigo-300">
          <ClipboardList className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{lang === 'fa' ? topic.titleFa : topic.title}</span>
        </div>
        {mode !== 'idle' && (
          <span
            className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
              mode === 'prep'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {mode === 'prep' ? 'PREP' : 'SPEAK'} • {formatMmSs(secondsLeft)}
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-300 font-semibold mb-1.5">{t('cue.youShouldSay')}</p>
      <ul className="space-y-1 text-slate-200 pl-4 list-disc mb-3">
        {topic.cueBullets.map((b, i) => (
          <li key={i} className="leading-snug">
            {b}
          </li>
        ))}
      </ul>

      {mode !== 'idle' && (
        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden mb-2.5">
          <div
            className={`h-full transition-all duration-500 ${
              mode === 'prep' ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={startPrep}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-medium transition ${
            mode === 'prep'
              ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          <Timer className="w-3.5 h-3.5 text-amber-400" />
          {t('cue.prepTimer')}
        </button>
        <button
          onClick={startSpeak}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-medium transition ${
            mode === 'speak'
              ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          {t('cue.speakTimer')}
        </button>
        {mode !== 'idle' && (
          <button
            onClick={resetTimer}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('cue.resetTimer')}
          </button>
        )}
      </div>
    </div>
  );
};
