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
  const liveTranscriptRef = useRef('');
  const silenceTimerRef = useRef(null);

  // High-performance, low-latency SpeechRecognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1; // Reduces recognition overhead for lower latency
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      // Clear any pending silence timer on new sound
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Reconstruct transcript with zero latency across final + interim results
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscript += res[0].transcript + ' ';
        } else {
          interimTranscript += res[0].transcript;
        }
      }

      const combinedText = (finalTranscript + interimTranscript).trim();
      liveTranscriptRef.current = combinedText;
      setLiveTranscript(combinedText);

      // Instantaneously stream recognized speech directly into the prompt input field
      if (combinedText) {
        setInputText(combinedText);
      }
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
    }, 150);

    return () => {
      clearInterval(interval);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Stop listening and immediately send without buffer delays
  const stopListeningAndSend = (autoSend = true) => {
    shouldListenRef.current = false;
    setIsListening(false);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const textToSend = liveTranscriptRef.current.trim() || inputText.trim();
    if (autoSend && textToSend) {
      onSendMessage(textToSend);
      setInputText('');
      liveTranscriptRef.current = '';
      setLiveTranscript('');
    }
  };

  // Toggle listening button (starts voice input or instantly finishes and sends)
  const toggleListening = () => {
    if (!isSupported || !recognitionRef.current) {
      alert("Browser Speech Recognition is not supported. Please use Chrome or Edge!");
      return;
    }

    if (isListening) {
      stopListeningAndSend(true);
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      liveTranscriptRef.current = '';
      setLiveTranscript('');
      setInputText('');
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
    setInputText(text);
    onSendMessage(text);
  };

  const handleTextSubmit = (e) => {
    e?.preventDefault();
    const query = inputText.trim() || liveTranscriptRef.current.trim();
    if (!query || isProcessing) return;

    if (isListening) {
      shouldListenRef.current = false;
      setIsListening(false);
      try {
        recognitionRef.current?.abort();
      } catch (e) {}
    }

    onSendMessage(query);
    setInputText('');
    liveTranscriptRef.current = '';
    setLiveTranscript('');
  };

  const handleClearInput = () => {
    setInputText('');
    liveTranscriptRef.current = '';
    setLiveTranscript('');
    if (isListening) {
      toggleListening();
    }
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
            Low-Latency Speech Engine
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
        {/* Top Space / Live Status Banner */}
        <div className="w-full max-w-xl text-center min-h-[30px] flex items-center justify-center">
          {isListening ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/10 border border-red-500/40 text-red-500 text-xs font-mono animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="font-semibold">VOICE INPUT ACTIVE — STREAMING LIVE INTO PROMPT</span>
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
              Speak naturally via microphone or type in the prompt bar below. Context bounded to top-5 memories.
            </span>
          )}
        </div>

        {/* Center: The Crisp 3D Floating Sphere & Equalizer */}
        <div className="flex flex-col items-center justify-center my-auto py-2 select-none">
          <VoiceOrbVisualizer
            isListening={isListening}
            isProcessing={isProcessing}
            isSpeaking={isSpeaking}
            isDark={isDark}
          />

          {/* Big Central Voice Button */}
          <div className="mt-3 flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={toggleListening}
              disabled={isProcessing}
              title={isListening ? 'Click to stop listening and send prompt immediately' : 'Click to start speaking'}
              className={`relative flex items-center justify-center gap-3 px-8 py-3.5 border font-mono uppercase tracking-wider text-sm transition-all duration-200 rounded-none shadow-lg ${
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
                  <span className="font-bold">STOP & SEND PROMPT</span>
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
                ? 'Speaking live... Syllables stream immediately into prompt bar.'
                : 'Click button to dictate with ultra-low latency voice recognition'}
            </span>
          </div>
        </div>

        {/* Spoken Dialogue Caption Cards (Latest Exchange) */}
        {!isListening && (lastUserMsg || lastAssistantMsg) && (
          <div className={`w-full max-w-xl p-3.5 border space-y-2.5 my-2 ${bgSubtle}`}>
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
        <div className="w-full max-w-xl mt-1 mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] font-mono uppercase ${textMuted}`}>
              Quick Voice Test Prompts:
            </span>
            <span className={`text-[10px] font-mono ${textMuted}`}>
              Click to run demo
            </span>
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
        </div>

        {/* Permanent Real-Time Prompt Input Bar (Streams voice instantly into field) */}
        <div className="w-full max-w-xl">
          <form
            onSubmit={handleTextSubmit}
            className={`flex items-center gap-2 p-1.5 border shadow-sm ${
              isListening
                ? 'border-red-500 ring-2 ring-red-500/20 bg-red-950/10'
                : isDark
                ? 'bg-[#1C1C1C] border-[#383838]'
                : 'bg-white border-slate-300'
            }`}
          >
            {/* Direct Microphone Toggle in Prompt Bar */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={isProcessing}
              title={isListening ? "Click to stop listening and send" : "Click to speak prompt"}
              className={`flex items-center justify-center w-9 h-9 border transition shrink-0 rounded-none ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 animate-pulse'
                  : isDark
                  ? 'bg-[#2A2A2A] hover:bg-[#333] text-[#ECECEC] border-[#444]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-blue-500" />}
            </button>

            {/* Prompt Input Field (Synchronized in real-time with voice speech recognition) */}
            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isListening
                    ? "Listening... your voice appears here instantly..."
                    : "Speak or type your prompt here..."
                }
                disabled={isProcessing}
                className={`w-full px-2.5 py-1.5 text-xs font-sans focus:outline-none bg-transparent ${textPrimary}`}
              />
              {inputText && (
                <button
                  type="button"
                  onClick={handleClearInput}
                  title="Clear input"
                  className={`text-[11px] font-mono px-1.5 py-0.5 hover:text-red-500 ${textMuted}`}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!inputText.trim() && !isListening) || isProcessing}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono uppercase font-bold tracking-wider transition rounded-none shrink-0 ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : inputText.trim() && !isProcessing
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  : isDark
                  ? 'bg-[#2A2A2A] text-slate-500 border border-[#383838] cursor-not-allowed'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Send</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </>
              )}
            </button>
          </form>

          {/* Latency / Voice Status caption under prompt bar */}
          <div className="flex items-center justify-between px-1 mt-1">
            <span className={`text-[10px] font-mono ${isListening ? 'text-red-500 font-semibold animate-pulse' : textMuted}`}>
              {isListening
                ? '🔴 Live mic audio active — ultra-low latency transcription'
                : '💡 Tip: Click the mic in the bar or tap the 3D sphere to speak'}
            </span>
            <span className={`text-[10px] font-mono ${textMuted}`}>
              Continuous VAD enabled
            </span>
          </div>
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
