import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  UserCheck,
  Edit2,
  Trash2,
  Ban,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Laptop,
  MessageSquare,
  Lock,
  KeyRound,
  FileSpreadsheet,
  History,
  Activity,
  Layers,
  Settings,
  AlertTriangle,
  Filter,
  PlusCircle,
  MapPin,
  Wifi,
  Trash,
} from 'lucide-react';
import { ClientSession, ActivityLogItem } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHostMachine: boolean;
  adminToken: string;
  onUnlockSuccess?: (token: string) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isHostMachine,
  adminToken,
  onUnlockSuccess,
}) => {
  // Navigation inside Admin
  const [activeAdminTab, setActiveAdminTab] = useState<'sessions' | 'activities'>('sessions');

  // Sessions State
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'blocked'>('all');

  // Activities State (Audit Log)
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityCategory, setActivityCategory] = useState<'all' | 'device' | 'admin' | 'chat' | 'system' | 'network' | 'map'>('all');

  // Editing state
  const [editingSession, setEditingSession] = useState<ClientSession | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Password unlock state (if not on host)
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [showUnlockInline, setShowUnlockInline] = useState(false);
  const [unlockInlinePass, setUnlockInlinePass] = useState('');
  const [unlockInlineError, setUnlockInlineError] = useState('');

  const hasAccess = isHostMachine || Boolean(adminToken);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/sessions', {
        headers: {
          'x-admin-token': adminToken || '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data || []);
      }
    } catch (e) {
      console.error('Greška pri učitavanju sesija:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    setIsActivitiesLoading(true);
    try {
      const res = await fetch('/api/admin/activities', {
        headers: {
          'x-admin-token': adminToken || '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data || []);
      }
    } catch (e) {
      console.error('Greška pri učitavanju aktivnosti:', e);
    } finally {
      setIsActivitiesLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
      fetchActivities();

      const interval = setInterval(() => {
        if (activeAdminTab === 'sessions') {
          fetchSessions();
        } else {
          fetchActivities();
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isOpen, hasAccess, adminToken, activeAdminTab]);

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    try {
      const res = await fetch('/api/admin/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: unlockPassword }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        onUnlockSuccess?.(data.token);
        setUnlockPassword('');
      } else {
        setUnlockError(data.error || 'Pogrešna lozinka');
      }
    } catch {
      setUnlockError('Greška pri povezivanju sa serverom');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSession) return;
    try {
      const res = await fetch(`/api/admin/sessions/${encodeURIComponent(editingSession.ip)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken || '',
          'x-user': 'Admin',
        },
        body: JSON.stringify({
          name: editName.trim() || `Korisnik (${editingSession.ip})`,
          notes: editNotes.trim(),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSessions((prev) => prev.map((s) => (s.ip === updated.ip ? updated : s)));
        setEditingSession(null);
        fetchActivities();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleBlock = async (session: ClientSession) => {
    try {
      const res = await fetch(`/api/admin/sessions/${encodeURIComponent(session.ip)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken || '',
          'x-user': 'Admin',
        },
        body: JSON.stringify({
          isBlocked: !session.isBlocked,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSessions((prev) => prev.map((s) => (s.ip === updated.ip ? updated : s)));
        fetchActivities();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSession = async (ip: string) => {
    if (!confirm(`Da li ste sigurni da želite da uklonite sesiju za IP: ${ip}?`)) return;
    try {
      const res = await fetch(`/api/admin/sessions/${encodeURIComponent(ip)}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': adminToken || '',
          'x-user': 'Admin',
        },
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.ip !== ip));
        fetchActivities();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCsv = () => {
    let csv = '\uFEFFIP ADRESA,DODELJENO IME,NAPOMENA,PRVI PRISTUP,POSLEDNJA AKTIVNOST,PORUKA,BLOKIRAN,HOST\n';
    sessions.forEach((s) => {
      const first = new Date(s.firstSeen).toLocaleString('sr-RS');
      const last = new Date(s.lastActive).toLocaleString('sr-RS');
      csv += `"${s.ip}","${(s.name || '').replace(/"/g, '""')}","${(s.notes || '').replace(/"/g, '""')}","${first}","${last}",${s.messageCount || 0},${s.isBlocked ? 'DA' : 'NE'},${s.isHost ? 'DA' : 'NE'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `klijenti-mreze-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportActivitiesCsv = () => {
    let csv = '\uFEFFVREME,KORISNIK,IP ADRESA,KATEGORIJA,AKCIJA,OPIS PROMENE,DODATNO\n';
    activities.forEach((a) => {
      const timeStr = new Date(a.timestamp).toLocaleString('sr-RS');
      csv += `"${timeStr}","${(a.user || '').replace(/"/g, '""')}","${a.ip}","${a.category}","${a.action}","${(a.description || '').replace(/"/g, '""')}","${(a.details || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dnevnik-aktivnosti-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearActivities = async () => {
    if (!confirm('Da li ste sigurni da želite da ispraznite kompletan dnevnik aktivnosti?')) return;
    try {
      const res = await fetch('/api/admin/activities', {
        method: 'DELETE',
        headers: {
          'x-admin-token': adminToken || '',
          'x-user': 'Admin',
        },
      });
      if (res.ok) {
        setActivities([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const now = Date.now();
  const activeThreshold = 5 * 60 * 1000; // 5 min
  const activeSessionsCount = sessions.filter((s) => now - s.lastActive < activeThreshold).length;
  const blockedCount = sessions.filter((s) => s.isBlocked).length;

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'active') {
      return now - s.lastActive < activeThreshold;
    }
    if (filterType === 'blocked') {
      return s.isBlocked;
    }
    return true;
  });

  const filteredActivities = activities.filter((a) => {
    const q = activitySearch.toLowerCase();
    const matchesSearch =
      (a.user || '').toLowerCase().includes(q) ||
      (a.ip || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q) ||
      (a.action || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (activityCategory !== 'all') {
      return a.category === activityCategory;
    }
    return true;
  });

  // Calculate today activities
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayActivitiesCount = activities.filter((a) => a.timestamp >= startOfToday.getTime()).length;
  const uniqueUsersCount = new Set(activities.map((a) => a.user)).size;

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'device':
        return {
          label: 'Uređaji',
          color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          icon: Laptop,
        };
      case 'admin':
        return {
          label: 'Administracija',
          color: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          icon: ShieldCheck,
        };
      case 'chat':
        return {
          label: 'Oglasna Tabla',
          color: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          icon: MessageSquare,
        };
      case 'network':
        return {
          label: 'Mreža & Skener',
          color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
          icon: Wifi,
        };
      case 'map':
        return {
          label: 'Mape',
          color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          icon: MapPin,
        };
      case 'system':
      default:
        return {
          label: 'Sistem',
          color: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
          icon: Settings,
        };
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('DODAVANJE')) return 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30';
    if (action.includes('IZMENA') || action.includes('DODELJIVANJE')) return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
    if (action.includes('BRISANJE') || action.includes('BLOKADA')) return 'bg-red-600/20 text-red-400 border-red-500/30';
    if (action.includes('SKENIRANJE') || action.includes('WAKE')) return 'bg-purple-600/20 text-purple-400 border-purple-500/30';
    return 'bg-amber-600/20 text-amber-400 border-amber-500/30';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#181b24] border border-[#262a36] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262a36] bg-[#14161f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Administracija & Nadzor Sistema</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  isHostMachine
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : hasAccess
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }`}>
                  {isHostMachine ? 'Glavni Server (Host)' : hasAccess ? 'Admin Pristup' : 'Nadzor & Uvid'}
                </span>
                {!hasAccess && !showUnlockInline && (
                  <button
                    onClick={() => {
                      setShowUnlockInline(true);
                      setUnlockInlinePass('');
                      setUnlockInlineError('');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold transition-all shadow-sm"
                    title="Otključaj pune izmene u administraciji"
                  >
                    <KeyRound className="w-3 h-3" /> Otključaj (123)
                  </button>
                )}
                {!hasAccess && showUnlockInline && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (unlockInlinePass === '123' || unlockInlinePass === 'Admin123') {
                        sessionStorage.setItem('netscan_admin_token', 'admin-master-key-123');
                        if (onUnlockSuccess) onUnlockSuccess('admin-master-key-123');
                        setShowUnlockInline(false);
                      } else {
                        setUnlockInlineError('Pogrešna lozinka');
                      }
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="password"
                      autoFocus
                      value={unlockInlinePass}
                      onChange={(e) => setUnlockInlinePass(e.target.value)}
                      placeholder="Lozinka (123)"
                      className="px-2 py-0.5 bg-[#0f1117] border border-purple-500 rounded text-[11px] text-white outline-none w-24 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUnlockInline(false)}
                      className="text-gray-400 hover:text-white text-[10px] px-1"
                    >
                      ✕
                    </button>
                    {unlockInlineError && (
                      <span className="text-[10px] text-red-400 font-semibold">{unlockInlineError}</span>
                    )}
                  </form>
                )}
              </div>
              <p className="text-[11px] text-gray-400">
                Evidencija posetilaca, dodela imena za oglasnu tablu i kompletan dnevnik svih promena u sistemu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUB-TABS: "Računari & Pristup" vs "Dnevnik Aktivnosti (Promene)" - ALWAYS VISIBLE TO EVERYONE */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#262a36] bg-[#14161f]">
          <button
            onClick={() => setActiveAdminTab('sessions')}
            className={`flex items-center gap-2 pb-3 px-2 text-xs font-bold border-b-2 transition-all ${
              activeAdminTab === 'sessions'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Povezani Računari ({sessions.length})</span>
          </button>
          <button
            onClick={() => setActiveAdminTab('activities')}
            className={`flex items-center gap-2 pb-3 px-2 text-xs font-bold border-b-2 transition-all ${
              activeAdminTab === 'activities'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Dnevnik Aktivnosti (Šta je ko promenio)</span>
            {activities.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {activities.length}
              </span>
            )}
          </button>
        </div>

        {/* CONTENT */}
        {activeAdminTab === 'sessions' ? (
          /* ========================================================================= */
          /* TAB 1: SESSIONS & COMPUTER NAMING                                          */
          /* ========================================================================= */
          <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
            {/* STAT CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#12141c] border border-[#262a36] rounded-xl p-3.5">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  Ukupno Uređaja
                </div>
                <div className="text-2xl font-black text-white mt-1">{sessions.length}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">zabeleženo u mreži</div>
              </div>

              <div className="bg-[#12141c] border border-[#262a36] rounded-xl p-3.5">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  Aktivni Klijenti
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">{activeSessionsCount}</div>
                <div className="text-[10px] text-emerald-500/80 mt-0.5">u zadnjih 5 minuta</div>
              </div>

              <div className="bg-[#12141c] border border-[#262a36] rounded-xl p-3.5">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  Ukupno Poruka
                </div>
                <div className="text-2xl font-black text-blue-400 mt-1">
                  {sessions.reduce((acc, s) => acc + (s.messageCount || 0), 0)}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">u oglasnoj tabli</div>
              </div>

              <div className="bg-[#12141c] border border-[#262a36] rounded-xl p-3.5">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  Blokirane Adrese
                </div>
                <div className="text-2xl font-black text-red-400 mt-1">{blockedCount}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">zabrana pisanja</div>
              </div>
            </div>

            {/* CONTROLS BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12141c] p-3 rounded-xl border border-[#262a36]">
              {/* SEARCH */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pretraži IP, ime ili kancelariju..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#0f1117] border border-[#262a36] rounded-lg text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              {/* FILTERS */}
              <div className="flex items-center gap-1.5 bg-[#0f1117] p-1 rounded-lg border border-[#262a36]">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    filterType === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Svi ({sessions.length})
                </button>
                <button
                  onClick={() => setFilterType('active')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    filterType === 'active'
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-400 hover:text-emerald-400'
                  }`}
                >
                  Aktivni ({activeSessionsCount})
                </button>
                <button
                  onClick={() => setFilterType('blocked')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    filterType === 'blocked'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-400 hover:text-red-400'
                  }`}
                >
                  Blokirani ({blockedCount})
                </button>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchSessions}
                  disabled={isLoading}
                  className="p-1.5 bg-[#181b24] hover:bg-[#202534] border border-[#262a36] text-gray-300 rounded-lg hover:text-white transition-colors"
                  title="Osveži listu klijenata"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
                </button>
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181b24] hover:bg-[#202534] border border-[#262a36] text-gray-200 rounded-lg text-[11px] font-bold hover:text-purple-300 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" /> Izvezi CSV
                </button>
              </div>
            </div>

            {/* SESSIONS TABLE */}
            <div className="bg-[#12141c] border border-[#262a36] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#262a36] bg-[#0c0d12] text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3.5">IP Adresa</th>
                    <th className="py-2.5 px-3.5">Dodeljeno Ime (Ko Piše)</th>
                    <th className="py-2.5 px-3.5">Napomena / Kancelarija</th>
                    <th className="py-2.5 px-3.5">Poslednja Aktivnost</th>
                    <th className="py-2.5 px-3.5 text-center">Poruke</th>
                    <th className="py-2.5 px-3.5 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2230] text-xs">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        Nema pronađenih računara u ovoj kategoriji.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((session) => {
                      const isActive = now - session.lastActive < activeThreshold;
                      const lastActiveDate = new Date(session.lastActive);
                      const timeStr = lastActiveDate.toLocaleTimeString('sr-RS', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const dateStr = lastActiveDate.toLocaleDateString('sr-RS');

                      return (
                        <tr
                          key={session.ip}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          {/* IP */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
                                }`}
                                title={isActive ? 'Aktivan na sistemu' : 'Neaktivan'}
                              />
                              <span className="font-mono font-bold text-white">
                                {session.ip}
                              </span>
                              {session.isHost && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  HOST
                                </span>
                              )}
                            </div>
                          </td>

                          {/* NAME */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-emerald-400">
                                {session.name}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingSession(session);
                                  setEditName(session.name);
                                  setEditNotes(session.notes || '');
                                }}
                                className="p-1 text-gray-500 hover:text-white rounded hover:bg-white/5 transition-colors"
                                title="Promeni ime i napomenu"
                              >
                                <Edit2 className="w-3 h-3 text-gray-400 hover:text-purple-400" />
                              </button>
                            </div>
                          </td>

                          {/* NOTES */}
                          <td className="py-3 px-3.5 text-gray-400">
                            {session.notes || (
                              <span className="text-gray-600 italic">Nema napomene</span>
                            )}
                          </td>

                          {/* LAST ACTIVE */}
                          <td className="py-3 px-3.5 text-gray-400">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span>{isActive ? 'Upravo aktivan' : `${dateStr} ${timeStr}`}</span>
                            </div>
                          </td>

                          {/* MESSAGES COUNT */}
                          <td className="py-3 px-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#181b24] border border-[#262a36] font-mono text-[10px] text-blue-400">
                              <MessageSquare className="w-2.5 h-2.5" />
                              {session.messageCount || 0}
                            </span>
                          </td>

                          {/* ACTIONS */}
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* EDIT BUTTON */}
                              <button
                                onClick={() => {
                                  setEditingSession(session);
                                  setEditName(session.name);
                                  setEditNotes(session.notes || '');
                                }}
                                className="p-1.5 bg-[#181b24] hover:bg-[#202534] border border-[#262a36] hover:border-purple-500/40 text-gray-300 hover:text-white rounded-lg transition-colors"
                                title="Izmeni naziv i napomenu računara"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* BLOCK / UNBLOCK */}
                              {!session.isHost && (
                                <button
                                  onClick={() => handleToggleBlock(session)}
                                  className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                    session.isBlocked
                                      ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                                      : 'bg-[#181b24] text-gray-400 border-[#262a36] hover:text-red-400 hover:border-red-500/40'
                                  }`}
                                  title={
                                    session.isBlocked
                                      ? 'Odblokiraj pisanje poruka'
                                      : 'Blokiraj pisanje u oglasnoj tabli'
                                  }
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* DELETE */}
                              {!session.isHost && (
                                <button
                                  onClick={() => handleDeleteSession(session.ip)}
                                  className="p-1.5 bg-[#181b24] hover:bg-red-950/40 border border-[#262a36] hover:border-red-500/40 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                  title="Ukloni sesiju"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* EDIT MODAL / DRAWER */}
            {editingSession && (
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-[#1c1f2b] border border-purple-500/40 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#262a36]">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                      <UserCheck className="w-4 h-4" /> Dodeljivanje Imena Računaru
                    </div>
                    <button
                      onClick={() => setEditingSession(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                        IP Adresa:
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={editingSession.ip}
                        className="w-full px-3 py-2 bg-[#12141c] border border-[#262a36] rounded-xl text-xs font-mono text-gray-300 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                        Ime Korisnika / Operatera (Ovo ime se prikazuje u Oglasnoj Tabli):
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="npr. Milan - Dežurna Služba"
                        className="w-full px-3 py-2 bg-[#0f1117] border border-purple-500/50 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-purple-400 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-400 font-semibold block mb-1">
                        Kancelarija / Lokacija / Napomena:
                      </label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="npr. Zgrada 1, Kancelarija 14, Sprat 2"
                        className="w-full px-3 py-2 bg-[#0f1117] border border-[#262a36] rounded-xl text-xs text-white outline-none focus:border-purple-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262a36]">
                    <button
                      onClick={() => setEditingSession(null)}
                      className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Otkaži
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sačuvaj Ime
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* TAB 2: AKTIVNOSTI (AUDIT LOG - ŠTA JE KO PROMENIO)                        */
          /* ========================================================================= */
          <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
            {/* STAT CARDS FOR ACTIVITIES */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#12141c] border border-[#262a36] rounded-xl p-3.5">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  Ukupno Zabeleženo
                </div>
                <div className="text-2xl font-black text-white mt-1">{activities.length}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">promena u sistemu</div>
              </div>

              <div className="bg-[#12141c] border border-[#262a36] rounded-xl p-3.5">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  Promena Danas
                </div>
                <div className="text-2xl font-black text-purple-400 mt-1">{todayActivitiesCount}</div>
                <div className="text-[10px] text-purple-500/80 mt-0.5">od ponoći</div>
              </div>

              <div className="bg-[#12141c] border border-[#262a36] rounded-xl p-3.5">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  Korisnika
                </div>
                <div className="text-2xl font-black text-blue-400 mt-1">{uniqueUsersCount}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">vršilo izmene</div>
              </div>

              <div className="bg-[#12141c] border border-[#262a36] rounded-xl p-3.5">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  Status Dnevnika
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">Aktivan</div>
                <div className="text-[10px] text-gray-500 mt-0.5">automatsko praćenje</div>
              </div>
            </div>

            {/* CONTROLS BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12141c] p-3 rounded-xl border border-[#262a36]">
              {/* SEARCH */}
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Pretraži dnevnik aktivnosti..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#0f1117] border border-[#262a36] rounded-lg text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              {/* CATEGORY FILTERS */}
              <div className="flex items-center gap-1 flex-wrap bg-[#0f1117] p-1 rounded-lg border border-[#262a36]">
                <button
                  onClick={() => setActivityCategory('all')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                    activityCategory === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sve ({activities.length})
                </button>
                <button
                  onClick={() => setActivityCategory('device')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                    activityCategory === 'device'
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-400 hover:text-emerald-400'
                  }`}
                >
                  Uređaji
                </button>
                <button
                  onClick={() => setActivityCategory('admin')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                    activityCategory === 'admin'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-purple-400'
                  }`}
                >
                  Imena & Pristup
                </button>
                <button
                  onClick={() => setActivityCategory('chat')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                    activityCategory === 'chat'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-blue-400'
                  }`}
                >
                  Oglasna Tabla
                </button>
                <button
                  onClick={() => setActivityCategory('network')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                    activityCategory === 'network'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-indigo-400'
                  }`}
                >
                  Mreža
                </button>
                <button
                  onClick={() => setActivityCategory('system')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                    activityCategory === 'system'
                      ? 'bg-amber-600 text-white'
                      : 'text-gray-400 hover:text-amber-400'
                  }`}
                >
                  Sistem
                </button>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchActivities}
                  disabled={isActivitiesLoading}
                  className="p-1.5 bg-[#181b24] hover:bg-[#202534] border border-[#262a36] text-gray-300 rounded-lg hover:text-white transition-colors"
                  title="Osveži dnevnik aktivnosti"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isActivitiesLoading ? 'animate-spin text-purple-400' : ''}`} />
                </button>
                <button
                  onClick={handleExportActivitiesCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181b24] hover:bg-[#202534] border border-[#262a36] text-gray-200 rounded-lg text-[11px] font-bold hover:text-purple-300 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" /> Izvezi Dnevnik CSV
                </button>
                <button
                  onClick={handleClearActivities}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#181b24] hover:bg-red-950/40 border border-[#262a36] hover:border-red-500/40 text-gray-400 hover:text-red-400 rounded-lg text-[11px] font-bold transition-colors"
                  title="Isprazni evidenciju aktivnosti"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ACTIVITIES TABLE */}
            <div className="bg-[#12141c] border border-[#262a36] rounded-xl overflow-hidden">
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#0c0d12] shadow-sm">
                    <tr className="border-b border-[#262a36] text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3.5 bg-[#0c0d12]">Vreme</th>
                      <th className="py-2.5 px-3.5 bg-[#0c0d12]">Korisnik & IP Adresa</th>
                      <th className="py-2.5 px-3.5 bg-[#0c0d12]">Kategorija & Akcija</th>
                      <th className="py-2.5 px-3.5 bg-[#0c0d12]">Opis Izmene (Šta je promenjeno)</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-[#1e2230] text-xs">
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-500">
                        Nema zabeleženih aktivnosti u ovoj kategoriji.
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((act) => {
                      const dateObj = new Date(act.timestamp);
                      const timeStr = dateObj.toLocaleTimeString('sr-RS', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });
                      const dateStr = dateObj.toLocaleDateString('sr-RS');
                      const catBadge = getCategoryBadge(act.category);
                      const CatIcon = catBadge.icon;
                      const actionBadgeColor = getActionBadgeColor(act.action);

                      // Check if activity is recent (less than 10 mins)
                      const isRecent = now - act.timestamp < 10 * 60 * 1000;

                      return (
                        <tr
                          key={act.id}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          {/* TIME */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-300">
                              <Clock className="w-3.5 h-3.5 text-gray-500" />
                              <span>{timeStr}</span>
                              <span className="text-[10px] text-gray-500">({dateStr})</span>
                              {isRecent && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                              )}
                            </div>
                          </td>

                          {/* USER & IP */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">
                                {act.user}
                              </span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#0f1117] border border-[#262a36] text-gray-400">
                                {act.ip}
                              </span>
                            </div>
                          </td>

                          {/* CATEGORY & ACTION */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${catBadge.color}`}
                              >
                                <CatIcon className="w-3 h-3" />
                                {catBadge.label}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md border font-mono text-[9px] font-bold ${actionBadgeColor}`}
                              >
                                {act.action}
                              </span>
                            </div>
                          </td>

                          {/* DESCRIPTION */}
                          <td className="py-3 px-3.5 text-gray-200">
                            <div className="leading-relaxed">
                              {act.description}
                            </div>
                            {act.details && (
                              <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                {act.details}
                              </div>
                            )}
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
        )}

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-[#262a36] bg-[#14161f] flex items-center justify-between text-[11px] text-gray-500">
          <div>
            Zaštićena administratorska zona • Sve promene se automatski trajno čuvaju u bazi data.json
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#202534] hover:bg-[#282f42] text-gray-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
};
