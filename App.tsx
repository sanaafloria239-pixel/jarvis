
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { JarvisStatus, Message } from './types';
import JarvisOrb from './components/JarvisOrb';
import ChatLog from './components/ChatLog';

// Audio Utilities
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [status, setStatus] = useState<JarvisStatus>(JarvisStatus.IDLE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAwake, setIsAwake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const transcriptRef = useRef({ user: '', jarvis: '' });
  const recognitionRef = useRef<any>(null);
  const audioReceivedThisTurn = useRef(false);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    }
    if (!outputAudioContextRef.current) {
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
  };

  const speakFallback = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Attempt to find a professional-sounding British or neutral male voice
    const preferredVoice = voices.find(v => 
      v.name.includes('Google UK English Male') || 
      (v.lang === 'en-GB' && v.name.includes('Male')) ||
      v.name.includes('Arthur') ||
      v.name.includes('Daniel')
    ) || voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) 
      || voices.find(v => v.lang.startsWith('en')) 
      || voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.pitch = 0.9; // Slightly deeper for professionalism
    utterance.rate = 1.0;
    
    utterance.onstart = () => setStatus(JarvisStatus.SPEAKING);
    utterance.onend = () => setStatus(JarvisStatus.LISTENING);
    
    window.speechSynthesis.speak(utterance);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (!event.results[i].isFinal) {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (interimTranscript) {
          setLiveTranscript(interimTranscript);
          setStatus(JarvisStatus.LISTENING);
        }
      };

      recognitionRef.current.onend = () => {
        if (isAwake) {
          try { recognitionRef.current.start(); } catch(e) {}
        }
      };

      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) return;

    const userText = textInput;
    setTextInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText, timestamp: Date.now() }]);
    setStatus(JarvisStatus.THINKING);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userText,
        config: {
          systemInstruction: "You are JARVIS. Tone: British, mature, highly professional, efficient. You are a fictional male AI assistant. Always address the user as 'sir' or 'ma'am'. Your responses must be concise and stoic.",
        }
      });

      const jarvisText = response.text || "Systems are currently unresponsive, sir.";
      setMessages(prev => [...prev, { role: 'jarvis', text: jarvisText, timestamp: Date.now() }]);
      speakFallback(jarvisText);
    } catch (err) {
      console.error(err);
      setStatus(JarvisStatus.ERROR);
    }
  };

  const handleWake = async () => {
    if (isAwake) return;
    
    try {
      initAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus(JarvisStatus.LISTENING);
            startSpeechRecognition();
            
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(v => v * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              transcriptRef.current.jarvis += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              transcriptRef.current.user += message.serverContent.inputTranscription.text;
              if (message.serverContent.inputTranscription.text.trim()) {
                setStatus(JarvisStatus.THINKING);
              }
            }

            if (message.serverContent?.turnComplete) {
              const fullInput = transcriptRef.current.user;
              const fullOutput = transcriptRef.current.jarvis;
              
              const newMsgs: Message[] = [];
              if (fullInput) {
                newMsgs.push({ role: 'user', text: fullInput, timestamp: Date.now() });
                setLiveTranscript('');
              }
              if (fullOutput) {
                newMsgs.push({ role: 'jarvis', text: fullOutput, timestamp: Date.now() });
                if (!audioReceivedThisTurn.current) {
                  speakFallback(fullOutput);
                }
              }
              if (newMsgs.length) setMessages(prev => [...prev, ...newMsgs]);
              
              transcriptRef.current = { user: '', jarvis: '' };
              audioReceivedThisTurn.current = false;
              if (status !== JarvisStatus.SPEAKING) setStatus(JarvisStatus.LISTENING);
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              audioReceivedThisTurn.current = true;
              setStatus(JarvisStatus.SPEAKING);
              const ctx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setStatus(JarvisStatus.LISTENING);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current) {
                try { source.stop(); } catch(e) {}
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              window.speechSynthesis?.cancel();
              setStatus(JarvisStatus.LISTENING);
            }
          },
          onerror: (e) => {
            setStatus(JarvisStatus.ERROR);
            setError("LINK_INTERRUPTED");
          },
          onclose: () => setIsAwake(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { 
            // 'Charon' is a mature, professional, and stoic male voice perfect for the JARVIS persona.
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } 
          },
          systemInstruction: "You are JARVIS. Tone: British, mature, highly professional, efficient. You are a fictional male AI assistant. Always address the user as 'sir' or 'ma'am'. Use Google Search for real-time info. Your responses must be concise and stoic.",
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          tools: [{ googleSearch: {} }]
        }
      });

      sessionPromiseRef.current = sessionPromise;
      setIsAwake(true);
    } catch (err) {
      setError("System failure.");
    }
  };

  const handleManualListen = () => {
    if (!isAwake) {
      handleWake();
      return;
    }
    setStatus(JarvisStatus.LISTENING);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      try { recognitionRef.current.start(); } catch (e) {}
    }
  };

  const handleShutdown = () => {
    sessionPromiseRef.current?.then(session => session.close());
    if (recognitionRef.current) recognitionRef.current.stop();
    window.speechSynthesis?.cancel();
    setIsAwake(false);
    setStatus(JarvisStatus.IDLE);
    setLiveTranscript('');
  };

  const handleFeedback = (index: number, type: 'up' | 'down') => {
    setMessages(prev => {
      const clone = [...prev];
      clone[index].feedback = type;
      return clone;
    });
  };

  return (
    <div className="relative h-screen w-full overflow-hidden flex items-center justify-center p-4">
      <div className="data-streams opacity-20"></div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-7xl h-full items-center z-10">
        
        {/* Left: System HUD */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-6 self-start mt-20 floating-hud">
          <div className="border border-cyan-500/20 bg-black/40 p-5 rounded-lg backdrop-blur-md">
            <h3 className="font-hud text-cyan-400 text-[10px] tracking-[0.3em] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
              DIAGNOSTICS::REAL_TIME
            </h3>
            <div className="space-y-4">
              {[
                { label: 'VOICE_ENGINE', val: 'CHARON_V2' },
                { label: 'NEURAL_STABILITY', val: isAwake ? '99.2%' : '0.0%' },
                { label: 'SEARCH_GND', val: 'ACTIVE' },
                { label: 'CORE_LOAD', val: isAwake ? '12%' : '0%' },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col gap-1">
                   <div className="flex justify-between text-[9px] font-hud text-slate-500">
                     <span>{stat.label}</span>
                     <span className="text-cyan-400">{stat.val}</span>
                   </div>
                   <div className="h-[2px] w-full bg-slate-800">
                     <div className="h-full bg-cyan-500/50 transition-all duration-1000" style={{ width: isAwake ? '75%' : '0%' }}></div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: The Core & Command Input */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center gap-8">
          <div className="mt-[-4rem] relative group cursor-pointer" onClick={handleManualListen}>
            {isAwake && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 animate-bounce-subtle pointer-events-none">
                 <div className={`p-2 rounded-full border border-cyan-500/50 bg-black/80 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all ${status === JarvisStatus.LISTENING ? 'scale-125 border-cyan-400 text-cyan-400' : 'text-slate-500'}`}>
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                     <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                   </svg>
                 </div>
                 <span className="text-[7px] font-hud text-cyan-400 tracking-[0.3em] uppercase opacity-60">Manual_Audio_Link</span>
              </div>
            )}
            <JarvisOrb status={status} />
          </div>
          
          <div className="flex flex-col items-center gap-6 w-full max-w-lg">
            {isAwake && (
              <div className="w-full h-8 flex items-center justify-center">
                <p className="text-cyan-400/60 font-hud text-[10px] tracking-widest text-center animate-pulse uppercase">
                  {liveTranscript ? `Uplink Stream: ${liveTranscript}` : '[ Frequency Sweep Active ]'}
                </p>
              </div>
            )}

            {!isAwake ? (
              <button onClick={handleWake} className="group relative px-10 py-4 font-hud text-cyan-400 tracking-[0.5em] border border-cyan-500/40 rounded-sm bg-cyan-500/5 hover:bg-cyan-500/10 transition-all">
                <div className="absolute inset-0 bg-cyan-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                CONNECT_JARVIS_MODULE
              </button>
            ) : (
              <div className="w-full flex flex-col items-center gap-6">
                <form 
                  onSubmit={handleSendMessage}
                  className="w-full relative group"
                >
                  <div className="absolute -inset-0.5 bg-cyan-500/20 blur opacity-30 group-focus-within:opacity-100 transition-opacity rounded-sm"></div>
                  <div className="relative flex bg-black/80 border border-cyan-500/30 rounded-sm overflow-hidden backdrop-blur-md">
                    <div className="flex items-center px-4 border-r border-cyan-500/20 font-hud text-cyan-500 text-xs tracking-tighter">
                      CMD>
                    </div>
                    <input 
                      type="text" 
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Input command sequence..."
                      className="flex-1 bg-transparent px-4 py-3 text-cyan-100 text-xs font-mono placeholder-cyan-900/40 focus:outline-none"
                    />
                    
                    <button 
                      type="button"
                      onClick={handleManualListen}
                      className={`px-4 border-l border-cyan-500/20 flex items-center justify-center transition-all ${status === JarvisStatus.LISTENING ? 'text-cyan-400 bg-cyan-500/10 animate-pulse' : 'text-slate-600 hover:text-cyan-500'}`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    </button>

                    <button 
                      type="submit"
                      disabled={!textInput.trim()}
                      className="px-6 border-l border-cyan-500/20 font-hud text-[10px] text-cyan-500/60 hover:text-cyan-400 transition-colors uppercase tracking-widest disabled:opacity-20"
                    >
                      Transmit
                    </button>
                  </div>
                  <div className="mt-2 flex justify-between px-1">
                    <span className="text-[8px] font-hud text-slate-500 uppercase tracking-widest">Protocol::Standard_Query</span>
                    <span className="text-[8px] font-hud text-slate-500 uppercase tracking-widest">Identity::Jarvis_Core</span>
                  </div>
                </form>

                <div className="flex items-center gap-6">
                  <div className="px-6 py-2 bg-cyan-500/5 border border-cyan-500/30 rounded-full text-[10px] font-hud text-cyan-400 animate-pulse">
                     CORE_UPLINK_STABLE
                  </div>
                  <button onClick={handleShutdown} className="text-[9px] font-hud text-red-500/40 hover:text-red-500 transition-colors uppercase tracking-widest">Disconnect</button>
                </div>
              </div>
            )}
            
            {error && <div className="text-red-500 font-hud text-[10px] tracking-widest animate-pulse mt-4">FATAL_ERROR::{error}</div>}
          </div>
        </div>

        {/* Right: Transcript */}
        <div className="lg:col-span-3 h-[450px] lg:h-[650px] w-full self-start lg:mt-20 floating-hud">
          <ChatLog messages={messages} onFeedback={handleFeedback} />
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 flex items-center justify-between pointer-events-none opacity-40">
        <div className="flex gap-4 font-hud text-[8px] text-slate-500 tracking-[0.3em]">
          <span>LOC_ID::ALPHA_7</span>
          <span className="text-cyan-900/50">|</span>
          <span>SYS_TIME::{new Date().toLocaleTimeString([], { hour12: false })}</span>
        </div>
        <div className="h-[1px] flex-1 mx-8 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
        <div className="font-hud text-[8px] text-cyan-600/50 tracking-[0.3em] uppercase">
          Voice_Profile::Charon_Stoic
        </div>
      </div>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -5px); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default App;
