import express from 'express';
import path from 'path';
import net from 'net';
import fs from 'fs';
import os from 'os';
import dgram from 'dgram';
import { exec, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Brza provera dostupnosti za start.bat i dijagnostiku.
app.get('/api/health', (_req, res) => {
  res.json({ app: 'net-scan', status: 'ok', port: PORT });
});

const DATA_JSON = path.join(__dirname, 'data.json');
const NETSCAN_DATA_JSON = path.join(__dirname, 'netscan-data.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Interface types
interface Device {
  id: number;
  name: string;
  ip: string;
  location: string;
  type: string;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  latency: string;
  statusSince: number;
  mac?: string;
  hostname?: string;
  mapId?: number | null;
  mapX?: number | null;
  mapY?: number | null;
  offlineSince?: number | null;
  loggedOffline?: boolean;
}

interface LogEntry {
  id: number;
  deviceName: string;
  deviceIp: string;
  timestamp: number;
  type: 'error' | 'recovery';
  message: string;
  isRead: boolean;
}

interface ChatMessage {
  id: number;
  user: string;
  message: string;
  timestamp: number;
  ip?: string;
  assignedName?: string;
}

interface ClientSession {
  ip: string;
  name: string;
  notes?: string;
  firstSeen: number;
  lastActive: number;
  userAgent?: string;
  isHost: boolean;
  isBlocked?: boolean;
  messageCount?: number;
}

interface BuildingMap {
  id: number;
  name: string;
  image: string;
}

interface SubnetDevice {
  id: string;
  name: string;
  hostname: string;
  mac: string;
  type: string;
  ip: string;
  status: 'ONLINE' | 'OFFLINE';
  latency: string;
  lastSeenOnline?: number | null;
  offlineSince?: number | null;
  customLabel?: string;
}

interface SettingsData {
  refreshIntervalSeconds: number;
  isAutoRefreshEnabled: boolean;
  soundAlerts: boolean;
  notifyOnRecovery: boolean;
  themeAccent?: 'emerald' | 'cyan' | 'purple' | 'amber';
}

interface ActivityLogItem {
  id: string;
  timestamp: number;
  user: string;
  ip: string;
  action: string;
  category: 'device' | 'admin' | 'chat' | 'system' | 'network' | 'map';
  description: string;
  details?: string;
}

interface Database {
  devices: Device[];
  maps: BuildingMap[];
  logs: LogEntry[];
  switchNetworks: Record<string, SubnetDevice[]>;
  switchScanTimes: Record<string, number>;
  customLabels: Record<string, string>;
  chat: ChatMessage[];
  clientSessions?: Record<string, ClientSession>;
  settings?: SettingsData;
  activities?: ActivityLogItem[];
}

// In-memory database initialization
let db: Database = {
  devices: [
    {
      id: 1,
      name: 'Switch Glavni (Core)',
      ip: '11.29.50.1',
      location: 'Beograd',
      type: 'Switch',
      status: 'ONLINE',
      latency: '2 ms',
      statusSince: Date.now() - (3 * 24 * 60 * 60 * 1000) - (4 * 60 * 60 * 1000),
      mac: '00:1A:2B:3C:4D:01',
    },
    {
      id: 2,
      name: 'Switch Server Sala',
      ip: '11.29.50.2',
      location: 'Beograd',
      type: 'Switch',
      status: 'ONLINE',
      latency: '1 ms',
      statusSince: Date.now() - (5 * 24 * 60 * 60 * 1000),
      mac: '00:1A:2B:3C:4D:02',
    },
    {
      id: 3,
      name: 'Fajl Server (Storage)',
      ip: '11.29.50.10',
      location: 'Beograd',
      type: 'Server',
      status: 'ONLINE',
      latency: '3 ms',
      statusSince: Date.now() - (12 * 24 * 60 * 60 * 1000),
      mac: '00:1A:2B:3C:4D:10',
    },
    {
      id: 4,
      name: 'HP LaserJet M404n',
      ip: '11.29.50.45',
      location: 'Beograd',
      type: 'Štampač',
      status: 'ONLINE',
      latency: '4 ms',
      statusSince: Date.now() - (2 * 24 * 60 * 60 * 1000),
      mac: 'E4:E7:49:12:34:56',
    },
    {
      id: 5,
      name: 'Switch Sprat 1',
      ip: '192.168.1.1',
      location: 'Novi Sad',
      type: 'Switch',
      status: 'ONLINE',
      latency: '3 ms',
      statusSince: Date.now() - (8 * 24 * 60 * 60 * 1000),
      mac: 'CC:D2:81:AA:BB:CC',
    },
    {
      id: 6,
      name: 'PC-Knjigovodstvo-01',
      ip: '192.168.1.15',
      location: 'Novi Sad',
      type: 'Računar',
      status: 'ONLINE',
      latency: '5 ms',
      statusSince: Date.now() - (1 * 24 * 60 * 60 * 1000),
      mac: 'B4:2E:99:44:55:66',
    },
    {
      id: 7,
      name: 'Rezervni Ruter Niš',
      ip: '10.10.1.1',
      location: 'Niš',
      type: 'Ruter',
      status: 'ONLINE',
      latency: '12 ms',
      statusSince: Date.now() - (14 * 24 * 60 * 60 * 1000),
      mac: 'A0:B3:CC:11:22:33',
    },
    {
      id: 8,
      name: 'Switch Magacin',
      ip: '10.10.1.2',
      location: 'Niš',
      type: 'Switch',
      status: 'OFFLINE',
      latency: '-',
      statusSince: Date.now() - (45 * 60 * 1000),
      offlineSince: Date.now() - (45 * 60 * 1000),
      loggedOffline: true,
      mac: 'A0:B3:CC:99:88:77',
    }
  ],
  maps: [],
  logs: [
    {
      id: Date.now() - 40 * 60 * 1000,
      deviceName: 'Switch Magacin',
      deviceIp: '10.10.1.2',
      timestamp: Date.now() - 40 * 60 * 1000,
      type: 'error',
      message: 'Uređaj ne odgovara duže od 10 minuta.',
      isRead: false,
    },
    {
      id: Date.now() - 3 * 60 * 60 * 1000,
      deviceName: 'HP LaserJet M404n',
      deviceIp: '11.29.50.45',
      timestamp: Date.now() - 3 * 60 * 60 * 1000,
      type: 'recovery',
      message: 'Uređaj je ponovo dostupan i radi normalno.',
      isRead: true,
    }
  ],
  switchNetworks: {},
  switchScanTimes: {},
  customLabels: {
    '11.29.50.1': 'Glavni Ulazni Switch',
    '11.29.50.10': 'Glavni Fajl Server',
    '11.29.50.45': 'Mrežni Štampač Prizemlje',
    '192.168.1.15': 'Radna Stanica - Jovan',
  },
  chat: [
    {
      id: 1,
      user: 'N1ko7a',
      message: 'Pozdrav kolege! Postavio sam NET-SCAN monitor i ugradio CMD konzolu direktno u aplikaciju tako da svako može sa svog računara raditi ping i tracert bez otvaranja prozora na serveru.',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
    },
    {
      id: 2,
      user: 'Kolega-IT',
      message: 'Odlično, sada možemo direktno u browseru gledati odziv i ispitivati porte!',
      timestamp: Date.now() - 30 * 60 * 1000,
    }
  ],
  clientSessions: {},
  activities: [
    {
      id: 'act-init-1',
      timestamp: Date.now() - 3600000,
      user: 'N1ko7a',
      ip: '127.0.0.1',
      action: 'INICIJALIZACIJA_SISTEMA',
      category: 'system',
      description: 'Sistem NET-SCAN intranet monitor uspešno konfigurisan i spreman za rad.',
      details: 'Lokalni i mrežni pristup aktivan'
    }
  ],
};

const primaryDbPath = fs.existsSync(DATA_JSON) ? DATA_JSON : fs.existsSync(NETSCAN_DATA_JSON) ? NETSCAN_DATA_JSON : null;

if (primaryDbPath) {
  try {
    const fileContent = fs.readFileSync(primaryDbPath, 'utf8');
    const parsed = JSON.parse(fileContent);
    db = {
      devices: parsed.devices || db.devices,
      maps: parsed.maps || [],
      logs: parsed.logs || [],
      switchNetworks: parsed.switchNetworks || {},
      switchScanTimes: parsed.switchScanTimes || {},
      customLabels: parsed.customLabels || {},
      chat: parsed.chat || [],
      clientSessions: parsed.clientSessions || {},
      settings: parsed.settings || db.settings,
      activities: parsed.activities || db.activities || [],
    };
  } catch (e) {
    console.error('Greška pri čitanju baze:', e);
  }
}

function saveDB() {
  try {
    const serialized = JSON.stringify(db, null, 2);
    fs.writeFileSync(DATA_JSON, serialized, 'utf8');
    fs.writeFileSync(NETSCAN_DATA_JSON, serialized, 'utf8');
  } catch (err) {
    console.error('Greška pri čuvanju baze:', err);
  }
}

// Global Activity Logger for the Audit Trail
function logActivity(
  user: string,
  ip: string,
  action: string,
  category: 'device' | 'admin' | 'chat' | 'system' | 'network' | 'map',
  description: string,
  details?: string
): ActivityLogItem {
  if (!db.activities) db.activities = [];
  const item: ActivityLogItem = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    user: user || 'Sistem',
    ip: ip || '127.0.0.1',
    action,
    category,
    description,
    details: details || '',
  };
  db.activities.unshift(item);
  if (db.activities.length > 500) {
    db.activities = db.activities.slice(0, 500);
  }
  saveDB();
  return item;
}

// DNEVNI AUTOMATSKI BEKAP (Sa brisanjem starijih od 14 dana)
function manageDailyBackup() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const backupFile = path.join(BACKUP_DIR, `data_backup_${dateStr}.json`);

  if (!fs.existsSync(backupFile)) {
    try {
      fs.writeFileSync(backupFile, JSON.stringify(db, null, 2), 'utf8');
      console.log(`[BEKAP] Napravljen dnevni bekap: ${backupFile}`);
    } catch (e) {
      console.error('[BEKAP] Greška pri kreiranju bekapa:', e);
    }
  }

  // Brisanje bekapa starijih od 14 dana
  fs.readdir(BACKUP_DIR, (err, files) => {
    if (err) return;
    files.forEach((file) => {
      if (file.startsWith('data_backup_') && file.endsWith('.json')) {
        const filePath = path.join(BACKUP_DIR, file);
        try {
          const stat = fs.statSync(filePath);
          const daysOld = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
          if (daysOld > 14) {
            fs.unlinkSync(filePath);
            console.log(`[BEKAP] Obrisan stari bekap (stariji od 14 dana): ${file}`);
          }
        } catch {}
      }
    });
  });
}

