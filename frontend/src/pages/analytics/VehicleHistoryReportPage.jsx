import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah, formatDateTime, formatNumber } from '../../utils/formatters';
import {
  WoStatusBadge,
  CustomerTypeBadge,
  EmptyState,
} from '../../components/ui/GitHubComponents';

export default function VehicleHistoryReportPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState('');
  const [tipeFilter, setTipeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadReport = async (q = search, tipe = tipeFilter) => {
    setLoading(true);
    try {
      const res = await api.getVehicleHistoryReport({ search: q, tipePelanggan: tipe });
      setRows(res.data || []);
      setSummary(res.summary || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [tipeFilter]);

  return (
    <div className="space-y-4">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">Total Kunjungan Servis</div>
          <div className="font-mono text-base font-bold text-[#1f2328] mt-1 tabular-nums">
            {formatNumber(summary.total_kunjungan)} WO
          </div>
        </div>
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">Unit Motor Terlayani</div>
          <div className="font-mono text-base font-bold text-[#1f2328] mt-1 tabular-nums">
            {formatNumber(summary.unit_motor_unik)} Unit
          </div>
        </div>
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">Akumulasi Biaya Jasa</div>
          <div className="font-mono text-base font-bold text-[#1f2328] mt-1 tabular-nums">
            {formatRupiah(summary.akumulasi_biaya_jasa)}
          </div>
        </div>
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">Akumulasi Nilai Servis</div>
          <div className="font-mono text-base font-bold text-[#0969da] mt-1 tabular-nums">
            {formatRupiah(summary.akumulasi_total_servis)}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono text-[#656d76]">
            SQL View: <strong className="text-[#1f2328]">SELECT * FROM vw_laporan_riwayat_motor</strong>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={tipeFilter}
              onChange={(e) => setTipeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-white border border-[#d0d7de] rounded-md"
            >
              <option value="">Semua Segmen (B2C &amp; B2B)</option>
              <option value="INDIVIDU">Pelanggan Individu (B2C)</option>
              <option value="KORPORAT">Armada Korporat (B2B)</option>
            </select>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadReport(search, tipeFilter);
              }}
              className="flex items-center gap-1.5"
            >
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-[#656d76] absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari plat KH 1234 AB, pemilik..."
                  className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#d0d7de] rounded-md"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1 rounded-md text-xs font-semibold bg-[#0969da] text-white cursor-pointer"
              >
                Filter
              </button>
            </form>
          </div>
        </div>

        {rows.length === 0 && !loading ? (
          <EmptyState
            title="Riwayat servis motor tidak ditemukan"
            description="Tidak ada data pada vw_laporan_riwayat_motor yang cocok dengan filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Plat &amp; Kendaraan</th>
                  <th className="py-2.5 px-3">Nomor WO &amp; Waktu</th>
                  <th className="py-2.5 px-3">Pemilik &amp; Kontrak</th>
                  <th className="py-2.5 px-3">Jasa &amp; Suku Cadang (JOIN Agg)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Km Masuk</th>
                  <th className="py-2.5 px-3 text-right">Total Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {rows.map((r, index) => (
                  <tr key={r.work_order_id || r.work_no || index} className="hover:bg-[#f6f8fa]/70">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 border border-[#d0d7de]">
                        {r.plat_nomor}
                      </span>
                      <div className="text-[11px] text-[#656d76] mt-0.5">
                        {r.merk} {r.tipe_motor} ({r.tahun_motor})
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Link
                        to={`/app/operations/work-orders/${r.nomor_wo}`}
                        className="font-mono font-semibold text-[#0969da] hover:underline"
                      >
                        {r.nomor_wo}
                      </Link>
                      <div className="font-mono text-[10px] text-[#656d76]">
                        {r.kode_cabang} &middot; {formatDateTime(r.waktu_masuk)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-[#1f2328]">
                        {r.nama_perusahaan !== '-' ? r.nama_perusahaan : r.nama_pelanggan}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <CustomerTypeBadge tipe={r.tipe_pelanggan} />
                        {r.nomor_kontrak && (
                          <span className="font-mono text-[10px] text-blue-700">
                            {r.nomor_kontrak}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 max-w-sm">
                      <div className="text-[11px]">
                        <strong className="text-[#1f2328]">Jasa:</strong> {r.daftar_jasa_servis}
                      </div>
                      <div className="text-[11px] text-[#656d76] mt-0.5">
                        <strong className="text-[#1f2328]">Part:</strong> {r.daftar_suku_cadang}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <WoStatusBadge status={r.status_wo} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatNumber(r.kilometer_masuk)} km
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                      {formatRupiah(r.total_tagihan)}
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

