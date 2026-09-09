import React from 'react';

interface LandingScreenProps {
  onStart: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onStart }) => {
  return (
    <div className="w-full h-full min-h-[520px] flex flex-col md:flex-row bg-card">
      {/* Left Column */}
      <div className="flex-1 px-8 py-12 md:px-[50px] md:py-[60px] flex flex-col justify-center">
        <div className="font-serif text-[13px] text-blue tracking-[0.04em] mb-8 md:mb-9 select-none">
          ◆ Companion
        </div>

        <h1 className="font-serif font-normal text-[28px] md:text-[32px] leading-[1.3] text-ink max-w-[380px] mb-4">
          Something that remembers who you are.
        </h1>

        <p className="font-sans text-[14px] leading-[1.6] text-ink-dim max-w-[340px] mb-7 md:mb-[30px]">
          Talk or type. It keeps what matters and gets to know you over time.
        </p>

        <div>
          <button
            type="button"
            onClick={onStart}
            className="font-sans text-[13.5px] font-semibold bg-blue text-white rounded-btn px-[22px] py-[11px] hover:opacity-95 transition-opacity"
          >
            Start talking
          </button>
        </div>
      </div>

      {/* Right Column: Soft blue wash with constellation dots */}
      <div className="flex-1 relative bg-blue-soft min-h-[260px] md:min-h-full overflow-hidden flex items-center justify-center">
        {/* Constellation Nodes */}
        <div
          className="absolute w-2 h-2 rounded-full bg-blue"
          style={{
            top: '36%',
            left: '42%',
            boxShadow: '0 0 0 7px rgba(62, 99, 221, 0.12), 0 0 0 14px rgba(62, 99, 221, 0.05)',
          }}
        />
        <div
          className="absolute w-2 h-2 rounded-full bg-blue"
          style={{
            top: '58%',
            left: '62%',
            boxShadow: '0 0 0 6px rgba(62, 99, 221, 0.12), 0 0 0 12px rgba(62, 99, 221, 0.05)',
          }}
        />
        <div
          className="absolute w-1.5 h-1.5 rounded-full bg-blue"
          style={{
            top: '46%',
            left: '52%',
            boxShadow: '0 0 0 5px rgba(62, 99, 221, 0.10)',
          }}
        />
      </div>
    </div>
  );
};
