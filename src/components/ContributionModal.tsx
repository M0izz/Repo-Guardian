import React, { useState } from 'react';
import { ContributionPlan } from '../types';
import { X, GitPullRequest, FileEdit, AlertTriangle, Terminal } from 'lucide-react';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ContributionPlan | null;
  onGeneratePlan: (goal: string) => void;
  isLoading: boolean;
}

export const ContributionModal: React.FC<ContributionModalProps> = ({
  isOpen,
  onClose,
  plan,
  onGeneratePlan,
  isLoading
}) => {
  const [goalInput, setGoalInput] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F1114] border border-[#23262C] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-[#F2F2F0]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23262C] bg-[#1A1D22]">
          <div className="flex items-center gap-2 text-[#F2B84B]">
            <GitPullRequest className="w-5 h-5" />
            <h2 className="text-base font-semibold text-[#F2F2F0]">Contribution Planner</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#23262C] text-[#8B8F98] hover:text-[#F2F2F0]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8B8F98]">GitHub Issue URL or Goal</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                placeholder="e.g. 'Add health check endpoint' or issue URL"
                className="flex-1 bg-[#08090A] border border-[#23262C] rounded-xl px-4 py-2.5 text-[15px] text-[#F2F2F0] placeholder-[#8B8F98] focus:outline-none focus:border-[#F2B84B]"
              />
              <button
                onClick={() => onGeneratePlan(goalInput)}
                disabled={isLoading}
                style={{ backgroundColor: '#F2F2F0', color: '#0A0A0A' }}
                className="px-6 py-2.5 disabled:opacity-45 rounded-full font-medium text-xs transition-opacity shadow-md"
              >
                {isLoading ? 'Analyzing...' : 'Generate Plan'}
              </button>
            </div>
          </div>

          {plan && (
            <div className="space-y-4 pt-4 border-t border-[#23262C]">
              <div className="bg-[#08090A] p-4 rounded-xl border border-[#23262C]">
                <span className="text-xs font-semibold text-[#F2B84B] uppercase tracking-wider block mb-1">Root-Cause Hypothesis</span>
                <p className="text-[15px] text-[#F2F2F0]">{plan.hypothesis}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[#8B8F98] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-[#F2B84B]" /> Files to Change
                </h4>
                <div className="space-y-2">
                  {plan.filesToChange.map((f, idx) => (
                    <div key={idx} className="bg-[#08090A] p-3 rounded-lg border border-[#23262C] flex items-start justify-between text-xs font-code">
                      <div>
                        <span className="text-[#F2B84B] font-semibold">{f.path}</span>
                        <span className="text-[#8B8F98] ml-2">({f.lineRange})</span>
                        <p className="text-[#F2F2F0] font-sans mt-1 text-[13px]">{f.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#08090A] p-4 rounded-xl border border-[#23262C] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#8B8F98] uppercase tracking-wider block mb-1">Recommended Test Command</span>
                  <code className="text-xs font-code text-[#6FCF97] bg-[#6FCF97]/10 px-2.5 py-1 rounded border border-[#6FCF97]/30">{plan.testCommand}</code>
                </div>
                <Terminal className="w-5 h-5 text-[#8B8F98]" />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[#8B8F98] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#F2B84B]" /> Open Risks & Edge Cases
                </h4>
                <ul className="space-y-1.5 bg-[#08090A] p-4 rounded-xl border border-[#23262C] text-xs text-[#F2F2F0]">
                  {plan.openRisks.map((risk, rIdx) => (
                    <li key={rIdx} className="flex items-start gap-2">
                      <span className="text-[#F2B84B]">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