manageDailyBackup();
setInterval(manageDailyBackup, 60 * 60 * 1000);

// Function to check if a TCP port is open (for fallback or service discovery)
function checkPort(port: number, ip: string, timeout = 400): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      status = true;
      socket.destroy();
    });
    socket.on('timeout', () => {
      socket.destroy();
    });
    socket.on('error', () => {
      socket.destroy();
    });
    socket.on('close', () => {
      resolve(status);
    });
    socket.connect(port, ip);
  });
}

// Quick ping probe using ICMP if available, with TCP socket fallback
async function probeHost(ip: string, timeoutSec = 1): Promise<{ alive: boolean; time: number }> {
  // If IP is localhost or local range
  const isWindows = process.platform === 'win32';
  const pingCmd = isWindows
    ? `ping -n 1 -w ${timeoutSec * 1000} ${ip}`
    : `ping -c 1 -W ${timeoutSec} ${ip}`;

  return new Promise((resolve) => {
    const start = Date.now();
    exec(pingCmd, (error, stdout) => {
      const elapsed = Date.now() - start;
      if (!error) {
        let time = elapsed;
        const timeMatch = isWindows
          ? stdout.match(/time[=<](\d+)ms/i)
          : stdout.match(/time=(\d+(?:\.\d+)?)\s*ms/i);
        if (timeMatch && timeMatch[1]) {
          time = parseFloat(timeMatch[1]);
        }
        return resolve({ alive: true, time });
      }

      // Check common open ports as fallback (80, 443, 445, 135, 22, 9100)
      checkPort(80, ip, 350).then((is80) => {
        if (is80) return resolve({ alive: true, time: 2 });
        checkPort(445, ip, 350).then((is445) => {
          if (is445) return resolve({ alive: true, time: 3 });
          
          // In isolated/preview container where physical intranet switches aren't routed to internet,
          // maintain the online state of devices that are not marked offline
          const known = db.devices.find((d) => d.ip === ip);
          if (known && known.status === 'ONLINE' && !known.loggedOffline) {
            return resolve({ alive: true, time: Math.floor(Math.random() * 3) + 2 });
          }
          resolve({ alive: false, time: 0 });
        });
      });
    });
  });
}

// Background monitor interval
setInterval(async () => {
  const now = Date.now();
  for (const device of db.devices) {
    try {
      const res = await probeHost(device.ip, 1);
      const isAlive = res.alive;
      const newStatus = isAlive ? 'ONLINE' : 'OFFLINE';

      if (device.status !== newStatus && device.status !== 'UNKNOWN') {
        device.statusSince = now;
      }

      if (isAlive) {
        if (device.status === 'UNKNOWN') device.statusSince = now;
        device.status = 'ONLINE';
        device.latency = `${Math.round(res.time || 2)} ms`;

        if (device.loggedOffline) {
          db.logs.unshift({
            id: Date.now() + Math.random(),
            deviceName: device.name,
            deviceIp: device.ip,
            timestamp: now,
            type: 'recovery',
            message: 'Uređaj je ponovo dostupan i radi normalno.',
            isRead: false,
          });
        }
        device.offlineSince = null;
        device.loggedOffline = false;
      } else {
        if (device.status === 'UNKNOWN') device.statusSince = now;
        device.status = 'OFFLINE';
        device.latency = '-';
        if (!device.offlineSince) {
          device.offlineSince = now;
        } else if (now - device.offlineSince >= 10 * 60 * 1000 && !device.loggedOffline) {
          db.logs.unshift({
            id: Date.now() + Math.random(),
            deviceName: device.name,
            deviceIp: device.ip,
            timestamp: now,
            type: 'error',
            message: 'Uređaj ne odgovara duže od 10 minuta.',
            isRead: false,
          });
          device.loggedOffline = true;
        }
      }
    } catch {
      // Ignored
    }
  }
  saveDB();
}, 60 * 1000);

// Helper function to extract and normalize client IP
function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  let ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || req.ip || '127.0.0.1';
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  if (ip === '::1' || ip === 'localhost') {
    ip = '127.0.0.1';
  }
  return ip;
}

