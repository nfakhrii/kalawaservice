import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ArrowUpRight, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import {
  WoStatusBadge,
  CustomerTypeBadge,
  AlertBanner,
  EmptyState,
} from '../../components/ui/GitHubComponents';

export default function WorkOrdersListPage() {
  const [workOrders, setWorkOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const loadWorkOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getWorkOrders();
      setWorkOrders(res.data || []);
      setCounts(res.counts || {});
    } catch (err) {
      setAlert({ type: 'error', title: 'Gagal memuat Work Order', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const filtered = workOrders.filter((wo) => {
    if (statusFilter !== 'ALL' && wo.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        wo.nomor_wo?.toLowerCase().includes(q) ||
        wo.plat_nomor?.toLowerCase().includes(q) ||
        wo.nama_pelanggan?.toLowerCase().includes(q) ||
        wo.nama_perusahaan?.toLowerCase().includes(q) ||
        wo.keluhan?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusTabs = [
    { id: 'ALL', label: 'All Work Orders', count: counts.all || workOrders.length },
    { id: 'antre', label: 'antre', count: counts.antre || 0 },
    { id: 'dikerjakan', label: 'dikerjakan', count: counts.dikerjakan || 0 },
    { id: 'selesai', label: 'selesai', count: counts.selesai || 0 },
    { id: 'dibayar', label: 'dibayar', count: counts.dibayar || 0 },
    { id: 'dibatalkan', label: 'dibatalkan', count: counts.dibatalkan || 0 },
  ];

  return (
    <div className="space-y-4">
      {alert && (
        <AlertBanner
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        {/* Top Filter Bar */}
        <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-1 bg-white border border-[#d0d7de] rounded-md p-0.5">
            {statusTabs.map((t) => {
              const active = statusFilter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStatusFilter(t.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0969da] text-white font-semibold'
                      : 'text-[#656d76] hover:text-[#1f2328]'
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0 text-[11px] font-mono ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-60">
              <Search className="w-3.5 h-3.5 text-[#656d76] absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari #WO-2026, plat KH, keluhan..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#d0d7de] rounded-md focus:outline-none focus:border-[#0969da]"
              />
            </div>
            <button
              type="button"
              onClick={loadWorkOrders}
              className="p-1.5 rounded-md border border-[#d0d7de] bg-white hover:bg-[#f6f8fa] text-[#656d76] cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/app/operations/work-orders/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Work Order</span>
            </Link>
          </div>
        </div>

        {/* High-Density Work Orders Table */}
        {filtered.length === 0 && !loading ? (
          <EmptyState
            title="Tidak ada Work Order pada filter ini"
            description="Buat Work Order baru atau pilih tab status yang lain."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Work Order ID</th>
                  <th className="py-2.5 px-3">Motor &amp; Plat</th>
                  <th className="py-2.5 px-3">Pelanggan &amp; Skema</th>
                  <th className="py-2.5 px-3">Keluhan &amp; Mekanik</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Biaya Jasa</th>
                  <th className="py-2.5 px-3 text-right">Biaya Part</th>
                  <th className="py-2.5 px-3 text-right">Total Tagihan</th>
                  <th className="py-2.5 px-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {filtered.map((wo) => (
                  <tr key={wo.id} className="hover:bg-[#f6f8fa]/70 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Link
                        to={`/app/operations/work-orders/${wo.nomor_wo}`}
                        className="font-mono text-xs font-semibold text-[#0969da] hover:underline"
                      >
                        {wo.nomor_wo}
                      </Link>
                      <div className="font-mono text-[10px] text-[#656d76]">
                        {wo.kode_cabang} &middot; {formatDateTime(wo.waktu_masuk)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 border border-[#d0d7de]">
                        {wo.plat_nomor}
                      </span>
                      <div className="text-[11px] text-[#656d76] mt-0.5">
                        {wo.merk} {wo.tipe_motor}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-[#1f2328]">
                        {wo.nama_perusahaan || wo.nama_pelanggan}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <CustomerTypeBadge tipe={wo.tipe_pelanggan} />
                        {wo.nomor_kontrak && (
                          <span className="font-mono text-[10px] text-blue-700">
                            {wo.nomor_kontrak}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="text-[#1f2328] truncate" title={wo.keluhan}>
                        {wo.keluhan}
                      </div>
                      <div className="text-[11px] text-[#656d76] mt-0.5">
                        Mekanik: <strong className="text-[#1f2328]">{wo.nama_mekanik || 'Belum ditugaskan'}</strong>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <WoStatusBadge status={wo.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-[#656d76] tabular-nums whitespace-nowrap">
                      {formatRupiah(wo.total_biaya_jasa)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-[#656d76] tabular-nums whitespace-nowrap">
                      {formatRupiah(wo.total_biaya_part)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-[#1f2328] tabular-nums whitespace-nowrap">
                      {formatRupiah(wo.total_tagihan)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <Link
                        to={`/app/operations/work-orders/${wo.nomor_wo}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#d0d7de] bg-white hover:bg-[#f6f8fa] text-xs font-medium text-[#0969da]"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

