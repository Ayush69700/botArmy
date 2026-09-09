import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Send,
  AlertCircle,
  History,
  Bot,
  User,
  Radio
} from 'lucide-react';
import VoiceOrbVisualizer from './VoiceOrbVisualizer.jsx';

const SAMPLE_DEMO_PROMPTS = [
  { label: '👋 Greeting', text: "Hey! I'm pretty tired from coding all night for the hackathon." },
  { label: '👩‍💼 Family Fact', text: "My sister Maya is packing her bags to move to Seattle next month." },
  { label: '🎵 Ask Music', text: "What kind of music should I put on right now to focus?" },
  { label: '🧠 Test Recall', text: "Do you remember what my sister Maya is doing?" },
  { label: '🍵 Preference', text: "I definitely prefer iced oat milk matchas over espresso drinks." }
];

export default function VoiceAssistantView({
  messages = [],
  onSendMessage,
  isProcessing = false,
  ttsEnabled,
  onToggleTts,
  isDark = true
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);
  const [inputText, setInputText] = useState('');
  const [expandedMemories, setExpandedMemories] = useState({});

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const accumulatedTextRef = useRef('');

  // SpeechRecognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          accumulatedTextRef.current += (accumulatedTextRef.current ? ' ' : '') + item[0].transcript.trim();
        } else {
          interim += item[0].transcript;
        }
      }
      setLiveTranscript(accumulatedTextRef.current + (interim ? ' ' + interim : ''));
    };

    recognition.onerror = (event) => {
      console.warn('[VoiceAssistant] Speech error:', event.error);
      if (event.error === 'not-allowed') {
        shouldListenRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch (e) {}
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    // Monitor speech synthesis speaking state
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setIsSpeaking(window.speechSynthesis.speaking);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Toggle listening button (manual control: click to start, click again to stop & send)
  const toggleListening = () => {
    if (!isSupported || !recognitionRef.current) {
      alert("Browser Speech Recognition is not supported. Please use Chrome or Edge!");
      return;
    }

    if (isListening) {
      shouldListenRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);

      const finalPhrase = accumulatedTextRef.current.trim() || liveTranscript.trim();
      if (finalPhrase) {
        onSendMessage(finalPhrase);
      }

      accumulatedTextRef.current = '';
      setLiveTranscript('');
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      accumulatedTextRef.current = '';
      setLiveTranscript('');
      shouldListenRef.current = true;
      setIsListening(true);

      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("[VoiceAssistant] Start error:", err);
      }
    }
  };

  const handleStopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handlePromptClick = (text) => {
    onSendMessage(text);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Get the latest user turn and assistant reply
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' || m.role === 'model');

  // Styling
  const bgCard = isDark ? 'bg-[#212121] border-[#383838]' : 'bg-white border-slate-200';
  const bgHeader = isDark ? 'bg-[#1E1E1E] border-[#383838]' : 'bg-slate-50 border-slate-200';
  const bgSubtle = isDark ? 'bg-[#2A2A2A] border-[#383838]' : 'bg-slate-100/70 border-slate-200';
  const textPrimary = isDark ? 'text-[#ECECEC]' : 'text-slate-900';
  const textMuted = isDark ? 'text-[#B4B4B4]' : 'text-slate-500';

  return (
    <div className={`flex flex-col h-full border rounded-none overflow-hidden shadow-sm ${bgCard}`}>
      {/* Top Header Bar */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between shrink-0 ${bgHeader}`}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></div>
          <span className={`text-xs font-semibold uppercase tracking-wider ${textPrimary}`}>
            Voice Core Interface
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60">
            Natural Speech Engine
          </span>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center gap-1.5">
          {isSpeaking && (
            <button
              type="button"
              onClick={handleStopSpeaking}
              className="flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-medium rounded-none shadow-sm transition"
              title="Stop voice speech output"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Voice</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleTts}
            title={ttsEnabled ? 'Voice output enabled' : 'Voice output muted'}
            className={`p-1.5 border transition rounded-none ${
              ttsEnabled
                ? 'bg-blue-600 text-white border-blue-600'
                : isDark
                ? 'bg-[#2A2A2A] text-slate-400 border-[#383838]'
                : 'bg-slate-100 text-slate-400 border-slate-300'
            }`}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            title="Toggle recent voice conversation history"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs border transition rounded-none ${
              showHistory
                ? 'bg-blue-600 text-white border-blue-600'
                : isDark
                ? 'bg-[#2A2A2A] hover:bg-[#333] text-slate-300 border-[#383838]'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History ({messages.length})</span>
          </button>
        </div>
      </div>

      {/* Main Center Stage */}
      <div className="flex-1 flex flex-col items-center justify-between p-4 overflow-y-auto min-h-0">
        {/* Top Space / Live Transcript Status */}
        <div className="w-full max-w-xl text-center min-h-[32px] flex items-center justify-center">
          {isListening ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/10 border border-red-500/30 text-red-500 text-xs font-mono animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>LISTENING TO YOUR VOICE (Click Big Button To Send)</span>
            </div>
          ) : isProcessing ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-500/30 text-blue-500 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
              <span>RETRIEVING TOP 5 & FORMULATING SPEECH...</span>
            </div>
          ) : isSpeaking ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-500/30 text-blue-500 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 animate-bounce" />
              <span>SPEAKING VOCAL RESPONSE</span>
            </div>
          ) : (
            <span className={`text-xs font-mono ${textMuted}`}>
              Press the central button to speak naturally. Context is bounded to top-5 memories.
            </span>
          )}
        </div>

        {/* Center: The Fluid Voice-Sensitive Globe & Equalizer */}
        <div className="flex flex-col items-center justify-center my-auto py-2 select-none">
          <VoiceOrbVisualizer
            isListening={isListening}
            isProcessing={isProcessing}
            isSpeaking={isSpeaking}
            isDark={isDark}
          />

          {/* Big Central Voice Button */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              disabled={isProcessing}
              title={isListening ? 'Click to stop listening and send' : 'Click to start speaking'}
              className={`relative flex items-center justify-center gap-3 px-8 py-4 border font-mono uppercase tracking-wider text-sm transition-all duration-200 rounded-none shadow-lg ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 ring-4 ring-red-500/30 scale-105'
                  : isProcessing
                  ? 'bg-blue-700/50 text-white border-blue-800 cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 hover:scale-[1.02]'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5 animate-pulse" />
                  <span className="font-bold">STOP & SEND VOICE</span>
                </>
              ) : isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>THINKING...</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  <span className="font-bold">TAP TO SPEAK</span>
                </>
              )}
            </button>

            {/* Hint Under Big Button */}
            <span className={`text-[11px] font-mono ${isListening ? 'text-red-500 font-semibold' : textMuted}`}>
              {isListening
                ? 'Speaking live... Click button again when finished speaking.'
                : 'Click button to begin continuous microphone listening'}
            </span>
          </div>
        </div>

        {/* Live Interim Transcript (Displays as user speaks) */}
        {isListening && liveTranscript && (
          <div className="w-full max-w-xl my-2 p-3 bg-red-500/10 border border-red-500/30 text-center">
            <span className="text-[10px] font-mono uppercase text-red-500 font-semibold block mb-1">
              Live Speech-to-Text:
            </span>
            <p className={`text-sm italic font-medium ${textPrimary}`}>
              "{liveTranscript}"
            </p>
          </div>
        )}

        {/* Spoken Dialogue Caption Cards (Latest Exchange) */}
        {!isListening && (lastUserMsg || lastAssistantMsg) && (
          <div className={`w-full max-w-xl p-4 border space-y-3 mt-2 ${bgSubtle}`}>
            {/* User Utterance */}
            {lastUserMsg && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[10px] font-mono uppercase block ${textMuted}`}>You Spoke:</span>
                  <p className={`text-sm font-medium leading-relaxed ${textPrimary}`}>
                    "{lastUserMsg.content}"
                  </p>
                </div>
              </div>
            )}

            {/* Companion Spoken Reply */}
            {lastAssistantMsg && (
              <div className="flex items-start gap-2.5 pt-2 border-t dark:border-[#383838] border-slate-200">
                <div className="w-6 h-6 bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[10px] font-mono uppercase block text-blue-600 dark:text-blue-400 font-semibold`}>
                    Companion Vocal Reply:
                  </span>
                  <p className={`text-sm leading-relaxed ${textPrimary}`}>
                    {lastAssistantMsg.content}
                  </p>

                  {/* Context Badges */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    {lastAssistantMsg.memoriesUsed && lastAssistantMsg.memoriesUsed.length > 0 ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-[11px] font-mono">
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        <span>{lastAssistantMsg.memoriesUsed.length} memories woven in context</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400">Zero memory needed</span>
                    )}

                    {lastAssistantMsg.isFallback && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[11px] font-mono">
                        <AlertCircle className="w-3 h-3" />
                        Fallback Reply
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Demo Prompts Pill Bar */}
        <div className="w-full max-w-xl mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] font-mono uppercase ${textMuted}`}>
              Quick Voice Test Prompts:
            </span>
            <button
              type="button"
              onClick={() => setShowKeyboardInput(!showKeyboardInput)}
              className={`text-[11px] font-mono underline ${textMuted} hover:${textPrimary}`}
            >
              {showKeyboardInput ? 'Hide Keyboard Input' : 'Type Message Instead'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_DEMO_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePromptClick(prompt.text)}
                disabled={isProcessing}
                className={`text-xs px-2.5 py-1 border transition rounded-none ${
                  isDark
                    ? 'bg-[#2A2A2A] hover:bg-[#333] text-[#ECECEC] border-[#383838] hover:border-blue-500'
                    : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200 hover:border-blue-400'
                }`}
              >
                {prompt.label}
              </button>
            ))}
          </div>

          {/* Optional Text Input Form */}
          {showKeyboardInput && (
            <form onSubmit={handleTextSubmit} className="mt-2 flex items-center gap-1.5">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message if you cannot use voice..."
                disabled={isProcessing}
                className={`flex-1 border px-3 py-1.5 text-xs focus:outline-none focus:border-blue-600 rounded-none ${
                  isDark ? 'bg-[#181818] border-[#383838] text-[#ECECEC]' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono uppercase font-semibold transition rounded-none shadow-sm disabled:opacity-50"
              >
                Send
              </button>
            </form>
          )}
        </div>
      </div>

      {/* History Drawer Modal / Accordion */}
      {showHistory && (
        <div className={`border-t p-3 max-h-48 overflow-y-auto space-y-2 ${bgHeader}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-mono uppercase font-semibold ${textPrimary}`}>
              Past Voice Dialogue History
            </span>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className={`text-xs font-mono underline ${textMuted}`}
            >
              Close History
            </button>
          </div>

          {messages.length === 0 ? (
            <p className={`text-xs ${textMuted}`}>No dialogue recorded yet.</p>
          ) : (
            messages.map((m, idx) => (
              <div key={idx} className="text-xs p-2 border dark:border-[#383838] border-slate-200 bg-white dark:bg-[#181818]">
                <span className={`font-mono font-bold uppercase text-[10px] ${
                  m.role === 'user' ? 'text-blue-600' : 'text-emerald-600'
                }`}>
                  {m.role === 'user' ? 'You' : 'Companion'}:
                </span>
                <p className={`mt-0.5 leading-relaxed ${textPrimary}`}>{m.content}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
