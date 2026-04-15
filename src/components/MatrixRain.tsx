/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * MatrixRain.tsx — Canvas-based Matrix digital rain animation. Renders a fullscreen
 * fixed canvas behind all other content when the "matrix" theme is active. Uses a mix
 * of katakana and ASCII characters to replicate the iconic falling-code effect.
 */
import { useEffect, useRef } from 'react';

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*<>[]{}';
const FONT_SIZE = 14;

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let drops: number[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const cols = Math.floor(canvas.width / FONT_SIZE);
      // Preserve existing drops, initialise new columns randomly off-screen top
      while (drops.length < cols) {
        drops.push(Math.floor(Math.random() * -(canvas.height / FONT_SIZE)));
      }
      drops.length = cols;
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      // Fade each frame with a semi-transparent black fill — creates the trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px 'Courier New', Courier, monospace`;

      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * FONT_SIZE;
        if (y > 0 && y < canvas.height + FONT_SIZE) {
          const char = CHARS[Math.floor(Math.random() * CHARS.length)];
          // Head character: bright near-white; rest of column: Matrix green
          ctx.fillStyle = (drops[i] <= 1) ? '#CCFFCC' : (Math.random() > 0.97 ? '#88FF88' : '#00FF41');
          ctx.fillText(char, i * FONT_SIZE, y);
        }

        // Reset column to top at a random chance once it passes the bottom
        if (drops[i] * FONT_SIZE > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animId = requestAnimationFrame(draw);
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
