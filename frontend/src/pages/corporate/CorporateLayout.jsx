import React from 'react';
import { Outlet } from 'react-router-dom';
import { Building2, FileSpreadsheet } from 'lucide-react';
import { GitHubUnderlineTabs } from '../../components/ui/GitHubComponents';

export default function CorporateLayout() {
  const tabs = [
    {
      to: '/app/corporate/contracts',
      label: 'Fleet Contracts & Credit Limit Monitor',
      icon: Building2,
    },
    {
      to: '/app/corporate/collective-billing',
      label: 'Monthly Collective Billing (Invoicing)',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-[#1f2328]">
                Corporate B2B Fleet Management &amp; Collective Billing
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-300">
                Perubahan Requirement (02_migration_corporate.sql)
              </span>
            </div>
            <p className="text-xs text-[#656d76] mt-0.5">
              Ekspansi layanan pelanggan korporat (Perusahaan Kurir &amp; Rental Motor): kontrak servis bulanan, registrasi multi-armada motor, kontrol plafon kredit, dan pelunasan tagihan kolektif akhir bulan.
            </p>
          </div>
        </div>
        <GitHubUnderlineTabs tabs={tabs} />
      </div>

      <Outlet />
    </div>
  );
}

