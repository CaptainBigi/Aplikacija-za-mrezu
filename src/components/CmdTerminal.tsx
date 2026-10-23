import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Square,
  Copy,
  Download,
  Trash2,
  Play,
  RotateCcw,
  Check,
  ChevronRight,
  ExternalLink,
  Laptop,
  Power
} from 'lucide-react';
import { Device, TerminalTab } from '../types';

interface CmdTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  tabs: TerminalTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: (title?: string, cmd?: 'ping' | 'tracert' | 'telnet' | 'custom', target?: string) => void;
  onExecuteInTab: (tabId: string, commandText: string) => void;
  onAbortTab: (tabId: string) => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

export const CmdTerminal: React.FC<CmdTerminalProps> = ({
  isOpen,
  onClose,
  devices,
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onExecuteInTab,
  onAbortTab,
  isMinimized,
  onToggleMinimize,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'classic' | 'matrix' | 'powershell' | 'amber'>('classic');
  const [copied, setCopied] = useState(false);
  const [selectedDeviceIp, setSelectedDeviceIp] = useState<string>('');

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeTab?.lines]);

  // Focus input on tab switch or open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, activeTabId, isMinimized]);

  if (!isOpen) return null;

  // Minimized dock widget in bottom-right corner
  if (isMinimized) {
    const runningCount = tabs.filter((t) => t.isRunning).length;
    return (
      <div
        onClick={onToggleMinimize}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-[#0c0c0c] text-white border border-[#333] hover:border-[#4b6bfb] px-4 py-2.5 rounded-lg shadow-2xl cursor-pointer transition-all duration-200 hover:scale-105"
      >
        <div className="relative">
          <TerminalIcon className="w-5 h-5 text-emerald-400" />
          {runningCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          )}
        </div>
        <div className="text-xs">
          <div className="font-mono font-bold flex items-center gap-2">
            <span>C:\Windows\System32\cmd.exe</span>
            {runningCount > 0 && (
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-600/40 px-1.5 py-0.5 rounded text-[10px]">
                {runningCount} aktivan
              </span>
            )}
          </div>
          <div className="text-gray-400 text-[11px] truncate max-w-[200px]">
            {activeTab?.title || 'Konzola spremna'}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMinimize();
          }}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
          title="Otvori konzolu"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cmd = inputVal.trim();
      if (!cmd) return;

      setHistory((prev) => [...prev, cmd]);
      setHistoryIndex(-1);
      setInputVal('');

      if (activeTab) {
        onExecuteInTab(activeTab.id, cmd);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputVal(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setInputVal('');
      } else {
        setHistoryIndex(nextIndex);
        setInputVal(history[nextIndex]);
      }
    } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      if (activeTab?.isRunning) {
        e.preventDefault();
        onAbortTab(activeTab.id);
      }
    }
  };

  const handleCopy = () => {
    if (!activeTab) return;
    const text = activeTab.lines.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeTab) return;
    const text = activeTab.lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cmd_output_${activeTab.commandType}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handlePreset = (presetCmd: string) => {
    if (!activeTab) return;
    const target = selectedDeviceIp || activeTab.target || '11.29.50.1';
    let finalCmd = presetCmd.replace('{ip}', target);
    onExecuteInTab(activeTab.id, finalCmd);
  };

  const themeClasses = {
    classic: 'bg-[#0c0c0c] text-gray-200 border-[#2b2b2b]',
    matrix: 'bg-[#030d06] text-emerald-400 border-emerald-900/60',
    powershell: 'bg-[#012456] text-white border-blue-900',
    amber: 'bg-[#0f0902] text-amber-400 border-amber-900/60',
  }[theme];

  const themeHeaderClasses = {
    classic: 'bg-[#1f1f1f] border-b border-[#333] text-gray-200',
    matrix: 'bg-[#081a0e] border-b border-emerald-900/80 text-emerald-400',
    powershell: 'bg-[#001737] border-b border-blue-900 text-white',
    amber: 'bg-[#1f1304] border-b border-amber-900/80 text-amber-300',
  }[theme];

  return (
    <div
      className={`fixed z-50 transition-all duration-150 flex flex-col shadow-2xl overflow-hidden ${
        isFullscreen
          ? 'inset-0 w-full h-full rounded-none'
          : 'bottom-4 right-4 w-[92vw] sm:w-[780px] md:w-[860px] h-[580px] max-h-[92vh] rounded-lg border'
      } ${themeClasses}`}
    >
      {/* WINDOW TITLEBAR (Authentic Windows CMD Header) */}
      <div
        className={`flex items-center justify-between px-3 py-2 select-none cursor-default ${themeHeaderClasses}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-4 h-4 rounded-sm bg-gradient-to-tr from-blue-600 to-indigo-400 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
            C:_
          </div>
          <span className="font-mono text-xs font-semibold tracking-wide truncate">
            C:\Windows\System32\cmd.exe — [NET-SCAN Mrežna Konzola]
          </span>
          {activeTab?.isRunning && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Izvršavanje u toku...
            </span>
          )}
        </div>

        {/* WINDOW CONTROLS (- □ ✕) */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMinimize}
            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
            title="Minimiziraj"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
            title={isFullscreen ? 'Vrati veličinu' : 'Povećaj na ceo ekran'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-600 rounded text-gray-400 hover:text-white transition-colors ml-1"
            title="Zatvori konzolu"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SESSION TABS BAR */}
      <div className="flex items-center bg-[#141414] border-b border-[#282828] px-2 pt-1.5 gap-1 overflow-x-auto text-xs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-md font-mono cursor-pointer transition-all border-t border-x ${
                isActive
                  ? 'bg-[#0c0c0c] border-[#333] text-emerald-400 font-semibold'
                  : 'bg-[#1a1a1a] border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#202020]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  tab.isRunning ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'
                }`}
              />
              <span className="truncate max-w-[140px]">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/20 rounded text-gray-400 hover:text-red-400 transition-opacity"
                  title="Zatvori karticu"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={() => onNewTab()}
          className="px-2 py-1 text-gray-400 hover:text-white hover:bg-white/10 rounded text-xs font-mono transition-colors"
          title="Nova konzola"
        >
          + Nova
        </button>
      </div>

      {/* TOOLBAR & PRESET ACTION BUTTONS */}
      <div className="bg-[#121212] border-b border-[#242424] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Target Selector */}
          <div className="flex items-center gap-1.5 bg-[#1c1c1c] px-2 py-1 rounded border border-[#333]">
            <Laptop className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedDeviceIp || activeTab?.target || ''}
              onChange={(e) => setSelectedDeviceIp(e.target.value)}
              className="bg-transparent text-gray-200 text-xs font-mono outline-none cursor-pointer max-w-[180px]"
            >
              <option value="" className="bg-[#1c1c1c] text-gray-400">
                -- Izaberi uređaj --
              </option>
              {devices.map((d) => (
                <option key={d.id} value={d.ip} className="bg-[#1c1c1c] text-gray-200">
                  {d.name} ({d.ip})
                </option>
              ))}
            </select>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => handlePreset('ping {ip}')}
              className="px-2 py-1 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-700/50 rounded font-mono text-[11px] transition-all hover:scale-105"
              title="Pošalji 4 ICMP paketa"
            >
              Ping 4x
            </button>
            <button
              onClick={() => handlePreset('ping -t {ip}')}
              className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 rounded font-mono text-[11px] transition-all hover:scale-105"
              title="Pinguj bez prestanka dok ne kliknete Zaustavi"
            >
              Ping -t (Uživo)
            </button>
            <button
              onClick={() => handlePreset('tracert {ip}')}
              className="px-2 py-1 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700/50 rounded font-mono text-[11px] transition-all hover:scale-105"
              title="Prikaži sve skokove (rutu) do cilja"
            >
              Tracert
            </button>
            <button
              onClick={() => handlePreset('telnet {ip} 80')}
              className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700/50 rounded font-mono text-[11px] transition-all hover:scale-105"
              title="Proveri da li je otvoren web port 80"
            >
              Telnet:80
            </button>
            <button
              onClick={() => handlePreset('telnet {ip} 23')}
              className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700/50 rounded font-mono text-[11px] transition-all hover:scale-105"
              title="Proveri Telnet port 23"
            >
              Telnet:23
            </button>
          </div>
        </div>

        {/* Actions (Abort, Clear, Copy, Export, Themes) */}
        <div className="flex items-center gap-1.5 ml-auto">
          {activeTab?.isRunning ? (
            <button
              onClick={() => onAbortTab(activeTab.id)}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded font-mono text-[11px] font-bold shadow-sm transition-all animate-pulse"
              title="Prekini komandu (Ctrl+C)"
            >
              <Square className="w-3 h-3 fill-current" /> Zaustavi (Ctrl+C)
            </button>
          ) : (
            <button
              onClick={() => {
                if (activeTab) onExecuteInTab(activeTab.id, 'cls');
              }}
              className="flex items-center gap-1 px-2 py-1 bg-[#222] hover:bg-[#333] text-gray-300 rounded font-mono text-[11px] transition-colors"
              title="Očisti ekran (CLS)"
            >
              <Trash2 className="w-3 h-3" /> CLS
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Kopiraj sav tekst iz konzole"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Preuzmi .txt log fajl"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Theme selector */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="bg-[#1c1c1c] text-gray-300 border border-[#333] rounded px-1.5 py-0.5 text-[10px] font-mono outline-none"
            title="Izaberi temu konzole"
          >
            <option value="classic">CMD Sivo</option>
            <option value="matrix">Matrix Zeleno</option>
            <option value="powershell">PowerShell</option>
            <option value="amber">Amber CRT</option>
          </select>
        </div>
      </div>

      {/* TERMINAL OUTPUT AREA */}
      <div
        ref={outputRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 p-3 font-mono text-[13px] leading-relaxed overflow-y-auto select-text whitespace-pre-wrap break-all"
        style={{
          fontFamily: 'Consolas, "Lucida Console", "Courier New", monospace',
        }}
      >
        {activeTab?.lines.map((line, idx) => (
          <div key={idx} className="min-h-[1.25rem]">
            {line}
          </div>
        ))}

        {/* ACTIVE PROMPT LINE */}
        <div className="flex items-center gap-1 mt-1 text-emerald-400">
          <span className="font-bold select-none text-gray-400">C:\NET-SCAN&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={activeTab?.isRunning}
            placeholder={
              activeTab?.isRunning
                ? 'Izvršavanje u toku... (pritisnite Zaustavi za prekid)'
                : 'Upišite komandu (npr. ping 11.29.50.1 ili tracert ili help) i pritisnite Enter...'
            }
            className="flex-1 bg-transparent border-none outline-none font-mono text-[13px] text-inherit placeholder:text-gray-600 disabled:opacity-50"
            autoFocus
          />
          {!activeTab?.isRunning && <span className="terminal-cursor" />}
        </div>
      </div>

      {/* QUICK COMMAND HINT FOOTER */}
      <div className="bg-[#080808] border-t border-[#1e1e1e] px-3 py-1 text-[11px] font-mono text-gray-500 flex items-center justify-between">
        <div className="flex items-center gap-3 truncate">
          <span>
            Komande: <code className="text-gray-300">ping [ip]</code>,{' '}
            <code className="text-gray-300">tracert [ip]</code>,{' '}
            <code className="text-gray-300">telnet [ip] [port]</code>,{' '}
            <code className="text-gray-300">ipconfig</code>,{' '}
            <code className="text-gray-300">arp -a</code>,{' '}
            <code className="text-gray-300">cls</code>
          </span>
        </div>
        <div className="text-[10px] text-gray-600 hidden sm:block">
          Ugrađena konzola radi unutar browsera klijenta (nema iskačućih prozora na serveru)
        </div>
      </div>
    </div>
  );
};
