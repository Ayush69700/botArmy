import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceState } from '../types';
import { VoiceOrb } from '../components/VoiceOrb';

interface VoiceScreenProps {
  onSwitchToText: () => void;
  onVoiceSpoken?: (userText: string, aiReply: string, memoryRecall?: string) => void;
}

// Check for Web Speech API
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export const VoiceScreen: React.FC<VoiceScreenProps> = ({
  onSwitchToText,
  onVoiceSpoken,
}) => {
  const [state, setState] = useState<VoiceState>('listening');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Function to speak AI response aloud
  const speakResponse = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        if (onEnd) onEnd();
      };
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback timer if speech synthesis is unavailable
      setTimeout(() => {
        if (onEnd) onEnd();
      }, 3500);
    }
  }, []);

  // Process user speech input
  const handleUserSpokenInput = useCallback(
    (spokenText: string) => {
      setState('thinking');

      setTimeout(() => {
        let aiReply = "I've remembered that.";
        let memoryRecall: string | undefined = undefined;
        const lower = spokenText.toLowerCase();

        if (lower.includes('knee') || lower.includes('pain') || lower.includes('injury') || lower.includes('run')) {
          memoryRecall = 'remembered: knee injury — March';
          aiReply = "Take it easy on your knee today. Let me know if you want to adjust your training schedule.";
        } else if (lower.includes('morning') || lower.includes('coffee') || lower.includes('breakfast')) {
          memoryRecall = 'remembered: concise morning style';
          aiReply = 'Morning. Ready for your quick daily focus?';
        } else if (lower.includes('marathon') || lower.includes('running') || lower.includes('mile')) {
          memoryRecall = 'remembered: half marathon goal';
          aiReply = 'Consistency over intensity for the half marathon. How is your heart rate holding up?';
        } else if (spokenText.trim().length > 0) {
          aiReply = `I understand. I'm keeping note of that for next time.`;
        } else {
          aiReply = "I'm right here with you whenever you want to talk.";
        }

        setState('speaking');

        if (onVoiceSpoken) {
          onVoiceSpoken(spokenText || 'Voice message', aiReply, memoryRecall);
        }

        speakResponse(aiReply, () => {
          setState('listening');
        });
      }, 1500);
    },
    [onVoiceSpoken, speakResponse]
  );

  // Initialize Speech Recognition if supported
  useEffect(() => {
    if (SpeechRecognition && state === 'listening') {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            handleUserSpokenInput(transcript);
          }
        };

        recognition.onerror = () => {
          // Ignore error, fallback handles simulation
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
  }, [state, handleUserSpokenInput]);

  // Simulated voice demo loop if speech recognition is idle
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (state === 'listening' && !recognitionRef.current) {
      // Auto-simulate after 6 seconds of listening if no audio hardware detected
      timer = setTimeout(() => {
        handleUserSpokenInput("I'm heading out for a 5k run today.");
      }, 6000);
    }

    return () => clearTimeout(timer);
  }, [state, handleUserSpokenInput]);

  const handleInterrupt = useCallback(() => {
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
  }, [state]);

  const getStateLabel = () => {
    switch (state) {
      case 'listening':
        return 'Listening…';
      case 'thinking':
        return 'Thinking…';
      case 'speaking':
        return 'Speaking…';
      case 'idle':
        return 'Ready';
    }
  };

  const showWaveform = state === 'listening' || state === 'speaking';
  const waveformDelays = ['0s', '0.2s', '0.4s', '0.1s', '0.3s', '0.25s'];
  const baseHeights = [8, 16, 11, 20, 9, 14];

  return (
    <div
      onClick={handleInterrupt}
      className="relative flex flex-col items-center justify-between h-full min-h-[460px] p-8 md:p-10 bg-card cursor-pointer select-none"
    >
      {/* Invisible top spacer for balance */}
      <div className="h-6" />

      {/* Center focus area */}
      <div className="flex flex-col items-center justify-center gap-5 my-auto">
        <VoiceOrb state={state} />

        {/* State Label in Serif */}
        <div className="font-serif font-normal text-[16px] text-ink text-center h-6">
          {getStateLabel()}
        </div>

        {/* Animated Waveform */}
        <div className="h-6 flex items-center justify-center">
          {showWaveform ? (
            <div className="flex gap-[3px] items-center h-6">
              {waveformDelays.map((delay, idx) => (
                <span
                  key={idx}
                  className="w-[3px] bg-blue rounded-full waveform-bar"
                  style={{
                    height: `${baseHeights[idx]}px`,
                    animationDelay: delay,
                    animationDuration: state === 'speaking' ? '0.75s' : '1.1s',
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="h-6" />
          )}
        </div>

        {/* Subtext */}
        <div className="font-sans text-[12px] text-ink-dim">
          Tap anywhere to interrupt
        </div>
      </div>

      {/* Bottom Switch to Text Button */}
      <div
        className="w-full flex justify-center pb-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            onSwitchToText();
          }}
          className="font-sans text-[12px] text-ink-dim bg-transparent border border-line rounded-pill px-[18px] py-[9px] hover:text-ink hover:border-ink-dim transition-colors"
        >
          ⌨ switch to text
        </button>
      </div>
    </div>
  );
};