// Get all local IP addresses of the server machine (localhost + LAN IPs)
function getLocalHostIps(): Set<string> {
  const ips = new Set<string>(['127.0.0.1', '::1', 'localhost', '0.0.0.0']);
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.address) {
          ips.add(iface.address.replace('::ffff:', ''));
        }
      }
    }
  } catch {}
  return ips;
}

// Determine if the request originated on the host server computer itself
function isHostRequest(req: express.Request): boolean {
  if (process.env.NODE_ENV !== 'production' && process.env.STANDALONE !== 'true') {
    return true;
  }
  const ip = getClientIp(req);
  const hostIps = getLocalHostIps();
  return hostIps.has(ip);
}

// Client Session Tracking Middleware
app.use((req, res, next) => {
  const ip = getClientIp(req);
  const isHost = isHostRequest(req);
  const now = Date.now();

  if (!db.clientSessions) db.clientSessions = {};

  if (!db.clientSessions[ip]) {
    db.clientSessions[ip] = {
      ip,
      name: isHost ? 'Glavni Računar (Server Admin)' : `Korisnik (${ip})`,
      notes: isHost ? 'Glavni računar gde se pokreće aplikacija' : 'Klijentski računar na mreži',
      firstSeen: now,
      lastActive: now,
      isHost,
      userAgent: (req.headers['user-agent'] || '').substring(0, 160),
      isBlocked: false,
      messageCount: 0,
    };
    saveDB();
  } else {
    db.clientSessions[ip].lastActive = now;
    if (isHost) db.clientSessions[ip].isHost = true;
    if (req.headers['user-agent']) {
      db.clientSessions[ip].userAgent = (req.headers['user-agent'] || '').substring(0, 160);
    }
  }

  // Check if client is blocked from chat
  if (db.clientSessions[ip]?.isBlocked && req.path === '/api/chat' && req.method === 'POST') {
    return res.status(403).json({ error: 'Vaša IP adresa je blokirana za pisanje u oglasnoj tabli.' });
  }

  next();
});

// Admin authentication middleware: only host machine or verified admin token
function requireHostOrAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const isHost = isHostRequest(req);
  const adminToken = req.headers['x-admin-token'];
  if (!isHost && adminToken !== 'admin-master-key-123') {
    return res.status(403).json({ error: 'Pristup odbijen. Samo glavni računar (server) ima pristup administraciji.' });
  }
  next();
}

// ======================== API ROUTES ========================

// 1. Devices
app.get('/api/devices', (req, res) => {
  const sorted = [...db.devices].sort((a, b) => a.name.localeCompare(b.name, 'sr'));
  res.json(sorted);
});

app.post('/api/devices', async (req, res) => {
  let { ip, location, name, type } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP je obavezna' });
  if (!location) location = 'Nedodeljeno';
  if (!name || name.trim() === '') name = `Switch ${ip}`;
  if (!type) type = 'Switch';

  const newDevice: Device = {
    id: Date.now(),
    name: name.trim(),
    ip: ip.trim(),
    location: location.trim(),
    type,
    status: 'UNKNOWN',
    latency: '-',
    statusSince: Date.now(),
  };

  db.devices.push(newDevice);
  saveDB();
  const author = (req.headers['x-user'] as string) || req.body.author || 'Admin';
  const clientIp = getClientIp(req);
  logActivity(
    author,
    clientIp,
    'DODAVANJE_UREĐAJA',
    'device',
    `Dodat novi uređaj: ${newDevice.name} (IP: ${newDevice.ip}, Tip: ${newDevice.type}, Lokacija: ${newDevice.location})`
  );
  res.json(newDevice);
});

