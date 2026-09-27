import { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiLiveClient } from '../services/gemini-live-client';
import { OpenAIRealtimeClient } from '../services/openai-realtime-client';
import { BrowserChatVoiceClient } from '../services/browser-chat-voice-client';
import { AudioRecorder } from '../audio/audio-recorder';
import { AudioPlayer } from '../audio/audio-player';
import { generateSessionReport, heuristicBand } from '../services/session-report';
import { VoiceClient, VoiceClientCallbacks } from '../services/voice-client';
import { findProvider, activeKey, rotateKey } from '../services/providers';
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
  Provider,
  ProviderSettings,
} from '../types';

const VOCAB_STORAGE_KEY = 'speakai_vocab';
const CONNECT_TIMEOUT_MS = 20000; // includes Gemini's REST preflight (up to 8s)

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

function inputRateFor(provider: Provider): number {
  return provider.kind === 'gemini-live' ? 16000 : 24000;
}

function createVoiceClient(
  provider: Provider,
  apiKey: string,
  role: CoachRole,
  voice: VoiceName,
  callbacks: VoiceClientCallbacks,
): VoiceClient {
  if (provider.kind === 'openai-realtime') {
    return new OpenAIRealtimeClient(callbacks, provider, apiKey, role, voice);
  }
  if (provider.kind === 'openai-chat') {
    return new BrowserChatVoiceClient(callbacks, provider, apiKey, role, voice);
  }
  return new GeminiLiveClient(callbacks, provider, apiKey, role, voice);
}

