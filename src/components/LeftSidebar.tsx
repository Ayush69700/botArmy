import React from 'react';
import { Screen, Memory } from '../types';
import { Logo } from './Logo';

interface LeftSidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onNewChat: () => void;
  memories: Memory[];
  isOpen?: boolean;
  onCloseMobile?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentScreen,
  onNavigate,
  onNewChat,
  memories,
  isOpen = true,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-ink/20 z-40 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-[270px] bg-card border-r border-line flex flex-col justify-between p-4.5 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Section */}
        <div className="flex flex-col gap-5">
          {/* Header & Logo */}
          <div className="flex items-center justify-between pb-3 border-b border-line/60">
            <Logo />
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-md text-ink-dim hover:bg-bg"
                aria-label="Close menu"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-btn bg-blue text-white font-sans text-[14px] font-medium shadow-sm hover:opacity-95 active:scale-[0.99] transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Conversation
          </button>

          {/* Main Navigation */}
          <nav className="flex flex-col gap-1 text-[14px] font-sans">
            <button
              onClick={() => {
                onNavigate('chat');
                if (onCloseMobile) onCloseMobile();
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                currentScreen === 'chat'
                  ? 'bg-blue-soft text-blue font-medium'
                  : 'text-ink hover:bg-bg hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span>Chat</span>
              </div>
            </button>

            <button
              onClick={() => {
                onNavigate('memory');
                if (onCloseMobile) onCloseMobile();
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                currentScreen === 'memory'
                  ? 'bg-blue-soft text-blue font-medium'
                  : 'text-ink hover:bg-bg hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span>Memory Bank</span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue/10 text-blue">
                {memories.length}
              </span>
            </button>

            <button
              onClick={() => {
                onNavigate('voice');
                if (onCloseMobile) onCloseMobile();
              }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                currentScreen === 'voice'
                  ? 'bg-blue-soft text-blue font-medium'
                  : 'text-ink hover:bg-bg hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                <span>Voice Mode</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          </nav>

          {/* Recent Memories snippet list */}
          <div className="mt-2 pt-4 border-t border-line/50">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-ink-dim font-medium mb-2.5 px-2">
              <span>Saved Memories</span>
              <span className="text-blue cursor-pointer hover:underline" onClick={() => onNavigate('memory')}>
                view all
              </span>
            </div>
            <div className="flex flex-col gap-1.5 max-h-[170px] overflow-y-auto pr-1">
              {memories.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  onClick={() => onNavigate('memory')}
                  className="text-[12px] text-ink/80 hover:text-ink bg-bg/80 hover:bg-bg p-2 rounded-md border border-line/40 cursor-pointer line-clamp-2 transition-colors"
                >
                  <span className="text-blue mr-1.5 font-bold">·</span>
                  {m.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Status Card */}
        <div className="pt-3 border-t border-line/60">
          <div className="p-2.5 rounded-lg bg-bg border border-line/60 flex items-center justify-between text-[11.5px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-ink font-medium">Synced & Remembering</span>
            </div>
            <span className="text-ink-dim">{memories.length} items</span>
          </div>
        </div>
      </aside>
    </>
  );
};
