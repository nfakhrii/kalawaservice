import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  NavLink,
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  Wrench,
  LayoutDashboard,
  Database,
  GitPullRequest,
  Building2,
  BarChart3,
  Bug,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { ROLE_METADATA } from '../../utils/formatters';

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentRole = String(user?.role || '').toLowerCase().trim();

  const hiddenAnalyticsRoles = ['kasir', 'mekanik'];

  const canAccessAnalytics = !hiddenAnalyticsRoles.includes(currentRole);

  // PostgreSQL Audit hanya dapat diakses Owner dan Auditor.
  const allowedAuditRoles = ['owner', 'auditor'];

  const canAccessAudit = allowedAuditRoles.includes(currentRole);

  const pathSegments = location.pathname
    .split('/')
    .filter((seg) => seg && seg !== 'app');

  const buildBreadcrumbLink = (index) => {
    const slice = pathSegments.slice(0, index + 1);
    return `/app/${slice.join('/')}`;
  };

  const formatSegmentLabel = (seg, idx) => {
    if (idx === pathSegments.length - 1 && /^WO/i.test(seg)) {
      return `#${seg.toUpperCase()}`;
    }
    if (idx === pathSegments.length - 1 && /^\d+$/.test(seg) && pathSegments[idx - 1] === 'work-orders') {
      return `#WO${String(seg).padStart(3, '0')}`;
    }
    return seg;
  };

  const mainNavTabs = [
    { to: '/app/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/app/registry', label: 'Registry (Master CRUD)', icon: Database },
    { to: '/app/operations', label: 'Operations (WO & Kasir)', icon: GitPullRequest },
    { to: '/app/corporate', label: 'Corporate B2B Fleet', icon: Building2, badge: 'NEW' },
  
    // Analytics disembunyikan untuk Kasir dan Mekanik.
    ...(canAccessAnalytics
      ? [
          {
            to: '/app/analytics',
            label: 'Analytics (4 JOIN)',
            icon: BarChart3,
          },
        ]
      : []),
  
    // PostgreSQL Audit hanya ditampilkan untuk Owner dan Auditor.
    ...(canAccessAudit
      ? [
          {
            to: '/app/system/diagnostics',
            label: 'PostgreSQL Audit',
            icon: Bug,
          },
        ]
      : []),
  ];

  const currentRoleMeta = ROLE_METADATA[user?.role] || ROLE_METADATA.admin_cabang;

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8fa] text-[#1f2328]">
      {/* Top Context Header (GitHub Primer Header) */}
      <header className="bg-[#f6f8fa] border-b border-[#d0d7de]">
        <div className="max-w-[1440px] mx-auto px-4 pt-3 pb-2 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand & Interactive Real-Time Subpath Breadcrumb */}
          <div className="flex items-center flex-wrap gap-1.5 text-sm">
            <Link
              to="/app/overview"
              className="inline-flex items-center gap-2 font-semibold text-[#1f2328] hover:text-[#0969da] transition-colors"
            >
              <span className="w-7 h-7 rounded-md bg-[#1f2328] text-white flex items-center justify-center shadow-xs">
                <Wrench className="w-4 h-4" />
              </span>
              <span className="font-mono text-xs sm:text-sm font-semibold tracking-tight">
                kalawa-service
              </span>
            </Link>

            <span className="px-1.5 py-0.5 text-[11px] font-mono rounded-full border border-[#d0d7de] bg-white text-[#656d76]">
              {user?.kode_cabang || 'CB001'}
            </span>

            {pathSegments.map((seg, idx) => {
              const isLast = idx === pathSegments.length - 1;
              const label = formatSegmentLabel(seg, idx);
              return (
                <React.Fragment key={`${seg}-${idx}`}>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8c959f]" />
                  {isLast ? (
                    <span className="font-mono text-xs font-semibold text-[#1f2328] bg-white px-2 py-0.5 rounded border border-[#d0d7de]">
                      {label}
                    </span>
                  ) : (
                    <Link
                      to={buildBreadcrumbLink(idx)}
                      className="font-mono text-xs text-[#0969da] hover:underline px-1 py-0.5"
                    >
                      {label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Right: User Profile */}
          <div className="flex items-center flex-wrap gap-2">
            {/* User Badge & Switch/Logout Link */}
            <div className="flex items-center gap-2 bg-white border border-[#d0d7de] rounded-md px-2.5 py-1">
              <div className="text-right">
                <div className="text-xs font-semibold text-[#1f2328] leading-tight">
                  {user?.nama_lengkap || 'Rinaldi Rizwar'}
                </div>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0 rounded border ${currentRoleMeta.badgeClass}`}
                  >
                    {user?.username || currentRoleMeta.shortLabel || user?.role}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/auth/login');
                }}
                className="p-1.5 rounded-md text-[#656d76] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Ke Halaman Login / Ganti Sesi"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* GitHub Repository-Style Primary Underline Navigation */}
        <div className="max-w-[1440px] mx-auto px-4 mt-1">
          <nav className="flex items-center gap-1 overflow-x-auto -mb-px" aria-label="Global Navigation">
            {mainNavTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-b-2 border-[#fd8c73] font-semibold text-[#1f2328]'
                        : 'border-b-2 border-transparent text-[#656d76] hover:text-[#1f2328] hover:border-[#d0d7de]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-[#656d76]" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="bg-slate-200/80 text-slate-700 rounded-full px-2 py-0.5 text-[11px] font-mono">
                      {tab.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 py-5">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#d0d7de] bg-white py-3 px-4 mt-auto">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-[#656d76]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1f2328]">Kalawa Service ERP (Kelompok 1)</span>
            <span>&middot;</span>
            <span>PostgreSQL 18 Case-Sensitive Schema + Stored Procedures + Corporate B2B Billing</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
