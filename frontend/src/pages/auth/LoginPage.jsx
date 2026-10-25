import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Shield, ArrowRight, Lock, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_METADATA } from '../../utils/formatters';
import { AlertBanner } from '../../components/ui/GitHubComponents';

export default function LoginPage() {
  const { login, quickSwitchRole, user, loading } = useAuth();
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

  const handleQuickRoleSelect = async (item) => {
    setError(null);
    setUsername(item.username);
    setPassword(item.defaultPassword);
    try {
      if (user) {
        await quickSwitchRole(item.role);
      } else {
        await login(item.username, item.defaultPassword);
      }
      navigate('/app/overview');
    } catch (err) {
      setError(err.message);
    }
  };

  const demoRoles = [
    {
      role: 'owner',
      username: 'user_owner',
      dbRole: 'role_owner',
      person: 'Hendra Setiawan (Owner)',
      branch: 'CB001 · Kalawa Service Pahandut',
      defaultPassword: 'OwnerKalawa123',
      ...ROLE_METADATA.owner,
    },
    {
      role: 'admin_cabang',
      username: 'user_admin_cabang',
      dbRole: 'role_admin_cabang',
      person: 'Rinaldi Rizwar (PG001)',
      branch: 'CB001 · Kalawa Service Pahandut',
      defaultPassword: 'AdminKalawa123',
      ...ROLE_METADATA.admin_cabang,
    },
    {
      role: 'kasir',
      username: 'user_kasir',
      dbRole: 'role_kasir',
      person: 'Budi Santoso (PG002)',
      branch: 'CB001 · Kalawa Service Pahandut',
      defaultPassword: 'KasirKalawa123',
      ...ROLE_METADATA.kasir,
    },
    {
      role: 'mekanik',
      username: 'user_mekanik',
      dbRole: 'role_mekanik',
      person: 'Candra Hasibuan (PG003)',
      branch: 'CB001 · Kalawa Service Pahandut',
      defaultPassword: 'MekanikKalawa123',
      ...ROLE_METADATA.mekanik,
    },
    {
      role: 'gudang',
      username: 'user_gudang',
      dbRole: 'role_petugas_gudang',
      person: 'Gilang Ramadhan (PG007)',
      branch: 'CB002 · Kalawa Service Jekan Raya',
      defaultPassword: 'GudangKalawa123',
      ...ROLE_METADATA.gudang,
    },
    {
      role: 'auditor',
      username: 'user_auditor',
      dbRole: 'role_auditor',
      person: 'Hendra Setiawan (Auditor - PG008)',
      branch: 'CB003 · Kalawa Service Bukit Batu',
      defaultPassword: 'AuditorKalawa123',
      ...ROLE_METADATA.auditor,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col justify-center py-10 px-4">
      <div className="max-w-5xl w-full mx-auto">
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

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Left Column: Standard Credentials Sign-In Box */}
          <div className="md:col-span-5 bg-white border border-[#d0d7de] rounded-md p-5">
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

          {/* Right Column: Quick-Switch Role Demo Cards (6 Roles from Kelompok1_admin_security.sql) */}
          <div className="md:col-span-7 bg-white border border-[#d0d7de] rounded-md overflow-hidden">
            <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0969da]" />
                <h2 className="text-sm font-semibold text-[#1f2328]">
                  Quick-Switch Role (6 Akun Kelompok1_admin_security.sql)
                </h2>
              </div>
              <span className="font-mono text-[11px] text-[#656d76]">6 Active Roles</span>
            </div>

            <div className="divide-y divide-[#d0d7de]">
              {demoRoles.map((item) => {
                const isCurrent = user?.role === item.role;
                return (
                  <div
                    key={item.role}
                    className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      isCurrent ? 'bg-blue-50/40' : 'hover:bg-[#f6f8fa]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs font-semibold text-[#1f2328]">
                          {item.person}
                        </span>
                        <span
                          className={`font-mono text-[11px] px-2 py-0.5 rounded-full border ${item.badgeClass}`}
                        >
                          {item.username}
                        </span>
                        <span className="font-mono text-[11px] text-[#656d76]">
                          ({item.dbRole})
                        </span>
                      </div>
                      <p className="text-xs text-[#656d76] mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickRoleSelect(item)}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#0969da] text-white border-[#0969da]'
                          : 'bg-[#f6f8fa] hover:bg-[#0969da] text-[#1f2328] hover:text-white border-[#d0d7de] hover:border-[#0969da]'
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aktif ({item.username})</span>
                        </>
                      ) : (
                        <>
                          <span>Switch Role</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
