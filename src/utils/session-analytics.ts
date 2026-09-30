import {
  FeedbackLog,
  SessionReport,
  SessionStats,
  TranscriptEntry,
  VocabCard,
} from '../types';

export type SkillId =
  | 'pronunciation'
  | 'accent'
  | 'speed'
  | 'accuracy'
  | 'vocabulary'
  | 'coherence'
  | 'interaction'
  | 'confidence';

export interface SkillMetric {
  id: SkillId;
  labelFa: string;
  labelEn: string;
  shortFa: string;
  shortEn: string;
  score: number; // 0..100
  band: number; // 0..9.0 (0.5 steps)
  statusFa: string;
  statusEn: string;
  color: 'emerald' | 'cyan' | 'indigo' | 'amber' | 'rose';
  detailFa: string;
  detailEn: string;
}

export interface SessionAnalytics {
  overallBand: number;
  overallScore100: number;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  cefrTitleFa: string;
  cefrTitleEn: string;
  wpm: number;
  paceStatus: 'slow' | 'moderate' | 'ideal' | 'fast';
  paceLabelFa: string;
  paceLabelEn: string;
  userWordCount: number;
  aiWordCount: number;
  userTurns: number;
  aiTurns: number;
  avgWordsPerTurn: number;
  longestTurnWords: number;
  userSharePct: number;
  aiSharePct: number;
  uniqueWordsCount: number;
  lexicalDiversityPct: number;
  advancedWordsCount: number;
  topAdvancedWords: string[];
  discourseMarkersUsed: string[];
  errorBreakdown: {
    grammar: number;
    vocabulary: number;
    pronunciation: number;
    total: number;
    accuracyPct: number;
  };
  skills: SkillMetric[];
  radarSkills: SkillMetric[]; // 6 core axes for the hexagonal radar chart
  strengthsFa: string[];
  strengthsEn: string[];
  actionPlanFa: string[];
  actionPlanEn: string[];
}

const DISCOURSE_MARKERS = [
  'however',
  'moreover',
  'furthermore',
  'therefore',
  'consequently',
  'nevertheless',
  'nonetheless',
  'although',
  'even though',
  'whereas',
  'while',
  'on the other hand',
  'in addition',
  'for example',
  'for instance',
  'in fact',
  'actually',
  'basically',
  'personally',
  'in my opinion',
  'from my perspective',
  'as a result',
  'overall',
  'specifically',
  'especially',
  'meanwhile',
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'you', 'not', 'are', 'from',
  'your', 'all', 'have', 'new', 'more', 'an', 'was', 'we', 'will', 'home',
  'can', 'us', 'about', 'if', 'page', 'my', 'has', 'but', 'our', 'one',
  'other', 'do', 'no', 'time', 'they', 'he', 'she', 'it', 'in', 'on', 'at',
  'to', 'of', 'is', 'be', 'as', 'or', 'by', 'so', 'up', 'out', 'what',
  'who', 'when', 'where', 'why', 'how', 'yes', 'yeah', 'okay', 'ok', 'well',
  'like', 'just', 'very', 'really', 'think', 'know', 'want', 'good', 'going',
]);

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function roundBand(val: number): number {
  return clamp(Math.round(val * 2) / 2, 1.0, 9.0);
}

function scoreToBand(score: number): number {
  // Maps 0..100 score to IELTS 3.5..9.0 scale
  const raw = 3.5 + (clamp(score, 0, 100) / 100) * 5.5;
  return roundBand(raw);
}

function bandToScore(band: number): number {
  return Math.round(clamp(((band - 3.0) / 6.0) * 100, 15, 98));
}

function getStatusAndColor(score: number): {
  statusFa: string;
  statusEn: string;
  color: SkillMetric['color'];
} {
  if (score >= 82) {
    return { statusFa: 'عالی (پیشرفته)', statusEn: 'Excellent', color: 'emerald' };
  }
  if (score >= 70) {
    return { statusFa: 'خوب و روان', statusEn: 'Good', color: 'cyan' };
  }
  if (score >= 58) {
    return { statusFa: 'متوسط رو به بالا', statusEn: 'Satisfactory', color: 'indigo' };
  }
  if (score >= 45) {
    return { statusFa: 'نیازمند تمرین', statusEn: 'Needs Practice', color: 'amber' };
  }
  return { statusFa: 'نیازمند تقویت جدی', statusEn: 'Needs Focus', color: 'rose' };
}

