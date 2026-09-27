import React, { useState } from 'react';
import { CoachRole, Provider, ProviderKind, ProviderSettings } from '../types';
import {
  X,
  UserCheck,
  Volume2,
  Server,
  Plus,
  Pencil,
  Trash2,
  Mic,
  FileText,
} from 'lucide-react';
import {
  KIND_LABELS,
  KIND_DEFAULTS,
  isVoiceCapable,
  voicesForKind,
  newProviderId,
  normalizeBaseUrl,
} from '../services/providers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: ProviderSettings;
  onSettingsChange: (next: ProviderSettings) => void;
  role: CoachRole;
  onSelectRole: (role: CoachRole) => void;
  voice: string;
  onSelectVoice: (voice: string) => void;
}

interface ProviderDraft {
  id: string | null;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  reportModel: string;
  keysText: string;
}

function emptyDraft(): ProviderDraft {
  const d = KIND_DEFAULTS['gemini-live'];
  return { id: null, name: '', kind: 'gemini-live', baseUrl: d.baseUrl, model: d.model, reportModel: d.reportModel, keysText: '' };
}

function draftFrom(provider: Provider): ProviderDraft {
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    baseUrl: provider.baseUrl,
    model: provider.model,
    reportModel: provider.reportModel ?? '',
    keysText: provider.keys.join('\n'),
  };
}

const selectClass =
  'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 text-xs';
