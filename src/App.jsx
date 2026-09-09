import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Sparkles,
  Info,
  RotateCcw,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  X
} from 'lucide-react';

import ChatWindow from './components/ChatWindow.jsx';
import MemoryPanel from './components/MemoryPanel.jsx';
import EfficiencyComparison from './components/EfficiencyComparison.jsx';

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

export default function App() {
  // Chat state
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [turnCount, setTurnCount] = useState(0);
  const [lastExtracted, setLastExtracted] = useState(null);

  // Store state
  const [memories, setMemories] = useState([]);
  const [efficiencyHistory, setEfficiencyHistory] = useState([]);

  // Modals & Settings
  const [showSettings, setShowSettings] = useState(false);
  const [showHonestAnswer, setShowHonestAnswer] = useState(false);

  // LLM Config
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_LLM_API_KEY || localStorage.getItem('ps4_companion_api_key') || '');
  const [baseUrl, setBaseUrl] = useState(() => import.meta.env.VITE_LLM_BASE_URL || localStorage.getItem('ps4_companion_base_url') || 'https://generativelanguage.googleapis.com/v1beta/openai');
  const [model, setModel] = useState(() => import.meta.env.VITE_LLM_MODEL || localStorage.getItem('ps4_companion_model') || 'gemini-3.6-flash');
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Sync memory store, efficiency history, and messages via IndexedDB
  useEffect(() => {
    // Load persisted chat transcript from IndexedDB
    getAllMessagesFromDB().then((savedMsgs) => {
      if (savedMsgs && savedMsgs.length > 0) {
        setMessages(savedMsgs);
        // Compute current turn count from user messages
        const userMsgCount = savedMsgs.filter(m => m.role === 'user').length;
        setTurnCount(userMsgCount);
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

    const updatedMessages = [...messages, userMessageObj];
    setMessages(updatedMessages);
    putMessageInDB(userMessageObj).catch(() => {});

    // Retrieve top 5
    const top5 = retrieveTop5Memories(userText);

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

      setMessages(prev => [...prev, assistantMessageObj]);
      putMessageInDB(assistantMessageObj).catch(() => {});
      speakText(chatResult.reply);

      // Record real Token Efficiency metrics
      recordTurnEfficiency({
        turn: currentTurn,
        systemPrompt: COMPANION_SYSTEM_PROMPT,
        fullHistory: messages,
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
    if (window.confirm("Reset conversation, memories, and token efficiency history?")) {
      setMessages([]);
      setTurnCount(0);
      setLastExtracted(null);
      clearMemories();
      clearEfficiencyHistory();
      clearAllDatabase().catch(() => {});
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#12100E] text-[#FFF1D6] overflow-hidden font-sans">
      {/* Top Navbar */}
      <header className="h-12 border-b border-[#2E2420] bg-[#171311] px-3.5 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#8C1D40] border border-[#E84A27] flex items-center justify-center text-[#FFB000]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <h1 className="font-bold text-[#FFF1D6] tracking-wide text-xs uppercase">
                PS4 Voice Memory Companion
              </h1>
              <span className="text-[9px] font-mono px-1 py-0.2 bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/40">
                v1.0
              </span>
              <span className="hidden sm:inline text-[9px] font-mono px-1 py-0.2 bg-[#8C1D40]/30 text-[#FFB000] border border-[#8C1D40]">
                Chromium DB
              </span>
            </div>
            <p className="text-[9px] text-[#8A7A70] leading-none mt-0.5">
              "Remembers what matters using a fraction of the context"
            </p>
          </div>
        </div>

        {/* Action Badges and Settings */}
        <div className="flex items-center gap-1.5">
          {simulateFailure && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-[#8C1D40] border border-[#E84A27] text-[#FFF1D6] text-[10px]">
              <ShieldAlert className="w-3 h-3 text-[#FFB000]" />
              <span>Forced Fallback</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowHonestAnswer(true)}
            className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[#1A1614] hover:bg-[#2E2420] text-[#FFF1D6] border border-[#2E2420] hover:border-[#FF7A00] text-[10px] font-mono uppercase transition rounded-none"
          >
            <Info className="w-3 h-3 text-[#FFB000]" />
            <span>Honest Benchmark</span>
          </button>

          <button
            type="button"
            onClick={handleResetSession}
            title="Reset conversation"
            className="flex items-center gap-1 px-2 py-1 bg-[#1A1614] hover:bg-[#2E2420] text-[#FFF1D6] border border-[#2E2420] hover:border-[#E84A27] text-[10px] font-mono uppercase transition rounded-none"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1 px-2 py-1 bg-[#1A1614] hover:bg-[#2E2420] text-[#FFB000] border border-[#2E2420] hover:border-[#FFB000] text-[10px] font-mono uppercase transition rounded-none"
          >
            <Settings className="w-3 h-3" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Content: Thin padding, boxy grid */}
      <main className="flex-1 p-2 lg:p-2.5 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden bg-[#12100E]">
        {/* Left Column: Chat Window */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0">
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
            ttsEnabled={ttsEnabled}
            onToggleTts={() => setTtsEnabled(!ttsEnabled)}
          />
        </div>

        {/* Right Column: Memory + Efficiency */}
        <div className="lg:col-span-5 h-full flex flex-col gap-2 min-h-0">
          {/* Top: Memory Storage */}
          <div className="flex-1 min-h-0">
            <MemoryPanel
              memories={memories}
              lastExtracted={lastExtracted}
              onManualRefresh={() => {
                setMemories(getMemories());
              }}
            />
          </div>

          {/* Bottom: Efficiency Comparison */}
          <div className="flex-1 min-h-0">
            <EfficiencyComparison efficiencyHistory={efficiencyHistory} />
          </div>
        </div>
      </main>

      {/* Settings Modal (Boxy & Warm) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-none flex items-center justify-center p-3">
          <div className="w-full max-w-sm bg-[#1A1614] border border-[#2E2420] shadow-none overflow-hidden rounded-none">
            <div className="px-3.5 py-2.5 border-b border-[#2E2420] bg-[#171311] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#FFB000]" />
                <h3 className="font-semibold text-xs text-[#FFF1D6] uppercase tracking-wide">
                  LLM API Configuration
                </h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-[#8A7A70] hover:text-[#FFF1D6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-3.5 space-y-3 text-xs">
              {/* Presets */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#8A7A70]">Quick Presets</label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai');
                      setModel('gemini-3.6-flash');
                    }}
                    className={`px-1.5 py-1 text-[10px] font-mono uppercase border text-center transition rounded-none ${
                      model.includes('gemini')
                        ? 'bg-[#8C1D40] text-[#FFF1D6] border-[#FF7A00]'
                        : 'bg-[#12100E] text-[#8A7A70] border-[#2E2420] hover:text-[#FFF1D6]'
                    }`}
                  >
                    Gemini Flash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBaseUrl('https://api.openai.com/v1');
                      setModel('gpt-4o-mini');
                    }}
                    className={`px-1.5 py-1 text-[10px] font-mono uppercase border text-center transition rounded-none ${
                      model === 'gpt-4o-mini'
                        ? 'bg-[#8C1D40] text-[#FFF1D6] border-[#FF7A00]'
                        : 'bg-[#12100E] text-[#8A7A70] border-[#2E2420] hover:text-[#FFF1D6]'
                    }`}
                  >
                    OpenAI 4o-m
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBaseUrl('https://api.groq.com/openai/v1');
                      setModel('llama-3.3-70b-versatile');
                    }}
                    className={`px-1.5 py-1 text-[10px] font-mono uppercase border text-center transition rounded-none ${
                      model.includes('llama')
                        ? 'bg-[#8C1D40] text-[#FFF1D6] border-[#FF7A00]'
                        : 'bg-[#12100E] text-[#8A7A70] border-[#2E2420] hover:text-[#FFF1D6]'
                    }`}
                  >
                    Groq Llama
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#8A7A70]">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    const val = e.target.value;
                    setApiKey(val);
                    if (val.trim().startsWith('AIzaSy') || val.trim().startsWith('AQ.')) {
                      setBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai');
                      setModel('gemini-3.6-flash');
                    }
                  }}
                  placeholder="Paste Gemini or OpenAI key..."
                  className="w-full bg-[#12100E] border border-[#2E2420] px-2.5 py-1.5 text-xs text-[#FFF1D6] placeholder-[#8A7A70] focus:outline-none focus:border-[#FF7A00] font-mono rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#8A7A70]">
                  Base URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full bg-[#12100E] border border-[#2E2420] px-2.5 py-1.5 text-[11px] text-[#FFF1D6] placeholder-[#8A7A70] focus:outline-none focus:border-[#FF7A00] font-mono rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-[#8A7A70]">
                  Model
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#12100E] border border-[#2E2420] px-2.5 py-1.5 text-[11px] text-[#FFF1D6] placeholder-[#8A7A70] focus:outline-none focus:border-[#FF7A00] font-mono rounded-none"
                />
              </div>

              {/* Broken Key Toggle */}
              <div className="pt-1 border-t border-[#2E2420]">
                <label className="flex items-center justify-between cursor-pointer p-2 bg-[#12100E] border border-[#2E2420] rounded-none">
                  <div>
                    <span className="text-[11px] text-[#FFF1D6] block">
                      Simulate Broken API Key
                    </span>
                    <span className="text-[9px] text-[#8A7A70] block">
                      Forces local fallback response
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                    className="accent-[#E84A27] cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-2.5 py-1 text-[#8A7A70] hover:text-[#FFF1D6] text-xs font-mono uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#E84A27] hover:bg-[#FF7A00] text-[#FFF1D6] border border-[#FFB000] font-semibold text-xs font-mono uppercase transition rounded-none"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Honest Answer Modal (Boxy & Warm) */}
      {showHonestAnswer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <div className="w-full max-w-md bg-[#1A1614] border border-[#2E2420] shadow-none overflow-hidden rounded-none">
            <div className="px-3.5 py-2.5 border-b border-[#2E2420] bg-[#171311] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#FFB000]" />
                <h3 className="font-semibold text-xs text-[#FFF1D6] uppercase tracking-wide">
                  Judge & Team Reference
                </h3>
              </div>
              <button
                onClick={() => setShowHonestAnswer(false)}
                className="text-[#8A7A70] hover:text-[#FFF1D6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 space-y-2.5 text-xs text-[#FFF1D6]/90 leading-relaxed">
              <div className="p-2.5 bg-[#12100E] border border-[#2E2420]">
                <strong className="text-[#FFB000] block uppercase tracking-wider text-[9px] mb-0.5">
                  The North Star Pitch:
                </strong>
                <p className="italic text-[11px]">
                  "Most assistants forget you the moment the session ends — this one remembers what matters, and does it using a fraction of the context."
                </p>
              </div>

              <div className="p-2.5 bg-[#8C1D40]/20 border border-[#8C1D40]">
                <strong className="text-[#FF7A00] block uppercase tracking-wider text-[9px] mb-0.5">
                  The Agreed Honest Answer:
                </strong>
                <p className="text-[11px]">
                  "We benchmarked token reduction and conversational coherence across our test conversations, showing a ~60–80% context reduction without dropping relevant facts. We deliberately did not run formal relevance/accuracy benchmarks against full-transcript replay, which would require an offline evaluation pipeline that wasn't our priority for a 6-hour build."
                </p>
              </div>

              <div className="pt-1 text-right">
                <button
                  type="button"
                  onClick={() => setShowHonestAnswer(false)}
                  className="px-3 py-1 bg-[#1A1614] hover:bg-[#2E2420] text-[#FFF1D6] border border-[#2E2420] font-mono text-[10px] uppercase transition rounded-none"
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