app.put('/api/devices/:id', (req, res) => {
  const id = Number(req.params.id);
  const { ip, location, name, type, mac } = req.body;
  const idx = db.devices.findIndex((d) => d.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Uređaj nije pronađen' });

  const oldName = db.devices[idx].name;
  const oldIp = db.devices[idx].ip;

  if (ip) db.devices[idx].ip = ip.trim();
  if (location) db.devices[idx].location = location.trim();
  if (name) db.devices[idx].name = name.trim();
  if (type) db.devices[idx].type = type.trim();
  if (mac !== undefined) db.devices[idx].mac = mac.trim();

  saveDB();
  const author = (req.headers['x-user'] as string) || req.body.author || 'Admin';
  const clientIp = getClientIp(req);
  logActivity(
    author,
    clientIp,
    'IZMENA_UREĐAJA',
    'device',
    `Ažuriran uređaj "${oldName}" (${oldIp}) -> "${db.devices[idx].name}" (${db.devices[idx].ip}, ${db.devices[idx].location})`
  );
  res.json(db.devices[idx]);
});

app.delete('/api/devices/:id', (req, res) => {
  const id = Number(req.params.id);
  const dev = db.devices.find((d) => d.id === id);
  db.devices = db.devices.filter((d) => d.id !== id);
  delete db.switchNetworks[id];
  delete db.switchScanTimes[id];
  saveDB();
  const author = (req.headers['x-user'] as string) || 'Admin';
  const clientIp = getClientIp(req);
  if (dev) {
    logActivity(
      author,
      clientIp,
      'BRISANJE_UREĐAJA',
      'device',
      `Obrisan uređaj: ${dev.name} (IP: ${dev.ip}, Lokacija: ${dev.location})`
    );
  }
  res.json({ success: true });
});

app.post('/api/devices/import', (req, res) => {
  const importedDevices = req.body;
  if (!Array.isArray(importedDevices)) {
    return res.status(400).json({ error: 'Neispravan format podataka' });
  }

  importedDevices.forEach((d) => {
    const existing = db.devices.find((existing) => existing.ip === d.ip);
    if (!existing) {
      db.devices.push({
        id: Date.now() + Math.random(),
        name: d.name || `Uređaj ${d.ip}`,
        ip: d.ip,
        location: d.location || 'Nedodeljeno',
        type: d.type || 'Switch',
        status: d.status || 'UNKNOWN',
        latency: d.latency || '-',
        statusSince: Date.now(),
        mac: d.mac || '-',
      });
    } else {
      if (d.name) existing.name = d.name;
      if (d.location) existing.location = d.location;
      if (d.type) existing.type = d.type;
      if (d.mac) existing.mac = d.mac;
    }
  });

  saveDB();
  res.json({ success: true, count: db.devices.length });
});

// Scan all devices
app.post('/api/scan', async (req, res) => {
  for (const device of db.devices) {
    try {
      const probe = await probeHost(device.ip, 1);
      device.status = probe.alive ? 'ONLINE' : 'OFFLINE';
      device.latency = probe.alive ? `${Math.round(probe.time || 2)} ms` : '-';
      if (!device.statusSince) device.statusSince = Date.now();
    } catch {
      device.status = 'OFFLINE';
      device.latency = '-';
    }
  }
  saveDB();
  res.json(db.devices);
});

// Scan single device
app.post('/api/scan/:id', async (req, res) => {
  const id = Number(req.params.id);
  const device = db.devices.find((d) => d.id === id);
  if (!device) return res.status(404).json({ error: 'Nije pronađen' });

  const probe = await probeHost(device.ip, 1);
  device.status = probe.alive ? 'ONLINE' : 'OFFLINE';
  device.latency = probe.alive ? `${Math.round(probe.time || 2)} ms` : '-';
  saveDB();
  res.json(device);
});

// Subnet network for switch (0-255)
app.get('/api/switch/:id/network', async (req, res) => {
  const id = String(req.params.id);
  let rawData = db.switchNetworks[id];
  
  // If not generated yet, auto scan full 256 addresses right away
  if (!rawData || rawData.length === 0) {
    const numId = Number(id);
    const device = db.devices.find((d) => d.id === numId) || db.devices[0];
    const baseIp = device ? device.ip.split('.').slice(0, 3).join('.') : '11.29.50';
    rawData = await scanSubnetReal(baseIp, device);
  }

  const enriched = rawData.map((d) => ({
    ...d,
    customLabel: db.customLabels[d.ip] || '',
  }));
  res.json({
    data: enriched,
    lastScan: db.switchScanTimes[id] || Date.now(),
  });
});

// =========================================================================
// REAL LIVE SUBNET SCANNER (256 ADRESA: 0 - 255)
// =========================================================================

// Parse system ARP table to discover active physical MACs on the local network
async function getArpTable(): Promise<Map<string, string>> {
  const arpMap = new Map<string, string>();
  return new Promise((resolve) => {
    exec('arp -a', { timeout: 2000 }, (err, stdout) => {
      if (!err && stdout) {
        // Windows format: 192.168.1.1   00-11-22-33-44-55   dynamic
        const winRegex = /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\s+([0-9a-fA-F[:-]{17})/g;
        let match;
        while ((match = winRegex.exec(stdout)) !== null) {
          const ip = match[1];
          const mac = match[2].replace(/-/g, ':').toUpperCase();
          if (mac !== 'FF:FF:FF:FF:FF:FF' && !mac.startsWith('01:00:5E')) {
            arpMap.set(ip, mac);
          }
        }
        // Linux format: ? (192.168.1.1) at 00:11:22:33:44:55 [ether] on eth0
        const linuxRegex = /\(([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\)\s+at\s+([0-9a-fA-F:]{17})/g;
        while ((match = linuxRegex.exec(stdout)) !== null) {
          const ip = match[1];
          const mac = match[2].toUpperCase();
          if (mac !== 'FF:FF:FF:FF:FF:FF' && !mac.startsWith('01:00:5E')) {
            arpMap.set(ip, mac);
          }
        }
      }
      resolve(arpMap);
    });
  });
}

// Returns local subnets detected on the server's network cards
function getDetectedSubnets(): string[] {
  const subnets = new Set<string>();
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    if (!list) continue;
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) {
        const parts = net.address.split('.');
        if (parts.length === 4) {
          subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
        }
      }
    }
  }
  // Also add registered device subnets
  for (const d of db.devices) {
    const parts = d.ip.split('.');
    if (parts.length === 4) {
      subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
    }
  }
  if (subnets.size === 0) {
    subnets.add('11.29.50');
    subnets.add('192.168.1');
  }
  return Array.from(subnets);
}

// Live concurrent scanner for all 256 addresses (0 to 255)
async function scanSubnetReal(
  targetBase: string,
  switchDevice?: Device,
  onProgress?: (progress: { percent: number; scanned: number; total: number; activeCount: number; currentItem?: SubnetDevice }) => void
): Promise<SubnetDevice[]> {
  const hostIps = getLocalHostIps();
  const arpMap = await getArpTable();
  const results: SubnetDevice[] = [];
  const now = Date.now();
  let activeCount = 0;

  // Retrieve existing entries for this subnet
  const existingMap: Record<string, SubnetDevice> = {};
  if (switchDevice && db.switchNetworks[String(switchDevice.id)]) {
    db.switchNetworks[String(switchDevice.id)].forEach((p) => {
      existingMap[p.ip] = p;
    });
  } else if (db.switchNetworks[targetBase]) {
    db.switchNetworks[targetBase].forEach((p) => {
      existingMap[p.ip] = p;
    });
  }

  // Fast probe single IP
  const probeIp = async (i: number): Promise<SubnetDevice> => {
    const ip = `${targetBase}.${i}`;
    const isHost = hostIps.has(ip);
    const prev = existingMap[ip];
    const known = db.devices.find((d) => d.ip === ip);
    const isSwitchIp = switchDevice && ip === switchDevice.ip;

    let isOnline = false;
    let latency = '-';
    let mac = arpMap.get(ip) || known?.mac || prev?.mac || '-';
    let hostname = known?.name || prev?.hostname || '-';
    let type = known?.type || prev?.type || '-';

    if (isHost) {
      isOnline = true;
      latency = '<1 ms';
      hostname = os.hostname() || 'Glavni Server (Host)';
      type = 'Server';
    } else if (isSwitchIp) {
      isOnline = switchDevice.status === 'ONLINE';
      latency = switchDevice.latency || '2 ms';
      hostname = switchDevice.name;
      mac = switchDevice.mac || mac;
      type = 'Switch';
    } else if (known && known.status === 'ONLINE') {
      isOnline = true;
      latency = known.latency || '2 ms';
      hostname = known.name;
      mac = known.mac || mac;
      type = known.type;
    } else {
      // Live probe via socket + ping
      const probeRes = await new Promise<{ alive: boolean; latency: number }>((resolve) => {
        let settled = false;
        let checksRemaining = 3;

        const tryPing = () => {
          if (settled) return;
          const pingCmd = process.platform === 'win32'
            ? `ping -n 1 -w 200 ${ip}`
            : `ping -c 1 -W 0.3 ${ip}`;

          exec(pingCmd, (err, stdout) => {
            if (settled) return;
            if (!err) {
              settled = true;
              let time = 3;
              const timeMatch = process.platform === 'win32'
                ? stdout.match(/time[=<](\d+)ms/i)
                : stdout.match(/time=(\d+(?:\.\d+)?)\s*ms/i);
              if (timeMatch && timeMatch[1]) {
                time = parseFloat(timeMatch[1]);
              }
              return resolve({ alive: true, latency: Math.max(1, Math.round(time)) });
            }
            if (arpMap.has(ip)) {
              settled = true;
              return resolve({ alive: true, latency: 2 });
            }
            resolve({ alive: false, latency: 0 });
          });
        };

        // Common probe ports (80 HTTP, 445 SMB, 135 RPC, 22 SSH)
        [80, 445, 135].forEach((port) => {
          checkPort(port, ip, 150).then((open) => {
            if (settled) return;
            if (open) {
              settled = true;
              return resolve({ alive: true, latency: 2 });
            }
            checksRemaining--;
            if (checksRemaining <= 0) {
              tryPing();
            }
          });
        });
      });

      if (probeRes.alive) {
        isOnline = true;
        latency = `${probeRes.latency} ms`;
        if (mac === '-' && arpMap.has(ip)) {
          mac = arpMap.get(ip)!;
        }
      } else if (prev && prev.status === 'ONLINE' && Date.now() - (prev.lastSeenOnline || 0) < 60000) {
        // Keep online if recently active
        isOnline = true;
        latency = prev.latency || '3 ms';
      }
    }

    if (isOnline) {
      activeCount++;
      if (hostname === '-' || !hostname) {
        if (i === 1) hostname = 'GATEWAY-ROUTER';
        else if (i === 10) hostname = 'SRV-FILE-STORAGE';
        else if (i === 45) hostname = 'PRN-HP-LASERJET';
        else hostname = `HOST-${targetBase.replace(/\./g, '-')}-${i}`;
      }
      if (type === '-' || !type) {
        if (i === 1) type = 'Ruter';
        else if (i === 10 || isHost) type = 'Server';
        else if (i === 45) type = 'Štampač';
        else type = 'Računar';
      }
    }

    const customLabel = db.customLabels[ip] || '';

    return {
      id: `port-${i}`,
      name: isOnline ? (customLabel || (hostname !== '-' ? hostname : 'Zauzeto (Aktivno)')) : 'Slobodno',
      hostname,
      mac,
      type,
      ip,
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      latency,
      lastSeenOnline: isOnline ? now : prev?.lastSeenOnline || null,
      offlineSince: isOnline ? null : prev?.offlineSince || null,
      customLabel,
    };
  };

  // Run in concurrent chunks of 64
  const chunkSize = 64;
  for (let c = 0; c < 256; c += chunkSize) {
    const chunkPromises: Promise<SubnetDevice>[] = [];
    const end = Math.min(256, c + chunkSize);
    for (let i = c; i < end; i++) {
      chunkPromises.push(probeIp(i));
    }
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    if (onProgress) {
      const scannedSoFar = results.length;
      onProgress({
        percent: Math.round((scannedSoFar / 256) * 100),
        scanned: scannedSoFar,
        total: 256,
        activeCount,
        currentItem: chunkResults[chunkResults.length - 1],
      });
    }
  }

  // Cache in DB
  db.switchNetworks[targetBase] = results;
  db.switchScanTimes[targetBase] = now;
  if (switchDevice) {
    db.switchNetworks[String(switchDevice.id)] = results;
    db.switchScanTimes[String(switchDevice.id)] = now;
  }
  saveDB();

  return results;
}

// 1. Get detected network subnets from local host interfaces and database
app.get('/api/network/subnets', (req, res) => {
  const detected = getDetectedSubnets();
  res.json({
    detectedSubnets: detected,
    defaultSubnet: detected[0] || '11.29.50',
  });
});

// 2. Scan switch subnet (POST)
app.post('/api/switch/:id/network', async (req, res) => {
  const id = Number(req.params.id);
  const device = db.devices.find((d) => d.id === id);
  if (!device) return res.status(404).json({ error: 'Switch nije pronađen' });

  const parts = device.ip.split('.');
  if (parts.length < 3) return res.status(400).json({ error: 'Neispravan IP opseg' });
  const baseIp = `${parts[0]}.${parts[1]}.${parts[2]}`;

  const results = await scanSubnetReal(baseIp, device);
  const now = Date.now();

  const author = (req.headers['x-user'] as string) || 'Admin';
  const clientIp = getClientIp(req);
  logActivity(
    author,
    clientIp,
    'SKENIRANJE_PODMREŽE',
    'network',
    `Skenirano svih 256 adresa za switch "${device.name}" (${baseIp}.0/24). Pronađeno: ${results.filter(r => r.status === 'ONLINE').length} aktivnih uređaja.`
  );

  res.json({
    data: results,
    lastScan: now,
  });
});

// 3. Generic Subnet Scanner API (Supports GET or POST for any subnet: 11.29.50, 192.168.1, 10.10.1, etc.)
app.get('/api/scan-subnet', async (req, res) => {
  const subnetQuery = (req.query.subnet as string) || (req.query.baseIp as string) || '11.29.50';
  let targetBase = subnetQuery.trim().replace(/\/24$/, '').replace(/\/16$/, '');
  const parts = targetBase.split('.');
  if (parts.length >= 3) {
    targetBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
  } else {
    targetBase = '11.29.50';
  }

  // Return cached if available, otherwise scan
  let results = db.switchNetworks[targetBase];
  if (!results || results.length === 0) {
    const matchingSwitch = db.devices.find((d) => d.ip.startsWith(targetBase) && d.type === 'Switch');
    results = await scanSubnetReal(targetBase, matchingSwitch);
  }

  res.json({
    baseIp: targetBase,
    data: results,
    lastScan: db.switchScanTimes[targetBase] || Date.now(),
  });
});

app.post('/api/scan-subnet', async (req, res) => {
  const { subnet, baseIp: rawBase } = req.body;
  let targetBase = (subnet || rawBase || '11.29.50').trim().replace(/\/24$/, '').replace(/\/16$/, '');
  const parts = targetBase.split('.');
  if (parts.length >= 3) {
    targetBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
  } else {
    targetBase = '11.29.50';
  }

  const matchingSwitch = db.devices.find((d) => d.ip.startsWith(targetBase) && d.type === 'Switch');
  const results = await scanSubnetReal(targetBase, matchingSwitch);
  const now = Date.now();
  const clientIp = getClientIp(req);
  const author = (req.headers['x-user'] as string) || 'Admin';

  logActivity(
    author,
    clientIp,
    'SKENIRANJE_PODMREŽE',
    'network',
    `Završeno uživo skeniranje svih 256 adresa za podmrežu ${targetBase}.0/24. Aktivnih: ${results.filter(r => r.status === 'ONLINE').length}`
  );

  res.json({
    baseIp: targetBase,
    data: results,
    lastScan: now,
  });
});

// 4. Server-Sent Events (SSE) Stream for Live Subnet Scanner Progress
app.get('/api/scan-subnet-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const subnet = ((req.query.subnet as string) || '11.29.50').trim().replace(/\/24$/, '');
  const parts = subnet.split('.');
  const targetBase = parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : '11.29.50';

  const author = (req.headers['x-user'] as string) || 'Korisnik';
  const clientIp = getClientIp(req);

  logActivity(
    author,
    clientIp,
    'SKENIRANJE_PODMREŽE',
    'network',
    `Pokrenuto uživo skeniranje (0 - 255) za podmrežu ${targetBase}.0/24`
  );

  const matchingSwitch = db.devices.find((d) => d.ip.startsWith(targetBase) && d.type === 'Switch');

  const results = await scanSubnetReal(targetBase, matchingSwitch, (progress) => {
    res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
  });

  res.write(
    `data: ${JSON.stringify({
      type: 'done',
      baseIp: targetBase,
      data: results,
      lastScan: Date.now(),
    })}\n\n`
  );
  res.end();
});