const inputClass = selectClass + ' font-mono';

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  role,
  onSelectRole,
  voice,
  onSelectVoice,
}) => {
  const [draft, setDraft] = useState<ProviderDraft | null>(null);

  if (!isOpen) return null;

  const voiceProviders = settings.providers.filter((p) => isVoiceCapable(p.kind));
  const activeVoice = settings.providers.find((p) => p.id === settings.voiceProviderId) ?? null;
  const voiceOptions = activeVoice ? voicesForKind(activeVoice.kind) : [];
  const currentVoice = voiceOptions.includes(voice) ? voice : voiceOptions[0] ?? '';

  const patchDraft = (patch: Partial<ProviderDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const applySettings = (next: Partial<ProviderSettings>) => {
    onSettingsChange({ ...settings, ...next });
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    const keys = draft.keysText
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean);
    if (!draft.name.trim() || keys.length === 0 || !draft.model.trim()) return;

    const existing = draft.id ? settings.providers.find((p) => p.id === draft.id) : undefined;
    const provider: Provider = {
      id: existing?.id ?? newProviderId(),
      name: draft.name.trim(),
      kind: draft.kind,
      baseUrl: normalizeBaseUrl(draft.baseUrl) || KIND_DEFAULTS[draft.kind].baseUrl,
      model: draft.model.trim(),
      reportModel: draft.reportModel.trim() || undefined,
      keys,
      keyIndex: existing ? Math.min(existing.keyIndex, keys.length - 1) : 0,
    };

    const providers = existing
      ? settings.providers.map((p) => (p.id === provider.id ? provider : p))
      : [...settings.providers, provider];

    const next: ProviderSettings = {
      providers,
      voiceProviderId: settings.voiceProviderId,
      reportProviderId: settings.reportProviderId,
    };
    if (!next.voiceProviderId || !providers.some((p) => p.id === next.voiceProviderId && isVoiceCapable(p.kind))) {
      next.voiceProviderId = providers.find((p) => isVoiceCapable(p.kind))?.id ?? null;
    }
    if (!next.reportProviderId || !providers.some((p) => p.id === next.reportProviderId)) {
      next.reportProviderId = providers[0]?.id ?? null;
    }

    onSettingsChange(next);
    setDraft(null);
  };

  const handleDelete = (id: string) => {
    const providers = settings.providers.filter((p) => p.id !== id);
    const next: ProviderSettings = { ...settings, providers };
    if (next.voiceProviderId === id) {
      next.voiceProviderId = providers.find((p) => isVoiceCapable(p.kind))?.id ?? null;
    }
    if (next.reportProviderId === id) {
      next.reportProviderId = providers[0]?.id ?? null;
    }
    if (draft?.id === id) setDraft(null);
    onSettingsChange(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">Settings</h2>

        <div className="space-y-5 text-xs">
          <div>
            <label className="flex items-center gap-1.5 text-slate-300 font-medium mb-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              Coach Persona
            </label>
            <select value={role} onChange={(e) => onSelectRole(e.target.value as CoachRole)} className={selectClass}>
              <option value="ielts_examiner">IELTS Speaking Examiner (Strict & Analytical)</option>
              <option value="friendly_chat">Friendly Native Speaker (Casual & Supportive)</option>
              <option value="job_interview">Tech / Corporate Interviewer</option>
              <option value="debate_partner">Debate Sparring Partner</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-slate-300 font-medium mb-1.5">
                <Mic className="w-3.5 h-3.5 text-indigo-400" />
                Voice Provider
              </label>
              <select
                value={settings.voiceProviderId ?? ''}
                onChange={(e) => applySettings({ voiceProviderId: e.target.value || null })}
                className={selectClass}
              >
                <option value="">— none —</option>
                {voiceProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {voiceProviders.length === 0 && (
                <p className="text-[10px] text-amber-400 mt-1">Add a voice-capable provider below first.</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-slate-300 font-medium mb-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Report Provider
              </label>
              <select
                value={settings.reportProviderId ?? ''}
                onChange={(e) => applySettings({ reportProviderId: e.target.value || null })}
                className={selectClass}
              >
                <option value="">— none —</option>
                {settings.providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-slate-300 font-medium mb-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              Voice Profile
            </label>
            <select
              value={currentVoice}
              onChange={(e) => onSelectVoice(e.target.value)}
              disabled={voiceOptions.length === 0}
              className={selectClass}
            >
              {voiceOptions.length === 0 && <option value="">Add a voice provider first</option>}
              {voiceOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                Providers ({settings.providers.length})
              </label>
              {!draft && (
                <button
                  onClick={() => setDraft(emptyDraft())}
                  className="flex items-center gap-1 text-[11px] bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-500/30 transition"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>

            {settings.providers.length === 0 && !draft && (
              <p className="text-[11px] text-slate-500 italic">
                No providers yet. Add Google, OpenAI, OpenRouter or any compatible gateway — your keys stay in this
                browser only.
              </p>
            )}

            <div className="space-y-2">
              {settings.providers.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-2 bg-slate-900 border rounded-xl px-3 py-2 ${
                    p.id === settings.voiceProviderId || p.id === settings.reportProviderId
                      ? 'border-indigo-500/40'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {KIND_LABELS[p.kind]} • {p.keys.length} key{p.keys.length > 1 ? 's' : ''} • {p.model}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setDraft(draftFrom(p))}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {draft && (
              <div className="mt-3 bg-slate-950/70 border border-indigo-500/30 rounded-xl p-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Name</label>
                    <input
                      value={draft.name}
                      onChange={(e) => patchDraft({ name: e.target.value })}
                      placeholder="My OpenRouter"
                      className={selectClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Type</label>
                    <select
                      value={draft.kind}
                      onChange={(e) => {
                        const kind = e.target.value as ProviderKind;
                        const d = KIND_DEFAULTS[kind];
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                kind,
                                baseUrl: d.baseUrl,
                                model: d.model,
                                reportModel: d.reportModel,
                              }
                            : prev,
                        );
                      }}
                      className={selectClass}
                    >
                      {Object.entries(KIND_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Base URL</label>
                  <input
                    value={draft.baseUrl}
                    onChange={(e) => patchDraft({ baseUrl: e.target.value })}
                    placeholder={KIND_DEFAULTS[draft.kind].baseUrl}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Voice / Chat Model</label>
                    <input
                      value={draft.model}
                      onChange={(e) => patchDraft({ model: e.target.value })}
                      placeholder={KIND_DEFAULTS[draft.kind].model}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Report Model (optional)</label>
                    <input
                      value={draft.reportModel}
                      onChange={(e) => patchDraft({ reportModel: e.target.value })}
                      placeholder={KIND_DEFAULTS[draft.kind].reportModel}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    API Keys — one per line (rotation uses them in order on failures)
                  </label>
                  <textarea
                    value={draft.keysText}
                    onChange={(e) => patchDraft({ keysText: e.target.value })}
                    rows={3}
                    placeholder={'sk-...\nsk-...\nsk-...'}
                    className={selectClass + ' font-mono resize-none'}
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveDraft}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-xl transition text-xs"
                  >
                    Save Provider
                  </button>
                  <button
                    onClick={() => setDraft(null)}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 rounded-xl transition text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl transition text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
