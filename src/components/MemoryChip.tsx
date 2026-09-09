import React from 'react';

interface MemoryChipProps {
  text: string;
}

export const MemoryChip: React.FC<MemoryChipProps> = ({ text }) => {
  return (
    <div className="self-start inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-line rounded-pill text-[11.5px] text-blue font-sans shadow-[0_1px_4px_rgba(62,99,221,0.08)] select-none">
      <span className="w-2 h-2 rounded-full bg-blue shrink-0 animate-pulse" />
      <span className="font-medium tracking-tight">{text}</span>
    </div>
  );
};
