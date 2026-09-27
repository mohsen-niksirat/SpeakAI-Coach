import React, { useState } from 'react';
import { CoachRole, VoiceName } from '../types';
import { X, Key, UserCheck, Volume2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  role: CoachRole;
  onSelectRole: (role: CoachRole) => void;
  voice: VoiceName;
  onSelectVoice: (voice: VoiceName) => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  role,
  onSelectRole,
  voice,
  onSelectVoice,
}) => {
  const [tempKey, setTempKey] = useState(apiKey);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          Settings & Configuration
        </h2>

        <div className="space-y-5 text-xs">
          <div>
            <label className="flex items-center gap-1.5 text-slate-300 font-medium mb-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              Gemini API Key (BYOK)
            </label>
            <input
              type="password"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Your key stays locally in your browser.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-slate-300 font-medium mb-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              Coach Persona
            </label>
            <select
              value={role}
              onChange={(e) => onSelectRole(e.target.value as CoachRole)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="ielts_examiner">IELTS Speaking Examiner (Strict & Analytical)</option>
              <option value="friendly_chat">Friendly Native Speaker (Casual & Supportive)</option>
              <option value="job_interview">Tech / Corporate Interviewer</option>
              <option value="debate_partner">Debate Sparring Partner</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-slate-300 font-medium mb-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              HD Voice Profile
            </label>
            <select
              value={voice}
              onChange={(e) => onSelectVoice(e.target.value as VoiceName)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="Aoede">Aoede (Expressive Female)</option>
              <option value="Kore">Kore (Clear Female)</option>
              <option value="Puck">Puck (Natural Male)</option>
              <option value="Charon">Charon (Deep Male)</option>
              <option value="Fenrir">Fenrir (Authoritative Male)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => {
              onSaveApiKey(tempKey);
              onClose();
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/30"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
