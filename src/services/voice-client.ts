import { CoachRole, VocabCard, FeedbackLog, TranscriptRole } from '../types';

export interface VoiceClientCallbacks {
  onSetupComplete: () => void;
  onAudioData: (base64Pcm24k: string) => void;
  onInterrupted: () => void;
  onTalkingChange?: (talking: boolean) => void;
  onTranscript: (role: TranscriptRole, text: string, finished: boolean) => void;
  onVocabDiscovered: (card: VocabCard) => void;
  onFeedbackGiven: (feedback: FeedbackLog) => void;
  onError: (err: string) => void;
  onClose: (code: number) => void;
}

export interface VoiceClient {
  connect(): void;
  sendAudioChunk(base64Pcm: string): void;
  disconnect(): void;
}

export function getRolePrompt(role: CoachRole): string {
  switch (role) {
    case 'ielts_examiner':
      return `You are a certified, friendly yet rigorous IELTS Speaking Examiner.
Conduct a realistic IELTS Speaking interview (Part 1, Part 2, or Part 3).
Speak naturally, ask one question at a time, and do not make speech turns too long.
Keep the conversation engaging. Silently invoke 'record_vocabulary' when using or observing high-band words,
and 'flag_grammar_mistake' whenever the candidate makes a grammatical or collocation error.`;
    case 'job_interview':
      return `You are an experienced HR and Technical Interviewer at an international tech company.
Conduct a professional English behavioral and technical interview. Keep questions focused and realistic.
Record new vocabulary and grammar flaws silently via tools.`;
    case 'debate_partner':
      return `You are an articulate, respectful debate sparring partner.
Choose or discuss controversial yet friendly topics, challenge the user's opinions constructively,
and prompt them to defend their thoughts with high-level vocabulary.`;
    case 'friendly_chat':
    default:
      return `You are a kind, engaging native English friend named Alex.
Have a warm, everyday conversation about hobbies, culture, daily life, or technology.
Keep sentences natural, concise, and encourage the user to speak more.`;
  }
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
