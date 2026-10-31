import React, { useEffect, useRef } from 'react';
import { forceSimulation, forceManyBody, forceLink, forceCenter } from 'd3-force';
import { motion } from 'framer-motion';

interface RepoConstellationProps {
  files: Array<{ path: string; size: number }>;
  onSelectFile: (path: string) => void;
  onClose: () => void;
}

export const RepoConstellation: React.FC<RepoConstellationProps> = ({ files, onSelectFile, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width * (window.devicePixelRatio || 1);
    canvas.height = height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    // Build nodes & edges from real files
    const validFiles = (files || []).filter(f => f && typeof f.path === 'string');
    const topFiles = validFiles.slice(0, 150);
    const nodes = topFiles.map((f, i) => ({
      id: f.path,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
      radius: Math.max(4, Math.min(10, Math.sqrt(f.size) / 10)),
      glyph: f.path.endsWith('.py') ? '[' : f.path.endsWith('.js') || f.path.endsWith('.ts') ? '{' : '<'
    }));

    // Generate links based on directory proximity or naming
    const links: Array<{ source: string; target: string }> = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const partsA = nodes[i].id.split('/');
        const partsB = nodes[j].id.split('/');
        if (partsA[0] === partsB[0] && links.length < 300) {
          links.push({ source: nodes[i].id, target: nodes[j].id });
        }
      }
    }

    const simulation = forceSimulation(nodes as any)
      .force('charge', forceManyBody().strength(-40))
      .force('link', forceLink(links).id((d: any) => d.id).distance(45))
      .force('center', forceCenter(width / 2, height / 2))
      .on('tick', () => {
        ctx.clearRect(0, 0, width, height);

        // Draw links
        ctx.strokeStyle = 'rgba(165, 167, 155, 0.2)';
        ctx.lineWidth = 1;
        links.forEach((l: any) => {
          ctx.beginPath();
          ctx.moveTo(l.source.x, l.source.y);
          ctx.lineTo(l.target.x, l.target.y);
          ctx.stroke();
        });

        // Draw nodes
        nodes.forEach((n: any) => {
          ctx.fillStyle = '#E8D2B5';
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = '#F2F2F0';
          ctx.font = '10px monospace';
          ctx.fillText(n.id.split('/').pop() || '', n.x + n.radius + 4, n.y + 3);
        });
      });

    return () => {
      simulation.stop();
    };
  }, [files]);

  return (
    <div className="absolute inset-0 z-50 bg-[#08090A]/95 backdrop-blur-md flex flex-col p-6">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#23262C]">
        <h3 className="font-terminal-heading text-lg text-[#F2F2F0]">Repo Constellation Map ({files.length} files)</h3>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-full bg-[#1A1D22] text-[#F2F2F0] text-xs hover:bg-[#23262C] transition-colors"
        >
          Close Map
        </button>
      </div>
      <div className="flex-1 relative rounded-2xl overflow-hidden border border-[#23262C] bg-[#0F1114]">
        <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      </div>
    </div>
  );
};
