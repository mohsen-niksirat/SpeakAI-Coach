import React from 'react';
import { useLang } from '../i18n/store';
import { X, KeyRound, ExternalLink, Sparkles, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onQuickSelectPreset?: (presetId: string) => void;
}

interface GuideProvider {
  presetId: string;
  badge: string;
  badgeColor: string;
  nameEn: string;
  nameFa: string;
  quotaEn: string;
  quotaFa: string;
  keyUrl: string;
  keyPrefix: string;
  stepsEn: string[];
  stepsFa: string[];
}

const FREE_PROVIDERS: GuideProvider[] = [
  {
    presetId: 'google-gemini',
    badge: '⭐ #1 Recommended (Realtime Voice)',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    nameEn: '1. Google Gemini (Google AI Studio)',
    nameFa: '۱. گوگل جمینای (Google AI Studio) — بهترین گزینه صوتی زنده',
    quotaEn: 'Free Daily Recurring Quota • No Credit Card Required • Supports Native Live Audio',
    quotaFa: 'اعتبار رایگان روزانه (تجدیدشونده هر ۲۴ ساعت) • بدون نیاز به کارت بانکی • پشتیبانی از مکالمه صوتی بلادرنگ',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyPrefix: 'AIzaSy...',
    stepsEn: [
      'Turn on your VPN (US or Europe location recommended) and open aistudio.google.com/apikey.',
      'Sign in with any Google (Gmail) account and accept the terms.',
      'Click the blue "Create API key" button and copy the generated key (starts with AIzaSy...).',
      'Click "Quick Setup" below, paste your key, and start real-time voice practice!',
    ],
    stepsFa: [
      'فیلترشکن خود را روشن کنید (ترجیحاً سرور آمریکا یا اروپا) و وارد لینک aistudio.google.com/apikey شوید.',
      'با حساب جیمیل (Google) خود وارد شوید.',
      'روی دکمه آبی «Create API key» کلیک کنید و کلید ساخته‌شده (که با AIzaSy شروع می‌شود) را کپی کنید.',
      'روی دکمه «⚡ تنظیم سریع جمینای» در پایین همین کارت کلیک کنید، کلید را جای‌گذاری کرده و ذخیره کنید (پیشنهاد: می‌توانید چند کلید از چند جیمیل مختلف را زیر هم وارد کنید تا برنامه در صورت پر شدن سهمیه، خودکار بین آن‌ها بچرخد!).',
    ],
  },
  {
    presetId: 'groq',
    badge: '⚡ Ultra-Fast Free Daily Quota',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    nameEn: '2. Groq Cloud (Llama 3.3 70B)',
    nameFa: '۲. گروک (Groq Cloud) — فوق‌سریع با شارژ رایگان روزانه',
    quotaEn: 'Free Daily Quota (resets every 24h, up to 14,400 req/day) • Browser Voice + IELTS Report',
    quotaFa: 'شارژ رایگان روزانه (هر ۲۴ ساعت تجدید می‌شود) • بدون نیاز به کارت بانکی • عالی برای گزارش نمره آیلتس و مکالمه مرورگر',
    keyUrl: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_...',
    stepsEn: [
      'Open console.groq.com/keys and sign in with Google or GitHub.',
      'Click "Create API Key", enter any name (e.g. SpeakAI), and click Submit.',
      'Copy the key starting with gsk_... and click "Quick Setup" below.',
    ],
    stepsFa: [
      'وارد سایت console.groq.com/keys شوید و با اکانت گوگل یا گیت‌هاب خود ورود کنید.',
      'روی دکمه «Create API Key» کلیک کنید، یک نام دلخواه (مثلاً SpeakAI) بنویسید و Submit را بزنید.',
      'کلید ساخته‌شده (که با gsk_ شروع می‌شود) را کپی کرده و دکمه «⚡ تنظیم سریع Groq» را بزنید.',
    ],
  },
  {
    presetId: 'openrouter',
    badge: '🆓 20+ Free Models (:free)',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    nameEn: '3. OpenRouter (Free Tier Models)',
    nameFa: '۳. اوپن‌روتر (OpenRouter) — دسترسی به مدل‌های رایگان :free',
    quotaEn: 'Free Daily Quota on all models ending with :free (Llama 3.3, DeepSeek V3, Gemini Exp)',
    quotaFa: 'سهمیه رایگان روزانه روی تمام مدل‌های دارای پسوند :free (بدون نیاز به شارژ دلاری)',
    keyUrl: 'https://openrouter.ai/keys',
    keyPrefix: 'sk-or-v1-...',
    stepsEn: [
      'Go to openrouter.ai/keys and sign in with your Google or GitHub account.',
      'Click "Create Key", give it a name, and copy your sk-or-v1-... token.',
      'In SpeakAI Settings, choose OpenRouter and pick any model marked with 🆓 (:free).',
    ],
    stepsFa: [
      'وارد آدرس openrouter.ai/keys شوید و با حساب گوگل یا گیت‌هاب وارد شوید.',
      'روی «Create Key» کلیک کنید، یک نام وارد کرده و توکن (با پیشوند sk-or-v1-) را کپی کنید.',
      'با زدن دکمه زیر، مدل‌های رایگان علامت‌گذاری‌شده با 🆓 (مثل Llama 3.3 70B Free یا DeepSeek V3 Free) به‌طور پیش‌فرض برایتان انتخاب می‌شوند.',
    ],
  },
  {
    presetId: 'cerebras',
    badge: '🚀 1,000,000 Free Tokens / Day',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    nameEn: '4. Cerebras Cloud (1M Free Tokens Daily)',
    nameFa: '۴. سربراس (Cerebras Cloud) — روزانه ۱ میلیون توکن رایگان',
    quotaEn: '1 Million Free Tokens Every Day • World’s Fastest Llama 3.3 70B Inference',
    quotaFa: 'روزانه ۱٬۰۰۰٬۰۰۰ توکن رایگان تجدیدشونده • سرعت پاسخ‌گویی فوق‌العاده بالا روی مدل Llama 3.3 70B',
    keyUrl: 'https://cloud.cerebras.ai',
    keyPrefix: 'csk-...',
    stepsEn: [
      'Visit cloud.cerebras.ai and sign up for a free developer account.',
      'Open the "API Keys" tab in the left sidebar and generate a new key (starts with csk-...).',
      'Click "Quick Setup" below to configure Cerebras in 1 click.',
    ],
    stepsFa: [
      'وارد سایت cloud.cerebras.ai شوید و با جیمیل ثبت‌نام رایگان انجام دهید.',
      'از منوی سمت چپ وارد بخش «API Keys» شوید و کلید جدید (با پیشوند csk-) بسازید.',
      'روی دکمه «⚡ تنظیم سریع Cerebras» در پایین کلیک کنید.',
    ],
  },
  {
    presetId: 'github-models',
    badge: '🐙 Free GPT-4o-mini with GitHub',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    nameEn: '5. GitHub Models (Free OpenAI GPT-4o-mini Quota)',
    nameFa: '۵. مدل‌های گیت‌هاب (GitHub Models) — استفاده رایگان از GPT-4o-mini',
    quotaEn: 'Free Daily Rate-Limited Access to OpenAI GPT-4o-mini & GPT-4o using your GitHub account',
    quotaFa: 'دسترسی رایگان روزانه به مدل‌های GPT-4o-mini و GPT-4o فقط با داشتن اکانت گیت‌هاب!',
    keyUrl: 'https://github.com/settings/tokens',
    keyPrefix: 'ghp_... / github_pat_...',
    stepsEn: [
      'Open github.com/settings/tokens and generate a Personal Access Token (no special repo permissions needed).',
      'Copy your token (starts with ghp_ or github_pat_).',
      'Click "Quick Setup" below to use GitHub Models with GPT-4o-mini for free!',
    ],
    stepsFa: [
      'وارد لینک github.com/settings/tokens شوید و یک توکن شخصی (Personal Access Token) بسازید (نیاز به تیک زدن هیچ دسترسی خاصی نیست).',
      'توکن ساخته‌شده (ghp_ یا github_pat_) را کپی کنید.',
      'روی دکمه «⚡ تنظیم سریع GitHub Models» کلیک کنید تا بدون پرداخت هزینه از مدل GPT-4o-mini استفاده کنید!',
    ],
  },
];

