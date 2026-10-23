import React, { useState } from 'react';
import { Zap, Lock, User, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('Admin');
  const [password, setPassword] = useState('123');
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (cleanUser.toLowerCase() === 'admin' && password === '123') {
      setError(false);
      sessionStorage.setItem('netscan_admin_token', 'admin-master-key-123');
      onLoginSuccess('Admin');
    } else if (cleanUser && password === '123') {
      setError(false);
      sessionStorage.removeItem('netscan_admin_token');
      onLoginSuccess(cleanUser);
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c10] p-4">
      <div className="w-full max-w-sm bg-[#181b24] border border-[#262a36] rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* TOP GLOW ACCENT */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-blue-500 to-indigo-600" />

        {/* LOGO */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mb-3">
            <Zap className="w-7 h-7 fill-white" />
          </div>
          <h2 className="text-2xl font-black tracking-widest text-white">NET-SCAN</h2>
          <span className="text-[11px] font-semibold text-gray-400 tracking-wider">
            INTRANET MONITOR
          </span>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <div className="relative">
              <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Korisničko ime (Admin ili vaše ime)"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0f1117] border border-[#262a36] rounded-xl text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Lozinka (123)"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0f1117] border border-[#262a36] rounded-xl text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                autoComplete="off"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold justify-center py-1 bg-red-950/30 rounded-lg border border-red-900/50">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Pogrešna lozinka! Unesite 123.</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-[0.98]"
          >
            Prijavi se
          </button>
        </form>

        <div className="text-center text-[10px] text-gray-500 mt-6 pt-4 border-t border-[#262a36] space-y-1">
          <div>
            Za Administratora: <span className="text-emerald-400 font-mono font-bold">Admin / 123</span>
          </div>
          <div>
            Korisnici u mreži: <span className="text-gray-300 font-mono">VašeIme / 123</span>
          </div>
          <div className="pt-2 text-gray-600">
            Created by <strong className="text-emerald-400">N1ko7a</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
