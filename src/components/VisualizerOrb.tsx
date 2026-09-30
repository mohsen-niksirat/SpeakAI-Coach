import React from 'react';
import { useT } from '../i18n/store';

interface VisualizerOrbProps {
  isAiTalking: boolean;
  aiVolume: number;
  micVolume: number;
  isConnected: boolean;
  isMuted?: boolean;
}

export const VisualizerOrb: React.FC<VisualizerOrbProps> = ({
  isAiTalking,
  aiVolume,
  micVolume,
  isConnected,
  isMuted = false,
}) => {
  const t = useT();
  const currentVolume = isAiTalking ? aiVolume : isMuted ? 0 : micVolume;
  const scale = isConnected ? 1 + currentVolume * 0.45 : 1;
  const glow = isAiTalking
    ? 'rgba(99, 102, 241, 0.7)'
    : isMuted
    ? 'rgba(244, 63, 94, 0.35)'
    : micVolume > 0.05
    ? 'rgba(16, 185, 129, 0.7)'
    : 'rgba(79, 70, 229, 0.2)';

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-72 md:h-72 my-4">
      <div
        className="absolute inset-0 rounded-full blur-3xl transition-all duration-150"
        style={{
          background: glow,
          transform: `scale(${scale * 1.2})`,
        }}
      />
      {isConnected && (
        <div className="absolute inset-4 rounded-full border border-indigo-500/30 animate-spin-slow pointer-events-none" />
      )}
      <div
        className="relative z-10 w-40 h-40 md:w-44 md:h-44 rounded-full flex flex-col items-center justify-center transition-transform duration-75 shadow-2xl"
        style={{
          transform: `scale(${scale})`,
          background: isAiTalking
            ? 'radial-gradient(circle at 35% 35%, #818cf8 0%, #4f46e5 50%, #1e1b4b 100%)'
            : isConnected && isMuted
            ? 'radial-gradient(circle at 35% 35%, #fb7185 0%, #be123c 50%, #4c0519 100%)'
            : isConnected
            ? 'radial-gradient(circle at 35% 35%, #34d399 0%, #059669 50%, #064e3b 100%)'
            : 'radial-gradient(circle at 35% 35%, #64748b 0%, #334155 50%, #0f172a 100%)',
        }}
      >
        <span className="text-white text-xs uppercase tracking-widest font-semibold drop-shadow">
          {!isConnected
            ? t('orb.ready')
            : isAiTalking
            ? t('orb.speaking')
            : isMuted
            ? t('orb.muted')
            : t('orb.listening')}
        </span>
      </div>
    </div>
  );
};
