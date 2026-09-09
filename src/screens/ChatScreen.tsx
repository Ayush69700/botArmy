import React, { useRef, useEffect } from 'react';
import { Message } from '../types';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';

interface ChatScreenProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onOpenVoice: () => void;
  onOpenMobileMenu?: () => void;
  onToggleVoicePanel?: () => void;
  isAiTyping?: boolean;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  messages,
  onSendMessage,
  onOpenVoice,
  onOpenMobileMenu,
  onToggleVoicePanel,
  isAiTyping = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiTyping]);

  return (
    <div className="flex-1 flex flex-col h-full bg-card overflow-hidden">
      {/* Center Header */}
      <header className="px-5 md:px-7 py-3.5 border-b border-line flex items-center justify-between bg-card/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-1.5 rounded-lg border border-line hover:bg-bg text-ink-dim"
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <div>
            <h1 className="font-serif text-[17px] text-ink font-medium leading-none">
              Companion
            </h1>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-ink-dim">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active memory retention enabled</span>
            </div>
          </div>
        </div>

        {/* Right Header actions */}
        <div className="flex items-center gap-2">
          {onToggleVoicePanel && (
            <button
              onClick={onToggleVoicePanel}
              className="flex items-center gap-1.5 text-[12px] font-sans font-medium px-3 py-1.5 rounded-full bg-blue-soft text-blue border border-blue-line hover:bg-blue hover:text-white transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-blue animate-ping" />
              <span>Voice Station</span>
            </button>
          )}
        </div>
      </header>

      {/* Message Area */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col gap-5"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-blue-soft border border-blue-line flex items-center justify-center text-blue text-xl font-serif mb-4 shadow-sm">
              ◆
            </div>
            <h2 className="font-serif text-[22px] text-ink font-medium mb-2">
              Start a new session
            </h2>
            <p className="font-sans text-[14px] text-ink-dim max-w-[360px] leading-relaxed">
              Your companion retains everything discussed previously. Speak or type to begin.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}

        {isAiTyping && (
          <div className="self-start flex items-center gap-2 bg-blue-soft text-blue text-[13px] px-4 py-2.5 rounded-[14px] rounded-bl-[3px] font-sans border border-blue-line/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue animate-bounce [animation-delay:0.4s]" />
            <span className="ml-1 text-ink-dim font-serif text-[12px]">Consulting memory…</span>
          </div>
        )}
      </main>

      {/* Input Row */}
      <ChatInput
        onSendMessage={onSendMessage}
        onOpenVoice={onOpenVoice}
        disabled={isAiTyping}
      />
    </div>
  );
};
