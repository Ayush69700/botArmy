import React, { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onOpenVoice: () => void;
  suggestions?: string[];
  disabled?: boolean;
}

const DEFAULT_PROMPTS = [
  "How's my training pace for the marathon?",
  "What do you remember about me?",
  "My knee has been feeling a bit sore today",
  "I like to start my day with iced matcha",
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onOpenVoice,
  suggestions,
  disabled = false,
}) => {
  const [value, setValue] = useState('');

  const activePrompts = suggestions && suggestions.length > 0 ? suggestions : DEFAULT_PROMPTS;

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSendMessage(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-line px-4 md:px-7 py-3.5 bg-card flex flex-col gap-2.5">
      {/* Quick Interactive Prompt Starters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-[11px] text-ink-dim uppercase font-medium tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse" />
          Interactive:
        </span>
        {activePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(prompt)}
            className="text-[12px] text-ink/80 hover:text-blue hover:border-blue hover:bg-blue-soft/50 bg-bg border border-line rounded-full px-3 py-1 whitespace-nowrap transition-all select-none active:scale-95"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Main Input Row */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            className="w-full bg-bg border border-line rounded-full px-5 py-3 text-[14.5px] md:text-[15px] text-ink placeholder:text-ink-dim outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue/30 shadow-inner"
            placeholder="Talk with your companion (type or use quick prompts above)…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        </div>

        {/* Send Action Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          className="w-10 h-10 rounded-full bg-blue text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all shadow-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {/* Voice Trigger Button */}
        <button
          type="button"
          onClick={onOpenVoice}
          aria-label="Toggle voice station"
          title="Open voice station"
          className="w-10 h-10 rounded-full bg-blue-soft text-blue border border-blue-line flex items-center justify-center shrink-0 hover:bg-blue hover:text-white transition-all shadow-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </button>
      </div>
    </div>
  );
};
