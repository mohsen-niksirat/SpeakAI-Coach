import React from 'react';
import { CoachRole } from '../types';
import { speakText } from '../utils/exporters';
import { useLang, useT } from '../i18n/store';
import { Lightbulb, Volume2 } from 'lucide-react';

interface PhraseItem {
  phrase: string;
  meaningFa: string;
  tag: string;
}

const ROLE_PHRASES: Record<CoachRole, PhraseItem[]> = {
  ielts_examiner: [
    {
      phrase: 'From my perspective, a compelling argument can be made that...',
      meaningFa: 'از دیدگاه من، استدلال قانع‌کننده‌ای وجود دارد که...',
      tag: 'Band 8+ Opener',
    },
    {
      phrase: 'Having said that, we should not overlook the downside of...',
      meaningFa: 'با این حال، نباید جنبه منفی را نادیده بگیریم',
      tag: 'Contrast',
    },
    {
      phrase: 'What stands out most to me is the sheer scale of...',
      meaningFa: 'چیزی که بیش از همه برایم برجسته است، ابعاد گسترده آن است',
      tag: 'Emphasis',
    },
    {
      phrase: 'It goes without saying that this plays a pivotal role in...',
      meaningFa: 'بدیهی است که این موضوع نقشی محوری ایفا می‌کند',
      tag: 'Lexical',
    },
  ],
  shadowing_coach: [
    {
      phrase: 'I was gonna call you, but I kinda lost track of time.',
      meaningFa: 'تلفظ متصل: gonna / kinda / lost_track_of',
      tag: 'Connected Speech',
    },
    {
      phrase: 'Could you tell her that I will be there in a bit?',
      meaningFa: 'حذف صدای h در tell_her و اتصال in_a_bit',
      tag: 'Linking & Elision',
    },
    {
      phrase: 'What did you end up doing over the weekend?',
      meaningFa: 'ادغام What_did_you در گفتار سریع روزمره',
      tag: 'Assimilation',
    },
    {
      phrase: 'It is not what you say, it is the way that you say it.',
      meaningFa: 'تکیه روی کلمات کلیدی: NOT WHAT / WAY',
      tag: 'Sentence Stress',
    },
  ],
  pronunciation_drill: [
    {
      phrase: 'Three thin thieves thought a thousand thoughts.',
      meaningFa: 'تمرین صدای th بی‌واک (نوک زبان بین دندان‌ها)',
      tag: 'Unvoiced TH',
    },
    {
      phrase: 'She sells seashells by the seashore.',
      meaningFa: 'تفکیک صدای s و sh',
      tag: 'S vs SH',
    },
    {
      phrase: 'The sheep on the ship slipped on a sheet.',
      meaningFa: 'تفکیک کشیدگی واکه در sheep و ship',
      tag: 'Minimal Pair',
    },
    {
      phrase: 'Photograph, Photographer, Photographic',
      meaningFa: 'جابجایی تکیه (Word Stress) در خانواده کلمات',
      tag: 'Word Stress',
    },
  ],
  roleplay_scenario: [
    {
      phrase: 'I was wondering if it would be possible to upgrade my room?',
      meaningFa: 'می‌خواستم ببینم آیا امکان ارتقای اتاقم وجود دارد؟',
      tag: 'Polite Request',
    },
    {
      phrase: 'I am afraid there seems to be a slight mix-up with my reservation.',
      meaningFa: 'متأسفانه به نظر می‌رسد یک اشتباه کوچک در رزرو من پیش آمده',
      tag: 'Problem Solving',
    },
    {
      phrase: 'Given my track record over the past year, I would like to discuss...',
      meaningFa: 'با توجه به عملکردم در سال گذشته، مایلم درباره ... گفتگو کنم',
      tag: 'Negotiation',
    },
    {
      phrase: 'Could you walk me through the next steps in this process?',
      meaningFa: 'می‌شود مراحل بعدی این فرآیند را برایم توضیح دهید؟',
      tag: 'Clarification',
    },
  ],
  storytelling: [
    {
      phrase: 'Little did I know that this decision would change everything.',
      meaningFa: 'اصلاً خبر نداشتم که این تصمیم همه‌چیز را عوض خواهد کرد',
      tag: 'Inversion Hook',
    },
    {
      phrase: 'Out of the blue, I bumped into an old friend from college.',
      meaningFa: 'ناگهان و بی‌مقدمه، به یک دوست قدیمی دوران دانشگاه برخوردم',
      tag: 'Narrative Turn',
    },
    {
      phrase: 'To make a long story short, everything worked out in the end.',
      meaningFa: 'خلاصه کلام اینکه، در نهایت همه‌چیز به خوبی حل شد',
      tag: 'Wrap-up',
    },
    {
      phrase: 'Looking back on it now, it was definitely a blessing in disguise.',
      meaningFa: 'حالا که به گذشته نگاه می‌کنم، واقعاً توفیق اجباری بود',
      tag: 'Reflection',
    },
  ],
  vocabulary_builder: [
    {
      phrase: 'Artificial intelligence is a double-edged sword in modern education.',
      meaningFa: 'شمشیر دولبه (دارای هم مزایا و هم معایب)',
      tag: 'C1 Idiom',
    },
    {
      phrase: 'Urgent policies are needed to mitigate the adverse effects of pollution.',
      meaningFa: 'کاهش دادن اثرات ناگوار آلودگی',
      tag: 'Collocation',
    },
    {
      phrase: 'Smartphones have become ubiquitous in everyday life.',
      meaningFa: 'همه‌جا حاضر و فراگیر در زندگی روزمره',
      tag: 'Academic C1',
    },
    {
      phrase: 'You really hit the nail on the head with that observation.',
      meaningFa: 'دقیقاً به هدف زدن و نکته اصلی را درست گفتن',
      tag: 'Native Idiom',
    },
  ],
  job_interview: [
    {
      phrase: 'In my previous role, I spearheaded the migration to microservices.',
      meaningFa: 'در نقش قبلی‌ام، هدایت مهاجرت فنی را برعهده داشتم',
      tag: 'STAR Action',
    },
    {
      phrase: 'The primary bottleneck we faced was latency under heavy load.',
      meaningFa: 'گلوگاه اصلی که با آن روبه‌رو بودیم، تأخیر در ترافیک بالا بود',
      tag: 'STAR Situation',
    },
    {
      phrase: 'As a measurable outcome, we reduced error rates by 35 percent.',
      meaningFa: 'به عنوان یک نتیجه قابل اندازه‌گیری، نرخ خطا را ۳۵ درصد کاهش دادیم',
      tag: 'STAR Result',
    },
    {
      phrase: 'When priorities conflict, I align with stakeholders on business impact.',
      meaningFa: 'وقتی اولویت‌ها تداخل دارند، بر اساس اثرگذاری هماهنگ می‌شوم',
      tag: 'Leadership',
    },
  ],
  debate_partner: [
    {
      phrase: 'While I see the merit in your point, the empirical evidence suggests...',
      meaningFa: 'هرچند نکته مثبت حرف شما را می‌بینم، اما شواهد تجربی نشان می‌دهد...',
      tag: 'Rebuttal',
    },
    {
      phrase: 'That argument overlooks a crucial factor, namely...',
      meaningFa: 'آن استدلال یک عامل کلیدی را نادیده می‌گیرد، یعنی...',
      tag: 'Counter',
    },
    {
      phrase: 'On the flip side, regulating this too strictly could stifle innovation.',
      meaningFa: 'از سوی دیگر، قانون‌گذاری بیش‌ازحد سخت‌گیرانه می‌تواند نوآوری را متوقف کند',
      tag: 'Balance',
    },
    {
      phrase: 'Correlation does not necessarily imply causation in this case.',
      meaningFa: 'همبستگی لزوماً به معنای رابطه علت و معلولی نیست',
      tag: 'Logic',
    },
  ],
  friendly_chat: [
    {
      phrase: 'To be honest, I have been super into photography lately.',
      meaningFa: 'راستش را بخواهی، این اواخر خیلی علاقه‌مند به عکاسی شده‌ام',
      tag: 'Natural',
    },
    {
      phrase: 'That reminds me of something hilarious that happened last week.',
      meaningFa: 'این من را یاد یک اتفاق خیلی بامزه در هفته پیش می‌اندازد',
      tag: 'Conversational',
    },
    {
      phrase: 'I am torn between staying in and going out tonight.',
      meaningFa: 'بین در خانه ماندن و بیرون رفتن امشب دودل هستم',
      tag: 'Idiom',
    },
    {
      phrase: 'We are totally on the same wavelength about that!',
      meaningFa: 'در این مورد کاملاً هم‌فکر و هم‌فرکانس هستیم!',
      tag: 'Connection',
    },
  ],
};

