import React, { useState, useEffect } from 'react';
import { TourStop } from '../types';
import { Play, Pause, SkipForward, SkipBack, ShieldCheck, RotateCcw, FastForward } from 'lucide-react';
import { motion } from 'framer-motion';

interface TourPlayerProps {
  stops: TourStop[];
  currentStopIndex: number;
  onSelectStop: (index: number) => void;
  onHighlightLines: (range: { start: number; end: number }) => void;
  onOpenFile: (path: string) => void;
  onJumpToCitation: (citation: string) => void;
  onInterrupt: () => void;
}

export const TourPlayer: React.FC<TourPlayerProps> = ({
  stops,
  currentStopIndex,
  onSelectStop,
  onHighlightLines,
  onOpenFile,
  onJumpToCitation,
  onInterrupt
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [savedPosition, setSavedPosition] = useState<{ stop: number; sentence: number } | null>(null);

  const stop = stops[currentStopIndex] || stops[0];

  useEffect(() => {
    if (stop && stop.highlights && stop.highlights[currentSentenceIndex]) {
      onHighlightLines(stop.highlights[currentSentenceIndex] || stop.highlights[0]);
      onOpenFile(stop.file);
    }
  }, [currentStopIndex, currentSentenceIndex, stop]);

  useEffect(() => {
    let timer: any;
    if (isPlaying && stop) {
      timer = setInterval(() => {
        setCurrentSentenceIndex(prev => {
          if (prev < stop.narrationSentences.length - 1) {
            return prev + 1;
          } else {
            if (currentStopIndex < stops.length - 1) {
              onSelectStop(currentStopIndex + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 0;
            }
          }
        });
      }, 4500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentStopIndex, stop, stops.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      onInterrupt(); // Save position on play/interrupt
    }
  };

  const handleResume = () => {
    if (savedPosition) {
      onSelectStop(savedPosition.stop);
      setCurrentSentenceIndex(savedPosition.sentence);
      setIsPlaying(true);
      setSavedPosition(null);
    }
  };

  const handleGoBack = () => {
    setCurrentSentenceIndex(0);
    setIsPlaying(true);
  };

  const handleSkipAhead = () => {
    if (currentStopIndex < stops.length - 1) {
      onSelectStop(currentStopIndex + 1);
      setCurrentSentenceIndex(0);
      setIsPlaying(true);
    }
  };

  if (!stop) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#A5A79B] p-6 text-center">
        <p>No tour stops available for this repository yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0F1114] text-[#F2F2F0] p-6 overflow-y-auto">
      {/* Header & Stop Progress Dots */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#23262C]">
        <div>
          <h3 className="font-terminal-heading text-2xl text-[#F2F2F0]">{stop.title}</h3>
          <p className="font-code text-xs text-[#A5A79B] mt-1">{stop.file} : lines {stop.lineRange.start}-{stop.lineRange.end}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-[#1A1D22] text-[#E8D2B5] px-2 py-1 rounded border border-[#23262C]">
            Audio: Server-side TTS (cached)
          </span>
          <div className="flex items-center gap-1.5 bg-[#1A1D22] px-3 py-1.5 rounded-full border border-[#23262C]">
            {stops.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectStop(idx);
                  setCurrentSentenceIndex(0);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentStopIndex ? 'bg-[#E8D2B5] scale-125' : 'bg-[#23262C] hover:bg-[#A5A79B]'
                }`}
                title={`Stop ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Narration transcript sentences */}
      <div className="flex-1 space-y-4 bg-[#08090A] p-5 rounded-xl border border-[#23262C] overflow-y-auto mb-6 shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#A5A79B]">Narration Script</span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-[rgba(111,207,151,0.15)] text-[#6FCF97] border border-[#6FCF97]/40 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3 h-3" /> {stop.badge}
          </span>
        </div>

        {stop.narrationSentences.map((sentence, sIdx) => {
          const isCurrent = sIdx === currentSentenceIndex;
          return (
            <motion.p
              key={sIdx}
              animate={{ opacity: isCurrent ? 1 : 0.55 }}
              transition={{ duration: 0.3 }}
              style={{ fontSize: '17px', lineHeight: '1.6' }}
              className={`transition-all duration-300 relative ${
                isCurrent ? 'text-[#F2F2F0] font-medium pl-3 border-l-2 border-[#E8D2B5]' : 'text-[#F2F2F0]'
              }`}
            >
              {sentence}
            </motion.p>
          );
        })}
      </div>

      {/* Citations as green chips */}
      <div className="flex items-center gap-2 mb-6 text-xs flex-wrap">
        <span className="text-[#A5A79B] font-medium">Validated Citations:</span>
        {stop.citations.map((c, cIdx) => (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            key={cIdx}
            onClick={() => onJumpToCitation(c)}
            style={{ color: '#6FCF97', borderColor: 'rgba(111,207,151,0.4)', backgroundColor: 'rgba(111,207,151,0.1)' }}
            className="font-code text-xs px-2.5 py-1 rounded-md border hover:bg-[#6FCF97]/20 transition-colors flex items-center gap-1.5 shadow"
          >
            <span>{c}</span>
          </motion.button>
        ))}
      </div>

      {/* Interruption Controls: Resume, Go back, Skip ahead */}
      {savedPosition && (
        <div className="flex items-center gap-2 mb-4 bg-[#1A1D22] p-2.5 rounded-xl border border-[#23262C] justify-between text-xs">
          <span className="text-[#A5A79B]">Paused at Stop {savedPosition.stop + 1}, Sentence {savedPosition.sentence + 1}</span>
          <div className="flex gap-2">
            <button onClick={handleResume} className="px-3 py-1 rounded bg-[#E8D2B5] text-[#0A0A0A] font-medium">Resume</button>
            <button onClick={handleGoBack} className="px-3 py-1 rounded bg-[#08090A] text-[#F2F2F0] border border-[#23262C]">Go back</button>
            <button onClick={handleSkipAhead} className="px-3 py-1 rounded bg-[#08090A] text-[#F2F2F0] border border-[#23262C]">Skip ahead</button>
          </div>
        </div>
      )}

      {/* Compact Player Controls: 40px icon buttons */}
      <div className="flex items-center justify-center gap-3 bg-[#1A1D22] p-3 rounded-xl border border-[#23262C] mt-auto">
        <button
          onClick={() => {
            if (currentStopIndex > 0) {
              onSelectStop(currentStopIndex - 1);
              setCurrentSentenceIndex(0);
            }
          }}
          disabled={currentStopIndex === 0}
          className="w-10 h-10 rounded-lg bg-[#0F1114] hover:bg-[#23262C] disabled:opacity-30 text-[#F2F2F0] flex items-center justify-center transition-colors border border-[#23262C]"
          title="Previous Stop"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setSavedPosition({ stop: currentStopIndex, sentence: currentSentenceIndex });
            handlePlayPause();
          }}
          className="w-10 h-10 rounded-lg bg-[#E8D2B5] hover:bg-[#F1DFC7] text-[#0A0A0A] font-semibold flex items-center justify-center shadow-md transition-all"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        <button
          onClick={() => {
            if (currentStopIndex < stops.length - 1) {
              onSelectStop(currentStopIndex + 1);
              setCurrentSentenceIndex(0);
            }
          }}
          disabled={currentStopIndex === stops.length - 1}
          className="w-10 h-10 rounded-lg bg-[#0F1114] hover:bg-[#23262C] disabled:opacity-30 text-[#F2F2F0] flex items-center justify-center transition-colors border border-[#23262C]"
          title="Next Stop"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
