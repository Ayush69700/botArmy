import React, { useEffect, useRef } from 'react';

/**
 * VoiceOrbVisualizer
 * Renders an interactive, voice-sensitive fluid globe and equalizer canvas.
 * Uses Web Audio API AnalyserNode when listening to react to real microphone frequencies.
 */
export default function VoiceOrbVisualizer({
  isListening = false,
  isProcessing = false,
  isSpeaking = false,
  isDark = true
}) {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const dataArrayRef = useRef(null);

  // Set up microphone stream when listening
  useEffect(() => {
    let active = true;

    if (isListening) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            if (!active) {
              stream.getTracks().forEach(t => t.stop());
              return;
            }
            mediaStreamRef.current = stream;
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioCtx();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);

            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
          })
          .catch((err) => {
            console.warn('[VoiceOrbVisualizer] Mic stream error:', err);
          });
      }
    } else {
      // Cleanup mic stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
    }

    return () => {
      active = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isListening]);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    const render = () => {
      phase += 0.035;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Measure audio intensity
      let volume = 0;
      let freqBins = [];
      if (isListening && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        let sum = 0;
        const count = dataArrayRef.current.length;
        for (let i = 0; i < count; i++) {
          sum += dataArrayRef.current[i];
        }
        volume = sum / (count * 255); // 0.0 to 1.0
        freqBins = Array.from(dataArrayRef.current.slice(0, 32));
      } else if (isSpeaking) {
        // Simulated voice rhythm for assistant speech
        volume = 0.25 + 0.2 * Math.sin(phase * 4) * Math.cos(phase * 2.5);
      } else if (isProcessing) {
        // Thinking rhythm
        volume = 0.15 + 0.08 * Math.sin(phase * 6);
      } else {
        // Idle calm breathing
        volume = 0.05 + 0.03 * Math.sin(phase * 1.5);
      }

      // Base radius based on canvas size
      const baseRadius = Math.min(width, height) * 0.24 + volume * 25;

      // 1. Outer Equalizer Radial Waves / Bars
      const numBars = 36;
      const angleStep = (Math.PI * 2) / numBars;
      ctx.save();
      ctx.translate(centerX, centerY);

      for (let i = 0; i < numBars; i++) {
        const angle = i * angleStep;
        let barHeight = 6;
        if (freqBins.length > 0) {
          const binVal = freqBins[i % freqBins.length] || 0;
          barHeight = 6 + (binVal / 255) * 45;
        } else if (isSpeaking) {
          barHeight = 6 + Math.abs(Math.sin(phase * 3 + i * 0.4)) * 32;
        } else if (isProcessing) {
          barHeight = 6 + (Math.sin(phase * 5 + i * 0.3) > 0.5 ? 16 : 4);
        } else {
          barHeight = 4 + Math.sin(phase + i * 0.5) * 3;
        }

        const startDist = baseRadius + 14;
        const endDist = startDist + barHeight;

        const x1 = Math.cos(angle) * startDist;
        const y1 = Math.sin(angle) * startDist;
        const x2 = Math.cos(angle) * endDist;
        const y2 = Math.sin(angle) * endDist;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 2.5;

        // Color coding
        if (isListening) {
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + (barHeight / 50) * 0.6})`; // Red pulse for mic
        } else if (isSpeaking) {
          ctx.strokeStyle = `rgba(37, 99, 235, ${0.4 + (barHeight / 40) * 0.6})`; // Deep royal blue
        } else if (isProcessing) {
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 + (barHeight / 30) * 0.5})`; // Blue pulse
        } else {
          ctx.strokeStyle = isDark
            ? `rgba(59, 130, 246, 0.25)`
            : `rgba(37, 99, 235, 0.22)`;
        }
        ctx.stroke();
      }
      ctx.restore();

      // 2. Soft Outer Ambient Glow
      const glowGrad = ctx.createRadialGradient(
        centerX, centerY, baseRadius * 0.4,
        centerX, centerY, baseRadius * 1.6
      );
      if (isListening) {
        glowGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
        glowGrad.addColorStop(0.6, 'rgba(239, 68, 68, 0.12)');
        glowGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else if (isProcessing) {
        glowGrad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        glowGrad.addColorStop(0.6, 'rgba(37, 99, 235, 0.12)');
        glowGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
      } else {
        glowGrad.addColorStop(0, 'rgba(37, 99, 235, 0.35)');
        glowGrad.addColorStop(0.6, 'rgba(37, 99, 235, 0.12)');
        glowGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
      }
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 3. Fluid Organic Globe Boundary (Deforming with harmonic waves)
      const numPoints = 64;
      const points = [];
      const waveFreq = isListening ? 6 : 4;
      const waveAmp = (isListening ? 12 : 6) + volume * 22;

      for (let i = 0; i < numPoints; i++) {
        const theta = (i / numPoints) * Math.PI * 2;
        // Harmonic noise simulation
        const offset =
          Math.sin(theta * waveFreq + phase * 2) * waveAmp * 0.6 +
          Math.cos(theta * 2 - phase * 1.5) * waveAmp * 0.4;
        const r = baseRadius + offset;
        points.push({
          x: centerX + Math.cos(theta) * r,
          y: centerY + Math.sin(theta) * r
        });
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < numPoints; i++) {
        const xc = (points[i].x + points[(i + 1) % numPoints].x) / 2;
        const yc = (points[i].y + points[(i + 1) % numPoints].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.closePath();

      // Globe Fill Gradient
      const orbGrad = ctx.createRadialGradient(
        centerX - baseRadius * 0.25,
        centerY - baseRadius * 0.25,
        baseRadius * 0.1,
        centerX,
        centerY,
        baseRadius * 1.1
      );

      if (isListening) {
        orbGrad.addColorStop(0, '#FCA5A5');
        orbGrad.addColorStop(0.4, '#EF4444');
        orbGrad.addColorStop(0.85, '#B91C1C');
        orbGrad.addColorStop(1, '#7F1D1D');
      } else if (isProcessing) {
        orbGrad.addColorStop(0, '#93C5FD');
        orbGrad.addColorStop(0.4, '#6366F1');
        orbGrad.addColorStop(0.85, '#2563EB');
        orbGrad.addColorStop(1, '#1E3A8A');
      } else {
        // Classic Aesthetic Blue Orb
        orbGrad.addColorStop(0, '#93C5FD');
        orbGrad.addColorStop(0.35, '#3B82F6');
        orbGrad.addColorStop(0.75, '#1D4ED8');
        orbGrad.addColorStop(1, '#1E3A8A');
      }

      ctx.fillStyle = orbGrad;
      ctx.fill();

      // Fluid border stroke
      ctx.lineWidth = 2;
      ctx.strokeStyle = isListening ? 'rgba(254, 202, 202, 0.7)' : 'rgba(191, 219, 254, 0.7)';
      ctx.stroke();

      // 4. Inner Plasma Highlights
      const highlightGrad = ctx.createRadialGradient(
        centerX - baseRadius * 0.35,
        centerY - baseRadius * 0.35,
        2,
        centerX - baseRadius * 0.35,
        centerY - baseRadius * 0.35,
        baseRadius * 0.5
      );
      highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      highlightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
      highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = highlightGrad;
      ctx.beginPath();
      ctx.arc(
        centerX - baseRadius * 0.35,
        centerY - baseRadius * 0.35,
        baseRadius * 0.5,
        0,
        Math.PI * 2
      );
      ctx.fill();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isListening, isProcessing, isSpeaking, isDark]);

  return (
    <div className="relative flex items-center justify-center w-full max-w-[340px] h-[300px] select-none pointer-events-none">
      <canvas
        ref={canvasRef}
        width={340}
        height={300}
        className="w-full h-full block"
      />
    </div>
  );
}
