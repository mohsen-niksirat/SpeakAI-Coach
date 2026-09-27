import { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiLiveClient } from '../services/gemini-live-client';
import { AudioRecorder } from '../audio/audio-recorder';
import { AudioPlayer } from '../audio/audio-player';
import { generateSessionReport, heuristicBand } from '../services/session-report';
import {
  CoachRole,
  VoiceName,
  VocabCard,
  FeedbackLog,
  SessionStats,
  TranscriptEntry,
  ConnectionPhase,
  ReportStatus,
  SessionReport,
} from '../types';

const VOCAB_STORAGE_KEY = 'speakai_vocab';

function loadPersistedVocab(): VocabCard[] {
  try {
    const raw = localStorage.getItem(VOCAB_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useGeminiLive() {
  const [phase, setPhase] = useState<ConnectionPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  const [vocabCards, setVocabCards] = useState<VocabCard[]>(loadPersistedVocab);
  const [sessionVocabCount, setSessionVocabCount] = useState(0);
  const [feedbackLogs, setFeedbackLogs] = useState<FeedbackLog[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [reportStatus, setReportStatus] = useState<ReportStatus>('idle');

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const timerRef = useRef<number | null>(null);
  const apiKeyRef = useRef('');
  const sessionActiveRef = useRef(false);
  const secondsRef = useRef(0);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const feedbackLogsRef = useRef<FeedbackLog[]>([]);

  useEffect(() => {
    feedbackLogsRef.current = feedbackLogs;
  }, [feedbackLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(vocabCards));
    } catch {
      // storage may be unavailable (private mode); deck simply won't persist
    }
  }, [vocabCards]);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const teardownRefs = useCallback(() => {
    clearTimer();
    recorderRef.current?.stop();
    playerRef.current?.close();
    clientRef.current?.disconnect();
    recorderRef.current = null;
    playerRef.current = null;
    clientRef.current = null;
  }, []);

  const abortWithError = useCallback(
    (message: string) => {
      sessionActiveRef.current = false;
      teardownRefs();
      setPhase('idle');
      setIsTalking(false);
      setMicVolume(0);
      setAiVolume(0);
      setError(message);
    },
    [teardownRefs],
  );

  const startSession = async (apiKey: string, role: CoachRole, voice: VoiceName) => {
    if (sessionActiveRef.current) return;
    if (!apiKey) {
      setError('Enter your Gemini API Key in Settings first.');
      return;
    }

    setError(null);
    setReport(null);
    setReportStatus('idle');
    setFeedbackLogs([]);
    setTranscript([]);
    transcriptRef.current = [];
    setSessionSeconds(0);
    setSessionVocabCount(0);
    secondsRef.current = 0;
    apiKeyRef.current = apiKey;

    try {
      playerRef.current = new AudioPlayer();
      playerRef.current.onVolumeChange = (vol) => {
        setAiVolume(vol);
        setIsTalking(vol > 0.05);
      };

      const beginCapture = async () => {
        recorderRef.current = new AudioRecorder();
        recorderRef.current.onVolumeChange = (vol) => {
          setMicVolume(vol);
        };
        await recorderRef.current.start((chunk) => {
          clientRef.current?.sendAudioChunk(chunk);
        });
        timerRef.current = window.setInterval(() => {
          secondsRef.current += 1;
          setSessionSeconds(secondsRef.current);
        }, 1000);
      };

      clientRef.current = new GeminiLiveClient({
        onSetupComplete: () => {
          if (!sessionActiveRef.current) return;
          setPhase('connected');
          beginCapture().catch((err) => {
            console.error('Failed to initialize audio devices:', err);
            abortWithError('Could not access the microphone. Check browser permissions.');
          });
        },
        onAudioData: (base64) => {
          playerRef.current?.playChunk(base64);
        },
        onInterrupted: () => {
          playerRef.current?.stopAll();
          setIsTalking(false);
        },
        onTranscript: (speaker, text, finished) => {
          const entries = transcriptRef.current;
          const last = entries[entries.length - 1];
          let next: TranscriptEntry[];
          if (last && last.role === speaker && !last.done) {
            next = [...entries.slice(0, -1), { ...last, text: last.text + text, done: finished }];
          } else {
            next = [...entries, { id: newId(), role: speaker, text, done: finished }];
          }
          transcriptRef.current = next;
          setTranscript(next);
        },
        onVocabDiscovered: (card) => {
          setVocabCards((prev) => [card, ...prev]);
          setSessionVocabCount((n) => n + 1);
        },
        onFeedbackGiven: (feedback) => {
          setFeedbackLogs((prev) => [feedback, ...prev]);
        },
        onError: (err) => {
          if (!sessionActiveRef.current) return;
          abortWithError(err);
        },
        onClose: (code) => {
          if (!sessionActiveRef.current) return;
          abortWithError(
            code === 1000
              ? 'Connection closed by server.'
              : `Connection failed (code ${code}). Check your API key and model availability.`,
          );
        },
      });

      sessionActiveRef.current = true;
      setPhase('connecting');
      clientRef.current.connect(apiKey, role, voice);
    } catch (err) {
      console.error('Failed to start session:', err);
      abortWithError('Could not start the session.');
    }
  };

  const endSession = useCallback(() => {
    if (!sessionActiveRef.current) return;
    sessionActiveRef.current = false;

    teardownRefs();
    setPhase('idle');
    setIsTalking(false);
    setMicVolume(0);
    setAiVolume(0);
    setSessionSeconds(secondsRef.current);

    const seconds = secondsRef.current;
    const entries = transcriptRef.current;
    const corrections = feedbackLogsRef.current;

    if (seconds > 5 && entries.length > 0) {
      const transcriptText = entries
        .map((e) => `${e.role === 'user' ? 'Speaker' : 'Coach'}: ${e.text}`)
        .join('\n');

      setShowSummary(true);
      setReport(null);
      setReportStatus('loading');

      generateSessionReport(apiKeyRef.current, transcriptText, corrections)
        .then((r) => {
          setReport(r);
          setReportStatus('ready');
        })
        .catch((err) => {
          console.error('Session report generation failed:', err);
          setReportStatus('failed');
        });
    }
  }, [teardownRefs]);

  const clearError = useCallback(() => setError(null), []);

  const clearVocab = useCallback(() => setVocabCards([]), []);

  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
      teardownRefs();
    };
  }, [teardownRefs]);

  const stats: SessionStats = {
    durationSeconds: sessionSeconds,
    wordsRecordedCount: sessionVocabCount,
    correctionsCount: feedbackLogs.length,
    estimatedBandScore:
      report?.overallBand ?? heuristicBand(feedbackLogs.length, sessionVocabCount),
  };

  return {
    phase,
    isConnected: phase === 'connected',
    error,
    clearError,
    isTalking,
    micVolume,
    aiVolume,
    vocabCards,
    clearVocab,
    feedbackLogs,
    transcript,
    sessionSeconds,
    stats,
    showSummary,
    setShowSummary,
    report,
    reportStatus,
    startSession,
    endSession,
  };
}
