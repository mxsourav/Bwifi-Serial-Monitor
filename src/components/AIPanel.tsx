import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Settings, AlertTriangle, Download, Trash2, Cpu } from 'lucide-react';
import { LLMProvider, ChatMessage, ProviderType } from '../services/LLMProvider';
import { LocalStructuringEngine, CrashWarning } from '../services/LocalStructuringEngine';
import { SessionMemory } from '../services/SessionMemory';

interface AIPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function AIPanel({ isOpen, onToggle }: AIPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [warnings, setWarnings] = useState<CrashWarning[]>([]);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [provider, setProvider] = useState<ProviderType>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-1.5-flash');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load credentials
    if (LLMProvider.loadCredentials()) {
      setProvider(LLMProvider.getProvider());
    } else {
      setShowSettings(true);
    }

    // Subscribe to warnings
    const unsubscribe = LocalStructuringEngine.subscribe((newWarnings) => {
      setWarnings([...newWarnings]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSaveSettings = () => {
    LLMProvider.setCredentials(provider, apiKey, model);
    setShowSettings(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Fetch massive session log context
      const logs = await SessionMemory.getAllLogsForSession();
      const compressedContext = LocalStructuringEngine.formatContextForAI(logs);

      // Create a temporary assistant message that will be updated via stream
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      await LLMProvider.sendMessage([...messages, userMsg], compressedContext, (chunk) => {
        setMessages(prev => {
          const newArr = [...prev];
          newArr[newArr.length - 1].content = chunk;
          return newArr;
        });
      });
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `**ERROR:** ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExport = async () => {
    const html = await SessionMemory.exportSessionHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SATAN_Export_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="w-[400px] h-full bg-[#07090d] border-r border-zinc-800/50 flex flex-col flex-shrink-0 relative overflow-hidden z-50">
      
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-black/20">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h2 className="font-sans font-bold text-zinc-100 tracking-wide text-sm">AI DIAGNOSTICS</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors" title="Export HTML Report">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Overlay */}
      {showSettings && (
        <div className="absolute top-14 left-0 right-0 bottom-0 bg-[#07090d] z-10 p-5 overflow-y-auto">
          <h3 className="text-sm font-bold text-zinc-300 mb-4 uppercase tracking-wider">Provider Setup</h3>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
             {['gemini', 'openai', 'claude', 'deepseek', 'grok'].map(p => (
               <button 
                 key={p}
                 onClick={() => setProvider(p as ProviderType)}
                 className={`p-3 border rounded flex flex-col items-center justify-center gap-2 transition-all ${
                   provider === p ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'
                 }`}
               >
                 <img src={`/providers/${p}-color.svg`} alt={p} className="w-6 h-6 opacity-90" onError={(e) => e.currentTarget.style.display='none'} />
                 <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{p}</span>
               </button>
             ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-zinc-500 mb-1 block">API KEY</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500" placeholder="Paste your API key here" />
            </div>
            <div>
              <label className="text-xs font-mono text-zinc-500 mb-1 block">MODEL</label>
              <input type="text" value={model} onChange={e => setModel(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500" />
            </div>
            <button onClick={handleSaveSettings} className="w-full bg-zinc-100 text-black font-bold text-sm py-2 rounded hover:bg-white transition-colors uppercase tracking-wider mt-2">
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Instant Local Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 bg-black/40 border-b border-red-900/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> HARDWARE FAULTS DETECTED
            </span>
            <button onClick={() => LocalStructuringEngine.clearWarnings()} className="text-zinc-500 hover:text-white"><Trash2 className="w-3 h-3" /></button>
          </div>
          <div className="space-y-1">
            {warnings.map((w, i) => (
              <div key={i} className="text-xs font-mono bg-red-500/10 border border-red-500/20 text-red-300 px-2 py-1.5 rounded flex items-start gap-2">
                <div className="mt-0.5">•</div>
                <div>
                  <strong className="block">{w.type}</strong>
                  <span className="opacity-80 text-[10px]">{w.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {messages.length === 0 && !showSettings && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 opacity-40">
            <Cpu className="w-12 h-12 mb-4 text-zinc-500" />
            <h3 className="text-sm font-bold text-zinc-300 mb-2">DIAGNOSTIC ENGINE READY</h3>
            <p className="text-xs font-mono text-zinc-500">Ask a question to analyze the hidden serial memory buffer. Context is handled automatically.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-xl px-4 py-3 ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-300'}`}>
              <div className="prose prose-invert prose-sm max-w-none font-sans leading-relaxed text-[13px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-black/40 border-t border-zinc-800/50">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI to analyze logs..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-4 pr-10 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500 font-sans"
            disabled={isTyping}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-1.5 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
