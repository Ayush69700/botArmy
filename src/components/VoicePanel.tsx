import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceState } from '../types';
import { VoiceOrb } from './VoiceOrb';

interface VoicePanelProps {
  onVoiceSpoken: (userText: string, aiReply: string, memoryRecall?: string) => void;
  isOpen?: boolean;
  onCloseMobile?: () => void;
}

const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export const VoicePanel: React.FC<VoicePanelProps> = ({
  onVoiceSpoken,
  isOpen = true,
  onCloseMobile,
}) => {
  const [state, setState] = useState<VoiceState>('listening');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Speak AI response aloud using SpeechSynthesis
  const speakResponse = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        if (onEnd) onEnd();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        if (onEnd) onEnd();
      }, 3500);
    }
  }, []);

  const handleProcessSpeech = useCallback(
    (spokenText: string) => {
      setState('thinking');
      setTranscript(spokenText);

      setTimeout(() => {
        let aiReply = "I've noted that down.";
        let memoryRecall: string | undefined = undefined;
        const lower = spokenText.toLowerCase();

        if (lower.includes('knee') || lower.includes('pain') || lower.includes('run') || lower.includes('injury')) {
          memoryRecall = 'remembered: knee injury — March';
          aiReply = "Make sure to keep your training low impact to protect that knee injury.";
        } else if (lower.includes('morning') || lower.includes('coffee') || lower.includes('early')) {
          memoryRecall = 'remembered: concise morning style';
          aiReply = 'Morning. Ready for today’s streamlined review?';
        } else if (lower.includes('marathon') || lower.includes('pace') || lower.includes('training')) {
          memoryRecall = 'remembered: half marathon goal';
          aiReply = 'Pacing is the secret to half marathon success. How are your rest intervals?';
        } else if (spokenText.trim().length > 0) {
          aiReply = `Understood. I will remember this for our future check-ins.`;
        }

        setState('speaking');
        onVoiceSpoken(spokenText || 'Voice message', aiReply, memoryRecall);

        speakResponse(aiReply, () => {
          setState('listening');
          setTranscript('');
        });
      }, 1400);
    },
    [onVoiceSpoken, speakResponse]
  );

  // Speech Recognition listener
  useEffect(() => {
    if (SpeechRecognition && state === 'listening' && !isMuted) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const currentTranscript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setTranscript(currentTranscript);

          if (event.results[0].isFinal) {
            handleProcessSpeech(currentTranscript);
          }
        };

        recognition.onerror = () => {
          // Handled gracefully
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        // Fallback
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [state, isMuted, handleProcessSpeech]);

  const handleInterrupt = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    if (state === 'speaking' || state === 'thinking') {
      setState('listening');
    } else if (state === 'listening') {
      setState('idle');
    } else {
      setState('listening');
    }
  };

  const getStateLabel = () => {
    switch (state) {
      case 'listening':
        return 'Listening…';
      case 'thinking':
        return 'Thinking…';
      case 'speaking':
        return 'Speaking…';
      case 'idle':
        return 'Voice Paused';
    }
  };

  // 12-bar dynamic equalizer
  const bars = [10, 18, 26, 14, 28, 22, 16, 30, 20, 12, 24, 15];

  return (
    <aside
      className={`fixed xl:static top-0 right-0 bottom-0 z-40 w-[310px] bg-card border-l border-line flex flex-col justify-between p-5 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-line/60">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue animate-pulse" />
          <h2 className="font-serif text-[15px] font-medium text-ink">
            Voice Station
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              isMuted
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-bg text-ink-dim hover:text-ink'
            }`}
          >
            {isMuted ? 'Muted' : 'Mic Active'}
          </button>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="xl:hidden p-1.5 rounded-md text-ink-dim hover:bg-bg"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Center Voice Visualizer */}
      <div className="flex flex-col items-center justify-center gap-5 my-auto">
        {/* Animated Glow Orb */}
        <div className="relative flex items-center justify-center p-2">
          <div
            className={`absolute inset-0 rounded-full bg-blue/15 filter blur-xl transition-all duration-700 ${
              state === 'speaking'
                ? 'scale-125 opacity-100'
                : state === 'listening'
                ? 'scale-110 opacity-70'
                : 'scale-90 opacity-30'
            }`}
          />
          <VoiceOrb state={state} onClick={handleInterrupt} />
        </div>

        {/* State Label */}
        <div className="flex flex-col items-center gap-1">
          <div className="font-serif text-[17px] text-ink font-normal tracking-wide">
            {getStateLabel()}
          </div>
          <p className="font-sans text-[11.5px] text-ink-dim">
            Tap orb anytime to interrupt
          </p>
        </div>

        {/* 12-bar dynamic equalizer */}
        <div className="h-8 flex items-end justify-center gap-[3px] px-4 py-1 bg-bg/80 rounded-full border border-line/60">
          {bars.map((h, i) => (
            <span
              key={i}
              className={`w-[2.5px] rounded-full transition-all duration-300 ${
                state === 'idle'
                  ? 'bg-line h-1.5'
                  : state === 'speaking'
                  ? 'bg-blue waveform-bar'
                  : 'bg-blue/70 waveform-bar'
              }`}
              style={{
                height: state === 'idle' ? '5px' : `${h}px`,
                animationDuration: state === 'speaking' ? '0.7s' : '1.3s',
                animationDelay: `${(i % 5) * 0.15}s`,
              }}
            />
          ))}
        </div>

        {/* Live speech preview if user is speaking */}
        {transcript && (
          <div className="w-full max-h-[80px] overflow-y-auto px-3 py-2 bg-blue-soft/70 border border-blue-line rounded-lg text-[12.5px] text-blue font-sans italic text-center">
            "{transcript}"
          </div>
        )}
      </div>

      {/* Bottom Voice Control */}
      <div className="pt-4 border-t border-line/60 flex flex-col gap-2">
        <button
          onClick={() => handleProcessSpeech("Can you check my training progress?")}
          className="w-full py-2.5 px-3 rounded-lg bg-bg hover:bg-blue-soft hover:text-blue border border-line text-[13px] text-ink font-sans transition-colors text-center"
        >
          🎙 Test Voice Prompt
        </button>
        <div className="text-[11px] text-ink-dim text-center">
          Web Speech API & Speech Synthesis ready
        </div>
      </div>
    </aside>
  );
};
