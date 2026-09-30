import { TranscriptEntry } from '../types';

export type ShadowingLevel = 'daily' | 'ielts' | 'ted' | 'twisters';

export interface ShadowingItem {
  id: string;
  level: ShadowingLevel;
  text: string;
  phoneticTip: string;
  translationFa: string;
}

export type WordMatchStatus = 'exact' | 'close' | 'missed';

export interface ShadowedWordResult {
  word: string;
  status: WordMatchStatus;
  spokenAs?: string;
}

export interface ShadowingEvaluation {
  accuracyPct: number;
  words: ShadowedWordResult[];
  spokenWordCount: number;
  wpm: number | null;
  grade: 'excellent' | 'good' | 'keep_practicing';
}

export interface FluencyMetrics {
  totalWords: number;
  uniqueWords: number;
  lexicalDiversityPct: number;
  wpm: number;
  fillerCount: number;
  topFillers: string[];
}

export const SHADOWING_DECK: ShadowingItem[] = [
  // Daily Life & Connected Speech
  {
    id: 'sh_daily_1',
    level: 'daily',
    text: "I've been meaning to catch up with you all week, but work got crazy.",
    phoneticTip: 'Link: "meaning_to" • Stress: CATCH UP, CRA-zy',
    translationFa: 'کل هفته می‌خواستم باهات گپ بزنم، اما کارها خیلی شلوغ شد.',
  },
  {
    id: 'sh_daily_2',
    level: 'daily',
    text: 'Could you give me a hand figuring out how this coffee machine works?',
    phoneticTip: 'Link: "give_me_a" → "gimme a" • Rising tone at the end',
    translationFa: 'می‌تونی یه کمکی بهم بکنی بفهمم این دستگاه قهوه چطور کار می‌کنه؟',
  },
  {
    id: 'sh_daily_3',
    level: 'daily',
    text: "Let's grab a bite to eat before the movie starts at seven.",
    phoneticTip: 'Link: "grab_a_bite" • Flap T in "bite_to_eat"',
    translationFa: 'بیا قبل از اینکه فیلم ساعت هفت شروع بشه یه چیزی بخوریم.',
  },
  // IELTS Band 8+
  {
    id: 'sh_ielts_1',
    level: 'ielts',
    text: 'From my perspective, technological innovation has fundamentally transformed how we communicate.',
    phoneticTip: 'Stress: per-SPEC-tive, fun-da-MEN-tal-ly, trans-FORMED',
    translationFa: 'از دیدگاه من، نوآوری فناوری شیوه ارتباط ما را به‌طور بنیادین دگرگون کرده است.',
  },
  {
    id: 'sh_ielts_2',
    level: 'ielts',
    text: 'While urbanization boosts economic growth, it inevitably places immense pressure on public infrastructure.',
    phoneticTip: 'Pause after "growth," • Stress: in-EV-i-ta-bly, im-MENSE',
    translationFa: 'در حالی که شهرنشینی رشد اقتصادی را تقویت می‌کند، ناگزیر فشار عظیمی بر زیرساخت‌های عمومی وارد می‌سازد.',
  },
  {
    id: 'sh_ielts_3',
    level: 'ielts',
    text: 'Having said that, striking a healthy balance between ambition and well-being is easier said than done.',
    phoneticTip: 'Chunking: "Having said that, | striking a healthy balance | is easier said than done."',
    translationFa: 'با این حال، برقراری تعادل سالم بین جاه‌طلبی و آرامش، در حرف آسان‌تر از عمل است.',
  },
  // TED & Academic Prosody
  {
    id: 'sh_ted_1',
    level: 'ted',
    text: 'The single biggest problem in communication is the illusion that it has taken place.',
    phoneticTip: 'Dramatic pause before "is the illusion" • Stress: SIN-gle BIG-gest',
    translationFa: 'بزرگ‌ترین مشکل در ارتباطات، این توهم است که ارتباطی شکل گرفته است.',
  },
  {
    id: 'sh_ted_2',
    level: 'ted',
    text: 'Creativity is just connecting things that nobody else thought to link together.',
    phoneticTip: 'Stress: cre-a-TIV-i-ty, con-NEC-ting, NO-bo-dy',
    translationFa: 'خلاقیت فقط اتصال چیزهایی است که هیچ‌کس دیگری به فکر پیوند دادنشان نیفتاده بود.',
  },
  {
    id: 'sh_ted_3',
    level: 'ted',
    text: 'We consistently overestimate what we can achieve in a day, yet underestimate a decade of focus.',
    phoneticTip: 'Contrastive stress: O-ver-es-ti-mate vs UN-der-es-ti-mate',
    translationFa: 'ما همواره دستاورد یک روز را دست‌بالا و نتیجه یک دهه تمرکز را دست‌کم می‌گیریم.',
  },
  // Phonetics & Tongue Twisters
  {
    id: 'sh_twister_1',
    level: 'twisters',
    text: 'She thought through the thrilling theory thoroughly before thanking them.',
    phoneticTip: 'Unvoiced /θ/ (thought, through, thrilling, theory, thoroughly, thanking) vs voiced /ð/ (the, them)',
    translationFa: 'او پیش از تشکر از آن‌ها، آن نظریه هیجان‌انگیز را به‌طور کامل بررسی کرد (تمرین صدای th).',
  },
  {
    id: 'sh_twister_2',
    level: 'twisters',
    text: 'Whether the weather is warm or whether the weather is cold, we have to put up with the weather.',
    phoneticTip: 'Rounded /w/ in "whether/weather/warm" + phrasal verb link "put_up_with"',
    translationFa: 'چه هوا گرم باشد و چه سرد، باید با هوا بسازیم (تمرین صدای w و th).',
  },
];

function cleanWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, '')
    .replace(/'/g, '');
}

export function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const maxLen = Math.max(m, n);
  return (maxLen - dp[m][n]) / maxLen;
}

export function evaluateShadowing(
  targetText: string,
  spokenText: string,
  durationSeconds?: number,
): ShadowingEvaluation {
  const rawTargetWords = targetText
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const rawSpokenWords = spokenText
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (rawTargetWords.length === 0) {
    return {
      accuracyPct: 0,
      words: [],
      spokenWordCount: rawSpokenWords.length,
      wpm: null,
      grade: 'keep_practicing',
    };
  }

  const normalizedSpoken = rawSpokenWords.map((w) => ({
    raw: w,
    clean: cleanWord(w),
    used: false,
  }));

  let scoreSum = 0;
  let cursor = 0;

  const words: ShadowedWordResult[] = rawTargetWords.map((tWord) => {
    const tClean = cleanWord(tWord);
    if (!tClean) {
      scoreSum += 1;
      return { word: tWord, status: 'exact' };
    }

    // Look in a window around cursor for the best match
    const windowStart = Math.max(0, cursor - 2);
    const windowEnd = Math.min(normalizedSpoken.length - 1, cursor + 4);

    let bestIdx = -1;
    let bestSim = 0;

    for (let idx = windowStart; idx <= windowEnd; idx++) {
      if (normalizedSpoken[idx].used) continue;
      const sim = levenshteinSimilarity(tClean, normalizedSpoken[idx].clean);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = idx;
      }
      if (sim === 1) break;
    }

    if (bestIdx !== -1 && bestSim === 1) {
      normalizedSpoken[bestIdx].used = true;
      cursor = bestIdx + 1;
      scoreSum += 1;
      return { word: tWord, status: 'exact', spokenAs: normalizedSpoken[bestIdx].raw };
    }

    if (bestIdx !== -1 && bestSim >= 0.68) {
      normalizedSpoken[bestIdx].used = true;
      cursor = bestIdx + 1;
      scoreSum += 0.7;
      return { word: tWord, status: 'close', spokenAs: normalizedSpoken[bestIdx].raw };
    }

    return { word: tWord, status: 'missed' };
  });

  const accuracyPct = Math.round((scoreSum / rawTargetWords.length) * 100);
  const wpm =
    durationSeconds && durationSeconds >= 1.5 && rawSpokenWords.length > 0
      ? Math.round((rawSpokenWords.length / durationSeconds) * 60)
      : null;

  const grade: ShadowingEvaluation['grade'] =
    accuracyPct >= 85 ? 'excellent' : accuracyPct >= 60 ? 'good' : 'keep_practicing';

  return {
    accuracyPct,
    words,
    spokenWordCount: rawSpokenWords.length,
    wpm,
    grade,
  };
}

const SINGLE_FILLERS = new Set(['um', 'uh', 'er', 'ah', 'erm', 'hmm', 'like', 'basically', 'literally', 'actually']);
const PHRASE_FILLERS = ['you know', 'i mean', 'sort of', 'kind of'];

export function analyzeFluency(entries: TranscriptEntry[], sessionSeconds: number): FluencyMetrics {
  const userText = entries
    .filter((e) => e.role === 'user')
    .map((e) => e.text)
    .join(' ')
    .trim();

  if (!userText) {
    return {
      totalWords: 0,
      uniqueWords: 0,
      lexicalDiversityPct: 0,
      wpm: 0,
      fillerCount: 0,
      topFillers: [],
    };
  }

  const rawWords = userText.split(/\s+/).filter(Boolean);
  const cleanedWords = rawWords.map(cleanWord).filter(Boolean);
  const uniqueSet = new Set(cleanedWords);

  const fillerCounts: Record<string, number> = {};
  let fillerTotal = 0;

  for (const w of cleanedWords) {
    if (SINGLE_FILLERS.has(w)) {
      fillerTotal += 1;
      fillerCounts[w] = (fillerCounts[w] || 0) + 1;
    }
  }

  const lowerText = userText.toLowerCase();
  for (const phrase of PHRASE_FILLERS) {
    const regex = new RegExp(`\\b${phrase}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      fillerTotal += matches.length;
      fillerCounts[phrase] = (fillerCounts[phrase] || 0) + matches.length;
    }
  }

  const topFillers = Object.entries(fillerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word, count]) => `${word} (${count})`);

  // Estimate user speaking time as roughly 50% of session elapsed time (minimum 5s)
  const effectiveUserSpeakSeconds = Math.max(5, sessionSeconds * 0.5);
  const wpm = sessionSeconds >= 4 ? Math.min(220, Math.round((cleanedWords.length / effectiveUserSpeakSeconds) * 60)) : 0;

  return {
    totalWords: cleanedWords.length,
    uniqueWords: uniqueSet.size,
    lexicalDiversityPct:
      cleanedWords.length > 0 ? Math.round((uniqueSet.size / cleanedWords.length) * 100) : 0,
    wpm,
    fillerCount: fillerTotal,
    topFillers,
  };
}
