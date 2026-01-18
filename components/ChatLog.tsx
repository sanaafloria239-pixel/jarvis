
import React, { useEffect, useRef } from 'react';
import { Message } from '../types';

interface ChatLogProps {
  messages: Message[];
  onFeedback: (index: number, type: 'up' | 'down') => void;
}

const ChatLog: React.FC<ChatLogProps> = ({ messages, onFeedback }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="w-full h-full flex flex-col bg-black/60 border border-cyan-500/10 rounded-lg p-5 font-mono text-xs overflow-hidden backdrop-blur-xl shadow-2xl relative">
      {/* Persistent CRT Scanline Interlacing Texture */}
      <div className="absolute inset-0 pointer-events-none z-30 opacity-[0.05] crt-lines"></div>
      
      {/* Single Vertical Sweep Scanline */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden rounded-lg">
        <div className="w-full h-[1px] bg-cyan-400 absolute top-0 left-0 animate-scanline-sweep shadow-[0_0_10px_#22d3ee]"></div>
      </div>

      {/* HUD Header Decoration */}
      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3 mb-5 relative z-10">
        <span className="text-cyan-400 font-hud text-[10px] tracking-[0.2em] flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-cyan-500 animate-pulse"></div>
            <div className="w-1 h-3 bg-cyan-500/50"></div>
          </div>
          COMMS_LOG_STREAM
        </span>
        <div className="text-[9px] text-slate-500 font-hud opacity-50 tracking-widest">SECURE_LINK::V2.5</div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide relative z-10"
      >
        {messages.length === 0 && (
          <div className="flex flex-col gap-2 opacity-30 mt-10">
            <div className="h-2 w-2/3 bg-slate-800 rounded animate-pulse"></div>
            <div className="h-2 w-1/2 bg-slate-800 rounded animate-pulse delay-75"></div>
            <div className="mt-4 text-[9px] font-hud tracking-[0.3em] text-slate-700">AWAITING_INPUT_TRANSMISSION...</div>
          </div>
        )}

        {messages.map((m, i) => (
          <div 
            key={i} 
            className={`group flex flex-col p-3 rounded-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 
              ${m.role === 'jarvis' 
                ? 'bg-cyan-950/10 border-l-2 border-cyan-500/40 shadow-[inset_0_0_20px_rgba(34,211,238,0.02)] ml-2' 
                : 'bg-slate-900/40 border-l-2 border-slate-700/50 mr-2'
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-[7px] font-hud px-1.5 py-0.5 rounded tracking-[0.2em] uppercase
                  ${m.role === 'jarvis' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {m.role === 'jarvis' ? 'AI_PROCESSOR' : 'USER_UPLINK'}
                </span>
                <span className="text-[7px] text-slate-600 font-hud opacity-40">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour12: false, second: '2-digit' })}
                </span>
              </div>
              
              {m.role === 'jarvis' && (
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onFeedback(i, 'up')}
                    className={`transition-colors ${m.feedback === 'up' ? 'text-cyan-400' : 'text-slate-700 hover:text-cyan-400'}`}
                    title="Validate logic"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </button>
                  <button 
                    onClick={() => onFeedback(i, 'down')}
                    className={`transition-colors ${m.feedback === 'down' ? 'text-red-500' : 'text-slate-700 hover:text-red-500'}`}
                    title="Report anomaly"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
            </div>
            
            <p className={`leading-relaxed tracking-wide text-[13px] 
              ${m.role === 'jarvis' 
                ? 'text-sky-100/90 font-medium' 
                : 'text-slate-400 font-light'
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
      </div>

      {/* Subtle Overlay Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        
        .crt-lines {
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          background-size: 100% 2px, 3px 100%;
          animation: crt-roll 10s linear infinite;
        }

        @keyframes crt-roll {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }

        @keyframes scanline-sweep {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.5; }
          50% { opacity: 0.8; }
          90% { opacity: 0.5; }
          100% { transform: translateY(800px); opacity: 0; }
        }

        .animate-scanline-sweep {
          animation: scanline-sweep 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default ChatLog;
