import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Route,
  Server,
  Zap,
  Edit2,
  RefreshCw,
  ArrowLeft,
  Search,
  Network,
  Printer,
  Monitor,
  Clock,
  Check,
  Filter,
  ArrowUpDown,
  Cpu,
  Layers,
  Trash2,
  Plus,
  Radio,
  Wifi,
  ShieldCheck,
  Activity,
  Laptop
} from 'lucide-react';
import { Device, SubnetDevice } from '../types';
import { parseSubnetInput, filterSubnetDevices, calculateSubnetStats } from '../utils/networkUtils';

interface SubnetScannerProps {
  devices: Device[];
  selectedSwitch: Device | null;
  onSelectSwitch: (device: Device | null) => void;
  onOpenCmd: (cmd: 'ping' | 'tracert' | 'telnet', ip: string, title?: string) => void;
  onWakeDevice: (mac: string) => void;
  onDeleteDevice: (id: number) => void;
  onAddDeviceToMonitoring?: (device: { name: string; ip: string; location: string; type: string; mac?: string }) => void;
}

export const SubnetScanner: React.FC<SubnetScannerProps> = ({
  devices,
  selectedSwitch,
  onSelectSwitch,
  onOpenCmd,
  onWakeDevice,
  onDeleteDevice,
  onAddDeviceToMonitoring,
}) => {
  const [targetSubnet, setTargetSubnet] = useState<string>('11.29.50');
  const [detectedSubnets, setDetectedSubnets] = useState<string[]>(['11.29.50', '192.168.1']);
  const [subnetData, setSubnetData] = useState<SubnetDevice[]>([]);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ percent: number; scanned: number; total: number; activeCount: number }>({
    percent: 0,
    scanned: 0,
    total: 256,
    activeCount: 0,
  });
  const [filterMode, setFilterMode] = useState<'all' | 'online' | 'offline'>('all');
  const [sortMode, setSortMode] = useState<'default' | 'online-first' | 'offline-first'>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIp, setEditingIp] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [addedIps, setAddedIps] = useState<Record<string, boolean>>({});

  const eventSourceRef = useRef<EventSource | null>(null);
  const isScanningRef = useRef(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScanDuration, setLastScanDuration] = useState<number | null>(null);
  const [autoScanInterval, setAutoScanInterval] = useState<number>(() => {
    const saved = Number(localStorage.getItem('netscan_scanner_auto_interval'));
    return [0, 60, 300, 900].includes(saved) ? saved : 0;
  });

  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  useEffect(() => () => {
    eventSourceRef.current?.close();
  }, []);

  // Fetch detected subnets on mount
  useEffect(() => {
    fetch('/api/network/subnets')
      .then((res) => res.json())
      .then((data) => {
        if (data.detectedSubnets && data.detectedSubnets.length > 0) {
          setDetectedSubnets(data.detectedSubnets);
        }
      })
      .catch((err) => console.error('Greška pri učitavanju podmreža:', err));
  }, []);

  // Sync target subnet when switch selected
  useEffect(() => {
    if (selectedSwitch) {
      const parts = selectedSwitch.ip.split('.');
      if (parts.length >= 3) {
        const base = `${parts[0]}.${parts[1]}.${parts[2]}`;
        setTargetSubnet(base);
        loadSubnetData(base, selectedSwitch.id);
      }
    } else {
      loadSubnetData(targetSubnet);
    }
  }, [selectedSwitch]);

  const loadSubnetData = async (base: string, switchId?: number) => {
    try {
      setScanError(null);
      const url = switchId
        ? `/api/switch/${switchId}/network`
        : `/api/scan-subnet?subnet=${encodeURIComponent(base)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setSubnetData(Array.isArray(data.data) ? data.data : []);
      setLastScanTime(typeof data.lastScan === 'number' ? data.lastScan : null);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Učitavanje podmreže nije uspelo');
      console.error('Greška pri učitavanju podmreže:', e);
    }
  };

  const applyScanResult = (data: any, startedAt: number) => {
    if (Array.isArray(data.data)) setSubnetData(data.data);
    setLastScanTime(typeof data.lastScan === 'number' ? data.lastScan : null);
    setLastScanDuration(Date.now() - startedAt);
  };

  const finishScanning = () => {
    isScanningRef.current = false;
    setIsScanning(false);
  };

  // Live real-time scan using Server-Sent Events (POST fallback samo bez SSE podrške).
  const handleStartLiveScan = async (baseToScan = targetSubnet) => {
    if (isScanningRef.current) return;

    const cleanBase = parseSubnetInput(baseToScan);
    if (!cleanBase) {
      setScanError('Neispravan /24 opseg. Unesite npr. 192.168.1 ili 192.168.1.0/24.');
      return;
    }

    const startedAt = Date.now();
    setTargetSubnet(cleanBase);
    setSubnetData([]);
    if (cleanBase !== targetSubnet) setLastScanTime(null);
    setScanError(null);
    isScanningRef.current = true;
    setIsScanning(true);
    setScanProgress({ percent: 0, scanned: 0, total: 256, activeCount: 0 });

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      if (typeof EventSource === 'undefined') {
        const res = await fetch('/api/scan-subnet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subnet: cleanBase }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        applyScanResult(data, startedAt);
        finishScanning();
        return;
      }

      const sseUrl = `/api/scan-subnet-stream?subnet=${encodeURIComponent(cleanBase)}`;
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'progress') {
            setScanProgress({
              percent: payload.percent,
              scanned: payload.scanned,
              total: payload.total || 256,
              activeCount: payload.activeCount,
            });

            const incomingItems = Array.isArray(payload.items)
              ? payload.items
              : payload.currentItem
              ? [payload.currentItem]
              : [];
            if (incomingItems.length > 0) {
              setSubnetData((prev) => {
                const byIp = new Map(prev.map((item) => [item.ip, item]));
                incomingItems.forEach((item: SubnetDevice) => byIp.set(item.ip, item));
                return Array.from(byIp.values()).sort((a, b) =>
                  Number(a.ip.split('.').pop()) - Number(b.ip.split('.').pop())
                );
              });
            }
          } else if (payload.type === 'done') {
            applyScanResult(payload, startedAt);
            setScanProgress((prev) => ({ ...prev, percent: 100, scanned: prev.total }));
            finishScanning();
            es.close();
            if (eventSourceRef.current === es) eventSourceRef.current = null;
          } else if (payload.type === 'error') {
            setScanError(payload.error || 'Skeniranje nije uspelo');
            finishScanning();
            es.close();
            if (eventSourceRef.current === es) eventSourceRef.current = null;
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      es.onerror = () => {
        if (eventSourceRef.current !== es) return;
        es.close();
        eventSourceRef.current = null;
        setScanError('Veza sa serverom je prekinuta. Ne pokrećem duplo skeniranje; pokušajte ponovo.');
        finishScanning();
      };
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Pokretanje skeniranja nije uspelo');
      finishScanning();
      console.error('Scan initiate error:', e);
    }
  };

  // Opciono automatsko skeniranje. Podrazumevano je isključeno.
  useEffect(() => {
    if (!autoScanInterval) return;
    const timer = setInterval(() => {
      if (!isScanningRef.current) void handleStartLiveScan(targetSubnet);
    }, autoScanInterval * 1000);
    return () => clearInterval(timer);
  }, [autoScanInterval, targetSubnet]);

  const handleSavePortLabel = async (ip: string) => {
    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, label: editingLabel.trim() }),
      });
      if (!res.ok) throw new Error('Čuvanje oznake nije uspelo');
      setSubnetData((prev) =>
        prev.map((p) => (p.ip === ip ? { ...p, customLabel: editingLabel.trim() } : p))
      );
      setEditingIp(null);
      setEditingLabel('');
    } catch (e) {
      console.error('Greška pri čuvanju naziva:', e);
    }
  };

  const handleAddDevice = (d: SubnetDevice) => {
    if (onAddDeviceToMonitoring) {
      onAddDeviceToMonitoring({
        name: d.customLabel || d.hostname || `Uređaj ${d.ip}`,
        ip: d.ip,
        location: selectedSwitch ? selectedSwitch.location : 'Lokalna Mreža',
        type: d.type !== '-' ? d.type : 'Računar',
        mac: d.mac !== '-' ? d.mac : undefined,
      });
      setAddedIps((prev) => ({ ...prev, [d.ip]: true }));
    }
  };

  // Filter & sort
  const filteredList = filterSubnetDevices(subnetData, filterMode, searchQuery, sortMode);
  const stats = calculateSubnetStats(subnetData);
  const subnetByLastOctet = new Map<number, SubnetDevice>();
  subnetData.forEach((device) => {
    const lastOctet = Number(device.ip.split('.').pop());
    if (Number.isInteger(lastOctet)) subnetByLastOctet.set(lastOctet, device);
  });

  return (
    <div className="space-y-4">
      {/* 1. TOP SUBNET SELECTOR & LIVE SCAN CONTROLLER */}
      <div className="bg-[#181b24] p-4 rounded-xl border border-[#262a36] space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Mrežni Skener Uživo
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                    Skenira svih 256 adresa (0 - 255)
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Uživo otkriva sve aktivne računare, štampače, servere i svičeve u lokalnoj mreži.
                </p>
              </div>
            </div>
          </div>

          {/* AUTOMATIC INTERVAL + ACTION BUTTON */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 text-[11px] text-gray-400 bg-[#14161f] border border-[#262a36] rounded-xl px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Automatski:</span>
              <select
                value={autoScanInterval}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setAutoScanInterval(value);
                  localStorage.setItem('netscan_scanner_auto_interval', String(value));
                }}
                className="bg-[#0f1117] text-gray-200 border border-[#2b3142] rounded-lg px-2 py-1 outline-none focus:border-blue-500"
                title="Na koliko minuta da se automatski ponovi skeniranje"
              >
                <option value={0}>Isključeno</option>
                <option value={60}>na 1 min</option>
                <option value={300}>na 5 min</option>
                <option value={900}>na 15 min</option>
              </select>
            </label>
            <button
              onClick={() => handleStartLiveScan(targetSubnet)}
              disabled={isScanning}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>
                {isScanning
                  ? `Skeniram (${scanProgress.scanned}/${scanProgress.total})...`
                  : `Skeniraj (${targetSubnet}.0 - 255)`}
              </span>
            </button>
          </div>
        </div>

        {/* SUBNET INPUT & DETECTED PRESETS */}
        <div className="pt-2 border-t border-[#262a36] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
              <Network className="w-3.5 h-3.5 text-blue-400" /> Ciljna Podmreža:
            </span>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={targetSubnet}
                disabled={isScanning}
                onChange={(e) => {
                  setTargetSubnet(e.target.value);
                  setSubnetData([]);
                  setLastScanTime(null);
                  setScanError(null);
                }}
                placeholder="npr. 192.168.1 ili 11.29.50"
                className="w-36 px-2.5 py-1.5 bg-[#0f1117] border border-[#2b3142] rounded-lg text-xs font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500"
              />
              <span className="text-xs font-mono text-gray-500">.0 / 24</span>
            </div>

            {/* QUICK PRESET CHIPS */}
            <div className="flex items-center gap-1.5 flex-wrap pl-2 border-l border-[#262a36]">
              <span className="text-[11px] text-gray-500">Detektovano:</span>
              {detectedSubnets.map((sub) => {
                const isSelected = targetSubnet === sub;
                return (
                  <button
                    key={sub}
                    disabled={isScanning}
                    onClick={() => {
                      setTargetSubnet(sub);
                      handleStartLiveScan(sub);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-[#14161f] text-gray-400 border-[#262a36] hover:text-white hover:border-gray-500'
                    }`}
                  >
                    {sub}.x
                  </button>
                );
              })}
            </div>
          </div>

          {selectedSwitch && (
            <button
              onClick={() => onSelectSwitch(null)}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Prikaz svih svičeva
            </button>
          )}
        </div>

        {/* PROGRESS BAR (IF SCANNING) */}
        {isScanning && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Uživo ispitivanje adresa od 0 do 255...
              </span>
              <span className="font-mono text-gray-300 font-bold">
                {scanProgress.scanned} / {scanProgress.total} ({scanProgress.percent}%) • Pronađeno aktivnih: {scanProgress.activeCount}
              </span>
            </div>
            <div className="w-full h-2 bg-[#0f1117] rounded-full overflow-hidden border border-[#262a36]">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 transition-all duration-150 rounded-full"
                style={{ width: `${scanProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {scanError && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-300" role="alert">
            {scanError}
          </div>
        )}
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#181b24] p-3 rounded-xl border border-[#262a36]">
          <div className="text-[11px] text-gray-400 font-semibold">Provereno adresa</div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">{stats.total}<span className="text-sm text-gray-500"> / 256</span></div>
          <div className="text-[10px] text-gray-500 mt-1 font-mono">{targetSubnet}.0 — 255</div>
        </div>

        <div className="bg-[#181b24] p-3 rounded-xl border border-[#262a36]">
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Zauzeto (ONLINE)
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{stats.online}</div>
          <div className="text-[10px] text-gray-500 mt-1">Uređaji u radu</div>
        </div>

        <div className="bg-[#181b24] p-3 rounded-xl border border-[#262a36]">
          <div className="text-[11px] text-gray-400 font-semibold">Slobodno (OFFLINE)</div>
          <div className="text-xl font-bold font-mono text-gray-400 mt-0.5">{stats.offline}</div>
          <div className="text-[10px] text-gray-500 mt-1">Dostupne IP adrese</div>
        </div>

        <div className="bg-[#181b24] p-3 rounded-xl border border-[#262a36]">
          <div className="text-[11px] text-blue-400 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Poslednje skeniranje
          </div>
          <div className="text-xs font-mono font-bold text-gray-200 mt-1.5">
            {lastScanTime ? new Date(lastScanTime).toLocaleTimeString('sr-RS') : 'Nije skenirano'}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            {lastScanTime ? new Date(lastScanTime).toLocaleDateString('sr-RS') : 'Kliknite na Skeniraj'}
            {lastScanDuration !== null && ` • ${(lastScanDuration / 1000).toFixed(1)}s`}
          </div>
        </div>
      </div>

      {/* 3. VISUAL MAP OF ALL 256 ADDRESSES */}
      <div className="bg-[#181b24] rounded-xl border border-[#262a36] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Network className="w-4 h-4 text-blue-400" /> Mapa zauzetosti — {targetSubnet}.0/24
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Klik na proverenu adresu je pronalazi u tabeli ispod.</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold">
            <span className="flex items-center gap-1 text-emerald-400"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Zauzeto</span>
            <span className="flex items-center gap-1 text-gray-400"><span className="w-2.5 h-2.5 rounded-sm bg-gray-600" /> Slobodno</span>
            <span className="flex items-center gap-1 text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-[#0f1117] border border-[#2b3142]" /> Nije provereno</span>
          </div>
        </div>
        <div className="grid grid-cols-8 md:grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
          {Array.from({ length: 256 }, (_, lastOctet) => {
            const device = subnetByLastOctet.get(lastOctet);
            const isOnline = device?.status === 'ONLINE';
            const ip = `${targetSubnet}.${lastOctet}`;
            return (
              <button
                key={lastOctet}
                type="button"
                disabled={!device}
                onClick={() => {
                  setFilterMode('all');
                  setSearchQuery(ip);
                }}
                title={device ? `${ip} — ${isOnline ? 'ZAUZETO' : 'SLOBODNO'} — ${device.customLabel || device.name}` : `${ip} — nije provereno`}
                className={`h-6 rounded text-[9px] font-mono font-bold border transition-all ${
                  device
                    ? isOnline
                      ? 'bg-emerald-600/80 border-emerald-400/60 text-white hover:bg-emerald-500'
                      : 'bg-gray-700/60 border-gray-600/60 text-gray-300 hover:bg-gray-600'
                    : 'bg-[#0f1117] border-[#202534] text-gray-700 cursor-default'
                }`}
              >
                {lastOctet}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. FILTER, SEARCH AND CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14161f] p-3 rounded-xl border border-[#262a36]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-400" /> Filter:
          </span>
          <div className="flex items-center bg-[#1c1f2b] p-0.5 rounded-lg border border-[#2a2f42] text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sve ({stats.total})
            </button>
            <button
              onClick={() => setFilterMode('online')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                filterMode === 'online'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Samo Zauzete ({stats.online})
            </button>
            <button
              onClick={() => setFilterMode('offline')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterMode === 'offline'
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Samo Slobodne ({stats.offline})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SEARCH INPUT */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pretraži IP ili naziv..."
              className="pl-8 pr-3 py-1.5 bg-[#181b24] border border-[#2b3142] rounded-lg text-xs text-gray-200 outline-none focus:border-blue-500 w-60 sm:w-72 font-mono"
            />
          </div>

          {/* SORT BUTTON */}
          <button
            onClick={() => {
              setSortMode((prev) =>
                prev === 'default'
                  ? 'online-first'
                  : prev === 'online-first'
                  ? 'offline-first'
                  : 'default'
              );
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181b24] hover:bg-[#202430] border border-[#2b3142] text-gray-300 rounded-lg text-xs font-semibold"
            title="Sortiraj po statusu"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px]">
              {sortMode === 'online-first'
                ? 'Aktivni na vrhu'
                : sortMode === 'offline-first'
                ? 'Slobodni na vrhu'
                : 'Po IP redosledu'}
            </span>
          </button>
        </div>
      </div>

      {/* 5. TABLE OF ALL 256 SUBNET ADDRESSES */}
      <div className="bg-[#181b24] rounded-xl border border-[#262a36] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#14161f] z-10 border-b border-[#262a36] text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-28">Status</th>
                <th className="py-3 px-4">Naziv / Oznaka</th>
                <th className="py-3 px-4">Ime Računara</th>
                <th className="py-3 px-4">MAC Adresa</th>
                <th className="py-3 px-4">Tip</th>
                <th className="py-3 px-4">IP Adresa</th>
                <th className="py-3 px-4 w-20">Odziv</th>
                <th className="py-3 px-4 text-right">Akcije / Dijagnostika</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202534] text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    Nema adresa koje odgovaraju zadatom filteru ili pretrazi.
                  </td>
                </tr>
              ) : (
                filteredList.map((d) => {
                  const isOnline = d.status === 'ONLINE';
                  const isEditing = editingIp === d.ip;
                  const isAdded = Boolean(addedIps[d.ip] || devices.some((monitored) => monitored.ip === d.ip));

                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-[#1f2433] transition-colors ${
                        isOnline ? 'bg-emerald-950/[0.04]' : ''
                      }`}
                    >
                      {/* STATUS */}
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isOnline
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-gray-800/40 text-gray-500 border-gray-700/40'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOnline ? 'bg-emerald-400 shadow-[0_0_6px_#22c55e]' : 'bg-gray-600'
                            }`}
                          />
                          {isOnline ? 'ZAUZETO' : 'SLOBODNO'}
                        </span>
                      </td>

                      {/* NAME / CUSTOM LABEL */}
                      <td className="py-2.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePortLabel(d.ip);
                                if (e.key === 'Escape') setEditingIp(null);
                              }}
                              placeholder="Unesite naziv..."
                              className="px-2 py-0.5 bg-[#0f1117] border border-blue-500 rounded text-xs text-white outline-none w-44"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePortLabel(d.ip)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                              title="Sačuvaj"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingIp(null)}
                              className="p-1 text-gray-400 hover:text-white"
                              title="Odustani"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${
                                d.customLabel
                                  ? 'text-purple-300 font-bold'
                                  : isOnline
                                  ? 'text-teal-300'
                                  : 'text-gray-500'
                              }`}
                            >
                              {d.customLabel || d.name}
                            </span>
                            <button
                              onClick={() => {
                                setEditingIp(d.ip);
                                setEditingLabel(d.customLabel || '');
                              }}
                              className="opacity-30 hover:opacity-100 text-gray-400 hover:text-purple-400 p-0.5 transition-opacity"
                              title="Izmeni naziv ovog porta"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* COMPUTER NAME */}
                      <td className="py-2.5 px-4 font-mono text-xs font-bold text-gray-300">
                        {d.hostname !== '-' ? (
                          <span className="flex items-center gap-1.5">
                            <Monitor className="w-3 h-3 text-gray-500" />
                            {d.hostname}
                          </span>
                        ) : (
                          <span className="text-gray-600 font-normal">-</span>
                        )}
                      </td>

                      {/* MAC ADDRESS */}
                      <td className="py-2.5 px-4 font-mono text-[11px] text-gray-400">
                        {d.mac !== '-' ? d.mac : <span className="text-gray-600">-</span>}
                      </td>

                      {/* TYPE */}
                      <td className="py-2.5 px-4 text-xs text-gray-300">
                        {d.type !== '-' ? d.type : '-'}
                      </td>

                      {/* IP */}
                      <td className="py-2.5 px-4">
                        <span className="font-mono text-xs text-gray-200 bg-[#0f1117] px-2 py-0.5 rounded border border-[#2b3142]">
                          {d.ip}
                        </span>
                      </td>

                      {/* LATENCY */}
                      <td className="py-2.5 px-4 font-mono text-xs text-gray-400">
                        {d.latency}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 flex-nowrap">
                          {isOnline && !isAdded && onAddDeviceToMonitoring && (
                            <button
                              onClick={() => handleAddDevice(d)}
                              className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded text-[10px] font-bold transition-all flex items-center gap-1"
                              title="Dodaj ovaj aktivni računar u glavni monitoring sistem"
                            >
                              <Plus className="w-2.5 h-2.5" /> NADZOR
                            </button>
                          )}

                          {isAdded && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
                              DODATO
                            </span>
                          )}

                          {d.mac && d.mac !== '-' && (
                            <button
                              onClick={() => onWakeDevice(d.mac)}
                              className="px-2 py-1 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded text-[10px] font-bold transition-all"
                              title="Upali računar (Wake-on-LAN)"
                            >
                              WOL
                            </button>
                          )}

                          <button
                            onClick={() =>
                              onOpenCmd('ping', d.ip, `Ping: ${d.customLabel || d.hostname || d.ip}`)
                            }
                            className="px-2 py-1 border border-[#4b6bfb]/50 text-[#60a5fa] hover:bg-blue-600 hover:text-white rounded text-[10px] font-bold transition-all flex items-center gap-1"
                            title="Pinguj u ugrađenoj web CMD konzoli"
                          >
                            <Terminal className="w-2.5 h-2.5" /> PING
                          </button>

                          <button
                            onClick={() =>
                              onOpenCmd('tracert', d.ip, `Tracert: ${d.customLabel || d.hostname || d.ip}`)
                            }
                            className="px-2 py-1 border border-[#c084fc]/50 text-[#c084fc] hover:bg-purple-600 hover:text-white rounded text-[10px] font-bold transition-all flex items-center gap-1"
                            title="Tracert u ugrađenoj web CMD konzoli"
                          >
                            <Route className="w-2.5 h-2.5" /> TRACERT
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
