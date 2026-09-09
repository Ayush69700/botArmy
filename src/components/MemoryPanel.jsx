import React, { useState } from 'react';
import { Database, RefreshCw, Sparkles, Music, UserCheck, Trash2, Download } from 'lucide-react';
import fallbackMemoriesSeed from '../../fixtures/fallbackMemories.json' with { type: 'json' };
import { addMemories, clearMemories, getMemories } from '../lib/memoryStore.js';
import { getEnrichmentMemories, isEnrichmentEnabled, setEnrichmentEnabled } from '../lib/enrichment.js';

const TAG_STYLES = {
  family: 'bg-[#8C1D40]/30 text-[#FFF1D6] border-[#8C1D40]',
  work: 'bg-[#E84A27]/20 text-[#FF7A00] border-[#E84A27]/60',
  school: 'bg-[#FF7A00]/20 text-[#FFB000] border-[#FF7A00]/60',
  music: 'bg-[#FFB000]/20 text-[#FFB000] border-[#FFB000]/50',
  mood: 'bg-[#8C1D40]/40 text-[#FFF1D6] border-[#E84A27]/60',
  social: 'bg-[#E84A27]/20 text-[#FFF1D6] border-[#FF7A00]/50',
  other: 'bg-[#2E2420] text-[#8A7A70] border-[#2E2420]',
};

const TYPE_LABELS = {
  fact: 'Fact',
  preference: 'Preference',
  mood: 'Mood'
};

export default function MemoryPanel({
  memories = [],
  onManualRefresh,
  lastExtracted = null
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [enrichmentActive, setEnrichmentState] = useState(isEnrichmentEnabled());

  const enrichmentItems = enrichmentActive ? getEnrichmentMemories() : [];
  const allDisplayMemories = [...memories, ...enrichmentItems];

  const filteredMemories = allDisplayMemories.filter((mem) => {
    if (activeFilter !== 'all') {
      if (activeFilter === 'enrichment') {
        if (mem.source !== 'enrichment') return false;
      } else if (activeFilter === 'conversation') {
        if (mem.source !== 'conversation') return false;
      } else if (mem.tag !== activeFilter) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        mem.content.toLowerCase().includes(q) ||
        (mem.tag && mem.tag.toLowerCase().includes(q)) ||
        (mem.type && mem.type.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleToggleEnrichment = () => {
    const nextState = !enrichmentActive;
    setEnrichmentEnabled(nextState);
    setEnrichmentState(nextState);
    if (onManualRefresh) onManualRefresh();
  };

  const handleLoadSeedMemories = () => {
    addMemories(fallbackMemoriesSeed);
    if (onManualRefresh) onManualRefresh();
  };

  const handleClearAll = () => {
    if (window.confirm("Clear all extracted conversation memories?")) {
      clearMemories();
      if (onManualRefresh) onManualRefresh();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1A1614] border border-[#2E2420] rounded-none overflow-hidden shadow-none">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-[#2E2420] bg-[#171311] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#8C1D40] border border-[#E84A27] text-[#FFB000]">
            <Database className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-[#FFF1D6] text-xs uppercase tracking-wide">
                Memory Storage
              </h3>
              <span className="px-1 py-0.2 text-[10px] font-mono bg-[#12100E] text-[#FFB000] border border-[#2E2420]">
                {allDisplayMemories.length} items
              </span>
            </div>
            <p className="text-[10px] text-[#8A7A70] leading-none mt-0.5">Flat tagged memory store</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onManualRefresh}
            title="Force refresh"
            className="p-1 bg-[#12100E] hover:bg-[#2E2420] text-[#FFF1D6] border border-[#2E2420] hover:border-[#FF7A00] transition"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleLoadSeedMemories}
            title="Pre-seed memories"
            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-[#12100E] hover:bg-[#2E2420] text-[#FFB000] border border-[#2E2420] hover:border-[#FFB000] transition uppercase font-mono"
          >
            <Download className="w-2.5 h-2.5" />
            <span>Pre-seed</span>
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            title="Clear memories"
            className="p-1 bg-[#12100E] hover:bg-[#8C1D40] text-[#8A7A70] hover:text-[#FFF1D6] border border-[#2E2420] hover:border-[#E84A27] transition"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Filter and Enrichment Toggles */}
      <div className="p-2 border-b border-[#2E2420] bg-[#12100E] space-y-1.5">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="flex-1 bg-[#1A1614] border border-[#2E2420] px-2 py-1 text-[11px] text-[#FFF1D6] placeholder-[#8A7A70] focus:outline-none focus:border-[#FF7A00] rounded-none"
          />
          <button
            type="button"
            onClick={handleToggleEnrichment}
            className={`text-[10px] font-mono uppercase px-2 py-1 border transition flex items-center gap-1 rounded-none ${
              enrichmentActive
                ? 'bg-[#8C1D40]/60 border-[#FF7A00] text-[#FFF1D6]'
                : 'bg-[#1A1614] border-[#2E2420] text-[#8A7A70]'
            }`}
            title="Toggle static profile enrichment"
          >
            <Music className="w-2.5 h-2.5" />
            <span>Profile: {enrichmentActive ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Tag Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
          {['all', 'family', 'school', 'work', 'music', 'mood', 'social'].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveFilter(tag)}
              className={`px-1.5 py-0.5 uppercase tracking-wider rounded-none transition ${
                activeFilter === tag
                  ? 'bg-[#E84A27] text-[#FFF1D6] font-bold border border-[#FFB000]'
                  : 'bg-[#1A1614] hover:bg-[#2E2420] text-[#8A7A70] hover:text-[#FFF1D6] border border-[#2E2420]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Last Extracted Banner */}
      {lastExtracted && (
        <div className="px-2.5 py-1 bg-[#8C1D40]/30 border-b border-[#8C1D40] flex items-center justify-between text-[10px] text-[#FFB000]">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#FFB000]" />
            <span>
              Turn {lastExtracted.turn} Extracted:{' '}
              {lastExtracted.facts?.length || 0} facts, {lastExtracted.preferences?.length || 0} prefs
              {lastExtracted.mood ? `, mood: "${lastExtracted.mood}"` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-[#12100E]">
        {filteredMemories.length === 0 ? (
          <div className="text-center py-8 text-[#8A7A70] text-[11px]">
            <Database className="w-6 h-6 mx-auto mb-1.5 opacity-30 text-[#FFB000]" />
            No memories match filter.
          </div>
        ) : (
          filteredMemories.map((mem) => {
            const isEnrichment = mem.source === 'enrichment';
            const tagStyle = TAG_STYLES[mem.tag] || TAG_STYLES.other;

            return (
              <div
                key={mem.id}
                className="p-2 bg-[#1A1614] border border-[#2E2420] hover:border-[#FF7A00]/60 transition space-y-1 rounded-none"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[9px] font-mono uppercase px-1 py-0.2 border ${tagStyle}`}
                    >
                      {mem.tag}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 bg-[#12100E] text-[#8A7A70] border border-[#2E2420]">
                      {TYPE_LABELS[mem.type] || mem.type}
                    </span>
                  </div>

                  <span
                    className={`text-[9px] font-mono flex items-center gap-1 ${
                      isEnrichment ? 'text-[#FFB000]' : 'text-[#8A7A70]'
                    }`}
                  >
                    {isEnrichment ? (
                      <>
                        <Music className="w-2.5 h-2.5" />
                        <span>fixture</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-2.5 h-2.5" />
                        <span>turn {mem.turn}</span>
                      </>
                    )}
                  </span>
                </div>

                <p className="text-[11px] text-[#FFF1D6] leading-relaxed font-normal">
                  {mem.content}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