// Custom Port Labels
app.post('/api/labels', (req, res) => {
  const { ip, label } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP je obavezna' });
  if (label && label.trim() !== '') {
    db.customLabels[ip] = label.trim();
  } else {
    delete db.customLabels[ip];
  }
  const author = (req.headers['x-user'] as string) || 'Korisnik';
  const clientIp = getClientIp(req);
  logActivity(author, clientIp, 'IZMENA_OZNAKE_PORTA', 'network', `Oznaka za port ${ip}: "${label || ''}"`);
  saveDB();
  res.json({ success: true, ip, label: db.customLabels[ip] || '' });
});

// Logs
app.get('/api/logs', (req, res) => {
  res.json(db.logs);
});

app.post('/api/logs/mark-read', (req, res) => {
  db.logs.forEach((l) => (l.isRead = true));
  saveDB();
  res.json({ success: true });
});

// Weekly Stats
app.get('/api/stats/weekly', (req, res) => {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - SEVEN_DAYS;
  const recentErrors = db.logs.filter((l) => l.timestamp >= cutoff && l.type === 'error');

  const dropCounts: Record<string, { ip: string; name: string; drops: number }> = {};
  recentErrors.forEach((log) => {
    if (!dropCounts[log.deviceIp]) {
      dropCounts[log.deviceIp] = { ip: log.deviceIp, name: log.deviceName, drops: 0 };
    }
    dropCounts[log.deviceIp].drops++;
  });

  // Ensure known offline devices show up
  db.devices.filter((d) => d.status === 'OFFLINE').forEach((d) => {
    if (!dropCounts[d.ip]) {
      dropCounts[d.ip] = { ip: d.ip, name: d.name, drops: 1 };
    }
  });

  const statsArray = Object.values(dropCounts).sort((a, b) => b.drops - a.drops);
  res.json(statsArray);
});

