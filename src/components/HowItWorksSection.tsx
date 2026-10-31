import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFxMode } from '../utils/fxMode';
import { Check } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const { fxMode, isReducedMotion } = useFxMode();

  const steps = [
    {
      number: '01',
      teaser: 'Before it says a word.',
      title: 'It reads the whole repo first.',
      body: 'Paste a public GitHub link. RepoGuide pins one exact commit, skips what doesn\'t matter, and maps how the files connect, so every later answer points at code that really exists.',
      bullets: [
        'Pinned to one commit, so line numbers never drift',
        'Lockfiles, build output and binaries filtered out',
        'A map of which files depend on which'
      ]
    },
    {
      number: '02',
      teaser: 'A few stops, a few minutes.',
      title: 'Then it walks you through it.',
      body: 'A short spoken tour starts at the entry point and follows the code outward. Each sentence lights up the exact lines it is talking about, so you listen and read at the same time.',
      bullets: [
        'Stops are ordered by how the code depends on itself',
        'The current sentence and its lines highlight together',
        'Pause, go back or skip ahead any time'
      ]
    },
    {
      number: '03',
      teaser: 'Voice or text.',
      title: 'Interrupt anytime. It shows its proof.',
      body: 'Hold a key and ask out loud, or type. Every claim in the answer links to a file and line range that was checked against the real code. If it can\'t find support, it says so instead of guessing.',
      bullets: [
        'Citations are checked by code, not by the model',
        'Resume the tour exactly where you stopped',
        'Says "I could not find this in the repo" when evidence is weak'
      ]
    }
  ];

  return (
    <section
      id="how-it-works"
      className="w-full bg-[#08090A] text-[#F2F2F0] py-[120px] text-left"
    >
      <div className="max-w-[1232px] mx-auto px-[32px]">
        {/* Header Block */}
        <div className="mb-[64px] max-w-[1168px]">
          <div className="font-mono text-[12px] uppercase tracking-[0.12em] text-[#A5A79B] mb-3">
            HOW IT WORKS
          </div>
          <h2
            className="text-[36px] md:text-[52px] font-semibold text-[#F2F2F0] tracking-[-0.02em] leading-[1.1] mb-4"
            style={{ textWrap: 'balance' }}
          >
            Every codebase starts as a <span className="text-[#E8D2B5]">stranger</span>.
          </h2>
          <p
            className="text-[18px] text-[#A5A79B] leading-[1.6] max-w-[620px]"
            style={{ textWrap: 'pretty' }}
          >
            RepoGuide reads it first, then walks you through it, then proves what it says.
          </p>
        </div>

        {/* Horizontal 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {steps.map((step, idx) => (
            <div
              key={step.number}
              className="bg-[#0F1114] border border-[#23262C] rounded-[20px] p-8 flex flex-col justify-between shadow-xl min-w-0"
            >
              <div>
                {/* Header within card */}
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[14px] font-bold text-[#E8D2B5]">
                    {step.number}
                  </span>
                  <span className="font-mono text-[12px] text-[#A5A79B]">
                    {step.teaser}
                  </span>
                </div>

                <h3 className="text-[24px] font-semibold text-[#F2F2F0] tracking-tight leading-snug mb-3">
                  {step.title}
                </h3>

                <p className="text-[16px] text-[#A5A79B] leading-[1.65] mb-6">
                  {step.body}
                </p>

                <ul className="space-y-2.5 mb-8">
                  {step.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-3">
                      <div className="w-[16px] h-[16px] rounded-full bg-[#E8D2B5]/15 flex items-center justify-center shrink-0 mt-1">
                        <Check className="w-[10px] h-[10px] text-[#E8D2B5]" />
                      </div>
                      <span className="text-[14px] text-[#F2F2F0] leading-snug">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Illustration at bottom of card */}
              <div className="pt-6 border-t border-[#23262C]">
                <div className="bg-[#08090A] border border-[#23262C] rounded-[12px] p-4 mb-3">
                  {idx === 0 && <DesktopMapIllustration fxMode={fxMode} isReducedMotion={isReducedMotion} />}
                  {idx === 1 && <DesktopTourIllustration fxMode={fxMode} isReducedMotion={isReducedMotion} />}
                  {idx === 2 && <DesktopAskIllustration fxMode={fxMode} isReducedMotion={isReducedMotion} />}
                </div>
                <div className="text-center text-[12px] text-[#A5A79B] font-mono">
                  Illustration, not a real repository
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* --- SVG ILLUSTRATIONS --- */

function DesktopMapIllustration({ fxMode, isReducedMotion }: { fxMode: string; isReducedMotion: boolean }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (fxMode === 'off' || isReducedMotion) {
      setPhase(2);
      return;
    }
    const t1 = setTimeout(() => setPhase(1), 1500);
    const t2 = setTimeout(() => setPhase(2), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fxMode, isReducedMotion]);

  const filteredIndices = [3, 7, 11];

  return (
    <svg viewBox="0 0 340 240" className="block w-full h-auto aspect-[340/240]" fill="none" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: 12 }).map((_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const x = 16 + col * (72 + 12);
        const y = 16 + row * (44 + 12);
        const isFiltered = filteredIndices.includes(i);
        const isDimmed = phase >= 1 && isFiltered;
        const isHub = i === 5;

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width="72"
              height="44"
              rx="6"
              fill="#08090A"
              stroke={isHub && phase >= 2 ? '#E8D2B5' : isDimmed ? '#23262C' : '#A5A79B'}
              strokeWidth={isHub && phase >= 2 ? '2' : '1.5'}
              opacity={isDimmed ? 0.3 : 1}
            />
            <line x1={x + 10} y1={y + 14} x2={x + 40} y2={y + 14} stroke={isDimmed ? '#23262C' : '#A5A79B'} strokeWidth="1.5" strokeLinecap="round" />
            <line x1={x + 10} y1={y + 26} x2={x + 54} y2={y + 26} stroke={isDimmed ? '#23262C' : '#A5A79B'} strokeWidth="1.5" strokeLinecap="round" />
            
            {isDimmed && (
              <line x1={x} y1={y} x2={x + 72} y2={y + 44} stroke="#A5A79B" strokeWidth="1.5" />
            )}
          </g>
        );
      })}

      {phase >= 1 && (
        <text x="170" y="195" fill="#A5A79B" fontSize="13" fontFamily="monospace" textAnchor="middle">
          Filtered
        </text>
      )}

      {phase >= 2 && (
        <g transform="translate(70, 202)">
          <rect width="200" height="28" rx="6" fill="#1A1D22" stroke="#6FCF97" strokeWidth="1.5" />
          <circle cx="16" cy="14" r="5" fill="#6FCF97" />
          <text x="32" y="18" fill="#6FCF97" fontSize="13" fontFamily="sans-serif" fontWeight="500">
            Pinned to one commit
          </text>
        </g>
      )}
    </svg>
  );
}

