import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah, formatNumber } from '../../utils/formatters';
import { StockStatusBadge, EmptyState } from '../../components/ui/GitHubComponents';

export default function LowStockReportPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const loadLowStock = async () => {
    setLoading(true);
    try {
      const res = await api.getLowStockReport();
      setRows(res.data || []);
      setSummary(res.summary || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLowStock();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">Total SKU di Bawah / Sama Dengan Minimum</div>
          <div className="font-mono text-base font-bold text-amber-700 mt-1 tabular-nums">
            {formatNumber(summary.jumlah_item_kritis)} SKU Kritis
          </div>
        </div>
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">SKU Habis Total (Stok = 0)</div>
          <div className="font-mono text-base font-bold text-red-700 mt-1 tabular-nums">
            {formatNumber(summary.jumlah_item_habis)} SKU
          </div>
        </div>
        <div className="bg-white border border-[#d0d7de] rounded-md p-3">
          <div className="text-[11px] text-[#656d76]">Estimasi Anggaran Restock Supplier</div>
          <div className="font-mono text-base font-bold text-[#1f2328] mt-1 tabular-nums">
            {formatRupiah(summary.estimasi_biaya_restock)}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="font-mono text-[#656d76]">
              SQL View: <strong className="text-[#1f2328]">SELECT * FROM vw_laporan_stok_minimum</strong>
            </span>
          </div>
          <Link
            to="/app/registry/spareparts"
            className="text-xs font-medium text-[#0969da] hover:underline inline-flex items-center gap-1"
          >
            Buka Master Suku Cadang (Restock) <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {rows.length === 0 && !loading ? (
          <EmptyState
            title="Seluruh stok suku cadang aman"
            description="Tidak ada SKU yang berada di bawah batas stok minimum."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Kode SKU &amp; Rak</th>
                  <th className="py-2.5 px-3">Nama Suku Cadang</th>
                  <th className="py-2.5 px-3">Supplier &amp; Kontak</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Stok Saat Ini</th>
                  <th className="py-2.5 px-3 text-right">Stok Minimum</th>
                  <th className="py-2.5 px-3 text-right">Rekomendasi Order</th>
                  <th className="py-2.5 px-3 text-right">Harga Beli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {rows.map((r) => (
                  <tr key={r.suku_cadang_id} className="hover:bg-[#f6f8fa]/70">
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                      <div className="font-semibold text-[#0969da]">{r.kode_sku}</div>
                      <div className="text-[10px] text-[#656d76]">{r.lokasi_rak}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#1f2328]">{r.nama_part}</div>
                      <div className="text-[11px] text-[#656d76]">{r.kategori}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-[#1f2328]">{r.nama_supplier}</div>
                      <div className="font-mono text-[11px] text-[#656d76]">
                        {r.kontak_person} &middot; {r.telepon_supplier} ({r.kota_supplier})
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StockStatusBadge
                        stokSaatIni={r.stok_saat_ini}
                        stokMinimum={r.stok_minimum}
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-red-700 tabular-nums">
                      {r.stok_saat_ini} {r.satuan}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#656d76] tabular-nums">
                      {r.stok_minimum} {r.satuan}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      + {r.rekomendasi_restock} {r.satuan}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {formatRupiah(r.harga_beli)}
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

