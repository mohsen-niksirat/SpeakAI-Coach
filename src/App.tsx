import { useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { VisualizerOrb } from './components/VisualizerOrb';
import { LiveFeedbackPanel } from './components/LiveFeedbackPanel';
import { VocabCardList } from './components/VocabCardList';
import { TranscriptPanel } from './components/TranscriptPanel';
import { SettingsModal } from './components/SettingsModal';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { CoachRole, VoiceName } from './types';
import { Mic, PhoneOff, Settings, Sparkles, Loader2, AlertTriangle } from 'lucide-react';

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [role, setRole] = useState<CoachRole>('ielts_examiner');
  const [voice, setVoice] = useState<VoiceName>('Aoede');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const {
    phase,
    isConnected,
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
  } = useGeminiLive();

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    clearError();
  };

  const minutes = String(Math.floor(sessionSeconds / 60)).padStart(2, '0');
  const seconds = String(sessionSeconds % 60).padStart(2, '0');
  const showTranscript = isConnected || transcript.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">SpeakAI Coach</h1>
            <p className="text-[11px] text-slate-400 capitalize">
              Role: {role.replace('_', ' ')} • Voice: {voice}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {minutes}:{seconds}
            </div>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-xl bg-surface border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center gap-6 my-6">
        <div className="w-full flex flex-col lg:flex-row items-center justify-around gap-8">
          <div className="w-full lg:w-1/3 order-2 lg:order-1 h-64 lg:h-96">
            <LiveFeedbackPanel logs={feedbackLogs} />
          </div>

          <div className="flex flex-col items-center justify-center order-1 lg:order-2">
            <VisualizerOrb
              isConnected={isConnected}
              isAiTalking={isTalking}
              aiVolume={aiVolume}
              micVolume={micVolume}
            />

            <div className="mt-4 flex items-center gap-4">
              {!isConnected && phase !== 'connecting' ? (
                <button
                  onClick={() => startSession(apiKey, role, voice)}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition hover:scale-105 active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                  Start Voice Practice
                </button>
              ) : phase === 'connecting' ? (
                <button
                  disabled
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600/50 text-white/70 font-semibold text-sm shadow-xl cursor-wait"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting…
                </button>
              ) : (
                <button
                  onClick={endSession}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-xl shadow-rose-600/30 transition hover:scale-105 active:scale-95"
                >
                  <PhoneOff className="w-4 h-4" />
                  End Call & View Report
                </button>
              )}
            </div>

            {error && (
              <button
                onClick={clearError}
                className="mt-3 flex items-center gap-2 text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg hover:bg-rose-500/20 transition max-w-md text-left"
                title="Click to dismiss"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </button>
            )}

            <p className="text-[11px] text-slate-500 mt-3 text-center">
              {isConnected
                ? 'Interrupt freely anytime — SpeakAI automatically yields.'
                : 'Low latency • Powered by Gemini Live WebSocket'}
            </p>
          </div>

          <div className="w-full lg:w-1/3 order-3 h-64 lg:h-96">
            <VocabCardList cards={vocabCards} onClear={clearVocab} />
          </div>
        </div>

        {showTranscript && (
          <div className="w-full">
            <TranscriptPanel entries={transcript} />
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-slate-600 pt-4 border-t border-slate-800/80">
        SpeakAI Coach • Client-First Architecture • Ready for Telegram Mini Apps
      </footer>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        role={role}
        onSelectRole={setRole}
        voice={voice}
        onSelectVoice={setVoice}
      />

      <SessionSummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        stats={stats}
        report={report}
        reportStatus={reportStatus}
      />
    </div>
  );
}
