import React, { useEffect, useRef } from 'react';

/**
 * VoiceOrbVisualizer
 * Renders an ultra-crisp, high-DPI 3D floating sphere with volumetric shading,
 * realistic Fresnel edge glow, specular highlights, and voice-reactive equalizer orbits.
 * Canvas resolution scales automatically with window.devicePixelRatio to eliminate blurriness.
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

  // Main canvas animation loop with Retina high-DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    const CSS_WIDTH = 340;
    const CSS_HEIGHT = 300;

    const render = () => {
      // 1. High-DPI Canvas Buffer Sync (Eliminates blurriness on Retina / 4K / scaled displays)
      const dpr = window.devicePixelRatio || 1;
      const targetPixelWidth = Math.floor(CSS_WIDTH * dpr);
      const targetPixelHeight = Math.floor(CSS_HEIGHT * dpr);

      if (canvas.width !== targetPixelWidth || canvas.height !== targetPixelHeight) {
        canvas.width = targetPixelWidth;
        canvas.height = targetPixelHeight;
      }

      ctx.save();
      // Scale all drawing coordinates by DPR so everything renders at native display density
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, CSS_WIDTH, CSS_HEIGHT);

      phase += 0.032;

      // 2. Compute audio intensity
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
        volume = 0.28 + 0.18 * Math.sin(phase * 4.2) * Math.cos(phase * 2.8);
      } else if (isProcessing) {
        volume = 0.16 + 0.09 * Math.sin(phase * 5.5);
      } else {
        volume = 0.05 + 0.025 * Math.sin(phase * 1.6);
      }

      // 3. Smooth Floating Sine Wave Displacement (Center of Sphere)
      const centerX = CSS_WIDTH / 2;
      const floatYOffset = Math.sin(phase * 1.8) * 6;
      const centerY = CSS_HEIGHT / 2 + floatYOffset;

      // Sphere base radius (crisp, bounded expansion on speech)
      const sphereRadius = Math.min(CSS_WIDTH, CSS_HEIGHT) * 0.22 + volume * 18;

      // 4. Ambient Halo Glow Behind Sphere
      const haloRadius = sphereRadius * 1.7;
      const haloGrad = ctx.createRadialGradient(
        centerX, centerY, sphereRadius * 0.5,
        centerX, centerY, haloRadius
      );
      if (isListening) {
        haloGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
        haloGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.12)');
        haloGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else if (isProcessing) {
        haloGrad.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
        haloGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.12)');
        haloGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
      } else {
        haloGrad.addColorStop(0, 'rgba(37, 99, 235, 0.38)');
        haloGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.14)');
        haloGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
      }
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // 5. Outer Audio Equalizer Radial Beams (Precision Lines)
      const numBars = 40;
      const angleStep = (Math.PI * 2) / numBars;
      ctx.save();
      ctx.translate(centerX, centerY);

      for (let i = 0; i < numBars; i++) {
        const angle = i * angleStep;
        let barHeight = 4;
        if (freqBins.length > 0) {
          const binVal = freqBins[i % freqBins.length] || 0;
          barHeight = 4 + (binVal / 255) * 40;
        } else if (isSpeaking) {
          barHeight = 4 + Math.abs(Math.sin(phase * 3.5 + i * 0.45)) * 28;
        } else if (isProcessing) {
          barHeight = 4 + (Math.sin(phase * 6 + i * 0.4) > 0.4 ? 14 : 3);
        } else {
          barHeight = 3 + Math.sin(phase * 1.5 + i * 0.5) * 3;
        }

        const startDist = sphereRadius + 10;
        const endDist = startDist + barHeight;

        const x1 = Math.cos(angle) * startDist;
        const y1 = Math.sin(angle) * startDist;
        const x2 = Math.cos(angle) * endDist;
        const y2 = Math.sin(angle) * endDist;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 2.0;

        if (isListening) {
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 + (barHeight / 44) * 0.55})`;
        } else if (isSpeaking) {
          ctx.strokeStyle = `rgba(37, 99, 235, ${0.5 + (barHeight / 32) * 0.5})`;
        } else if (isProcessing) {
          ctx.strokeStyle = `rgba(99, 102, 241, ${0.4 + (barHeight / 20) * 0.6})`;
        } else {
          ctx.strokeStyle = isDark
            ? `rgba(96, 165, 250, 0.3)`
            : `rgba(37, 99, 235, 0.28)`;
        }
        ctx.stroke();
      }
      ctx.restore();

      // 6. Crisp Geometric 3D SPHERE (True pristine circle with 3D spherical lighting)
      // Light source located at top-left:
      const lightX = centerX - sphereRadius * 0.32;
      const lightY = centerY - sphereRadius * 0.32;

      // Base Volumetric Shading Gradient
      const sphereGrad = ctx.createRadialGradient(
        lightX,
        lightY,
        sphereRadius * 0.08,
        centerX,
        centerY,
        sphereRadius * 1.05
      );

      if (isListening) {
        // Vibrant 3D Crimson Sphere
        sphereGrad.addColorStop(0.0, '#FCA5A5'); // Specular highlight region
        sphereGrad.addColorStop(0.2, '#EF4444'); // Vibrant diffuse midtone
        sphereGrad.addColorStop(0.55, '#DC2626');
        sphereGrad.addColorStop(0.85, '#991B1B'); // Deep core shadow
        sphereGrad.addColorStop(1.0, '#450A0A'); // Shadowed limb
      } else if (isProcessing) {
        // High-energy Electric Violet/Indigo Sphere
        sphereGrad.addColorStop(0.0, '#E0E7FF');
        sphereGrad.addColorStop(0.2, '#818CF8');
        sphereGrad.addColorStop(0.55, '#4F46E5');
        sphereGrad.addColorStop(0.85, '#312E81');
        sphereGrad.addColorStop(1.0, '#1E1B4B');
      } else {
        // Deep Aesthetic Sapphire 3D Sphere
        sphereGrad.addColorStop(0.0, '#BAE6FD'); // Crisp cyan-white specular highlight
        sphereGrad.addColorStop(0.22, '#38BDF8'); // Sky blue diffuse
        sphereGrad.addColorStop(0.52, '#2563EB'); // Royal blue body
        sphereGrad.addColorStop(0.82, '#1D4ED8'); // Deep navy ambient core
        sphereGrad.addColorStop(1.0, '#0F172A'); // Midnight limb shadow
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // 7. Dynamic 3D Latitude Energy Rings (Adds authentic depth & sphere curvature)
      ctx.save();
      // Clip drawing strictly to sphere interior so rings follow sphere curvature perfectly
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2);
      ctx.clip();

      const numRings = 3;
      for (let r = 0; r < numRings; r++) {
        const ringPhase = phase + r * 1.2;
        const ringOffsetY = Math.sin(ringPhase) * (sphereRadius * 0.55);
        const ringWidth = Math.sqrt(Math.max(0, sphereRadius * sphereRadius - ringOffsetY * ringOffsetY));

        ctx.beginPath();
        ctx.ellipse(
          centerX,
          centerY + ringOffsetY,
          ringWidth * 0.95,
          sphereRadius * 0.22,
          0,
          0,
          Math.PI * 2
        );
        ctx.lineWidth = 1.2;
        if (isListening) {
          ctx.strokeStyle = `rgba(254, 202, 202, ${0.25 + 0.15 * Math.sin(phase * 2 + r)})`;
        } else if (isProcessing) {
          ctx.strokeStyle = `rgba(199, 210, 254, ${0.25 + 0.15 * Math.sin(phase * 2.5 + r)})`;
        } else {
          ctx.strokeStyle = `rgba(186, 230, 253, ${0.22 + 0.14 * Math.sin(phase * 2 + r)})`;
        }
        ctx.stroke();
      }

      // 8. 3D Specular Highlight Hotspot (Glossy shine on sphere curvature)
      const specGrad = ctx.createRadialGradient(
        lightX,
        lightY,
        1,
        lightX,
        lightY,
        sphereRadius * 0.42
      );
      specGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.92)');
      specGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.65)');
      specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.18)');
      specGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

      ctx.beginPath();
      ctx.arc(lightX, lightY, sphereRadius * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = specGrad;
      ctx.fill();

      // 9. Secondary Ambient Bounce Light (Bottom right rim glow from reflected light)
      const bounceX = centerX + sphereRadius * 0.42;
      const bounceY = centerY + sphereRadius * 0.42;
      const bounceGrad = ctx.createRadialGradient(
        bounceX,
        bounceY,
        2,
        bounceX,
        bounceY,
        sphereRadius * 0.45
      );
      if (isListening) {
        bounceGrad.addColorStop(0.0, 'rgba(254, 202, 202, 0.28)');
        bounceGrad.addColorStop(1.0, 'rgba(254, 202, 202, 0.0)');
      } else {
        bounceGrad.addColorStop(0.0, 'rgba(147, 197, 253, 0.28)');
        bounceGrad.addColorStop(1.0, 'rgba(147, 197, 253, 0.0)');
      }
      ctx.beginPath();
      ctx.arc(bounceX, bounceY, sphereRadius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = bounceGrad;
      ctx.fill();

      ctx.restore(); // Restore clip

      // 10. Crisp Fresnel Rim Outline (Razor-sharp perimeter edge)
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2);
      ctx.lineWidth = 2.0;
      if (isListening) {
        ctx.strokeStyle = 'rgba(254, 202, 202, 0.85)';
      } else if (isProcessing) {
        ctx.strokeStyle = 'rgba(199, 210, 254, 0.85)';
      } else {
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
      }
      ctx.stroke();

      ctx.restore(); // Restore DPR scale

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
    <div className="relative flex items-center justify-center w-[340px] h-[300px] select-none pointer-events-none">
      <canvas
        ref={canvasRef}
        style={{ width: 340, height: 300 }}
        className="block"
      />
    </div>
  );
}
