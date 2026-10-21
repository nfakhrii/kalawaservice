import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GitPullRequest,
  Building2,
  AlertTriangle,
  Banknote,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Bug,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah, formatNumber, formatDateTime } from '../../utils/formatters';
import {
  WoStatusBadge,
  CustomerTypeBadge,
  StockStatusBadge,
} from '../../components/ui/GitHubComponents';

export default function OverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await api.getOverview();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const m = data?.metrics || {};

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#d0d7de] rounded-md px-4 py-3">
        <div>
          <h1 className="text-base font-semibold text-[#1f2328]">
            Workshop Operations &amp; Corporate Fleet Overview
          </h1>
          <p className="text-xs text-[#656d76] mt-0.5">
            Ringkasan metrik multi-cabang real-time, status antrean Work Order, plafon kredit korporat B2B, dan peringatan stok minimum.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchOverview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#f6f8fa] hover:bg-slate-200/70 border border-[#d0d7de] text-[#1f2328] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/app/system/diagnostics"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#0969da] hover:bg-[#0860ca] text-white transition-colors"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>5 Debugging Tests</span>
          </Link>
          <Link
            to="/app/operations/work-orders/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Work Order</span>
          </Link>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#d0d7de] rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-[#656d76]">
            <span className="font-medium">Total Pendapatan Terealisasi</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-[#1f2328] tabular-nums">
            {formatRupiah(m.total_pendapatan)}
          </div>
          <div className="mt-2 pt-2 border-t border-[#d0d7de] flex items-center justify-between text-[11px] text-[#656d76]">
            <span>Tunai/QRIS: <strong className="font-mono text-[#1f2328]">{formatRupiah(m.pendapatan_tunai_lunas)}</strong></span>
            <span>B2B Plafon: <strong className="font-mono text-blue-700">{formatRupiah(m.piutang_plafon_korporat)}</strong></span>
          </div>
        </div>

        <div className="bg-white border border-[#d0d7de] rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-[#656d76]">
            <span className="font-medium">Total Work Order (Semua Status)</span>
            <GitPullRequest className="w-4 h-4 text-[#0969da]" />
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-[#1f2328] tabular-nums">
            {formatNumber(m.total_work_orders)} <span className="text-xs font-normal text-[#656d76]">Work Orders</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#d0d7de] flex items-center gap-2 text-[11px]">
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 font-mono">
              antre: {m.wo_antre || 0}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-300 font-mono">
              dikerjakan: {m.wo_dikerjakan || 0}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-300 font-mono">
              selesai: {m.wo_selesai || 0}
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#d0d7de] rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-[#656d76]">
            <span className="font-medium">Ekspansi Armada Korporat (B2B)</span>
            <Building2 className="w-4 h-4 text-[#0969da]" />
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-[#1f2328] tabular-nums">
            {formatNumber(m.kontrak_aktif)} <span className="text-xs font-normal text-[#656d76]">Kontrak Aktif</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#d0d7de] flex items-center justify-between text-[11px] text-[#656d76]">
            <span>Pelanggan: <strong className="font-mono text-[#1f2328]">{m.pelanggan_individu || 0} B2C / {m.pelanggan_korporat || 0} B2B</strong></span>
            <Link to="/app/corporate/contracts" className="text-[#0969da] hover:underline font-medium">
              Detail &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white border border-[#d0d7de] rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-[#656d76]">
            <span className="font-medium">Status Inventori Suku Cadang</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-amber-700 tabular-nums">
            {formatNumber(m.jumlah_stok_kritis)} <span className="text-xs font-normal text-[#656d76]">SKU di Bawah Minimum</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#d0d7de] flex items-center justify-between text-[11px] text-[#656d76]">
            <span>Total Unit Motor: <strong className="font-mono text-[#1f2328]">{m.total_motor || 0} unit</strong></span>
            <Link to="/app/analytics/low-stock" className="text-[#0969da] hover:underline font-medium">
              Restock &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Work Order Queue Table + Branch & Corporate Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 Cols: Recent Work Orders Table */}
        <div className="lg:col-span-8 bg-white border border-[#d0d7de] rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-[#656d76]" />
              <h2 className="text-sm font-semibold text-[#1f2328]">
                Antrean &amp; Transaksi Work Order Terbaru
              </h2>
            </div>
            <Link
              to="/app/operations/work-orders"
              className="text-xs font-medium text-[#0969da] hover:underline inline-flex items-center gap-1"
            >
              Lihat Semua Work Order <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Nomor WO</th>
                  <th className="py-2.5 px-3">Plat &amp; Kendaraan</th>
                  <th className="py-2.5 px-3">Pelanggan / Entitas</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Total Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {(data?.recentWorkOrders || []).map((wo, index) => (
                  <tr key={wo.work_no || wo.id || index} className="hover:bg-[#f6f8fa]/70 transition-colors">
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
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 border border-[#d0d7de] text-[#1f2328]">
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
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <WoStatusBadge status={wo.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap">
                      {formatRupiah(wo.total_tagihan)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 4 Cols: Corporate Credit Limit Monitor & Low Stock */}
        <div className="lg:col-span-4 space-y-5">
          {/* Corporate Credit Limit Card */}
          <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
            <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1f2328]">
                Plafon Kredit Korporat (B2B)
              </h2>
              <Link to="/app/corporate/contracts" className="text-xs text-[#0969da] hover:underline">
                Kelola
              </Link>
            </div>
            <div className="divide-y divide-[#d0d7de]">
              {(data?.corporateFleetSummary || []).map((corp, index) => (
                <div key={corp.pelanggan_id || corp.kode_pelanggan || index} className="p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1f2328]">{corp.nama_perusahaan}</span>
                    <span className="font-mono text-[11px] text-[#0969da] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      {corp.total_unit_armada} Motor
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[#656d76] mt-0.5">
                    Kontrak: {corp.nomor_kontrak || '-'}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[#656d76]">Sisa Plafon:</span>
                    <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                      {formatRupiah(corp.sisa_plafon)} / {formatRupiah(corp.plafon_kredit)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5 border border-[#d0d7de]">
                    <div
                      className="h-full bg-[#0969da]"
                      style={{
                        width: `${Math.min(100, Math.max(4, Number(corp.persentase_utilisasi_plafon || 0)))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alerts Card */}
          <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
            <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1f2328]">
                Peringatan Stok Suku Cadang Kritis
              </h2>
              <Link to="/app/analytics/low-stock" className="text-xs text-[#0969da] hover:underline">
                Laporan
              </Link>
            </div>
            <div className="divide-y divide-[#d0d7de]">
              {(data?.lowStockAlerts || []).map((item, index) => (
                <div
                  key={`${item.cabang_kode || 'CB'}-${item.suku_cadang_kode || item.suku_cadang_id || item.kode_sku || index}`}
                  className="p-3 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-semibold text-[#0969da]">
                      {item.kode_sku}
                    </div>
                    <div className="font-medium text-[#1f2328] truncate">{item.nama_part}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-red-700 tabular-nums">
                      Sisa: {item.stok_saat_ini} {item.satuan}
                    </div>
                    <div className="mt-0.5">
                      <StockStatusBadge
                        stokSaatIni={item.stok_saat_ini}
                        stokMinimum={item.stok_minimum}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

