export interface Device {
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

export interface SubnetDevice {
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

export interface LogEntry {
  id: number;
  deviceName: string;
  deviceIp: string;
  timestamp: number;
  type: 'error' | 'recovery';
  message: string;
  isRead: boolean;
}

export interface ChatMessage {
  id: number;
  user: string;
  message: string;
  timestamp: number;
  ip?: string;
  assignedName?: string;
}

export interface ClientSession {
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

export interface AdminAccessInfo {
  isHostMachine: boolean;
  clientIp: string;
  hasAccess: boolean;
}

export interface BuildingMap {
  id: number;
  name: string;
  image: string;
}

export interface WeeklyStat {
  ip: string;
  name: string;
  drops: number;
}

export interface TerminalTab {
  id: string;
  title: string;
  commandType: 'ping' | 'tracert' | 'telnet' | 'custom';
  target: string;
  lines: string[];
  isRunning: boolean;
  activeCommand?: string;
}

export interface AppSettings {
  refreshIntervalSeconds: number;
  isAutoRefreshEnabled: boolean;
  soundAlerts: boolean;
  notifyOnRecovery: boolean;
  themeAccent?: 'emerald' | 'cyan' | 'purple' | 'amber';
}

export interface ActivityLogItem {
  id: string;
  timestamp: number;
  user: string;
  ip: string;
  action: string;
  category: 'device' | 'admin' | 'chat' | 'system' | 'network' | 'map';
  description: string;
  details?: string;
}

