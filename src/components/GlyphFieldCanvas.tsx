import React, { useEffect, useRef } from 'react';

interface GlyphFieldCanvasProps {
  isIngesting: boolean;
  ingestStage: string;
  typingTrigger?: number;
}

export const GlyphFieldCanvas: React.FC<GlyphFieldCanvasProps> = ({ isIngesting, ingestStage, typingTrigger }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rippleRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (typingTrigger) {
      rippleRef.current = {
        x: (canvasRef.current?.width || 800) / 2,
        y: (canvasRef.current?.height || 400) / 2,
        time: performance.now()
      };
    }
  }, [typingTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const params = new URLSearchParams(window.location.search);
    const fxOff = params.get('fx') === 'off';

    let animationFrameId: number;
    let isVisible = true;
    const glyphs = ['{', '}', '[', ']', '(', ')', '<', '>', '/', ';', '=', '.'];
    let cols = 0;
    let rows = 0;
    const cellSize = 14;

    let mouseX = -9999;
    let mouseY = -9999;
    const handleMouseMove = (e: MouseEvent) => {
      if (fxOff) return;
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');

    const updateDimensions = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const isMobile = width < 768;
      const height = isMobile ? 640 : 720; // Hero height constraint (min 640px, max 820px)

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      cols = Math.floor(width / cellSize);
      rows = Math.floor(height / cellSize);

      offCanvas.width = cols;
      offCanvas.height = rows;
      if (offCtx) {
        offCtx.fillStyle = '#000000';
        offCtx.fillRect(0, 0, cols, rows);
        offCtx.fillStyle = '#ffffff';
        // Wordmark size: 180px tall on desktop, 100px on mobile
        const fontSize = isMobile ? 100 : 180;
        offCtx.font = `bold ${fontSize}px sans-serif`;
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';
        offCtx.fillText('RepoGuide', cols / 2, rows / 2 - 40);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    const cellStates: Array<{
      glyph: string;
      lastSwap: number;
      swapInterval: number;
      brightHover: number;
    }> = [];

    for (let i = 0; i < 4000; i++) {
      cellStates.push({
        glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
        lastSwap: performance.now(),
        swapInterval: 2000 + Math.random() * 4000,
        brightHover: 0
      });
    }

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(canvas);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let lastTime = performance.now();
    let scanBandX = -100;

    const render = (now: number) => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const dt = now - lastTime;
      // 30fps cap when not interacting / low power if fx is lite or normal
      if (!fxOff && dt < 33) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '11px monospace';
      ctx.textBaseline = 'top';

      const imgData = offCtx ? offCtx.getImageData(0, 0, cols, rows).data : null;

      if (isIngesting && !fxOff) {
        scanBandX += 6;
        if (scanBandX > cols * cellSize) scanBandX = 0;
      }

      let cellIndex = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const state = cellStates[cellIndex % cellStates.length];
          cellIndex++;

          const x = c * cellSize;
          const y = r * cellSize;

          if (!fxOff && !prefersReducedMotion && now - state.lastSwap > state.swapInterval) {
            state.glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
            state.lastSwap = now;
            state.swapInterval = 2000 + Math.random() * 4000;
          }

          let isInsideText = false;
          if (imgData) {
            const idx = (r * cols + c) * 4;
            isInsideText = imgData[idx] > 128;
          }

          // Ripple effect from typing
          let rippleFactor = 0;
          if (rippleRef.current) {
            const rDist = Math.sqrt(Math.pow(x - rippleRef.current.x, 2) + Math.pow(y - rippleRef.current.y, 2));
            const elapsed = now - rippleRef.current.time;
            if (elapsed < 700) {
              const waveRadius = (elapsed / 700) * 400;
              if (Math.abs(rDist - waveRadius) < 40) {
                rippleFactor = Math.max(0, 1 - elapsed / 700);
              }
            } else {
              rippleRef.current = null;
            }
          }

          let brightHover = 0;
          if (!fxOff) {
            const dx = x + cellSize / 2 - mouseX;
            const dy = y + cellSize / 2 - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // 90px radius lantern
            if (dist < 90) {
              state.brightHover = 0.8;
            } else {
              state.brightHover = Math.max(0, state.brightHover - dt / 600);
            }
            brightHover = state.brightHover;
          }

          if (isInsideText) {
            // Cream #E8D2B5 at >=85% alpha (0.85 to 1.0)
            const shimmer = fxOff ? 0.95 : 0.85 + 0.15 * Math.sin(now * 0.002 + c * 0.1);
            ctx.fillStyle = `rgba(232, 210, 181, ${shimmer})`;
          } else if (rippleFactor > 0) {
            // Ripple cells brighten sage to cream
            ctx.fillStyle = `rgba(232, 210, 181, ${0.4 + rippleFactor * 0.5})`;
          } else if (brightHover > 0) {
            ctx.fillStyle = `rgba(232, 210, 181, ${0.3 + brightHover * 0.5})`;
          } else {
            // Ambient sage #A5A79B at 5-14% alpha
            const alpha = 0.05 + (Math.sin(c * 0.2 + r * 0.2) + 1) * 0.045;
            ctx.fillStyle = `rgba(165, 167, 155, ${alpha})`;
          }

          if (isIngesting && !fxOff && Math.abs(x - scanBandX) < 30) {
            ctx.fillStyle = 'rgba(232, 210, 181, 0.95)';
          }

          ctx.fillText(state.glyph, x + 2, y + 2);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      observer.disconnect();
    };
  }, [isIngesting]);

  return (
    <div className="relative w-full min-h-[640px] max-h-[820px] h-[calc(100vh-100px)] overflow-hidden bg-[#08090A] border-b border-[#23262C] flex items-center justify-center film-grain">
      {/* Static noise texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#F2F2F0_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Drifting cream radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[450px] h-[450px] md:w-[700px] md:h-[700px] rounded-full bg-[radial-gradient(circle,rgba(232,210,181,0.12)_0%,transparent_70%)] animate-pulse duration-[8000ms]" />
      </div>

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-auto opacity-95"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#08090A]/40 to-[#08090A] pointer-events-none" />
    </div>
  );
};
