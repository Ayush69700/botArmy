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
  onToggleTts
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

  return (
    <div className="flex flex-col h-full bg-[#1A1614] border border-[#2E2420] rounded-none overflow-hidden shadow-none">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#2E2420] bg-[#171311]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#8C1D40] border border-[#E84A27] flex items-center justify-center text-[#FFF1D6]">
            <Bot className="w-4 h-4 text-[#FFB000]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-semibold text-[#FFF1D6] tracking-wide uppercase">
                Voice Memory Companion
              </h2>
              <span className="text-[9px] font-mono uppercase px-1 py-0.2 border border-[#FF7A00]/50 text-[#FF7A00] bg-[#FF7A00]/10">
                Active Session
              </span>
            </div>
            <p className="text-[10px] text-[#8A7A70] leading-none mt-0.5">
              Strict context bound: System + Top-5 + Current Message
            </p>
          </div>
        </div>

        {/* Voice controls */}
        <VoiceControls
          onTranscriptReady={handleVoiceTranscript}
          ttsEnabled={ttsEnabled}
          onToggleTts={onToggleTts}
          isProcessing={isProcessing}
        />
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#12100E]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#8A7A70]">
            <div className="w-10 h-10 bg-[#1A1614] border border-[#2E2420] flex items-center justify-center mb-2.5 text-[#FFB000]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-semibold text-[#FFF1D6] tracking-wide mb-1 uppercase">
              Start Conversation
            </h3>
            <p className="text-[11px] max-w-sm text-[#8A7A70] mb-3 leading-relaxed">
              Speak using the mic or type below. Facts, preferences, and mood are extracted live; only the 5 most relevant memories are retrieved each turn.
            </p>
            <div className="w-full max-w-md bg-[#1A1614] p-2.5 border border-[#2E2420] text-left">
              <span className="text-[10px] font-mono text-[#FFB000] uppercase tracking-wider block mb-1.5">
                Suggested Demo Inputs:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_DEMO_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePromptClick(prompt.text)}
                    className="text-[11px] px-2 py-1 bg-[#12100E] hover:bg-[#2E2420] text-[#FFF1D6] border border-[#2E2420] hover:border-[#FF7A00] transition"
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
                className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Minimal Boxy Avatar */}
                <div
                  className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-[10px] border ${
                    isUser
                      ? 'bg-[#8C1D40] text-[#FFF1D6] border-[#E84A27]'
                      : 'bg-[#1A1614] text-[#FFB000] border-[#FF7A00]/50'
                  }`}
                >
                  {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                </div>

                {/* Boxy Message Bubble */}
                <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-3 py-2 text-xs leading-relaxed border ${
                      isUser
                        ? 'bg-[#8C1D40]/90 text-[#FFF1D6] border-[#E84A27]'
                        : 'bg-[#1A1614] text-[#FFF1D6] border-[#2E2420]'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Context Badges for Assistant */}
                  {!isUser && (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-[#8A7A70]">
                      {hasMemories ? (
                        <button
                          type="button"
                          onClick={() => toggleMemoryExpansion(index)}
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-[#1A1614] border border-[#8C1D40] text-[#FFB000] hover:border-[#FF7A00] transition"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-[#FFB000]" />
                          <span>{msg.memoriesUsed.length} memories used</span>
                          {isExpanded ? (
                            <ChevronUp className="w-2.5 h-2.5 ml-0.5" />
                          ) : (
                            <ChevronDown className="w-2.5 h-2.5 ml-0.5" />
                          )}
                        </button>
                      ) : (
                        <span className="text-[#8A7A70] text-[10px]">No prior memory needed</span>
                      )}

                      {msg.isFallback && (
                        <span
                          title="Generated using local fallback logic"
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-[#8C1D40]/50 border border-[#E84A27] text-[#FFF1D6] text-[9px]"
                        >
                          <AlertCircle className="w-2.5 h-2.5 text-[#FFB000]" />
                          Fallback
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded Memory Drawer */}
                  {!isUser && hasMemories && isExpanded && (
                    <div className="mt-1.5 p-2 w-full bg-[#12100E] border border-[#8C1D40] text-[11px] space-y-1">
                      <div className="font-mono text-[#FFB000] text-[10px] uppercase">
                        Top-5 Retrieved Context:
                      </div>
                      <ul className="space-y-0.5 text-[#FFF1D6]/80">
                        {msg.memoriesUsed.map((memStr, mIdx) => (
                          <li key={mIdx} className="flex items-start gap-1">
                            <span className="text-[#FF7A00]">•</span>
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
          <div className="flex items-center gap-2 text-[#8A7A70] text-[11px] py-1">
            <div className="w-5 h-5 bg-[#8C1D40] border border-[#E84A27] flex items-center justify-center">
              <Bot className="w-3 h-3 text-[#FFB000] animate-pulse" />
            </div>
            <div className="flex items-center gap-1 bg-[#1A1614] px-2 py-1 border border-[#2E2420] text-[#FFB000] font-mono text-[10px]">
              <span>RETRIEVING TOP 5 & GENERATING...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Demo Prompt Quick Bar */}
      {messages.length > 0 && (
        <div className="px-3 py-1.5 bg-[#171311] border-t border-[#2E2420] flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-[10px] text-[#8A7A70] font-mono uppercase whitespace-nowrap">Try:</span>
          {SAMPLE_DEMO_PROMPTS.slice(1).map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePromptClick(prompt.text)}
              className="text-[10px] whitespace-nowrap px-2 py-0.5 bg-[#1A1614] hover:bg-[#2E2420] text-[#FFF1D6] border border-[#2E2420] hover:border-[#FF7A00] transition"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      )}

      {/* Text Input Form */}
      <form onSubmit={handleSubmit} className="p-2.5 bg-[#1A1614] border-t border-[#2E2420] flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message or click mic above to speak..."
          disabled={isProcessing}
          className="flex-1 bg-[#12100E] border border-[#2E2420] px-3 py-2 text-xs text-[#FFF1D6] placeholder-[#8A7A70] focus:outline-none focus:border-[#FF7A00] transition rounded-none"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isProcessing}
          className={`flex items-center justify-center px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-none transition ${
            inputText.trim() && !isProcessing
              ? 'bg-[#E84A27] hover:bg-[#FF7A00] text-[#FFF1D6] border border-[#FFB000]'
              : 'bg-[#171311] text-[#8A7A70] border border-[#2E2420] cursor-not-allowed'
          }`}
        >
          <Send className="w-3.5 h-3.5 mr-1" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