function getCefrInfo(band: number): {
  cefrLevel: SessionAnalytics['cefrLevel'];
  cefrTitleFa: string;
  cefrTitleEn: string;
} {
  if (band >= 8.0) {
    return {
      cefrLevel: 'C2',
      cefrTitleFa: 'C2 — تسلط کامل (در سطح گویشوران بومی)',
      cefrTitleEn: 'C2 — Mastery / Near-Native Proficiency',
    };
  }
  if (band >= 7.0) {
    return {
      cefrLevel: 'C1',
      cefrTitleFa: 'C1 — پیشرفته (بیان روان، دقیق و ساختاریافته)',
      cefrTitleEn: 'C1 — Effective Operational Proficiency (Advanced)',
    };
  }
  if (band >= 5.5) {
    return {
      cefrLevel: 'B2',
      cefrTitleFa: 'B2 — فوق‌متوسط (مستقل و قادر به بحث در موضوعات متنوع)',
      cefrTitleEn: 'B2 — Vantage / Upper-Intermediate',
    };
  }
  if (band >= 4.5) {
    return {
      cefrLevel: 'B1',
      cefrTitleFa: 'B1 — متوسط (توانایی برقراری ارتباط در موقعیت‌های روزمره)',
      cefrTitleEn: 'B1 — Threshold / Intermediate',
    };
  }
  if (band >= 3.5) {
    return {
      cefrLevel: 'A2',
      cefrTitleFa: 'A2 — مقدماتی پیشرفته (جملات ساده و کاربردی)',
      cefrTitleEn: 'A2 — Waystage / Elementary',
    };
  }
  return {
    cefrLevel: 'A1',
    cefrTitleFa: 'A1 — مبتدی (در حال ساخت دایره واژگان پایه)',
    cefrTitleEn: 'A1 — Breakthrough / Beginner',
  };
}

