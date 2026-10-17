import React from 'react';
import { Outlet } from 'react-router-dom';
import { GitPullRequest, PlusCircle, CreditCard } from 'lucide-react';
import { GitHubUnderlineTabs } from '../../components/ui/GitHubComponents';

export default function OperationsLayout() {
  const tabs = [
    { to: '/app/operations/work-orders', label: 'Work Orders Queue', icon: GitPullRequest, end: true },
    { to: '/app/operations/work-orders/new', label: 'New Work Order', icon: PlusCircle },
    { to: '/app/operations/payments', label: 'Cashier Payments & Receipts', icon: CreditCard },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de]">
          <h1 className="text-base font-semibold text-[#1f2328]">
            Workshop Core Operations (Work Orders &amp; Cashier Settlement)
          </h1>
          <p className="text-xs text-[#656d76] mt-0.5">
            Manajemen siklus hidup Work Order (Antre &rarr; Dikerjakan &rarr; Selesai &rarr; Dibayar / Dibatalkan), alokasi suku cadang otomatis, dan pembayaran kasir (B2C &amp; Plafon B2B).
          </p>
        </div>
        <GitHubUnderlineTabs tabs={tabs} />
      </div>

      <Outlet />
    </div>
  );
}

