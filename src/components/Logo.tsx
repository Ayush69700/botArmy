import React from 'react';

interface LogoProps {
  collapsed?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ collapsed = false }) => {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* Attractive Glowing Emblem */}
      <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue to-[#5B82F6] text-white shadow-[0_2px_12px_rgba(62,99,221,0.35)] shrink-0">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-white"
        >
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill="currentColor"
            opacity="0.9"
          />
          <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
        </svg>
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
      </div>

      {!collapsed && (
        <div className="flex flex-col">
          <span className="font-serif text-[18px] text-ink tracking-tight font-medium leading-tight">
            Companion
          </span>
          <span className="font-sans text-[11px] text-ink-dim tracking-wider uppercase">
            Memory AI
          </span>
        </div>
      )}
    </div>
  );
};
