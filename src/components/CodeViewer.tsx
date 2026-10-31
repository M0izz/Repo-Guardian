import React, { useState } from 'react';
import { FileCode, CheckCircle2, Folder } from 'lucide-react';

interface CodeViewerProps {
  files: Array<{ path: string; content?: string; size: number }>;
  activeFile: string;
  onSelectFile: (path: string) => void;
  activeHighlight?: { start: number; end: number };
  fileContentMap: Record<string, string>;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  files,
  activeFile,
  onSelectFile,
  activeHighlight,
  fileContentMap
}) => {
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);
  const content = fileContentMap[activeFile] || '// Select a file from the tree to view source code.';
  const lines = content.split('\n');

  return (
    <div className="flex h-full bg-[#08090A] text-[#F2F2F0] border-r border-[#23262C]">
      {/* Slim File Tree (220px, collapsible) */}
      {!isTreeCollapsed && (
        <div className="w-[220px] bg-[#0F1114] border-r border-[#23262C] flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-2.5 bg-[#1A1D22] border-b border-[#23262C] text-xs font-semibold uppercase tracking-wider text-[#8B8F98]">
            <span className="flex items-center gap-1.5 truncate">
              <Folder className="w-3.5 h-3.5 text-[#F2B84B]" />
              Files ({files.length})
            </span>
            <button
              onClick={() => setIsTreeCollapsed(true)}
              className="text-[#8B8F98] hover:text-[#F2F2F0] text-xs px-1.5 py-0.5 rounded bg-[#0F1114] border border-[#23262C]"
              title="Collapse tree"
            >
              ◀
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {(files || []).filter(f => f && typeof f.path === 'string').map(file => {
              const isActive = file.path === activeFile;
              return (
                <button
                  key={file.path}
                  onClick={() => onSelectFile(file.path)}
                  className={`w-full text-left px-2.5 py-2 rounded-md font-code truncate transition-colors flex items-center justify-between ${
                    isActive
                      ? 'bg-[rgba(242,184,75,0.12)] text-[#F2B84B] border border-[rgba(242,184,75,0.3)]'
                      : 'text-[#8B8F98] hover:bg-[#1A1D22] hover:text-[#F2F2F0]'
                  }`}
                >
                  <span className="truncate">{file.path}</span>
                  <span className="text-[11px] text-[#8B8F98] opacity-75 ml-1">{Math.round(file.size / 1024)}kb</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Code Viewer */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#08090A]">
        <div className="px-4 py-2 bg-[#0F1114] border-b border-[#23262C] font-code text-xs text-[#8B8F98] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isTreeCollapsed && (
              <button
                onClick={() => setIsTreeCollapsed(false)}
                className="text-[#F2B84B] hover:underline text-xs mr-2"
              >
                ▶ Files
              </button>
            )}
            <span className="text-[#F2B84B] font-semibold">{activeFile}</span>
          </div>
          <span className="flex items-center gap-1 text-[#6FCF97] font-medium text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" /> Read from code
          </span>
        </div>

        <div className="flex-1 overflow-auto font-code p-4 select-text">
          {lines.map((line, idx) => {
            const lineNum = idx + 1;
            const isHighlighted = activeHighlight && lineNum >= activeHighlight.start && lineNum <= activeHighlight.end;
            return (
              <div
                key={idx}
                className={`flex items-start px-2 py-0.5 rounded transition-colors ${
                  isHighlighted ? 'bg-[rgba(242,184,75,0.14)] border-l-2 border-[#F2B84B] text-[#F2F2F0]' : 'hover:bg-[#0F1114]/40'
                }`}
              >
                <span className="w-10 text-right pr-4 text-[#8B8F98] select-none text-[11px] opacity-70">{lineNum}</span>
                <span className="whitespace-pre flex-1 text-[#F2F2F0]">{line || ' '}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
