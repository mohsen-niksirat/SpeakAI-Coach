import { useEffect, useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { VisualizerOrb } from './components/VisualizerOrb';
import { LiveFeedbackPanel } from './components/LiveFeedbackPanel';
import { VocabCardList } from './components/VocabCardList';
import { TranscriptPanel } from './components/TranscriptPanel';
import { SettingsModal } from './components/SettingsModal';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { CueCardWidget } from './components/CueCardWidget';
import { HistoryModal } from './components/HistoryModal';
import { CoachRole, ProviderSettings } from './types';
import { loadProviderSettings, saveProviderSettings } from './services/providers';
import { PRACTICE_TOPICS, buildCustomTopic, getSuggestedCategoriesForRole } from './services/topics';
import { useT, useLang } from './i18n/store';
import {
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  Sparkles,
  Loader2,
  AlertTriangle,
  Info,
  Globe,
  History,
  BookOpen,
} from 'lucide-react';

const PREFS_STORAGE_KEY = 'speakai_prefs';

function loadPrefs(): { role: CoachRole; voice: string; topicId: string; customTopic: string } {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      role: parsed.role || 'ielts_examiner',
      voice: parsed.voice || 'Aoede',
      topicId: parsed.topicId || 'free',
      customTopic: parsed.customTopic || '',
    };
  } catch {
    return { role: 'ielts_examiner', voice: 'Aoede', topicId: 'free', customTopic: '' };
  }
}