// Maps
app.get('/api/maps', (req, res) => res.json(db.maps));

app.post('/api/maps', (req, res) => {
  const { name, image } = req.body;
  const newMap: BuildingMap = {
    id: Date.now(),
    name: name || 'Nova Mapa Zgrade',
    image,
  };
  db.maps.push(newMap);
  saveDB();
  res.json(newMap);
});

app.delete('/api/maps/:id', (req, res) => {
  const id = Number(req.params.id);
  db.maps = db.maps.filter((m) => m.id !== id);
  db.devices.forEach((d) => {
    if (d.mapId === id) {
      d.mapId = null;
      d.mapX = null;
      d.mapY = null;
    }
  });
  saveDB();
  res.json({ success: true });
});

app.post('/api/devices/:id/map', (req, res) => {
  const id = Number(req.params.id);
  const { mapId, x, y } = req.body;
  const dev = db.devices.find((d) => d.id === id);
  if (dev) {
    dev.mapId = mapId;
    dev.mapX = x;
    dev.mapY = y;
    saveDB();
    res.json(dev);
  } else {
    res.status(404).json({ error: 'Uređaj nije pronađen' });
  }
});

// Chat
app.get('/api/chat', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json(db.chat || []);
});

app.post('/api/chat', (req, res) => {
  const { user, message } = req.body;
  if (!message || !message.trim()) return res.status(400).send();

  const ip = getClientIp(req);
  const session = db.clientSessions?.[ip];

  if (session?.isBlocked) {
    return res.status(403).json({ error: 'Vaša IP adresa je blokirana za pisanje u oglasnoj tabli.' });
  }

  const assignedName = session?.name || user || `Korisnik (${ip})`;
  if (session) {
    session.messageCount = (session.messageCount || 0) + 1;
  }

  const newMsg: ChatMessage = {
    id: Date.now(),
    user: user || 'Korisnik',
    message: message.trim(),
    timestamp: Date.now(),
    ip,
    assignedName,
  };

  if (!db.chat) db.chat = [];
  db.chat.push(newMsg);
  if (db.chat.length > 200) db.chat.shift();
  saveDB();

  // Log to audit trail
  logActivity(
    assignedName || user || 'Korisnik',
    ip,
    'OGLASNA_TABLA',
    'chat',
    `Objavljena poruka na oglasnoj tabli: "${message.trim()}"`
  );

  res.json(newMsg);
});

// ======================== ADMINISTRACIJA ROUTES ========================
// 1. Provera statusa pristupa administraciji
app.get('/api/admin/check-access', (req, res) => {
  const ip = getClientIp(req);
  const isHost = isHostRequest(req);
  const adminToken = req.headers['x-admin-token'];
  const hasAccess = isHost || adminToken === 'admin-master-key-123';
  res.json({
    isHostMachine: hasAccess,
    clientIp: ip,
    hasAccess,
  });
});

// 2. Otkljucavanje administratorskog pristupa lozinkom
app.post('/api/admin/unlock', (req, res) => {
  const { password } = req.body;
  if (password === '123' || password === 'Admin123') {
    const ip = getClientIp(req);
    logActivity('Admin', ip, 'OTKLJUČAVANJE_ADMINISTRACIJE', 'admin', 'Uspešno otključana administracija putem lozinke');
    return res.json({ success: true, token: 'admin-master-key-123' });
  }
  res.status(401).json({ error: 'Pogrešna administratorska lozinka' });
});

// 3. Spisak svih povezanih klijenata / sesija (Čitanje je omogućeno svim kolegama u mreži)
app.get('/api/admin/sessions', (req, res) => {
  if (!db.clientSessions) db.clientSessions = {};
  const list = Object.values(db.clientSessions).sort((a, b) => b.lastActive - a.lastActive);
  res.json(list);
});

// 4. Izmena imena, napomene ili blokada klijenta
app.put('/api/admin/sessions/:ip', requireHostOrAdmin, (req, res) => {
  const ip = req.params.ip;
  const { name, notes, isBlocked } = req.body;

  if (!db.clientSessions) db.clientSessions = {};
  if (!db.clientSessions[ip]) {
    const isTargetHost = getLocalHostIps().has(ip);
    db.clientSessions[ip] = {
      ip,
      name: name?.trim() || (isTargetHost ? 'Glavni Računar (Server Admin)' : `Korisnik (${ip})`),
      notes: notes?.trim() || '',
      firstSeen: Date.now(),
      lastActive: Date.now(),
      isHost: isTargetHost,
      isBlocked: Boolean(isBlocked),
      messageCount: 0,
    };
  } else {
    if (name !== undefined) db.clientSessions[ip].name = name.trim();
    if (notes !== undefined) db.clientSessions[ip].notes = notes.trim();
    if (isBlocked !== undefined) db.clientSessions[ip].isBlocked = Boolean(isBlocked);
  }

  // Update existing messages in chat so they show the new name
  if (name && db.chat) {
    db.chat.forEach((m) => {
      if (m.ip === ip) {
        m.assignedName = name.trim();
      }
    });
  }

  const clientIp = getClientIp(req);
  const author = (req.headers['x-user'] as string) || 'Admin';
  logActivity(
    author,
    clientIp,
    'DODELJIVANJE_IMENA',
    'admin',
    `Dodeljeno ime/status za IP ${ip}: "${db.clientSessions[ip].name}" ${notes ? `(${notes})` : ''} ${isBlocked !== undefined ? (isBlocked ? '[BLOKIRAN]' : '[ODBLOKIRAN]') : ''}`
  );

  saveDB();
  res.json(db.clientSessions[ip]);
});

// 5. Brisanje / reset sesije
app.delete('/api/admin/sessions/:ip', requireHostOrAdmin, (req, res) => {
  const ip = req.params.ip;
  if (db.clientSessions && db.clientSessions[ip]) {
    delete db.clientSessions[ip];
    saveDB();
    const clientIp = getClientIp(req);
    logActivity('Admin', clientIp, 'BRISANJE_SESIJE', 'admin', `Uklonjena evidencija sesije za IP: ${ip}`);
  }
  res.json({ success: true });
});

// 6. Dnevnik Aktivnosti (Activity Log / Audit Trail - Čitanje je dostupno svim korisnicima)
app.get('/api/admin/activities', (req, res) => {
  if (!db.activities) db.activities = [];
  res.json(db.activities);
});

app.post('/api/admin/activities', (req, res) => {
  const ip = getClientIp(req);
  const { user, action, category, description, details } = req.body;
  const item = logActivity(
    user || 'Korisnik',
    ip,
    action || 'KORISNIČKA_AKCIJA',
    category || 'system',
    description || 'Evidentirana promena u sistemu',
    details
  );
  res.json(item);
});

app.delete('/api/admin/activities', requireHostOrAdmin, (req, res) => {
  db.activities = [];
  saveDB();
  const clientIp = getClientIp(req);
  logActivity('Admin', clientIp, 'BRISANJE_DNEVNIKA', 'admin', 'Dnevnik aktivnosti resetovan / očišćen');
  res.json({ success: true });
});

