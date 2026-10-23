import React, { useState, useEffect } from 'react';
import { X, Network, Server, Save } from 'lucide-react';
import { Device } from '../types';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDevice: Device | null;
  defaultLocation?: string;
  onSave: (data: {
    name: string;
    ip: string;
    location: string;
    type: string;
    mac?: string;
  }) => Promise<void>;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({
  isOpen,
  onClose,
  editingDevice,
  defaultLocation = '',
  onSave,
}) => {
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('Switch');
  const [mac, setMac] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingDevice) {
      setName(editingDevice.name);
      setIp(editingDevice.ip);
      setLocation(editingDevice.location || '');
      setType(editingDevice.type || 'Switch');
      setMac(editingDevice.mac || '');
    } else {
      setName('');
      setIp('');
      setLocation(defaultLocation || '');
      setType('Switch');
      setMac('');
    }
  }, [editingDevice, defaultLocation, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) {
      alert('Unesite IP adresu mreže!');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim() || `Switch ${ip.trim()}`,
        ip: ip.trim(),
        location: location.trim() || 'Nedodeljeno',
        type,
        mac: mac.trim() || '-',
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert('Greška pri čuvanju');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#181b24] border border-[#262a36] w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262a36] bg-[#14161f]">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base text-white">
              {editingDevice ? 'Izmeni Uređaj / Switch' : 'Dodaj Novi Uređaj / Switch'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              IP Adresa Mreže <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="npr. 11.29.50.1 ili 192.168.1.1"
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#262a36] rounded-lg text-xs font-mono text-white outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Oznaka / Naziv Uređaja
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Switch Glavni (Prizemlje)"
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#262a36] rounded-lg text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Grad / Lokacija / Kategorija
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="npr. Beograd ili Novi Sad"
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#262a36] rounded-lg text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Tip Uređaja
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-[#0f1117] border border-[#262a36] rounded-lg text-xs text-white outline-none focus:border-blue-500"
              >
                <option value="Switch">Switch</option>
                <option value="Računar">Računar</option>
                <option value="Štampač">Štampač</option>
                <option value="Server">Server</option>
                <option value="Ruter">Ruter</option>
                <option value="Ostalo">Ostalo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                MAC Adresa (Opciono za WOL)
              </label>
              <input
                type="text"
                value={mac}
                onChange={(e) => setMac(e.target.value)}
                placeholder="npr. 00:1A:2B:3C:4D:5E"
                className="w-full px-3 py-2 bg-[#0f1117] border border-[#262a36] rounded-lg text-xs font-mono text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Čuvanje...' : editingDevice ? 'Sačuvaj Izmene' : 'Sačuvaj Switch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
