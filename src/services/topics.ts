import { CoachRole, PracticeTopic, TopicCategory } from '../types';

export const PRACTICE_TOPICS: PracticeTopic[] = [
  {
    id: 'free',
    category: 'free',
    title: 'Free Choice (Coach Decides)',
    titleFa: 'انتخاب آزاد (مربی موضوع را پیشنهاد می‌دهد)',
    prompt: '',
  },
  // IELTS Part 1
  {
    id: 'p1_hometown_accom',
    category: 'ielts_part1',
    title: 'Part 1: Hometown & Accommodation',
    titleFa: 'بخش ۱ آیلتس: زادگاه و محل سکونت',
    prompt:
      'Conduct an IELTS Speaking Part 1 interview focusing on Hometown, Neighborhood, and Accommodation. Ask 4-5 short, direct personal questions one by one.',
  },
  {
    id: 'p1_work_studies',
    category: 'ielts_part1',
    title: 'Part 1: Work, Studies & Daily Routine',
    titleFa: 'بخش ۱ آیلتس: کار، تحصیل و برنامه روزانه',
    prompt:
      'Conduct an IELTS Speaking Part 1 interview focusing on Work, Academic Studies, and Daily Routine. Ask concise personal questions one at a time.',
  },
  {
    id: 'p1_tech_reading',
    category: 'ielts_part1',
    title: 'Part 1: Technology, Apps & Reading Habits',
    titleFa: 'بخش ۱ آیلتس: تکنولوژی و عادت‌های مطالعه',
    prompt:
      'Conduct an IELTS Speaking Part 1 interview focusing on Technology, Mobile Apps, and Reading Habits. Keep questions natural and conversational.',
  },
  // IELTS Part 2 Cue Cards
  {
    id: 'p2_memorable_journey',
    category: 'ielts_part2',
    title: 'Part 2 Cue Card: A Memorable Journey',
    titleFa: 'کارت موضوع بخش ۲: یک سفر به‌یادماندنی',
    prompt:
      'Conduct an IELTS Speaking Part 2 Long Turn on the cue card "Describe a memorable journey you have made". Invite the candidate to speak for 1-2 minutes uninterrupted, then ask 1-2 brief rounding-off questions.',
    cueBullets: [
      'Where you went and how you traveled',
      'Who you went with',
      'What you did and saw during the trip',
      'And explain why this journey was so memorable to you',
    ],
    prepSeconds: 60,
    speakSeconds: 120,
  },
  {
    id: 'p2_skill_learned',
    category: 'ielts_part2',
    title: 'Part 2 Cue Card: A Useful Skill You Learned',
    titleFa: 'کارت موضوع بخش ۲: مهارتی کاربردی که آموخته‌اید',
    prompt:
      'Conduct an IELTS Speaking Part 2 Long Turn on the cue card "Describe a useful skill you learned outside of school". Let the candidate speak for up to 2 minutes, then ask follow-up questions.',
    cueBullets: [
      'What the skill is and when you learned it',
      'How you learned it and who helped you',
      'How often you use this skill today',
      'And explain why you think this skill is valuable',
    ],
    prepSeconds: 60,
    speakSeconds: 120,
  },
  {
    id: 'p2_inspiring_person',
    category: 'ielts_part2',
    title: 'Part 2 Cue Card: A Person Who Inspired You',
    titleFa: 'کارت موضوع بخش ۲: فردی الهام‌بخش در زندگی شما',
    prompt:
      'Conduct an IELTS Speaking Part 2 Long Turn on the cue card "Describe a person who has inspired you to achieve a goal". Listen attentively to their 1-2 minute monologue before asking follow-ups.',
    cueBullets: [
      'Who this person is and how you know them',
      'What qualities or achievements they have',
      'How they encouraged or inspired you',
      'And explain how they influenced your life',
    ],
    prepSeconds: 60,
    speakSeconds: 120,
  },
  {
    id: 'p2_book_movie',
    category: 'ielts_part2',
    title: 'Part 2 Cue Card: A Book or Film That Changed Your Perspective',
    titleFa: 'کارت موضوع بخش ۲: کتاب یا فیلمی که دیدگاهتان را تغییر داد',
    prompt:
      'Conduct an IELTS Speaking Part 2 Long Turn on the cue card "Describe a book or film that made a strong impression on you". Let the user deliver a 1-2 minute talk, then ask follow-up questions.',
    cueBullets: [
      'What the book or film is about',
      'When and why you read or watched it',
      'Which character or idea stood out most',
      'And explain how it changed your perspective',
    ],
    prepSeconds: 60,
    speakSeconds: 120,
  },
  // IELTS Part 3
  {
    id: 'p3_ai_workplace',
    category: 'ielts_part3',
    title: 'Part 3: AI, Automation & Future of Work',
    titleFa: 'بخش ۳ آیلتس: هوش مصنوعی و آینده مشاغل',
    prompt:
      'Conduct an IELTS Speaking Part 3 analytical discussion on Artificial Intelligence, Automation, and the Future of Work. Ask abstract, analytical questions and challenge the candidate to justify their views.',
  },
  {
    id: 'p3_environment_cities',
    category: 'ielts_part3',
    title: 'Part 3: Urbanization & Environmental Protection',
    titleFa: 'بخش ۳ آیلتس: شهرنشینی و محیط زیست',
    prompt:
      'Conduct an IELTS Speaking Part 3 discussion on Urbanization, Public Transport, and Environmental Responsibility. Encourage advanced vocabulary and nuanced arguments.',
  },
  // Job Interview
  {
    id: 'job_behavioral_star',
    category: 'interview',
    title: 'Interview: Leadership & Conflict Resolution (STAR)',
    titleFa: 'مصاحبه شغلی: رهبری و حل تعارض (مدل STAR)',
    prompt:
      'Conduct a behavioral job interview focusing on leadership, handling tight deadlines, and resolving team conflicts using the STAR method (Situation, Task, Action, Result).',
  },
  {
    id: 'job_software_system',
    category: 'interview',
    title: 'Interview: Software Engineering & Architecture',
    titleFa: 'مصاحبه شغلی: مهندسی نرم‌افزار و طراحی سیستم',
    prompt:
      'Conduct a senior software engineering interview covering past technical projects, debugging complex production issues, and system design trade-offs.',
  },
  // Debate
  {
    id: 'debate_remote_work',
    category: 'debate',
    title: 'Debate: Remote Work vs. Office Culture',
    titleFa: 'مناظره: دورکاری در برابر حضور در شرکت',
    prompt:
      'Debate the motion: "Remote work is superior to traditional office culture for both productivity and well-being." Take the opposing stance to whichever side the user chooses.',
  },
  {
    id: 'debate_social_media',
    category: 'debate',
    title: 'Debate: Does Social Media Do More Harm Than Good?',
    titleFa: 'مناظره: آیا شبکه‌های اجتماعی بیش از سود، زیان دارند؟',
    prompt:
      'Debate the motion: "Social media platforms have done more harm than good to modern society." Challenge the user with counterarguments and ask for evidence.',
  },
  // Shadowing
  {
    id: 'shadow_beginner',
    category: 'shadowing',
    title: 'Shadowing: Daily Life (Beginner)',
    titleFa: 'شدویینگ: زندگی روزمره (مبتدی)',
    prompt:
      'Run a shadowing drill with short, simple sentences about daily routines, greetings, and common situations. Speak slowly and clearly. Wait for the user to repeat each sentence before proceeding.',
  },
  {
    id: 'shadow_intermediate',
    category: 'shadowing',
    title: 'Shadowing: News & Current Events (Intermediate)',
    titleFa: 'شدویینگ: اخبار و رویدادها (متوسط)',
    prompt:
      'Run a shadowing drill with medium-length sentences about news headlines, technology trends, and world events. Use natural connected speech and moderate speed.',
  },
  {
    id: 'shadow_advanced',
    category: 'shadowing',
    title: 'Shadowing: Academic & TED Talks (Advanced)',
    titleFa: 'شدویینگ: آکادمیک و سخنرانی‌ها (پیشرفته)',
    prompt:
      'Run an advanced shadowing drill with complex, multi-clause sentences drawn from academic lectures, TED Talks, and scientific writing. Use natural pace with connected speech features like linking, elision, and assimilation.',
  },
  // Pronunciation Drill
  {
    id: 'pron_minimal_pairs',
    category: 'pronunciation',
    title: 'Pronunciation: Minimal Pairs Drill',
    titleFa: 'تلفظ: تمرین جفت‌های کمینه',
    prompt:
      'Drill minimal pairs (ship/sheep, bat/bet, thin/sin, light/right, etc.). Present each pair, model the sounds, and have the user practice distinguishing and producing them correctly.',
  },
  {
    id: 'pron_stress_intonation',
    category: 'pronunciation',
    title: 'Pronunciation: Stress & Intonation Patterns',
    titleFa: 'تلفظ: تکیه و آهنگ جمله',
    prompt:
      'Focus on English word stress (PHOtograph vs photoGRAPHic), sentence stress, and intonation patterns. Practice rising/falling tones for questions and statements. Include compound nouns and phrasal verbs.',
  },
  {
    id: 'pron_connected_speech',
    category: 'pronunciation',
    title: 'Pronunciation: Connected Speech & Linking',
    titleFa: 'تلفظ: گفتار پیوسته و اتصال کلمات',
    prompt:
      'Practice connected speech features: linking ("an apple" → "anapple"), elision ("next day" → "nex day"), assimilation ("ten people" → "tem people"), and weak forms. Use natural sentence contexts.',
  },
  // Storytelling
  {
    id: 'story_retelling',
    category: 'storytelling',
    title: 'Story Retelling Practice',
    titleFa: 'تمرین بازگویی داستان',
    prompt:
      'Tell the user a short, interesting story (3-4 sentences). Then ask them to retell it in their own words. Evaluate their use of narrative tenses, cohesion, and vocabulary. Give feedback and tell another story.',
  },
  {
    id: 'story_building',
    category: 'storytelling',
    title: 'Collaborative Story Building',
    titleFa: 'داستان‌سازی مشترک',
    prompt:
      'Build a story together with the user. Start with an opening sentence and take turns adding to the plot. Encourage the user to use complex sentences, descriptive language, and narrative devices. Correct grammar gently.',
  },
  // Vocabulary Drill
  {
    id: 'vocab_academic',
    category: 'vocab_drill',
    title: 'Academic Word List Drill',
    titleFa: 'تمرین واژگان آکادمیک',
    prompt:
      'Teach and drill words from the Academic Word List. For each word: define it, give example sentences, ask the user to create their own sentences, and test with fill-in-the-blank exercises.',
  },
  {
    id: 'vocab_idioms',
    category: 'vocab_drill',
    title: 'Idioms & Phrasal Verbs Practice',
    titleFa: 'تمرین اصطلاحات و افعال عبارتی',
    prompt:
      'Teach common English idioms and phrasal verbs. For each one: explain the meaning, give 2 example sentences, ask the user to use it in context. Mix formal and informal registers.',
  },
  {
    id: 'vocab_collocations',
    category: 'vocab_drill',
    title: 'Collocations & Word Partnerships',
    titleFa: 'تمرین همایندها (Collocations)',
    prompt:
      'Drill natural English collocations. Present correct vs incorrect partnerships ("make a decision" not "do a decision", "heavy rain" not "strong rain"). Quiz the user and provide memorable examples.',
  },
  // Real-Life Roleplay Scenarios
  {
    id: 'rp_airport_customs',
    category: 'roleplay',
    title: 'Roleplay: Airport Immigration & Lost Luggage',
    titleFa: 'سناریو: فرودگاه، افسر مهاجرت و چمدان گمشده',
    prompt:
      'Act as an airport immigration officer and then baggage service agent. Ask the traveler about their visa purpose, return ticket, and help them file a lost luggage report with realistic follow-up questions.',
  },
  {
    id: 'rp_doctor_visit',
    category: 'roleplay',
    title: 'Roleplay: Doctor Appointment & Symptoms',
    titleFa: 'سناریو: مطب پزشک و توضیح علائم بیماری',
    prompt:
      'Act as a sympathetic general practitioner (doctor) at a clinic. Ask the patient about their symptoms, duration, medical history, and allergies, then explain a treatment plan.',
  },
  {
    id: 'rp_hotel_restaurant',
    category: 'roleplay',
    title: 'Roleplay: Hotel Room Issue & Restaurant Order',
    titleFa: 'سناریو: اعتراض به اتاق هتل و سفارش در رستوران',
    prompt:
      'Act as a hotel front-desk manager handling a noisy room complaint, followed by a fine-dining waiter helping with dietary restrictions and menu recommendations.',
  },
  {
    id: 'rp_salary_negotiation',
    category: 'roleplay',
    title: 'Roleplay: Salary Negotiation & Promotion',
    titleFa: 'سناریو: مذاکره حقوق و ارتقای شغلی با مدیر',
    prompt:
      'Act as a company department director in an annual review. Listen to the employee pitch their achievements and negotiate salary/benefits firmly but fairly.',
  },
];

