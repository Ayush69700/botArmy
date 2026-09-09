import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';

export default function VoiceControls({
  onTranscriptReady,
  ttsEnabled,
  onToggleTts,
  isProcessing,
  isDark = true
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [speechActive, setSpeechActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const accumulatedTextRef = useRef('');

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
      console.warn('[VoiceControls] Speech error:', event.error);
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

    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setSpeechActive(window.speechSynthesis.speaking);
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

  const toggleListening = () => {
    if (!isSupported || !recognitionRef.current) {
      alert("Browser Speech Recognition is not supported in this browser. Please use Chrome or Edge!");
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
        onTranscriptReady(finalPhrase);
      }

      accumulatedTextRef.current = '';
      setLiveTranscript('');
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      accumulatedTextRef.current = '';
      setLiveTranscript('');
      shouldListenRef.current = true;
      setIsListening(true);

      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("[VoiceControls] Start error:", err);
      }
    }
  };

  const handleStopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeechActive(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Live recording pill */}
      {isListening && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 text-white text-xs font-mono animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white"></span>
          <span>LISTENING (Click mic to stop)</span>
        </div>
      )}

      {/* Mic toggle button */}
      <button
        type="button"
        onClick={toggleListening}
        disabled={isProcessing}
        title={isListening ? 'Click to stop listening and send' : 'Click to start continuous listening'}
        className={`relative flex items-center justify-center w-8 h-8 rounded-none border transition ${
          isListening
            ? 'bg-red-600 text-white border-red-700'
            : isDark
            ? 'bg-[#2A2A2A] hover:bg-[#333] text-[#ECECEC] border-[#383838]'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
        }`}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      {/* TTS Toggle */}
      <button
        type="button"
        onClick={onToggleTts}
        title={ttsEnabled ? 'Voice response enabled' : 'Voice response muted'}
        className={`flex items-center justify-center w-8 h-8 rounded-none border transition ${
          ttsEnabled
            ? 'bg-blue-600 text-white border-blue-600'
            : isDark
            ? 'bg-[#2A2A2A] text-slate-400 border-[#383838]'
            : 'bg-slate-100 text-slate-400 border-slate-300'
        }`}
      >
        {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>

      {/* Stop Speaking */}
      {speechActive && (
        <button
          type="button"
          onClick={handleStopSpeaking}
          title="Stop voice playback"
          className="flex items-center gap-1 px-2.5 h-8 bg-amber-600 text-white border border-amber-700 text-xs font-medium"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>Stop</span>
        </button>
      )}
    </div>
  );
}
