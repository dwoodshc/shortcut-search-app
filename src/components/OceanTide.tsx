/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * OceanTide.tsx — Canvas-based ocean tide animation. Renders a fullscreen fixed canvas
 * behind all content when the "dark" theme is active. Small silver particles drift
 * horizontally while their vertical position follows a travelling sine wave, creating
 * the gentle rise-and-fall motion of a sea surface.
 */
import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 900;
const FRAME_INTERVAL = 25; // ms between frames (~40fps) — increase to slow further

interface Particle {
  x: number;
  baseY: number;
  vx: number;         // slow horizontal drift speed
  amplitude: number;  // vertical oscillation height (px)
  wavelength: number; // horizontal distance per wave cycle (px)
  waveSpeed: number;  // how fast the wave travels
  phase: number;      // per-particle phase offset so they're not in sync
  size: number;       // radius (px)
  alpha: number;      // base opacity
  r: number;          // silver colour channels — slight per-particle variation
  g: number;
  b: number;
}

export default function OceanTide() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = 0;
    let elapsed = 0;
    let particles: Particle[] = [];

    const makeParticle = (w: number, h: number): Particle => {
      const tint = Math.floor(Math.random() * 30) - 10; // -10..+20
      return {
        x: Math.random() * (w + 200) - 100,
        baseY: Math.random() * h,
        vx: (Math.random() * 0.18 + 0.04) * (Math.random() > 0.35 ? 1 : -1),
        amplitude: Math.random() * 20 + 6,
        wavelength: Math.random() * 280 + 140,
        waveSpeed: Math.random() * 0.35 + 0.12,
        phase: Math.random() * Math.PI * 2,
        size: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.45 + 0.15,
        r: Math.min(255, 182 + tint),
        g: Math.min(255, 198 + tint),
        b: Math.min(255, 218 + tint),
      };
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: PARTICLE_COUNT }, () => makeParticle(canvas.width, canvas.height));
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = (timestamp: number) => {
      animId = requestAnimationFrame(draw);
      if (timestamp - lastTime < FRAME_INTERVAL) return;
      const delta = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      elapsed += delta;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Horizontal drift — wrap around edges
        p.x += p.vx;
        if (p.x < -120) p.x = canvas.width + 120;
        if (p.x > canvas.width + 120) p.x = -120;

        // Travelling sine wave: wave moves in the direction of drift
        const currentY = p.baseY + p.amplitude * Math.sin(p.x / p.wavelength - elapsed * p.waveSpeed + p.phase);

        // Gentle shimmer: brightness pulses softly over time
        const shimmer = 0.75 + 0.25 * Math.sin(elapsed * 1.8 + p.phase * 1.3);
        const effectiveAlpha = p.alpha * shimmer;

        ctx.beginPath();
        ctx.arc(p.x, currentY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${effectiveAlpha.toFixed(3)})`;
        ctx.fill();
      }
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