export default function App() {
  const t = useT();
  const [lang, setLangState] = useLang();
  const [settings, setSettings] = useState<ProviderSettings>(loadProviderSettings);
  const initialPrefs = loadPrefs();
  const [role, setRole] = useState<CoachRole>(initialPrefs.role);
  const [voice, setVoice] = useState(initialPrefs.voice);
  const [topicId, setTopicId] = useState<string>(initialPrefs.topicId);
  const [customTopicText, setCustomTopicText] = useState<string>(initialPrefs.customTopic);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({ role, voice, topicId, customTopic: customTopicText }),
      );
    } catch {
      // ignore storage errors
    }
  }, [role, voice, topicId, customTopicText]);

  const updateSettings = (next: ProviderSettings) => {
    setSettings(next);
    saveProviderSettings(next);
  };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'LEITNER_SYNC_PROVIDERS') {
        setSettings(loadProviderSettings());
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const {
    phase,
    isConnected,
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
  } = useGeminiLive(settings, updateSettings);

  useEffect(() => {
    if (settings.providers.length === 0 && !localStorage.getItem('speakai_onboarded')) {
      setIsSettingsOpen(true);
      localStorage.setItem('speakai_onboarded', '1');
    }
  }, [settings.providers.length]);

  const allowedCategories = getSuggestedCategoriesForRole(role);
  const availableTopics = PRACTICE_TOPICS.filter((tp) => allowedCategories.includes(tp.category));
  const selectedTopic =
    topicId === 'custom'
      ? buildCustomTopic(customTopicText)
      : availableTopics.find((tp) => tp.id === topicId) || PRACTICE_TOPICS[0];

  const handleStart = () => {
    const title =
      selectedTopic.id === 'free'
        ? undefined
        : lang === 'fa'
        ? selectedTopic.titleFa
        : selectedTopic.title;
    startSession(role, voice, selectedTopic.prompt, title);
  };

  const minutes = String(Math.floor(sessionSeconds / 60)).padStart(2, '0');
  const seconds = String(sessionSeconds % 60).padStart(2, '0');
  const showTranscript = isConnected || transcript.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">SpeakAI Coach</h1>
            <p className="text-[11px] text-slate-400">
              {t('header.roleLine', { role: t(`roles.${role}`), voice })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {isConnected && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {minutes}:{seconds}
            </div>
          )}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-surface border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition text-xs font-medium"
            title={t('history.title')}
          >
            <History className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">{t('history.button')}</span>
            {historyEntries.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-600/30 text-indigo-300 text-[10px] font-bold">
                {historyEntries.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setLangState(lang === 'en' ? 'fa' : 'en')}
            className="flex items-center gap-1.5 p-2 rounded-xl bg-surface border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition text-xs font-semibold"
            title="Language / زبان"
          >
            <Globe className="w-4 h-4" />
            {lang === 'en' ? 'فا' : 'EN'}
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-surface border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
            title={t('settings.title')}
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

          <div className="flex flex-col items-center justify-center order-1 lg:order-2 w-full max-w-md">
            {/* Topic / IELTS Cue Card Picker */}
            <div className="w-full mb-2">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                {t('topic.label')}
              </label>
              <select
                value={selectedTopic.id}
                disabled={isConnected || phase === 'connecting'}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full bg-surface border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 disabled:opacity-60 transition"
              >
                {availableTopics.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {lang === 'fa' ? tp.titleFa : tp.title}
                  </option>
                ))}
                <option value="custom">{t('topic.customOption')}</option>
              </select>

              {topicId === 'custom' && (
                <input
                  type="text"
                  value={customTopicText}
                  disabled={isConnected || phase === 'connecting'}
                  onChange={(e) => setCustomTopicText(e.target.value)}
                  placeholder={t('topic.customPlaceholder')}
                  className="mt-2 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              )}
            </div>

            <CueCardWidget topic={selectedTopic} />

            <VisualizerOrb
              isConnected={isConnected}
              isAiTalking={isTalking}
              aiVolume={aiVolume}
              micVolume={micVolume}
              isMuted={isMuted}
            />

            <div className="mt-2 flex items-center gap-3 flex-wrap justify-center">
              {!isConnected && phase !== 'connecting' ? (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition hover:scale-105 active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                  {t('actions.start')}
                </button>
              ) : phase === 'connecting' ? (
                <button
                  disabled
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600/50 text-white/70 font-semibold text-sm shadow-xl cursor-wait"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('actions.connecting')}
                </button>
              ) : (
                <>
                  <button
                    onClick={toggleMute}
                    className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl font-semibold text-xs border transition ${
                      isMuted
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                        : 'bg-surface hover:bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                    title={isMuted ? t('actions.unmute') : t('actions.mute')}
                  >
                    {isMuted ? <MicOff className="w-4 h-4 text-amber-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                    {isMuted ? t('actions.unmute') : t('actions.mute')}
                  </button>
                  <button
                    onClick={endSession}
                    className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-xl shadow-rose-600/30 transition hover:scale-105 active:scale-95"
                  >
                    <PhoneOff className="w-4 h-4" />
                    {t('actions.end')}
                  </button>
                </>
              )}
            </div>

            {error && (
              <button
                onClick={clearError}
                className="mt-3 flex items-center gap-2 text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg hover:bg-rose-500/20 transition max-w-md text-start"
                title={t('dismiss')}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </button>
            )}

            {notice && !error && (
              <button
                onClick={clearNotice}
                className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition max-w-md text-start"
                title={t('dismiss')}
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {notice}
              </button>
            )}

            <p className="text-[11px] text-slate-500 mt-3 text-center">
              {isConnected ? t('caption.live') : t('caption.idle')}
            </p>
          </div>

          <div className="w-full lg:w-1/3 order-3 h-64 lg:h-96">
            <VocabCardList cards={vocabCards} onClear={clearVocab} onDeleteCard={deleteVocabCard} />
          </div>
        </div>

        {showTranscript && (
          <div className="w-full">
            <TranscriptPanel entries={transcript} />
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-slate-600 pt-4 border-t border-slate-800/80">
        {t('footer')}
      </footer>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={updateSettings}
        role={role}
        onSelectRole={setRole}
        voice={voice}
        onSelectVoice={setVoice}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        entries={historyEntries}
        onClearHistory={clearHistory}
        onSelectEntry={(entry) => {
          setIsHistoryOpen(false);
          openHistoricalReport(entry);
        }}
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
