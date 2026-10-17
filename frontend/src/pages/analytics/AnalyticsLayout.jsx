import React from 'react';
import { Outlet } from 'react-router-dom';
import { History, Banknote, PackageSearch, AlertTriangle } from 'lucide-react';
import { GitHubUnderlineTabs } from '../../components/ui/GitHubComponents';

export default function AnalyticsLayout() {
  const tabs = [
    {
      to: '/app/analytics/vehicle-history',
      label: '1. Vehicle Service History (JOIN)',
      icon: History,
    },
    {
      to: '/app/analytics/branch-revenue',
      label: '2. Branch Revenue & Date Range (JOIN)',
      icon: Banknote,
    },
    {
      to: '/app/analytics/sparepart-usage',
      label: '3. Sparepart Usage per WO (JOIN)',
      icon: PackageSearch,
    },
    {
      to: '/app/analytics/low-stock',
      label: '4. Low Stock Alert Report (JOIN)',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de]">
          <h1 className="text-base font-semibold text-[#1f2328]">
            PostgreSQL Multi-Table JOIN Reports &amp; Views
          </h1>
          <p className="text-xs text-[#656d76] mt-0.5">
            Keempat laporan analitik ini dieksekusi langsung melalui PostgreSQL Database Views (<code className="font-mono">vw_laporan_*</code>) dengan agregasi <code className="font-mono">COALESCE(SUM(...), 0)</code>.
          </p>
        </div>
        <GitHubUnderlineTabs tabs={tabs} />
      </div>

      <Outlet />
    </div>
  );
}

