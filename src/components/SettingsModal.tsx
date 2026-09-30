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
  KIND_DEFAULTS,
  PROVIDER_PRESETS,
  detectPresetId,
  isVoiceCapable,
  voicesForKind,
  newProviderId,
  normalizeBaseUrl,
} from '../services/providers';
import { useT, useLang } from '../i18n/store';

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
  presetId: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  customBaseUrl: boolean;
  model: string;
  customModel: boolean;
  reportModel: string;
  customReportModel: boolean;
  keysText: string;
}

function emptyDraft(): ProviderDraft {
  const preset = PROVIDER_PRESETS[0]; // Google Gemini by default
  return {
    id: null,
    presetId: preset.id,
    name: preset.defaultName,
    kind: preset.kind,
    baseUrl: preset.baseUrl,
    customBaseUrl: false,
    model: preset.voiceModels[0]?.value ?? KIND_DEFAULTS[preset.kind].model,
    customModel: false,
    reportModel: preset.reportModels[0]?.value ?? KIND_DEFAULTS[preset.kind].reportModel,
    customReportModel: false,
    keysText: '',
  };
}

function draftFrom(provider: Provider): ProviderDraft {
  const presetId = detectPresetId(provider);
  const preset = PROVIDER_PRESETS.find((p) => p.id === presetId) ?? PROVIDER_PRESETS[0];
  const isCustomPreset = preset.id === 'custom';
  const hasVoiceModelInList = preset.voiceModels.some((m) => m.value === provider.model);
  const effectiveReportModel = provider.reportModel || KIND_DEFAULTS[provider.kind].reportModel;
  const hasReportModelInList = preset.reportModels.some((m) => m.value === effectiveReportModel);
  const isDefaultUrl =
    !isCustomPreset && normalizeBaseUrl(provider.baseUrl).toLowerCase() === normalizeBaseUrl(preset.baseUrl).toLowerCase();

  return {
    id: provider.id,
    presetId: preset.id,
    name: provider.name,
    kind: provider.kind,
    baseUrl: provider.baseUrl,
    customBaseUrl: !isDefaultUrl,
    model: provider.model,
    customModel: isCustomPreset || !hasVoiceModelInList,
    reportModel: effectiveReportModel,
    customReportModel: isCustomPreset || !hasReportModelInList,
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
  const t = useT();
  const [lang] = useLang();
  const [draft, setDraft] = useState<ProviderDraft | null>(null);

  if (!isOpen) return null;

  const voiceProviders = settings.providers.filter((p) => isVoiceCapable(p.kind));
  const activeVoice = settings.providers.find((p) => p.id === settings.voiceProviderId) ?? null;
  const voiceOptions = activeVoice ? voicesForKind(activeVoice.kind) : [];
  const isBrowserVoice = activeVoice?.kind === 'openai-chat';
  const currentVoice = voiceOptions.includes(voice) ? voice : voiceOptions[0] ?? '';

  const patchDraft = (patch: Partial<ProviderDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const handleSelectPreset = (nextPresetId: string) => {
    const preset = PROVIDER_PRESETS.find((p) => p.id === nextPresetId) ?? PROVIDER_PRESETS[0];
    setDraft((prev) => {
      if (!prev) return prev;
      const prevPreset = PROVIDER_PRESETS.find((p) => p.id === prev.presetId);
      const shouldUpdateName = !prev.name.trim() || prev.name === prevPreset?.defaultName;
      const isCustom = preset.id === 'custom';
      return {
        ...prev,
        presetId: preset.id,
        name: shouldUpdateName ? preset.defaultName : prev.name,
        kind: preset.kind,
        baseUrl: preset.baseUrl,
        customBaseUrl: isCustom,
        model: preset.voiceModels[0]?.value ?? KIND_DEFAULTS[preset.kind].model,
        customModel: isCustom,
        reportModel: preset.reportModels[0]?.value ?? KIND_DEFAULTS[preset.kind].reportModel,
        customReportModel: isCustom,
      };
    });
  };

  const applySettings = (next: Partial<ProviderSettings>) => {
    onSettingsChange({ ...settings, ...next });
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    const keys = draft.keysText
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean);
    const finalName = draft.name.trim() || 'Provider';
    if (keys.length === 0 || !draft.model.trim()) return;

    const existing = draft.id ? settings.providers.find((p) => p.id === draft.id) : undefined;
    const provider: Provider = {
      id: existing?.id ?? newProviderId(),
      name: finalName,
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

  const activePreset = draft
    ? PROVIDER_PRESETS.find((p) => p.id === draft.presetId) ?? PROVIDER_PRESETS[0]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">{t('settings.title')}</h2>

        <div className="space-y-5 text-xs">
          <div>
            <label className="flex items-center gap-1.5 text-slate-300 font-medium mb-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              {t('settings.persona')}
            </label>
            <select value={role} onChange={(e) => onSelectRole(e.target.value as CoachRole)} className={selectClass}>
              <option value="ielts_examiner">{t('settings.role.ielts')}</option>
              <option value="friendly_chat">{t('settings.role.friendly')}</option>
              <option value="job_interview">{t('settings.role.job')}</option>
              <option value="debate_partner">{t('settings.role.debate')}</option>
              <option value="shadowing_coach">{t('settings.role.shadowing')}</option>
              <option value="pronunciation_drill">{t('settings.role.pronunciation')}</option>
              <option value="roleplay_scenario">{t('settings.role.roleplay')}</option>
              <option value="storytelling">{t('settings.role.storytelling')}</option>
              <option value="vocabulary_builder">{t('settings.role.vocabulary')}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-slate-300 font-medium mb-1.5">
                <Mic className="w-3.5 h-3.5 text-indigo-400" />
                {t('settings.voiceProvider')}
              </label>
              <select
                value={settings.voiceProviderId ?? ''}
                onChange={(e) => applySettings({ voiceProviderId: e.target.value || null })}
                className={selectClass}
              >
                <option value="">{t('settings.none')}</option>
                {voiceProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {voiceProviders.length === 0 && (
                <p className="text-[10px] text-amber-400 mt-1">{t('settings.noVoiceProvider')}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-slate-300 font-medium mb-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                {t('settings.reportProvider')}
              </label>
              <select
                value={settings.reportProviderId ?? ''}
                onChange={(e) => applySettings({ reportProviderId: e.target.value || null })}
                className={selectClass}
              >
                <option value="">{t('settings.none')}</option>
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
              {t('settings.voiceProfile')}
              {isBrowserVoice ? t('settings.voiceProfileBrowser') : ''}
            </label>
            <select
              value={currentVoice}
              onChange={(e) => onSelectVoice(e.target.value)}
              disabled={voiceOptions.length === 0 && !isBrowserVoice}
              className={selectClass}
            >
              {isBrowserVoice && <option value="">{t('settings.browserVoice')}</option>}
              {!activeVoice && <option value="">{t('settings.addVoiceFirst')}</option>}
              {voiceOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            {isBrowserVoice && (
              <p className="text-[10px] text-slate-500 mt-1">{t('settings.browserHint')}</p>
            )}
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                {t('settings.providers', { n: settings.providers.length })}
              </label>
              {!draft && (
                <button
                  onClick={() => setDraft(emptyDraft())}
                  className="flex items-center gap-1 text-[11px] bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-500/30 transition"
                >
                  <Plus className="w-3 h-3" /> {t('settings.add')}
                </button>
              )}
            </div>

            {settings.providers.length === 0 && !draft && (
              <p className="text-[11px] text-slate-500 italic">{t('settings.empty')}</p>
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
                      {t(`kind.${p.kind}`)} •{' '}
                      {p.keys.length > 1 ? t('settings.nKeys', { n: p.keys.length }) : t('settings.oneKey')} •{' '}
                      {p.model}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setDraft(draftFrom(p))}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title={t('settings.edit')}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      title={t('settings.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {draft && activePreset && (
              <div className="mt-3 bg-slate-950/70 border border-indigo-500/30 rounded-xl p-3.5 space-y-3">
                {/* Step 1: Provider Preset */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-indigo-300 font-semibold mb-1">
                      {t('settings.preset')}
                    </label>
                    <select
                      value={draft.presetId}
                      onChange={(e) => handleSelectPreset(e.target.value)}
                      className={selectClass}
                    >
                      {PROVIDER_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {lang === 'fa' ? p.labelFa : p.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{t('settings.name')}</label>
                    <input
                      value={draft.name}
                      onChange={(e) => patchDraft({ name: e.target.value })}
                      placeholder={activePreset.defaultName || t('settings.addName')}
                      className={selectClass}
                    />
                  </div>
                </div>

                {/* Step 2: API Keys / Token */}
                <div>
                  <label className="block text-[10px] text-indigo-300 font-semibold mb-1">
                    {t('settings.keysLabel')}
                  </label>
                  <textarea
                    value={draft.keysText}
                    onChange={(e) => patchDraft({ keysText: e.target.value })}
                    rows={2}
                    placeholder={`${activePreset.keyPlaceholder}\n${activePreset.keyPlaceholder}`}
                    className={selectClass + ' font-mono resize-none'}
                  />
                </div>

                {/* Step 3: Selectable Voice Model & Report Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{t('settings.model')}</label>
                    {activePreset.voiceModels.length > 0 && (
                      <select
                        value={draft.customModel ? '__custom__' : draft.model}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            patchDraft({ customModel: true });
                          } else {
                            patchDraft({ model: e.target.value, customModel: false });
                          }
                        }}
                        className={inputClass}
                      >
                        {activePreset.voiceModels.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                        <option value="__custom__">{t('settings.customModel')}</option>
                      </select>
                    )}
                    {(draft.customModel || activePreset.voiceModels.length === 0) && (
                      <input
                        value={draft.model}
                        onChange={(e) => patchDraft({ model: e.target.value })}
                        placeholder={KIND_DEFAULTS[draft.kind].model}
                        className={inputClass + (activePreset.voiceModels.length > 0 ? ' mt-1.5' : '')}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{t('settings.reportModel')}</label>
                    {activePreset.reportModels.length > 0 && (
                      <select
                        value={draft.customReportModel ? '__custom__' : draft.reportModel}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            patchDraft({ customReportModel: true });
                          } else {
                            patchDraft({ reportModel: e.target.value, customReportModel: false });
                          }
                        }}
                        className={inputClass}
                      >
                        {activePreset.reportModels.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                        <option value="__custom__">{t('settings.customModel')}</option>
                      </select>
                    )}
                    {(draft.customReportModel || activePreset.reportModels.length === 0) && (
                      <input
                        value={draft.reportModel}
                        onChange={(e) => patchDraft({ reportModel: e.target.value })}
                        placeholder={KIND_DEFAULTS[draft.kind].reportModel}
                        className={inputClass + (activePreset.reportModels.length > 0 ? ' mt-1.5' : '')}
                      />
                    )}
                  </div>
                </div>

                {/* Step 4: Base URL & Protocol (auto-selected from preset, with custom option) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{t('settings.baseUrl')}</label>
                    {activePreset.id !== 'custom' && (
                      <select
                        value={draft.customBaseUrl ? '__custom__' : activePreset.baseUrl}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            patchDraft({ customBaseUrl: true });
                          } else {
                            patchDraft({ baseUrl: activePreset.baseUrl, customBaseUrl: false });
                          }
                        }}
                        className={inputClass}
                      >
                        <option value={activePreset.baseUrl}>
                          {t('settings.defaultUrl', { url: activePreset.baseUrl })}
                        </option>
                        <option value="__custom__">{t('settings.customUrl')}</option>
                      </select>
                    )}
                    {(draft.customBaseUrl || activePreset.id === 'custom') && (
                      <input
                        value={draft.baseUrl}
                        onChange={(e) => patchDraft({ baseUrl: e.target.value })}
                        placeholder={KIND_DEFAULTS[draft.kind].baseUrl}
                        className={inputClass + (activePreset.id !== 'custom' ? ' mt-1.5' : '')}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">{t('settings.type')}</label>
                    <select
                      value={draft.kind}
                      onChange={(e) => {
                        const kind = e.target.value as ProviderKind;
                        const d = KIND_DEFAULTS[kind];
                        patchDraft({
                          kind,
                          baseUrl: draft.customBaseUrl ? draft.baseUrl : d.baseUrl,
                        });
                      }}
                      className={selectClass}
                    >
                      {(['gemini-live', 'openai-realtime', 'openai-chat'] as ProviderKind[]).map((value) => (
                        <option key={value} value={value}>
                          {t(`kind.${value}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveDraft}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-xl transition text-xs"
                  >
                    {t('settings.save')}
                  </button>
                  <button
                    onClick={() => setDraft(null)}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 rounded-xl transition text-xs"
                  >
                    {t('settings.cancel')}
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
            {t('settings.done')}
          </button>
        </div>
      </div>
    </div>
  );
};
