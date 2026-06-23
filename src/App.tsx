import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RotateCw, 
  Trash2, 
  Pause, 
  Play, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Activity, 
  Zap, 
  Tv, 
  RefreshCw,
  Link,
  Unlink
} from 'lucide-react';

// Color Preset Themes
const COLOR_PRESETS = [
  { name: 'cyan', hex: '#00ffff', rgb: '0, 255, 255' },
  { name: 'green', hex: '#10b981', rgb: '16, 185, 129' },
  { name: 'yellow', hex: '#f59e0b', rgb: '245, 158, 11' },
  { name: 'white', hex: '#ffffff', rgb: '255, 255, 255' },
  { name: 'red', hex: '#ef4444', rgb: '239, 68, 68' },
  { name: 'purple', hex: '#8b5cf6', rgb: '139, 92, 246' },
];

interface LogLine {
  time: string;
  tag: string;
  text: string;
  color: string;
  bold?: boolean;
}

export default function App() {
  // System States
  const [status, setStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'REBOOTING'>('CONNECTED');
  const [activeMode, setActiveMode] = useState<'IR JAMMER' | 'IR RECEIVER' | 'IR REMOTE'>('IR JAMMER');
  const [jammerSubMode, setJammerSubMode] = useState<'TV BURST' | 'SIGNAL WAVEFORM'>('TV BURST');
  const [displayColor, setDisplayColor] = useState('#00ffff');
  const [displayColorRgb, setDisplayColorRgb] = useState('0, 255, 255');
  const [brightness, setBrightness] = useState(80);
  
  // Settings Toggles
  const [invertDisplay, setInvertDisplay] = useState(false);
  const [gridOnGraph, setGridOnGraph] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Interactive Stats
  const [packetCount, setPacketCount] = useState(52648);
  const [isTransmitting, setIsTransmitting] = useState(true);
  const [isReceiving, setIsReceiving] = useState(false);
  const [uptimeSeconds, setUptimeSeconds] = useState(5077); // Start from 01:24:37 (5077 seconds)
  
  // Terminal Logs State
  const [logs, setLogs] = useState<LogLine[]>([
    { time: '[17:21:04]', tag: '[SYSTEM]', text: 'Booting BWifiKill V4.0', color: 'text-cyan-400' },
    { time: '[17:21:04]', tag: '[SYSTEM]', text: 'Initializing modules...', color: 'text-cyan-400' },
    { time: '[17:21:05]', tag: '[IR MANAGER]', text: 'Initializing...', color: 'text-emerald-400' },
    { time: '[17:21:05]', tag: '[IR MANAGER]', text: 'OK', color: 'text-emerald-400' },
    { time: '[17:21:05]', tag: '[SD MANAGER]', text: 'Mounting SD Card...', color: 'text-amber-400' },
    { time: '[17:21:05]', tag: '[SD MANAGER]', text: 'No SD Card', color: 'text-amber-400' },
    { time: '[17:21:05]', tag: '[SYSTEM]', text: 'RF Systems Disabled', color: 'text-cyan-400' },
    { time: '[17:21:06]', tag: '[IR JAMMER]', text: 'Entered', color: 'text-purple-400' },
    { time: '[17:21:06]', tag: '[IR RX]', text: 'Disabled', color: 'text-zinc-500' },
    { time: '[17:21:06]', tag: '[IR TX]', text: 'ACTIVE', color: 'text-emerald-500', bold: true },
    { time: '[17:21:06]', tag: '[JAMMER]', text: 'Mode: TV BURST (RAND-OOK)', color: 'text-purple-400' },
    { time: '[17:21:06]', tag: '[JAMMER]', text: 'Carrier: 38kHz', color: 'text-purple-400' },
    { time: '[17:21:06]', tag: '[JAMMER]', text: 'Loop Started', color: 'text-purple-400' },
    { time: '[17:21:06]', tag: '[TX BURST]', text: 'Mark: 3ms Space: 0.6ms', color: 'text-indigo-400' },
    { time: '[17:21:06]', tag: '[OLED FRAME]', text: 'OK', color: 'text-zinc-400' },
    { time: '[17:21:06]', tag: '[JAMMER LOOP]', text: 'OK', color: 'text-purple-400' },
  ]);
  const [logLevel, setLogLevel] = useState<'INFO' | 'DEBUG' | 'WARN' | 'ERROR'>('INFO');
  const [isLogsPaused, setIsLogsPaused] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  
  // Real-time animation states for Waveform
  const [waveform, setWaveform] = useState<number[]>([]);
  const [colorWheelCursor, setColorWheelCursor] = useState({ x: 14, y: 72 });
  const [isDraggingColor, setIsDraggingColor] = useState(false);
  const colorWheelRef = useRef<HTMLDivElement>(null);

  // Uptime Counter Loop
  useEffect(() => {
    if (status === 'DISCONNECTED') return;
    const interval = setInterval(() => {
      setUptimeSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Formats uptime seconds to HH:MM:SS
  const formatUptime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Waveform bar generator loop
  useEffect(() => {
    const barCount = 45;
    // Initial bars
    setWaveform(Array.from({ length: barCount }, () => Math.random() * 85 + 5));

    if (status !== 'CONNECTED') {
      setWaveform(Array.from({ length: barCount }, () => 2));
      return;
    }

    const interval = setInterval(() => {
      setWaveform(prev => {
        return prev.map((val, idx) => {
          if (activeMode === 'IR JAMMER') {
            setIsTransmitting(true);
            setIsReceiving(false);
            // Simulate bursting frequency waveform
            const scale = jammerSubMode === 'TV BURST' 
              ? Math.sin((Date.now() / 150) + idx * 0.4) * 40 + 45
              : Math.sin((Date.now() / 80) + idx * 0.1) * 30 + 50;
            const noise = Math.random() * 20 - 10;
            return Math.max(5, Math.min(95, scale + noise));
          } else if (activeMode === 'IR RECEIVER') {
            setIsTransmitting(false);
            // Receiver listens, and occasionally pulses dramatically
            const hasPulse = Math.sin(Date.now() / 800) > 0.4;
            setIsReceiving(hasPulse);
            if (hasPulse) {
              const base = Math.sin((Date.now() / 50) + idx * 0.8) * 45 + 50;
              return Math.max(5, Math.min(95, base + (Math.random() * 15 - 7.5)));
            } else {
              return Math.max(1, Math.min(20, (Math.sin(idx * 0.5) * 6) + 10 + (Math.random() * 4 - 2)));
            }
          } else {
            // IR Remote: stable or sends signal burst when OK pressed
            setIsTransmitting(false);
            setIsReceiving(false);
            return Math.max(4, (Math.cos(idx * 0.2) * 5) + 12);
          }
        });
      });

      // Increment Packets and occasionally logs
      if (activeMode === 'IR JAMMER' && status === 'CONNECTED') {
        setPacketCount(p => p + Math.floor(Math.random() * 4 + 1));
      }
    }, 80);

    return () => clearInterval(interval);
  }, [activeMode, jammerSubMode, status]);

  // Dynamic log entry generator loop
  useEffect(() => {
    if (status !== 'CONNECTED' || isLogsPaused) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
      
      let nextLog: Omit<LogLine, 'time'>;

      if (activeMode === 'IR JAMMER') {
        const attackLogs = [
          { tag: '[JAMMER]', text: `Transmitting Jamming Waveform: ${jammerSubMode === 'TV BURST' ? 'TV BURST' : 'SIGNAL WAVEFORM'}`, color: 'text-purple-400' },
          { tag: '[TX BURST]', text: `Frequency carrier stable at 38.4kHz`, color: 'text-indigo-400' },
          { tag: '[OLED FRAME]', text: `Render buffer swapped - Refresh 42Hz`, color: 'text-zinc-400' },
          { tag: '[JAMMER LOOP]', text: `Packet Burst ID ${Math.floor(Math.random() * 9000 + 1000)} sent OK`, color: 'text-purple-500' },
          { tag: '[IR TX]', text: 'ACTIVE - HIGH SIGNAL OUTPUT ON PIN 23', color: 'text-emerald-500', bold: true },
        ];
        nextLog = attackLogs[Math.floor(Math.random() * attackLogs.length)];
      } else if (activeMode === 'IR RECEIVER') {
        const receiverLogs = [
          { tag: '[IR RX]', text: 'Scanning spectrum on channel 1 (38kHz)...', color: 'text-emerald-400' },
          { tag: '[IR RX]', text: `Noise floor: -92dBm, ambient light stable`, color: 'text-emerald-400' },
          { tag: '[IR RX]', text: `Decoded NEC pulse: Protocol Match! Hex: 0x00FF${Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0')}`, color: 'text-amber-400', bold: true },
          { tag: '[OLED FRAME]', text: `Graph updated with captured signal`, color: 'text-zinc-400' }
        ];
        nextLog = receiverLogs[Math.floor(Math.random() * receiverLogs.length)];
      } else {
        const remoteLogs = [
          { tag: '[REMOTE]', text: 'Listening for Keypad input trigger...', color: 'text-amber-500' },
          { tag: '[SYSTEM]', text: `Sub-core 1 standby mode. Idle draw: 12mA`, color: 'text-cyan-400' },
          { tag: '[OLED FRAME]', text: 'Menu panel refreshed', color: 'text-zinc-400' }
        ];
        nextLog = remoteLogs[Math.floor(Math.random() * remoteLogs.length)];
      }

      setLogs(prev => {
        const updated = [...prev, { ...nextLog, time: timeStr }];
        // Limit logs to last 60 entries
        return updated.slice(-60);
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [activeMode, jammerSubMode, status, isLogsPaused]);

  // Autoscroll logs terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Color Calculation Helper: HSL to Hex
  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Helper: Hex to RGB string for custom theme
  const hexToRgbString = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return '0, 255, 255';
  };

  // Handles clicking/dragging on Color Wheel to choose custom hue
  const handleColorWheelSelect = (clientX: number, clientY: number) => {
    if (!colorWheelRef.current) return;
    const rect = colorWheelRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    
    const dx = clickX - centerX;
    const dy = clickY - centerY;
    
    // Calculate polar coordinates
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = centerX;
    
    // Clamp to boundaries
    const angleRad = Math.atan2(dy, dx);
    const clampedDistance = Math.min(distance, maxRadius);
    
    // Set visual cursor position
    const cursorX = centerX + Math.cos(angleRad) * clampedDistance;
    const cursorY = centerY + Math.sin(angleRad) * clampedDistance;
    setColorWheelCursor({ x: cursorX, y: cursorY });

    // Compute HSL
    const angleDeg = (angleRad * (180 / Math.PI) + 360) % 360;
    const saturation = (clampedDistance / maxRadius) * 100;
    const hex = hslToHex(angleDeg, saturation, 50);
    
    setDisplayColor(hex);
    setDisplayColorRgb(hexToRgbString(hex));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingColor(true);
    handleColorWheelSelect(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingColor) {
        handleColorWheelSelect(e.clientX, e.clientY);
      }
    };
    const handleMouseUp = () => {
      setIsDraggingColor(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingColor]);

  // Preset Select handler
  const handlePresetSelect = (hex: string, rgb: string) => {
    setDisplayColor(hex);
    setDisplayColorRgb(rgb);
    
    // Position color wheel cursor matching presets (scaled coordinates on 144px wheel)
    if (!colorWheelRef.current) return;
    const centerX = 72;
    const centerY = 72;
    let angleDeg = 0;
    let dist = 58;

    switch (hex) {
      case '#00ffff': angleDeg = 180; break; // Cyan
      case '#10b981': angleDeg = 120; break; // Green
      case '#f59e0b': angleDeg = 60; break;  // Yellow
      case '#ffffff': dist = 0; break;       // White (center)
      case '#ef4444': angleDeg = 0; break;   // Red
      case '#8b5cf6': angleDeg = 280; break; // Purple
    }

    const angleRad = angleDeg * (Math.PI / 180);
    setColorWheelCursor({
      x: centerX + Math.cos(angleRad) * dist,
      y: centerY + Math.sin(angleRad) * dist
    });
  };

  // Action Button Handlers
  const handleConnect = () => {
    setStatus('CONNECTED');
    setLogs(prev => [
      ...prev,
      {
        time: `[${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}:${new Date().getSeconds().toString().padStart(2, '0')}]`,
        tag: '[SYSTEM]',
        text: 'ESP32 reconnected on 192.168.4.1',
        color: 'text-cyan-400',
        bold: true
      }
    ]);
  };

  const handleDisconnect = () => {
    setStatus('DISCONNECTED');
    setIsTransmitting(false);
    setIsReceiving(false);
    setLogs(prev => [
      ...prev,
      {
        time: `[${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}:${new Date().getSeconds().toString().padStart(2, '0')}]`,
        tag: '[SYSTEM]',
        text: 'ESP32 Connection terminated by user',
        color: 'text-red-400',
        bold: true
      }
    ]);
  };

  const handleReboot = () => {
    setStatus('REBOOTING');
    setIsTransmitting(false);
    setIsReceiving(false);
    setPacketCount(0);
    setUptimeSeconds(0);
    setLogs([
      { time: '[00:00:00]', tag: '[SYSTEM]', text: 'ESP32 CPU Reboot requested...', color: 'text-red-500', bold: true },
      { time: '[00:00:01]', tag: '[SYSTEM]', text: 'Hard reset triggered via GPIO 0', color: 'text-amber-500' },
    ]);

    setTimeout(() => {
      setStatus('CONNECTED');
      setIsTransmitting(true);
      setLogs(prev => [
        ...prev,
        { time: '[00:00:02]', tag: '[SYSTEM]', text: 'Booting BWifiKill V4.0', color: 'text-cyan-400' },
        { time: '[00:00:02]', tag: '[SYSTEM]', text: 'Initializing modules...', color: 'text-cyan-400' },
        { time: '[00:00:03]', tag: '[IR MANAGER]', text: 'OK', color: 'text-emerald-400' },
        { time: '[00:00:03]', tag: '[OLED FRAME]', text: 'OK', color: 'text-zinc-400' },
        { time: '[00:00:04]', tag: '[IR JAMMER]', text: 'ACTIVE', color: 'text-emerald-500', bold: true },
      ]);
    }, 2000);
  };

  // D-Pad navigation trigger actions on OLED
  const handleDpadPress = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'OK') => {
    if (status !== 'CONNECTED') return;

    let textLog = '';
    if (direction === 'OK') {
      if (activeMode === 'IR JAMMER') {
        // Toggle Jammer sub-mode
        const nextSub = jammerSubMode === 'TV BURST' ? 'SIGNAL WAVEFORM' : 'TV BURST';
        setJammerSubMode(nextSub);
        textLog = `Triggered mode toggle to ${nextSub}`;
      } else if (activeMode === 'IR RECEIVER') {
        textLog = 'Cleared receiver capture buffer';
      } else {
        // IR Remote sends manual blast
        setIsTransmitting(true);
        setTimeout(() => setIsTransmitting(false), 200);
        textLog = 'Transmitted manual remote sequence [POWER] via D-PAD';
      }
    } else {
      textLog = `D-PAD Navigation key [${direction}] pressed`;
    }

    setLogs(prev => [
      ...prev,
      {
        time: `[${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}:${new Date().getSeconds().toString().padStart(2, '0')}]`,
        tag: '[D-PAD]',
        text: textLog,
        color: 'text-amber-400'
      }
    ]);
  };

  return (
    <div 
      className="flex-1 flex flex-col h-full max-w-7xl mx-auto w-full select-none"
      style={{
        '--display-color': displayColor,
        '--display-color-rgb': displayColorRgb,
      } as React.CSSProperties}
    >
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.6)] border border-indigo-400/30">
            <Wifi className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-sans tracking-tight uppercase text-zinc-100">
                BWifiKill
              </h1>
              <span className="text-[10px] font-mono border border-zinc-800 font-bold bg-zinc-900 text-zinc-300 rounded px-1.5 py-0.5">
                V4.0
              </span>
            </div>
            <div className="text-xs text-zinc-500 font-mono tracking-wider uppercase font-semibold mt-0.5">
              ESP32 Cyberdeck Controller
            </div>
          </div>
        </div>

        {/* ESP32 Real-time Stats Panel */}
        <div className="flex gap-6 panel-hardware px-5 py-2.5 items-center bg-black/40">
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 tracking-wider font-mono font-bold mb-0.5">ESP32 STATUS</span>
            <div className="flex items-center gap-2">
              <div 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  status === 'CONNECTED' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 
                  status === 'DISCONNECTED' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className="text-xs font-mono font-semibold text-zinc-200">{status}</span>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-zinc-800/80" />
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 tracking-wider font-mono font-bold mb-0.5">IP ADDRESS</span>
            <span className="text-xs font-mono text-zinc-300">192.168.4.1</span>
          </div>
          <div className="h-6 w-[1px] bg-zinc-800/80" />
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 tracking-wider font-mono font-bold mb-0.5">UPTIME</span>
            <span className="text-xs font-mono text-zinc-300 transition-all tabular-nums">{formatUptime(uptimeSeconds)}</span>
          </div>
        </div>
      </header>

      {/* THREE COLUMN MAIN SECTION */}
      <main className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden min-h-0 mb-4">
        
        {/* LEFT COLUMN: SERIAL LOG TERMINAL */}
        <div id="serial-log-panel" className="lg:w-1/4 flex flex-col panel-hardware p-4 overflow-hidden bg-black/20 min-h-[300px] lg:min-h-0">
          <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2.5 mb-2 shrink-0">
            <h2 className="text-[10px] font-bold font-mono tracking-widest text-zinc-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-ping" />
              SERIAL LOG
            </h2>
            <div className="flex gap-2 text-[10px] font-mono text-zinc-500">
              <button 
                onClick={() => setLogs([])}
                className="hover:text-white transition-colors bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 flex items-center gap-1 active:bg-black"
                title="Clear Logs"
              >
                <Trash2 className="w-3 h-3" /> CLEAR
              </button>
              <button 
                onClick={() => setIsLogsPaused(p => !p)}
                className={`transition-colors border rounded px-1.5 py-0.5 flex items-center gap-1 active:bg-black ${
                  isLogsPaused ? 'bg-amber-950/40 border-amber-800 text-amber-400' : 'bg-zinc-900 border-zinc-800 hover:text-white'
                }`}
                title={isLogsPaused ? 'Resume Logging' : 'Pause Logging'}
              >
                {isLogsPaused ? <Play className="w-3 h-3 text-amber-400" /> : <Pause className="w-3 h-3" />} 
                {isLogsPaused ? 'RESUME' : 'PAUSE'}
              </button>
            </div>
          </div>

          {/* Scrolling Terminal Area */}
          <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1.5 text-zinc-400 pr-1.5 py-2 terminal-scrollbar recessed-well p-4 rounded-2xl flex flex-col select-text">
            {logs.map((log, index) => (
              <div key={index} className="flex flex-wrap items-start gap-1">
                <span className="text-zinc-600 shrink-0 font-light">{log.time}</span>
                <span className={`${log.color} font-medium tracking-tight shrink-0`}>{log.tag}</span>
                <span className={`text-zinc-300 font-light break-all ${log.bold ? 'font-bold' : ''}`}>{log.text}</span>
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Log Settings Dropdown */}
          <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-mono font-bold text-zinc-500">DIAG LEVEL</span>
            <select 
              value={logLevel} 
              onChange={(e) => setLogLevel(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 text-xs font-mono font-medium text-zinc-300 rounded-md px-2.5 py-1 focus:ring-1 focus:ring-zinc-700 focus:outline-none transition-all cursor-pointer"
            >
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
        </div>

        {/* CENTER COLUMN: HIGH-FIDELITY OLED BOARD */}
        <div className="flex-1 flex justify-center items-center p-2 lg:p-4 panel-hardware bg-black/40 min-h-[350px] lg:min-h-0 relative">
          
          {/* Main PCB layout card - uses real oled.png as background */}
          <div className="relative w-full max-w-[450px] aspect-square flex flex-col items-center justify-center select-none shadow-2xl">
            
            {/* The Raw OLED device module background */}
            <img 
              src="/oled.png" 
              alt="OLED PCB Board" 
              className={`w-full h-full object-contain pointer-events-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] ${imageError ? 'hidden' : 'block'}`}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />

            {/* HIGH-FIDELITY CSS FALLBACK (Shown only if oled.png is missing) */}
            {imageError && (
              <div 
                id="pcb-fallback-container"
                className="absolute inset-0 rounded-2xl border-2 border-zinc-800 bg-[#0e0e0e] flex flex-col items-center justify-center p-8 shadow-2xl"
              >
                {/* Gold corners */}
                <div className="absolute top-4 left-4 w-6 h-6 rounded-full border-[5px] border-[#c5a059] bg-[#050505] shadow-inner" />
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full border-[5px] border-[#c5a059] bg-[#050505] shadow-inner" />
                <div className="absolute bottom-4 left-4 w-6 h-6 rounded-full border-[5px] border-[#c5a059] bg-[#050505] shadow-inner" />
                <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full border-[5px] border-[#c5a059] bg-[#050505] shadow-inner" />
                
                {/* Header block */}
                <div className="absolute top-4 border border-zinc-700/60 p-1 px-3 rounded-md bg-[#050505] flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 border border-amber-300" />
                  <div className="w-2 h-2 rounded-full bg-amber-500 border border-amber-300" />
                  <div className="w-2 h-2 rounded-full bg-amber-500 border border-amber-300" />
                  <div className="w-2 h-2 rounded-full bg-amber-500 border border-amber-300" />
                </div>
                <div className="absolute top-11 text-[9px] font-mono text-zinc-500 flex gap-2">
                  <span>VCC</span><span>GND</span><span>SCL</span><span>SDA</span>
                </div>
                
                {/* Screen Bezel fallback */}
                <div className="w-[82%] aspect-[1.8] rounded-xl border-[4px] border-zinc-900 bg-black flex items-center justify-center p-3 relative shadow-2xl" />

                {/* Ribbon cable */}
                <div className="absolute bottom-4 w-32 h-14 bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 rounded-b-md flex justify-center items-end pb-1 shadow-inner">
                  <div className="w-24 h-1.5 bg-[#c5a059]/40 rounded-sm flex justify-around px-1">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="w-[2px] h-full bg-[#c5a059]/80" />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* DYNAMIC SCREEN OVERLAY: Maps perfectly to the glass screen coordinate boundaries of oled.png */}
            <div 
              id="oled-screen-layer"
              className={`absolute top-[23%] left-[12.3%] w-[75.4%] h-[51%] overflow-hidden rounded-[4px] select-none transition-all duration-300`}
              style={{
                backgroundColor: invertDisplay ? displayColor : '#000000',
                color: invertDisplay ? '#000000' : displayColor,
                filter: `brightness(${brightness}%)`,
                boxShadow: invertDisplay ? `0 0 15px rgba(${displayColorRgb}, 0.3)` : 'none'
              }}
            >
              {/* Realistic CRT scanline and diagonal glass gloss layer */}
              <div className="screen-scanlines" />
              <div className="screen-glass" />

              {/* Pixel-content of the OLED */}
              <div className="relative z-10 w-full h-full p-2.5 flex flex-col justify-between font-mono">
                
                {/* Upper line: Mode + Frequency */}
                <div className="flex justify-between items-center text-[10px] tracking-wide shrink-0">
                  <span className={`font-bold transition-all ${invertDisplay ? 'text-black' : 'glow-text'}`}>
                    {activeMode}
                  </span>
                  <span className={`text-[9px] font-medium ${invertDisplay ? 'text-zinc-800' : 'text-zinc-400'}`}>
                    {activeMode === 'IR JAMMER' ? '38kHz' : activeMode === 'IR RECEIVER' ? 'SCANNING' : '940nm'}
                  </span>
                </div>

                {/* Main center heading text */}
                <div className="text-center my-0.5 shrink-0">
                  <div className={`text-[13px] font-bold tracking-wider ${invertDisplay ? 'text-black' : 'glow-text'}`}>
                    {activeMode === 'IR JAMMER' ? `${jammerSubMode} MODE` : 
                     activeMode === 'IR RECEIVER' ? (isReceiving ? 'SIGNAL CAPTURED' : 'SPECTRUM LISTEN') : 
                     'KEYPAD ACTIVE'}
                  </div>
                </div>

                {/* Dynamic Waveform Visualizer */}
                <div className={`flex-1 flex items-end justify-between px-1 relative border-b pb-0.5 my-1 ${
                  invertDisplay ? 'border-zinc-800' : 'border-zinc-900/60'
                }`}>
                  {/* Grid background toggler */}
                  {gridOnGraph && (
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.12]">
                      <div className="w-full border-b border-dashed border-current h-0" />
                      <div className="w-full border-b border-dashed border-current h-0" />
                      <div className="w-full border-b border-dashed border-current h-0" />
                      <div className="w-full border-b border-dashed border-current h-0" />
                    </div>
                  )}

                  {/* Render the actual wave lines */}
                  {waveform.map((h, i) => (
                    <div 
                      key={i} 
                      className={`w-[1.5px] rounded-t-sm transition-all duration-75 ${
                        invertDisplay ? 'bg-black opacity-80' : 'glow-bg'
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>

                {/* Footer labels (Toggled by showFooter) */}
                <div 
                  className={`flex justify-between items-center text-[8.5px] tracking-tight shrink-0 transition-all duration-300 ${
                    showFooter ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
                  } ${invertDisplay ? 'text-zinc-800' : 'text-zinc-400'}`}
                >
                  <span className="tabular-nums">PKT: {packetCount}</span>
                  <span>D: {activeMode === 'IR JAMMER' ? '74%' : '15%'}</span>
                  <span>RAND-OOK</span>
                  <span className="tabular-nums">{activeMode === 'IR JAMMER' ? '04:01' : '02:18'}</span>
                </div>
                
              </div>
            </div>

            {/* Corner labels matching the physical OLED */}
            <div className="absolute bottom-[20.5%] left-[13%] text-[8px] text-zinc-500 font-mono tracking-wide">A0K1</div>
            <div className="absolute bottom-[20.5%] right-[13%] text-[8px] text-zinc-500 font-mono tracking-wide">1104</div>

          </div>
        </div>

        {/* RIGHT COLUMN: HARDWARE CONTROLS */}
        <div className="lg:w-1/4 flex flex-col gap-4">
          
          {/* Realistic Transmit and Receive Diode Status */}
          <div className="grid grid-cols-2 gap-4 h-28 shrink-0">
            {/* Red LED Diode for Transmitter */}
            <div className="panel-hardware flex flex-col items-center justify-center p-3 relative bg-black/30">
              <span className="text-[9px] font-mono font-bold text-zinc-500 tracking-wider mb-2">IR TRANSMIT</span>
              <div className="relative flex flex-col items-center justify-center">
                
                {/* SVG 3D Red Diode */}
                <svg className="w-10 h-10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" viewBox="0 0 40 40">
                  {/* Metal legs */}
                  <line x1="16" y1="24" x2="16" y2="38" stroke="#555" strokeWidth="1.5" />
                  <line x1="24" y1="24" x2="24" y2="35" stroke="#444" strokeWidth="1.5" />
                  {/* Base spacer plate */}
                  <ellipse cx="20" cy="24" rx="7" ry="1.5" fill="#333" />
                  {/* LED glass body */}
                  <path d="M13,24 L13,15 A7,7 0 0,1 27,15 L27,24 Z" fill="url(#redLedGradient)" />
                  {/* Cathode inside */}
                  <path d="M15,20 L18,17 L18,22" stroke="#d4d4d8" strokeWidth="1" fill="none" opacity="0.6" />
                  <path d="M25,21 L22,18 L22,23" stroke="#94a3b8" strokeWidth="1.5" fill="none" opacity="0.8" />
                  
                  <defs>
                    <linearGradient id="redLedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#991b1b" />
                      <stop offset="30%" stopColor="#ef4444" />
                      <stop offset="70%" stopColor="#f87171" />
                      <stop offset="100%" stopColor="#7f1d1d" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Transmitter active light overlay waves */}
                {isTransmitting && status === 'CONNECTED' && (
                  <div className="absolute top-1 flex items-center justify-center pointer-events-none">
                    {/* Glowing aura */}
                    <div className="absolute w-8 h-8 rounded-full bg-red-500/35 blur-md animate-pulse" />
                    {/* Signal arcs */}
                    <div className="absolute w-12 h-12 rounded-full border border-red-500/40 animate-ping opacity-75" />
                    <div className="absolute w-16 h-16 rounded-full border-t border-b border-red-400/20 animate-[ping_1.5s_infinite] opacity-40" />
                  </div>
                )}
              </div>
            </div>

            {/* Cyan/Blue IR Receiver Photodiode */}
            <div className="panel-hardware flex flex-col items-center justify-center p-3 relative bg-black/30">
              <span className="text-[9px] font-mono font-bold text-zinc-500 tracking-wider mb-2">IR RECEIVE</span>
              <div className="relative flex flex-col items-center justify-center">
                
                {/* SVG 3D Receiver Component */}
                <svg className="w-10 h-10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" viewBox="0 0 40 40">
                  {/* Metal legs */}
                  <line x1="15" y1="26" x2="15" y2="38" stroke="#444" strokeWidth="1.5" />
                  <line x1="20" y1="26" x2="20" y2="35" stroke="#555" strokeWidth="1.5" />
                  <line x1="25" y1="26" x2="25" y2="38" stroke="#444" strokeWidth="1.5" />
                  {/* Metal shield bracket */}
                  <rect x="11" y="10" width="18" height="16" rx="1.5" fill="#2d3748" stroke="#1a202c" strokeWidth="1" />
                  {/* Internal lens dome */}
                  <circle cx="20" cy="18" r="5" fill="url(#receiverDomeGradient)" />
                  {/* Metal mesh grid */}
                  <line x1="14" y1="12" x2="14" y2="24" stroke="#4a5568" strokeWidth="1" opacity="0.5" />
                  <line x1="26" y1="12" x2="26" y2="24" stroke="#4a5568" strokeWidth="1" opacity="0.5" />
                  
                  <defs>
                    <linearGradient id="receiverDomeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1a365d" />
                      <stop offset="40%" stopColor="#2b6cb0" />
                      <stop offset="80%" stopColor="#0f172a" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Receiver active light waves */}
                {isReceiving && status === 'CONNECTED' && (
                  <div className="absolute top-1 flex items-center justify-center pointer-events-none">
                    <div className="absolute w-8 h-8 rounded-full bg-cyan-500/25 blur-md" />
                    <div className="absolute w-12 h-12 rounded-full border border-cyan-400/50 animate-ping" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* OLED COLOR PICKER PANEL */}
          <div className="panel-hardware p-4 flex-1 flex flex-col justify-between bg-black/10">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h2 className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 flex items-center gap-1.5">
                OLED COLOR
              </h2>
              <button 
                onClick={() => handlePresetSelect('#00ffff', '0, 255, 255')}
                className="text-zinc-500 hover:text-white transition-all active:rotate-180 duration-300"
                title="Reset to default Cyan"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive Color Wheel Section */}
            <div className="flex items-center gap-4 py-2 flex-1 justify-center lg:justify-between">
              {/* Custom Canvas Color Wheel */}
              <div 
                ref={colorWheelRef}
                onMouseDown={handleMouseDown}
                className="w-36 h-36 rounded-full relative cursor-crosshair select-none shadow-[inset_0_3px_10px_rgba(0,0,0,0.85),0_4px_12px_rgba(0,0,0,0.5)] border-2 border-zinc-950 shrink-0"
                style={{
                  background: 'conic-gradient(red, #ff00ff, blue, #00ffff, lime, yellow, red)',
                }}
              >
                {/* White radial center overlay */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.15) 55%, transparent 85%)'
                  }}
                />

                {/* Target cursor indicator */}
                <div 
                  className="absolute w-3.5 h-3.5 rounded-full bg-white border border-zinc-950 shadow-lg pointer-events-none -translate-x-1.75 -translate-y-1.75 transition-all duration-75"
                  style={{
                    left: `${colorWheelCursor.x}px`,
                    top: `${colorWheelCursor.y}px`
                  }}
                />
              </div>

              {/* Selected Color Readout */}
              <div className="flex flex-col gap-2 shrink-0">
                <div 
                  className="h-9 w-14 rounded border border-zinc-950 transition-all duration-300 shadow-md"
                  style={{
                    backgroundColor: displayColor,
                    boxShadow: `0 0 10px rgba(${displayColorRgb}, 0.5)`
                  }}
                />
                <div className="text-[10px] font-mono text-zinc-400 font-medium leading-relaxed bg-zinc-950/80 p-1.5 border border-zinc-900 rounded select-text">
                  R: {displayColorRgb.split(',')[0]}<br />
                  G: {displayColorRgb.split(',')[1]}<br />
                  B: {displayColorRgb.split(',')[2]}
                </div>
              </div>
            </div>

            {/* Color Swatch presets */}
            <div className="flex justify-between px-1.5 py-3 shrink-0">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset.hex, preset.rgb)}
                  className={`w-4 h-4 rounded-full transition-all duration-200 cursor-pointer ${
                    displayColor === preset.hex 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-125' 
                      : 'hover:scale-110'
                  }`}
                  style={{
                    backgroundColor: preset.hex,
                    boxShadow: displayColor === preset.hex ? `0 0 8px ${preset.hex}` : 'none'
                  }}
                  title={`Preset ${preset.name}`}
                />
              ))}
            </div>

            {/* BRIGHTNESS SLIDER */}
            <div className="mb-4 shrink-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[9px] font-mono font-bold text-zinc-500 tracking-wider">BRIGHTNESS</span>
                <Sun className="w-3.5 h-3.5 text-zinc-400 glow-text" />
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="20" 
                  max="100" 
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs font-mono text-zinc-400 w-8 text-right tabular-nums">{brightness}%</span>
              </div>
            </div>

            {/* DISPLAY SETTINGS TOGGLES */}
            <div className="space-y-3 pt-2 border-t border-zinc-800/80 shrink-0">
              <h3 className="text-[9px] font-mono font-bold tracking-widest text-zinc-500">DISPLAY SETTINGS</h3>
              
              {/* Invert Toggle */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-300 font-medium">INVERT DISPLAY</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={invertDisplay}
                    onChange={(e) => setInvertDisplay(e.target.checked)}
                    className="sr-only"
                  />
                  <div className="w-9 h-5 bg-zinc-800 border border-zinc-700 rounded-full transition-all duration-200">
                    <div 
                      className={`toggle-dot absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                        invertDisplay ? 'bg-zinc-950 translate-x-4' : 'bg-zinc-400'
                      }`}
                      style={{
                        backgroundColor: invertDisplay ? displayColor : '#a1a1aa',
                        boxShadow: invertDisplay ? `0 0 6px ${displayColor}` : 'none'
                      }}
                    />
                  </div>
                </label>
              </div>

              {/* Grid Toggle */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-300 font-medium">GRID ON GRAPH</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={gridOnGraph}
                    onChange={(e) => setGridOnGraph(e.target.checked)}
                    className="sr-only"
                  />
                  <div className="w-9 h-5 bg-zinc-800 border border-zinc-700 rounded-full transition-all duration-200">
                    <div 
                      className={`toggle-dot absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                        gridOnGraph ? 'bg-zinc-950 translate-x-4' : 'bg-zinc-400'
                      }`}
                      style={{
                        backgroundColor: gridOnGraph ? displayColor : '#a1a1aa',
                        boxShadow: gridOnGraph ? `0 0 6px ${displayColor}` : 'none'
                      }}
                    />
                  </div>
                </label>
              </div>

              {/* Footer Toggle */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-300 font-medium">SHOW FOOTER</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showFooter}
                    onChange={(e) => setShowFooter(e.target.checked)}
                    className="sr-only"
                  />
                  <div className="w-9 h-5 bg-zinc-800 border border-zinc-700 rounded-full transition-all duration-200">
                    <div 
                      className={`toggle-dot absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                        showFooter ? 'bg-zinc-950 translate-x-4' : 'bg-zinc-400'
                      }`}
                      style={{
                        backgroundColor: showFooter ? displayColor : '#a1a1aa',
                        boxShadow: showFooter ? `0 0 6px ${displayColor}` : 'none'
                      }}
                    />
                  </div>
                </label>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* BOTTOM HARDWARE NAVIGATION/BUTTON RAIL */}
      {showFooter && (
        <footer className="mt-auto flex flex-col lg:flex-row justify-between items-stretch gap-4 shrink-0 pb-2 relative z-10 bg-[#070709] border border-zinc-900/80 rounded-2xl p-2.5 shadow-[0_15px_40px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.03)] select-none">
          {/* subtle glossy accent on the chassis plate */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/20 to-transparent pointer-events-none" />

          {/* Left Column: System Connection Actions */}
          <div className="flex flex-col gap-2 justify-center w-full lg:w-[220px] shrink-0 p-1 relative z-10">
            {/* CONNECT button */}
            <button 
              onClick={handleConnect}
              className={`hardware-key py-2.5 px-3.5 flex items-center justify-start gap-3 rounded-lg border text-emerald-500 font-mono font-bold text-xs tracking-wider transition-all duration-300 ${
                status === 'CONNECTED' ? 'bg-[#101a14] border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)]' : 'border-zinc-900/50'
              }`}
            >
              <Link className="w-4 h-4 text-emerald-500" />
              <span className="tracking-wider text-[11px]">CONNECT</span>
            </button>
            
            {/* DISCONNECT button */}
            <button 
              onClick={handleDisconnect}
              className={`hardware-key py-2.5 px-3.5 flex items-center justify-start gap-3 rounded-lg border text-red-500 font-mono font-bold text-xs tracking-wider transition-all duration-300 ${
                status === 'DISCONNECTED' ? 'bg-[#1e1112] border-red-500/25 shadow-[0_0_12px_rgba(239,68,68,0.15)]' : 'border-zinc-900/50'
              }`}
            >
              <Unlink className="w-4 h-4 text-red-500" />
              <span className="tracking-wider text-[11px]">DISCONNECT</span>
            </button>
            
            {/* REBOOT button */}
            <button 
              onClick={handleReboot}
              className={`hardware-key py-2.5 px-3.5 flex items-center justify-start gap-3 rounded-lg border text-amber-500 font-mono font-bold text-xs tracking-wider transition-all duration-300 ${
                status === 'REBOOTING' ? 'bg-[#1c1810] border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]' : 'border-zinc-900/50'
              }`}
            >
              <RefreshCw className={`w-4 h-4 text-amber-500 ${status === 'REBOOTING' ? 'animate-spin' : ''}`} />
              <span className="tracking-wider text-[11px]">REBOOT</span>
            </button>
          </div>

          {/* Center Column: Interactive Navigation D-Pad */}
          <div className="flex-1 min-h-[145px] bg-[#050506] border border-zinc-900 rounded-xl p-3 shadow-[inset_0_4px_12px_rgba(0,0,0,0.95)] relative overflow-hidden flex items-center justify-center">
            {/* Circuit Traces Layer */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
              {/* Horizontal Line */}
              <div className="absolute top-1/2 left-[15%] right-[15%] h-[2px] bg-zinc-800 -translate-y-1/2" />
              {/* Vertical Line */}
              <div className="absolute left-1/2 top-[15%] bottom-[15%] w-[2px] bg-zinc-800 -translate-x-1/2" />
              {/* Joint connectors */}
              <div className="absolute left-[34%] top-1/2 -translate-y-1/2 w-4 h-[1px] bg-zinc-700" />
              <div className="absolute right-[34%] top-1/2 -translate-y-1/2 w-4 h-[1px] bg-zinc-700" />
            </div>

            {/* D-Pad 3x3 Button Grid */}
            <div className="grid grid-cols-3 grid-rows-3 gap-x-2.5 gap-y-2 w-full max-w-[460px] h-full relative z-10">
              {/* Row 1: UP button in middle column */}
              <div />
              <div className="flex items-center justify-center">
                <button 
                  onClick={() => handleDpadPress('UP')}
                  className="hardware-key w-24 h-9 rounded-lg font-mono font-bold text-[#3fc5f0]"
                >
                  <ChevronUp className="w-5 h-5 text-cyan-400" />
                </button>
              </div>
              <div />

              {/* Row 2: LEFT, OK, RIGHT */}
              <div className="flex items-center justify-end">
                <button 
                  onClick={() => handleDpadPress('LEFT')}
                  className="hardware-key w-24 h-9 rounded-lg font-mono font-bold text-[#3fc5f0]"
                >
                  <ChevronLeft className="w-5 h-5 text-cyan-400" />
                </button>
              </div>
              <div className="flex items-center justify-center">
                <button 
                  onClick={() => handleDpadPress('OK')}
                  className="hardware-key w-24 h-9 rounded-lg font-mono font-bold text-xs tracking-wider text-[#3fc5f0] border border-cyan-500/20"
                >
                  OK
                </button>
              </div>
              <div className="flex items-center justify-start">
                <button 
                  onClick={() => handleDpadPress('RIGHT')}
                  className="hardware-key w-24 h-9 rounded-lg font-mono font-bold text-[#3fc5f0]"
                >
                  <ChevronRight className="w-5 h-5 text-cyan-400" />
                </button>
              </div>

              {/* Row 3: DOWN button in middle, BACK button on the right */}
              <div />
              <div className="flex items-center justify-center">
                <button 
                  onClick={() => handleDpadPress('DOWN')}
                  className="hardware-key w-24 h-9 rounded-lg font-mono font-bold text-[#3fc5f0]"
                >
                  <ChevronDown className="w-5 h-5 text-cyan-400" />
                </button>
              </div>
              <div className="flex items-center justify-start">
                <button 
                  onClick={() => handleDpadPress('LEFT')}
                  className="hardware-key w-16 h-8 rounded-md font-mono font-bold text-[10px] text-rose-500 hover:text-rose-400 tracking-wider uppercase border border-rose-500/10"
                >
                  BACK
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Mode Selectors (JAMMER, RECEIVER, REMOTE) */}
          <div className="flex flex-col gap-2 justify-center w-full lg:w-[250px] shrink-0 p-1 relative z-10">
            {/* IR JAMMER button */}
            <button 
              onClick={() => setActiveMode('IR JAMMER')}
              className={`hardware-key py-2.5 px-4 flex items-center justify-start gap-3 rounded-lg border transition-all duration-300 ${
                activeMode === 'IR JAMMER' 
                  ? 'bg-[#0f1b20] text-cyan-400 border-cyan-500/25 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-bold' 
                  : 'border-zinc-900/50 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Activity className={`w-4 h-4 ${activeMode === 'IR JAMMER' ? 'text-cyan-400 shadow-glow shadow-cyan-400' : 'text-cyan-600/70'}`} />
              <span className="text-xs font-mono font-bold tracking-wider">
                IR JAMMER
              </span>
            </button>
            
            {/* IR RECEIVER button */}
            <button 
              onClick={() => setActiveMode('IR RECEIVER')}
              className={`hardware-key py-2.5 px-4 flex items-center justify-start gap-3 rounded-lg border transition-all duration-300 ${
                activeMode === 'IR RECEIVER' 
                  ? 'bg-[#101c15] text-emerald-400 border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-bold' 
                  : 'border-zinc-900/50 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Zap className={`w-4 h-4 ${activeMode === 'IR RECEIVER' ? 'text-emerald-400 shadow-glow shadow-emerald-400' : 'text-emerald-600/70'}`} />
              <span className="text-xs font-mono font-bold tracking-wider">
                IR RECEIVER
              </span>
            </button>
            
            {/* IR REMOTE button */}
            <button 
              onClick={() => setActiveMode('IR REMOTE')}
              className={`hardware-key py-2.5 px-4 flex items-center justify-start gap-3 rounded-lg border transition-all duration-300 ${
                activeMode === 'IR REMOTE' 
                  ? 'bg-[#1c1710] text-amber-400 border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-bold' 
                  : 'border-zinc-900/50 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Tv className={`w-4 h-4 ${activeMode === 'IR REMOTE' ? 'text-amber-400 shadow-glow shadow-amber-400' : 'text-amber-600/70'}`} />
              <span className="text-xs font-mono font-bold tracking-wider">
                IR REMOTE
              </span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
