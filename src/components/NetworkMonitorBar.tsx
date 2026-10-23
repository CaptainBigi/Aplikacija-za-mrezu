import React, { useState } from 'react';
import {
  Terminal,
  Route,
  Server,
  Zap,
  MapPin,
  Cpu,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Device } from '../types';

interface NetworkMonitorBarProps {
  devices: Device[];
  onOpenCmd: (cmd: 'ping' | 'tracert' | 'telnet', ip: string, title?: string) => void;
  onOpenSwitch: (device: Device) => void;
  onWakeDevice: (mac: string) => void;
}

export const NetworkMonitorBar: React.FC<NetworkMonitorBarProps> = ({
  devices,
  onOpenCmd,
  onOpenSwitch,
  onWakeDevice,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const formatDuration = (timestamp?: number | null) => {
    if (!timestamp) return '';
    const diff = Math.max(0, Date.now() - timestamp);
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  return (
    <div className="px-6 sm:px-10 pt-5 pb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-gray-400 tracking-wider uppercase flex items-center gap-2">
          <span>MREŽNI MONITOR UŽIVO (SVI UREĐAJI)</span>
          <span className="text-[11px] text-emerald-400 font-normal">
            ({devices.filter((d) => d.status === 'ONLINE').length} online / {devices.length} ukupno)
          </span>
        </div>
        <div className="text-[11px] text-gray-500 hidden sm:block">
          Kliknite na tačkicu za brzi pregled i pokretanje konzolne dijagnostike
        </div>
      </div>

      {/* STATUS DOTS CONTAINER */}
      <div className="flex flex-wrap gap-2.5 p-3.5 bg-[#181b24] border border-[#262a36] rounded-xl min-h-[46px] items-center">
        {devices.length === 0 ? (
          <div className="text-xs text-gray-500 py-1">Nema unetih uređaja za prikaz u monitoru.</div>
        ) : (
          devices.map((device) => {
            const isOnline = device.status === 'ONLINE';
            const isOffline = device.status === 'OFFLINE';
            const isSelected = selectedDevice?.id === device.id;

            return (
              <button
                key={device.id}
                onClick={() => setSelectedDevice(isSelected ? null : device)}
                title={`${device.name} (${device.ip}) — ${device.status}`}
                className={`relative group p-0.5 rounded-full transition-all duration-200 focus:outline-none ${
                  isSelected ? 'ring-2 ring-blue-500 scale-125' : 'hover:scale-130'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    isOnline
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                      : isOffline
                      ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                      : 'bg-gray-500'
                  }`}
                />
              </button>
            );
          })
        )}
      </div>

      {/* SELECTED DEVICE INFO CARD */}
      {selectedDevice && (
        <div
          className={`mt-3 p-4 bg-[#181b24] border rounded-xl border-l-4 transition-all duration-200 shadow-lg ${
            selectedDevice.status === 'ONLINE'
              ? 'border-[#262a36] border-l-emerald-500'
              : 'border-[#262a36] border-l-red-500'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className={`font-bold text-base ${
                    selectedDevice.status === 'ONLINE' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {selectedDevice.name}
                </span>
                <span className="font-mono text-xs text-gray-400 bg-[#0f1117] px-2 py-0.5 rounded border border-[#2b3142]">
                  {selectedDevice.ip}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    selectedDevice.status === 'ONLINE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {selectedDevice.status === 'ONLINE' ? '🟢 ONLINE' : '🔴 OFFLINE'}{' '}
                  {selectedDevice.statusSince
                    ? `već ${formatDuration(selectedDevice.statusSince)}`
                    : ''}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-2">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {selectedDevice.location || 'Nedodeljeno'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-gray-400" />
                  {selectedDevice.type || 'Switch'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  Latencija: <strong className="text-gray-200">{selectedDevice.latency}</strong>
                </span>
                {selectedDevice.mac && selectedDevice.mac !== '-' && (
                  <span className="font-mono text-[11px] text-gray-400">
                    MAC: {selectedDevice.mac}
                  </span>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedDevice.type === 'Switch' && (
                <button
                  onClick={() => onOpenSwitch(selectedDevice)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" /> Otvori Mrežu (0-255)
                </button>
              )}

              {selectedDevice.mac && selectedDevice.mac !== '-' && (
                <button
                  onClick={() => onWakeDevice(selectedDevice.mac!)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded-lg text-xs font-bold transition-all"
                  title="Pošalji Wake-on-LAN magični paket"
                >
                  <Zap className="w-3.5 h-3.5" /> WAKE
                </button>
              )}

              {/* IN-APP CMD LAUNCHERS */}
              <button
                onClick={() =>
                  onOpenCmd('ping', selectedDevice.ip, `Ping: ${selectedDevice.name}`)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#4b6bfb] text-[#4b6bfb] hover:bg-[#4b6bfb] hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                title="Pokreni ping u ugrađenoj web CMD konzoli"
              >
                <Terminal className="w-3.5 h-3.5" /> PING (Konzola)
              </button>

              <button
                onClick={() =>
                  onOpenCmd('tracert', selectedDevice.ip, `Tracert: ${selectedDevice.name}`)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#c084fc] text-[#c084fc] hover:bg-[#c084fc] hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                title="Prikaži mrežnu rutu (tracert) u web CMD konzoli"
              >
                <Route className="w-3.5 h-3.5" /> TRACERT
              </button>

              <button
                onClick={() =>
                  onOpenCmd('telnet', selectedDevice.ip, `Telnet: ${selectedDevice.name}`)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b] hover:text-black rounded-lg text-xs font-bold transition-all shadow-sm"
                title="Ispitaj port (telnet) u web CMD konzoli"
              >
                <Server className="w-3.5 h-3.5" /> TELNET
              </button>

              <button
                onClick={() => setSelectedDevice(null)}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 ml-1"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
