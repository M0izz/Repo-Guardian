import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useFxMode } from '../utils/fxMode';
import { Check, RotateCcw } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const { fxMode, isReducedMotion } = useFxMode();
  const [isInView, setIsInView] = useState(false);
  const [replayKeys, setReplayKeys] = useState({ 0: 0, 1: 0, 2: 0 });
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleReplay = (idx: number) => {
    setReplayKeys(prev => ({ ...prev, [idx]: prev[idx as keyof typeof prev] + 1 }));
  };

  const scrollToCard = (idx: number) => {
    if (!carouselRef.current) return;
    const cards = carouselRef.current.children;
    if (cards[idx]) {
      (cards[idx] as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

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
      ],
      label: '01 Map'
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
      ],
      label: '02 Tour'
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
      ],
      label: '03 Ask'
    }
  ];

  const shouldAnimate = fxMode !== 'off' && !isReducedMotion && isInView;

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="w-full bg-[#08090A] text-[#F2F2F0] py-[120px] text-left relative overflow-hidden"
      style={{ scrollMarginTop: '96px', containerType: 'inline-size' }}
    >
      <div
        style={{
          width: 'min(1280px, 100% - 64px)',
          marginInline: 'auto'
        }}
      >
        {/* Header, left aligned */}
        <div className="mb-[56px] max-w-[1168px]">
          <div className="font-mono text-[12px] uppercase tracking-[0.12em] text-[#A5A79B] mb-3">
            HOW IT WORKS
          </div>
          <h2
            className="font-semibold text-[#F2F2F0] tracking-[-0.02em] leading-[1.1] mb-4 text-[clamp(34px,4vw,52px)]"
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

        {/* Rail (container width 1090px or more) */}
        <div className="hidden lg:block mb-[48px] relative">
          {/* Labels 12px above the line */}
          <div className="grid grid-cols-3 mb-[12px] font-mono text-[12px] text-[#A5A79B] px-1">
            {steps.map((s, i) => (
              <div key={i} className={i === 1 ? 'text-center' : i === 2 ? 'text-right' : 'text-left'}>
                {s.label}
              </div>
            ))}
          </div>

          {/* Track line */}
          <div className="relative w-full h-[1px] bg-[#23262C]">
            <motion.div
              className="absolute left-0 top-0 bottom-0 bg-[#E8D2B5]"
              initial={{ width: '0%' }}
              animate={shouldAnimate ? { width: '100%' } : { width: '100%' }}
              transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />
          </div>

          {/* 10px filled circles centered on the line */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-1 pointer-events-none">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-[10px] h-[10px] rounded-full bg-[#E8D2B5]"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={shouldAnimate ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.8 }}
              />
            ))}
          </div>
        </div>

        {/* Cards (Desktop Grid >= 1090px container) */}
        <div className="hidden lg:grid grid-cols-3 gap-[32px] items-stretch">
          {steps.map((step, idx) => (
            <div
              key={step.number}
              className="bg-[#0F1114] border border-[#23262C] hover:border-[#A5A79B]/35 rounded-[20px] p-[28px] flex flex-col justify-between shadow-xl min-w-0 transition-all duration-200 hover:-translate-y-1"
            >
              <div>
                {/* Eyebrow row with right-aligned Replay button */}
                <div className="flex items-center justify-between mb-4">
                  <div className="font-mono text-[13px]">
                    <span className="text-[#E8D2B5] font-bold">{step.number}</span> <span className="text-[#A5A79B]">· {step.teaser}</span>
                  </div>
                  <button
                    onClick={() => handleReplay(idx)}
                    aria-label="Replay animation"
                    className="w-[28px] h-[28px] rounded-full bg-[#1A1D22] border border-[#23262C] hover:border-[#E8D2B5] text-[#A5A79B] hover:text-[#E8D2B5] flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                    title="Replay animation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Illustration Stage */}
                <div className="relative w-full aspect-[360/260] bg-[#08090A] border border-[#23262C] rounded-[16px] overflow-hidden mb-5">
                  <div className="w-full h-full p-3 flex items-center justify-center">
                    {idx === 0 && <MapIllustration key={replayKeys[0]} shouldAnimate={shouldAnimate} />}
                    {idx === 1 && <TourIllustration key={replayKeys[1]} shouldAnimate={shouldAnimate} />}
                    {idx === 2 && <AskIllustration key={replayKeys[2]} shouldAnimate={shouldAnimate} />}
                  </div>
                </div>

                {/* Title */}
                <h3
                  className="text-[26px] font-semibold text-[#F2F2F0] tracking-tight leading-[1.2] mb-3"
                  style={{ textWrap: 'balance' }}
                >
                  {step.title}
                </h3>

                {/* Body */}
                <p className="text-[16.5px] text-[#A5A79B] leading-[1.65] max-w-[44ch] mb-6">
                  {step.body}
                </p>

                {/* Bullets */}
                <ul className="space-y-[10px]">
                  {step.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-3">
                      <div className="w-[16px] h-[16px] rounded-full bg-[#E8D2B5]/15 flex items-center justify-center shrink-0 mt-1">
                        <Check className="w-[10px] h-[10px] text-[#E8D2B5]" />
                      </div>
                      <span className="text-[14.5px] text-[#F2F2F0] leading-snug">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Below 1090px: Horizontal scroll-snap carousel */}
        <div className="block lg:hidden">
          <div
            ref={carouselRef}
            tabIndex={0}
            aria-label="How it works steps"
            onScroll={(e) => {
              const target = e.currentTarget;
              const scrollLeft = target.scrollLeft;
              const cardWidth = target.clientWidth * 0.86 + 16;
              const newIdx = Math.round(scrollLeft / cardWidth);
              setActiveCarouselIndex(Math.min(2, Math.max(0, newIdx)));
            }}
            className="flex overflow-x-auto snap-x snap-mandatory gap-[16px] pb-4 scrollbar-none focus:outline-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {steps.map((step, idx) => (
              <div
                key={step.number}
                className="bg-[#0F1114] border border-[#23262C] rounded-[20px] p-[28px] flex flex-col justify-between shrink-0 snap-center shadow-xl"
                style={{ width: 'min(420px, 86vw)' }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-mono text-[13px]">
                      <span className="text-[#E8D2B5] font-bold">{step.number}</span> <span className="text-[#A5A79B]">· {step.teaser}</span>
                    </div>
                    <button
                      onClick={() => handleReplay(idx)}
                      aria-label="Replay animation"
                      className="w-[28px] h-[28px] rounded-full bg-[#1A1D22] border border-[#23262C] hover:border-[#E8D2B5] text-[#A5A79B] hover:text-[#E8D2B5] flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                      title="Replay animation"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="relative w-full aspect-[360/260] bg-[#08090A] border border-[#23262C] rounded-[16px] overflow-hidden mb-5">
                    <div className="w-full h-full p-3 flex items-center justify-center">
                      {idx === 0 && <MapIllustration key={replayKeys[0]} shouldAnimate={shouldAnimate} />}
                      {idx === 1 && <TourIllustration key={replayKeys[1]} shouldAnimate={shouldAnimate} />}
                      {idx === 2 && <AskIllustration key={replayKeys[2]} shouldAnimate={shouldAnimate} />}
                    </div>
                  </div>

                  <h3 className="text-[26px] font-semibold text-[#F2F2F0] tracking-tight leading-[1.2] mb-3">
                    {step.title}
                  </h3>

                  <p className="text-[16.5px] text-[#A5A79B] leading-[1.65] mb-6">
                    {step.body}
                  </p>

                  <ul className="space-y-[10px]">
                    {step.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-3">
                        <div className="w-[16px] h-[16px] rounded-full bg-[#E8D2B5]/15 flex items-center justify-center shrink-0 mt-1">
                          <Check className="w-[10px] h-[10px] text-[#E8D2B5]" />
                        </div>
                        <span className="text-[14.5px] text-[#F2F2F0] leading-snug">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {[0, 1, 2].map(i => (
              <button
                key={i}
                onClick={() => {
                  setActiveCarouselIndex(i);
                  scrollToCard(i);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-colors cursor-pointer ${
                  activeCarouselIndex === i ? 'bg-[#E8D2B5]' : 'bg-[#23262C]'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Caption below the row */}
        <div className="mt-12 text-center text-[13px] text-[#A5A79B] font-mono">
          Illustrations are generic, not a real repository.
        </div>
      </div>
    </section>
  );
};

/* --- ILLUSTRATION 1: MAP --- */
function MapIllustration({ shouldAnimate }: { shouldAnimate: boolean }) {
  const [phase, setPhase] = useState(shouldAnimate ? 0 : 2);

  useEffect(() => {
    if (!shouldAnimate) {
      setPhase(2);
      return;
    }
    const t1 = setTimeout(() => setPhase(1), 1800);
    const t2 = setTimeout(() => setPhase(2), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [shouldAnimate]);

  const filteredIndices = [3, 7, 11, 14, 8];

  return (
    <svg viewBox="0 0 360 260" className="block w-full h-auto aspect-[360/260]" fill="none" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: 15 }).map((_, i) => {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const x = 12 + col * (56 + 10);
        const y = 24 + row * (36 + 10);
        const isFiltered = filteredIndices.includes(i);
        const isDimmed = phase >= 1 && isFiltered;
        const isConnectedHub = i === 6;

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width="56"
              height="36"
              rx="5"
              fill="#08090A"
              stroke={isConnectedHub && phase >= 2 ? '#E8D2B5' : isDimmed ? '#23262C' : '#A5A79B'}
              strokeWidth={isConnectedHub && phase >= 2 ? '2' : '1.5'}
              opacity={isDimmed ? 0.35 : 1}
            />
            <line x1={x + 8} y1={y + 12} x2={x + 32} y2={y + 12} stroke={isDimmed ? '#23262C' : '#A5A79B'} strokeWidth="1.5" strokeLinecap="round" />
            <line x1={x + 8} y1={y + 24} x2={x + 46} y2={y + 24} stroke={isDimmed ? '#23262C' : '#A5A79B'} strokeWidth="1.5" strokeLinecap="round" />
            
            {/* Sage diagonal strike for filtered tiles */}
            {isDimmed && (
              <line x1={x} y1={y} x2={x + 56} y2={y + 36} stroke="#A5A79B" strokeWidth="1.5" />
            )}
          </g>
        );
      })}

      {phase >= 2 && (
        <g>
          <path d="M40 42 L96 42 L96 78" stroke="#E8D2B5" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M152 42 L208 78" stroke="#E8D2B5" strokeWidth="1.5" strokeDasharray="3 3" />
        </g>
      )}

      {phase >= 1 && (
        <text x="180" y="190" fill="#A5A79B" fontSize="13" fontFamily="monospace" textAnchor="middle">
          Filtered
        </text>
      )}

      {phase >= 2 && (
        <g transform="translate(85, 218)">
          <rect width="190" height="28" rx="6" fill="#1A1D22" stroke="#6FCF97" strokeWidth="1.5" />
          <circle cx="16" cy="14" r="5" fill="#6FCF97" />
          <text x="32" y="18" fill="#6FCF97" fontSize="13" fontFamily="sans-serif" fontWeight="500">
            Pinned to one commit
          </text>
        </g>
      )}
    </svg>
  );
}

/* --- ILLUSTRATION 2: TOUR --- */
function TourIllustration({ shouldAnimate }: { shouldAnimate: boolean }) {
  const [rangeIdx, setRangeIdx] = useState(shouldAnimate ? 0 : 0);

  useEffect(() => {
    if (!shouldAnimate) return;
    const interval = setInterval(() => {
      setRangeIdx(prev => (prev + 1) % 3);
    }, 1400);
    return () => clearInterval(interval);
  }, [shouldAnimate]);

  return (
    <svg viewBox="0 0 360 260" className="block w-full h-auto aspect-[360/260]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="12" width="336" height="150" rx="8" fill="#08090A" stroke="#23262C" strokeWidth="1.5" />
      
      {Array.from({ length: 8 }).map((_, i) => {
        const y = 28 + i * 16;
        const isHighlighted = rangeIdx === Math.floor(i / 3);

        return (
          <g key={i}>
            {isHighlighted && (
              <rect x="18" y={y - 10} width="324" height="16" fill="rgba(242, 184, 75, 0.18)" stroke="#F2B84B" strokeWidth="1" rx="3" />
            )}
            <text x="26" y={y + 2} fill="#A5A79B" fontSize="13" fontFamily="monospace">
              {String(i + 1).padStart(2, '0')}
            </text>
            <line x1="56" y1={y - 2} x2={140 + (i % 3) * 40} y2={y - 2} stroke={isHighlighted ? '#F2B84B' : '#23262C'} strokeWidth="5" strokeLinecap="round" />
          </g>
        );
      })}

      <g transform="translate(130, 190)">
        {[0, 1, 2, 3, 4].map((_, i) => (
          <circle
            key={i}
            cx={i * 24}
            cy="0"
            r={i === rangeIdx ? '6' : '4'}
            fill={i === rangeIdx ? '#E8D2B5' : '#23262C'}
          />
        ))}
      </g>

      <g transform="translate(24, 226)">
        <rect width="312" height="6" rx="3" fill="#23262C" />
        <rect width={String(100 + rangeIdx * 106)} height="6" rx="3" fill="#E8D2B5" />
      </g>
    </svg>
  );
}

/* --- ILLUSTRATION 3: ASK --- */
function AskIllustration({ shouldAnimate }: { shouldAnimate: boolean }) {
  const [animStep, setAnimStep] = useState(shouldAnimate ? 0 : 2);

  useEffect(() => {
    if (!shouldAnimate) {
      setAnimStep(2);
      return;
    }
    const t1 = setTimeout(() => setAnimStep(1), 1200);
    const t2 = setTimeout(() => setAnimStep(2), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [shouldAnimate]);

  return (
    <svg viewBox="0 0 360 260" className="block w-full h-auto aspect-[360/260]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="12" width="160" height="30" rx="15" fill="#1A1D22" stroke="#23262C" strokeWidth="1.5" />
      <text x="24" y="31" fill="#F2F2F0" fontSize="13" fontFamily="sans-serif">
        Your question
      </text>

      <rect x="12" y="62" width="336" height="110" rx="8" fill="#08090A" stroke="#23262C" strokeWidth="1.5" />
      {[0, 1, 2, 3].map((i) => {
        const y = 80 + i * 20;
        const isAmber = animStep >= 1 && i === 1;
        return (
          <g key={i}>
            {isAmber && (
              <rect x="18" y={y - 10} width="324" height="18" fill="rgba(242, 184, 75, 0.18)" stroke="#F2B84B" strokeWidth="1" rx="3" />
            )}
            <line x1="28" y1={y} x2={120 + (i * 20) % 100} y2={y} stroke={isAmber ? '#F2B84B' : '#23262C'} strokeWidth="5" strokeLinecap="round" />
          </g>
        );
      })}

      {animStep >= 1 && (
        <motion.g
          initial={{ x: 20, y: 18, opacity: 0 }}
          animate={{ x: animStep === 1 ? 160 : 90, y: animStep === 1 ? 40 : 85, opacity: 1 }}
          transition={{ duration: 1.0 }}
        >
          <rect width="140" height="26" rx="5" fill={animStep === 2 ? '#6FCF97' : '#1A1D22'} fillOpacity="0.25" stroke={animStep === 2 ? '#6FCF97' : '#E8D2B5'} strokeWidth="1.5" />
          <text x="12" y="17" fill={animStep === 2 ? '#6FCF97' : '#E8D2B5'} fontSize="13" fontFamily="monospace">
            {animStep === 2 ? 'lines 12-24 ✓' : 'lines 12-24'}
          </text>
        </motion.g>
      )}

      <text x="180" y="212" fill="#E07A5F" fontSize="13" fontFamily="monospace" textAnchor="middle">
        Not found in this repo
      </text>

      <g opacity="0.35" transform="translate(0, 10)">
        <text x="80" y="240" fill="#A5A79B" fontSize="13" fontFamily="monospace">&lt;/&gt;</text>
        <text x="180" y="242" fill="#A5A79B" fontSize="13" fontFamily="monospace">&#123;?&#125;</text>
        <text x="280" y="238" fill="#A5A79B" fontSize="13" fontFamily="monospace">[ ]</text>
      </g>
    </svg>
  );
}
