import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';

export default function VoiceControls({
  onTranscriptReady,
  ttsEnabled,
  onToggleTts,
  isProcessing
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
      console.warn('[VoiceControls] Speech recognition event:', event.error);
      if (event.error === 'not-allowed') {
        shouldListenRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If user has NOT manually toggled it off, keep listening continuously
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Already running or starting
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    // Track speechSynthesis state
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
      alert("Browser Speech Recognition is not supported in this browser. Please use Chrome or Edge, or type in the chat box!");
      return;
    }

    if (isListening) {
      // User manually clicked to STOP listening -> finalize and send text
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
      // User clicked to START manual listening
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
    <div className="flex items-center gap-1.5">
      {/* Mic Status Indicator when listening */}
      {isListening && (
        <div className="flex items-center gap-1 px-2 py-1 bg-[#8C1D40] border border-[#FF7A00] text-[#FFF1D6] text-[10px] font-mono animate-pulse">
          <span className="w-1.5 h-1.5 bg-[#FFB000]"></span>
          <span>LISTENING (Click mic to stop)</span>
        </div>
      )}

      {/* Speech Recognition Toggle */}
      <button
        type="button"
        onClick={toggleListening}
        disabled={isProcessing}
        title={
          !isSupported
            ? 'Speech recognition not supported in this browser'
            : isListening
            ? 'Click to stop listening and send'
            : 'Click to start listening'
        }
        className={`relative flex items-center justify-center w-8 h-8 rounded-none border transition-all duration-150 ${
          isListening
            ? 'bg-[#E84A27] text-[#FFF1D6] border-[#FFB000] ring-1 ring-[#FFB000]'
            : isSupported
            ? 'bg-[#1A1614] hover:bg-[#2E2420] text-[#FFF1D6] border-[#2E2420] hover:border-[#FF7A00]'
            : 'bg-[#12100E] text-[#8A7A70] border-[#2E2420] cursor-not-allowed'
        }`}
      >
        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      </button>

      {/* Text-To-Speech Mute/Unmute Toggle */}
      <button
        type="button"
        onClick={onToggleTts}
        title={ttsEnabled ? 'Voice output enabled (click to mute)' : 'Voice output muted (click to enable)'}
        className={`flex items-center justify-center w-8 h-8 rounded-none border transition-all duration-150 ${
          ttsEnabled
            ? 'bg-[#1A1614] text-[#FFB000] border-[#FF7A00]/50 hover:bg-[#2E2420]'
            : 'bg-[#12100E] text-[#8A7A70] border-[#2E2420] hover:text-[#FFF1D6]'
        }`}
      >
        {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
      </button>

      {/* Stop Speaking Button (when active) */}
      {speechActive && (
        <button
          type="button"
          onClick={handleStopSpeaking}
          title="Stop reading response"
          className="flex items-center gap-1 px-2 h-8 rounded-none bg-[#8C1D40] text-[#FFF1D6] border border-[#FF7A00] text-[11px] font-medium"
        >
          <Square className="w-2.5 h-2.5 fill-current" />
          <span>Stop Voice</span>
        </button>
      )}
    </div>
  );
}
