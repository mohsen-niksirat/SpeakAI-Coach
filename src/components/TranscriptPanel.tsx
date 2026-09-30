import React, { useEffect, useRef, useState, useMemo } from 'react';
import { TranscriptEntry } from '../types';
import { speakText } from '../utils/exporters';
import { analyzeFluency } from '../utils/shadowing';
import {
  MessagesSquare,
  Volume2,
  Turtle,
  Headphones,
  Copy,
  Check,
  Send,
  Sparkles,
  MessageSquareText,
} from 'lucide-react';
import { useT, useLang } from '../i18n/store';

interface Props {
  entries: TranscriptEntry[];
  sessionSeconds?: number;
  onShadowSentence?: (text: string) => void;
  onSendText?: (text: string) => void;
  isConnected?: boolean;
  isConnecting?: boolean;
  sessionMode?: 'voice' | 'text';
}

const QUICK_PROMPTS = [
  {
    labelFa: '👋 شروع موضوع جلسه',
    labelEn: "👋 Let's start the topic",
    text: "Hello! Let's start our speaking practice on this topic. Ask me your first question.",
  },
  {
    labelFa: '🎯 سوال چالشی آیلتس',
    labelEn: '🎯 Ask an IELTS question',
    text: 'Please ask me a challenging IELTS Speaking question and evaluate my answer.',
  },
  {
    labelFa: '🛠️ اصلاح جمله قبلی من',
    labelEn: '🛠️ Correct my last sentence',
    text: 'Could you give me a more natural, Band 8+ way to say my last response?',
  },
  {
    labelFa: '🧠 آموزش ۳ واژه سطح C1',
    labelEn: '🧠 Teach 3 C1 words',
    text: 'Please teach me 3 advanced C1/C2 vocabulary words or idioms related to our topic and ask me to use one.',
  },
];

export const TranscriptPanel: React.FC<Props> = ({
  entries,
  sessionSeconds = 0,
  onShadowSentence,
  onSendText,
  isConnected = false,
  isConnecting = false,
  sessionMode = 'voice',
}) => {
  const t = useT();
  const [lang] = useLang();
  const isFa = lang === 'fa';
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [draftText, setDraftText] = useState('');

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

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = draftText.trim();
    if (!trimmed || !onSendText || isConnecting) return;
    onSendText(trimmed);
    setDraftText('');
  };

  const handleQuickPrompt = (promptText: string) => {
    if (!onSendText || isConnecting) return;
    onSendText(promptText);
    inputRef.current?.focus();
  };

  return (
    <div className="bg-surface/85 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <MessagesSquare className="w-4 h-4 text-indigo-400" />
            {isFa ? 'متن زنده مکالمه و چت متنی با مربی' : `${t('transcript.title')} & Text Chat`}
          </h3>
          {isConnected && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                sessionMode === 'text'
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                  : 'bg-indigo-500/15 border-indigo-500/35 text-indigo-300'
              }`}
            >
              {sessionMode === 'text'
                ? isFa
                  ? '💬 حالت چت متنی + صوتی'
                  : '💬 Text + TTS Mode'
                : isFa
                  ? '🎙️ مکالمه صوتی + متنی'
                  : '🎙️ Live Voice + Text'}
            </span>
          )}
        </div>

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

      {/* Messages Scroll Container */}
      <div ref={scrollRef} className="h-48 md:h-56 overflow-y-auto space-y-2.5 pr-1">
        {entries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 text-center px-3 gap-2">
            <MessageSquareText className="w-6 h-6 text-slate-600" />
            <p className="italic">
              {isFa
                ? 'مکالمه صوتی را شروع کنید یا همین پایین پیام انگلیسی خود را تایپ و ارسال کنید تا چت متنی با مربی آغاز شود.'
                : t('transcript.empty')}
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed group ${
                  entry.role === 'user'
                    ? 'bg-emerald-600/15 border border-emerald-500/30 text-emerald-100'
                    : 'bg-indigo-600/15 border border-indigo-500/30 text-indigo-100'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    {entry.role === 'user' ? t('transcript.you') : t('transcript.coach')}
                  </span>

                  <div className="flex items-center gap-1 opacity-75 group-hover:opacity-100 transition">
                    <button
                      onClick={() => speakText(entry.text, 0.95)}
                      className="p-0.5 rounded hover:bg-slate-800/70 text-slate-300 hover:text-white transition"
                      title={t('transcript.listen')}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => speakText(entry.text, 0.7)}
                      className="p-0.5 rounded hover:bg-slate-800/70 text-slate-300 hover:text-amber-300 transition"
                      title={t('transcript.slow')}
                    >
                      <Turtle className="w-3.5 h-3.5" />
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

                <div dir="ltr" className="text-start">
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

      {/* Text Chat Composer & Quick Prompts */}
      {onSendText && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
          {/* Quick Prompt Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isConnecting}
                onClick={() => handleQuickPrompt(qp.text)}
                className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-200 text-[11px] whitespace-nowrap transition disabled:opacity-50"
              >
                {isFa ? qp.labelFa : qp.labelEn}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              dir="ltr"
              value={draftText}
              disabled={isConnecting}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={
                isConnected
                  ? isFa
                    ? 'پیام انگلیسی خود را تایپ کنید و Enter بزنید...'
                    : 'Type a message in English to your AI Coach...'
                  : isFa
                    ? 'برای شروع چت متنی (بدون نیاز به میکروفون)، پیام انگلیسی خود را بنویسید...'
                    : 'Type an English message to start Text Chat with your Coach...'
              }
              className="flex-1 bg-slate-900/95 border border-slate-700/90 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition"
            />
            <button
              type="submit"
              disabled={!draftText.trim() || isConnecting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isFa ? 'ارسال' : 'Send'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
