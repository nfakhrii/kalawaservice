
import React from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  History,
  Banknote,
  PackageSearch,
  AlertTriangle,
  LockKeyhole,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { GitHubUnderlineTabs } from '../../components/ui/GitHubComponents';

export default function AnalyticsLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const role = String(user?.role || '').toLowerCase().trim();

  // Role yang memiliki akses penuh ke seluruh Analytics.
  const fullAccessRoles = [
    'owner',
    'admin_cabang',
    'auditor',
  ];

  const hasFullAccess = fullAccessRoles.includes(role);
  const isWarehouse = role === 'gudang';

  // Definisi seluruh tab Analytics.
  const allTabs = [
    {
      to: '/app/analytics/vehicle-history',
      label: 'Vehicle Service History (JOIN)',
      icon: History,
    },
    {
      to: '/app/analytics/branch-revenue',
      label: 'Branch Revenue & Date Range (JOIN)',
      icon: Banknote,
    },
    {
      to: '/app/analytics/sparepart-usage',
      label: 'Sparepart Usage per WO (JOIN)',
      icon: PackageSearch,
    },
    {
      to: '/app/analytics/low-stock',
      label: 'Low Stock Alert Report (JOIN)',
      icon: AlertTriangle,
    },
  ];

  // Petugas Gudang hanya mendapatkan dua tab.
  const tabs = isWarehouse
    ? allTabs.filter((tab) =>
        [
          '/app/analytics/sparepart-usage',
          '/app/analytics/low-stock',
        ].includes(tab.to)
      )
    : allTabs;

  // Memeriksa apakah pengguna mencoba membuka laporan
  // yang tidak diperbolehkan.
  const warehouseRestrictedPaths = [
    '/app/analytics/vehicle-history',
    '/app/analytics/branch-revenue',
  ];

  const isWarehouseRestricted =
    isWarehouse &&
    warehouseRestrictedPaths.includes(location.pathname);

  // Role selain Owner, Admin Cabang, Auditor, dan Gudang
  // tidak diperbolehkan mengakses Analytics.
  const isRoleRestricted = !hasFullAccess && !isWarehouse;

  const isAccessDenied =
    isRoleRestricted || isWarehouseRestricted;

  // Popup akses ditolak.
  if (isAccessDenied) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="analytics-access-title"
          aria-describedby="analytics-access-description"
          className="w-full max-w-md bg-white rounded-xl shadow-xl border border-[#d0d7de] p-6"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <LockKeyhole className="w-7 h-7 text-red-600" />
            </div>

            <h2
              id="analytics-access-title"
              className="text-lg font-semibold text-[#1f2328]"
            >
              Akses Tidak Diizinkan
            </h2>

            <p
              id="analytics-access-description"
              className="text-sm text-[#656d76] mt-2 leading-relaxed"
            >
              Maaf, akun Anda tidak memiliki hak akses
              untuk membuka halaman Analytics ini.
              Silakan hubungi administrator jika Anda
              membutuhkan akses tersebut.
            </p>

            <button
              type="button"
              onClick={() => navigate('/app/overview', { replace: true })}
              className="w-full mt-6 px-4 py-2.5 rounded-md bg-[#0969da] hover:bg-[#0860ca] text-white text-sm font-semibold transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de]">
          <h1 className="text-base font-semibold text-[#1f2328]">
            PostgreSQL Multi-Table JOIN Reports &amp; Views
          </h1>

          <p className="text-xs text-[#656d76] mt-0.5">
            Keempat laporan analitik ini dieksekusi langsung
            melalui PostgreSQL Database Views (
            <code className="font-mono">vw_laporan_*</code>
            ) dengan agregasi{' '}
            <code className="font-mono">
              COALESCE(SUM(...), 0)
            </code>.
          </p>
        </div>

        <GitHubUnderlineTabs tabs={tabs} />
      </div>

      <Outlet />
    </div>
  );
}