export const FreeKeyGuideModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onQuickSelectPreset,
}) => {
  const [lang] = useLang();
  const isFa = lang === 'fa';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isFa
                  ? 'راهنمای گام‌به‌گام دریافت کلید (توکن) رایگان با شارژ روزانه'
                  : 'Step-by-Step Guide: Get Free Daily-Recharging API Keys'}
              </h2>
              <p className="text-xs text-slate-400">
                {isFa
                  ? 'معرفی ۵ سرویس معتبر که بدون نیاز به کارت بانکی، سهمیه رایگان روزانه می‌دهند'
                  : '5 trusted AI providers that give free daily recurring quotas without a credit card'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 overflow-y-auto pr-1 text-xs">
          {/* OpenAI Clarification Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-200 text-xs">
                {isFa
                  ? '❓ آیا سایت رسمی OpenAI (platform.openai.com) هم مثل جمینای اعتبار رایگان روزانه می‌دهد؟'
                  : '❓ Does OpenAI (platform.openai.com) give free daily API credits like Gemini?'}
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {isFa
                  ? 'خیر! برخلاف گوگل جمینای و گروک، شرکت OpenAI اعتبار رایگان روزانه نمی‌دهد و حتی اشتراک ChatGPT Plus هم شامل API نمی‌شود. برای استفاده از کلیدهای مستقیم OpenAI (چه در حالت Realtime با مدل gpt-realtime و چه در حالت Chat)، حساب شما در platform.openai.com باید حداقل ۵ دلار شارژ پیش‌پرداخت (Prepaid Billing) داشته باشد. اگر می‌خواهید کاملاً رایگان تمرین کنید، از ۵ سرویس زیر (به‌ویژه گوگل جمینای برای مکالمه صوتی زنده یا GitHub Models برای دسترسی رایگان به GPT-4o-mini) استفاده کنید!'
                  : 'No — unlike Google Gemini and Groq, OpenAI does NOT offer a free daily API tier (and ChatGPT Plus does not include API credits). Direct OpenAI keys require a prepaid billing balance (minimum $5). For 100% free daily practice, use Google Gemini (AI Studio), Groq, OpenRouter (:free models), Cerebras, or GitHub Models below!'}
              </p>
              {onQuickSelectPreset && (
                <button
                  onClick={() => {
                    onClose();
                    onQuickSelectPreset('openai-realtime');
                  }}
                  className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-medium transition"
                >
                  <Zap className="w-3 h-3" />
                  {isFa
                    ? 'حساب شارژشده OpenAI دارم ← تنظیم سریع OpenAI Realtime GA (/v1/realtime)'
                    : 'I have a funded OpenAI account → Quick Setup OpenAI Realtime GA'}
                </button>
              )}
            </div>
          </div>

          {/* 5 Free Providers Cards */}
          {FREE_PROVIDERS.map((prov) => {
            const steps = isFa ? prov.stepsFa : prov.stepsEn;
            return (
              <div
                key={prov.presetId}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 transition"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border mb-1.5 ${prov.badgeColor}`}
                    >
                      {prov.badge}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {isFa ? prov.nameFa : prov.nameEn}
                    </h3>
                    <p className="text-[11px] text-emerald-300/90 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {isFa ? prov.quotaFa : prov.quotaEn}
                    </p>
                  </div>

                  <a
                    href={prov.keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs font-semibold transition shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {isFa ? 'ورود به سایت و دریافت کلید' : 'Open Key Page'}
                  </a>
                </div>

                <ol className="space-y-1.5 text-slate-300 list-decimal pl-5 pr-4 bg-slate-950/70 rounded-xl p-3 border border-slate-800/80">
                  {steps.map((st, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {st}
                    </li>
                  ))}
                </ol>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                    Key format: <code className="text-indigo-300">{prov.keyPrefix}</code>
                  </span>

                  {onQuickSelectPreset && (
                    <button
                      onClick={() => {
                        onClose();
                        onQuickSelectPreset(prov.presetId);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isFa
                        ? `⚡ انتخاب و تنظیم سریع ${prov.presetId === 'google-gemini' ? 'جمینای' : prov.presetId}`
                        : `⚡ Quick Setup ${prov.nameEn.split(' ')[1]}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
          >
            {isFa ? 'متوجه شدم' : 'Got It'}
          </button>
        </div>
      </div>
    </div>
  );
};
