import React, { useState } from 'react';
import { ChatMessage } from '../types';
import { Send, MessageSquareCode, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onJumpToCitation: (citation: string) => void;
  isLoading: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onJumpToCitation,
  isLoading
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1114] text-[#F2F2F0] p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#23262C]">
        <MessageSquareCode className="w-5 h-5 text-[#F2B84B]" />
        <h2 className="text-base font-semibold text-[#F2F2F0]">Repository Q&A & Citations</h2>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[#08090A] rounded-xl border border-[#23262C]">
            <Sparkles className="w-8 h-8 text-[#F2B84B] mx-auto mb-3 opacity-80" />
            <p className="text-base font-medium text-[#F2F2F0]">Ask anything about this codebase</p>
            <p className="text-xs text-[#A5A79B] mt-1 max-w-sm mx-auto">
              Every answer is backed by validated line-range citations or securely abstains with <span className="italic">"I could not find this in the repo"</span> plus top file suggestions.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`p-4 rounded-xl border ${
                msg.role === 'user'
                  ? 'bg-[#1A1D22] border-[#23262C] ml-6 text-[#F2F2F0]'
                  : 'bg-[#08090A] border-[#23262C] mr-6 text-[#F2F2F0]'
              }`}
            >
              <div className="flex items-center justify-between mb-2 text-xs text-[#A5A79B] font-code">
                <span className="font-semibold text-[#F2B84B]">{msg.role === 'user' ? 'You' : 'RepoGuide Tutor'}</span>
              </div>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              {msg.citations && msg.citations.length > 0 ? (
                <div className="mt-3 pt-3 border-t border-[#23262C] flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#A5A79B]">Validated Citations:</span>
                  {msg.citations.map((cit, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => onJumpToCitation(cit)}
                      style={{ color: '#6FCF97', borderColor: 'rgba(111,207,151,0.4)', backgroundColor: 'rgba(111,207,151,0.1)' }}
                      className="font-code text-xs px-2.5 py-1 rounded-md border hover:bg-[#6FCF97]/20 transition-colors flex items-center gap-1.5 shadow"
                    >
                      <ShieldCheck className="w-3 h-3 text-[#6FCF97]" />
                      <span>{cit}</span>
                      <ExternalLink className="w-3 h-3 opacity-75" />
                    </button>
                  ))}
                </div>
              ) : msg.role === 'assistant' && msg.text.includes('could not find') ? (
                <div className="mt-3 pt-3 border-t border-[#23262C] flex items-center gap-2">
                  <span
                    style={{ color: '#E07A5F', borderColor: 'rgba(224,122,95,0.4)', backgroundColor: 'rgba(224,122,95,0.1)' }}
                    className="font-code text-xs px-2.5 py-1 rounded-md border"
                  >
                    Abstained (Inference prevented)
                  </span>
                </div>
              ) : null}
            </div>
          ))
        )}
        {isLoading && (
          <div className="p-4 rounded-xl bg-[#08090A] border border-[#23262C] mr-6 animate-pulse flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-[#F2B84B] animate-ping" />
            <span className="font-code text-xs text-[#A5A79B]">Retrieving chunks via hybrid embedding search and validating citations...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 bg-[#08090A] p-2.5 rounded-xl border border-[#23262C]">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question (e.g. 'Where is the main entry point?')"
          className="flex-1 bg-transparent px-3 py-2 text-[15px] text-[#F2F2F0] placeholder-[#A5A79B] focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{ backgroundColor: '#F2F2F0', color: '#0A0A0A' }}
          className="px-5 py-2 disabled:opacity-40 rounded-full font-medium text-xs transition-opacity shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
