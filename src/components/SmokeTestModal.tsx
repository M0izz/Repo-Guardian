import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

interface SmokeTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmokeTestModal: React.FC<SmokeTestModalProps> = ({ isOpen, onClose }) => {
  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSmokeTests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/verify-smoke');
      const data = await res.json();
      setTestData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSmokeTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="text-base font-semibold text-slate-100">Smoke Test & Citation Verification</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-200">Smoke Test Suite Status</p>
              <p className="text-xs text-slate-400 mt-0.5">10 hand-written questions across 3 repositories (including unanswerable abstention tests).</p>
            </div>
            <button
              onClick={fetchSmokeTests}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Run Tests
            </button>
          </div>

          {testData && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-2">
                <span>Total: {testData.total}</span>
                <span className="text-emerald-400 font-semibold">Passed: {testData.passed} / {testData.total}</span>
              </div>

              <div className="space-y-2">
                {testData.results.map((r: any) => (
                  <div key={r.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-cyan-400 font-semibold">[{r.repo}]</span>
                        <span className="text-xs text-slate-200 font-medium">{r.question}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">{r.note}</p>
                    </div>
                    <span className="text-emerald-400 flex items-center gap-1 text-xs font-medium bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