interface Props {
  role: CoachRole;
}

export const PhraseBooster: React.FC<Props> = ({ role }) => {
  const t = useT();
  const [lang] = useLang();
  const list = ROLE_PHRASES[role] || ROLE_PHRASES.ielts_examiner;

  return (
    <div className="w-full max-w-2xl bg-slate-900/85 border border-amber-500/30 rounded-2xl p-4 mb-3 shadow-lg">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-white">{t('booster.title')}</h3>
          <p className="text-[10px] text-slate-400">{t('booster.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {list.map((item, idx) => (
          <button
            key={idx}
            onClick={() => speakText(item.phrase, 0.92)}
            className="text-start bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 rounded-xl p-2.5 transition group flex flex-col justify-between gap-1"
          >
            <div className="flex items-start justify-between gap-2 w-full" dir="ltr">
              <span className="text-xs font-medium text-slate-100 group-hover:text-amber-200 leading-snug">
                &ldquo;{item.phrase}&rdquo;
              </span>
              <Volume2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0 mt-0.5" />
            </div>
            <div className="flex items-center justify-between gap-2 w-full mt-1">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[9px] font-semibold">
                {item.tag}
              </span>
              {lang === 'fa' && (
                <span className="text-[10px] text-slate-400 truncate" dir="rtl">
                  {item.meaningFa}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
