import React, { useMemo, useState } from 'react';
import {
  SessionStats,
  SessionReport,
  ReportStatus,
  TranscriptEntry,
  FeedbackLog,
  VocabCard,
} from '../types';
import {
  Award,
  Clock,
  BookOpen,
  AlertCircle,
  X,
  Loader2,
  ThumbsUp,
  TrendingUp,
  Gauge,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Download,
  BarChart3,
  MessageSquare,
  Mic,
  Volume2,
} from 'lucide-react';
import { useT, useLang } from '../i18n/store';
import { computeSessionAnalytics, SkillMetric } from '../utils/session-analytics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stats: SessionStats;
  report: SessionReport | null;
  reportStatus: ReportStatus;
  transcript?: TranscriptEntry[];
  feedbackLogs?: FeedbackLog[];
  vocabCards?: VocabCard[];
}

type ViewTab = 'all' | 'charts' | 'skills' | 'details';

const COLOR_STYLES: Record<
  SkillMetric['color'],
  { bar: string; badge: string; border: string; text: string }
> = {
  indigo: {
    bar: 'from-indigo-500 to-blue-400',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    border: 'border-indigo-500/25',
    text: 'text-indigo-300',
  },
  emerald: {
    bar: 'from-emerald-500 to-teal-400',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    border: 'border-emerald-500/25',
    text: 'text-emerald-300',
  },
  amber: {
    bar: 'from-amber-500 to-yellow-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    border: 'border-amber-500/25',
    text: 'text-amber-300',
  },
  cyan: {
    bar: 'from-cyan-500 to-sky-400',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    border: 'border-cyan-500/25',
    text: 'text-cyan-300',
  },
  rose: {
    bar: 'from-rose-500 to-pink-400',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    border: 'border-rose-500/25',
    text: 'text-rose-300',
  },
};