export function useGeminiLive(settings: ProviderSettings, onSettingsChange: (next: ProviderSettings) => void) {
  const [phase, setPhase] = useState<ConnectionPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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

  const clientRef = useRef<VoiceClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const timerRef = useRef<number | null>(null);
  const connectTimerRef = useRef<number | null>(null);
  const attemptTimerRef = useRef<number | null>(null);
  const sessionActiveRef = useRef(false);
  const captureStartedRef = useRef(false);
  const secondsRef = useRef(0);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const feedbackLogsRef = useRef<FeedbackLog[]>([]);
  const reportProviderRef = useRef<Provider | null>(null);
  const reconnectCountRef = useRef(0);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

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

  const clearConnectTimers = () => {
    if (connectTimerRef.current !== null) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
    if (attemptTimerRef.current !== null) {
      clearTimeout(attemptTimerRef.current);
      attemptTimerRef.current = null;
    }
  };

  const teardownRefs = useCallback(() => {
    clearTimer();
    clearConnectTimers();
    recorderRef.current?.stop();
    playerRef.current?.close();
    clientRef.current?.disconnect();
    recorderRef.current = null;
    playerRef.current = null;
    clientRef.current = null;
    captureStartedRef.current = false;
  }, []);

  const persistProviderKey = useCallback(
    (updated: Provider) => {
      const current = settingsRef.current;
      onSettingsChange({
        ...current,
        providers: current.providers.map((p) => (p.id === updated.id ? updated : p)),
      });
      settingsRef.current = {
        ...current,
        providers: current.providers.map((p) => (p.id === updated.id ? updated : p)),
      };
    },
    [onSettingsChange],
  );

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

  const startSession = async (role: CoachRole, voice: VoiceName) => {
    if (sessionActiveRef.current) return;

    const voiceProvider = findProvider(settingsRef.current, settingsRef.current.voiceProviderId);
    if (!voiceProvider || voiceProvider.keys.length === 0) {
      setError('Add a voice provider with at least one API key in Settings first.');
      return;
    }
    const reportProvider = findProvider(settingsRef.current, settingsRef.current.reportProviderId);

    setError(null);
    setNotice(null);
    setReport(null);
    setReportStatus('idle');
    setFeedbackLogs([]);
    setTranscript([]);
    transcriptRef.current = [];
    setSessionSeconds(0);
    setSessionVocabCount(0);
    secondsRef.current = 0;
    reportProviderRef.current = reportProvider;
    sessionActiveRef.current = true;
    reconnectCountRef.current = 0;

    try {
      playerRef.current = new AudioPlayer();
      playerRef.current.onVolumeChange = (vol) => {
        setAiVolume(vol);
        setIsTalking(vol > 0.05);
      };
    } catch (err) {
      console.error('Failed to create audio player:', err);
      abortWithError('Audio playback is not available in this browser.');
      return;
    }

    const beginCapture = async (provider: Provider) => {
      recorderRef.current = new AudioRecorder();
      recorderRef.current.onVolumeChange = (vol) => {
        setMicVolume(vol);
      };
      await recorderRef.current.start(
        (chunk) => {
          clientRef.current?.sendAudioChunk(chunk);
        },
        inputRateFor(provider),
      );
      timerRef.current = window.setInterval(() => {
        secondsRef.current += 1;
        setSessionSeconds(secondsRef.current);
      }, 1000);
    };

    const startAttempt = (provider: Provider, attemptsSoFar: number) => {
      if (!sessionActiveRef.current) return;

      let ready = false;
      let dead = false;

      const fail = (message: string) => {
        if (dead || !sessionActiveRef.current) return;
        dead = true;
        clearConnectTimers();
        clientRef.current?.disconnect();

        if (!ready) {
          if (attemptsSoFar + 1 < provider.keys.length) {
            const next = rotateKey(provider);
            persistProviderKey(next);
            attemptTimerRef.current = window.setTimeout(() => startAttempt(next, attemptsSoFar + 1), 250);
          } else {
            const suffix = provider.keys.length > 1 ? ` (tried all ${provider.keys.length} keys)` : '';
            abortWithError(`${message}${suffix}`);
          }
          return;
        }

        // mid-session connection loss: bounded auto-reconnect with key rotation
        if (reconnectCountRef.current < provider.keys.length) {
          reconnectCountRef.current += 1;
          const next = rotateKey(provider);
          persistProviderKey(next);
          setPhase('connecting');
          attemptTimerRef.current = window.setTimeout(() => startAttempt(next, attemptsSoFar + 1), 400);
        } else {
          abortWithError(`Connection lost: ${message}. Restart the session to try another key.`);
        }
      };

      const callbacks: VoiceClientCallbacks = {
        onSetupComplete: () => {
          if (dead || !sessionActiveRef.current) return;
          ready = true;
          if (connectTimerRef.current !== null) {
            clearTimeout(connectTimerRef.current);
            connectTimerRef.current = null;
          }
          setPhase('connected');
          if (!captureStartedRef.current) {
            captureStartedRef.current = true;
            beginCapture(provider).catch((err) => {
              console.error('Failed to initialize audio devices:', err);
              abortWithError('Could not access the microphone. Check browser permissions.');
            });
          }
        },
        onAudioData: (base64) => {
          playerRef.current?.playChunk(base64);
        },
        onInterrupted: () => {
          playerRef.current?.stopAll();
          setIsTalking(false);
        },
        onTalkingChange: (talking) => {
          setIsTalking(talking);
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
          fail(err);
        },
        onClose: (code, reason) => {
          fail(
            code === 1000 || code === 1005
              ? 'Connection closed by server.'
              : `Connection failed (code ${code}${reason ? `: ${reason.slice(0, 200)}` : ''}). Check your API key and base URL.`,
          );
        },
        onNotice: (message) => {
          setNotice(message);
        },
      };

      setPhase('connecting');
      clientRef.current = createVoiceClient(provider, activeKey(provider), role, voice, callbacks);
      clientRef.current.connect();

      connectTimerRef.current = window.setTimeout(() => {
        fail('Connection timed out.');
      }, CONNECT_TIMEOUT_MS);
    };

    startAttempt(voiceProvider, 0);
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
    const reportProvider = reportProviderRef.current;

    if (seconds > 5 && entries.length > 0) {
      const transcriptText = entries
        .map((e) => `${e.role === 'user' ? 'Speaker' : 'Coach'}: ${e.text}`)
        .join('\n');

      setShowSummary(true);

      if (!reportProvider) {
        setReport(null);
        setReportStatus('failed');
        return;
      }

      setReport(null);
      setReportStatus('loading');

      generateSessionReport(reportProvider, transcriptText, corrections)
        .then((result) => {
          setReport(result.report);
          setReportStatus('ready');
          if (result.usedKeyIndex !== reportProvider.keyIndex) {
            persistProviderKey({ ...reportProvider, keyIndex: result.usedKeyIndex });
          }
        })
        .catch((err) => {
          console.error('Session report generation failed:', err);
          setReportStatus('failed');
        });
    }
  }, [teardownRefs, persistProviderKey]);

  const clearError = useCallback(() => setError(null), []);

  const clearNotice = useCallback(() => setNotice(null), []);

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
    notice,
    clearNotice,
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
