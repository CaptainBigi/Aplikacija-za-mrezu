import React, { useState } from 'react';
import {
  Terminal,
  Route,
  Server,
  Zap,
  Edit2,
  Trash2,
  MapPin,
  Printer,
  Monitor,
  Network,
  HardDrive,
  Cpu,
  ChevronDown,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { Device } from '../types';

interface DevicesTableProps {
  devices: Device[];
  onOpenCmd: (cmd: 'ping' | 'tracert' | 'telnet', ip: string, title?: string) => void;
  onOpenSwitch: (device: Device) => void;
  onEditDevice: (device: Device) => void;
  onDeleteDevice: (id: number) => void;
  onWakeDevice: (mac: string) => void;
  statusFilter: 'ONLINE' | 'OFFLINE' | null;
  locationFilter: string | null;
  searchQuery: string;
}

export const DevicesTable: React.FC<DevicesTableProps> = ({
  devices,
  onOpenCmd,
  onOpenSwitch,
  onEditDevice,
  onDeleteDevice,
  onWakeDevice,
  statusFilter,
  locationFilter,
  searchQuery,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [sortStatusOrder, setSortStatusOrder] = useState<'default' | 'online-first' | 'offline-first'>('default');

  const toggleGroup = (loc: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [loc]: !prev[loc],
    }));
  };

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Štampač':
        return <Printer className="w-4 h-4 text-blue-400" />;
      case 'Računar':
        return <Monitor className="w-4 h-4 text-slate-300" />;
      case 'Switch':
      case 'Ruter':
        return <Network className="w-4 h-4 text-amber-400" />;
      case 'Server':
        return <HardDrive className="w-4 h-4 text-purple-400" />;
      default:
        return <Cpu className="w-4 h-4 text-gray-400" />;
    }
  };

  // Filter
  let filtered = devices.filter((d) => {
    if (statusFilter && d.status !== statusFilter) return false;
    if (locationFilter && (d.location || 'Ostalo') !== locationFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = d.name.toLowerCase().includes(q);
      const matchIp = d.ip.toLowerCase().includes(q);
      const matchLoc = (d.location || '').toLowerCase().includes(q);
      const matchType = (d.type || '').toLowerCase().includes(q);
      if (!matchName && !matchIp && !matchLoc && !matchType) return false;
    }
    return true;
  });

  // Sort
  if (sortStatusOrder === 'online-first') {
    filtered.sort((a, b) => (a.status === 'ONLINE' ? -1 : 1) - (b.status === 'ONLINE' ? -1 : 1));
  } else if (sortStatusOrder === 'offline-first') {
    filtered.sort((a, b) => (a.status === 'OFFLINE' ? -1 : 1) - (b.status === 'OFFLINE' ? -1 : 1));
  }

  // If a location filter or search is active, do not group with accordions, just show clean table
  const isFlatView = Boolean(locationFilter || searchQuery || statusFilter);

  // Group by location
  const groups: Record<string, Device[]> = {};
  filtered.forEach((d) => {
    const loc = d.location || 'Ostalo';
    if (!groups[loc]) groups[loc] = [];
    groups[loc].push(d);
  });

  const sortedLocations = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'sr'));

  const renderRow = (d: Device) => {
    const isOnline = d.status === 'ONLINE';
    const isOffline = d.status === 'OFFLINE';
    const durationText = d.statusSince && d.status !== 'UNKNOWN' ? ` ${formatDuration(d.statusSince)}` : '';

    return (
      <tr
        key={d.id}
        className="border-b border-[#262a36] hover:bg-[#1f2330] transition-colors group"
      >
        {/* STATUS */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                  : isOffline
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                  : 'bg-gray-500'
              }`}
            />
            <span
              className={`text-xs font-bold ${
                isOnline ? 'text-emerald-400' : isOffline ? 'text-red-400' : 'text-gray-400'
              }`}
            >
              {d.status}
              {durationText && <span className="font-normal text-gray-400 ml-1">({durationText})</span>}
            </span>
          </div>
        </td>

        {/* NAZIV I LOKACIJA */}
        <td className="py-3 px-4">
          <div className="font-bold text-sm text-[#2dd4bf] group-hover:text-teal-300">
            {d.name}
          </div>
          {d.location && (
            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-gray-500" />
              {d.location}
            </div>
          )}
        </td>

        {/* TIP UREĐAJA */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
            {getTypeIcon(d.type)}
            <span>{d.type || '-'}</span>
          </div>
        </td>

        {/* IP ADRESA */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-gray-200 bg-[#0f1117] px-2 py-1 rounded border border-[#262a36]">
              {d.ip}
            </span>
            {d.type === 'Switch' && (
              <button
                onClick={() => onOpenSwitch(d)}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors"
                title="Skeniraj i otvori sve 0-255 portove za ovaj switch"
              >
                <Layers className="w-3 h-3" /> OTVORI
              </button>
            )}
          </div>
        </td>

        {/* LATENCIJA */}
        <td className="py-3 px-4">
          <span
            className={`font-mono text-xs ${
              isOnline ? 'text-emerald-400 font-bold' : 'text-gray-500'
            }`}
          >
            {d.latency}
          </span>
        </td>

        {/* AKCIJE (PING, TRACERT, TELNET, WAKE, EDIT, DELETE) */}
        <td className="py-2.5 px-3 text-right whitespace-nowrap min-w-[270px]">
          <div className="inline-flex items-center justify-end gap-1 flex-nowrap">
            {/* WAKE ON LAN */}
            {d.mac && d.mac !== '-' && (
              <button
                onClick={() => onWakeDevice(d.mac!)}
                className="px-1.5 py-0.5 border border-emerald-500/60 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded text-[10px] font-bold transition-all flex items-center gap-0.5 shadow-sm"
                title="Upali računar preko mreže (Wake-on-LAN)"
              >
                <Zap className="w-2.5 h-2.5" /> WAKE
              </button>
            )}

            {/* PING (IN-APP CMD) */}
            <button
              onClick={() => onOpenCmd('ping', d.ip, `Ping: ${d.name}`)}
              className="px-1.5 py-0.5 border border-[#4b6bfb] text-[#4b6bfb] hover:bg-[#4b6bfb] hover:text-white rounded text-[10px] font-bold transition-all flex items-center gap-0.5 shadow-sm"
              title="Pinguj ovaj uređaj unutar web CMD konzole"
            >
              <Terminal className="w-2.5 h-2.5" /> PING
            </button>

            {/* TRACERT (IN-APP CMD) */}
            <button
              onClick={() => onOpenCmd('tracert', d.ip, `Tracert: ${d.name}`)}
              className="px-1.5 py-0.5 border border-[#c084fc] text-[#c084fc] hover:bg-[#c084fc] hover:text-white rounded text-[10px] font-bold transition-all flex items-center gap-0.5 shadow-sm"
              title="Prikaži mrežnu rutu unutar web CMD konzole"
            >
              <Route className="w-2.5 h-2.5" /> TRACE
            </button>

            {/* TELNET (IN-APP CMD) */}
            <button
              onClick={() => onOpenCmd('telnet', d.ip, `Telnet: ${d.name}`)}
              className="px-1.5 py-0.5 border border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b] hover:text-black rounded text-[10px] font-bold transition-all flex items-center gap-0.5 shadow-sm"
              title="Ispitaj port unutar web CMD konzole"
            >
              <Server className="w-2.5 h-2.5" /> TELNET
            </button>

            {/* EDIT */}
            <button
              onClick={() => onEditDevice(d)}
              className="p-1 text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 rounded transition-colors ml-0.5"
              title="Izmeni uređaj"
            >
              <Edit2 className="w-3 h-3" />
            </button>

            {/* DELETE */}
            <button
              onClick={() => onDeleteDevice(d.id)}
              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors"
              title="Obriši uređaj"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-[#181b24] border border-[#262a36] rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#262a36] bg-[#14161f] text-[11px] font-bold text-gray-400 uppercase tracking-wider select-none">
              <th
                onClick={() => {
                  setSortStatusOrder((prev) =>
                    prev === 'default'
                      ? 'online-first'
                      : prev === 'online-first'
                      ? 'offline-first'
                      : 'default'
                  );
                }}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>STATUS</span>
                  <ArrowUpDown className="w-3 h-3 text-blue-400" />
                </div>
              </th>
              <th className="py-3 px-4">NAZIV I LOKACIJA</th>
              <th className="py-3 px-4">TIP UREĐAJA</th>
              <th className="py-3 px-4">
                IP ADRESA <span className="font-normal text-[10px] text-gray-500">(KLIK ZA MREŽU)</span>
              </th>
              <th className="py-3 px-4">LATENCIJA</th>
              <th className="py-3 px-4 text-right">AKCIJE</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500 text-sm">
                  Nema uređaja koji odgovaraju kriterijumu pretrage.
                </td>
              </tr>
            ) : isFlatView ? (
              filtered.map((d) => renderRow(d))
            ) : (
              sortedLocations.map((loc, idx) => {
                const groupDevices = groups[loc];
                const isCollapsed = collapsedGroups[loc];
                return (
                  <React.Fragment key={loc}>
                    {/* ACCORDION HEADER */}
                    <tr
                      onClick={() => toggleGroup(loc)}
                      className="bg-[#13151e] border-y border-[#262a36] cursor-pointer hover:bg-[#1a1c27] transition-colors"
                    >
                      <td colSpan={6} className="py-2.5 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-xs text-gray-300">
                            <ChevronDown
                              className={`w-4 h-4 text-emerald-400 transition-transform duration-200 ${
                                isCollapsed ? '-rotate-90' : 'rotate-0'
                              }`}
                            />
                            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                            <span>LOKACIJA: {loc}</span>
                          </div>
                          <span className="text-[10px] font-mono text-gray-400 bg-[#0f1117] border border-[#262a36] px-2.5 py-0.5 rounded-full">
                            {groupDevices.length} UREĐAJA
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* GROUP ROWS */}
                    {!isCollapsed && groupDevices.map((d) => renderRow(d))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