export function computeSessionAnalytics(
  stats: SessionStats,
  report: SessionReport | null,
  transcript: TranscriptEntry[] = [],
  feedbackLogs: FeedbackLog[] = [],
  vocabCards: VocabCard[] = [],
): SessionAnalytics {
  const overallBand = roundBand(report?.overallBand ?? stats.estimatedBandScore ?? 6.5);
  const overallScore100 = clamp(Math.round((overallBand / 9) * 100), 15, 100);
  const { cefrLevel, cefrTitleFa, cefrTitleEn } = getCefrInfo(overallBand);

  // Extract criterion bands from AI report when available
  const findCriterionBand = (key: 'fluency' | 'lexical' | 'grammar' | 'pronunciation', fallback: number): number => {
    const found = report?.criteria?.find((c) => c.key === key);
    return found ? roundBand(found.band) : fallback;
  };
  const findCriterionComment = (key: 'fluency' | 'lexical' | 'grammar' | 'pronunciation'): string | null => {
    const found = report?.criteria?.find((c) => c.key === key);
    return found?.comment || null;
  };

  // Analyze transcript
  const userEntries = transcript.filter((e) => e.role === 'user' && e.text.trim().length > 0);
  const aiEntries = transcript.filter((e) => e.role === 'model' && e.text.trim().length > 0);

  const tokenize = (text: string): string[] =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9'\s-]/gi, ' ')
      .split(/\s+/)
      .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
      .filter((w) => w.length > 1);

  const userWords: string[] = [];
  let longestTurnWords = 0;
  for (const entry of userEntries) {
    const words = tokenize(entry.text);
    userWords.push(...words);
    if (words.length > longestTurnWords) longestTurnWords = words.length;
  }

  const aiWords: string[] = [];
  for (const entry of aiEntries) {
    aiWords.push(...tokenize(entry.text));
  }

  const userWordCount = userWords.length;
  const aiWordCount = aiWords.length;
  const userTurns = userEntries.length;
  const aiTurns = aiEntries.length;
  const avgWordsPerTurn = userTurns > 0 ? Math.round(userWordCount / userTurns) : 0;

  const totalCombinedWords = userWordCount + aiWordCount;
  const userSharePct =
    totalCombinedWords > 0
      ? clamp(Math.round((userWordCount / totalCombinedWords) * 100), 5, 95)
      : 45;
  const aiSharePct = 100 - userSharePct;

  // Speaking speed (WPM)
  // Estimate active user speaking window from user share of total duration
  const durationSec = Math.max(10, stats.durationSeconds || 30);
  let wpm = 0;
  if (userWordCount > 0) {
    const estimatedUserSpeakSec = Math.max(
      6,
      Math.min(durationSec * Math.max(0.32, userSharePct / 100), userWordCount * 0.62),
    );
    wpm = clamp(Math.round((userWordCount / estimatedUserSpeakSec) * 60), 45, 210);
  } else {
    // Fallback estimate when audio-only session has no text transcript
    wpm = Math.round(95 + (overallBand - 5.5) * 14);
  }

  let paceStatus: SessionAnalytics['paceStatus'] = 'ideal';
  let paceLabelFa = 'طبیعی و استاندارد (مناسب آیلتس)';
  let paceLabelEn = 'Natural & Balanced Pace';
  if (wpm < 85) {
    paceStatus = 'slow';
    paceLabelFa = 'کمی کند و با مکث (نیازمند روان‌تر شدن)';
    paceLabelEn = 'Slightly Slow / Hesitant';
  } else if (wpm < 110) {
    paceStatus = 'moderate';
    paceLabelFa = 'متوسط و شمرده (قابل قبول)';
    paceLabelEn = 'Moderate & Clear Pace';
  } else if (wpm > 160) {
    paceStatus = 'fast';
    paceLabelFa = 'سریع (مراقب وضوح ادا و استرس کلمات باشید)';
    paceLabelEn = 'Fast Pace (Watch articulation clarity)';
  }

  // Lexical diversity & advanced words
  const uniqueSet = new Set(userWords);
  const uniqueWordsCount = uniqueSet.size;
  // Root/adjusted Type-Token Ratio so longer conversations aren't unfairly penalized
  const rawTtr = userWordCount > 0 ? uniqueWordsCount / userWordCount : 0.68;
  const lengthBonus = userWordCount > 40 ? Math.min(0.22, Math.log10(userWordCount / 25) * 0.18) : 0;
  const lexicalDiversityPct = clamp(Math.round((rawTtr + lengthBonus) * 100), 35, 96);

  const notableUserWords = Array.from(uniqueSet).filter(
    (w) => w.length >= 7 && !STOP_WORDS.has(w),
  );
  const cardWords = vocabCards.map((c) => c.word.trim()).filter(Boolean);
  const topAdvancedWords = Array.from(new Set([...cardWords, ...notableUserWords])).slice(0, 8);
  const advancedWordsCount = Math.max(stats.wordsRecordedCount, topAdvancedWords.length);

  // Discourse markers detection
  const fullUserText = userEntries.map((e) => e.text.toLowerCase()).join(' ');
  const discourseMarkersUsed = DISCOURSE_MARKERS.filter((marker) => {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(fullUserText);
  });

  // Error breakdown
  const grammarErrors = feedbackLogs.filter((f) => f.type === 'grammar').length;
  const vocabularyErrors = feedbackLogs.filter((f) => f.type === 'vocabulary').length;
  const pronunciationErrors = feedbackLogs.filter((f) => f.type === 'pronunciation').length;
  const totalErrors = Math.max(stats.correctionsCount, feedbackLogs.length);

  const baseTurnsForAccuracy = Math.max(userTurns, Math.ceil(durationSec / 18), 3);
  const errorRatio = totalErrors / (baseTurnsForAccuracy * 1.6);
  const accuracyPct = clamp(Math.round((1 - Math.min(0.75, errorRatio)) * 100), 35, 98);

  // Compute the 8 skill dimensions
  const fluencyBand = findCriterionBand('fluency', overallBand);
  const lexicalBand = findCriterionBand('lexical', overallBand);
  const grammarBand = findCriterionBand('grammar', overallBand);
  const pronBand = findCriterionBand('pronunciation', overallBand);

  const pronScore = clamp(
    Math.round(bandToScore(pronBand) - pronunciationErrors * 4 + (wpm >= 100 && wpm <= 155 ? 3 : 0)),
    35,
    98,
  );
  const accentScore = clamp(
    Math.round(pronScore * 0.92 + (discourseMarkersUsed.length > 0 ? 6 : 2)),
    35,
    97,
  );
  const speedScore = clamp(
    Math.round(
      bandToScore(fluencyBand) * 0.7 +
        (wpm >= 110 && wpm <= 155 ? 28 : wpm >= 90 ? 22 : 14),
    ),
    35,
    98,
  );
  const accuracyScore = clamp(
    Math.round(bandToScore(grammarBand) * 0.65 + accuracyPct * 0.35),
    35,
    98,
  );
  const vocabScore = clamp(
    Math.round(
      bandToScore(lexicalBand) * 0.65 +
        lexicalDiversityPct * 0.25 +
        Math.min(12, advancedWordsCount * 3),
    ),
    38,
    98,
  );
  const coherenceScore = clamp(
    Math.round(
      bandToScore(fluencyBand) * 0.72 +
        Math.min(20, discourseMarkersUsed.length * 6) +
        (avgWordsPerTurn >= 12 ? 8 : 2),
    ),
    38,
    98,
  );
  const interactionScore = clamp(
    Math.round(
      (userSharePct >= 35 && userSharePct <= 75 ? 82 : 68) +
        Math.min(14, avgWordsPerTurn * 0.7) -
        (userTurns === 0 ? 15 : 0),
    ),
    40,
    98,
  );
  const confidenceScore = clamp(
    Math.round((speedScore + pronScore + interactionScore) / 3),
    40,
    98,
  );

  const buildSkill = (
    id: SkillId,
    labelFa: string,
    labelEn: string,
    shortFa: string,
    shortEn: string,
    score: number,
    detailFa: string,
    detailEn: string,
    overrideBand?: number,
  ): SkillMetric => {
    const clampedScore = clamp(Math.round(score), 20, 99);
    const band = overrideBand !== undefined ? roundBand(overrideBand) : scoreToBand(clampedScore);
    const { statusFa, statusEn, color } = getStatusAndColor(clampedScore);
    return {
      id,
      labelFa,
      labelEn,
      shortFa,
      shortEn,
      score: clampedScore,
      band,
      statusFa,
      statusEn,
      color,
      detailFa,
      detailEn,
    };
  };

  const skills: SkillMetric[] = [
    buildSkill(
      'pronunciation',
      'تلفظ و وضوح ادا (Pronunciation)',
      'Pronunciation & Articulation',
      'تلفظ',
      'Pronunciation',
      pronScore,
      findCriterionComment('pronunciation') ||
        (pronunciationErrors === 0
          ? 'ادای کلمات واضح و قابل فهم بود و خطای تلفظی بحرانی ثبت نشد.'
          : `${pronunciationErrors} مورد نکته تلفظی در طول مکالمه شناسایی شد.`),
      findCriterionComment('pronunciation') ||
        (pronunciationErrors === 0
          ? 'Clear word articulation with no major pronunciation breakdowns.'
          : `${pronunciationErrors} pronunciation note(s) flagged during the session.`),
      pronBand,
    ),
    buildSkill(
      'accent',
      'لهجه، استرس و آهنگ کلام (Accent & Intonation)',
      'Accent, Stress & Intonation',
      'لهجه و لحن',
      'Accent',
      accentScore,
      accentScore >= 75
        ? 'آهنگ جملات (Intonation) و تکیه کلمات طبیعی و نزدیک به الگوهای استاندارد بود.'
        : 'برای طبیعی‌تر شدن لهجه، روی استرس کلمات چندسیلابی و لحن پایانی جملات تمرین کنید.',
      accentScore >= 75
        ? 'Natural sentence melody and word stress patterns.'
        : 'Practice sentence stress and rising/falling intonation using Shadowing.',
    ),
    buildSkill(
      'speed',
      'سرعت تکلم و روانی گفتار (Speed & Fluency)',
      'Speaking Speed & Fluency',
      'سرعت و روانی',
      'Speed/Fluency',
      speedScore,
      findCriterionComment('fluency') ||
        `سرعت میانگین شما حدود ${wpm} کلمه در دقیقه (${paceLabelFa}) برآورد شد.`,
      findCriterionComment('fluency') ||
        `Estimated speaking pace: ~${wpm} WPM (${paceLabelEn}).`,
      fluencyBand,
    ),
    buildSkill(
      'accuracy',
      'دقت گرامری و ساختاری (Grammar & Accuracy)',
      'Grammar & Structural Accuracy',
      'دقت گرامر',
      'Accuracy',
      accuracyScore,
      findCriterionComment('grammar') ||
        (grammarErrors === 0
          ? `دقت ساختاری بالا (${accuracyPct}%) بدون خطای گرامری ثبت‌شده.`
          : `${grammarErrors} نکته گرامری ثبت شد (نرخ دقت جملات: ${accuracyPct}%).`),
      findCriterionComment('grammar') ||
        (grammarErrors === 0
          ? `High structural accuracy (${accuracyPct}%) with zero grammar flags.`
          : `${grammarErrors} grammar correction(s) logged (${accuracyPct}% accuracy rate).`),
      grammarBand,
    ),
    buildSkill(
      'vocabulary',
      'تنوع و غنای واژگان (Vocabulary Diversity)',
      'Vocabulary Diversity & Lexical Range',
      'تنوع واژگان',
      'Vocabulary',
      vocabScore,
      findCriterionComment('lexical') ||
        `شاخص تنوع واژگان ${lexicalDiversityPct}% با ${uniqueWordsCount} واژه یکتا و ${advancedWordsCount} واژه سطح بالا.`,
      findCriterionComment('lexical') ||
        `Lexical diversity index: ${lexicalDiversityPct}% (${uniqueWordsCount} unique words, ${advancedWordsCount} advanced items).`,
      lexicalBand,
    ),
    buildSkill(
      'coherence',
      'انسجام کلام و رابط‌های گفتاری (Coherence)',
      'Coherence & Discourse Markers',
      'انسجام کلام',
      'Coherence',
      coherenceScore,
      discourseMarkersUsed.length > 0
        ? `استفاده خوب از رابط‌های گفتاری (${discourseMarkersUsed.slice(0, 4).join(', ')}).`
        : 'پیشنهاد می‌شود از کلمات ربط مثل However, For instance, Moreover بیشتر استفاده کنید.',
      discourseMarkersUsed.length > 0
        ? `Good use of discourse connectors (${discourseMarkersUsed.slice(0, 4).join(', ')}).`
        : 'Use more linking words like However, For instance, and Moreover to connect ideas.',
    ),
    buildSkill(
      'interaction',
      'تعامل و بسط پاسخ‌ها (Turn Development)',
      'Interaction & Turn Development',
      'بسط پاسخ',
      'Interaction',
      interactionScore,
      avgWordsPerTurn > 0
        ? `میانگین ${avgWordsPerTurn} کلمه در هر نوبت صحبت (بلندترین پاسخ: ${longestTurnWords} کلمه).`
        : `سهم مشارکت شما در مکالمه ${userSharePct}% بود.`,
      avgWordsPerTurn > 0
        ? `Averaged ${avgWordsPerTurn} words per turn (longest turn: ${longestTurnWords} words).`
        : `Your conversation participation share was ${userSharePct}%.`,
    ),
    buildSkill(
      'confidence',
      'اعتمادبه‌نفس و پیوستگی بیان (Confidence)',
      'Confidence & Delivery Flow',
      'اعتمادبه‌نفس',
      'Confidence',
      confidenceScore,
      confidenceScore >= 75
        ? 'حفظ جریان مکالمه با اعتمادبه‌نفس بالا و کمترین توقف‌های طولانی.'
        : 'با تمرین روزانه ۵ دقیقه‌ای، مکث‌ها کمتر و اعتمادبه‌نفس گفتاری بیشتر می‌شود.',
      confidenceScore >= 75
        ? 'Confident conversational flow with minimal hesitation.'
        : 'Daily 5-minute speaking drills will reduce hesitation and boost confidence.',
    ),
  ];

  // 6 primary axes for the hexagonal radar chart
  const radarSkills = skills.slice(0, 6);

  // Build strengths & actionable coaching plan
  const strengthsFa: string[] = [...(report?.strengths ?? [])];
  const strengthsEn: string[] = [...(report?.strengths ?? [])];

  if (strengthsFa.length === 0) {
    const sortedDesc = [...skills].sort((a, b) => b.score - a.score);
    for (const top of sortedDesc.slice(0, 3)) {
      strengthsFa.push(`${top.labelFa}: امتیاز ${top.score} از ۱۰۰ (بند ${top.band.toFixed(1)}) — ${top.detailFa}`);
      strengthsEn.push(`${top.labelEn}: ${top.score}/100 (Band ${top.band.toFixed(1)}) — ${top.detailEn}`);
    }
  }

  const actionPlanFa: string[] = [...(report?.improvements ?? [])];
  const actionPlanEn: string[] = [...(report?.improvements ?? [])];

  if (avgWordsPerTurn > 0 && avgWordsPerTurn < 15) {
    actionPlanFa.push(
      'بسط پاسخ‌ها با فرمول PREP: در هر نوبت ابتدا نظر اصلی (Point)، سپس دلیل (Reason) و یک مثال کوتاه (Example) بیاورید تا طول پاسخ‌هایتان از یک جمله فراتر برود.',
    );
    actionPlanEn.push(
      'Expand answers using the PREP method (Point, Reason, Example, Point) to increase turn length.',
    );
  }
  if (discourseMarkersUsed.length < 2) {
    actionPlanFa.push(
      'تقویت انسجام کلام: در جلسه بعدی حداقل ۳ عبارت ربط طبیعی (مانند On the other hand, As a matter of fact, Consequently) را در جملات خود به کار ببرید.',
    );
    actionPlanEn.push(
      'Boost coherence by weaving at least 3 discourse markers (On the other hand, Consequently, For instance) into your next session.',
    );
  }
  if (wpm < 100) {
    actionPlanFa.push(
      'افزایش سرعت و روانی کلام: از حالت «مربی سایه‌خوانی (Shadowing)» در صفحه اصلی استفاده کنید تا ریتم و سرعت گفتار شما به بازه استاندارد ۱۱۰ تا ۱۵۰ کلمه در دقیقه برسد.',
    );
    actionPlanEn.push(
      'Use the Shadowing Studio mode to build speech rhythm toward the 110–150 WPM native target zone.',
    );
  }
  if (totalErrors > 0) {
    actionPlanFa.push(
      `مرور اصلاحات جلسه: ${totalErrors} نکته اصلاحی ثبت‌شده در جدول پایین را با صدای بلند ۲ بار تکرار کنید تا ساختار صحیح در حافظه حرکتی شما تثبیت شود.`,
    );
    actionPlanEn.push(
      `Review the ${totalErrors} logged correction(s) below and repeat the native alternatives aloud twice.`,
    );
  }
  if (actionPlanFa.length === 0) {
    actionPlanFa.push(
      'تنوع موضوعی: در جلسه بعدی یکی از موضوعات چالشی IELTS Part 3 یا مناظره (Debate) را انتخاب کنید تا دایره واژگان انتزاعی شما به سطح C1/C2 برسد.',
    );
    actionPlanEn.push(
      'Challenge yourself with an IELTS Part 3 or Debate topic next session to push abstract vocabulary into C1/C2.',
    );
  }

  return {
    overallBand,
    overallScore100,
    cefrLevel,
    cefrTitleFa,
    cefrTitleEn,
    wpm,
    paceStatus,
    paceLabelFa,
    paceLabelEn,
    userWordCount,
    aiWordCount,
    userTurns,
    aiTurns,
    avgWordsPerTurn,
    longestTurnWords,
    userSharePct,
    aiSharePct,
    uniqueWordsCount,
    lexicalDiversityPct,
    advancedWordsCount,
    topAdvancedWords,
    discourseMarkersUsed,
    errorBreakdown: {
      grammar: grammarErrors,
      vocabulary: vocabularyErrors,
      pronunciation: pronunciationErrors,
      total: totalErrors,
      accuracyPct,
    },
    skills,
    radarSkills,
    strengthsFa,
    strengthsEn,
    actionPlanFa,
    actionPlanEn,
  };
}
