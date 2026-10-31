import React, { useEffect, useRef } from 'react';

interface VoiceRingProps {
  isListening: boolean;
}

export const VoiceRing: React.FC<VoiceRingProps> = ({ isListening }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const spokes = 48;
    const radius = 60;
    const cx = 80;
    const cy = 80;

    const render = (now: number) => {
      ctx.clearRect(0, 0, 160, 160);

      for (let i = 0; i < spokes; i++) {
        const angle = (i / spokes) * 2 * Math.PI;
        const length = isListening ? 15 + Math.sin(now * 0.01 + i) * 12 : 8 + Math.cos(now * 0.002 + i) * 4;

        const x1 = cx + Math.cos(angle) * radius;
        const y1 = cy + Math.sin(angle) * radius;
        const x2 = cx + Math.cos(angle) * (radius + length);
        const y2 = cy + Math.sin(angle) * (radius + length);

        ctx.strokeStyle = isListening ? '#E8D2B5' : '#A5A79B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animId);
  }, [isListening]);

  return (
    <div className="absolute -inset-4 pointer-events-none flex items-center justify-center">
      <canvas ref={canvasRef} width={160} height={160} className="w-[160px] h-[160px]" />
    </div>
  );
};
