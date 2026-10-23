/**
 * Utility functions for NET-SCAN Intranet Monitor
 */

/**
 * Formats elapsed time since a given timestamp into a human readable Serbian string
 */
export function formatDuration(timestamp?: number | null, now = Date.now()): string {
  if (!timestamp || timestamp <= 0) return '';
  const diff = Math.max(0, now - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Validates whether an IP address is a valid IPv4 string
 */
export function isValidIpv4(ip: string): boolean {
  if (!ip) return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const num = Number(p);
    return num >= 0 && num <= 255;
  });
}

/**
 * Extracts base /24 subnet from an IP address (e.g. 192.168.1.5 -> 192.168.1)
 */
export function getSubnetBase(ip: string): string | null {
  if (!isValidIpv4(ip)) return null;
  const parts = ip.trim().split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

/**
 * Cleans and validates a MAC address string
 */
export function cleanMacAddress(mac: string): string | null {
  if (!mac || mac === '-') return null;
  const cleaned = mac.replace(/[:-]/g, '').toUpperCase();
  if (cleaned.length !== 12 || !/^[0-9A-F]{12}$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

/**
 * Formats a clean 12-char MAC address into standard colon format XX:XX:XX:XX:XX:XX
 */
export function formatMacAddress(mac: string): string {
  const clean = cleanMacAddress(mac);
  if (!clean) return mac || '-';
  const parts: string[] = [];
  for (let i = 0; i < 12; i += 2) {
    parts.push(clean.substring(i, i + 2));
  }
  return parts.join(':');
}

/**
 * Creates CSV report string with UTF-8 BOM
 */
export interface DeviceCsvRow {
  name: string;
  location: string;
  type: string;
  ip: string;
  status: string;
  latency: string;
  mac?: string;
}

export function generateDevicesCsv(devices: DeviceCsvRow[]): string {
  let csv = '\uFEFF'; // UTF-8 BOM for Serbian characters
  csv += 'NAZIV UREĐAJA,LOKACIJA,TIP UREĐAJA,IP ADRESA,STATUS,LATENCIJA,MAC ADRESA\n';
  devices.forEach((d) => {
    const name = `"${(d.name || '').replace(/"/g, '""')}"`;
    const location = `"${(d.location || '').replace(/"/g, '""')}"`;
    const type = `"${(d.type || '').replace(/"/g, '""')}"`;
    const ip = `"${d.ip || ''}"`;
    const status = `"${d.status || ''}"`;
    const latency = `"${d.latency || '-'}"`;
    const mac = `"${d.mac || '-'}"`;
    csv += `${name},${location},${type},${ip},${status},${latency},${mac}\n`;
  });
  return csv;
}

/**
 * Parses user terminal command into command type, target, and arguments
 */
export function parseTerminalCommand(commandText: string): {
  cmd: string;
  target: string;
  param: string;
  isContinuous: boolean;
  count: number;
} {
  const trimmed = commandText.trim();
  const parts = trimmed.split(/\s+/);
  const cmd = (parts[0] || '').toLowerCase();
  const target = parts[1] || '';
  const isContinuous = parts.includes('-t');
  const count = isContinuous ? 25 : 4;
  const param = parts[2] || '';
  return { cmd, target, param, isContinuous, count };
}

/**
 * Normalizes user-input subnet into standard 3-octet base (e.g. 192.168.1)
 */
export function parseSubnetInput(input: string): string {
  if (!input) return '11.29.50';
  const cleaned = input.trim().replace(/\/24$/, '').replace(/\/16$/, '');
  const parts = cleaned.split('.');
  if (parts.length >= 3) {
    const p0 = Number(parts[0]);
    const p1 = Number(parts[1]);
    const p2 = Number(parts[2]);
    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2) && p0 >= 0 && p0 <= 255 && p1 >= 0 && p1 <= 255 && p2 >= 0 && p2 <= 255) {
      return `${p0}.${p1}.${p2}`;
    }
  }
  return '11.29.50';
}

export interface SubnetDeviceItem {
  id: string;
  ip: string;
  name: string;
  hostname: string;
  mac: string;
  type: string;
  status: 'ONLINE' | 'OFFLINE';
  latency: string;
  customLabel?: string;
}

/**
 * Filters and sorts subnet devices
 */
export function filterSubnetDevices<T extends SubnetDeviceItem>(
  devices: T[],
  mode: 'all' | 'online' | 'offline',
  searchQuery = '',
  sortMode: 'default' | 'online-first' | 'offline-first' = 'default'
): T[] {
  const q = searchQuery.trim().toLowerCase();
  const filtered = devices.filter((d) => {
    if (mode === 'online' && d.status !== 'ONLINE') return false;
    if (mode === 'offline' && d.status !== 'OFFLINE') return false;
    if (q) {
      const matchIp = d.ip.includes(q);
      const matchName = (d.name || '').toLowerCase().includes(q);
      const matchCustom = (d.customLabel || '').toLowerCase().includes(q);
      const matchHost = (d.hostname || '').toLowerCase().includes(q);
      const matchMac = (d.mac || '').toLowerCase().includes(q);
      if (!matchIp && !matchName && !matchCustom && !matchHost && !matchMac) return false;
    }
    return true;
  });

  if (sortMode === 'online-first') {
    return [...filtered].sort((a, b) => (a.status === 'ONLINE' ? -1 : 1) - (b.status === 'ONLINE' ? -1 : 1));
  }
  if (sortMode === 'offline-first') {
    return [...filtered].sort((a, b) => (a.status === 'OFFLINE' ? -1 : 1) - (b.status === 'OFFLINE' ? -1 : 1));
  }
  return filtered;
}

/**
 * Calculates subnet statistics (online, offline, total)
 */
export function calculateSubnetStats(devices: { status: 'ONLINE' | 'OFFLINE' }[]): {
  total: number;
  online: number;
  offline: number;
} {
  let online = 0;
  for (const d of devices) {
    if (d.status === 'ONLINE') online++;
  }
  return {
    total: devices.length,
    online,
    offline: devices.length - online,
  };
}

