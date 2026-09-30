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
];

export function getSuggestedCategoriesForRole(role: CoachRole): TopicCategory[] {
  switch (role) {
    case 'ielts_examiner':
      return ['free', 'ielts_part1', 'ielts_part2', 'ielts_part3', 'custom'];
    case 'job_interview':
      return ['free', 'interview', 'custom'];
    case 'debate_partner':
      return ['free', 'debate', 'custom'];
    case 'friendly_chat':
    default:
      return ['free', 'ielts_part1', 'ielts_part2', 'ielts_part3', 'interview', 'debate', 'custom'];
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
