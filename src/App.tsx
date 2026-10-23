import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  ClipboardList,
  Search,
  MapPin,
  FolderOpen,
  Database,
  FileSpreadsheet,
  FileCode,
  FileUp,
  FileText,
  MessageSquare,
  LogOut,
  RefreshCw,
  Plus,
  Terminal,
  Map as MapIcon,
  ChevronDown,
  Layers,
  BarChart3,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Activity,
  Laptop,
  BookOpen,
  Settings,
  Menu,
} from 'lucide-react';
import { Device, TerminalTab, BuildingMap, LogEntry, ChatMessage, AppSettings } from './types';
import { CmdTerminal } from './components/CmdTerminal';
import { NetworkMonitorBar } from './components/NetworkMonitorBar';
import { DevicesTable } from './components/DevicesTable';
import { SubnetScanner } from './components/SubnetScanner';
import { BuildingMaps } from './components/BuildingMaps';
import { StatsModal } from './components/StatsModal';
import { IncidentLogsModal } from './components/IncidentLogsModal';
import { ChatModal } from './components/ChatModal';
import { DeviceModal } from './components/DeviceModal';
import { LoginModal } from './components/LoginModal';
import { InstructionsModal } from './components/InstructionsModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminModal } from './components/AdminModal';

export default function App() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('netscan_logged_in') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<string>(() => {
    return sessionStorage.getItem('netscan_user') || 'Admin';
  });

  // Navigation State
  const [activeNav, setActiveNav] = useState<'devices' | 'scanner' | 'maps' | 'terminal'>('devices');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ONLINE' | 'OFFLINE' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core Data
  const [devices, setDevices] = useState<Device[]>([]);
  const [maps, setMaps] = useState<BuildingMap[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedSwitch, setSelectedSwitch] = useState<Device | null>(null);

  // Loading States
  const [isScanningAll, setIsScanningAll] = useState(false);

  // Modals
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isHostMachine, setIsHostMachine] = useState(true);
  const [adminToken, setAdminToken] = useState<string>(() => {
    const saved = sessionStorage.getItem('netscan_admin_token');
    if (saved) return saved;
    const user = sessionStorage.getItem('netscan_user') || 'Admin';
    if (user === 'Admin') {
      sessionStorage.setItem('netscan_admin_token', 'admin-master-key-123');
      return 'admin-master-key-123';
    }
    return '';
  });

  // Settings State (Persisted in localStorage & server data.json)
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('netscan_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      refreshIntervalSeconds: 30,
      isAutoRefreshEnabled: true,
      soundAlerts: false,
      notifyOnRecovery: true,
    };
  });
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(30);
  const previousDevicesRef = useRef<Device[]>([]);

  // Real-time Chat Sync state
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const lastChatCountRef = useRef<number>(0);

  // Sidebar Submenus
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);

  // Terminal State
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isTerminalMinimized, setIsTerminalMinimized] = useState(false);
  const [terminalTabs, setTerminalTabs] = useState<TerminalTab[]>([
    {
      id: 'tab-1',
      title: 'CMD Konzola',
      commandType: 'custom',
      target: '',
      lines: [
        'Microsoft Windows [Version 10.0.19045.3803]',
        '(c) Microsoft Corporation. Sva prava zadržana.',
        '',
        'NET-SCAN Intranet Diagnostics Terminal v2.4',
        'Konzola se izvršava u sklopu ove aplikacije na vašem računaru.',
        'Za spisak komandi ukucajte "help". Kliknite na PING ili TRACERT dugme na bilo kom uređaju za trenutni odziv.',
        '',
      ],
      isRunning: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const activeStreamsRef = useRef<Record<string, AbortController>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio beep for outage alert
  const playAlertBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // Load initial settings and data, and sync settings continuously across all clients
  useEffect(() => {
    fetchSettings();
    const settingsTimer = setInterval(() => {
      fetchSettings();
    }, 3500);
    return () => clearInterval(settingsTimer);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchDevices();
      fetchMaps();
      fetchLogs();
      fetchChat();
    }
  }, [isLoggedIn]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data && (data.refreshIntervalSeconds || data.themeAccent)) {
          setSettings((prev) => {
            if (
              prev.themeAccent === data.themeAccent &&
              prev.refreshIntervalSeconds === data.refreshIntervalSeconds &&
              prev.isAutoRefreshEnabled === data.isAutoRefreshEnabled &&
              prev.soundAlerts === data.soundAlerts &&
              prev.notifyOnRecovery === data.notifyOnRecovery
            ) {
              return prev;
            }
            return {
              ...prev,
              ...data,
            };
          });
          if (data.themeAccent) {
            document.documentElement.setAttribute('data-theme-accent', data.themeAccent);
          }
        }
      }
    } catch (e) {
      console.error('Greška pri dohvatanju podešavanja:', e);
    }
  };

  // Dynamic countdown and auto-refresh timer loop based on user-defined interval
  useEffect(() => {
    if (!isLoggedIn) return;

    const intervalTimer = setInterval(() => {
      if (!settings.isAutoRefreshEnabled) return;

      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          // Trigger refresh
          fetchDevices();
          fetchLogs();
          return settings.refreshIntervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [isLoggedIn, settings.isAutoRefreshEnabled, settings.refreshIntervalSeconds]);

  // Check whether the current browser is running on the host server computer
  useEffect(() => {
    if (!isLoggedIn) return;
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/admin/check-access', {
          headers: {
            'x-admin-token': adminToken,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setIsHostMachine(Boolean(data.isHostMachine));
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkAdmin();
  }, [isLoggedIn, adminToken]);

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (newSettings.themeAccent) {
      document.documentElement.setAttribute('data-theme-accent', newSettings.themeAccent);
    }
    setSecondsUntilRefresh(newSettings.refreshIntervalSeconds);
    try {
      localStorage.setItem('netscan_settings', JSON.stringify(newSettings));
      await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': currentUser,
        },
        body: JSON.stringify(newSettings),
      });
    } catch (e) {
      console.error('Greška pri čuvanju podešavanja na serveru:', e);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/devices');
      const data: Device[] = await res.json();

      // Check for drops to trigger sound alert if enabled
      if (settings.soundAlerts && previousDevicesRef.current.length > 0) {
        const hadDrop = data.some((newDev) => {
          const oldDev = previousDevicesRef.current.find((d) => d.id === newDev.id);
          return oldDev && oldDev.status === 'ONLINE' && newDev.status === 'OFFLINE';
        });
        if (hadDrop) {
          playAlertBeep();
        }
      }
      previousDevicesRef.current = data || [];
      setDevices(data || []);
    } catch (e) {
      console.error('Greška pri dohvatanju uređaja:', e);
    }
  };

  const fetchMaps = async () => {
    try {
      const res = await fetch('/api/maps');
      const data = await res.json();
      setMaps(data || []);
    } catch (e) {
      console.error('Greška pri dohvatanju mapa:', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data || []);
    } catch (e) {
      console.error('Greška pri dohvatanju logova:', e);
    }
  };

  const fetchChat = async () => {
    try {
      const res = await fetch('/api/chat', { cache: 'no-store' });
      if (res.ok) {
        const data: ChatMessage[] = await res.json();
        if (data && Array.isArray(data)) {
          const prevCount = lastChatCountRef.current;
          setChatMessages(data);
          if (prevCount > 0 && data.length > prevCount && !isChatOpen) {
            setUnreadChatCount((prev) => prev + (data.length - prevCount));
          }
          lastChatCountRef.current = data.length;
        }
      }
    } catch (e) {
      console.error('Greška pri dohvatanju chata:', e);
    }
  };

  // Continuous real-time chat sync across all connected users
  useEffect(() => {
    if (!isLoggedIn) return;
    const intervalMs = isChatOpen ? 1200 : 2500;
    const chatTimer = setInterval(() => {
      fetchChat();
    }, intervalMs);
    return () => clearInterval(chatTimer);
  }, [isLoggedIn, isChatOpen]);

  // Reset unread count when chat modal opens
  useEffect(() => {
    if (isChatOpen) {
      setUnreadChatCount(0);
      fetchChat();
    }
  }, [isChatOpen]);

  // Scan all devices
  const handleScanAll = async () => {
    setIsScanningAll(true);
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const data = await res.json();
      setDevices(data || []);
    } catch (e) {
      console.error('Greška pri masovnom skeniranju:', e);
    } finally {
      setIsScanningAll(false);
    }
  };

  // Wake-on-LAN
  const handleWakeDevice = async (mac: string) => {
    try {
      const res = await fetch('/api/wake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Magični paket (WOL) je uspešno poslat na mrežu!');
      } else {
        alert(data.error || 'Greška pri slanju WOL paketa.');
      }
    } catch (e) {
      alert('Greška u komunikaciji sa serverom.');
    }
  };

  // Add / Edit Device
  const handleSaveDevice = async (deviceData: {
    name: string;
    ip: string;
    location: string;
    type: string;
    mac?: string;
  }) => {
    if (editingDevice) {
      const res = await fetch(`/api/devices/${editingDevice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData),
      });
      const updated = await res.json();
      setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } else {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData),
      });
      const created = await res.json();
      setDevices((prev) => [...prev, created]);
    }
    setEditingDevice(null);
  };

  // Delete Device
  const handleDeleteDevice = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovaj uređaj?')) return;
    try {
      await fetch(`/api/devices/${id}`, { method: 'DELETE' });
      setDevices((prev) => prev.filter((d) => d.id !== id));
      if (selectedSwitch?.id === id) setSelectedSwitch(null);
    } catch (e) {
      console.error('Greška pri brisanju uređaja:', e);
    }
  };

  // Maps handlers
  const handleAddMap = async (name: string, image: string) => {
    try {
      const res = await fetch('/api/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image }),
      });
      const newMap = await res.json();
      setMaps((prev) => [...prev, newMap]);
    } catch (e) {
      console.error('Greška pri dodavanju mape:', e);
    }
  };

  const handleDeleteMap = async (id: number) => {
    try {
      await fetch(`/api/maps/${id}`, { method: 'DELETE' });
      setMaps((prev) => prev.filter((m) => m.id !== id));
      setDevices((prev) =>
        prev.map((d) => (d.mapId === id ? { ...d, mapId: null, mapX: null, mapY: null } : d))
      );
    } catch (e) {
      console.error('Greška pri brisanju mape:', e);
    }
  };

  const handleUpdateDeviceMap = async (
    deviceId: number,
    mapId: number | null,
    x: number | null,
    y: number | null
  ) => {
    try {
      await fetch(`/api/devices/${deviceId}/map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId, x, y }),
      });
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, mapId, mapX: x, mapY: y } : d))
      );
    } catch (e) {
      console.error('Greška pri ažuriranju lokacije na mapi:', e);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM for Serbian characters
    csvContent += 'NAZIV UREĐAJA,LOKACIJA,TIP UREĐAJA,IP ADRESA,STATUS,LATENCIJA,MAC ADRESA\n';

    const sorted = [...devices].sort((a, b) => (a.location || '').localeCompare(b.location || '', 'sr'));
    sorted.forEach((d) => {
      const name = `"${(d.name || '').replace(/"/g, '""')}"`;
      const location = `"${(d.location || '').replace(/"/g, '""')}"`;
      const type = `"${(d.type || '').replace(/"/g, '""')}"`;
      const ip = `"${d.ip || ''}"`;
      const status = `"${d.status || ''}"`;
      const latency = `"${d.latency || '-'}"`;
      const mac = `"${d.mac || '-'}"`;
      csvContent += `${name},${location},${type},${ip},${status},${latency},${mac}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mreza-izvestaj-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON Export / Import
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(devices, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `net-scan-bekap-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/devices/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imported),
        });
        if (res.ok) {
          alert('Uređaji su uspešno uvezeni!');
          fetchDevices();
        } else {
          alert('Greška pri uvozu podataka.');
        }
      } catch {
        alert('Neispravan JSON fajl.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Mark all logs read
  const handleMarkLogsRead = async () => {
    try {
      await fetch('/api/logs/mark-read', { method: 'POST' });
      setLogs((prev) => prev.map((l) => ({ ...l, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  // Chat send
  const handleSendMessage = async (msg: string) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': currentUser,
        },
        body: JSON.stringify({ user: currentUser, message: msg }),
      });
      if (res.ok) {
        await fetchChat();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add device discovered by subnet scanner into the main monitoring table
  const handleAddDeviceFromScanner = async (newDev: {
    name: string;
    ip: string;
    location: string;
    type: string;
    mac?: string;
  }) => {
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': currentUser,
        },
        body: JSON.stringify(newDev),
      });
      if (res.ok) {
        await fetchDevices();
      }
    } catch (e) {
      console.error('Greška pri dodavanju uređaja iz skenera:', e);
    }
  };

  // =========================================================================
  // THE IN-APP CMD ENGINE (Solves the user request!)
  // Opens on the colleague's machine inside the browser, streams line-by-line!
  // =========================================================================

  const handleOpenCmd = (
    commandType: 'ping' | 'tracert' | 'telnet',
    ip: string,
    title?: string
  ) => {
    const tabTitle = title || `${commandType.toUpperCase()}: ${ip}`;
    const newTabId = `tab-${Date.now()}`;

    const newTab: TerminalTab = {
      id: newTabId,
      title: tabTitle,
      commandType,
      target: ip,
      lines: [`C:\\NET-SCAN> ${commandType} ${ip}`, ''],
      isRunning: true,
      activeCommand: `${commandType} ${ip}`,
    };

    setTerminalTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
    setIsTerminalOpen(true);
    setIsTerminalMinimized(false);

    // Launch streaming execution
    startStreamingCommand(newTabId, commandType, ip);
  };

  const handleNewTab = (
    title = 'Konzola',
    cmd: 'ping' | 'tracert' | 'telnet' | 'custom' = 'custom',
    target = ''
  ) => {
    const newTabId = `tab-${Date.now()}`;
    const newTab: TerminalTab = {
      id: newTabId,
      title,
      commandType: cmd,
      target,
      lines: [
        'Microsoft Windows [Version 10.0.19045.3803]',
        '(c) Microsoft Corporation. Sva prava zadržana.',
        '',
        'C:\\NET-SCAN> ',
      ],
      isRunning: false,
    };
    setTerminalTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  const handleCloseTab = (id: string) => {
    // Abort running stream if any
    handleAbortTab(id);
    setTerminalTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (filtered.length === 0) {
        setIsTerminalOpen(false);
        return prev;
      }
      if (activeTabId === id) {
        setActiveTabId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleAbortTab = (tabId: string) => {
    if (activeStreamsRef.current[tabId]) {
      activeStreamsRef.current[tabId].abort();
      delete activeStreamsRef.current[tabId];
    }
    setTerminalTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? {
              ...t,
              isRunning: false,
              lines: [...t.lines, '^C', 'Komanda je prekinuta od strane korisnika.', ''],
            }
          : t
      )
    );
  };

  const startStreamingCommand = async (
    tabId: string,
    commandType: string,
    target: string,
    param = '',
    count = 4
  ) => {
    // Abort existing on this tab if any
    if (activeStreamsRef.current[tabId]) {
      activeStreamsRef.current[tabId].abort();
    }

    const controller = new AbortController();
    activeStreamsRef.current[tabId] = controller;

    setTerminalTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, isRunning: true } : t))
    );

    try {
      const url = `/api/cmd/stream?type=${encodeURIComponent(commandType)}&target=${encodeURIComponent(
        target
      )}&param=${encodeURIComponent(param)}&count=${count}`;

      const response = await fetch(url, { signal: controller.signal });
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const match = block.match(/^data:\s*(.+)$/m);
          if (match && match[1]) {
            try {
              const data = JSON.parse(match[1]);
              if (data.text !== undefined) {
                setTerminalTabs((prev) =>
                  prev.map((t) =>
                    t.id === tabId ? { ...t, lines: [...t.lines, data.text] } : t
                  )
                );
              }
              if (data.done) {
                setTerminalTabs((prev) =>
                  prev.map((t) => (t.id === tabId ? { ...t, isRunning: false } : t))
                );
              }
            } catch (err) {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setTerminalTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  isRunning: false,
                  lines: [
                    ...t.lines,
                    `Greška pri povezivanju sa serverom: ${err.message}`,
                  ],
                }
              : t
          )
        );
      }
    } finally {
      delete activeStreamsRef.current[tabId];
      setTerminalTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, isRunning: false } : t))
      );
    }
  };

  const handleExecuteInTab = (tabId: string, commandText: string) => {
    const trimmed = commandText.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'cls' || trimmed.toLowerCase() === 'clear') {
      setTerminalTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                lines: [
                  'Microsoft Windows [Version 10.0.19045.3803]',
                  '(c) Microsoft Corporation. Sva prava zadržana.',
                  '',
                ],
              }
            : t
        )
      );
      return;
    }

    if (trimmed.toLowerCase() === 'help') {
      setTerminalTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                lines: [
                  ...t.lines,
                  `C:\\NET-SCAN> ${trimmed}`,
                  '',
                  'Dostupne mrežne komande u ovoj ugrađenoj konzoli:',
                  '  PING <ip/host> [-t] [-n count]  Proverava dostupnost i latenciju uređaja',
                  '  TRACERT <ip/host>               Prikazuje putanju (skokove) paketa kroz mrežu',
                  '  TELNET <ip/host> [port]         Ispituje otvorenost TCP porta (npr. 80, 23, 9100)',
                  '  IPCONFIG                        Prikazuje konfiguraciju lokalne mrežne kartice',
                  '  ARP -a                          Prikazuje ARP tabelu i MAC adrese uređaja',
                  '  CLS                             Briše ekran konzole',
                  '  HELP                            Prikazuje ovu pomoć',
                  '',
                ],
              }
            : t
        )
      );
      return;
    }

    // Parse command
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const target = parts[1] || '';

    setTerminalTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? {
              ...t,
              lines: [...t.lines, `C:\\NET-SCAN> ${trimmed}`],
              title: `${cmd.toUpperCase()}: ${target || 'CMD'}`,
              commandType: (['ping', 'tracert', 'telnet'].includes(cmd) ? cmd : 'custom') as any,
              target: target || t.target,
            }
          : t
      )
    );

    if (cmd === 'ping') {
      const isContinuous = parts.includes('-t');
      const count = isContinuous ? 25 : 4;
      startStreamingCommand(tabId, 'ping', target || '127.0.0.1', '', count);
    } else if (cmd === 'tracert' || cmd === 'traceroute') {
      startStreamingCommand(tabId, 'tracert', target || '127.0.0.1');
    } else if (cmd === 'telnet') {
      const port = parts[2] || '80';
      startStreamingCommand(tabId, 'telnet', target || '127.0.0.1', port);
    } else if (cmd === 'ipconfig') {
      startStreamingCommand(tabId, 'ipconfig', '');
    } else if (cmd === 'arp') {
      startStreamingCommand(tabId, 'arp', '');
    } else {
      startStreamingCommand(tabId, cmd, target);
    }
  };

  // Filter calculations for stats cards
  const onlineDevicesCount = devices.filter((d) => d.status === 'ONLINE').length;
  const offlineDevicesCount = devices.filter((d) => d.status === 'OFFLINE').length;
  const unreadLogsCount = logs.filter((l) => !l.isRead).length;

  // Locations breakdown for sidebar
  const locationCounts: Record<string, { total: number; online: number; offline: number }> = {};
  devices.forEach((d) => {
    const loc = d.location || 'Ostalo';
    if (!locationCounts[loc]) locationCounts[loc] = { total: 0, online: 0, offline: 0 };
    locationCounts[loc].total++;
    if (d.status === 'ONLINE') locationCounts[loc].online++;
    if (d.status === 'OFFLINE') locationCounts[loc].offline++;
  });

  if (!isLoggedIn) {
    return (
      <LoginModal
        onLoginSuccess={(user) => {
          sessionStorage.setItem('netscan_logged_in', 'true');
          sessionStorage.setItem('netscan_user', user);
          setCurrentUser(user);
          setIsLoggedIn(true);
          if (user.toLowerCase() === 'admin') {
            const token = 'admin-master-key-123';
            sessionStorage.setItem('netscan_admin_token', token);
            setAdminToken(token);
            setIsHostMachine(true);
          } else {
            sessionStorage.removeItem('netscan_admin_token');
            setAdminToken('');
            setIsHostMachine(false);
          }
        }}
      />
    );
  }

  return (
    <div
      className="flex h-screen bg-[#0f1117] text-[#f3f4f6] overflow-hidden select-none"
      data-theme-accent={settings.themeAccent || 'emerald'}
    >
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
        />
      )}
      {/* ===================== SIDEBAR ===================== */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#14161f] border-r border-[#262a36] flex flex-col flex-shrink-0 transition-transform duration-200 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* LOGO */}
        <div className="p-5 border-b border-[#262a36]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-wider text-white">NET-SCAN</h1>
              <span className="text-[10px] font-semibold text-gray-400 tracking-wider">
                INTRANET MONITOR
              </span>
            </div>
          </div>
          <div className="text-[10px] text-gray-500 mt-2.5">
            Created by <strong className="text-emerald-400">N1ko7a</strong>
          </div>
        </div>

        {/* SCROLLABLE SIDEBAR BODY */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {/* NAVIGATION ALATI I KATEGORIJE */}
          <div>
            <div className="px-3 text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-2">
              Alati i Kategorije
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveNav('devices');
                  setSelectedLocation(null);
                  setSelectedSwitch(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  activeNav === 'devices' && !selectedLocation
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4" />
                  <span>Svi uređaji</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e2230] text-gray-300">
                  {devices.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveNav('scanner');
                  setSelectedSwitch(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  activeNav === 'scanner'
                    ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-4 h-4" />
                  <span>Mrežni Skener (/24)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  Uživo
                </span>
              </button>

              <button
                onClick={() => setActiveNav('maps')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  activeNav === 'maps'
                    ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapIcon className="w-4 h-4" />
                  <span>Mape Zgrada</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30">
                  Novo
                </span>
              </button>

              {/* CORE REQUEST: CMD TERMINAL BUTTON */}
              <button
                onClick={() => {
                  setIsTerminalOpen(true);
                  setIsTerminalMinimized(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isTerminalOpen && !isTerminalMinimized
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-md'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Mrežna Konzola (CMD)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-emerald-400 border border-emerald-600/40">
                  C:\_
                </span>
              </button>
            </div>
          </div>

          {/* GRADOVI / KATEGORIJE */}
          <div>
            <div className="px-3 text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-2">
              Gradovi / Kategorije
            </div>
            <div className="space-y-1">
              {Object.keys(locationCounts).length === 0 ? (
                <div className="px-3 text-xs text-gray-500">Nema unetih lokacija.</div>
              ) : (
                Object.entries(locationCounts).map(([loc, counts]) => {
                  const isSelected = selectedLocation === loc && activeNav === 'devices';
                  return (
                    <div
                      key={loc}
                      onClick={() => {
                        setSelectedLocation(isSelected ? null : loc);
                        setActiveNav('devices');
                        setSelectedSwitch(null);
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'border-transparent hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <MapPin
                            className={`w-3.5 h-3.5 ${
                              isSelected ? 'text-emerald-400' : 'text-gray-400'
                            }`}
                          />
                          <span className={isSelected ? 'text-emerald-400 font-bold' : 'text-gray-300'}>
                            {loc}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e2230] text-gray-400">
                          {counts.total}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1 pl-5">
                        <span className="text-emerald-400">{counts.online} Online</span>
                        <span>•</span>
                        <span className="text-red-400">{counts.offline} Offline</span>
                      </div>
                    </div>
                  );
                })
              )}

              <button
                onClick={() => {
                  setEditingDevice(null);
                  setIsDeviceModalOpen(true);
                }}
                className="w-full mt-2 py-2 border border-dashed border-[#2b3142] hover:border-emerald-500 text-gray-400 hover:text-emerald-400 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Dodaj grad / kategoriju
              </button>
            </div>
          </div>

          {/* SISTEMSKI ALATI I IZVEŠTAJI */}
          <div className="pt-2 border-t border-[#262a36] space-y-1">
            <div className="px-3 text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-2">
              Sistemski Alati
            </div>
            {/* IZVEŠTAJI SUBMENU */}
            <div>
              <button
                onClick={() => setIsReportsOpen(!isReportsOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
              <div className="flex items-center gap-2 text-emerald-400">
                <FolderOpen className="w-4 h-4" />
                <span className="text-gray-200">Izveštaji</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                  isReportsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isReportsOpen && (
              <div className="pl-6 pr-2 py-1 space-y-1">
                <button
                  onClick={() => setIsStatsOpen(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-emerald-400 rounded hover:bg-white/5"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> Nedeljna Statistika
                </button>
                <button
                  onClick={handleExportCsv}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-teal-400 rounded hover:bg-white/5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" /> Excel Izveštaj (.csv)
                </button>
              </div>
            )}
          </div>

          {/* BAZA PODATAKA SUBMENU */}
          <div>
            <button
              onClick={() => setIsDatabaseOpen(!isDatabaseOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2 text-blue-400">
                <Database className="w-4 h-4" />
                <span className="text-gray-200">Baza podataka</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                  isDatabaseOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isDatabaseOpen && (
              <div className="pl-6 pr-2 py-1 space-y-1">
                <button
                  onClick={handleExportJson}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-blue-400 rounded hover:bg-white/5"
                >
                  <FileCode className="w-3.5 h-3.5 text-blue-400" /> Bekap baze (.json)
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-purple-400 rounded hover:bg-white/5"
                >
                  <FileUp className="w-3.5 h-3.5 text-purple-400" /> Uvezi bekap (.json)
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* LOG PREKIDA */}
          <button
            onClick={() => setIsLogsOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 text-amber-400">
              <FileText className="w-4 h-4" />
              <span className="text-gray-200">Log prekida</span>
            </div>
            {unreadLogsCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                {unreadLogsCount}
              </span>
            )}
          </button>

          {/* OGLASNA TABLA (CHAT) */}
          <button
            onClick={() => {
              setIsChatOpen(true);
              setUnreadChatCount(0);
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 text-blue-400">
              <MessageSquare className="w-4 h-4" />
              <span className="text-gray-200">Oglasna Tabla</span>
            </div>
            {unreadChatCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white animate-pulse">
                +{unreadChatCount}
              </span>
            )}
          </button>

          {/* KORISNIČKO UPUTSTVO (OFFLINE SERVER) */}
          <button
            onClick={() => setIsInstructionsOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded-lg transition-colors border border-emerald-500/20"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>Korisničko Uputstvo</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">
              Offline
            </span>
          </button>

          {/* PODEŠAVANJA (INTERVAL OSVEŽAVANJA I TEMA) */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 text-blue-400">
              <Settings className="w-4 h-4" />
              <span>Podešavanja</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e2230] text-emerald-400 border border-emerald-500/20">
              {settings.refreshIntervalSeconds}s
            </span>
          </button>

          {/* ADMINISTRACIJA (TAB ISPOD PODEŠAVANJA - VIDLJIV SVIMA IDENTIČNO) */}
          <button
            onClick={() => {
              setIsAdminOpen(true);
              setIsMobileSidebarOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 rounded-lg transition-colors border border-purple-500/30 shadow-sm"
            title="Administracija klijenata, IP adresa, Dnevnik Aktivnosti (Audit Log) i podešavanja"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="text-gray-200">Administracija</span>
            </div>
            <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              {isHostMachine ? 'Host' : 'Nadzor'}
            </span>
          </button>
        </div>
      </div>

      {/* PINNED LOGOUT AT BOTTOM */}
      <div className="p-3 border-t border-[#262a36] bg-[#14161f]">
        <button
          onClick={() => {
            sessionStorage.removeItem('netscan_logged_in');
            setIsLoggedIn(false);
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
        >
          <LogOut className="w-4 h-4" /> Odjavi se ({currentUser})
        </button>
      </div>
    </aside>

      {/* ===================== MAIN CONTENT AREA ===================== */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0f1117]">
        {/* TOPBAR */}
        <header className="h-16 border-b border-[#262a36] bg-[#14161f] px-3 sm:px-6 flex items-center justify-between flex-shrink-0 gap-2">
          {/* SEARCH & MOBILE TOGGLE */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 bg-[#181b24] hover:bg-[#202534] text-gray-400 hover:text-white rounded-xl border border-[#262a36] transition-colors"
              title="Otvori meni"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="relative w-44 sm:w-72 md:w-96">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pretraži po imenu ili IP adresi..."
                className="w-full pl-9 pr-3 py-2 bg-[#0f1117] border border-[#262a36] rounded-xl text-xs text-white outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* TOPBAR ACTIONS */}
          <div className="flex items-center gap-3">
            {/* Quick in-app CMD launcher button in topbar */}
            <button
              onClick={() => {
                setIsTerminalOpen(true);
                setIsTerminalMinimized(false);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0c0c0c] hover:bg-[#1a1a1a] text-emerald-400 border border-emerald-600/40 rounded-xl text-xs font-mono font-bold transition-all shadow-sm"
              title="Otvori ugrađenu web CMD konzolu"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>CMD Konzola</span>
            </button>

            {/* Live Auto-Refresh Indicator / Trigger */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[#181b24] hover:bg-[#202534] border border-[#262a36] hover:border-emerald-500/40 rounded-xl text-xs font-mono transition-all text-gray-200 shadow-sm"
              title="Interval osvežavanja statusa — kliknite za izmenu u podešavanjima"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.isAutoRefreshEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-gray-300 font-bold">
                {settings.isAutoRefreshEnabled ? `Auto: ${secondsUntilRefresh}s` : 'Pauzirano'}
              </span>
              <span className="text-[10px] text-gray-500 font-sans hidden sm:inline">
                ({settings.refreshIntervalSeconds}s)
              </span>
            </button>

            {/* Check All Now */}
            <button
              onClick={handleScanAll}
              disabled={isScanningAll}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningAll ? 'animate-spin' : ''}`} />
              <span>{isScanningAll ? 'Proveravam...' : 'Proveri sada'}</span>
            </button>

            {/* Add Device Button */}
            <button
              onClick={() => {
                setEditingDevice(null);
                setIsDeviceModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Uređaj</span>
            </button>
          </div>
        </header>

        {/* SCROLLABLE MAIN VIEW */}
        <div className="flex-1 overflow-y-auto">
          {/* STATS CARDS */}
          {activeNav !== 'maps' && (
            <div className="px-6 sm:px-10 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* TOTAL */}
              <div
                onClick={() => setStatusFilter(null)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  statusFilter === null
                    ? 'bg-[#181b24] border-gray-400 shadow-md scale-[1.01]'
                    : 'bg-[#14161f] border-[#262a36] opacity-60 hover:opacity-100'
                }`}
              >
                <div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
                  UKUPNO UREĐAJA
                </div>
                <div className="text-2xl font-black text-white mt-1">{devices.length}</div>
              </div>

              {/* ONLINE */}
              <div
                onClick={() => setStatusFilter('ONLINE')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  statusFilter === 'ONLINE'
                    ? 'bg-emerald-950/20 border-emerald-500 shadow-md scale-[1.01]'
                    : 'bg-[#14161f] border-[#262a36] opacity-60 hover:opacity-100'
                }`}
              >
                <div className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
                  ONLINE
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {onlineDevicesCount}
                </div>
              </div>

              {/* OFFLINE */}
              <div
                onClick={() => setStatusFilter('OFFLINE')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  statusFilter === 'OFFLINE'
                    ? 'bg-red-950/20 border-red-500 shadow-md scale-[1.01]'
                    : 'bg-[#14161f] border-[#262a36] opacity-60 hover:opacity-100'
                }`}
              >
                <div className="text-[11px] font-bold text-red-400 tracking-wider uppercase">
                  OFFLINE
                </div>
                <div className="text-2xl font-black text-red-400 mt-1">
                  {offlineDevicesCount}
                </div>
              </div>
            </div>
          )}

          {/* MREŽNI MONITOR UŽIVO (Status dots strip) */}
          {activeNav !== 'maps' && (
            <NetworkMonitorBar
              devices={devices}
              onOpenCmd={handleOpenCmd}
              onOpenSwitch={(dev) => {
                setSelectedSwitch(dev);
                setActiveNav('scanner');
              }}
              onWakeDevice={handleWakeDevice}
            />
          )}

          {/* CONTENT HEADER */}
          <div className="px-6 sm:px-10 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {activeNav === 'scanner'
                    ? 'Mrežni Skener Uživo (/24)'
                    : activeNav === 'maps'
                    ? 'Mape Zgrada (Tlocrti)'
                    : selectedLocation
                    ? `Lokacija: ${selectedLocation}`
                    : 'Svi uređaji'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeNav === 'scanner'
                    ? 'Pregled svih uređaja i detaljno skeniranje 0-255 portova podmreže.'
                    : activeNav === 'maps'
                    ? 'Rasporedite uređaje na tlocrtu prevlačenjem miša.'
                    : 'Pregled svih registrovanih uređaja u mreži (Kliknite na PING ili TRACERT za pokretanje ugrađene konzole).'}
                </p>
              </div>

              {selectedLocation && activeNav === 'devices' && (
                <button
                  onClick={() => {
                    setEditingDevice(null);
                    setIsDeviceModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Dodaj Switch ovde
                </button>
              )}
            </div>
          </div>

          {/* MAIN VIEW SWITCHER */}
          <div className="px-6 sm:px-10 pb-12">
            {activeNav === 'devices' && (
              <DevicesTable
                devices={devices}
                onOpenCmd={handleOpenCmd}
                onOpenSwitch={(dev) => {
                  setSelectedSwitch(dev);
                  setActiveNav('scanner');
                }}
                onEditDevice={(dev) => {
                  setEditingDevice(dev);
                  setIsDeviceModalOpen(true);
                }}
                onDeleteDevice={handleDeleteDevice}
                onWakeDevice={handleWakeDevice}
                statusFilter={statusFilter}
                locationFilter={selectedLocation}
                searchQuery={searchQuery}
              />
            )}

            {activeNav === 'scanner' && (
              <SubnetScanner
                devices={devices}
                selectedSwitch={selectedSwitch}
                onSelectSwitch={setSelectedSwitch}
                onOpenCmd={handleOpenCmd}
                onWakeDevice={handleWakeDevice}
                onDeleteDevice={handleDeleteDevice}
                onAddDeviceToMonitoring={handleAddDeviceFromScanner}
              />
            )}

            {activeNav === 'maps' && (
              <BuildingMaps
                maps={maps}
                devices={devices}
                onAddMap={handleAddMap}
                onDeleteMap={handleDeleteMap}
                onUpdateDeviceMap={handleUpdateDeviceMap}
                onOpenCmd={handleOpenCmd}
              />
            )}
          </div>
        </div>
      </main>

      {/* ===================== IN-APP CMD TERMINAL (CORE FEATURE) ===================== */}
      <CmdTerminal
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        devices={devices}
        tabs={terminalTabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={handleCloseTab}
        onNewTab={handleNewTab}
        onExecuteInTab={handleExecuteInTab}
        onAbortTab={handleAbortTab}
        isMinimized={isTerminalMinimized}
        onToggleMinimize={() => setIsTerminalMinimized(!isTerminalMinimized)}
      />

      {/* ===================== MODALS ===================== */}
      <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />

      <IncidentLogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={logs}
        onMarkAllRead={handleMarkLogsRead}
      />

      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        chatMessages={chatMessages}
        onSendMessage={handleSendMessage}
        currentUser={currentUser}
        hasAdminAccess={isHostMachine || Boolean(adminToken)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onRefreshChat={fetchChat}
      />

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        isHostMachine={isHostMachine}
        adminToken={adminToken}
        onUnlockSuccess={(token) => {
          sessionStorage.setItem('netscan_admin_token', token);
          setAdminToken(token);
        }}
      />

      <DeviceModal
        isOpen={isDeviceModalOpen}
        onClose={() => {
          setIsDeviceModalOpen(false);
          setEditingDevice(null);
        }}
        editingDevice={editingDevice}
        defaultLocation={selectedLocation || ''}
        onSave={handleSaveDevice}
      />

      <InstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onTriggerInstantRefresh={() => {
          fetchDevices();
          fetchLogs();
          setSecondsUntilRefresh(settings.refreshIntervalSeconds);
        }}
      />
    </div>
  );
}