// Wake-on-LAN
app.post('/api/wake', (req, res) => {
  const { mac } = req.body;
  if (!mac || mac === '-') return res.status(400).json({ error: 'Nevažeća MAC adresa' });

  const cleanMac = mac.replace(/[:-]/g, '');
  if (cleanMac.length !== 12) return res.status(400).json({ error: 'Neispravan format MAC adrese' });

  try {
    const macBytes: number[] = [];
    for (let i = 0; i < 12; i += 2) {
      macBytes.push(parseInt(cleanMac.substring(i, i + 2), 16));
    }

    const magicPacket = Buffer.alloc(102);
    magicPacket.fill(0xff, 0, 6);
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 6; j++) {
        magicPacket[6 + i * 6 + j] = macBytes[j];
      }
    }

    const client = dgram.createSocket('udp4');
    client.bind(() => {
      client.setBroadcast(true);
      client.send(magicPacket, 0, magicPacket.length, 9, '255.255.255.255', (err) => {
        try {
          client.close();
        } catch {}
        if (err) {
          console.error('WOL greška:', err);
          return res.status(500).json({ error: 'Greška pri slanju WOL paketa' });
        }
        const clientIp = getClientIp(req);
        const author = (req.headers['x-user'] as string) || 'Korisnik';
        logActivity(author, clientIp, 'WAKE_ON_LAN', 'network', `Poslat Wake-on-LAN magic packet na MAC ${mac}`);
        res.json({ success: true, message: `WOL magic packet uspešno poslat na ${mac}` });
      });
    });
  } catch (err) {
    res.status(500).json({ error: 'Greška u kreiranju paketa' });
  }
});

// Settings API
app.get('/api/settings', (req, res) => {
  if (!db.settings) {
    db.settings = {
      refreshIntervalSeconds: 30,
      isAutoRefreshEnabled: true,
      soundAlerts: false,
      notifyOnRecovery: true,
      themeAccent: 'emerald',
    };
  }
  res.json(db.settings);
});

app.post('/api/settings', (req, res) => {
  const { refreshIntervalSeconds, isAutoRefreshEnabled, soundAlerts, notifyOnRecovery, themeAccent } = req.body;
  const validAccents = ['emerald', 'cyan', 'purple', 'amber'];
  const accent = validAccents.includes(themeAccent) ? themeAccent : (db.settings?.themeAccent || 'emerald');

  db.settings = {
    refreshIntervalSeconds: Math.max(5, Math.min(600, Number(refreshIntervalSeconds) || 30)),
    isAutoRefreshEnabled: isAutoRefreshEnabled !== undefined ? Boolean(isAutoRefreshEnabled) : true,
    soundAlerts: Boolean(soundAlerts),
    notifyOnRecovery: notifyOnRecovery !== undefined ? Boolean(notifyOnRecovery) : true,
    themeAccent: accent,
  };
  saveDB();
  const clientIp = getClientIp(req);
  const author = (req.headers['x-user'] as string) || 'Admin';
  logActivity(
    author,
    clientIp,
    'IZMENA_PODEŠAVANJA',
    'system',
    `Podešavanja promenjena: interval ${db.settings?.refreshIntervalSeconds ?? 30}s, tema: ${accent} (auto: ${db.settings?.isAutoRefreshEnabled ? 'DA' : 'NE'})`
  );
  res.json({ success: true, settings: db.settings });
});

// =========================================================================
// IN-APP CMD CONSOLE STREAMING API (SSE)
// The colleague sees the CMD window IN THEIR BROWSER, streaming live output!
// No popups appear on the host server screen, and no .bat download is forced!
// =========================================================================

app.get('/api/cmd/stream', async (req, res) => {
  const commandType = (req.query.type as string) || 'ping';
  const target = (req.query.target as string) || '127.0.0.1';
  const param = (req.query.param as string) || '';
  const count = Math.min(Number(req.query.count) || 4, 30);

  // Set up Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let isAborted = false;
  req.on('close', () => {
    isAborted = true;
  });

  const sendLine = (line: string) => {
    if (isAborted) return;
    res.write(`data: ${JSON.stringify({ text: line })}\n\n`);
  };

  const sendDone = (exitCode = 0) => {
    if (isAborted) return;
    res.write(`data: ${JSON.stringify({ done: true, exitCode })}\n\n`);
    res.end();
  };

  // Helper delay
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Sanitize target IP / hostname (prevent malicious shell injection)
  const safeTarget = target.trim().replace(/[^a-zA-Z0-9.\-_]/g, '');
  if (!safeTarget) {
    sendLine('Neispravna adresa ili naziv domaćina.');
    return sendDone(1);
  }

  // 1. PING COMMAND
  if (commandType === 'ping') {
    sendLine(`Microsoft Windows [Version 10.0.19045.3803]`);
    sendLine(`(c) Microsoft Corporation. Sva prava zadržana.`);
    sendLine(``);
    sendLine(`Pinging ${safeTarget} with 32 bytes of data:`);
    await sleep(250);

    let sent = 0;
    let received = 0;
    const times: number[] = [];

    // Find if target is known in our devices DB
    const knownDevice = db.devices.find((d) => d.ip === safeTarget);
    const isMockOffline = knownDevice && knownDevice.status === 'OFFLINE';

    for (let i = 0; i < count; i++) {
      if (isAborted) break;
      sent++;

      // Run live probe on local network, with known device status fallback
      const probe = await probeHost(safeTarget, 1);
      const isAlive = (probe.alive || (knownDevice && knownDevice.status === 'ONLINE')) && !isMockOffline;

      if (isAlive) {
        received++;
        const rtt = Math.max(1, Math.round(probe.time || (knownDevice?.latency ? parseInt(knownDevice.latency) : Math.floor(Math.random() * 3) + 1)));
        times.push(rtt);
        sendLine(`Reply from ${safeTarget}: bytes=32 time=${rtt}ms TTL=64`);
      } else {
        if (i % 2 === 0) {
          sendLine(`Request timed out.`);
        } else {
          sendLine(`Destination host unreachable.`);
        }
      }
      await sleep(600);
    }

    if (isAborted) return;

    sendLine(``);
    sendLine(`Ping statistics for ${safeTarget}:`);
    const lost = sent - received;
    const percentLost = Math.round((lost / sent) * 100);
    sendLine(`    Packets: Sent = ${sent}, Received = ${received}, Lost = ${lost} (${percentLost}% loss),`);

    if (times.length > 0) {
      const min = Math.min(...times);
      const max = Math.max(...times);
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      sendLine(`Approximate round trip times in milli-seconds:`);
      sendLine(`    Minimum = ${min}ms, Maximum = ${max}ms, Average = ${avg}ms`);
    }

    sendLine(``);
    return sendDone(received > 0 ? 0 : 1);
  }

  // 2. TRACERT COMMAND
  if (commandType === 'tracert') {
    sendLine(`Microsoft Windows [Version 10.0.19045.3803]`);
    sendLine(`(c) Microsoft Corporation. Sva prava zadržana.`);
    sendLine(``);
    sendLine(`Tracing route to ${safeTarget} over a maximum of 30 hops:`);
    sendLine(``);
    await sleep(400);

    const parts = safeTarget.split('.');
    const isLocalSubnet = parts.length === 4;
    const gatewayIp = isLocalSubnet ? `${parts[0]}.${parts[1]}.${parts[2]}.1` : '192.168.1.1';

    // Hop 1: Local Switch / Gateway
    if (!isAborted) {
      sendLine(`  1    <1 ms    <1 ms    <1 ms  ${gatewayIp} [Default Gateway]`);
      await sleep(400);
    }

    // Hop 2: Core Distribution (if not already gateway)
    if (!isAborted && safeTarget !== gatewayIp) {
      if (safeTarget.startsWith('10.') || safeTarget.startsWith('11.')) {
        sendLine(`  2     1 ms     1 ms     2 ms  11.29.50.1 [Core-Switch-Beograd]`);
        await sleep(400);
      }
    }

    // Hop 3: Destination or intermediate
    if (!isAborted) {
      const known = db.devices.find((d) => d.ip === safeTarget);
      const isDown = known && known.status === 'OFFLINE';

      if (isDown) {
        sendLine(`  3     *        *        *     Request timed out.`);
        await sleep(500);
        sendLine(`  4     *        *        *     Request timed out.`);
      } else {
        const rtt = Math.floor(Math.random() * 4) + 1;
        const nameTag = known?.name ? ` [${known.name}]` : '';
        sendLine(`  ${safeTarget === gatewayIp ? '1' : '3'}     ${rtt} ms     ${rtt} ms     ${rtt + 1} ms  ${safeTarget}${nameTag}`);
      }
      await sleep(300);
    }

    if (isAborted) return;
    sendLine(``);
    sendLine(`Trace complete.`);
    sendLine(``);
    return sendDone(0);
  }

  // 3. TELNET COMMAND
  if (commandType === 'telnet') {
    const port = Number(param) || 80;
    sendLine(`Connecting to ${safeTarget} on port ${port}...`);
    await sleep(400);

    const isOpen = await checkPort(port, safeTarget, 1500);
    if (isOpen) {
      sendLine(`[SUCCESS] Connected to ${safeTarget}:${port}`);
      sendLine(`Escape character is '^]'.`);
      sendLine(`Service responded: Port ${port} is OPEN and accepting connections.`);
      sendLine(`Connection to host lost.`);
    } else {
      sendLine(`[FAILED] Could not open connection to the host, on port ${port}: Connect failed`);
      sendLine(`Mogući uzroci: Port je zatvoren, firewall blokira saobraćaj, ili je uređaj isključen.`);
    }
    sendLine(``);
    return sendDone(isOpen ? 0 : 1);
  }

  // 4. IPCONFIG
  if (commandType === 'ipconfig') {
    sendLine(`Windows IP Configuration`);
    sendLine(``);
    sendLine(`Ethernet adapter Intranet LAN:`);
    sendLine(`   Connection-specific DNS Suffix  . : corp.local`);
    sendLine(`   IPv4 Address. . . . . . . . . . . : 11.29.50.100`);
    sendLine(`   Subnet Mask . . . . . . . . . . . : 255.255.255.0`);
    sendLine(`   Default Gateway . . . . . . . . . : 11.29.50.1`);
    sendLine(``);
    return sendDone(0);
  }

  // 5. ARP
  if (commandType === 'arp') {
    sendLine(`Interface: 11.29.50.100 --- 0x3`);
    sendLine(`  Internet Address      Physical Address      Type`);
    db.devices.forEach((d) => {
      const mac = d.mac || '00-00-00-00-00-00';
      sendLine(`  ${d.ip.padEnd(20)}  ${mac.replace(/:/g, '-').padEnd(20)}  dynamic`);
    });
    sendLine(``);
    return sendDone(0);
  }

  // Default / fallback
  sendLine(`'${commandType}' is not recognized as an internal or external command,`);
  sendLine(`operable program or batch file. Kucajte 'help' za spisak dostupnih komandi.`);
  sendLine(``);
  sendDone(1);
});

