import React, { useEffect, useState } from 'react';
import { Calendar, Filter } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah, formatDateTime, formatNumber } from '../../utils/formatters';
import {
  CustomerTypeBadge,
  EmptyState,
  AlertBanner,
} from '../../components/ui/GitHubComponents';

export default function BranchRevenueReportPage() {
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState('2026-03-31');
  const [cabangId, setCabangId] = useState('');

  const [rows, setRows] = useState([]);
  const [totalPendapatan, setTotalPendapatan] = useState(0);
  const [summary, setSummary] = useState({});
  const [branchBreakdown, setBranchBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const loadRevenue = async (s = startDate, e = endDate, c = cabangId) => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await api.getBranchRevenueReport({
        startDate: s,
        endDate: e,
        cabangId: c,
      });
      setRows(res.data || []);
      setTotalPendapatan(Number(res.total_pendapatan || 0));
      setSummary(res.summary || {});
      setBranchBreakdown(res.branchBreakdown || []);
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Validasi Parameter Tanggal (${err.status || 400})`,
        code: err.code,
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevenue();
  }, []);

  const applyPreset = (s, e) => {
    setStartDate(s);
    setEndDate(e);
    loadRevenue(s, e, cabangId);
  };

  return (
    <div className="space-y-4">
      {alert && (
        <AlertBanner
          type={alert.type}
          title={alert.title}
          code={alert.code}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Filter & Date Range Bar */}
      <div className="bg-white border border-[#d0d7de] rounded-md p-3.5 flex flex-wrap items-end justify-between gap-3 text-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadRevenue(startDate, endDate, cabangId);
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">Tanggal Awal (startDate)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 font-mono bg-[#f6f8fa] border border-[#d0d7de] rounded-md"
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">Tanggal Akhir (endDate)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 font-mono bg-[#f6f8fa] border border-[#d0d7de] rounded-md"
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">Filter Cabang</label>
            <select
              value={cabangId}
              onChange={(e) => setCabangId(e.target.value)}
              className="px-2.5 py-1.5 bg-[#f6f8fa] border border-[#d0d7de] rounded-md"
            >
              <option value="">Semua Cabang</option>
              {branchBreakdown.map((b, index) => (
                <option key={b.cabang_id || b.kode_cabang || index} value={b.cabang_id || b.kode_cabang}>
                  {b.kode_cabang} — {b.nama_cabang}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold bg-[#0969da] hover:bg-[#0860ca] text-white cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Query Laporan JOIN</span>
          </button>
        </form>

        {/* Quick Preset Buttons including Scenario #5 Empty Date Range */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset('2026-03-01', '2026-03-31')}
            className="px-2.5 py-1.5 rounded-md border border-[#d0d7de] bg-[#f6f8fa] hover:bg-slate-200/70 font-mono text-[11px] cursor-pointer"
          >
            Maret 2026 (Data Kelompok 1)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('2025-01-01', '2025-01-31')}
            className="px-2.5 py-1.5 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-mono text-[11px] font-semibold cursor-pointer"
          >
            Uji Skenario #5: Rentang Kosong (Jan 2025)
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (Demonstrating COALESCE(SUM(...), 0)) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">
            Total Pendapatan (<code className="font-mono">COALESCE(SUM, 0)</code>)
          </div>
          <div className="font-mono text-lg font-bold text-emerald-700 mt-1 tabular-nums">
            {formatRupiah(totalPendapatan)}
          </div>
        </div>
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">Jumlah Transaksi Lunas</div>
          <div className="font-mono text-lg font-bold text-[#1f2328] mt-1 tabular-nums">
            {formatNumber(summary.total_transaksi || 0)} Kwitansi
          </div>
        </div>
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">Segmen Individu (B2C)</div>
          <div className="font-mono text-base font-semibold text-[#1f2328] mt-1 tabular-nums">
            {formatRupiah(summary.pendapatan_b2c || 0)}
          </div>
        </div>
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">Segmen Korporat (B2B)</div>
          <div className="font-mono text-base font-semibold text-[#0969da] mt-1 tabular-nums">
            {formatRupiah(summary.pendapatan_b2b || 0)}
          </div>
        </div>
      </div>

      {/* Per-Branch Aggregation Table (LEFT JOIN with COALESCE) */}
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="px-4 py-2.5 bg-[#f6f8fa] border-b border-[#d0d7de] text-xs font-semibold text-[#1f2328]">
          Rekapitulasi Pendapatan per Cabang ({startDate} s/d {endDate})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase">
                <th className="py-2 px-3">Kode Cabang</th>
                <th className="py-2 px-3">Nama Cabang &amp; Kota</th>
                <th className="py-2 px-3 text-right">Transaksi</th>
                <th className="py-2 px-3 text-right">Pendapatan Jasa</th>
                <th className="py-2 px-3 text-right">Pendapatan Part</th>
                <th className="py-2 px-3 text-right">Diskon</th>
                <th className="py-2 px-3 text-right">Total Pendapatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d7de] text-xs">
              {branchBreakdown.map((b, index) => (
                <tr key={b.cabang_id || b.kode_cabang || index}>
                  <td className="py-2 px-3 font-mono font-semibold text-[#0969da]">
                    {b.kode_cabang}
                  </td>
                  <td className="py-2 px-3 font-medium text-[#1f2328]">
                    {b.nama_cabang} ({b.kota})
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {b.jumlah_transaksi} WO
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {formatRupiah(b.pendapatan_jasa)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {formatRupiah(b.pendapatan_part)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-700 tabular-nums">
                    - {formatRupiah(b.total_diskon)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                    {formatRupiah(b.total_pendapatan)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Transaction Rows or Clean Empty State (Scenario #5) */}
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="px-4 py-2.5 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center justify-between text-xs">
          <span className="font-semibold text-[#1f2328]">
            Rincian Transaksi Pembayaran ({rows.length} Baris)
          </span>
          <span className="font-mono text-[#656d76]">
            total_pendapatan: {totalPendapatan} | data.length: {rows.length}
          </span>
        </div>

        {rows.length === 0 && !loading ? (
          <EmptyState
            icon={Calendar}
            title={`Tidak Ada Transaksi pada Rentang ${startDate} s/d ${endDate} (200 OK)`}
            description={`Query JOIN PostgreSQL dengan COALESCE(SUM(jumlah_bayar), 0) berhasil dieksekusi secara bersih dan mengembalikan data: [] serta total_pendapatan: Rp 0 tanpa error NULL.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase">
                  <th className="py-2.5 px-3">No. Kwitansi &amp; Tanggal</th>
                  <th className="py-2.5 px-3">Cabang</th>
                  <th className="py-2.5 px-3">Nomor WO &amp; Plat</th>
                  <th className="py-2.5 px-3">Entitas Penagihan</th>
                  <th className="py-2.5 px-3">Metode</th>
                  <th className="py-2.5 px-3 text-right">Nominal Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {rows.map((r, index) => (
                  <tr key={r.pembayaran_id || r.work_no || index} className="hover:bg-[#f6f8fa]/70">
                    <td className="py-2.5 px-3 font-mono">
                      <div className="font-semibold text-[#1f2328]">{r.nomor_kwitansi}</div>
                      <div className="text-[10px] text-[#656d76]">
                        {formatDateTime(r.tanggal_bayar)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-semibold text-[#0969da]">{r.kode_cabang}</div>
                      <div className="text-[11px] text-[#656d76]">{r.kota_cabang}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <div className="font-semibold">{r.nomor_wo}</div>
                      <div className="text-[11px] text-[#656d76]">{r.plat_nomor}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-[#1f2328]">{r.entitas_penagihan}</div>
                      <div className="mt-0.5">
                        <CustomerTypeBadge tipe={r.tipe_pelanggan} />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs">{r.metode_pembayaran}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                      {formatRupiah(r.jumlah_bayar)}
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

