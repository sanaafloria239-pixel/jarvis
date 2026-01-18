
import React from 'react';
import { JarvisStatus } from '../types';

interface JarvisOrbProps {
  status: JarvisStatus;
}

const JarvisOrb: React.FC<JarvisOrbProps> = ({ status }) => {
  const getColors = () => {
    switch (status) {
      case JarvisStatus.LISTENING:
        return 'border-sky-400 text-sky-400 shadow-[0_0_80px_rgba(56,189,248,0.8)]';
      case JarvisStatus.THINKING:
        return 'border-orange-500 text-orange-400 shadow-[0_0_50px_rgba(249,115,22,0.8)]';
      case JarvisStatus.SPEAKING:
        return 'border-cyan-300 text-cyan-300 shadow-[0_0_80px_rgba(103,232,249,0.9)]';
      case JarvisStatus.ERROR:
        return 'border-red-600 text-red-500 shadow-[0_0_100px_rgba(220,38,38,0.9)]';
      default:
        return 'border-slate-800 text-slate-800 shadow-[0_0_20px_rgba(30,41,59,0.4)]';
    }
  };

  const isWorking = status !== JarvisStatus.IDLE && status !== JarvisStatus.ERROR;
  const isListening = status === JarvisStatus.LISTENING;
  const isThinking = status === JarvisStatus.THINKING;
  const isSpeaking = status === JarvisStatus.SPEAKING;
  const isError = status === JarvisStatus.ERROR;

  return (
    <div className={`relative flex items-center justify-center w-96 h-96 ${isError ? 'animate-orb-glitch' : ''}`}>
      {/* ERROR Background Hazard Glow */}
      {isError && (
        <div className="absolute inset-0 bg-red-900/10 rounded-full blur-[120px] animate-pulse"></div>
      )}

      {/* Listening Ripple Effects - More Intense */}
      {isListening && (
        <>
          <div className="absolute w-40 h-40 border-2 border-sky-400/60 rounded-full animate-ripple-fast shadow-[0_0_30px_rgba(56,189,248,0.4)]"></div>
          <div className="absolute w-40 h-40 border border-sky-300/40 rounded-full animate-ripple-fast-delayed shadow-[0_0_20px_rgba(56,189,248,0.2)]"></div>
          <div className="absolute w-40 h-40 border border-sky-200/20 rounded-full animate-ripple-fast-more-delayed"></div>
        </>
      )}

      {/* Thinking "Neural" Swirl Arcs */}
      {isThinking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-64 h-64 border-2 border-t-orange-500 border-r-purple-500 border-b-transparent border-l-transparent rounded-full animate-thinking-swirl-1 opacity-60"></div>
          <div className="absolute w-72 h-72 border-2 border-t-purple-500 border-r-transparent border-b-orange-500 border-l-transparent rounded-full animate-thinking-swirl-2 opacity-40"></div>
          <div className="absolute w-80 h-80 border-2 border-t-transparent border-r-orange-500 border-b-purple-500 border-l-transparent rounded-full animate-thinking-swirl-3 opacity-20"></div>
        </div>
      )}

      {/* Outer Rotating HUD Ring */}
      <div className={`absolute inset-0 border border-dashed rounded-full transition-all duration-1000 
        ${isWorking || isError ? 'border-current opacity-40 rotate-180 scale-100' : 'border-slate-800 scale-95 opacity-20'} 
        ${isThinking ? 'animate-spin-fast' : isError ? 'animate-spin-erratic' : 'animate-spin-slow'}`}>
      </div>
      
      {/* Middle Scanning Ring */}
      <div className={`absolute inset-8 border-2 border-l-transparent border-r-transparent rounded-full transition-all duration-1000 
        ${isWorking || isError ? 'border-current opacity-60' : 'border-slate-800/10'} 
        ${isThinking ? 'animate-reverse-spin-fast' : isError ? 'animate-stutter-spin' : 'animate-reverse-spin'}`}>
      </div>

      {/* Frequency Bars Visualization (Simulated Sound Waves) */}
      {isListening && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(32)].map((_, i) => (
            <div 
              key={i} 
              className="absolute w-0.5 bg-sky-400/80 transition-all duration-75"
              style={{
                height: `${20 + Math.random() * 80}px`,
                transform: `rotate(${i * (360/32)}deg) translateY(-145px)`,
                animation: `sound-bar 0.3s ease-in-out infinite alternate ${i * 0.03}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Error Debris / Warning Particles */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-1 h-1 bg-red-500 rounded-full animate-ping"
              style={{
                transform: `rotate(${i * 45}deg) translateY(-120px)`,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Hexagon Pattern Overlay */}
      <div className={`absolute inset-16 rounded-full overflow-hidden transition-opacity duration-1000 ${isWorking || isError ? 'opacity-20' : 'opacity-0'}`}>
        <div className="w-full h-full bg-[radial-gradient(circle,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[length:12px_12px] 
          ${isError ? 'bg-red-500/20' : ''}"></div>
      </div>

      {/* Core Unit */}
      <div className={`relative w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-500 z-10 
        ${getColors()} 
        ${isListening ? 'scale-110 animate-listen-pulse' : ''} 
        ${isThinking ? 'animate-thinking-glow' : ''}
        ${isError ? 'animate-error-flicker' : ''}`}>
        
        {/* Inner Core Pulsing Glow */}
        <div className={`w-16 h-16 rounded-full blur-md transition-all duration-500 
          ${isThinking ? 'bg-orange-500/80' : 
            isListening ? 'bg-sky-400 animate-core-breath' : 
            isError ? 'bg-red-600 animate-error-ping shadow-[0_0_30px_red]' :
            isWorking ? 'bg-cyan-400/80 scale-110' : 
            'bg-slate-700/20 scale-90'}`}>
        </div>
        <div className={`absolute w-12 h-12 rounded-full transition-all duration-500 
          ${isWorking || isError ? 'bg-white opacity-40 shadow-[0_0_20px_white]' : 'opacity-0'}`}>
        </div>

        {/* HUD Markers */}
        {[0, 90, 180, 270].map(deg => (
          <div key={deg} className={`absolute w-6 h-1 bg-current transition-all duration-500 ${isWorking || isError ? 'opacity-100' : 'opacity-10'}`} style={{ transform: `rotate(${deg}deg) translateX(80px)` }}></div>
        ))}

        {/* Status Text HUD */}
        <div className={`absolute -bottom-16 w-max font-hud text-[10px] tracking-[0.4em] transition-all duration-500 ${getColors()}`}>
           <span className={isListening || isThinking || isSpeaking || isError ? 'animate-pulse' : ''}>
             {isListening ? '>>> LISTENING_FOR_COMMAND' : 
              isThinking ? 'PROCESSING_NEURAL_LINKS' : 
              isSpeaking ? 'UPLINK_TRANSMITTING' : 
              isError ? 'CRITICAL_SYSTEM_EXCEPTION' :
              `CORE_LINK::${status}`}
           </span>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-fast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-erratic {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(100deg); }
          25% { transform: rotate(80deg); }
          50% { transform: rotate(280deg); }
          70% { transform: rotate(240deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-fast { animation: spin-fast 4s linear infinite; }
        .animate-spin-erratic { animation: spin-erratic 1.5s ease-in-out infinite; }
        
        @keyframes reverse-spin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes reverse-spin-fast {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes stutter-spin {
          0% { transform: rotate(360deg); }
          10% { transform: rotate(340deg); }
          12% { transform: rotate(360deg); }
          50% { transform: rotate(180deg); }
          60% { transform: rotate(200deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-reverse-spin-fast { animation: reverse-spin-fast 2.5s linear infinite; }
        .animate-stutter-spin { animation: stutter-spin 2s linear infinite; }

        @keyframes thinking-swirl-1 {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes thinking-swirl-2 {
          0% { transform: rotate(360deg) scale(1.1); }
          50% { transform: rotate(180deg) scale(0.9); }
          100% { transform: rotate(0deg) scale(1.1); }
        }
        @keyframes thinking-swirl-3 {
          0% { transform: rotate(90deg) scale(1); }
          50% { transform: rotate(270deg) scale(1.2); }
          100% { transform: rotate(450deg) scale(1); }
        }
        .animate-thinking-swirl-1 { animation: thinking-swirl-1 3s ease-in-out infinite; }
        .animate-thinking-swirl-2 { animation: thinking-swirl-2 4s ease-in-out infinite; }
        .animate-thinking-swirl-3 { animation: thinking-swirl-3 5s ease-in-out infinite; }

        @keyframes thinking-glow {
          0% { filter: hue-rotate(0deg) brightness(1); }
          50% { filter: hue-rotate(45deg) brightness(1.3); }
          100% { filter: hue-rotate(0deg) brightness(1); }
        }
        .animate-thinking-glow { animation: thinking-glow 2s ease-in-out infinite; }

        @keyframes ripple-fast {
          0% { transform: scale(0.8); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .animate-ripple-fast { animation: ripple-fast 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite; }
        .animate-ripple-fast-delayed { animation: ripple-fast 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite 0.5s; }
        .animate-ripple-fast-more-delayed { animation: ripple-fast 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite 1s; }

        @keyframes listen-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .animate-listen-pulse { animation: listen-pulse 1s ease-in-out infinite; }

        @keyframes core-breath {
          0% { transform: scale(0.9); opacity: 0.6; filter: blur(4px); }
          50% { transform: scale(1.2); opacity: 1; filter: blur(8px); }
          100% { transform: scale(0.9); opacity: 0.6; filter: blur(4px); }
        }
        .animate-core-breath { animation: core-breath 2s ease-in-out infinite; }

        @keyframes error-flicker {
          0% { opacity: 1; transform: scale(1); }
          10% { opacity: 0.7; transform: scale(0.98); }
          20% { opacity: 1; transform: scale(1.02); }
          30% { opacity: 0.8; transform: scale(0.95); }
          35% { opacity: 1; }
          100% { opacity: 1; }
        }
        .animate-error-flicker { animation: error-flicker 0.4s infinite; }

        @keyframes error-ping {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-error-ping { animation: error-ping 0.8s ease-in-out infinite; }

        @keyframes orb-glitch {
          0% { transform: translate(0); }
          2% { transform: translate(5px, -5px); }
          4% { transform: translate(-5px, 5px); }
          6% { transform: translate(0); }
          100% { transform: translate(0); }
        }
        .animate-orb-glitch { animation: orb-glitch 2s infinite; }

        @keyframes sound-bar {
          0% { opacity: 0.2; height: 10px; }
          100% { opacity: 1; height: 50px; }
        }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
        .animate-reverse-spin { animation: reverse-spin 8s linear infinite; }
      `}</style>
    </div>
  );
};

export default JarvisOrb;
