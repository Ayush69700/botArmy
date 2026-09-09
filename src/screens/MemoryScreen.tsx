import React, { useState } from 'react';
import { Memory } from '../types';
import { MemoryCard } from '../components/MemoryCard';

interface MemoryScreenProps {
  memories: Memory[];
  onUpdateMemory: (id: string, newText: string) => void;
  onDeleteMemory: (id: string) => void;
  onAddMemory?: (text: string) => void;
  onBackToChat: () => void;
}

export const MemoryScreen: React.FC<MemoryScreenProps> = ({
  memories,
  onUpdateMemory,
  onDeleteMemory,
  onAddMemory,
  onBackToChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');

  const filteredMemories = memories.filter((m) =>
    m.text.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleAdd = () => {
    if (newMemoryText.trim() && onAddMemory) {
      onAddMemory(newMemoryText.trim());
      setNewMemoryText('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-card px-5 md:px-8 py-6 overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToChat}
            className="p-1.5 rounded-lg border border-line hover:bg-bg text-ink-dim"
            title="Back to conversation"
          >
            ←
          </button>
          <div>
            <h1 className="font-serif text-[20px] text-ink font-normal">
              Memory Bank
            </h1>
            <p className="text-[12px] text-ink-dim font-sans">
              Things your companion has learned and retains across conversations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="text"
            placeholder="Search memories…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-[220px] bg-bg border border-line rounded-lg px-3.5 py-2 text-[13px] text-ink placeholder:text-ink-dim outline-none focus:border-blue transition-colors"
          />

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3.5 py-2 rounded-lg bg-blue text-white text-[12.5px] font-sans font-medium whitespace-nowrap hover:opacity-95 transition-opacity"
          >
            + Add Memory
          </button>
        </div>
      </div>

      {/* Manual Memory Creation Form */}
      {isAdding && (
        <div className="mb-4 p-3.5 bg-blue-soft/50 border border-blue-line rounded-card flex flex-col sm:flex-row gap-2.5 items-center">
          <input
            type="text"
            placeholder="e.g. Likes earl grey tea with honey in the afternoon..."
            value={newMemoryText}
            onChange={(e) => setNewMemoryText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 w-full bg-card border border-line rounded px-3 py-2 text-[14px] text-ink outline-none focus:border-blue"
            autoFocus
          />
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleAdd}
              disabled={!newMemoryText.trim()}
              className="px-4 py-2 bg-blue text-white text-[12px] rounded font-medium disabled:opacity-40"
            >
              Save
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-2 bg-card border border-line text-ink-dim text-[12px] rounded hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
        {filteredMemories.length > 0 ? (
          filteredMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onUpdate={onUpdateMemory}
              onDelete={onDeleteMemory}
            />
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-ink-dim">
            <div className="text-3xl mb-2">🧠</div>
            <div className="text-[14px] font-medium text-ink mb-1">
              {searchQuery ? 'No matching memories found' : 'No memories saved yet'}
            </div>
            <p className="text-[12px] max-w-[300px]">
              Chat with your companion or manually add facts here. They will be retained indefinitely.
            </p>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="pt-3 border-t border-line/50 flex justify-between items-center text-[12px] text-ink-dim font-sans">
        <button
          onClick={onBackToChat}
          className="text-blue hover:underline font-medium"
        >
          ← Return to conversation
        </button>
        <span>{filteredMemories.length} memories retained</span>
      </div>
    </div>
  );
};
