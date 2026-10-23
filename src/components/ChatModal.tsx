import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, User, ShieldCheck, RefreshCw, Radio } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatMessages: ChatMessage[];
  onSendMessage: (msg: string) => Promise<void>;
  currentUser: string;
  hasAdminAccess?: boolean;
  onOpenAdmin?: () => void;
  onRefreshChat?: () => Promise<void>;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  chatMessages,
  onSendMessage,
  currentUser,
  hasAdminAccess,
  onOpenAdmin,
  onRefreshChat,
}) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const chatListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatMessages, isOpen]);

  // Fast polling while ChatModal is open (every 1.5 seconds)
  useEffect(() => {
    if (!isOpen || !onRefreshChat) return;

    // Initial refresh on open
    onRefreshChat();

    const interval = setInterval(() => {
      onRefreshChat();
    }, 1500);

    return () => clearInterval(interval);
  }, [isOpen, onRefreshChat]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!text.trim() || isSending) return;
    const msg = text.trim();
    setText('');
    setIsSending(true);
    try {
      await onSendMessage(msg);
      if (onRefreshChat) await onRefreshChat();
    } finally {
      setIsSending(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!onRefreshChat || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshChat();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#181b24] border border-[#262a36] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[560px]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#262a36] bg-[#14161f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Oglasna Tabla (Chat Uživo)</h3>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sinhronizovano
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                Prijavljeni ste kao: <strong className="text-gray-200">{currentUser}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshChat && (
              <button
                onClick={handleManualRefresh}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Osveži poruke ručno"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            )}

            {hasAdminAccess && onOpenAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAdmin();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 rounded-lg text-[11px] font-bold transition-colors"
                title="Upravljaj imenima i pristupima u Administraciji"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Administracija
              </button>
            )}

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* INFO NOTICE BANNER */}
        <div className="bg-[#11141c] px-4 py-1.5 border-b border-[#262a36] text-[10px] text-gray-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400" />
            Sve poruke se čuvaju i prikazuju svim kolegama u lokalnoj mreži odmah.
          </span>
          <span className="font-mono text-gray-500">Ukupno: {chatMessages.length}</span>
        </div>

        {/* MESSAGES LIST */}
        <div ref={chatListRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0f1117]">
          {chatMessages.length === 0 ? (
            <div className="text-center text-xs text-gray-500 py-20 space-y-1">
              <MessageSquare className="w-8 h-8 text-gray-600 mx-auto opacity-50" />
              <div>Nema poruka na oglasnoj tabli.</div>
              <div className="text-[11px] text-gray-600">Napišite poruku kolegama u mreži ispod.</div>
            </div>
          ) : (
            chatMessages.map((c) => {
              const isMe = c.user === currentUser;
              const date = new Date(c.timestamp);
              const timeStr = date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
              const dateStr = date.toLocaleDateString('sr-RS');
              const displayName = c.assignedName || c.user;

              return (
                <div
                  key={c.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1 flex-wrap">
                    <User className="w-3 h-3 text-gray-500" />
                    <span className="font-bold text-gray-200">
                      {displayName}
                    </span>
                    {c.assignedName && c.assignedName !== c.user && (
                      <span className="text-gray-500 text-[9px]">({c.user})</span>
                    )}
                    {c.ip && (
                      <span className="font-mono text-[9px] bg-[#1a1d28] border border-[#2c3245] px-1.5 py-0.2 rounded text-cyan-400 font-semibold">
                        {c.ip}
                      </span>
                    )}
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-500">{dateStr} {timeStr}</span>
                  </div>

                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-md break-words ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-[#212533] text-gray-100 rounded-tl-none border border-[#2d3246]'
                    }`}
                  >
                    {c.message}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* INPUT */}
        <div className="p-3 border-t border-[#262a36] bg-[#14161f] flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Napišite poruku kolegama..."
            className="flex-1 px-3.5 py-2.5 bg-[#0f1117] border border-[#262a36] rounded-xl text-xs text-white outline-none focus:border-blue-500 placeholder:text-gray-500"
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? 'Šaljem...' : 'Pošalji'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
