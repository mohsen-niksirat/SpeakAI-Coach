import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SHADOWING_DECK,
  ShadowingLevel,
  evaluateShadowing,
  ShadowingEvaluation,
} from '../utils/shadowing';
import { speakText, stopSpeaking } from '../utils/exporters';
import { TranscriptEntry } from '../types';
import { useLang, useT } from '../i18n/store';
import {
  Headphones,
  Volume2,
  Turtle,
  Zap,
  Mic,
  Square,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface Props {
  transcript: TranscriptEntry[];
  externalTargetText?: string | null;
  onClearExternalTarget?: () => void;
}

type StudioTab = ShadowingLevel | 'live';

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as
    | (new () => SpeechRecognitionInstance)
    | null;
}

export const ShadowingStudio: React.FC<Props> = ({
  transcript,
  externalTargetText,
  onClearExternalTarget,
}) => {
  const t = useT();
  const [lang] = useLang();
  const [tab, setTab] = useState<StudioTab>('daily');
  const [index, setIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [durationSec, setDurationSec] = useState<number | undefined>(undefined);

  const srRef = useRef<SpeechRecognitionInstance | null>(null);
  const recordStartMsRef = useRef<number>(0);

  useEffect(() => {
    if (externalTargetText && externalTargetText.trim()) {
      setTab('live');
      setSpokenText('');
      setDurationSec(undefined);
    }
  }, [externalTargetText]);

  const coachSentences = useMemo(() => {
    const list = transcript
      .filter((e) => e.role === 'model' && e.text.trim().length > 8)
      .map((e, idx) => ({
        id: `live_${e.id}_${idx}`,
        level: 'daily' as ShadowingLevel,
        text: e.text.trim(),
        phoneticTip: 'Live AI Coach sentence — mimic the exact rhythm and intonation',
        translationFa: 'جمله زنده مربی هوش مصنوعی — دقیقاً با همین آهنگ و لحن تکرار کن',
      }));
    if (externalTargetText && externalTargetText.trim()) {
      return [
        {
          id: 'live_pinned',
          level: 'daily' as ShadowingLevel,
          text: externalTargetText.trim(),
          phoneticTip: 'Pinned from Live Transcript',
          translationFa: 'انتخاب‌شده از متن گفتگو برای تمرین شدویینگ',
        },
        ...list.filter((item) => item.text !== externalTargetText.trim()),
      ];
    }
    return list.reverse();
  }, [transcript, externalTargetText]);

  const items = useMemo(() => {
    if (tab === 'live') return coachSentences;
    return SHADOWING_DECK.filter((d) => d.level === tab);
  }, [tab, coachSentences]);

  const safeIndex = items.length > 0 ? Math.min(index, items.length - 1) : 0;
  const currentItem = items[safeIndex] || null;

  const lastUserTurn = useMemo(() => {
    for (let i = transcript.length - 1; i >= 0; i--) {
      if (transcript[i].role === 'user' && transcript[i].text.trim()) {
        return transcript[i].text.trim();
      }
    }
    return '';
  }, [transcript]);

  useEffect(() => {
    if (!isRecording && lastUserTurn && currentItem) {
      setSpokenText(lastUserTurn);
    }
  }, [lastUserTurn, currentItem, isRecording]);

  useEffect(() => {
    return () => {
      srRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  const evaluation: ShadowingEvaluation | null = useMemo(() => {
    if (!currentItem || !spokenText.trim()) return null;
    return evaluateShadowing(currentItem.text, spokenText, durationSec);
  }, [currentItem, spokenText, durationSec]);

  const handleSelectTab = (nextTab: StudioTab) => {
    setTab(nextTab);
    setIndex(0);
    setSpokenText('');
    setDurationSec(undefined);
    if (nextTab !== 'live') {
      onClearExternalTarget?.();
    }
  };

  const handlePrev = () => {
    if (items.length === 0) return;
    setIndex((prev) => (prev - 1 + items.length) % items.length);
    setSpokenText('');
    setDurationSec(undefined);
  };

  const handleNext = () => {
    if (items.length === 0) return;
    setIndex((prev) => (prev + 1) % items.length);
    setSpokenText('');
    setDurationSec(undefined);
  };

  const toggleRecord = () => {
    if (isRecording) {
      srRef.current?.stop();
      setIsRecording(false);
      const elapsed = (Date.now() - recordStartMsRef.current) / 1000;
      if (elapsed >= 1) setDurationSec(elapsed);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    stopSpeaking();
    setSpokenText('');
    setDurationSec(undefined);

    try {
      const sr = new Ctor();
      sr.lang = 'en-US';
      sr.interimResults = true;
      sr.continuous = true;
      recordStartMsRef.current = Date.now();

      sr.onresult = (event) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript + ' ';
        }
        setSpokenText(combined.trim());
      };

      sr.onerror = () => {
        setIsRecording(false);
      };

      sr.onend = () => {
        setIsRecording(false);
        const elapsed = (Date.now() - recordStartMsRef.current) / 1000;
        if (elapsed >= 1) setDurationSec(elapsed);
      };

      srRef.current = sr;
      setIsRecording(true);
      sr.start();
    } catch {
      setIsRecording(false);
    }
  };

  const tabs: { id: StudioTab; label: string }[] = [
    { id: 'daily', label: t('shadow.level.daily') },
    { id: 'ielts', label: t('shadow.level.ielts') },
    { id: 'ted', label: t('shadow.level.ted') },
    { id: 'twisters', label: t('shadow.level.twisters') },
    { id: 'live', label: `${t('shadow.level.live')}${coachSentences.length ? ` (${coachSentences.length})` : ''}` },
  ];

  return (
    <div className="w-full max-w-2xl bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 mb-3 shadow-xl">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">{t('shadow.title')}</h3>
            <p className="text-[10px] text-slate-400">{t('shadow.subtitle')}</p>
          </div>
        </div>

        {items.length > 1 && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <button
              onClick={handlePrev}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title={t('shadow.prev')}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5">
              {safeIndex + 1}/{items.length}
            </span>
            <button
              onClick={handleNext}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title={t('shadow.next')}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => handleSelectTab(tb.id)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition border ${
              tab === tb.id
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {!currentItem ? (
        <div className="py-6 text-center text-xs text-slate-400 italic">{t('shadow.noLiveYet')}</div>
      ) : (
        <>
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 mb-2.5">
            <div className="flex flex-wrap gap-1.5 leading-relaxed" dir="ltr">
              {(evaluation
                ? evaluation.words
                : currentItem.text
                    .trim()
                    .split(/\s+/)
                    .map((w) => ({ word: w, status: null as null, spokenAs: undefined }))
              ).map((item, idx) => {
                let badgeClass =
                  'bg-slate-900 hover:bg-indigo-950/70 text-slate-100 border-slate-700/80';
                if (item.status === 'exact') {
                  badgeClass =
                    'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 font-semibold';
                } else if (item.status === 'close') {
                  badgeClass = 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-semibold';
                } else if (item.status === 'missed') {
                  badgeClass =
                    'bg-rose-500/20 text-rose-200 border-rose-500/40 underline decoration-rose-400';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => speakText(item.word, 0.85)}
                    className={`px-2 py-0.5 rounded-lg text-xs border transition ${badgeClass}`}
                    title={
                      item.spokenAs && item.status === 'close'
                        ? `Heard: "${item.spokenAs}" — Click to hear pronunciation`
                        : 'Click to hear word pronunciation'
                    }
                  >
                    {item.word}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
              <span className="text-indigo-300/90 font-mono text-[10px]" dir="ltr">
                💡 {currentItem.phoneticTip}
              </span>
              {lang === 'fa' && (
                <span className="text-slate-400 text-[11px]" dir="rtl">
                  {currentItem.translationFa}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => speakText(currentItem.text, 0.7)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-medium transition"
              >
                <Turtle className="w-3.5 h-3.5" />
                {t('shadow.listenSlow')}
              </button>
              <button
                onClick={() => speakText(currentItem.text, 0.95)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-[11px] font-medium transition"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {t('shadow.listenNormal')}
              </button>
              <button
                onClick={() => speakText(currentItem.text, 1.15)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-[11px] font-medium transition"
              >
                <Zap className="w-3.5 h-3.5" />
                {t('shadow.listenFast')}
              </button>
            </div>

            <button
              onClick={toggleRecord}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shadow ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  {t('shadow.recordStop')}
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  {t('shadow.recordStart')}
                </>
              )}
            </button>
          </div>

          {evaluation && (
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {evaluation.grade === 'excellent' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : evaluation.grade === 'good' ? (
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span
                    className={`text-xs font-bold ${
                      evaluation.grade === 'excellent'
                        ? 'text-emerald-300'
                        : evaluation.grade === 'good'
                        ? 'text-amber-300'
                        : 'text-rose-300'
                    }`}
                  >
                    {t(`shadow.grade.${evaluation.grade}`)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-[11px] font-bold">
                    {t('shadow.accuracy', { pct: evaluation.accuracyPct })}
                  </span>
                  {evaluation.wpm && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-[11px] font-mono">
                      {t('shadow.wpm', { wpm: evaluation.wpm })}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400" dir="ltr">
                <span className="text-slate-500 font-semibold">{t('shadow.youSaid')}</span>{' '}
                <span className="text-slate-200 italic">&ldquo;{spokenText}&rdquo;</span>
              </p>
              <p className="text-[10px] text-slate-500">{t('shadow.hint')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