export function getSuggestedCategoriesForRole(role: CoachRole): TopicCategory[] {
  switch (role) {
    case 'ielts_examiner':
      return ['free', 'ielts_part1', 'ielts_part2', 'ielts_part3', 'custom'];
    case 'job_interview':
      return ['free', 'interview', 'custom'];
    case 'debate_partner':
      return ['free', 'debate', 'custom'];
    case 'shadowing_coach':
      return ['free', 'shadowing', 'custom'];
    case 'pronunciation_drill':
      return ['free', 'pronunciation', 'custom'];
    case 'roleplay_scenario':
      return ['free', 'roleplay', 'custom'];
    case 'storytelling':
      return ['free', 'storytelling', 'custom'];
    case 'vocabulary_builder':
      return ['free', 'vocab_drill', 'custom'];
    case 'friendly_chat':
    default:
      return [
        'free',
        'ielts_part1',
        'ielts_part2',
        'ielts_part3',
        'interview',
        'debate',
        'shadowing',
        'pronunciation',
        'roleplay',
        'storytelling',
        'vocab_drill',
        'custom',
      ];
  }
}

export function buildCustomTopic(customPrompt: string): PracticeTopic {
  const trimmed = customPrompt.trim();
  return {
    id: 'custom',
    category: 'custom',
    title: trimmed ? `Custom: ${trimmed.slice(0, 48)}` : 'Custom Topic',
    titleFa: trimmed ? `موضوع دلخواه: ${trimmed.slice(0, 48)}` : 'موضوع دلخواه',
    prompt: trimmed
      ? `Focus the speaking session on this custom topic requested by the learner: "${trimmed}". Ask relevant, engaging questions and guide the conversation around it.`
      : '',
  };
}
