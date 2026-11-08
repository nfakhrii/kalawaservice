import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, ArrowRight, Lock, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AlertBanner } from '../../components/ui/GitHubComponents';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleManualLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      navigate('/app/overview');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col justify-center py-10 px-4">
      <div className="max-w-md w-full mx-auto">
        {/* Header Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-md bg-[#1f2328] text-white flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Wrench className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#1f2328]">
            Sign in to Kalawa Service ERP
          </h1>
          <p className="text-xs text-[#656d76] mt-1 font-mono">
            Skema Asli Kelompok 1 &middot; 6 Role PostgreSQL RBAC (Kelompok1_admin_security.sql)
          </p>
        </div>

        {error && (
          <div className="mb-4">
            <AlertBanner type="error" title="Autentikasi Gagal" message={error} onClose={() => setError(null)} />
          </div>
        )}

        <div className="w-full">
          {/* Left Column: Standard Credentials Sign-In Box */}
          <div className="w-full bg-white border border-[#d0d7de] rounded-md p-5">
            <h2 className="text-sm font-semibold text-[#1f2328] pb-3 border-b border-[#d0d7de]">
              Kredensial Akun Database Kelompok 1
            </h2>
            <form onSubmit={handleManualLogin} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f2328] mb-1">
                  Username PostgreSQL / Role
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-[#656d76] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[#f6f8fa] focus:bg-white border border-[#d0d7de] rounded-md focus:outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
                    placeholder="user_admin_cabang"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1f2328] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#656d76] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[#f6f8fa] focus:bg-white border border-[#d0d7de] rounded-md focus:outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
                    placeholder="AdminKalawa123"
                    required
                  />
                </div>
                <p className="text-[11px] text-[#656d76] mt-1">
                  Diverifikasi langsung ke engine PostgreSQL (<code className="font-mono">pg_authid</code>) sesuai password asli <code className="font-mono bg-slate-100 px-1 rounded">*Kalawa123</code> di <code className="font-mono">Kelompok1_admin_security.sql</code>.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Memverifikasi Akun PostgreSQL...' : 'Sign in to Workspace'}
              </button>
            </form>

            {user && (
              <div className="mt-4 pt-3 border-t border-[#d0d7de] flex items-center justify-between text-xs">
                <span className="text-[#656d76]">
                  Sesi aktif: <strong className="font-mono text-[#1f2328]">{user.username || user.role}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/app/overview')}
                  className="text-[#0969da] hover:underline font-medium inline-flex items-center gap-1"
                >
                  Lanjut ke Dashboard <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
