import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import VoiceControls from './VoiceControls.jsx';

const SAMPLE_DEMO_PROMPTS = [
  { label: '👋 Greeting', text: "Hey! I'm pretty tired from coding all night for the hackathon." },
  { label: '👩‍💼 Family Fact', text: "My sister Maya is packing her bags to move to Seattle next month." },
  { label: '🎵 Ask Music', text: "What kind of music should I put on right now to focus?" },
  { label: '🧠 Test Recall', text: "Do you remember what my sister Maya is doing?" },
  { label: '🍵 Preference', text: "I definitely prefer iced oat milk matchas over espresso drinks." }
];

export default function ChatWindow({
  messages = [],
  onSendMessage,
  isProcessing = false,
  ttsEnabled,
  onToggleTts,
  isDark = true
}) {
  const [inputText, setInputText] = useState('');
  const [expandedMemories, setExpandedMemories] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleVoiceTranscript = (transcript) => {
    if (transcript && transcript.trim()) {
      onSendMessage(transcript.trim());
    }
  };

  const handlePromptClick = (text) => {
    setInputText(text);
  };

  const toggleMemoryExpansion = (msgIndex) => {
    setExpandedMemories(prev => ({
      ...prev,
      [msgIndex]: !prev[msgIndex]
    }));
  };

  // Theme variables
  const bgContainer = isDark ? 'bg-[#212121] border-[#383838]' : 'bg-white border-slate-200';
  const bgHeader = isDark ? 'bg-[#1E1E1E] border-[#383838]' : 'bg-slate-50 border-slate-200';
  const bgChatArea = isDark ? 'bg-[#181818]' : 'bg-slate-50/50';
  const textPrimary = isDark ? 'text-[#ECECEC]' : 'text-slate-900';
  const textMuted = isDark ? 'text-[#B4B4B4]' : 'text-slate-500';
  const bgInputForm = isDark ? 'bg-[#1E1E1E] border-[#383838]' : 'bg-white border-slate-200';
  const bgInput = isDark ? 'bg-[#2A2A2A] border-[#383838] text-[#ECECEC]' : 'bg-white border-slate-300 text-slate-900';

  return (
    <div className={`flex flex-col h-full border rounded-none overflow-hidden shadow-sm ${bgContainer}`}>
      {/* Chat Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${bgHeader}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 flex items-center justify-center text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-semibold tracking-wide ${textPrimary}`}>
                AI Voice Companion
              </h2>
              <span className="text-xs font-mono uppercase px-1.5 py-0.5 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 font-medium">
                Active Session
              </span>
            </div>
            <p className={`text-xs ${textMuted} mt-0.5`}>
              Bounded context: System Prompt + Top-5 Memories + Current Message
            </p>
          </div>
        </div>

        {/* Voice controls */}
        <VoiceControls
          onTranscriptReady={handleVoiceTranscript}
          ttsEnabled={ttsEnabled}
          onToggleTts={onToggleTts}
          isProcessing={isProcessing}
          isDark={isDark}
        />
      </div>

      {/* Message List */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${bgChatArea}`}>
        {messages.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center text-center p-6 ${textMuted}`}>
            <div className={`w-12 h-12 border flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400 ${
              isDark ? 'bg-[#282828] border-[#383838]' : 'bg-blue-50 border-blue-200'
            }`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className={`text-sm font-semibold mb-1 ${textPrimary}`}>
              Start a Conversation
            </h3>
            <p className="text-xs max-w-md mb-4 leading-relaxed">
              Speak using the mic or type below. Facts, preferences, and mood are extracted live; only the 5 most relevant memories are retrieved each turn.
            </p>
            <div className={`w-full max-w-md p-3 border text-left ${
              isDark ? 'bg-[#252525] border-[#383838]' : 'bg-white border-slate-200'
            }`}>
              <span className="text-xs font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2 font-semibold">
                Suggested Demo Prompts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_DEMO_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePromptClick(prompt.text)}
                    className={`text-xs px-2.5 py-1.5 border transition ${
                      isDark
                        ? 'bg-[#1E1E1E] hover:bg-[#333] text-[#ECECEC] border-[#383838] hover:border-blue-500'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-800 border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const hasMemories = msg.memoriesUsed && msg.memoriesUsed.length > 0;
            const isExpanded = !!expandedMemories[index];

            return (
              <div
                key={index}
                className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-7 h-7 flex items-center justify-center text-xs border ${
                    isUser
                      ? 'bg-blue-600 text-white border-blue-600'
                      : isDark
                      ? 'bg-[#2A2A2A] text-blue-400 border-[#383838]'
                      : 'bg-slate-200 text-blue-700 border-slate-300'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[82%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-3.5 py-2.5 text-sm leading-relaxed border ${
                      isUser
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isDark
                        ? 'bg-[#2A2A2A] text-[#ECECEC] border-[#383838]'
                        : 'bg-white text-slate-900 border-slate-200 shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Context Badges for Assistant */}
                  {!isUser && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      {hasMemories ? (
                        <button
                          type="button"
                          onClick={() => toggleMemoryExpansion(index)}
                          className={`flex items-center gap-1 px-2 py-0.5 border text-xs transition ${
                            isDark
                              ? 'bg-[#252525] border-blue-900 text-blue-400 hover:border-blue-500'
                              : 'bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-400'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-blue-500" />
                          <span>{msg.memoriesUsed.length} memories used in context</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 ml-0.5" />
                          ) : (
                            <ChevronDown className="w-3 h-3 ml-0.5" />
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">No prior memory needed</span>
                      )}

                      {msg.isFallback && (
                        <span
                          title="Generated using local fallback"
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs"
                        >
                          <AlertCircle className="w-3 h-3" />
                          Fallback
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded Memory Drawer */}
                  {!isUser && hasMemories && isExpanded && (
                    <div className={`mt-1.5 p-3 w-full border text-xs space-y-1 ${
                      isDark
                        ? 'bg-[#1F1F1F] border-blue-900/60 text-[#ECECEC]'
                        : 'bg-blue-50/50 border-blue-200 text-slate-800'
                    }`}>
                      <div className="font-mono text-blue-600 dark:text-blue-400 text-xs uppercase font-semibold">
                        Top-5 Retrieved Context:
                      </div>
                      <ul className="space-y-1">
                        {msg.memoriesUsed.map((memStr, mIdx) => (
                          <li key={mIdx} className="flex items-start gap-1.5">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>{memStr}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isProcessing && (
          <div className="flex items-center gap-2.5 py-1 text-xs text-blue-600 dark:text-blue-400 font-mono">
            <div className="w-6 h-6 bg-blue-600 text-white flex items-center justify-center animate-pulse">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 border ${
              isDark ? 'bg-[#252525] border-[#383838]' : 'bg-white border-slate-200'
            }`}>
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span>RETRIEVING TOP 5 & GENERATING...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Demo Prompt Quick Bar */}
      {messages.length > 0 && (
        <div className={`px-4 py-2 border-t flex items-center gap-2 overflow-x-auto text-xs ${bgHeader}`}>
          <span className={`text-xs font-mono uppercase whitespace-nowrap ${textMuted}`}>Try:</span>
          {SAMPLE_DEMO_PROMPTS.slice(1).map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePromptClick(prompt.text)}
              className={`text-xs whitespace-nowrap px-2.5 py-1 border transition ${
                isDark
                  ? 'bg-[#2A2A2A] hover:bg-[#333] text-[#ECECEC] border-[#383838] hover:border-blue-500'
                  : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200 hover:border-blue-400'
              }`}
            >
              {prompt.label}
            </button>
          ))}
        </div>
      )}

      {/* Text Input Form */}
      <form onSubmit={handleSubmit} className={`p-3 border-t flex items-center gap-2.5 ${bgInputForm}`}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Speak using microphone or type your message here..."
          disabled={isProcessing}
          className={`flex-1 border px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-600 transition rounded-none ${bgInput}`}
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isProcessing}
          className={`flex items-center justify-center px-4 py-2.5 text-sm font-semibold uppercase tracking-wider rounded-none transition ${
            inputText.trim() && !isProcessing
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              : isDark
              ? 'bg-[#2A2A2A] text-slate-500 border border-[#383838] cursor-not-allowed'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4 mr-1.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
