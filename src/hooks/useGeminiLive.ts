import { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiLiveClient } from '../services/gemini-live-client';
import { OpenAIRealtimeClient } from '../services/openai-realtime-client';
import { BrowserChatVoiceClient } from '../services/browser-chat-voice-client';
import { AudioRecorder } from '../audio/audio-recorder';
import { AudioPlayer } from '../audio/audio-player';
import { generateSessionReport, heuristicBand } from '../services/session-report';
import { VoiceClient, VoiceClientCallbacks } from '../services/voice-client';
import { findProvider, activeKey, rotateKey } from '../services/providers';
import { t } from '../i18n/store';
import { ProviderError, ProviderErrorKind, isRotatable, shouldRotateOnReconnect } from '../services/errors';
import { mergeTranscript } from '../utils/transcript';
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
  SessionHistoryEntry,
  Provider,
  ProviderSettings,
} from '../types';

const VOCAB_STORAGE_KEY = 'speakai_vocab';
const HISTORY_STORAGE_KEY = 'speakai_history';
const MAX_HISTORY_ITEMS = 50;
const CONNECT_TIMEOUT_MS = 25000; // safety net: includes Gemini's REST preflight and model fallback hops

function loadPersistedVocab(): VocabCard[] {
  try {
    const raw = localStorage.getItem(VOCAB_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadPersistedHistory(): SessionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildFallbackReport(band: number): SessionReport {
  return {
    overallBand: band,
    criteria: [
      { key: 'fluency', label: 'Fluency & Coherence', band, comment: 'Estimated from session duration and turns.' },
      { key: 'lexical', label: 'Lexical Resource', band, comment: 'Estimated from captured vocabulary.' },
      { key: 'grammar', label: 'Grammatical Range & Accuracy', band, comment: 'Estimated from logged corrections.' },
      { key: 'pronunciation', label: 'Pronunciation', band, comment: 'Heuristic estimate from transcript.' },
    ],
    strengths: ['Completed a live English speaking practice session.'],
    improvements: ['Configure a Report Provider in Settings for full AI criterion feedback.'],
  };
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
  topicPrompt?: string,
): VoiceClient {
  if (provider.kind === 'openai-realtime') {
    return new OpenAIRealtimeClient(callbacks, provider, apiKey, role, voice, topicPrompt);
  }
  if (provider.kind === 'openai-chat') {
    return new BrowserChatVoiceClient(callbacks, provider, apiKey, role, voice, topicPrompt);
  }
  return new GeminiLiveClient(callbacks, provider, apiKey, role, voice, topicPrompt);
}

export function useGeminiLive(settings: ProviderSettings, onSettingsChange: (next: ProviderSettings) => void) {
  const [phase, setPhase] = useState<ConnectionPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  const [vocabCards, setVocabCards] = useState<VocabCard[]>(loadPersistedVocab);
  const [historyEntries, setHistoryEntries] = useState<SessionHistoryEntry[]>(loadPersistedHistory);
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
  const sessionVocabCountRef = useRef(0);
  const activeRoleRef = useRef<CoachRole>('ielts_examiner');
  const activeTopicTitleRef = useRef<string | undefined>(undefined);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const feedbackLogsRef = useRef<FeedbackLog[]>([]);
  const reportProviderRef = useRef<Provider | null>(null);
  const reconnectCountRef = useRef(0);
  const sessionSeqRef = useRef(0);
  const attemptSeqRef = useRef(0);
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

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyEntries));
    } catch {
      // ignore storage errors
    }
  }, [historyEntries]);

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
      setIsMuted(false);
      setMicVolume(0);
      setAiVolume(0);
      setError(message);
    },
    [teardownRefs],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      recorderRef.current?.setMuted(next);
      clientRef.current?.setMuted?.(next);
      if (next) setMicVolume(0);
      return next;
    });
  }, []);

  const startSession = async (role: CoachRole, voice: VoiceName, topicPrompt?: string, topicTitle?: string) => {
    if (sessionActiveRef.current) return;

    const voiceProvider = findProvider(settingsRef.current, settingsRef.current.voiceProviderId);
    if (!voiceProvider || voiceProvider.keys.length === 0) {
      setError(t('err.noVoiceProvider'));
      return;
    }
    const reportProvider = findProvider(settingsRef.current, settingsRef.current.reportProviderId);

    setError(null);
    setNotice(null);
    setReport(null);
    setReportStatus('idle');
    setIsMuted(false);
    setFeedbackLogs([]);
    setTranscript([]);
    transcriptRef.current = [];
    setSessionSeconds(0);
    setSessionVocabCount(0);
    sessionVocabCountRef.current = 0;
    secondsRef.current = 0;
    activeRoleRef.current = role;
    activeTopicTitleRef.current = topicTitle;
    reportProviderRef.current = reportProvider;
    sessionActiveRef.current = true;
    reconnectCountRef.current = 0;
    sessionSeqRef.current += 1;
    attemptSeqRef.current += 1;

    try {
      playerRef.current = new AudioPlayer();
      playerRef.current.onVolumeChange = (vol) => {
        setAiVolume(vol);
        setIsTalking(vol > 0.05);
      };
    } catch (err) {
      console.error('Failed to create audio player:', err);
      abortWithError(t('err.audioPlayer'));
      return;
    }

    const beginCapture = async (provider: Provider) => {
      // BrowserChatVoiceClient uses SpeechRecognition directly; avoid opening a second getUserMedia stream
      if (provider.kind !== 'openai-chat') {
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
      }
      timerRef.current = window.setInterval(() => {
        secondsRef.current += 1;
        setSessionSeconds(secondsRef.current);
      }, 1000);
    };

    const startAttempt = (provider: Provider, attemptsSoFar: number) => {
      if (!sessionActiveRef.current) return;

      const attemptId = ++attemptSeqRef.current;
      const stale = () => attemptId !== attemptSeqRef.current || !sessionActiveRef.current;

      let ready = false;
      let dead = false;

      const fail = (messageOrErr: string | ProviderError) => {
        if (dead || stale()) return;
        dead = true;
        clearConnectTimers();
        clientRef.current?.disconnect();

        const err = typeof messageOrErr === 'string' ? null : messageOrErr;
        const kind: ProviderErrorKind = err?.kind ?? 'unknown';
        const message = err?.message ?? String(messageOrErr);

        if (!ready) {
          if (isRotatable(kind) && attemptsSoFar + 1 < provider.keys.length) {
            const next = rotateKey(provider);
            persistProviderKey(next);
            attemptTimerRef.current = window.setTimeout(() => startAttempt(next, attemptsSoFar + 1), 250);
          } else if (
            provider.kind === 'gemini-live' &&
            kind === 'network' &&
            !/cannot reach|نمی‌توان به/i.test(message) &&
            typeof window !== 'undefined' &&
            ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
          ) {
            const hybridFallback: Provider = {
              ...provider,
              kind: 'openai-chat',
              baseUrl: 'https://generativelanguage.googleapis.com',
              model: provider.reportModel || 'gemini-2.5-flash',
            };
            setNotice(
              'WebSocket جمینای توسط اینترنت/VPN محدود شد — سوییچ خودکار به حالت مکالمه صوتی هیبرید جمینای انجام شد.',
            );
            attemptTimerRef.current = window.setTimeout(() => startAttempt(hybridFallback, 0), 200);
          } else {
            if (/User location is not supported|cannot reach|نمی‌توان به/i.test(message)) {
              const altProvider = settingsRef.current.providers.find(
                (p) =>
                  p.id !== provider.id &&
                  p.kind !== 'gemini-live' &&
                  !/generativelanguage\.googleapis\.com/i.test(p.baseUrl) &&
                  p.keys.length > 0,
              );
              if (altProvider) {
                setNotice(
                  `سرور جمینای روی این فیلترشکن مسدود است (User location is not supported) — سوییچ خودکار به «${altProvider.name}» انجام شد.`,
                );
                attemptTimerRef.current = window.setTimeout(() => startAttempt(altProvider, 0), 200);
                return;
              }
            }
            const suffix =
              isRotatable(kind) && provider.keys.length > 1 && attemptsSoFar + 1 >= provider.keys.length
                ? t('err.triedAll', { n: provider.keys.length })
                : '';
            abortWithError(`${message}${suffix}`);
          }
          return;
        }

        // Mid-session loss: bounded reconnect. Network drops keep the same
        // key (the failure said nothing about the key); key-class errors rotate.
        const rotated = shouldRotateOnReconnect(kind);
        const budget = Math.max(1, provider.keys.length);
        const networkBudget = 1;
        const withinBudget = rotated
          ? reconnectCountRef.current < budget
          : reconnectCountRef.current < networkBudget;

        if (withinBudget) {
          reconnectCountRef.current += 1;
          const next = rotated ? rotateKey(provider) : provider;
          if (rotated) persistProviderKey(next);
          setPhase('connecting');
          attemptTimerRef.current = window.setTimeout(
            () => startAttempt(next, attemptsSoFar + (rotated ? 1 : 0)),
            rotated ? 400 : 600,
          );
        } else {
          abortWithError(t('err.connLost', { msg: message }));
        }
      };

      const callbacks: VoiceClientCallbacks = {
        onSetupComplete: () => {
          if (dead || stale()) return;
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
              abortWithError(t('err.mic'));
            });
          }
        },
        onAudioData: (base64) => {
          if (stale()) return;
          playerRef.current?.playChunk(base64);
        },
        onInterrupted: () => {
          if (stale()) return;
          playerRef.current?.stopAll();
          setIsTalking(false);
        },
        onTalkingChange: (talking) => {
          if (stale()) return;
          setIsTalking(talking);
        },
        onTranscript: (speaker, text, finished) => {
          if (stale()) return;
          const next = mergeTranscript(transcriptRef.current, speaker, text, finished);
          transcriptRef.current = next;
          setTranscript(next);
        },
        onVocabDiscovered: (card) => {
          if (stale()) return;
          const cleanWord = card.word.trim().toLowerCase();
          if (!cleanWord) return;
          setVocabCards((prev) => {
            if (prev.some((c) => c.word.trim().toLowerCase() === cleanWord)) return prev;
            return [card, ...prev];
          });
          sessionVocabCountRef.current += 1;
          setSessionVocabCount((n) => n + 1);
        },
        onFeedbackGiven: (feedback) => {
          if (stale()) return;
          setFeedbackLogs((prev) => [feedback, ...prev]);
        },
        onError: (err) => {
          fail(typeof err === 'string' ? new ProviderError('unknown', err) : err);
        },
        onClose: (code, reason, kind) => {
          fail(
            new ProviderError(
              kind ?? 'unknown',
              code === 1000 || code === 1005
                ? t('err.connClosed')
                : t('err.connFailed', { code, reason: reason ? `: ${reason.slice(0, 200)}` : '' }),
            ),
          );
        },
        onNotice: (message) => {
          if (stale()) return;
          setNotice(message);
        },
      };

      setPhase('connecting');
      clientRef.current = createVoiceClient(provider, activeKey(provider), role, voice, callbacks, topicPrompt);
      clientRef.current.connect();

      if (!dead) {
        connectTimerRef.current = window.setTimeout(() => {
          fail(new ProviderError('network', t('err.connTimeout')));
        }, CONNECT_TIMEOUT_MS);
      }
    };

    startAttempt(voiceProvider, 0);
  };

  const recordHistoryItem = useCallback(
    (
      durationSeconds: number,
      wordsRecordedCount: number,
      correctionsCount: number,
      reportObj: SessionReport,
      status: 'ready' | 'failed',
    ) => {
      const entry: SessionHistoryEntry = {
        id: Math.random().toString(36).slice(2, 10),
        dateIso: new Date().toISOString(),
        role: activeRoleRef.current,
        topicTitle: activeTopicTitleRef.current,
        durationSeconds,
        wordsRecordedCount,
        correctionsCount,
        overallBand: reportObj.overallBand,
        reportStatus: status,
        report: reportObj,
      };
      setHistoryEntries((prev) => [entry, ...prev].slice(0, MAX_HISTORY_ITEMS));
    },
    [],
  );

  const endSession = useCallback(() => {
    if (!sessionActiveRef.current) return;
    sessionActiveRef.current = false;
    attemptSeqRef.current += 1; // invalidate any in-flight client callbacks

    teardownRefs();
    setPhase('idle');
    setIsTalking(false);
    setIsMuted(false);
    setMicVolume(0);
    setAiVolume(0);
    setSessionSeconds(secondsRef.current);

    const seconds = secondsRef.current;
    const vocabCount = sessionVocabCountRef.current;
    const entries = transcriptRef.current;
    const corrections = feedbackLogsRef.current;
    const reportProvider = reportProviderRef.current;

    if (seconds > 5 && entries.length > 0) {
      const transcriptText = entries
        .map((e) => `${e.role === 'user' ? 'Speaker' : 'Coach'}: ${e.text}`)
        .join('\n');

      setShowSummary(true);
      const fallbackBand = Math.round(heuristicBand(corrections.length, vocabCount) * 2) / 2;

      if (!reportProvider) {
        setReport(null);
        setReportStatus('failed');
        recordHistoryItem(seconds, vocabCount, corrections.length, buildFallbackReport(fallbackBand), 'failed');
        return;
      }

      setReport(null);
      setReportStatus('loading');

      const reportSessionSeq = sessionSeqRef.current;
      generateSessionReport(reportProvider, transcriptText, corrections)
        .then((result) => {
          if (reportSessionSeq !== sessionSeqRef.current) return; // a new session owns the UI now
          setReport(result.report);
          setReportStatus('ready');
          recordHistoryItem(seconds, vocabCount, corrections.length, result.report, 'ready');
          if (result.usedKeyIndex !== reportProvider.keyIndex) {
            persistProviderKey({ ...reportProvider, keyIndex: result.usedKeyIndex });
          }
        })
        .catch((err) => {
          if (reportSessionSeq !== sessionSeqRef.current) return;
          console.error('Session report generation failed:', err);
          setReportStatus('failed');
          recordHistoryItem(seconds, vocabCount, corrections.length, buildFallbackReport(fallbackBand), 'failed');
        });
    }
  }, [teardownRefs, persistProviderKey, recordHistoryItem]);

  const clearError = useCallback(() => setError(null), []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const clearVocab = useCallback(() => setVocabCards([]), []);

  const deleteVocabCard = useCallback((id: string) => {
    setVocabCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearHistory = useCallback(() => setHistoryEntries([]), []);

  const openHistoricalReport = useCallback((entry: SessionHistoryEntry) => {
    setSessionSeconds(entry.durationSeconds);
    setSessionVocabCount(entry.wordsRecordedCount);
    setFeedbackLogs(Array.from({ length: entry.correctionsCount }, (_, i) => ({
      id: `hist_${i}`,
      userSpoke: '',
      betterAlternative: '',
      explanation: '',
      type: 'grammar',
      timestamp: '',
    })));
    setReport(entry.reportStatus === 'ready' ? entry.report : null);
    setReportStatus(entry.reportStatus);
    setShowSummary(true);
  }, []);

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
    isMuted,
    toggleMute,
    micVolume,
    aiVolume,
    vocabCards,
    clearVocab,
    deleteVocabCard,
    historyEntries,
    clearHistory,
    openHistoricalReport,
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
