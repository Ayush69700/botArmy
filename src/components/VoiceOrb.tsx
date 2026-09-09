import React from 'react';
import { VoiceState } from '../types';

interface VoiceOrbProps {
  state: VoiceState;
  onClick?: () => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state, onClick }) => {
  const getOrbClass = () => {
    switch (state) {
      case 'listening':
        return 'orb-listening scale-105';
      case 'thinking':
        return 'orb-thinking scale-100';
      case 'speaking':
        return 'orb-speaking scale-105';
      case 'idle':
      default:
        return 'orb-idle scale-95';
    }
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Voice orb status: ${state}`}
      className="cursor-pointer select-none focus:outline-none"
    >
      <div
        className={`voice-orb w-[140px] h-[140px] rounded-full transition-all duration-500 ${getOrbClass()}`}
      />
    </div>
  );
};
