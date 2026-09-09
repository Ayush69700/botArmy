import React from 'react';
import { Message } from '../types';
import { MemoryChip } from './MemoryChip';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex flex-col gap-2 w-full ${isUser ? 'items-end' : 'items-start'}`}>
      {!isUser && message.memoryRecall && (
        <div className="animate-fade-in pl-1">
          <MemoryChip text={message.memoryRecall} />
        </div>
      )}

      <div className={`flex items-end gap-2.5 max-w-[85%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Subtle AI Icon for assistant message */}
        {!isUser && (
          <div className="w-7 h-7 rounded-lg bg-blue-soft border border-blue-line flex items-center justify-center text-blue shrink-0 mb-0.5 text-xs font-serif font-semibold">
            ◆
          </div>
        )}

        <div
          className={`px-4.5 py-3 text-[15px] md:text-[15.5px] leading-[1.6] font-sans transition-all ${
            isUser
              ? 'bg-blue text-white rounded-[16px] rounded-br-[4px] shadow-sm'
              : 'bg-blue-soft text-ink rounded-[16px] rounded-bl-[4px] border border-blue-line/40'
          }`}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
};
