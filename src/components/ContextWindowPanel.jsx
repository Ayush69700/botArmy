import React, { useState } from 'react';
import {
  Layers,
  Database,
  Zap,
  TrendingDown,
  RefreshCw,
  Download,
  Trash2,
  Sparkles,
  Music,
  UserCheck,
  CheckCircle2,
  ArrowUpRight,
  Eye
} from 'lucide-react';
import fallbackMemoriesSeed from '../../fixtures/fallbackMemories.json' with { type: 'json' };
import { addMemories, clearMemories, getMemories } from '../lib/memoryStore.js';
import { getEnrichmentMemories, isEnrichmentEnabled, setEnrichmentEnabled } from '../lib/enrichment.js';

export default function ContextWindowPanel({
  memories = [],
  efficiencyHistory = [],
  lastExtracted = null,
  latestUsedMemories = [],
  onManualRefresh,
  isDark = true
}) {
  const [activeTab, setActiveTab] = useState('window'); // 'window' | 'memories' | 'efficiency'
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [enrichmentActive, setEnrichmentState] = useState(isEnrichmentEnabled());

  const latest = efficiencyHistory.length > 0
    ? efficiencyHistory[efficiencyHistory.length - 1]
    : null;

  const totalNaive = latest ? latest.cumulativeNaive : 0;
  const totalActual = latest ? latest.cumulativeActual : 0;
  const totalSaved = latest ? latest.cumulativeSaved : 0;
  const overallPercentSaved = latest ? latest.cumulativePercentSaved : 0;

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
    if (window.confirm("Clear all extracted memories?")) {
      clearMemories();
      if (onManualRefresh) onManualRefresh();
    }
  };

  // Common styles based on dark/light mode
  const bgPanel = isDark ? 'bg-[#212121] border-[#383838]' : 'bg-white border-slate-200';
  const bgHeader = isDark ? 'bg-[#1E1E1E] border-[#383838]' : 'bg-slate-50 border-slate-200';
  const bgSubtle = isDark ? 'bg-[#2A2A2A] border-[#383838]' : 'bg-slate-100/70 border-slate-200';
  const bgCard = isDark ? 'bg-[#282828] border-[#383838]' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-[#ECECEC]' : 'text-slate-900';
  const textMuted = isDark ? 'text-[#B4B4B4]' : 'text-slate-500';

  return (
    <div className={`flex flex-col h-full border rounded-none overflow-hidden shadow-sm ${bgPanel}`}>
      {/* Panel Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${bgHeader}`}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 text-white">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold text-sm tracking-wide ${textPrimary}`}>
                Context Window
              </h3>
              <span className="px-1.5 py-0.5 text-xs font-mono font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                {latest ? `${latest.actualTokens} tokens sent` : 'Bounded Context'}
              </span>
            </div>
            <p className={`text-xs ${textMuted}`}>
              System Prompt + Top-5 Memories + Current Message
            </p>
          </div>
        </div>

        {/* Global Savings Tag */}
        {latest && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-mono font-semibold">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>{overallPercentSaved}% context cut</span>
          </div>
        )}
      </div>

      {/* Segmented View Tabs */}
      <div className={`flex border-b text-xs font-medium ${bgSubtle}`}>
        <button
          type="button"
          onClick={() => setActiveTab('window')}
          className={`flex-1 py-2 text-center transition border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'window'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold bg-white dark:bg-[#212121]'
              : `border-transparent ${textMuted} hover:${textPrimary}`
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Active Context ({latestUsedMemories.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('memories')}
          className={`flex-1 py-2 text-center transition border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'memories'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold bg-white dark:bg-[#212121]'
              : `border-transparent ${textMuted} hover:${textPrimary}`
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Memory Bank ({allDisplayMemories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('efficiency')}
          className={`flex-1 py-2 text-center transition border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'efficiency'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold bg-white dark:bg-[#212121]'
              : `border-transparent ${textMuted} hover:${textPrimary}`
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Efficiency Stats</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE CONTEXT WINDOW INSPECTOR */}
      {activeTab === 'window' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {/* Active Context Breakdown Card */}
          <div className={`p-3 border space-y-2.5 ${bgCard}`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold uppercase tracking-wide ${textPrimary}`}>
                Current Context Window Breakdown
              </span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                {latest ? `${latest.actualTokens} tokens total` : 'Ready'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between p-1.5 bg-slate-50 dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#333]">
                <span className={textMuted}>1. System Prompt:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">~62 tokens (fixed)</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-50 dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#333]">
                <span className={textMuted}>2. Retrieved Memories:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  Top 5 entries only (~40-80 tokens)
                </span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-50 dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#333]">
                <span className={textMuted}>3. Current User Message:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">1 single turn</span>
              </div>
              <div className="flex justify-between p-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                <span className="text-rose-700 dark:text-rose-400">Prior Message Turns Verbatim:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">0 (NEVER REPLAYED)</span>
              </div>
            </div>
          </div>

          {/* Top-5 Memories Injected into Context */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold uppercase tracking-wide ${textPrimary}`}>
                Memories Injected In Current Turn ({latestUsedMemories.length})
              </span>
            </div>

            {latestUsedMemories.length === 0 ? (
              <div className={`p-4 border text-center text-xs ${textMuted} ${bgCard}`}>
                No memories injected yet. Send a message to see the top-5 retrieved memories populate this context window.
              </div>
            ) : (
              <div className="space-y-1.5">
                {latestUsedMemories.map((memStr, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 border text-xs flex items-start gap-2 ${bgCard} border-l-4 border-l-blue-600`}
                  >
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">#{idx + 1}</span>
                    <span className={`leading-relaxed ${textPrimary}`}>{memStr}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary Callout */}
          <div className={`p-3 border text-xs flex items-start gap-2 ${bgSubtle}`}>
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className={`leading-relaxed ${textMuted}`}>
              Because context is strictly bounded to top-5 memories, memory access is preserved across conversations with a fraction of the token footprint.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: FULL MEMORY BANK STORAGE */}
      {activeTab === 'memories' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Controls Bar */}
          <div className={`p-2.5 border-b space-y-2 ${bgHeader}`}>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories..."
                className={`flex-1 border px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-600 rounded-none ${
                  isDark
                    ? 'bg-[#2A2A2A] border-[#383838] text-[#ECECEC] placeholder-[#888]'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                type="button"
                onClick={handleToggleEnrichment}
                className={`text-xs px-2.5 py-1.5 border font-mono flex items-center gap-1 transition rounded-none ${
                  enrichmentActive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : `border-slate-300 dark:border-[#383838] ${textMuted}`
                }`}
                title="Toggle static profile fixture"
              >
                <Music className="w-3.5 h-3.5" />
                <span>Profile: {enrichmentActive ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Tag Filter Pills */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto text-xs">
              <div className="flex items-center gap-1">
                {['all', 'family', 'school', 'work', 'music', 'mood', 'social'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveFilter(tag)}
                    className={`px-2 py-0.5 capitalize transition rounded-none border ${
                      activeFilter === tag
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : `border-slate-200 dark:border-[#383838] ${textMuted} hover:${textPrimary}`
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleLoadSeedMemories}
                  title="Pre-seed memories"
                  className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-[#2A2A2A] border border-slate-300 dark:border-[#444] text-slate-700 dark:text-slate-200 flex items-center gap-1 font-mono"
                >
                  <Download className="w-3 h-3" />
                  <span>Seed</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  title="Clear all memories"
                  className="p-1 bg-slate-100 dark:bg-[#2A2A2A] border border-slate-300 dark:border-[#444] text-slate-500 hover:text-rose-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Last Extracted Strip */}
          {lastExtracted && (
            <div className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/60 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Turn {lastExtracted.turn}: {lastExtracted.facts?.length || 0} facts, {lastExtracted.preferences?.length || 0} prefs
                {lastExtracted.mood ? `, mood: "${lastExtracted.mood}"` : ''}
              </span>
            </div>
          )}

          {/* Memory List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredMemories.length === 0 ? (
              <div className={`text-center py-12 text-xs ${textMuted}`}>
                <Database className="w-8 h-8 mx-auto mb-2 opacity-30 text-blue-500" />
                No memories match the filter.
              </div>
            ) : (
              filteredMemories.map((mem) => {
                const isEnrichment = mem.source === 'enrichment';
                return (
                  <div
                    key={mem.id}
                    className={`p-2.5 border transition space-y-1.5 ${bgCard} hover:border-blue-500/60`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 uppercase text-[10px] font-mono font-medium bg-blue-100/70 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {mem.tag}
                        </span>
                        <span className={`text-[10px] ${textMuted}`}>
                          {mem.type}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono flex items-center gap-1 ${textMuted}`}>
                        {isEnrichment ? (
                          <>
                            <Music className="w-3 h-3 text-blue-500" />
                            <span>profile</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 text-blue-500" />
                            <span>turn {mem.turn}</span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${textPrimary}`}>{mem.content}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EFFICIENCY STATS */}
      {activeTab === 'efficiency' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {/* Latest Turn Card */}
          <div className={`p-3 border space-y-2 ${bgCard}`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold uppercase tracking-wide ${textPrimary}`}>
                {latest ? `Latest Turn (#${latest.turn})` : 'Waiting for Turn 1'}
              </span>
              {latest && (
                <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {latest.tokensSaved} tokens saved ({latest.percentSaved}%)
                </span>
              )}
            </div>

            {/* Naive Replay Bar */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className={textMuted}>Naive Full History Sent:</span>
                <span className={`font-mono font-semibold ${textPrimary}`}>
                  {latest ? `${latest.naiveTokens} tokens` : '0 tokens'}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-[#333] h-2.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-full transition-all duration-300"
                  style={{
                    width: `${latest ? Math.min(100, Math.round((latest.naiveTokens / Math.max(latest.naiveTokens, latest.actualTokens, 100)) * 100)) : 0}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Actual Sent Bar */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className={textMuted}>Actual Context Sent:</span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {latest ? `${latest.actualTokens} tokens` : '0 tokens'}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-[#333] h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{
                    width: `${latest ? Math.min(100, Math.round((latest.actualTokens / Math.max(latest.naiveTokens, latest.actualTokens, 100)) * 100)) : 0}%`
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Cumulative Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-2.5 border flex flex-col ${bgCard}`}>
              <span className={`text-xs ${textMuted}`}>Cumulative Naive</span>
              <span className={`text-lg font-bold font-mono mt-0.5 ${textPrimary}`}>
                {totalNaive.toLocaleString()}
              </span>
              <span className="text-[10px] text-rose-500 font-mono">balloons linearly</span>
            </div>

            <div className={`p-2.5 border flex flex-col ${bgCard}`}>
              <span className={`text-xs ${textMuted}`}>Cumulative Actual</span>
              <span className="text-lg font-bold font-mono mt-0.5 text-blue-600 dark:text-blue-400">
                {totalActual.toLocaleString()}
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">strictly bounded</span>
            </div>

            <div className="col-span-2 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between">
              <div>
                <span className="text-xs text-blue-700 dark:text-blue-300 uppercase tracking-wide block">Total Saved</span>
                <span className={`text-xl font-black font-mono ${textPrimary}`}>
                  {totalSaved.toLocaleString()} <span className="text-xs font-normal text-blue-600">tokens</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-blue-700 dark:text-blue-300 uppercase tracking-wide block">Reduction</span>
                <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                  {overallPercentSaved}%
                </span>
              </div>
            </div>
          </div>

          {/* Turn History Table */}
          <div className="space-y-1.5">
            <span className={`text-xs font-mono uppercase tracking-wide block ${textMuted}`}>
              Turn-by-Turn Trajectory:
            </span>
            {efficiencyHistory.length === 0 ? (
              <div className={`text-center py-4 text-xs border ${textMuted} ${bgCard}`}>
                Token history begins after Turn 1.
              </div>
            ) : (
              <div className={`border text-xs ${bgCard}`}>
                <div className={`grid grid-cols-4 p-2 font-mono text-xs border-b ${bgHeader} ${textMuted}`}>
                  <div>Turn</div>
                  <div className="text-right">Naive</div>
                  <div className="text-right">Actual</div>
                  <div className="text-right">Saved</div>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-200 dark:divide-[#333]">
                  {efficiencyHistory.map((item) => (
                    <div key={item.turn} className="grid grid-cols-4 p-1.5 font-mono text-xs hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition">
                      <div className={textPrimary}>#{item.turn}</div>
                      <div className="text-right text-rose-500">{item.naiveTokens}</div>
                      <div className="text-right text-blue-600 dark:text-blue-400">{item.actualTokens}</div>
                      <div className={`text-right font-bold ${textPrimary}`}>
                        +{item.tokensSaved}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