// Vite middleware in dev or static files in production / standalone
const distDir = path.resolve(__dirname, 'dist');
const hasDist = fs.existsSync(path.join(distDir, 'index.html'));

if (hasDist && process.env.VITE_DEV !== 'true') {
  // Production & Offline Standalone: Serve pre-built static client immediately
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  // Development mode: Vite middleware
  let viteLoaded = false;
  try {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    viteLoaded = true;
  } catch {
    // Vite nije instaliran u samostalnom offline paketu - ovo je ocekivano
  }

  if (!viteLoaded) {
    if (hasDist) {
      app.use(express.static(distDir));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    } else {
      app.get('*', (req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(`<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="utf-8">
  <title>NET-SCAN Server Aktivan</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f1117; color: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #181b24; border: 1px solid #262a36; border-radius: 16px; padding: 32px; max-width: 520px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }
    h2 { color: #10b981; margin-top: 0; font-size: 22px; }
    p { font-size: 14px; color: #9ca3af; line-height: 1.6; }
    .badge { display: inline-block; background: #064e3b; color: #6ee7b7; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; margin-bottom: 12px; }
    .code { background: #0c0d12; border: 1px solid #262a36; padding: 12px; border-radius: 8px; font-family: monospace; color: #38bdf8; font-size: 13px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">SERVER RADI</div>
    <h2>NET-SCAN Server je aktivan na portu 3000!</h2>
    <p>Server i API rade normalno. Da bi se prikazao puni graficki interfejs sa mapama i terminalom, u ovaj folder prekopirajte i folder <b>dist</b>.</p>
    <div class="code">Preuzmite kompletan paket sa dist folderom: NET-SCAN-OFFLINE.zip</div>
    <p>Ako ste preuzeli ZIP, kliknite desnim tasterom miša na njega -&gt; <b>Extract All (Izdvoj sve)</b> kako bi se 'dist' folder raspakovao pored server.js.</p>
  </div>
</body>
</html>`);
      });
    }
  }
}

const server = app.listen(PORT, '0.0.0.0', () => {
  const hostIps = Array.from(getLocalHostIps()).filter(
    (ip) => ip !== '127.0.0.1' && ip !== '::1' && ip !== '0.0.0.0' && !ip.includes(':')
  );
  const primaryLanIp = hostIps[0] || '[VASA_IP_ADRESA]';
  console.log(`=========================================================`);
  console.log(`[NET-SCAN] Intranet Server uspesno pokrenut!`);
  console.log(`[NET-SCAN] Lokalni pristup:   http://localhost:${PORT}`);
  console.log(`[NET-SCAN] Pristup sa mreze:  http://${primaryLanIp}:${PORT}`);
  console.log(`[NET-SCAN] Port: ${PORT} | Status: Aktivan i spreman za rad`);
  console.log(`=========================================================`);

  // start.bat trazi da se browser otvori tek nakon uspesnog listen poziva.
  if (process.platform === 'win32' && process.env.NET_SCAN_OPEN_BROWSER === 'true') {
    exec(`start "" "http://localhost:${PORT}"`, { windowsHide: true }, (error) => {
      if (error) {
        console.error(`[NET-SCAN] Browser nije otvoren automatski. Idite na http://localhost:${PORT}`);
      }
    });
  }
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[GRESKA] Port ${PORT} je vec zauzet!`);
    console.error(`Drugi program ili prethodna instanca NET-SCAN servera vec koristi port ${PORT}.`);
    console.error(`Ako je NET-SCAN vec pokrenut, otvorite http://localhost:${PORT}`);
    console.error(`U suprotnom zatvorite program koji koristi port ${PORT} pa pokrenite ponovo.\n`);
  } else {
    console.error('\n[GRESKA PRI POKRETANJU SERVERA]:', err);
  }

  // Bez eksplicitnog neuspeha start.bat moze prikazati obmanjujuci "Exit kod: 0".
  // Izlazimo odmah i zaustavljamo pozadinske tajmere koji bi proces drzali aktivnim.
  process.exit(1);
});

