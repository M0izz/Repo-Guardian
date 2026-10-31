import React from 'react';
import { motion } from 'framer-motion';

interface PathStreamProps {
  isIngesting: boolean;
  ingestStage: string;
  filesList: Array<{ path: string; kept: boolean }>;
  repoName?: string;
  sha?: string;
  hasReceivedCounts: boolean;
  keptCount: number;
  filteredCount: number;
}

export const PathStream: React.FC<PathStreamProps> = ({
  isIngesting,
  ingestStage,
  filesList,
  repoName,
  sha,
  hasReceivedCounts,
  keptCount,
  filteredCount
}) => {
  if (!isIngesting && filesList.length === 0) return null;

  const displayHeader = repoName && sha
    ? `Ingestion Stream [${repoName} @ ${sha.substring(0, 7)}]`
    : `Ingestion Stream [${ingestStage}]`;

  return (
    <div className="w-full max-w-2xl bg-[#0F1114] border border-[#23262C] rounded-2xl p-4 mt-4 shadow-xl text-left">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#23262C] font-code text-xs text-[#A5A79B]">
        <span>{displayHeader}</span>
        {hasReceivedCounts ? (
          <span className="text-[#E8D2B5] font-semibold">{keptCount} kept, {filteredCount} filtered</span>
        ) : null}
      </div>

      <div className="h-[240px] overflow-y-auto font-code text-[12px] space-y-1 pr-2">
        {(filesList || []).filter(f => f && typeof f.path === 'string').map((file, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center justify-between px-2 py-1 rounded ${
              file.kept ? 'text-[#F2F2F0] bg-[rgba(232,210,181,0.06)]' : 'text-[#A5A79B] line-through opacity-60'
            }`}
          >
            <span className="truncate">{file.path}</span>
            <span className="text-[10px] ml-2 shrink-0">{file.kept ? 'KEPT' : 'FILTERED'}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

