import { useState, useEffect } from 'react';

export type FxMode = 'off' | 'lite' | 'full';

export function useFxMode(): { fxMode: FxMode; isReducedMotion: boolean } {
  const [fxMode, setFxMode] = useState<FxMode>('full');
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fxParam = params.get('fx');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(reducedMotionQuery.matches);

    if (fxParam === 'off' || fxParam === 'lite' || fxParam === 'full') {
      setFxMode(fxParam as FxMode);
    } else {
      const cores = navigator.hardwareConcurrency || 4;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (reducedMotionQuery.matches || isTouch || cores < 4) {
        setFxMode('lite');
      } else {
        setFxMode('full');
      }
    }

    // Frame-time watchdog
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const checkWatchdog = (now: number) => {
      frameCount++;
      const elapsed = now - lastTime;
      if (elapsed > 2000) {
        const avgFrameTime = elapsed / frameCount;
        if (avgFrameTime > 24 && fxMode === 'full') {
          setFxMode('lite');
        }
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(checkWatchdog);
    };

    animId = requestAnimationFrame(checkWatchdog);
    return () => cancelAnimationFrame(animId);
  }, []);

  return { fxMode, isReducedMotion };
}
