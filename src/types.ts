export type CoachRole =
  | 'ielts_examiner'
  | 'friendly_chat'
  | 'job_interview'
  | 'debate_partner'
  | 'shadowing_coach'
  | 'pronunciation_drill'
  | 'roleplay_scenario'
  | 'storytelling'
  | 'vocabulary_builder';
export type VoiceName = string;

export type ProviderKind = 'gemini-live' | 'openai-realtime' | 'openai-chat';

export interface Provider {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  reportModel?: string;
  keys: string[];
  keyIndex: number;
}

export interface ProviderSettings {
  providers: Provider[];
  voiceProviderId: string | null;
  reportProviderId: string | null;
}

export type ConnectionPhase = 'idle' | 'connecting' | 'connected';
export type ReportStatus = 'idle' | 'loading' | 'ready' | 'failed';

export interface VocabCard {
  id: string;
  word: string;
  phonetic?: string;
  definition: string;
  contextSentence: string;
  timestamp: string;
}

export interface FeedbackLog {
  id: string;
  userSpoke: string;
  betterAlternative: string;
  explanation: string;
  type: 'grammar' | 'vocabulary' | 'pronunciation';
  timestamp: string;
}

export type TranscriptRole = 'user' | 'model';

export interface TranscriptEntry {
  id: string;
  role: TranscriptRole;
  text: string;
  done: boolean;
}

export interface CriterionScore {
  key: 'fluency' | 'lexical' | 'grammar' | 'pronunciation';
  label: string;
  band: number;
  comment: string;
}

export interface SessionReport {
  overallBand: number;
  criteria: CriterionScore[];
  strengths: string[];
  improvements: string[];
}

export interface SessionStats {
  durationSeconds: number;
  wordsRecordedCount: number;
  correctionsCount: number;
  estimatedBandScore: number;
}

export type TopicCategory =
  | 'free'
  | 'ielts_part1'
  | 'ielts_part2'
  | 'ielts_part3'
  | 'interview'
  | 'debate'
  | 'shadowing'
  | 'pronunciation'
  | 'roleplay'
  | 'storytelling'
  | 'vocab_drill'
  | 'custom';

export interface PracticeTopic {
  id: string;
  category: TopicCategory;
  title: string;
  titleFa: string;
  prompt: string;
  cueBullets?: string[];
  prepSeconds?: number;
  speakSeconds?: number;
}

export interface SessionHistoryEntry {
  id: string;
  dateIso: string;
  role: CoachRole;
  topicTitle?: string;
  durationSeconds: number;
  wordsRecordedCount: number;
  correctionsCount: number;
  overallBand: number;
  reportStatus: 'ready' | 'failed';
  report: SessionReport;
  transcript?: TranscriptEntry[];
  feedbackLogs?: FeedbackLog[];
  vocabCards?: VocabCard[];
}

