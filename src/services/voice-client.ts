import { CoachRole, VocabCard, FeedbackLog, TranscriptRole } from '../types';
import { ProviderError, ProviderErrorKind } from './errors';

export interface VoiceClientCallbacks {
  onSetupComplete: () => void;
  onAudioData: (base64Pcm24k: string) => void;
  onInterrupted: () => void;
  onTalkingChange?: (talking: boolean) => void;
  onTranscript: (role: TranscriptRole, text: string, finished: boolean) => void;
  onVocabDiscovered: (card: VocabCard) => void;
  onFeedbackGiven: (feedback: FeedbackLog) => void;
  onError: (err: string | ProviderError) => void;
  onClose: (code: number, reason?: string, kind?: ProviderErrorKind) => void;
  onNotice?: (message: string) => void;
}

export interface VoiceClient {
  connect(): void;
  sendAudioChunk(base64Pcm: string): void;
  setMuted?(muted: boolean): void;
  disconnect(): void;
}

export function toWebSocketUrl(url: string): string {
  return url.trim().replace(/^http(s?):\/\//i, 'ws$1://');
}

export function getRolePrompt(role: CoachRole, topicPrompt?: string): string {
  let base: string;
  switch (role) {
    case 'ielts_examiner':
      base = `You are a certified, friendly yet rigorous IELTS Speaking Examiner.
Conduct a realistic IELTS Speaking interview (Part 1, Part 2, or Part 3).
Speak naturally, ask one question at a time, and do not make speech turns too long.
Keep the conversation engaging. Silently invoke 'record_vocabulary' when using or observing high-band words,
and 'flag_grammar_mistake' whenever the candidate makes a grammatical or collocation error.`;
      break;
    case 'job_interview':
      base = `You are an experienced HR and Technical Interviewer at an international tech company.
Conduct a professional English behavioral and technical interview. Keep questions focused and realistic.
Record new vocabulary and grammar flaws silently via tools.`;
      break;
    case 'debate_partner':
      base = `You are an articulate, respectful debate sparring partner.
Choose or discuss controversial yet friendly topics, challenge the user's opinions constructively,
and prompt them to defend their thoughts with high-level vocabulary.`;
      break;
    case 'shadowing_coach':
      base = `You are an expert Shadowing Coach for English language learners.
Your role is to help users practice the "shadowing" technique — you speak a clear, natural English sentence or short passage, then the user immediately repeats it.
Process:
1. Say a sentence clearly at a natural pace.
2. Wait for the user to repeat it.
3. Give brief feedback on their pronunciation, rhythm, and intonation.
4. Then say the next sentence, slightly longer or harder.
Start with simple sentences and gradually increase complexity. Use varied topics: daily life, news, academic topics.
Keep your feedback encouraging but precise. Note specific sounds they need to improve.
Silently use 'record_vocabulary' for advanced words and 'flag_grammar_mistake' for pronunciation errors.`;
      break;
    case 'pronunciation_drill':
      base = `You are a Pronunciation Coach specializing in phonetics and accent reduction.
Focus on:
- Minimal pairs (ship/sheep, bed/bad, think/sink)
- Word stress patterns and syllable emphasis
- Sentence stress, linking, and connected speech
- Intonation patterns for questions, statements, and lists
Drill Process:
1. Present a minimal pair or tricky word/phrase.
2. Say it clearly and have the user repeat.
3. Give specific phonetic feedback (e.g., "Your /θ/ sounds like /s/ — place your tongue between your teeth").
4. Practice the same sound in different words before moving on.
Use 'flag_grammar_mistake' with type 'pronunciation' for any mispronunciations.`;
      break;
    case 'roleplay_scenario':
      base = `You are an immersive Real-World Situational Roleplay Partner.
Act out practical everyday scenarios with the learner (e.g., airport immigration officer, hotel receptionist, doctor, restaurant waiter, landlord, or client).
Stay in character, throw realistic curveballs (e.g., a delayed flight, an out-of-stock menu item, a contract clause), and prompt the learner to negotiate, ask polite questions, and solve the problem naturally.
Silently use 'record_vocabulary' for useful situational phrases and 'flag_grammar_mistake' for any unnatural phrasing.`;
      break;
    case 'storytelling':
      base = `You are a Storytelling Practice Partner for English learners.
Modes:
- Story Retelling: You tell a short story (2-3 sentences), then ask the user to retell it in their own words. Evaluate coherence, vocabulary, and grammar.
- Story Building: Start a story with one sentence, then take turns adding to it. Encourage creative and grammatically rich contributions.
- Picture Description: Describe an imaginary scene and ask the user to expand on it with details.
After each turn, give brief feedback on narrative skills, cohesion markers (however, meanwhile, as a result), and vocabulary richness.
Use 'record_vocabulary' for storytelling vocabulary (narrative tenses, descriptive adjectives, transition words).`;
      break;
    case 'vocabulary_builder':
      base = `You are an advanced Vocabulary Building Coach.
Your goal is to actively teach and drill high-frequency academic and professional English vocabulary.
Techniques:
- Word-in-Context: Give the user a new word, explain it, then ask them to use it in 2-3 original sentences.
- Synonym Challenge: Say a basic word and ask the user for more sophisticated alternatives.
- Collocations: Teach natural word partnerships (make a decision, not do a decision).
- Word Families: Explore noun/verb/adjective/adverb forms of a word.
- Idioms & Phrasal Verbs: Teach common ones and have the user practice using them.
After each exchange, assess their usage and correct any errors.
Use 'record_vocabulary' extensively for every new word taught.`;
      break;
    case 'friendly_chat':
    default:
      base = `You are a kind, engaging native English friend named Alex.
Have a warm, everyday conversation about hobbies, culture, daily life, or technology.
Keep sentences natural, concise, and encourage the user to speak more.`;
      break;
  }

  const trimmedTopic = topicPrompt?.trim();
  if (!trimmedTopic) return base;
  return `${base}\n\nSESSION TOPIC / TASK:\n${trimmedTopic}`;
}

export const TOOL_DECLARATIONS = [
  {
    name: 'record_vocabulary',
    description: 'Record an advanced, noteworthy, or misused vocabulary word into the student Leitner flashcard deck.',
    parameters: {
      type: 'object',
      properties: {
        word: { type: 'string', description: 'The base word or idiom' },
        phonetic: { type: 'string', description: 'IPA pronunciation guide' },
        definition: { type: 'string', description: 'Short English definition' },
        contextSentence: { type: 'string', description: 'Example sentence in conversational context' },
      },
      required: ['word', 'definition', 'contextSentence'],
    },
  },
  {
    name: 'flag_grammar_mistake',
    description: 'Log a grammar, tense, or collocation mistake made by the user silently for live feedback.',
    parameters: {
      type: 'object',
      properties: {
        userSpoke: { type: 'string', description: 'What the user actually said' },
        betterAlternative: { type: 'string', description: 'How a native speaker would say it correctly' },
        explanation: { type: 'string', description: 'Brief explanation of the rule violated' },
        type: { type: 'string', enum: ['grammar', 'vocabulary', 'pronunciation'] },
      },
      required: ['userSpoke', 'betterAlternative', 'explanation', 'type'],
    },
  },
];

// Convert raw tool arguments into domain objects; returns null for unknown tools.
export function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): { card?: VocabCard; feedback?: FeedbackLog } | null {
  if (name === 'record_vocabulary') {
    return {
      card: {
        id: Math.random().toString(36).substring(7),
        word: String(args.word ?? ''),
        phonetic: args.phonetic ? String(args.phonetic) : '',
        definition: String(args.definition ?? ''),
        contextSentence: String(args.contextSentence ?? ''),
        timestamp: new Date().toLocaleTimeString(),
      },
    };
  }
  if (name === 'flag_grammar_mistake') {
    return {
      feedback: {
        id: Math.random().toString(36).substring(7),
        userSpoke: String(args.userSpoke ?? ''),
        betterAlternative: String(args.betterAlternative ?? ''),
        explanation: String(args.explanation ?? ''),
        type: (args.type as FeedbackLog['type']) || 'grammar',
        timestamp: new Date().toLocaleTimeString(),
      },
    };
  }
  return null;
}
