import React, { useState, useRef } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Terminal,
  Route,
  Zap,
  Check,
  AlertCircle
} from 'lucide-react';
import { Device, BuildingMap } from '../types';

interface BuildingMapsProps {
  maps: BuildingMap[];
  devices: Device[];
  onAddMap: (name: string, image: string) => Promise<void>;
  onDeleteMap: (id: number) => Promise<void>;
  onUpdateDeviceMap: (deviceId: number, mapId: number | null, x: number | null, y: number | null) => Promise<void>;
  onOpenCmd: (cmd: 'ping' | 'tracert' | 'telnet', ip: string, title?: string) => void;
}

export const BuildingMaps: React.FC<BuildingMapsProps> = ({
  maps,
  devices,
  onAddMap,
  onDeleteMap,
  onUpdateDeviceMap,
  onOpenCmd,
}) => {
  const [selectedMapId, setSelectedMapId] = useState<number | null>(maps[0]?.id || null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeMarkerDevice, setActiveMarkerDevice] = useState<Device | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapImageRef = useRef<HTMLImageElement>(null);

  const currentMap = maps.find((m) => m.id === selectedMapId) || null;
  const unplacedDevices = devices.filter((d) => d.mapId !== selectedMapId);
  const placedDevices = devices.filter((d) => d.mapId === selectedMapId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = prompt('Unesite naziv mape zgrade (npr. Zgrada A - Prizemlje):');
    if (!name || !name.trim()) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      await onAddMap(name.trim(), base64);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMapDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!selectedMapId || !mapImageRef.current) return;

    const deviceIdStr = e.dataTransfer.getData('text/plain');
    const deviceId = Number(deviceIdStr);
    if (!deviceId) return;

    const rect = mapImageRef.current.getBoundingClientRect();
    const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    await onUpdateDeviceMap(deviceId, selectedMapId, xPercent, yPercent);
  };

  return (
    <div className="space-y-4">
      {/* MAP CONTROLS HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#181b24] p-4 rounded-xl border border-[#262a36]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-400" />
            <select
              value={selectedMapId || ''}
              onChange={(e) => setSelectedMapId(Number(e.target.value) || null)}
              className="bg-[#0f1117] text-white border border-[#2b3142] rounded-lg px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer min-w-[220px]"
            >
              <option value="">-- Izaberite mapu zgrade --</option>
              {maps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Dodaj novu mapu
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {currentMap && (
            <button
              onClick={() => {
                if (confirm(`Da li ste sigurni da želite da obrišete mapu "${currentMap.name}"?`)) {
                  onDeleteMap(currentMap.id);
                  setSelectedMapId(null);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Obriši mapu
            </button>
          )}
        </div>

        <div className="text-xs text-gray-400">
          Prevucite uređaj iz levog panela na mapu. Dupli klik na tačkicu uklanja uređaj.
        </div>
      </div>

      {/* MAP WORKSPACE */}
      <div className="flex flex-col lg:flex-row gap-4 h-[650px]">
        {/* SIDEBAR: UNPLACED DEVICES */}
        <div className="w-full lg:w-72 bg-[#181b24] border border-[#262a36] rounded-xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[#262a36] bg-[#14161f]">
            <h3 className="font-bold text-xs text-gray-300 uppercase tracking-wider">
              Nepostavljeni Uređaji ({unplacedDevices.length})
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Prevuci uređaj mišem na mapu</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {unplacedDevices.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-8">
                Svi uređaji su raspoređeni na ovoj mapi.
              </div>
            ) : (
              unplacedDevices.map((d) => {
                const isOnline = d.status === 'ONLINE';
                return (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(d.id));
                    }}
                    className="p-2.5 bg-[#0f1117] hover:bg-[#1a1d28] border border-[#262a36] hover:border-purple-500/50 rounded-lg cursor-grab active:cursor-grabbing transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-200 group-hover:text-purple-300">
                        {d.name}
                      </div>
                      <div className="font-mono text-[11px] text-gray-400 mt-0.5">{d.ip}</div>
                    </div>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isOnline ? 'bg-emerald-500 shadow-[0_0_6px_#22c55e]' : 'bg-red-500'
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MAP CANVAS CONTAINER */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleMapDrop}
          className="flex-1 bg-[#181b24] border border-[#262a36] rounded-xl relative overflow-hidden flex items-center justify-center p-2"
        >
          {currentMap ? (
            <div className="relative inline-block max-w-full max-h-full">
              <img
                ref={mapImageRef}
                src={currentMap.image}
                alt={currentMap.name}
                className="block max-w-full max-h-[620px] object-contain rounded-lg select-none pointer-events-none"
              />

              {/* MARKERS LAYER */}
              <div className="absolute inset-0">
                {placedDevices.map((d) => {
                  const isOnline = d.status === 'ONLINE';
                  const isSelected = activeMarkerDevice?.id === d.id;

                  return (
                    <div
                      key={d.id}
                      onClick={() => setActiveMarkerDevice(isSelected ? null : d)}
                      onDoubleClick={async () => {
                        if (confirm(`Ukloniti ${d.name} sa ove mape?`)) {
                          await onUpdateDeviceMap(d.id, null, null, null);
                        }
                      }}
                      style={{
                        left: `${d.mapX || 50}%`,
                        top: `${d.mapY || 50}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
                      title={`${d.name} (${d.ip}) — Dupli klik za uklanjanje`}
                    >
                      {/* GLOWING DOT */}
                      <div
                        className={`w-4 h-4 rounded-full border-2 border-white transition-transform duration-200 group-hover:scale-125 ${
                          isOnline
                            ? 'bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]'
                            : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                        }`}
                      />

                      {/* NAME LABEL */}
                      <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap pointer-events-none border border-white/10">
                        {d.name}
                      </div>

                      {/* POPUP DETAIL ON CLICK */}
                      {isSelected && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#12141c] border border-blue-500/60 p-3 rounded-xl shadow-2xl z-20 min-w-[200px]"
                        >
                          <div className="font-bold text-xs text-white">{d.name}</div>
                          <div className="font-mono text-[11px] text-gray-400 mt-0.5">{d.ip}</div>
                          <div className="text-[10px] mt-1 text-emerald-400 font-semibold">
                            Status: {d.status} ({d.latency})
                          </div>

                          <div className="flex items-center gap-1.5 mt-2.5">
                            <button
                              onClick={() => onOpenCmd('ping', d.ip, `Ping: ${d.name}`)}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold flex items-center gap-1"
                            >
                              <Terminal className="w-2.5 h-2.5" /> PING
                            </button>
                            <button
                              onClick={() => onOpenCmd('tracert', d.ip, `Tracert: ${d.name}`)}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold flex items-center gap-1"
                            >
                              <Route className="w-2.5 h-2.5" /> TRACERT
                            </button>
                            <button
                              onClick={async () => {
                                await onUpdateDeviceMap(d.id, null, null, null);
                                setActiveMarkerDevice(null);
                              }}
                              className="p-1 text-red-400 hover:text-white rounded ml-auto text-[10px]"
                              title="Ukloni sa mape"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 p-8">
              <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-40" />
              <h3 className="font-bold text-sm text-gray-400">Nijedna mapa nije izabrana</h3>
              <p className="text-xs text-gray-600 mt-1">
                Izaberite postojeću mapu iz padajućeg menija iznad ili dodajte novu sliku tlocrta.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
