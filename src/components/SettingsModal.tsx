import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Clock,
  Volume2,
  VolumeX,
  Check,
  Save,
  Server,
  Zap,
  RotateCcw,
  Sliders,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => Promise<void>;
  onTriggerInstantRefresh: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onTriggerInstantRefresh,
}) => {
  const [intervalSec, setIntervalSec] = useState<number>(settings.refreshIntervalSeconds || 30);
  const [isAutoEnabled, setIsAutoEnabled] = useState<boolean>(settings.isAutoRefreshEnabled ?? true);
  const [soundAlerts, setSoundAlerts] = useState<boolean>(settings.soundAlerts ?? false);
  const [notifyRecovery, setNotifyRecovery] = useState<boolean>(settings.notifyOnRecovery ?? true);
  const [themeAccent, setThemeAccent] = useState<'emerald' | 'cyan' | 'purple' | 'amber'>(settings.themeAccent || 'emerald');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIntervalSec(settings.refreshIntervalSeconds || 30);
      setIsAutoEnabled(settings.isAutoRefreshEnabled ?? true);
      setSoundAlerts(settings.soundAlerts ?? false);
      setNotifyRecovery(settings.notifyOnRecovery ?? true);
      setThemeAccent(settings.themeAccent || 'emerald');
      setSavedSuccess(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const presets = [
    { label: '10s', value: 10, hint: 'Ekstremno brzo' },
    { label: '15s', value: 15, hint: 'Preporučeno' },
    { label: '30s', value: 30, hint: 'Standardno' },
    { label: '60s', value: 60, hint: '1 minut' },
    { label: '120s', value: 120, hint: '2 minuta' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newSettings: AppSettings = {
        refreshIntervalSeconds: Math.max(5, Math.min(600, intervalSec)),
        isAutoRefreshEnabled: isAutoEnabled,
        soundAlerts,
        notifyOnRecovery: notifyRecovery,
        themeAccent,
      };
      await onSaveSettings(newSettings);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (e) {
      console.error(e);
      alert('Greška pri čuvanju podešavanja');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#181b24] border border-[#262a36] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262a36] bg-[#14161f]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Podešavanja Sistema</h3>
              <p className="text-[11px] text-gray-400">
                Podešavanje intervala automatskog osvežavanja i nadzora
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 text-xs text-gray-300">
          {/* SECTION 1: AUTO REFRESH INTERVAL */}
          <div className="space-y-3 bg-[#14161f] p-4 rounded-xl border border-[#262a36]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm text-white">
                  Interval automatskog osvežavanja statusa
                </span>
              </div>
              {/* MASTER TOGGLE */}
              <button
                onClick={() => setIsAutoEnabled(!isAutoEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  isAutoEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isAutoEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                  }`}
                />
                <span>{isAutoEnabled ? 'UKLJUČENO' : 'PAUZIRANO'}</span>
              </button>
            </div>

            <p className="text-[11px] text-gray-400">
              Odredite na koliko sekundi će aplikacija automatski proveravati status i latenciju svih
              uređaja u mreži.
            </p>

            {/* PRESET CHIPS */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {presets.map((p) => {
                const isSelected = intervalSec === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => {
                      setIntervalSec(p.value);
                      setIsAutoEnabled(true);
                    }}
                    className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-lg border font-mono text-center transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-bold border-emerald-400 shadow-md scale-105'
                        : 'bg-[#181b24] text-gray-300 border-[#2b3142] hover:border-emerald-500/60 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{p.label}</div>
                    <div className="text-[9px] opacity-75">{p.hint}</div>
                  </button>
                );
              })}
            </div>

            {/* SLIDER & NUMBER INPUT */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Prilagođeni interval:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={intervalSec}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) setIntervalSec(val);
                    }}
                    className="w-16 px-2 py-1 bg-[#0f1117] border border-[#2b3142] rounded-lg text-xs font-mono font-bold text-emerald-400 text-center outline-none focus:border-emerald-500"
                  />
                  <span className="font-semibold text-gray-400">sekundi</span>
                </div>
              </div>

              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={intervalSec}
                onChange={(e) => setIntervalSec(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0f1117] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>5 sekundi (Ultra-brzo)</span>
                <span>30s</span>
                <span>60s</span>
                <span>120 sekundi (Miran rad)</span>
              </div>
            </div>

            <div className="text-[11px] text-gray-400 bg-[#0f1117] p-2.5 rounded-lg border border-[#262a36] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Preporuka:</strong> Za zatvorene offline mreže optimalan interval je{' '}
                <strong className="text-emerald-300">15s ili 30s</strong>. Ovo obezbeđuje trenutnu
                detekciju kvarova uz nulto zagušenje mrežnih kartica i svičeva.
              </span>
            </div>
          </div>

          {/* SECTION 2: ALERTS & NOTIFICATIONS */}
          <div className="space-y-3 bg-[#14161f] p-4 rounded-xl border border-[#262a36]">
            <div className="font-bold text-sm text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Dodatne opcije obaveštenja</span>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2.5">
                  {soundAlerts ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-gray-500" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-gray-200">
                      Zvučni signal pri padu uređaja
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Emituje kratak zvučni ton kada neki uređaj prestane da odgovara
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundAlerts}
                  onChange={(e) => setSoundAlerts(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-xs font-semibold text-gray-200">
                      Beleži oporavak u Logovima
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Upisuje u istoriju trenutak kada se uređaj ponovo vratio ONLINE
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyRecovery}
                  onChange={(e) => setNotifyRecovery(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* SECTION 3: UNIFIED GLOBAL THEME & ACCENT PALETTE */}
          <div className="space-y-3 bg-[#14161f] p-4 rounded-xl border border-[#262a36]">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-400" />
                <span>Sinhronizovana Tema i Boje Aplikacije</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                Identično za sve korisnike
              </span>
            </div>

            <p className="text-[11px] text-gray-400">
              Izabrana paleta i akcentna boja se čuvaju na serveru tako da svi računari i kolege
              u mreži vide aplikaciju u potpuno identičnoj boji i dizajnu.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { id: 'emerald', label: 'Smaragdno Zelena', desc: 'Standardni IT Monitor', color: 'from-emerald-500 to-teal-600', border: 'border-emerald-500' },
                { id: 'cyan', label: 'Kibernetička Plava', desc: 'Cyber Blue & Slate', color: 'from-cyan-500 to-blue-600', border: 'border-cyan-500' },
                { id: 'purple', label: 'Matrix Ljubičasta', desc: 'Deep Purple & Neon', color: 'from-purple-500 to-indigo-600', border: 'border-purple-500' },
                { id: 'amber', label: 'Industrijski Jantar', desc: 'Amber & Gold Dark', color: 'from-amber-500 to-orange-600', border: 'border-amber-500' },
              ].map((t) => {
                const isSelected = themeAccent === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setThemeAccent(t.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? `bg-white/10 ${t.border} shadow-lg scale-[1.02]`
                        : 'bg-[#181b24] border-[#2b3142] hover:border-gray-500'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-tr ${t.color} flex-shrink-0 shadow-sm`} />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        {t.label}
                        {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <div className="text-[10px] text-gray-400">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: SERVER DIAGNOSTICS */}
          <div className="text-[11px] text-gray-400 flex items-center justify-between px-2">
            <span className="flex items-center gap-1.5 font-mono">
              <Server className="w-3.5 h-3.5 text-gray-500" /> Baza: data.json + backups/
            </span>
            <button
              onClick={() => {
                onTriggerInstantRefresh();
                onClose();
              }}
              className="text-blue-400 hover:text-blue-300 font-semibold underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Pokreni osvežavanje odmah
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-[#262a36] bg-[#14161f] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white text-xs font-semibold"
          >
            Odustani
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              savedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Podešavanja sačuvana!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Čuvam...' : 'Sačuvaj Podešavanja'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