function DesktopTourIllustration({ fxMode, isReducedMotion }: { fxMode: string; isReducedMotion: boolean }) {
  const [rangeIdx, setRangeIdx] = useState(0);

  useEffect(() => {
    if (fxMode === 'off' || isReducedMotion) return;
    const interval = setInterval(() => {
      setRangeIdx(prev => (prev + 1) % 3);
    }, 1600);
    return () => clearInterval(interval);
  }, [fxMode, isReducedMotion]);

  return (
    <svg viewBox="0 0 340 240" className="block w-full h-auto aspect-[340/240]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="16" width="308" height="150" rx="8" fill="#08090A" stroke="#23262C" strokeWidth="1.5" />
      
      {Array.from({ length: 8 }).map((_, i) => {
        const y = 30 + i * 16;
        const isHighlighted = rangeIdx === Math.floor(i / 3);

        return (
          <g key={i}>
            {isHighlighted && (
              <rect x="22" y={y - 10} width="296" height="16" fill="rgba(242, 184, 75, 0.15)" stroke="#F2B84B" strokeWidth="1" rx="3" />
            )}
            <text x="30" y={y + 2} fill="#A5A79B" fontSize="13" fontFamily="monospace">
              {String(i + 1).padStart(2, '0')}
            </text>
            <line x1="64" y1={y - 2} x2={160 + (i % 3) * 30} y2={y - 2} stroke={isHighlighted ? '#F2B84B' : '#23262C'} strokeWidth="5" strokeLinecap="round" />
          </g>
        );
      })}

      <g transform="translate(100, 185)">
        {[0, 1, 2].map((dot, i) => (
          <circle
            key={i}
            cx={i * 36}
            cy="0"
            r={i === rangeIdx ? '6' : '4'}
            fill={i === rangeIdx ? '#E8D2B5' : '#23262C'}
          />
        ))}
      </g>

      <g transform="translate(16, 212)">
        <rect width="308" height="6" rx="3" fill="#23262C" />
        <rect width={String(100 + rangeIdx * 104)} height="6" rx="3" fill="#E8D2B5" />
      </g>
    </svg>
  );
}

