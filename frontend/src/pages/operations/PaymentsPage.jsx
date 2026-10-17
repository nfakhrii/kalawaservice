import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, CheckCircle2, Search } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import {
  CustomerTypeBadge,
  WoStatusBadge,
  AlertBanner,
  EmptyState,
} from '../../components/ui/GitHubComponents';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [selectedWoId, setSelectedWoId] = useState('');
  const [metode, setMetode] = useState('TUNAI');
  const [catatan, setCatatan] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [payRes, woRes] = await Promise.all([api.getPayments(), api.getWorkOrders()]);
      setPayments(payRes.data || []);
      const woList = woRes.data || [];
      setWorkOrders(woList);

      const firstUnpaid = woList.find((w) => w.status === 'selesai' || w.status === 'dikerjakan');
      if (firstUnpaid && !selectedWoId) {
        setSelectedWoId(firstUnpaid.id);
        setMetode(firstUnpaid.tipe_pelanggan === 'KORPORAT' ? 'PLAFON_KORPORAT' : 'TUNAI');
      }
    } catch (err) {
      setAlert({ type: 'error', title: 'Gagal memuat data pembayaran', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedWo = workOrders.find((w) => String(w.id) === String(selectedWoId));

  const handleWoSelect = (id) => {
    setSelectedWoId(id);
    const found = workOrders.find((w) => String(w.id) === String(id));
    if (found) {
      setMetode(found.tipe_pelanggan === 'KORPORAT' ? 'PLAFON_KORPORAT' : 'TUNAI');
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!selectedWoId) return;
    setAlert(null);
    try {
      const res = await api.createPayment({
        work_order_id: selectedWoId,
        metode_pembayaran: metode,
        jumlah_bayar: selectedWo ? selectedWo.total_tagihan : 0,
        catatan,
      });
      setCatatan('');
      await loadData();
      setAlert({
        type: 'success',
        title: `Pembayaran Berhasil Dikonfirmasi (${res.data.nomor_kwitansi})`,
        message: `Work Order berhasil dilunasi menggunakan metode ${res.data.metode_pembayaran}.`,
      });
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Pembayaran Ditolak (HTTP ${err.status || 409})`,
        code: err.code,
        message: err.message,
      });
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.nomor_kwitansi?.toLowerCase().includes(q) ||
      p.nomor_wo?.toLowerCase().includes(q) ||
      p.plat_nomor?.toLowerCase().includes(q) ||
      p.nama_pelanggan?.toLowerCase().includes(q) ||
      p.nama_perusahaan?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {alert && (
        <AlertBanner
          type={alert.type}
          title={alert.title}
          code={alert.code}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 4 Cols: Cashier Settlement Terminal */}
        <div className="lg:col-span-4 bg-white border border-[#d0d7de] rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#1f883d]" />
            <h2 className="text-sm font-semibold text-[#1f2328]">
              Terminal Pembayaran Kasir
            </h2>
          </div>

          <form onSubmit={handleCreatePayment} className="p-4 space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Pilih Work Order (Termasuk Opsi Uji Double Payment)
              </label>
              <select
                value={selectedWoId}
                onChange={(e) => handleWoSelect(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md font-mono text-xs"
                required
              >
                <option value="">-- Pilih Work Order --</option>
                {workOrders
                  .filter((w) => w.status !== 'dibatalkan')
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      [{w.status.toUpperCase()}] {w.nomor_wo} — {w.plat_nomor} ({formatRupiah(w.total_tagihan)})
                    </option>
                  ))}
              </select>
            </div>

            {selectedWo && (
              <div className="p-3 rounded-md bg-[#f6f8fa] border border-[#d0d7de] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-[#0969da]">
                    {selectedWo.nomor_wo}
                  </span>
                  <WoStatusBadge status={selectedWo.status} />
                </div>
                <div className="font-semibold text-[#1f2328]">
                  {selectedWo.nama_perusahaan || selectedWo.nama_pelanggan}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <CustomerTypeBadge tipe={selectedWo.tipe_pelanggan} />
                  <span className="font-mono font-bold text-sm text-[#1f2328] tabular-nums">
                    {formatRupiah(selectedWo.total_tagihan)}
                  </span>
                </div>
                {selectedWo.tipe_pelanggan === 'KORPORAT' && (
                  <div className="text-[11px] text-blue-700 font-mono pt-1 border-t border-[#d0d7de]">
                    Sisa Plafon Tersedia: {formatRupiah(selectedWo.sisa_plafon)}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Metode Pembayaran</label>
              <select
                value={metode}
                onChange={(e) => setMetode(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md font-mono text-xs"
              >
                <option value="TUNAI">TUNAI (Cash Kasir)</option>
                <option value="QRIS">QRIS (Digital Payment)</option>
                <option value="TRANSFER">TRANSFER (Bank Transfer)</option>
                <option value="PLAFON_KORPORAT">
                  PLAFON_KORPORAT (Potong Plafon Kredit B2B)
                </option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Catatan Kwitansi</label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan pembayaran kasir..."
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Payment</span>
            </button>
          </form>
        </div>

        {/* Right 8 Cols: Payment Receipts Table */}
        <div className="lg:col-span-8 bg-white border border-[#d0d7de] rounded-md overflow-hidden">
          <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1f2328]">
              Daftar Kwitansi Pembayaran ({filteredPayments.length} Transaksi)
            </h3>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#656d76] absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kwitansi, WO, plat..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#d0d7de] rounded-md focus:outline-none focus:border-[#0969da]"
              />
            </div>
          </div>

          {filteredPayments.length === 0 && !loading ? (
            <EmptyState title="Belum ada transaksi pembayaran" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                    <th className="py-2.5 px-3">No. Kwitansi</th>
                    <th className="py-2.5 px-3">Work Order</th>
                    <th className="py-2.5 px-3">Pelanggan &amp; Plat</th>
                    <th className="py-2.5 px-3">Metode &amp; Status</th>
                    <th className="py-2.5 px-3 text-right">Nominal Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0d7de] text-xs">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#f6f8fa]/70">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-[#1f2328]">
                          {p.nomor_kwitansi}
                        </div>
                        <div className="font-mono text-[10px] text-[#656d76]">
                          {formatDateTime(p.tanggal_bayar)}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Link
                          to={`/app/operations/work-orders/${p.nomor_wo}`}
                          className="font-mono text-xs font-semibold text-[#0969da] hover:underline"
                        >
                          {p.nomor_wo}
                        </Link>
                        <div className="font-mono text-[10px] text-[#656d76]">{p.kode_cabang}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#1f2328]">
                          {p.nama_perusahaan || p.nama_pelanggan}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono text-[11px] px-1.5 py-0 rounded bg-slate-100 border border-[#d0d7de]">
                            {p.plat_nomor}
                          </span>
                          <CustomerTypeBadge tipe={p.tipe_pelanggan} />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 border border-[#d0d7de]">
                          {p.metode_pembayaran}
                        </span>
                        <div className="mt-1">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              p.status_pembayaran === 'LUNAS'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {p.status_pembayaran}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-[#1f2328] tabular-nums whitespace-nowrap">
                        {formatRupiah(p.jumlah_bayar)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

