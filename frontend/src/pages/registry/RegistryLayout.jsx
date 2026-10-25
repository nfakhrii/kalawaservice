
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Users, Bike, Wrench, Package, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GitHubUnderlineTabs } from '../../components/ui/GitHubComponents';

export default function RegistryLayout() {
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();

  const allTabs = [
    {
      to: '/app/registry/customers',
      label: 'Customers (B2C & B2B)',
      icon: Users,
    },
    {
      to: '/app/registry/vehicles',
      label: 'Vehicles (Motor)',
      icon: Bike,
    },
    {
      to: '/app/registry/services',
      label: 'Services Catalog',
      icon: Wrench,
    },
    {
      to: '/app/registry/spareparts',
      label: 'Spareparts (SKU)',
      icon: Package,
    },
    {
      to: '/app/registry/suppliers',
      label: 'Suppliers',
      icon: Truck,
    },
  ];

  const allowedTabsByRole = {
    owner: [
      'customers',
      'vehicles',
      'services',
      'spareparts',
      'suppliers',
    ],
    admin_cabang: [
      'customers',
      'vehicles',
      'services',
      'spareparts',
      'suppliers',
    ],
    kasir: [
      'customers',
      'vehicles',
      'services',
      'spareparts',
    ],
    mekanik: [
      'customers',
      'vehicles',
      'services',
      'spareparts',
    ],
    gudang: [
      'spareparts',
      'suppliers',
    ],
    auditor: [
      'customers',
      'vehicles',
      'services',
      'spareparts',
      'suppliers',
    ],
  };
  
  const tabs = allTabs.filter((tab) => {
    const key = tab.to.split('/').pop();
    return (allowedTabsByRole[role] || []).includes(key);
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de]">
          <h1 className="text-base font-semibold text-[#1f2328]">
            Master Data Registry (CRUD)
          </h1>

          <p className="text-xs text-[#656d76] mt-0.5">
            Pengelolaan data master Pelanggan Individu &amp; Korporat,
            Armada Motor, Katalog Jasa Servis, Suku Cadang (SKU),
            dan Supplier.
          </p>
        </div>

        <GitHubUnderlineTabs tabs={tabs} />
      </div>

      <Outlet />
    </div>
  );
}
