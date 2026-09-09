import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Sparkles,
  Info,
  RotateCcw,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  X,
  Sun,
  Moon,
  Layers,
  PanelRightOpen
} from 'lucide-react';

import VoiceAssistantView from './components/VoiceAssistantView.jsx';
import ContextWindowPanel from './components/ContextWindowPanel.jsx';

import {
  getMemories,
  subscribeToMemories,
  clearMemories
} from './lib/memoryStore.js';
import { retrieveTop5Memories } from './lib/retrieval.js';
import { generateChatReply, COMPANION_SYSTEM_PROMPT } from './lib/chatEngine.js';
import { extractAndStoreMemories } from './lib/extraction.js';
import {
  recordTurnEfficiency,
  subscribeToEfficiency,
  clearEfficiencyHistory
} from './lib/tokenCounter.js';

import {
  getAllMessagesFromDB,
  putMessageInDB,
  clearAllDatabase
} from './lib/indexedDB.js';

const MSG_STORAGE_KEY = 'ps4_companion_messages_v2';

export default function App() {
  // Theme state: dark (ChatGPT/Claude grey) or light (crisp white + aesthetic blue)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('ps4_theme') !== 'light';
    }
    return true;
  });

  // Synchronous initial load of chat messages from localStorage
  const [messages, setMessages] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cached = window.localStorage.getItem(MSG_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [turnCount, setTurnCount] = useState(() => messages.filter(m => m.role === 'user').length);
  const [lastExtracted, setLastExtracted] = useState(null);
  const [latestUsedMemories, setLatestUsedMemories] = useState([]);

  // Store state
  const [memories, setMemories] = useState(() => getMemories());
  const [efficiencyHistory, setEfficiencyHistory] = useState([]);

  // Modals & Settings
  const [showSettings, setShowSettings] = useState(false);
  const [showHonestAnswer, setShowHonestAnswer] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // LLM Config (defaults to user's Groq key with gpt-oss-120b)
  const [apiKey, setApiKey] = useState(() => {
    const envKey = import.meta.env.VITE_LLM_API_KEY;
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem('ps4_companion_api_key') : null;
    return envKey || storedKey || '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';
  });

  const [baseUrl, setBaseUrl] = useState(() => {
    const activeKey = import.meta.env.VITE_LLM_API_KEY || (typeof window !== 'undefined' ? localStorage.getItem('ps4_companion_api_key') : '') || 'gsk_';
    const envBase = import.meta.env.VITE_LLM_BASE_URL;
    const storedBase = typeof window !== 'undefined' ? localStorage.getItem('ps4_companion_base_url') : null;
    if (activeKey.startsWith('gsk_')) {
      return 'https://api.groq.com/openai/v1';
    }
    return envBase || storedBase || 'https://api.groq.com/openai/v1';
  });

  const [model, setModel] = useState(() => {
    const activeKey = import.meta.env.VITE_LLM_API_KEY || (typeof window !== 'undefined' ? localStorage.getItem('ps4_companion_api_key') : '') || 'gsk_';
    const envModel = import.meta.env.VITE_LLM_MODEL;
    const storedModel = typeof window !== 'undefined' ? localStorage.getItem('ps4_companion_model') : null;
    if (activeKey.startsWith('gsk_')) {
      if (storedModel && (storedModel === 'openai/gpt-oss-120b' || storedModel === 'openai/gpt-oss-20b')) {
        return storedModel;
      }
      return 'openai/gpt-oss-120b';
    }
    return envModel || storedModel || 'openai/gpt-oss-120b';
  });
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Apply dark/light class to html document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ps4_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ps4_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Sync memory store, efficiency history, and messages via IndexedDB
  useEffect(() => {
    // Load from IndexedDB and merge if available
    getAllMessagesFromDB().then((savedMsgs) => {
      if (savedMsgs && savedMsgs.length > messages.length) {
        setMessages(savedMsgs);
        setTurnCount(savedMsgs.filter(m => m.role === 'user').length);
        try {
          localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify(savedMsgs));
        } catch (e) {}
      }
    });

    const unsubMem = subscribeToMemories((mems) => {
      setMemories(mems);
    });

    const unsubEff = subscribeToEfficiency((history) => {
      setEfficiencyHistory(history);
    });

    return () => {
      unsubMem();
      unsubEff();
    };
  }, []);

  // Save settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('ps4_companion_api_key', apiKey.trim());
    localStorage.setItem('ps4_companion_base_url', baseUrl.trim());
    localStorage.setItem('ps4_companion_model', model.trim());
    setShowSettings(false);
  };

  // Text-To-Speech execution helper
  const speakText = (text) => {
    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (preferred) {
        utterance.voice = preferred;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[TTS] Synthesis error:', e);
    }
  };

  // Helper to persist message list to both LocalStorage and IndexedDB
  const saveMessagesState = (newMessagesList, newMsgToAppend) => {
    setMessages(newMessagesList);
    try {
      localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify(newMessagesList));
    } catch (e) {}
    if (newMsgToAppend) {
      putMessageInDB(newMsgToAppend).catch(() => {});
    }
  };

  // Core Turn Execution
  const handleSendMessage = useCallback(async (userText) => {
    if (!userText || !userText.trim() || isProcessing) return;

    const currentTurn = turnCount + 1;
    setTurnCount(currentTurn);
    setIsProcessing(true);

    const userMessageObj = {
      role: 'user',
      content: userText,
      timestamp: Date.now()
    };

    const updatedWithUser = [...messages, userMessageObj];
    saveMessagesState(updatedWithUser, userMessageObj);

    // Retrieve top 5 memories
    const top5 = retrieveTop5Memories(userText);
    const top5Strings = top5.map(m => (typeof m === 'string' ? m : m.content));
    setLatestUsedMemories(top5Strings);

    const apiConfig = {
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      simulateFailure
    };

    try {
      const chatResult = await generateChatReply({
        userMessage: userText,
        top5Memories: top5,
        apiConfig,
        systemPrompt: COMPANION_SYSTEM_PROMPT
      });

      const assistantMessageObj = {
        role: 'assistant',
        content: chatResult.reply,
        isFallback: chatResult.isFallback,
        memoriesUsed: chatResult.memoriesUsed,
        timestamp: Date.now()
      };

      const finalMessages = [...updatedWithUser, assistantMessageObj];
      saveMessagesState(finalMessages, assistantMessageObj);
      speakText(chatResult.reply);

      // Record real Token Efficiency metrics
      recordTurnEfficiency({
        turn: currentTurn,
        systemPrompt: COMPANION_SYSTEM_PROMPT,
        fullHistory: updatedWithUser,
        top5Memories: top5,
        currentMessage: userText
      });

      // Extract memories asynchronously
      extractAndStoreMemories({
        userMessage: userText,
        turn: currentTurn,
        apiConfig
      }).then(extraction => {
        setLastExtracted({
          turn: currentTurn,
          ...extraction
        });
      }).catch(err => {
        console.warn("[Extraction] Error:", err);
      });

    } catch (error) {
      console.error("[App] Execution error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [messages, isProcessing, turnCount, apiKey, baseUrl, model, simulateFailure, ttsEnabled]);

  const handleResetSession = () => {
    if (window.confirm("Reset conversation, memories, and token efficiency metrics?")) {
      setMessages([]);
      setTurnCount(0);
      setLastExtracted(null);
      setLatestUsedMemories([]);
      try {
        localStorage.removeItem(MSG_STORAGE_KEY);
      } catch (e) {}
      clearMemories();
      clearEfficiencyHistory();
      clearAllDatabase().catch(() => {});
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  };

  // Base background and text classes
  const appBg = isDark ? 'bg-[#181818] text-[#ECECEC]' : 'bg-[#F8FAFC] text-slate-900';
  const headerBg = isDark ? 'bg-[#212121] border-[#383838]' : 'bg-white border-slate-200';
  const textMuted = isDark ? 'text-[#B4B4B4]' : 'text-slate-500';

  return (
    <div className={`flex flex-col h-screen ${appBg} overflow-hidden font-sans transition-colors duration-150`}>
      {/* Top Navbar */}
      <header className={`h-14 border-b ${headerBg} px-4 flex items-center justify-between shrink-0 z-10 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 flex items-center justify-center text-white font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 leading-none flex-wrap">
              <h1 className="font-bold tracking-tight text-sm uppercase">
                PS4 Voice Memory Companion
              </h1>
              <span className="text-xs font-mono px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                Persistent DB
              </span>
              <span className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 border ${
                baseUrl.includes('groq')
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : baseUrl.includes('google')
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${baseUrl.includes('groq') ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                {baseUrl.includes('groq') ? 'Groq' : baseUrl.includes('google') ? 'Gemini' : 'OpenAI'}: {model.split('/').pop()}
              </span>
            </div>
            <p className={`text-xs ${textMuted} mt-0.5`}>
              Remembers what matters using a fraction of the context
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {simulateFailure && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Forced Fallback</span>
            </div>
          )}

          {/* Theme Invert Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium transition rounded-none ${
              isDark
                ? 'bg-[#2A2A2A] hover:bg-[#333] text-amber-300 border-[#383838]'
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
            }`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHonestAnswer(true)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 border text-xs font-mono uppercase transition rounded-none ${
              isDark
                ? 'bg-[#2A2A2A] hover:bg-[#333] text-[#ECECEC] border-[#383838]'
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span>Benchmark Info</span>
          </button>

          <button
            type="button"
            onClick={handleResetSession}
            title="Reset conversation and persistent DB"
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-mono uppercase transition rounded-none ${
              isDark
                ? 'bg-[#2A2A2A] hover:bg-rose-950/40 text-[#ECECEC] hover:text-rose-400 border-[#383838]'
                : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-slate-300'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Toggle Right Side Panel Button */}
          <button
            type="button"
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
            title={isPanelCollapsed ? "Show Context Window Panel" : "Minimize Context Window Panel"}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-mono uppercase transition rounded-none ${
              !isPanelCollapsed
                ? isDark
                  ? 'bg-[#2A2A2A] hover:bg-[#333] text-[#ECECEC] border-[#383838]'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 font-semibold'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isPanelCollapsed ? "Open Panel" : "Minimize Panel"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition rounded-none shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout: Voice Assistant Stage + Collapsible Context Window Panel */}
      <main className="flex-1 p-3 flex gap-3 overflow-hidden">
        {/* Left / Center: Dedicated Voice-Focused Assistant Stage */}
        <div className="flex-1 h-full flex flex-col min-h-0 transition-all duration-200">
          <VoiceAssistantView
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
            ttsEnabled={ttsEnabled}
            onToggleTts={() => setTtsEnabled(!ttsEnabled)}
            isDark={isDark}
          />
        </div>

        {/* Right: Collapsible Unified Context Window Panel */}
        {isPanelCollapsed ? (
          <div className={`h-full w-12 border flex flex-col items-center justify-between py-3 shrink-0 transition-all duration-200 ${headerBg}`}>
            <button
              type="button"
              onClick={() => setIsPanelCollapsed(false)}
              title="Expand Context Window & Memory Bank"
              className="p-2 bg-blue-600 text-white rounded-none hover:bg-blue-700 transition shadow-sm"
            >
              <PanelRightOpen className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center gap-6 my-auto select-none">
              <span className="text-[11px] font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400 rotate-90 whitespace-nowrap">
                MEMORY ({memories.length})
              </span>
            </div>

            <span className="text-[10px] font-mono text-slate-400">
              {efficiencyHistory.length}T
            </span>
          </div>
        ) : (
          <div className="w-full lg:w-[440px] xl:w-[480px] h-full flex flex-col min-h-0 shrink-0 transition-all duration-200">
            <ContextWindowPanel
              memories={memories}
              efficiencyHistory={efficiencyHistory}
              lastExtracted={lastExtracted}
              latestUsedMemories={latestUsedMemories}
              onManualRefresh={() => {
                setMemories(getMemories());
              }}
              isDark={isDark}
              onToggleMinimize={() => setIsPanelCollapsed(true)}
            />
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className={`w-full max-w-md border shadow-xl overflow-hidden rounded-none ${
            isDark ? 'bg-[#212121] border-[#383838] text-[#ECECEC]' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`px-4 py-3 border-b flex items-center justify-between ${
              isDark ? 'bg-[#1E1E1E] border-[#383838]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-sm uppercase tracking-wide">
                  Model & API Config
                </h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-4 space-y-3.5 text-xs">
              {/* Presets */}
              <div className="space-y-1">
                <label className={`text-xs font-mono uppercase ${textMuted}`}>Quick Presets</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setBaseUrl('https://api.groq.com/openai/v1');
                      setModel('openai/gpt-oss-120b');
                    }}
                    className={`px-1.5 py-1.5 text-[11px] font-mono uppercase border text-center transition rounded-none ${
                      model === 'openai/gpt-oss-120b'
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : isDark
                        ? 'bg-[#2A2A2A] text-slate-300 border-[#383838]'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    Groq 120B
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBaseUrl('https://api.groq.com/openai/v1');
                      setModel('openai/gpt-oss-20b');
                    }}
                    className={`px-1.5 py-1.5 text-[11px] font-mono uppercase border text-center transition rounded-none ${
                      model === 'openai/gpt-oss-20b'
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : isDark
                        ? 'bg-[#2A2A2A] text-slate-300 border-[#383838]'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    Groq 20B
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai');
                      setModel('gemini-3.5-flash-lite');
                    }}
                    className={`px-1.5 py-1.5 text-[11px] font-mono uppercase border text-center transition rounded-none ${
                      model.includes('gemini')
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : isDark
                        ? 'bg-[#2A2A2A] text-slate-300 border-[#383838]'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    Gemini Lite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBaseUrl('https://api.openai.com/v1');
                      setModel('gpt-4o-mini');
                    }}
                    className={`px-1.5 py-1.5 text-[11px] font-mono uppercase border text-center transition rounded-none ${
                      model === 'gpt-4o-mini'
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : isDark
                        ? 'bg-[#2A2A2A] text-slate-300 border-[#383838]'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    OpenAI
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-mono uppercase ${textMuted}`}>
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    const val = e.target.value;
                    const trimmed = val.trim();
                    setApiKey(val);
                    if (trimmed.startsWith('gsk_')) {
                      setBaseUrl('https://api.groq.com/openai/v1');
                      setModel('openai/gpt-oss-120b');
                    } else if (trimmed.startsWith('AIzaSy') || trimmed.startsWith('AQ.')) {
                      setBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai');
                      setModel('gemini-3.5-flash-lite');
                    } else if (trimmed.startsWith('sk-')) {
                      setBaseUrl('https://api.openai.com/v1');
                      setModel('gpt-4o-mini');
                    }
                  }}
                  placeholder="Paste Groq (gsk_...), Gemini, or OpenAI key..."
                  className={`w-full border px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-600 rounded-none ${
                    isDark
                      ? 'bg-[#181818] border-[#383838] text-[#ECECEC]'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-mono uppercase ${textMuted}`}>
                  Base URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className={`w-full border px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-600 rounded-none ${
                    isDark
                      ? 'bg-[#181818] border-[#383838] text-[#ECECEC]'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className={`text-xs font-mono uppercase ${textMuted}`}>
                  Model
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={`w-full border px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-600 rounded-none ${
                    isDark
                      ? 'bg-[#181818] border-[#383838] text-[#ECECEC]'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Broken Key Toggle */}
              <div className="pt-2 border-t dark:border-[#383838] border-slate-200">
                <label className={`flex items-center justify-between cursor-pointer p-2.5 border rounded-none ${
                  isDark ? 'bg-[#181818] border-[#383838]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-xs font-medium block">
                      Simulate Broken API Key
                    </span>
                    <span className={`text-[10px] block ${textMuted}`}>
                      Forces local fallback response
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                    className="accent-blue-600 cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className={`px-3 py-1.5 text-xs font-mono uppercase ${textMuted} hover:${isDark ? 'text-white' : 'text-black'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs font-mono uppercase transition rounded-none shadow-sm"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Honest Answer Modal */}
      {showHonestAnswer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className={`w-full max-w-md border shadow-xl overflow-hidden rounded-none ${
            isDark ? 'bg-[#212121] border-[#383838] text-[#ECECEC]' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`px-4 py-3 border-b flex items-center justify-between ${
              isDark ? 'bg-[#1E1E1E] border-[#383838]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-sm uppercase tracking-wide">
                  Judge & Team Reference
                </h3>
              </div>
              <button
                onClick={() => setShowHonestAnswer(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs leading-relaxed">
              <div className={`p-3 border ${
                isDark ? 'bg-[#181818] border-[#383838]' : 'bg-slate-50 border-slate-200'
              }`}>
                <strong className="text-blue-600 dark:text-blue-400 block uppercase tracking-wider text-[10px] mb-1">
                  The North Star Pitch:
                </strong>
                <p className="italic text-xs font-medium">
                  "Most assistants forget you the moment the session ends — this one remembers what matters, and does it using a fraction of the context."
                </p>
              </div>

              <div className={`p-3 border ${
                isDark ? 'bg-blue-950/20 border-blue-900/60' : 'bg-blue-50 border-blue-200'
              }`}>
                <strong className="text-blue-700 dark:text-blue-300 block uppercase tracking-wider text-[10px] mb-1">
                  The Agreed Honest Answer on Benchmarking:
                </strong>
                <p className="text-xs">
                  "We benchmarked token reduction and conversational coherence across our test conversations, showing a ~60–80% context reduction without dropping relevant facts. We deliberately did not run formal relevance/accuracy benchmarks against full-transcript replay, which would require an offline evaluation pipeline that wasn't our priority for a 6-hour build."
                </p>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setShowHonestAnswer(false)}
                  className={`px-3 py-1.5 border text-xs font-mono uppercase transition rounded-none ${
                    isDark ? 'bg-[#2A2A2A] hover:bg-[#333] border-[#383838]' : 'bg-slate-100 hover:bg-slate-200 border-slate-300'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
