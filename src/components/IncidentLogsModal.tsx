import React from 'react';
import { X, AlertOctagon, CheckCircle2, CheckCheck } from 'lucide-react';
import { LogEntry } from '../types';

interface IncidentLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onMarkAllRead: () => void;
}

export const IncidentLogsModal: React.FC<IncidentLogsModalProps> = ({
  isOpen,
  onClose,
  logs,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#181b24] border border-[#262a36] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262a36] bg-[#14161f]">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">Log Prekida Mreže</h3>
          </div>
          <div className="flex items-center gap-2">
            {logs.some((l) => !l.isRead) && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 px-2 py-1 bg-blue-950/40 rounded transition-colors"
                title="Označi sve logove kao pročitane"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Označi pročitano
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-5 overflow-y-auto space-y-3">
          <p className="text-xs text-gray-400">
            Prikaz uređaja koji su bili nedostupni duže od 10 minuta. Istorija prekida se trajno čuva
            u lokalnoj bazi servera.
          </p>

          {logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              Nema zabeleženih prekida u radu mreže.
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {logs.map((log) => {
                const isRecovery = log.type === 'recovery';
                const date = new Date(log.timestamp);
                const timeStr = date.toLocaleTimeString('sr-RS');
                const dateStr = date.toLocaleDateString('sr-RS');

                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border-l-4 bg-[#0f1117] border border-[#262a36] ${
                      isRecovery
                        ? 'border-l-emerald-500 text-gray-200'
                        : 'border-l-red-500 text-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {isRecovery ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        <strong
                          className={`text-xs ${
                            isRecovery ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {log.deviceName}
                        </strong>
                        <span className="font-mono text-[11px] text-gray-500">({log.deviceIp})</span>
                      </div>
                      <span className="font-mono text-[10px] text-gray-500 whitespace-nowrap">
                        {dateStr} {timeStr}
                      </span>
                    </div>

                    <div className="text-xs text-gray-300 mt-1 pl-5">{log.message}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