function DesktopAskIllustration({ fxMode, isReducedMotion }: { fxMode: string; isReducedMotion: boolean }) {
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    if (fxMode === 'off' || isReducedMotion) {
      setAnimStep(2);
      return;
    }
    const t1 = setTimeout(() => setAnimStep(1), 1200);
    const t2 = setTimeout(() => setAnimStep(2), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fxMode, isReducedMotion]);

  return (
    <svg viewBox="0 0 340 240" className="block w-full h-auto aspect-[340/240]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="16" width="220" height="32" rx="16" fill="#1A1D22" stroke="#23262C" strokeWidth="1.5" />
      <text x="28" y="37" fill="#F2F2F0" fontSize="13" fontFamily="sans-serif">
        Where are embeddings stored?
      </text>

      <rect x="16" y="62" width="308" height="120" rx="8" fill="#08090A" stroke="#23262C" strokeWidth="1.5" />
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 82 + i * 20;
        const isAmber = animStep >= 1 && i === 2;
        return (
          <g key={i}>
            {isAmber && (
              <rect x="22" y={y - 10} width="296" height="18" fill="rgba(242, 184, 75, 0.15)" stroke="#F2B84B" strokeWidth="1" rx="3" />
            )}
            <line x1="32" y1={y} x2="120 + (i * 15) % 90" y2={y} stroke={isAmber ? '#F2B84B' : '#23262C'} strokeWidth="5" strokeLinecap="round" />
          </g>
        );
      })}

      {animStep >= 1 && (
        <motion.g
          initial={{ x: 30, y: 30, opacity: 0 }}
          animate={{ x: animStep === 1 ? 140 : 80, y: animStep === 1 ? 60 : 110, opacity: 1 }}
          transition={{ duration: 1.0 }}
        >
          <rect width="160" height="26" rx="5" fill={animStep === 2 ? '#6FCF97' : '#1A1D22'} fillOpacity="0.2" stroke={animStep === 2 ? '#6FCF97' : '#E8D2B5'} strokeWidth="1.5" />
          <text x="12" y="17" fill={animStep === 2 ? '#6FCF97' : '#E8D2B5'} fontSize="13" fontFamily="monospace">
            {animStep === 2 ? 'src/db.ts:12-24 ✓' : 'src/db.ts:12-24'}
          </text>
        </motion.g>
      )}

      <text x="170" y="202" fill="#E07A5F" fontSize="13" fontFamily="monospace" textAnchor="middle">
        Not found in this repo
      </text>
    </svg>
  );
}
