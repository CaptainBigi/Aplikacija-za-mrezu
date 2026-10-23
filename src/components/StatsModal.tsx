import React, { useState, useEffect } from 'react';
import { X, Printer, BarChart2, ShieldCheck } from 'lucide-react';
import { WeeklyStat } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<WeeklyStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats/weekly');
      const data = await res.json();
      setStats(data || []);
    } catch (e) {
      console.error('Greška pri učitavanju statistike:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const maxDrops = stats.length > 0 ? Math.max(...stats.map((s) => s.drops), 1) : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#181b24] border border-[#262a36] w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262a36] bg-[#14161f]">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Nedeljna Statistika Padova</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Štampaj
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div id="print-area" className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs text-gray-400">
            Učestalost prekida mreže (koji traju duže od 10 minuta) u proteklih 7 dana. Prikazani su
            samo uređaji koji su imali padove.
          </p>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">Učitavanje podataka...</div>
          ) : stats.length === 0 ? (
            <div className="py-12 text-center text-emerald-400">
              <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-80" />
              <div className="font-bold text-sm">Mreža je stabilna!</div>
              <div className="text-xs text-gray-400 mt-1">
                Nema zabeleženih padova dužih od 10 minuta u proteklih 7 dana.
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {stats.map((item, idx) => {
                const percentage = Math.min(100, Math.round((item.drops / maxDrops) * 100));
                const barColor = item.drops > 5 ? 'bg-red-500' : 'bg-amber-500';
                const textColor = item.drops > 5 ? 'text-red-400' : 'text-amber-400';

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-gray-200">{item.name}</strong>
                        <span className="font-mono text-gray-500 text-[11px] ml-2">{item.ip}</span>
                      </div>
                      <span className={`font-bold ${textColor}`}>
                        {item.drops} {item.drops === 1 ? 'prekid' : 'prekida'}
                      </span>
                    </div>

                    <div className="w-full bg-[#0f1117] h-3.5 rounded-full overflow-hidden border border-[#262a36]">
                      <div
                        style={{ width: `${percentage}%` }}
                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      />
                    </div>
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
