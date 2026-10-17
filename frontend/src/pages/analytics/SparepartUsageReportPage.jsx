import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah, formatNumber, formatDateTime } from '../../utils/formatters';
import { WoStatusBadge, EmptyState } from '../../components/ui/GitHubComponents';

export default function SparepartUsageReportPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsage = async (q = search) => {
    setLoading(true);
    try {
      const res = await api.getSparepartUsageReport({ search: q });
      setRows(res.data || []);
      setSummary(res.summary || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">Total Baris Transaksi Part</div>
          <div className="font-mono text-base font-bold text-[#1f2328] mt-1 tabular-nums">
            {formatNumber(summary.total_baris_penggunaan)} Baris
          </div>
        </div>
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">Total Unit Suku Cadang Keluar</div>
          <div className="font-mono text-base font-bold text-[#1f2328] mt-1 tabular-nums">
            {formatNumber(summary.total_unit_terpakai)} Unit
          </div>
        </div>
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">Total Nilai Penggunaan Part</div>
          <div className="font-mono text-base font-bold text-[#0969da] mt-1 tabular-nums">
            {formatRupiah(summary.total_nilai_part)}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-mono text-[#656d76]">
            SQL View: <strong className="text-[#1f2328]">SELECT * FROM vw_laporan_penggunaan_part</strong>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadUsage(search);
            }}
            className="flex items-center gap-1.5"
          >
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#656d76] absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari SKU, nama part, WO, plat..."
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

        {rows.length === 0 && !loading ? (
          <EmptyState title="Data penggunaan suku cadang tidak ditemukan" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Nomor WO &amp; Status</th>
                  <th className="py-2.5 px-3">Plat &amp; Kendaraan</th>
                  <th className="py-2.5 px-3">Kode SKU</th>
                  <th className="py-2.5 px-3">Nama Suku Cadang</th>
                  <th className="py-2.5 px-3 text-right">Qty Keluar</th>
                  <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {rows.map((r) => (
                  <tr key={r.detail_id} className="hover:bg-[#f6f8fa]/70">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/app/operations/work-orders/${r.nomor_wo}`}
                          className="font-mono font-semibold text-[#0969da] hover:underline"
                        >
                          {r.nomor_wo}
                        </Link>
                        <WoStatusBadge status={r.status_wo} />
                      </div>
                      <div className="font-mono text-[10px] text-[#656d76] mt-0.5">
                        {r.kode_cabang} &middot; {formatDateTime(r.waktu_penggunaan)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-semibold mr-2">{r.plat_nomor}</span>
                      <span className="text-[#656d76]">{r.kendaraan}</span>
                      <div className="text-[11px] text-[#656d76]">{r.nama_pelanggan}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#0969da]">
                      {r.kode_sku}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-[#1f2328]">{r.nama_part}</div>
                      <div className="text-[11px] text-[#656d76]">{r.kategori_part}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums">
                      {r.jumlah_digunakan} {r.satuan}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#656d76] tabular-nums">
                      {formatRupiah(r.harga_satuan)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                      {formatRupiah(r.subtotal)}
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

