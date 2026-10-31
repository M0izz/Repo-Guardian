import React, { useState, useEffect, useRef } from 'react';
import { ExperienceLevel, UserGoal, TourStop, ChatMessage, ContributionPlan } from './types';
import { CodeViewer } from './components/CodeViewer';
import { TourPlayer } from './components/TourPlayer';
import { ChatPanel } from './components/ChatPanel';
import { ContributionModal } from './components/ContributionModal';
import { GlyphFieldCanvas } from './components/GlyphFieldCanvas';
import { PathStream } from './components/PathStream';
import { RepoConstellation } from './components/RepoConstellation';
import { VoiceRing } from './components/VoiceRing';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RecordedTourPreview } from './components/RecordedTourPreview';
import { HowItWorksSection } from './components/HowItWorksSection';
import { useFxMode } from './utils/fxMode';
import { GitBranch, Mic, MicOff, RefreshCw, GitPullRequest, BookOpen, Layers, ShieldCheck, CheckCircle2, ChevronDown, Sparkles, Network, Bug, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function App() {
  const { fxMode } = useFxMode();
  const [repoUrl, setRepoUrl] = useState('https://github.com/octocat/Hello-World');
  const [typingCount, setTypingCount] = useState(0);
  const [level, setLevel] = useState<ExperienceLevel>('intermediate');
  const [goal, setGoal] = useState<UserGoal>('understand');
  const [isIngested, setIsIngested] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStage, setIngestStage] = useState('');
  const [streamFiles, setStreamFiles] = useState<Array<{ path: string; kept: boolean }>>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [micBlockedNotice, setMicBlockedNotice] = useState(false);

  const [repoId, setRepoId] = useState('');
  const [sha, setSha] = useState('');
  const [files, setFiles] = useState<Array<{ path: string; size: number }>>([]);
  const [fileContentMap, setFileContentMap] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState('');
  const [activeHighlight, setActiveHighlight] = useState<{ start: number; end: number } | undefined>(undefined);

  const [stops, setStops] = useState<TourStop[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  const [activeTab, setActiveTab] = useState<'tour' | 'chat'>('tour');
  const [showConstellation, setShowConstellation] = useState(false);

  // Modals
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [plan, setPlan] = useState<ContributionPlan | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);

  // Voice recording & settings state
  const [isListening, setIsListening] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<'webspeech' | 'wispr'>('webspeech');
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [bottomTextInput, setBottomTextInput] = useState('');

  const [sseEventsLog, setSseEventsLog] = useState<Array<any>>([]);
  const [lastStack, setLastStack] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRunIdRef = useRef<string>('');
  const [repoName, setRepoName] = useState('');
  const [hasReceivedCounts, setHasReceivedCounts] = useState(false);
  const [keptCount, setKeptCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [archTab, setArchTab] = useState<'index' | 'server' | 'router'>('index');
  const [archTourStop, setArchTourStop] = useState(0);
  const [archQuestionIndex, setArchQuestionIndex] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === '1') {
      setShowDebug(true);
    }

    const repoParam = params.get('repo');
    if (repoParam) {
      setRepoUrl(repoParam);
      handleIngest(repoParam);
    }

    const handleError = (event: ErrorEvent) => {
      console.error('Window error:', event.error?.stack || event.message);
      if (event.error?.stack) setLastStack(event.error.stack);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled rejection:', event.reason?.stack || event.reason);
      if (event.reason?.stack) setLastStack(event.reason.stack);
      else if (typeof event.reason === 'string') setLastStack(event.reason);
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleStartTour = (overrideUrl?: string) => {
    const targetUrl = overrideUrl || repoUrl;
    if (!targetUrl.trim()) return;

    if (!targetUrl.includes('github.com') && !targetUrl.includes('/')) {
      setLastError('Invalid URL: must be a github.com repository.');
      return;
    }

    const encoded = encodeURIComponent(targetUrl);
    const newWindow = window.open(`/?repo=${encoded}`, '_blank');
    if (!newWindow) {
      window.location.href = `/?repo=${encoded}`;
    }
  };

  const copyDebugReport = () => {
    const report = {
      stage: ingestStage,
      lastRequest,
      lastError,
      lastStack,
      userAgent: navigator.userAgent,
      last20Events: sseEventsLog
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setLastError('Debug report copied to clipboard!');
  };

  const handleIngest = async (overrideUrl?: string) => {
    const targetUrl = overrideUrl || repoUrl;
    if (!targetUrl.trim()) return;

    if (!targetUrl.includes('github.com') && !targetUrl.includes('/')) {
      setLastError('Invalid URL: must be a github.com repository.');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const runId = Math.random().toString(36).substring(2, 9);
    currentRunIdRef.current = runId;

    setIsIngesting(true);
    setLastError(null);
    setStreamFiles([]);
    setSha('');
    setRepoName('');
    setHasReceivedCounts(false);
    setKeptCount(0);
    setFilteredCount(0);
    setSseEventsLog([]);
    setLastRequest(`POST /api/repos/ingest -> ${targetUrl}`);
    setIngestStage('Connecting...');

    try {
      const response = await fetch('/api/repos/ingest?debug=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, level, goal, runId }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Ingestion request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Readable stream not supported');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          let eventType = 'message';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.substring(6).trim();
            if (line.startsWith('data:')) eventData = line.substring(5).trim();
          }

          if (eventData) {
            const parsed = JSON.parse(eventData);
            if (parsed.runId && parsed.runId !== currentRunIdRef.current) {
              continue; // ignore stale run events
            }

            setSseEventsLog(prev => [...prev.slice(-19), { eventType, eventData: parsed, timestamp: new Date().toISOString() }]);

            if (eventType === 'stage') {
              setIngestStage(parsed.stage);
            } else if (eventType === 'counts') {
              setHasReceivedCounts(true);
              setKeptCount(parsed.keptCount);
              setFilteredCount(parsed.filteredCount);
            } else if (eventType === 'path') {
              if (parsed?.path) {
                setStreamFiles(prev => [...prev, { path: parsed.path, kept: parsed.kept }]);
              }
            } else if (eventType === 'done') {
              if (parsed.repoName) setRepoName(parsed.repoName);
              setRepoId(parsed.repoId);
              setSha(parsed.sha);

              const mapRes = await fetch(`/api/repos/${parsed.repoId}/map`);
              const mapData = await mapRes.json();
              const validFiles = (mapData?.files || []).filter((f: any) => f && typeof f.path === 'string');
              setFiles(validFiles);

              const contentMap: Record<string, string> = {};
              validFiles.forEach((f: any) => {
                contentMap[f.path] = f.content || '';
              });
              setFileContentMap(contentMap);
              const readmeFile = validFiles.find((f: any) => f.path.toLowerCase().includes('readme'));
              if (readmeFile) {
                setActiveFile(readmeFile.path);
              } else if (validFiles.length > 0 && validFiles[0]?.path) {
                setActiveFile(validFiles[0].path);
              }

              const tourRes = await fetch(`/api/repos/${parsed.repoId}/tour`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              const tourData = await tourRes.json();
              setStops(tourData.stops || []);

              setIsIngested(true);
            } else if (eventType === 'error') {
              if (parsed.stack) setLastStack(parsed.stack);
              throw new Error(parsed.message || parsed.error || 'Ingestion failed');
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // ignore aborts
      console.error('Ingest error:', err?.stack || err);
      setLastError(err.message || 'Failed to ingest repository.');
      if (err?.stack) setLastStack(err.stack);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!repoId || !text.trim()) return;
    const userMsg: ChatMessage = { id: Math.random().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setIsAsking(true);

    try {
      const response = await fetch(`/api/repos/${repoId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text })
      });

      if (!response.ok) throw new Error('Q&A request failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Readable stream not supported');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullAnswer = '';
      let allCitations: string[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          let eventType = 'message';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.substring(6).trim();
            if (line.startsWith('data:')) eventData = line.substring(5).trim();
          }

          if (eventData) {
            const parsed = JSON.parse(eventData);
            if (eventType === 'sentence') {
              fullAnswer += (fullAnswer ? ' ' : '') + parsed.text;
              if (parsed.citations) {
                allCitations.push(...parsed.citations);
              }
              if (parsed.suggestions) {
                fullAnswer += `\n\nSuggested files:\n- ${parsed.suggestions.join('\n- ')}`;
              }
            }
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'assistant',
        text: fullAnswer || 'I could not find this in the repo.',
        citations: [...new Set(allCitations)]
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: Math.random().toString(), role: 'assistant', text: 'Error answering question.' }]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleJumpToCitation = (citation: string) => {
    const [fpath, range] = citation.split(':');
    if (fpath && fileContentMap[fpath]) {
      setActiveFile(fpath);
      if (range) {
        const [start, end] = range.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          setActiveHighlight({ start, end });
        }
      }
    }
  };

  const handleGeneratePlan = async (goalText: string) => {
    if (!repoId) return;
    setIsPlanLoading(true);
    try {
      const res = await fetch(`/api/repos/${repoId}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalText })
      });
      const data = await res.json();
      if (data.error) {
        setPlan({
          hypothesis: `${data.error}. Nearest files: ${data.nearestFiles?.join(', ') || 'None'}.`,
          filesToChange: [],
          filesToRead: (data.nearestFiles || []).map((f: string) => ({ path: f, lineRange: '1-10', reason: 'Nearest file candidate' })),
          testCommand: 'npm test',
          openRisks: ['Retrieval confidence was weak.'],
          maintainerQuestions: []
        });
      } else {
        setPlan(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlanLoading(false);
    }
  };

  const toggleVoice = () => {
    if (!isListening) {
      setIsListening(true);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setBottomTextInput(transcript);
            handleSendMessage(transcript);
            setIsListening(false);
          };
          recognition.onerror = () => {
            setIsListening(false);
            setMicBlockedNotice(true);
          };
          recognition.onend = () => setIsListening(false);
          recognition.start();
        } catch {
          setIsListening(false);
          setMicBlockedNotice(true);
        }
      } else {
        setIsListening(false);
        setMicBlockedNotice(true);
      }
    } else {
      setIsListening(false);
    }
  };

  if (!isIngested) {
    return (
      <div className="min-h-screen bg-[#08090A] text-[#F2F2F0] flex flex-col font-sans selection:bg-[#E8D2B5] selection:text-[#0A0A0A] relative">
        <div className="h-9 bg-[#0F1114] border-b border-[#23262C] px-6 flex items-center justify-between text-xs text-[#A5A79B] overflow-hidden select-none z-20">
          <span className="opacity-40 font-mono tracking-widest">[ ] { } &lt; &gt;</span>
          <span className="text-center font-code">Public repos only for now. Every answer cites file and line.</span>
          <span className="opacity-40 font-mono tracking-widest">&lt; &gt; { } [ ]</span>
        </div>

        {/* Sticky 64px nav */}
        <nav className="sticky top-0 z-50 h-16 px-8 border-b border-[#23262C] flex items-center justify-between bg-[#0F1114]/90 backdrop-blur-md">
          <div className="flex items-center gap-2 font-terminal-heading text-xl tracking-tight text-[#F2F2F0]">
            RepoGuide
          </div>
          <div className="flex items-center gap-6 text-sm text-[#A5A79B]">
            <a href="#how-it-works" className="hover:text-[#F2F2F0] transition-colors">How it works</a>
            <a href="#trust" className="hover:text-[#F2F2F0] transition-colors">Trust</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[#F2F2F0] transition-colors">GitHub</a>
            <button
              onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
              style={{ backgroundColor: '#E8D2B5', color: '#0A0A0A' }}
              className="px-5 py-2 rounded-full font-medium text-xs transition-transform hover:scale-105 shadow"
            >
              Try it
            </button>
          </div>
        </nav>

        {/* Hero with GlyphField canvas */}
        <div className="relative">
          <GlyphFieldCanvas isIngesting={isIngesting} ingestStage={ingestStage} typingTrigger={typingCount} />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
            <motion.h1
              initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="font-terminal-heading text-[36px] md:text-[56px] text-[#F2F2F0] mb-3 max-w-2xl leading-none pointer-events-auto"
            >
              Paste a repo. Hear it <span className="text-[#E8D2B5]">explained</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-[#A5A79B] text-sm md:text-base mb-8 max-w-xl pointer-events-auto"
            >
              An AI-powered code tutor that guides you through unfamiliar codebases with strict line-level citations.
            </motion.p>
          </div>
        </div>

        {/* Recorded Tour Preview directly below hero */}
        <RecordedTourPreview />

        {/* Under the field: input, controls, chips, PathStream */}
        <main className="flex-1 max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl bg-[#0F1114] border border-[#23262C] rounded-full p-2 flex items-center shadow-xl mb-2 focus-within:ring-2 focus-within:ring-[#E8D2B5] focus-within:ring-offset-2 focus-within:ring-offset-[#08090A]"
          >
            <input
              type="text"
              value={repoUrl}
              onChange={e => {
                setRepoUrl(e.target.value);
                setTypingCount(c => c + 1);
              }}
              placeholder="https://github.com/octocat/Hello-World"
              className="flex-1 bg-transparent px-6 font-code text-sm text-[#F2F2F0] placeholder-[#A5A79B] focus:outline-none h-[40px]"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStartTour()}
              style={{ backgroundColor: '#E8D2B5', color: '#0A0A0A' }}
              className="h-[44px] px-8 rounded-full font-medium text-sm transition-colors flex items-center gap-2 shrink-0 shadow cursor-pointer"
            >
              <span>Start tour</span>
            </motion.button>
          </motion.div>



          {lastError && (
            <div className="w-full max-w-2xl mt-4 bg-rose-950/60 border border-rose-800 text-rose-300 p-3 rounded-xl text-xs font-code">
              Error: {lastError}
            </div>
          )}

          {showDebug && (
            <div className="w-full max-w-2xl mt-4 bg-[#14171C] border border-[#23262C] p-4 rounded-xl text-left text-xs font-code text-[#A5A79B]">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#23262C]">
                <span className="text-[#F2F2F0] font-bold flex items-center gap-1.5"><Bug className="w-4 h-4 text-[#E8D2B5]" /> Debug Panel (?debug=1)</span>
                <button
                  onClick={copyDebugReport}
                  className="px-3 py-1 bg-[#E8D2B5] text-[#0A0A0A] rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Copy debug report
                </button>
              </div>
              <div className="space-y-1">
                <div><strong className="text-[#F2F2F0]">Current Stage:</strong> {ingestStage || 'Idle'}</div>
                <div><strong className="text-[#F2F2F0]">Last Request:</strong> {lastRequest || 'None'}</div>
                <div><strong className="text-[#F2F2F0]">Last Error:</strong> {lastError || 'None'}</div>
                {lastStack && <div className="mt-2 text-rose-400 whitespace-pre-wrap"><strong className="text-[#F2F2F0]">Stack:</strong><br />{lastStack}</div>}
              </div>
            </div>
          )}

          {/* Segmented controls */}
          <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            <div className="bg-[#0F1114] border border-[#23262C] rounded-xl p-2 flex items-center justify-between">
              <span className="text-xs text-[#A5A79B] uppercase tracking-wider px-2">Level</span>
              <div className="flex gap-1 relative">
                {(['beginner', 'intermediate', 'expert'] as ExperienceLevel[]).map(l => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors relative z-10 ${
                      level === l ? 'text-[#0A0A0A]' : 'text-[#A5A79B] hover:text-[#F2F2F0]'
                    }`}
                  >
                    {level === l && (
                      <motion.div
                        layoutId="levelIndicator"
                        style={{ backgroundColor: '#E8D2B5' }}
                        className="absolute inset-0 rounded-full z-[-1]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0F1114] border border-[#23262C] rounded-xl p-2 flex items-center justify-between">
              <span className="text-xs text-[#A5A79B] uppercase tracking-wider px-2">Goal</span>
              <div className="flex gap-1 relative">
                {(['understand', 'contribute', 'review'] as UserGoal[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors relative z-10 ${
                      goal === g ? 'text-[#0A0A0A]' : 'text-[#A5A79B] hover:text-[#F2F2F0]'
                    }`}
                  >
                    {goal === g && (
                      <motion.div
                        layoutId="goalIndicator"
                        style={{ backgroundColor: '#E8D2B5' }}
                        className="absolute inset-0 rounded-full z-[-1]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* How it works section (Full-bleed outside main) */}
        <HowItWorksSection />

        <main className="flex-1 max-w-4xl mx-auto px-6 flex flex-col items-center text-center relative z-20 w-full">

          {/* Why you can trust it */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            id="trust"
            className="w-full mb-20 bg-[#0F1114] border border-[#23262C] rounded-3xl p-8 text-left"
          >
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#A5A79B] mb-2">Verification</div>
            <h2 className="font-terminal-heading text-[48px] tracking-tight mb-6 text-[#F2F2F0]">Why you can trust it</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <ShieldCheck className="w-6 h-6 text-[#6FCF97]" />
                <h3 className="font-semibold text-sm text-[#F2F2F0]">Line-level citations</h3>
                <p className="text-sm text-[#A5A79B]">Every claim cites exact file and line ranges.</p>
                <button
                  onClick={() => handleStartTour('https://github.com/octocat/Hello-World')}
                  style={{ color: '#6FCF97', borderColor: 'rgba(111,207,151,0.4)', backgroundColor: 'rgba(111,207,151,0.1)' }}
                  className="font-code text-xs px-2.5 py-1 rounded-md border hover:bg-[#6FCF97]/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>README.md:1-5</span>
                </button>
              </div>

              <div className="space-y-3">
                <CheckCircle2 className="w-6 h-6 text-[#6FCF97]" />
                <h3 className="font-semibold text-sm text-[#F2F2F0]">Validated answers</h3>
                <p className="text-sm text-[#A5A79B]">Every citation is programmatically verified against the code tree.</p>
                <button
                  onClick={() => handleStartTour('https://github.com/octocat/Hello-World')}
                  style={{ color: '#6FCF97', borderColor: 'rgba(111,207,151,0.4)', backgroundColor: 'rgba(111,207,151,0.1)' }}
                  className="font-code text-xs px-2.5 py-1 rounded-md border hover:bg-[#6FCF97]/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>index.js:10-18</span>
                </button>
              </div>

              <div className="space-y-3">
                <Sparkles className="w-6 h-6 text-[#E8D2B5]" />
                <h3 className="font-semibold text-sm text-[#F2F2F0]">Honest abstention</h3>
                <p className="text-sm text-[#A5A79B]">Says "I could not find this in the repo" instead of guessing.</p>
                <span
                  style={{ color: '#E07A5F', borderColor: 'rgba(224,122,95,0.4)', backgroundColor: 'rgba(224,122,95,0.1)' }}
                  className="font-code text-xs px-2.5 py-1 rounded-md border inline-block"
                >
                  "I could not find this in the repo"
                </span>
              </div>
            </div>
          </motion.section>

          {/* Comparison section */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="w-full mb-20 text-left"
          >
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#A5A79B] mb-2">Comparison</div>
            <h2 className="font-terminal-heading text-[48px] tracking-tight mb-8 text-[#F2F2F0]">Why not just chat with a repo?</h2>
            <div className="bg-[#0F1114] border border-[#23262C] rounded-[24px] overflow-hidden shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-12 bg-[#1A1D22] border-b border-[#23262C] font-mono text-xs text-[#A5A79B] px-6 py-4">
                <div className="md:col-span-3 uppercase tracking-wider">Dimension</div>
                <div className="md:col-span-4 uppercase tracking-wider">Typical chat tool</div>
                <div className="md:col-span-5 uppercase tracking-wider text-[#E8D2B5]">RepoGuide</div>
              </div>

              <div className="divide-y divide-[#23262C]">
                {[
                  {
                    dim: 'Source of truth',
                    chat: 'Static text snippets',
                    repo: 'Pinned commit SHA + Symbol Chunks'
                  },
                  {
                    dim: 'Interaction',
                    chat: 'Type a prompt',
                    repo: 'Spoken guided tour + Voice interrupt'
                  },
                  {
                    dim: 'Proof',
                    chat: 'Sometimes cites files',
                    repo: 'Validated line-range citations'
                  }
                ].map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 px-6 py-5 items-center gap-4 hover:bg-[#14171C]/50 transition-colors">
                    <div className="md:col-span-3 font-semibold text-[#F2F2F0] text-sm">
                      {row.dim}
                    </div>
                    <div className="md:col-span-4 text-sm text-[#A5A79B] flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-rose-950/40 border border-rose-900/60 flex items-center justify-center shrink-0">
                        <X className="w-3.5 h-3.5 text-rose-400" />
                      </span>
                      <span>{row.chat}</span>
                    </div>
                    <div className="md:col-span-5 text-sm text-[#F2F2F0] flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-950/40 border border-emerald-900/60 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-[#6FCF97]" />
                      </span>
                      <span className="font-medium text-[#6FCF97]">{row.repo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        </main>

        {/* Debug Panel if ?debug=1 */}
        {showDebug && (
          <div className="fixed bottom-4 left-4 z-50 bg-[#0F1114] border border-[#23262C] p-4 rounded-xl text-xs font-code max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#23262C] text-[#E8D2B5]">
              <span className="flex items-center gap-1"><Bug className="w-3.5 h-3.5" /> Debug Panel</span>
              <button onClick={() => setShowDebug(false)} className="text-[#A5A79B]">×</button>
            </div>
            <p className="text-[#A5A79B]">Stage: <span className="text-[#F2F2F0]">{ingestStage || 'Idle'}</span></p>
            <p className="text-[#A5A79B] truncate">Last Req: <span className="text-[#F2F2F0]">{lastRequest || 'None'}</span></p>
            <p className="text-[#A5A79B] truncate">Last Err: <span className="text-rose-400">{lastError || 'None'}</span></p>
          </div>
        )}

        <footer className="py-8 px-8 border-t border-[#23262C] flex flex-col md:flex-row items-center justify-between text-xs text-[#A5A79B] bg-[#0F1114]">
          <p>RepoGuide — Public repositories only. Pinned commit SHAs for verified line accuracy.</p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <a href="#how-it-works" className="hover:text-[#F2F2F0]">How it works</a>
            <a href="#trust" className="hover:text-[#F2F2F0]">Trust</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[#F2F2F0]">GitHub</a>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#08090A] text-[#F2F2F0] flex flex-col overflow-hidden font-sans selection:bg-[#E8D2B5] selection:text-[#0A0A0A] relative">
      {/* Top Navbar */}
      <header className="h-14 bg-[#0F1114] border-b border-[#23262C] px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-terminal-heading text-xl text-[#F2F2F0]">
            RepoGuide
          </div>
          <span className="text-[#23262C]">|</span>
          <motion.span layoutId="repoPill" className="font-code text-xs text-[#E8D2B5] bg-[rgba(232,210,181,0.1)] border border-[rgba(232,210,181,0.3)] px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" /> {repoUrl} @ SHA {sha.substring(0, 7)}
          </motion.span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConstellation(true)}
            className="px-3 py-1.5 bg-[#1A1D22] hover:bg-[#23262C] text-[#E8D2B5] rounded-lg text-xs font-medium flex items-center gap-2 border border-[#23262C] transition-colors"
          >
            <Network className="w-3.5 h-3.5" /> Map View
          </button>

          {/* Voice settings menu */}
          <div className="relative">
            <button
              onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
              className="px-3 py-1.5 bg-[#1A1D22] hover:bg-[#23262C] text-[#F2F2F0] rounded-lg text-xs font-medium flex items-center gap-2 border border-[#23262C] transition-colors"
            >
              <span>Voice: {voiceProvider === 'webspeech' ? 'Web Speech' : 'Wispr Flow'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {isVoiceMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0F1114] border border-[#23262C] rounded-xl shadow-2xl py-1.5 z-50">
                <button
                  onClick={() => { setVoiceProvider('webspeech'); setIsVoiceMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between ${voiceProvider === 'webspeech' ? 'text-[#E8D2B5] bg-[#1A1D22]' : 'text-[#F2F2F0] hover:bg-[#1A1D22]'}`}
                >
                  <span>Web Speech (Active)</span>
                </button>
                <div className="relative group">
                  <button
                    disabled
                    className="w-full text-left px-3.5 py-2 text-xs text-[#A5A79B] opacity-50 cursor-not-allowed flex items-center justify-between"
                  >
                    <span>Wispr Flow</span>
                  </button>
                  <div className="absolute left-full ml-2 top-0 bg-[#1A1D22] border border-[#23262C] text-[11px] text-[#A5A79B] px-2.5 py-1 rounded shadow-lg whitespace-nowrap hidden group-hover:block z-50">
                    Needs Wispr API access
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsPlanModalOpen(true)}
            style={{ backgroundColor: '#E8D2B5', color: '#0A0A0A' }}
            className="px-4 py-1.5 rounded-full font-medium text-xs transition-transform hover:scale-105 shadow"
          >
            <GitPullRequest className="w-3.5 h-3.5 inline mr-1" /> Contribution Planner
          </button>

          <button
            onClick={() => setIsIngested(false)}
            className="p-1.5 rounded-lg bg-[#1A1D22] hover:bg-[#23262C] text-[#A5A79B] hover:text-[#F2F2F0] transition-colors border border-[#23262C]"
            title="Reset Repo"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main 2-Column Workspace (Left 55% Code, Right 45% Tour/Ask) with ErrorBoundaries */}
      {/* Main Workspace: Show PathStream ingestion view if not yet ingested, else 2-column workspace */}
      {!isIngested ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#08090A]">
          <div className="max-w-xl w-full text-center">
            <h2 className="text-2xl font-semibold mb-2 text-[#F2F2F0]">Ingesting Repository...</h2>
            <p className="text-sm text-[#A5A79B] mb-6">Parsing tree structure, filtering lockfiles, and pinning commit SHA.</p>
            <PathStream
              isIngesting={isIngesting}
              ingestStage={ingestStage}
              filesList={streamFiles}
              repoName={repoName}
              sha={sha}
              hasReceivedCounts={hasReceivedCounts}
              keptCount={keptCount}
              filteredCount={filteredCount}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
        {/* Left 55% (7 cols out of 12) */}
        <div className="lg:col-span-7 h-full overflow-hidden">
          <ErrorBoundary panelName="Code Viewer">
            <CodeViewer
              files={files}
              activeFile={activeFile}
              onSelectFile={setActiveFile}
              activeHighlight={activeHighlight}
              fileContentMap={fileContentMap}
            />
          </ErrorBoundary>
        </div>

        {/* Right 45% (5 cols out of 12) */}
        <div className="lg:col-span-5 flex flex-col h-full bg-[#0F1114] overflow-hidden border-l border-[#23262C]">
          {/* Tabs "Tour" and "Ask" */}
          <div className="flex border-b border-[#23262C] bg-[#08090A] px-4 py-2 gap-2 relative">
            <button
              onClick={() => setActiveTab('tour')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors relative z-10 ${
                activeTab === 'tour' ? 'text-[#E8D2B5]' : 'text-[#A5A79B] hover:text-[#F2F2F0]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Tour
              {activeTab === 'tour' && (
                <motion.div layoutId="tabIndicator" style={{ backgroundColor: '#E8D2B5' }} className="absolute bottom-0 left-0 right-0 h-0.5" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors relative z-10 ${
                activeTab === 'chat' ? 'text-[#E8D2B5]' : 'text-[#A5A79B] hover:text-[#F2F2F0]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Ask
              {activeTab === 'chat' && (
                <motion.div layoutId="tabIndicator" style={{ backgroundColor: '#E8D2B5' }} className="absolute bottom-0 left-0 right-0 h-0.5" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'tour' ? (
              <ErrorBoundary panelName="Tour Player">
                <TourPlayer
                  stops={stops}
                  currentStopIndex={currentStopIndex}
                  onSelectStop={setCurrentStopIndex}
                  onHighlightLines={setActiveHighlight}
                  onOpenFile={setActiveFile}
                  onJumpToCitation={handleJumpToCitation}
                  onInterrupt={() => {
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  }}
                />
              </ErrorBoundary>
            ) : (
              <ErrorBoundary panelName="Q&A Chat">
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onJumpToCitation={handleJumpToCitation}
                  isLoading={isAsking}
                />
              </ErrorBoundary>
            )}
          </div>

          {micBlockedNotice && (
            <div className="px-4 py-2 bg-amber-950/60 border-t border-amber-800 text-amber-200 text-xs font-code flex items-center justify-between">
              <span>Microphone access blocked or unavailable. You can use the text box below.</span>
              <button onClick={() => setMicBlockedNotice(false)} className="text-amber-400">×</button>
            </div>
          )}

          {/* Bottom Bar */}
          <div className="p-3 bg-[#08090A] border-t border-[#23262C] flex flex-col gap-2">
            <div className="flex items-center gap-2 relative">
              <textarea
                value={bottomTextInput}
                onChange={e => setBottomTextInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (bottomTextInput.trim()) {
                      handleSendMessage(bottomTextInput);
                      setBottomTextInput('');
                    }
                  }
                }}
                placeholder="Type or dictate a question..."
                rows={2}
                className="flex-1 bg-[#0F1114] border border-[#23262C] rounded-xl px-3 py-2 text-[15px] text-[#F2F2F0] placeholder-[#A5A79B] focus:outline-none focus:border-[#E8D2B5] resize-none"
              />
              <div className="relative">
                {isListening && <VoiceRing isListening={isListening} />}
                <button
                  onClick={toggleVoice}
                  style={isListening ? { backgroundColor: '#E07A5F', color: '#F2F2F0' } : { backgroundColor: '#1A1D22', color: '#F2F2F0' }}
                  className="px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 border border-[#23262C] hover:border-[#E8D2B5] transition-all h-[52px] shrink-0 relative z-10"
                >
                  {isListening ? <MicOff className="w-4 h-4 text-[#F2F2F0]" /> : <Mic className="w-4 h-4 text-[#E8D2B5]" />}
                  <span>{isListening ? 'Listening...' : 'Hold Space to talk'}</span>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#A5A79B] px-1 font-code">
              <span>Using Wispr Flow? Click the box and dictate.</span>
              <span>Press Enter to send</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {showConstellation && (
        <ErrorBoundary panelName="Map View">
          <RepoConstellation files={files} onSelectFile={(p) => { setActiveFile(p); setShowConstellation(false); }} onClose={() => setShowConstellation(false)} />
        </ErrorBoundary>
      )}

      <ErrorBoundary panelName="Contribution Planner">
        <ContributionModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          plan={plan}
          onGeneratePlan={handleGeneratePlan}
          isLoading={isPlanLoading}
        />
      </ErrorBoundary>
    </div>
  );
}