function RadarChartSvg({
  axes,
  isFa,
}: {
  axes: SkillMetric[];
  isFa: boolean;
}) {
  const size = 250;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 78;
  const count = axes.length;

  const pointAt = (idx: number, ratio: number) => {
    const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * maxR * ratio,
      y: cy + Math.sin(angle) * maxR * ratio,
    };
  };

  const ringLevels = [0.33, 0.66, 1];
  const targetRatio = 83 / 100; // Band 7.5 target

  const userPolygon = axes
    .map((a, i) => {
      const p = pointAt(i, Math.max(0.12, Math.min(1, a.score / 100)));
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  const targetPolygon = axes
    .map((_, i) => {
      const p = pointAt(i, targetRatio);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[250px] h-auto overflow-visible select-none"
        role="img"
        aria-label="Speaking Skills Radar Chart"
      >
        <defs>
          <linearGradient id="radarFillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.42" />
          </linearGradient>
        </defs>

        {/* Concentric hexagonal rings */}
        {ringLevels.map((lvl, rIdx) => {
          const pts = axes
            .map((_, i) => {
              const p = pointAt(i, lvl);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={rIdx}
              points={pts}
              fill="none"
              stroke="#334155"
              strokeWidth={lvl === 1 ? '1.2' : '0.8'}
              strokeDasharray={lvl < 1 ? '2 2' : undefined}
            />
          );
        })}

        {/* Axis spokes */}
        {axes.map((_, i) => {
          const end = pointAt(i, 1);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="#334155"
              strokeWidth="0.8"
            />
          );
        })}

        {/* Target Band 7.5 polygon */}
        <polygon
          points={targetPolygon}
          fill="none"
          stroke="#10b981"
          strokeWidth="1.2"
          strokeDasharray="4 3"
          opacity="0.65"
        />

        {/* User score polygon */}
        <polygon
          points={userPolygon}
          fill="url(#radarFillGrad)"
          stroke="#818cf8"
          strokeWidth="2.2"
        />

        {/* Vertex dots and labels */}
        {axes.map((a, i) => {
          const p = pointAt(i, Math.max(0.12, Math.min(1, a.score / 100)));
          const labelPt = pointAt(i, 1.27);
          return (
            <g key={a.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r="3.8"
                fill="#34d399"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              <text
                x={labelPt.x}
                y={labelPt.y - 4}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-200 text-[9.5px] font-semibold"
              >
                {isFa ? a.shortFa : a.shortEn}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-indigo-300 text-[9px] font-bold"
              >
                {a.score}%
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-4 text-[10px] text-slate-400 mt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400/70 border border-indigo-400 inline-block" />
          {isFa ? 'عملکرد شما' : 'Your Performance'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-400 inline-block" />
          {isFa ? 'سطح هدف (Band 7.5)' : 'Target (Band 7.5)'}
        </span>
      </div>
    </div>
  );
}

function WpmGaugeSvg({
  wpm,
  paceRating,
  isFa,
}: {
  wpm: number;
  paceRating: 'slow' | 'moderate' | 'ideal' | 'fast';
  isFa: boolean;
}) {
  const clamped = Math.max(0, Math.min(200, wpm));
  const angleDeg = -90 + (clamped / 200) * 180;
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  const cx = 100;
  const cy = 92;
  const r = 68;
  const needleX = cx + Math.cos(angleRad) * (r - 10);
  const needleY = cy + Math.sin(angleRad) * (r - 10);

  const paceBadge = {
    slow: {
      labelFa: 'کند (نیاز به روانی بیشتر)',
      labelEn: 'Slow Pace (<85 WPM)',
      cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    },
    moderate: {
      labelFa: 'ملایم و قابل فهم',
      labelEn: 'Moderate Pace (85–110 WPM)',
      cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    },
    ideal: {
      labelFa: 'سرعت ایده‌آل و طبیعی ⭐',
      labelEn: 'Ideal Native Pace ⭐ (110–155 WPM)',
      cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    },
    fast: {
      labelFa: 'سریع (مراقب وضوح ادا باشید)',
      labelEn: 'Fast Pace (>160 WPM)',
      cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    },
  }[paceRating];

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 112"
        className="w-full max-w-[205px] h-auto select-none"
        role="img"
        aria-label="Speaking Speed WPM Gauge"
      >
        {/* Background track */}
        <path
          d="M 32 92 A 68 68 0 0 1 168 92"
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Slow zone (0-85 WPM) */}
        <path
          d="M 32 92 A 68 68 0 0 1 78 28"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.55"
        />
        {/* Ideal zone (95-155 WPM) */}
        <path
          d="M 88 25 A 68 68 0 0 1 153 50"
          fill="none"
          stroke="#10b981"
          strokeWidth="10"
          opacity="0.75"
        />
        {/* Fast zone (155-200 WPM) */}
        <path
          d="M 155 53 A 68 68 0 0 1 168 92"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Scale labels */}
        <text x="20" y="106" className="fill-slate-500 text-[8px] font-mono">
          0
        </text>
        <text x="93" y="14" className="fill-slate-400 text-[8px] font-mono">
          100
        </text>
        <text x="148" y="38" className="fill-emerald-400 text-[8px] font-mono">
          140
        </text>
        <text x="170" y="106" className="fill-slate-500 text-[8px] font-mono">
          200
        </text>

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#f8fafc"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="5" fill="#6366f1" stroke="#f8fafc" strokeWidth="1.5" />

        {/* WPM readout */}
        <text
          x={cx}
          y={cy - 16}
          textAnchor="middle"
          className="fill-white text-[18px] font-extrabold font-mono"
        >
          {wpm}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-slate-400 text-[8.5px] font-semibold uppercase tracking-wider"
        >
          {isFa ? 'کلمه در دقیقه (WPM)' : 'Words / Min (WPM)'}
        </text>
      </svg>

      <span
        className={`mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${paceBadge.cls}`}
      >
        {isFa ? paceBadge.labelFa : paceBadge.labelEn}
      </span>
    </div>
  );
}

export const SessionSummaryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  stats,
  report,
  reportStatus,
  transcript = [],
  feedbackLogs = [],
  vocabCards = [],
}) => {
  const t = useT();
  const [lang] = useLang();
  const isFa = lang === 'fa';
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [copiedReport, setCopiedReport] = useState(false);
  const [sentToLeitner, setSentToLeitner] = useState(false);

  const analytics = useMemo(
    () => computeSessionAnalytics(stats, report, transcript, feedbackLogs, vocabCards),
    [stats, report, transcript, feedbackLogs, vocabCards],
  );

  if (!isOpen) return null;

  const minutes = Math.floor(stats.durationSeconds / 60);
  const seconds = stats.durationSeconds % 60;
  const realCorrections = feedbackLogs.filter((f) => f.userSpoke && f.userSpoke.trim().length > 0);

  const speakWord = (text: string) => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.92;
        window.speechSynthesis.speak(u);
      }
    } catch {
      // ignore TTS errors
    }
  };

  const buildMarkdownReport = () => {
    const lines: string[] = [
      `# 📊 کارنامه و گزارش تحلیلی مکالمه (SpeakAI Coach)`,
      `- **نمره کل آیلتس (Overall Band):** ${analytics.overallBand.toFixed(1)} / 9.0`,
      `- **امتیاز کل (Score):** ${analytics.overallScore100} / 100 (سطح CEFR: **${analytics.cefrLevel}**)`,
      `- **مدت مکالمه:** ${minutes}m ${seconds}s`,
      `- **سرعت تکلم (WPM):** ${analytics.wpm} کلمه در دقیقه`,
      `- **تعداد کل کلمات شما:** ${analytics.userWordCount} کلمه (${analytics.uniqueWordsCount} واژه یکتا — تنوع واژگانی ${analytics.lexicalDiversityPct}%)`,
      `- **نرخ دقت جملات:** ${analytics.errorBreakdown.accuracyPct}%`,
      '',
      `## 🎯 امتیاز ریز مهارت‌های هشت‌گانه`,
      ...analytics.skills.map(
        (s) =>
          `- **${s.labelFa} (${s.labelEn}):** ${s.score}/100 (Band ${s.band.toFixed(1)}) — ${
            isFa ? s.detailFa : s.detailEn
          }`,
      ),
      '',
    ];

    if (realCorrections.length > 0) {
      lines.push(`## 🛠️ اصلاحات گرامری، واژگانی و تلفظی (${realCorrections.length})`);
      for (const c of realCorrections) {
        lines.push(
          `- ❌ **گفتید:** "${c.userSpoke}" → ✅ **بهتر:** "${c.betterAlternative}" (${c.explanation})`,
        );
      }
      lines.push('');
    }

    if (report?.strengths?.length) {
      lines.push(`## ✅ نقاط قوت`);
      report.strengths.forEach((s) => lines.push(`- ${s}`));
      lines.push('');
    }

    if (report?.improvements?.length) {
      lines.push(`## 🚀 برنامه تمرینی جلسه بعد`);
      report.improvements.forEach((s) => lines.push(`- ${s}`));
      lines.push('');
    }

    return lines.join('\n');
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdownReport());
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2200);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownloadReport = () => {
    const md = buildMarkdownReport();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpeakAI-Report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendVocabToLeitner = () => {
    try {
      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'SPEAKAI_IMPORT_TO_LEITNER', cards: vocabCards }, '*');
      }
      setSentToLeitner(true);
      setTimeout(() => setSentToLeitner(false), 2500);
    } catch {
      // ignore cross-frame errors
    }
  };

  const weakestSkills = [...analytics.skills].sort((a, b) => a.score - b.score).slice(0, 2);
  const strongestSkills = [...analytics.skills].sort((a, b) => b.score - a.score).slice(0, 2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4"
      dir={isFa ? 'rtl' : 'ltr'}
    >
      <div className="bg-surface border border-slate-800 rounded-3xl p-4 sm:p-6 w-full max-w-4xl shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 pb-4 border-b border-slate-800/80">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/25 to-emerald-500/20 border border-indigo-500/30 text-indigo-300 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
            <Award className="w-7 h-7" />
          </div>
          <div className="text-center sm:text-start flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                {isFa ? 'کارنامه جامع و نمودار ارزیابی مکالمه' : t('summary.title')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 border border-indigo-500/40 text-emerald-300">
                CEFR {analytics.cefrLevel}
              </span>
              {reportStatus === 'loading' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isFa ? 'در حال تکمیل تحلیل ممتحن هوشمند...' : t('summary.analyzing')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isFa
                ? 'تحلیل چندبعدی لهجه، تلفظ، سرعت تکلم، دقت گرامر، تنوع واژگان و انسجام کلام شما در این جلسه'
                : t('summary.subtitle')}
            </p>
          </div>
        </div>

        {/* Top Hero Score & KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 my-4">
          {/* Overall IELTS Band */}
          <div className="col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 border border-indigo-500/30 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block">
                {isFa ? 'نمره کل مکالمه (IELTS)' : t('summary.band')}
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
                  {analytics.overallBand.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 font-mono">/ 9.0</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {reportStatus === 'ready'
                  ? isFa
                    ? '✅ ارزیابی ترکیبی ممتحن هوش مصنوعی + تله‌متری'
                    : t('summary.aiEvaluated')
                  : isFa
                  ? '⚡ محاسبه تحلیلی آنی از شاخص‌های گفتار'
                  : t('summary.heuristic')}
              </span>
            </div>
            <div className="text-center bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2">
              <div className="text-[10px] text-slate-400">
                {isFa ? 'امتیاز کل' : 'Total Score'}
              </div>
              <div className="text-xl font-extrabold text-emerald-400 font-mono">
                {analytics.overallScore100}
                <span className="text-[11px] text-slate-500">/100</span>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px]">{isFa ? 'مدت مکالمه' : t('summary.duration')}</span>
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-100 font-mono mt-1">
              {minutes}m {seconds}s
            </div>
            <div className="text-[10px] text-slate-500">
              {isFa
                ? `${analytics.userTurns} نوبت گفتار شما`
                : `${analytics.userTurns} speaking turns`}
            </div>
          </div>

          {/* WPM Speed */}
          <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px]">{isFa ? 'سرعت گفتار' : 'Speech Pace'}</span>
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-sm sm:text-base font-bold text-cyan-300 font-mono mt-1">
              {analytics.wpm} <span className="text-[10px] font-normal text-slate-400">WPM</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {isFa ? 'هدف استاندارد: ۱۱۰ تا ۱۵۰' : 'Target: 110–150 WPM'}
            </div>
          </div>

          {/* Vocabulary Diversity */}
          <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px]">{isFa ? 'تنوع واژگان' : 'Lexical Variety'}</span>
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-300 font-mono mt-1">
              {analytics.lexicalDiversityPct}%
            </div>
            <div className="text-[10px] text-slate-500">
              {isFa
                ? `${analytics.uniqueWordsCount} واژه یکتا از ${analytics.userWordCount}`
                : `${analytics.uniqueWordsCount} unique / ${analytics.userWordCount} words`}
            </div>
          </div>

          {/* Accuracy Rate */}
          <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px]">{isFa ? 'نرخ دقت بیان' : 'Accuracy Rate'}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-sm sm:text-base font-bold text-amber-300 font-mono mt-1">
              {analytics.errorBreakdown.accuracyPct}%
            </div>
            <div className="text-[10px] text-slate-500">
              {isFa
                ? `${stats.correctionsCount} نکته اصلاحی ثبت شد`
                : `${stats.correctionsCount} corrections logged`}
            </div>
          </div>
        </div>

        {/* Section Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 border-b border-slate-800/70">
          {(
            [
              { id: 'all', labelFa: '📊 نمای کامل گزارش', labelEn: '📊 Full Report' },
              { id: 'charts', labelFa: '🕸️ نمودار رادار و سرعت', labelEn: '🕸️ Radar & Pace Charts' },
              { id: 'skills', labelFa: '🎯 امتیاز ریز ۸ مهارت', labelEn: '🎯 8-Skill Scores' },
              {
                id: 'details',
                labelFa: `🛠️ اصلاحات و واژگان (${realCorrections.length + vocabCards.length})`,
                labelEn: `🛠️ Corrections & Vocab (${realCorrections.length + vocabCards.length})`,
              },
            ] as { id: ViewTab; labelFa: string; labelEn: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-slate-900/70 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              {isFa ? tab.labelFa : tab.labelEn}
            </button>
          ))}
        </div>

        {/* CHARTS SECTION: Hexagonal Skill Radar + WPM Speedometer & Conversation Balance */}
        {(activeTab === 'all' || activeTab === 'charts') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* Radar Chart Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  {isFa
                    ? 'نمودار راداری ۶ بُعد اصلی گفتار'
                    : '6-Axis Speaking Proficiency Radar'}
                </h3>
                <span className="text-[10px] text-slate-400">
                  {isFa ? 'مقیاس ۰ تا ۱۰۰' : '0–100 Scale'}
                </span>
              </div>
              <RadarChartSvg axes={analytics.radarSkills} isFa={isFa} />
            </div>

            {/* WPM Gauge + Talk Balance Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    {isFa
                      ? 'سنجش سرعت تکلم و ریتم بیان'
                      : 'Speaking Speed (WPM) & Rhythm'}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    {isFa
                      ? `میانگین ${analytics.avgWordsPerTurn} کلمه در هر نوبت`
                      : `Avg ${analytics.avgWordsPerTurn} words/turn`}
                  </span>
                </div>
                <WpmGaugeSvg
                  wpm={analytics.wpm}
                  paceRating={analytics.paceStatus}
                  isFa={isFa}
                />
              </div>

              {/* Conversation Share & Turn Telemetry */}
              <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-indigo-300 font-semibold flex items-center gap-1">
                    <Mic className="w-3.5 h-3.5" />
                    {isFa
                      ? `سهم صحبت شما: ${analytics.userSharePct}%`
                      : `Your Talk Share: ${analytics.userSharePct}%`}
                  </span>
                  <span className="text-emerald-300 font-semibold flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {isFa
                      ? `سهم مربی هوشمند: ${100 - analytics.userSharePct}%`
                      : `AI Coach: ${100 - analytics.userSharePct}%`}
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-500"
                    style={{ width: `${analytics.userSharePct}%` }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500/70 to-teal-500/70 transition-all duration-500"
                    style={{ width: `${100 - analytics.userSharePct}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800/70">
                    <div className="text-[10px] text-slate-400">
                      {isFa ? 'کل کلمات شما' : 'Your Words'}
                    </div>
                    <div className="text-xs font-bold text-slate-200 font-mono">
                      {analytics.userWordCount}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800/70">
                    <div className="text-[10px] text-slate-400">
                      {isFa ? 'بلندترین پاسخ' : 'Longest Turn'}
                    </div>
                    <div className="text-xs font-bold text-slate-200 font-mono">
                      {analytics.longestTurnWords} {isFa ? 'کلمه' : 'w'}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-800/70">
                    <div className="text-[10px] text-slate-400">
                      {isFa ? 'رابط‌های گفتاری' : 'Connectors'}
                    </div>
                    <div className="text-xs font-bold text-emerald-300 font-mono">
                      {analytics.discourseMarkersUsed.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8-SKILL MULTI-DIMENSIONAL BREAKDOWN */}
        {(activeTab === 'all' || activeTab === 'skills') && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                {isFa
                  ? 'ارزیابی تفکیکی ۸ مهارت کلیدی (تلفظ، لهجه، سرعت، گرامر، واژگان، انسجام، تعامل و اعتمادبه‌نفس)'
                  : '8-Dimension Speaking Skill Breakdown'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {analytics.skills.map((skill) => {
                const style = COLOR_STYLES[skill.color];
                return (
                  <div
                    key={skill.id}
                    className={`bg-slate-900/65 border ${style.border} rounded-2xl p-3.5 transition hover:bg-slate-900/90`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-100">
                        {isFa ? skill.labelFa : skill.labelEn}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border font-mono ${style.badge}`}
                        >
                          {skill.score}/100
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 font-mono">
                          Band {skill.band.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Horizontal Progress Bar with Target Marker */}
                    <div className="relative w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 my-2">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${style.bar} transition-all duration-700`}
                        style={{ width: `${skill.score}%` }}
                      />
                      {/* Target Band 7.5 line at 83% */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/40"
                        style={{ left: '83%' }}
                        title="Target Band 7.5 (83%)"
                      />
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {isFa ? skill.detailFa : skill.detailEn}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ERROR DISTRIBUTION & DISCOURSE MARKERS */}
        {(activeTab === 'all' || activeTab === 'charts' || activeTab === 'details') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* Error Distribution Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                {isFa
                  ? 'تفکیک خطاها و نقاط قابل بهبود در این مکالمه'
                  : 'Error Breakdown & Accuracy Analysis'}
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-slate-950/70 border border-rose-500/25 rounded-xl p-2.5">
                  <div className="text-lg font-extrabold text-rose-400 font-mono">
                    {analytics.errorBreakdown.grammar}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isFa ? 'نکته گرامری' : 'Grammar'}
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-cyan-500/25 rounded-xl p-2.5">
                  <div className="text-lg font-extrabold text-cyan-400 font-mono">
                    {analytics.errorBreakdown.pronunciation}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isFa ? 'نکته تلفظ و لهجه' : 'Pronunciation'}
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-amber-500/25 rounded-xl p-2.5">
                  <div className="text-lg font-extrabold text-amber-400 font-mono">
                    {analytics.errorBreakdown.vocabulary}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isFa ? 'پیشنهاد واژگانی' : 'Vocabulary'}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {stats.correctionsCount === 0
                  ? isFa
                    ? '🎉 هیچ خطای بحرانی در این جلسه ثبت نشد! جملات شما از نظر ساختار و وضوح عملکرد بسیار خوبی داشتند.'
                    : '🎉 Zero critical errors logged in this session! Great structural control.'
                  : isFa
                  ? `در مجموع ${stats.correctionsCount} مورد اصلاحی ثبت شد که نرخ دقت جملات شما را در سطح ${analytics.errorBreakdown.accuracyPct}% قرار می‌دهد.`
                  : `${stats.correctionsCount} total corrections logged, yielding a ${analytics.errorBreakdown.accuracyPct}% accuracy rate.`}
              </p>
            </div>

            {/* Discourse Markers & Lexical Highlights */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  {isFa
                    ? 'رابط‌های گفتاری (Discourse Markers) استفاده‌شده'
                    : 'Discourse Markers & Connectors Used'}
                </h4>
                {analytics.discourseMarkersUsed.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {analytics.discourseMarkersUsed.map((dm) => (
                      <span
                        key={dm}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono"
                      >
                        ✓ {dm}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {isFa
                      ? 'در این مکالمه از رابط‌های استاندارد (مثل however, moreover, for instance, actually) استفاده نکردید. افزودن آن‌ها نمره انسجام کلام شما را تا ۱ بند افزایش می‌دهد.'
                      : 'No formal discourse markers detected yet. Try adding connectors like "however", "for instance", or "on the other hand" to boost Coherence.'}
                  </p>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {isFa ? 'قوی‌ترین مهارت جلسه:' : 'Top Skill:'}{' '}
                  <strong className="text-emerald-300">
                    {isFa ? strongestSkills[0]?.labelFa : strongestSkills[0]?.labelEn}
                  </strong>
                </span>
                <span>
                  {isFa ? 'اولویت تمرین:' : 'Focus Area:'}{' '}
                  <strong className="text-amber-300">
                    {isFa ? weakestSkills[0]?.labelFa : weakestSkills[0]?.labelEn}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ACTIONABLE REPORTS: Logged Corrections, Discovered Vocab, Strengths & Action Plan */}
        {(activeTab === 'all' || activeTab === 'details') && (
          <div className="space-y-4 mb-5">
            {/* Logged Corrections Table */}
            {realCorrections.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  {isFa
                    ? `جدول اصلاحات ثبت‌شده در طول مکالمه (${realCorrections.length} مورد)`
                    : `Logged Live Corrections (${realCorrections.length})`}
                </h4>
                <div className="space-y-2.5 max-h-60 overflow-y-auto pe-1">
                  {realCorrections.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-950/75 border border-slate-800/90 rounded-xl p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          {item.type}
                        </span>
                        <button
                          onClick={() => speakWord(item.betterAlternative)}
                          className="text-slate-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] transition"
                          title={isFa ? 'پخش تلفظ صحیح' : 'Listen to native phrasing'}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          {isFa ? 'تلفظ صحیح' : 'Listen'}
                        </button>
                      </div>
                      <div className="text-rose-300/90 line-through dir-ltr text-start font-mono text-[11px]">
                        ❌ {item.userSpoke}
                      </div>
                      <div className="text-emerald-300 font-semibold dir-ltr text-start font-mono text-xs">
                        ✅ {item.betterAlternative}
                      </div>
                      {item.explanation && (
                        <div className="text-slate-400 text-[11px] pt-0.5">
                          💡 {item.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Vocabulary Cards */}
            {vocabCards.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    {isFa
                      ? `واژگان کلیدی و پیشرفته استخراج‌شده (${vocabCards.length})`
                      : `Extracted Session Vocabulary (${vocabCards.length})`}
                  </h4>
                  <button
                    onClick={handleSendVocabToLeitner}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    {sentToLeitner ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        {isFa ? 'به لایتنر ارسال شد!' : 'Sent to Leitner!'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        {isFa ? 'افزودن همه به لایتنر پرو' : 'Send All to Leitner'}
                      </>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pe-1">
                  {vocabCards.slice(0, 12).map((vc) => (
                    <div
                      key={vc.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-indigo-300 font-mono">
                            {vc.word}
                          </span>
                          {vc.phonetic && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {vc.phonetic}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 truncate">{vc.definition}</p>
                      </div>
                      <button
                        onClick={() => speakWord(vc.word)}
                        className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white shrink-0"
                        title="Listen"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Personalized Action Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 mb-2">
                  <ThumbsUp className="w-4 h-4" />
                  {isFa ? 'نقاط قوت شما در این مکالمه' : t('summary.strengths')}
                </h4>
                <ul className="space-y-1.5">
                  {strongestSkills.map((sk) => (
                    <li key={sk.id} className="text-[11px] text-slate-300 leading-relaxed">
                      • <strong className="text-emerald-300">{isFa ? sk.labelFa : sk.labelEn}</strong> (
                      {sk.score}/100): {isFa ? sk.detailFa : sk.detailEn}
                    </li>
                  ))}
                  {(isFa ? analytics.strengthsFa : analytics.strengthsEn).map((s, i) => (
                    <li key={i} className="text-[11px] text-slate-300 leading-relaxed">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  {isFa
                    ? 'برنامه عملیاتی و تمرکز جلسه بعد'
                    : t('summary.focus')}
                </h4>
                <ul className="space-y-1.5">
                  {weakestSkills.map((sk) => (
                    <li key={sk.id} className="text-[11px] text-slate-300 leading-relaxed">
                      • <strong className="text-amber-300">{isFa ? sk.labelFa : sk.labelEn}</strong> (
                      {sk.score}/100): {isFa ? sk.detailFa : sk.detailEn}
                    </li>
                  ))}
                  {(isFa ? analytics.actionPlanFa : analytics.actionPlanEn).map((s, i) => (
                    <li key={i} className="text-[11px] text-slate-300 leading-relaxed">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  {isFa ? 'کپی شد!' : 'Copied!'}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  {isFa ? 'کپی متن گزارش' : 'Copy Report'}
                </>
              )}
            </button>
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              {isFa ? 'دانلود گزارش (Markdown)' : 'Download Report'}
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition"
          >
            {isFa ? 'بستن و بازگشت به محیط تمرین' : t('settings.done')}
          </button>
        </div>
      </div>
    </div>
  );
};
