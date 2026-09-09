import React, { useState } from 'react';
import { Memory } from '../types';

interface MemoryCardProps {
  memory: Memory;
  onUpdate: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(memory.text);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(memory.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditText(memory.text);
    setIsEditing(false);
  };

  return (
    <div className="bg-card border border-line border-l-[3.5px] border-l-blue rounded-card p-4 flex items-start justify-between gap-4 transition-all hover:border-blue-line/70 shadow-sm">
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              className="w-full bg-bg border border-line rounded px-3 py-1.5 text-[14.5px] text-ink outline-none focus:border-blue"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
              autoFocus
            />
          </div>
        ) : (
          <div className="text-[14.5px] md:text-[15px] leading-[1.55] text-ink font-sans break-words">
            {memory.text}
          </div>
        )}
        <div className="text-[11px] text-ink-dim font-sans mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-line" />
          <span>{memory.updatedAt}</span>
        </div>
      </div>

      <div className="text-[12px] text-blue font-sans whitespace-nowrap shrink-0 pt-0.5 select-none font-medium">
        {isEditing ? (
          <span className="space-x-1.5">
            <button
              onClick={handleSave}
              className="hover:underline focus:outline-none"
            >
              Save
            </button>
            <span className="text-line">·</span>
            <button
              onClick={handleCancel}
              className="hover:underline focus:outline-none text-ink-dim"
            >
              Cancel
            </button>
          </span>
        ) : (
          <span className="space-x-1.5">
            <button
              onClick={() => setIsEditing(true)}
              className="hover:underline focus:outline-none"
            >
              Edit
            </button>
            <span className="text-line">·</span>
            <button
              onClick={() => onDelete(memory.id)}
              className="hover:underline focus:outline-none text-red-500/80 hover:text-red-600"
            >
              Delete
            </button>
          </span>
        )}
      </div>
    </div>
  );
};
