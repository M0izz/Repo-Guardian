import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle2 } from 'lucide-react';
import { useFxMode } from '../utils/fxMode';

export const RecordedTourPreview: React.FC = () => {
  const { fxMode, isReducedMotion } = useFxMode();
  const [tourData, setTourData] = useState<any>(null);
  const [activeStopIdx, setActiveStopIdx] = useState(0);
  const [activeSentenceIdx, setActiveSentenceIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    fetch('/demo/recorded-tour.json')
      .then(res => {
        if (!res.ok) throw new Error('recorded-tour.json not found');
        return res.json();
      })
      .then(data => {
        // Validation checks
        if (!data || !data.repo || !data.sha || !data.stops || !data.files) {
          console.warn('Validation failed: missing required fields');
          return;
        }
        if (data.stops.length < 4) {
          console.warn('Validation failed: fewer than 4 stops');
          return;
        }
        const allowedLicenses = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'CC0-1.0'];
        if (data.license && !allowedLicenses.includes(data.license) && !data.license.includes('MIT')) {
          console.warn('Validation failed: license not permitted for display:', data.license);
          return;
        }

        // Validate cited ranges and narration sentences
        for (const stop of data.stops) {
          const fileContent = data.files[stop.file];
          if (!fileContent) {
            console.warn('Validation failed: file content missing for', stop.file);
            return;
          }
          const lines = fileContent.split('\n');
          const { start, end } = stop.citedRange;
          if (start < 1 || end > lines.length || start > end) {
            console.warn('Validation failed: invalid cited range for', stop.file);
            return;
          }
          if (!stop.narrationSentences || stop.narrationSentences.length === 0) {
            console.warn('Validation failed: no narration sentences for', stop.file);
            return;
          }
          for (const s of stop.narrationSentences) {
            if (!s.range || s.range.start < start || s.range.end > end) {
              console.warn('Validation failed: narration sentence range out of bounds');
              return;
            }
          }
        }

        setTourData(data);
      })
      .catch(err => {
        console.warn('Recorded tour preview hidden:', err.message);
      });
  }, []);

  useEffect(() => {
    if (!tourData || isHovered || isReducedMotion || fxMode === 'off') return;
    const interval = setInterval(() => {
      setActiveSentenceIdx(prev => {
        const currentStop = tourData.stops[activeStopIdx];
        if (prev + 1 < currentStop.narrationSentences.length) {
          return prev + 1;
        } else {
          setActiveStopIdx(n => (n + 1) % tourData.stops.length);
          return 0;
        }
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [tourData, activeStopIdx, isHovered, isReducedMotion, fxMode]);

  if (!tourData) return null;

  const currentStop = tourData.stops[activeStopIdx] || tourData.stops[0];
  const currentSentence = currentStop.narrationSentences[activeSentenceIdx] || currentStop.narrationSentences[0];
  const fileContent = tourData.files[currentStop.file] || '';
  const lines = fileContent.split('\n');
  const citedStart = currentStop.citedRange.start;
  const citedEnd = currentStop.citedRange.end;
  const snippetLines = lines.slice(citedStart - 1, citedEnd);

  const sha7 = tourData.sha.substring(0, 7);

  return (
    <div
      className="w-full max-w-5xl mx-auto px-6 my-16"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-[#0F1114] border border-[#23262C] rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Top window bar */}
        <div className="h-11 bg-[#08090A] border-b border-[#23262C] px-4 flex items-center justify-between text-xs text-[#A5A79B]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-3 font-mono text-[#F2F2F0] opacity-80">{tourData.repo} @ {sha7}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#14171C] px-3 py-1 rounded-md border border-[#23262C] text-[#6FCF97]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">Recorded</span>
          </div>
        </div>

        {/* Replay Window Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px] text-left">
          {/* Left: real file tree of files used */}
          <div className="md:col-span-3 bg-[#08090A]/60 border-r border-[#23262C] p-4 text-xs font-mono text-[#A5A79B] space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-[#A5A79B]/60 mb-3">Replay Files</div>
            {tourData.stops.map((stop: any, idx: number) => (
              <div
                key={stop.file}
                onClick={() => { setActiveStopIdx(idx); setActiveSentenceIdx(0); }}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors truncate ${
                  activeStopIdx === idx ? 'bg-[#E8D2B5]/10 text-[#E8D2B5] border border-[#E8D2B5]/30' : 'hover:bg-[#14171C] text-[#A5A79B]'
                }`}
                title={stop.file}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">{stop.file}</span>
              </div>
            ))}
          </div>

          {/* Center: real code with real line numbers and cited range highlighted */}
          <div className="md:col-span-9 flex flex-col justify-between p-6 bg-[#0F1114]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-[#E8D2B5] bg-[#E8D2B5]/10 px-2.5 py-1 rounded border border-[#E8D2B5]/25">
                  {currentStop.title}
                </span>
                <span className="text-xs font-mono text-[#A5A79B]">
                  Lines {citedStart}–{citedEnd}
                </span>
              </div>

              {/* Code block */}
              <div className="bg-[#08090A] border border-[#23262C] rounded-xl p-4 font-mono text-xs text-[#F2F2F0] space-y-1 overflow-x-auto max-h-[220px] overflow-y-auto">
                {snippetLines.map((lineContent: string, sIdx: number) => {
                  const absoluteLineNum = citedStart + sIdx;
                  const isHighlighted = absoluteLineNum >= currentSentence.range.start && absoluteLineNum <= currentSentence.range.end;
                  return (
                    <div
                      key={sIdx}
                      className={`flex items-start gap-3 px-2 py-0.5 rounded ${
                        isHighlighted ? 'bg-[rgba(242,184,75,0.15)] border-l-2 border-[#F2B84B] text-[#F2B84B]' : 'text-[#A5A79B]'
                      }`}
                    >
                      <span className="w-8 text-right opacity-40 select-none">{absoluteLineNum}</span>
                      <span className="whitespace-pre">{lineContent || ' '}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Below code: Separate narration strip & citation chip */}
            <div className="mt-6 pt-4 border-t border-[#23262C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="text-[#F2F2F0] italic flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E8D2B5] animate-pulse shrink-0" />
                <span>"{currentSentence.text}"</span>
              </div>
              <div className="font-mono text-[11px] text-[#6FCF97] bg-[#6FCF97]/10 px-3 py-1 rounded border border-[#6FCF97]/30 shrink-0">
                {currentStop.file}:{currentSentence.range.start}-{currentSentence.range.end} ✓
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caption under window */}
      <div className="mt-3 text-center text-xs font-mono text-[#A5A79B]">
        Recorded from a real run: {tourData.repo} @ {sha7} ({tourData.license})
      </div>
    </div>
  );
};
