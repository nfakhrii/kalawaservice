import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  GitPullRequest,
  Wrench,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  CreditCard,
  Building2,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah, formatDateTime, formatNumber } from '../../utils/formatters';
import {
  WoStatusBadge,
  CustomerTypeBadge,
  AlertBanner,
} from '../../components/ui/GitHubComponents';

export default function WorkOrderDetailPage() {
  const { woId } = useParams();

  const [wo, setWo] = useState(null);
  const [servicesCatalog, setServicesCatalog] = useState([]);
  const [sparepartsCatalog, setSparepartsCatalog] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Form states for adding service / sparepart / updating status
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceNote, setServiceNote] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [mechanicNote, setMechanicNote] = useState('');
  const [selectedMechanicId, setSelectedMechanicId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('TUNAI');

  const loadDetail = async () => {
    setLoading(true);
    try {
      const [woRes, srvRes, spRes, lookRes] = await Promise.all([
        api.getWorkOrderDetail(woId),
        api.getServices(),
        api.getSpareparts(),
        api.getLookups(),
      ]);
      const detail = woRes.data;
      setWo(detail);
      setServicesCatalog(srvRes.data || []);
      setSparepartsCatalog(spRes.data || []);
      setMechanics(lookRes.data?.mechanics || []);
      setMechanicNote(detail.catatan_mekanik || '');
      setSelectedMechanicId(detail.mekanik_id || '');
      setPaymentMethod(detail.tipe_pelanggan === 'KORPORAT' ? 'PLAFON_KORPORAT' : 'TUNAI');
    } catch (err) {
      setAlert({ type: 'error', title: 'Gagal memuat detail Work Order', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [woId]);

  const handleStatusChange = async (newStatus) => {
    setAlert(null);
    try {
      const res = await api.updateWorkOrder(wo.id, {
        status: newStatus,
        catatan_mekanik: mechanicNote,
        mekanik_id: selectedMechanicId || null,
      });
      setWo(res.data);
      setAlert({
        type: 'success',
        title: `Status Work Order Diperbarui`,
        message: `${res.data.nomor_wo} kini berstatus '${res.data.status}'.`,
      });
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Gagal Mengubah Status (${err.status || 400})`,
        code: err.code,
        message: err.message,
      });
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!selectedServiceId) return;
    setAlert(null);
    try {
      const res = await api.addServiceToWo(wo.id, {
        jasa_servis_id: selectedServiceId,
        catatan: serviceNote,
      });
      setWo(res.data);
      setSelectedServiceId('');
      setServiceNote('');
      setAlert({
        type: 'success',
        title: 'Jasa Servis Ditambahkan',
        message: 'Total tagihan Work Order telah direkalkulasi otomatis oleh Trigger PostgreSQL.',
      });
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Penambahan Jasa Ditolak (${err.status || 400})`,
        code: err.code,
        message: err.message,
      });
    }
  };

  const handleRemoveService = async (itemId) => {
    setAlert(null);
    try {
      const res = await api.removeServiceFromWo(wo.id, itemId);
      setWo(res.data);
    } catch (err) {
      setAlert({ type: 'error', title: 'Gagal menghapus jasa', message: err.message });
    }
  };

  const handleAddSparepart = async (e) => {
    e.preventDefault();
    if (!selectedPartId) return;
    setAlert(null);
    try {
      const res = await api.addSparepartToWo(wo.id, {
        suku_cadang_id: selectedPartId,
        jumlah: partQty,
      });
      setWo(res.data);
      setSelectedPartId('');
      setPartQty(1);
      // Reload spareparts catalog so updated stock shows
      const spRes = await api.getSpareparts();
      setSparepartsCatalog(spRes.data || []);
      setAlert({
        type: 'success',
        title: 'Suku Cadang Berhasil Dialokasikan',
        message: 'Stok gudang dikurangi & total tagihan direkalkulasi otomatis oleh Trigger PostgreSQL.',
      });
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Trigger PostgreSQL Menolak Alokasi Part (HTTP ${err.status || 422})`,
        code: err.code,
        message: err.message,
      });
    }
  };

  const handleRemoveSparepart = async (itemId) => {
    setAlert(null);
    try {
      const res = await api.removeSparepartFromWo(wo.id, itemId);
      setWo(res.data);
      const spRes = await api.getSpareparts();
      setSparepartsCatalog(spRes.data || []);
    } catch (err) {
      setAlert({ type: 'error', title: 'Gagal menghapus part', message: err.message });
    }
  };

  const handleConfirmPayment = async () => {
    setAlert(null);
    try {
      const payRes = await api.createPayment({
        work_order_id: wo.id,
        metode_pembayaran: paymentMethod,
        jumlah_bayar: wo.total_tagihan,
        catatan: `Pembayaran langsung dari halaman detail ${wo.nomor_wo}`,
      });
      await loadDetail();
      setAlert({
        type: 'success',
        title: `Pembayaran Berhasil (${payRes.data.nomor_kwitansi})`,
        message: `Work Order ${wo.nomor_wo} kini berstatus 'dibayar' melalui metode ${payRes.data.metode_pembayaran}.`,
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

  if (loading && !wo) {
    return (
      <div className="p-8 text-center text-xs text-[#656d76] bg-white border border-[#d0d7de] rounded-md">
        Memuat detail Work Order #{woId}...
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="p-8 text-center text-xs text-red-700 bg-white border border-[#d0d7de] rounded-md">
        Work Order tidak ditemukan.
      </div>
    );
  }

  const isLocked = ['dibayar', 'dibatalkan'].includes(wo.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          to="/app/operations/work-orders"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0969da] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Daftar Work Order</span>
        </Link>
      </div>

      {alert && (
        <AlertBanner
          type={alert.type}
          title={alert.title}
          code={alert.code}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* GitHub Pull Request Style Header */}
      <div className="bg-white border border-[#d0d7de] rounded-md p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#d0d7de]">
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-lg font-bold text-[#1f2328]">
                {wo.merk} {wo.tipe_motor} — Servis Kendaraan
              </h1>
              <span className="font-mono text-base font-normal text-[#656d76]">
                #{wo.nomor_wo}
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-[#656d76]">
              <WoStatusBadge status={wo.status} />
              <span className="font-mono font-semibold text-[#1f2328] bg-slate-100 border border-[#d0d7de] px-2 py-0.5 rounded">
                {wo.plat_nomor}
              </span>
              <CustomerTypeBadge tipe={wo.tipe_pelanggan} />
              {wo.status_garansi && (
                <span
                  className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    wo.status_garansi === 'Masih berlaku'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : wo.status_garansi === 'Tidak berlaku'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  Garansi: {wo.status_garansi}
                </span>
              )}
              <span>
                dibuka pada <strong>{formatDateTime(wo.waktu_masuk)}</strong> di{' '}
                <strong className="font-mono">{wo.kode_cabang}</strong>
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-[#656d76] uppercase tracking-wider font-semibold">
              Total Tagihan Work Order
            </div>
            <div className="font-mono text-xl font-bold text-[#1f2328] tabular-nums">
              {formatRupiah(wo.total_tagihan)}
            </div>
          </div>
        </div>

        {/* Quick Status Transition Bar */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[#656d76] font-medium mr-1">Transisi Status WO:</span>
            {['antre', 'dikerjakan', 'selesai', 'dibatalkan'].map((st) => (
              <button
                key={st}
                type="button"
                disabled={wo.status === st || wo.status === 'dibayar'}
                onClick={() => handleStatusChange(st)}
                className={`px-2.5 py-1 rounded-md font-mono text-xs border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  wo.status === st
                    ? 'bg-[#0969da] text-white border-[#0969da] font-semibold'
                    : 'bg-[#f6f8fa] hover:bg-slate-200/70 text-[#1f2328] border-[#d0d7de]'
                }`}
              >
                Set: {st}
              </button>
            ))}
          </div>

          {/* Confirm Payment Box (even if already paid, user can click to see Double Payment 409 guard!) */}
          <div className="flex items-center gap-2">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="px-2.5 py-1.5 bg-[#f6f8fa] border border-[#d0d7de] rounded-md font-mono text-xs"
            >
              <option value="TUNAI">TUNAI</option>
              <option value="QRIS">QRIS</option>
              <option value="TRANSFER">TRANSFER</option>
              {wo.tipe_pelanggan === 'KORPORAT' && (
                <option value="PLAFON_KORPORAT">PLAFON_KORPORAT (B2B)</option>
              )}
            </select>
            <button
              type="button"
              onClick={handleConfirmPayment}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{wo.status === 'dibayar' ? 'Test Double Payment (409)' : 'Confirm Payment'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* GitHub PR Two-Column Layout: Left Timeline Cards (8 Cols) & Right Metadata Sidebar (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8 Cols: PR Conversation / Timeline Cards */}
        <div className="lg:col-span-8 space-y-4">
          {/* Card 1: Keluhan & Catatan Mekanik */}
          <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1f2328]">
                Deskripsi Keluhan &amp; Diagnosa Mekanik
              </span>
              <span className="font-mono text-[#656d76]">Odometer: {formatNumber(wo.kilometer_masuk)} km</span>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div>
                <div className="font-semibold text-[#656d76] mb-1">Keluhan Pelanggan:</div>
                <div className="p-3 rounded-md bg-[#f6f8fa] border border-[#d0d7de] text-[#1f2328]">
                  {wo.keluhan}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#656d76] mb-1">
                    Catatan Teknis Mekanik:
                  </label>
                  <input
                    type="text"
                    value={mechanicNote}
                    onChange={(e) => setMechanicNote(e.target.value)}
                    placeholder="Isi hasil pemeriksaan / tindakan mekanik..."
                    className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#656d76] mb-1">Mekanik:</label>
                  <div className="flex gap-1.5">
                    <select
                      value={selectedMechanicId}
                      onChange={(e) => setSelectedMechanicId(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#f6f8fa] border border-[#d0d7de] rounded-md"
                    >
                      <option value="">-- Pilih --</option>
                      {mechanics.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nama_lengkap}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(wo.status)}
                      className="px-3 py-1.5 rounded-md bg-[#0969da] hover:bg-[#0860ca] text-white font-semibold shrink-0 cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Daftar Jasa Servis (work_order_servis) */}
          <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#1f2328]">
                <Wrench className="w-4 h-4 text-[#0969da]" />
                <span>Item Jasa Servis ({wo.services?.length || 0})</span>
              </div>
              <span className="font-mono font-semibold tabular-nums">
                Subtotal Jasa: {formatRupiah(wo.total_biaya_jasa)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase">
                    <th className="py-2 px-3">Kode Jasa</th>
                    <th className="py-2 px-3">Nama Layanan</th>
                    <th className="py-2 px-3">Catatan</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                    <th className="py-2 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0d7de] text-xs">
                  {(wo.services || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-[#656d76]">
                        Belum ada item jasa servis pada Work Order ini.
                      </td>
                    </tr>
                  ) : (
                    wo.services.map((srv) => (
                      <tr key={srv.id}>
                        <td className="py-2 px-3 font-mono text-xs font-semibold text-[#0969da]">
                          {srv.kode_jasa}
                        </td>
                        <td className="py-2 px-3 font-medium text-[#1f2328]">{srv.nama_jasa}</td>
                        <td className="py-2 px-3 text-[#656d76]">{srv.catatan || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums">
                          {formatRupiah(srv.subtotal)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={() => handleRemoveService(srv.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!isLocked && (
              <form
                onSubmit={handleAddService}
                className="p-3 bg-[#f6f8fa] border-t border-[#d0d7de] flex flex-wrap items-center gap-2 text-xs"
              >
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="flex-1 min-w-[220px] px-2.5 py-1.5 bg-white border border-[#d0d7de] rounded-md"
                  required
                >
                  <option value="">+ Pilih Katalog Jasa Servis...</option>
                  {servicesCatalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.kode_jasa} — {s.nama_jasa} ({formatRupiah(s.harga_jasa)})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={serviceNote}
                  onChange={(e) => setServiceNote(e.target.value)}
                  placeholder="Catatan tambahan (opsional)"
                  className="w-48 px-2.5 py-1.5 bg-white border border-[#d0d7de] rounded-md"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#1f883d] hover:bg-[#1a7f37] text-white font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Service</span>
                </button>
              </form>
            )}
          </div>

          {/* Card 3: Daftar Suku Cadang (work_order_suku_cadang + PostgreSQL Stock Trigger) */}
          <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#1f2328]">
                <Package className="w-4 h-4 text-[#0969da]" />
                <span>Suku Cadang Terpakai ({wo.spareparts?.length || 0} SKU)</span>
              </div>
              <span className="font-mono font-semibold tabular-nums">
                Subtotal Part: {formatRupiah(wo.total_biaya_part)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase">
                    <th className="py-2 px-3">Kode SKU</th>
                    <th className="py-2 px-3">Nama Suku Cadang</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Harga Satuan</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                    <th className="py-2 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0d7de] text-xs">
                  {(wo.spareparts || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-[#656d76]">
                        Belum ada suku cadang yang ditambahkan pada Work Order ini.
                      </td>
                    </tr>
                  ) : (
                    wo.spareparts.map((pt) => (
                      <tr key={pt.id}>
                        <td className="py-2 px-3 font-mono text-xs font-semibold text-[#0969da]">
                          {pt.kode_sku}
                        </td>
                        <td className="py-2 px-3 font-medium text-[#1f2328]">{pt.nama_part}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {pt.jumlah} {pt.satuan}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#656d76] tabular-nums">
                          {formatRupiah(pt.harga_satuan)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums">
                          {formatRupiah(pt.subtotal)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSparepart(pt.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!isLocked && (
              <form
                onSubmit={handleAddSparepart}
                className="p-3 bg-[#f6f8fa] border-t border-[#d0d7de] flex flex-wrap items-center gap-2 text-xs"
              >
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="flex-1 min-w-[240px] px-2.5 py-1.5 bg-white border border-[#d0d7de] rounded-md font-mono text-xs"
                  required
                >
                  <option value="">+ Pilih Suku Cadang (Trigger Validasi Stok Aktif)...</option>
                  {sparepartsCatalog.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.kode_sku} — {sp.nama_part} [Sisa Stok: {sp.stok_saat_ini} {sp.satuan}] ({formatRupiah(sp.harga_jual)})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-[#656d76]">Qty:</span>
                  <input
                    type="number"
                    min="1"
                    value={partQty}
                    onChange={(e) => setPartQty(Number(e.target.value))}
                    className="w-20 px-2 py-1.5 text-right font-mono bg-white border border-[#d0d7de] rounded-md"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#1f883d] hover:bg-[#1a7f37] text-white font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Sparepart</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right 4 Cols: GitHub PR Metadata Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Sidebar Box 1: Ringkasan Finansial */}
          <div className="bg-white border border-[#d0d7de] rounded-md p-4 space-y-2.5 text-xs">
            <h3 className="font-semibold uppercase tracking-wider text-[#656d76] pb-2 border-b border-[#d0d7de]">
              Rincian Biaya Servis
            </h3>
            <div className="flex justify-between">
              <span className="text-[#656d76]">Total Biaya Jasa</span>
              <span className="font-mono tabular-nums">{formatRupiah(wo.total_biaya_jasa)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#656d76]">Total Suku Cadang</span>
              <span className="font-mono tabular-nums">{formatRupiah(wo.total_biaya_part)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#656d76]">Potongan Diskon</span>
              <span className="font-mono text-emerald-700 tabular-nums">
                - {formatRupiah(wo.diskon)}
              </span>
            </div>
            <div className="pt-2 border-t border-[#d0d7de] flex justify-between text-sm font-bold">
              <span>Total Tagihan</span>
              <span className="font-mono text-[#1f2328] tabular-nums">
                {formatRupiah(wo.total_tagihan)}
              </span>
            </div>

            {wo.payment && (
              <div className="mt-3 p-2.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Kwitansi: {wo.payment.nomor_kwitansi}</span>
                </div>
                <div className="font-mono text-[11px]">
                  Metode: {wo.payment.metode_pembayaran} ({wo.payment.status_pembayaran})
                </div>
                <div className="text-[11px]">
                  Waktu: {formatDateTime(wo.payment.tanggal_bayar)}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Box 2: Informasi Pelanggan & Kontrak B2B */}
          <div className="bg-white border border-[#d0d7de] rounded-md p-4 space-y-2.5 text-xs">
            <h3 className="font-semibold uppercase tracking-wider text-[#656d76] pb-2 border-b border-[#d0d7de]">
              Identitas Pelanggan &amp; Kendaraan
            </h3>
            <div>
              <div className="text-[#656d76]">Nama Pelanggan / Perusahaan</div>
              <div className="font-semibold text-[#1f2328] mt-0.5">
                {wo.nama_perusahaan || wo.nama_pelanggan}
              </div>
              <div className="font-mono text-[11px] text-[#656d76]">
                {wo.kode_pelanggan} &middot; {wo.telepon_pelanggan}
              </div>
            </div>

            {wo.tipe_pelanggan === 'KORPORAT' && (
              <div className="p-2.5 rounded bg-blue-50/70 border border-blue-200 space-y-1">
                <div className="font-semibold text-blue-900 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Kontrak Armada Korporat</span>
                </div>
                <div className="font-mono text-[11px] text-blue-800">
                  {wo.nomor_kontrak || 'KTR-B2B-AKTIF'}
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span>Sisa Plafon Kredit:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatRupiah(wo.sisa_plafon)}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-[#d0d7de] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#656d76]">Plat Nomor</span>
                <span className="font-mono font-semibold">{wo.plat_nomor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#656d76]">Nomor Rangka</span>
                <span className="font-mono text-[11px]">{wo.nomor_rangka}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#656d76]">Warna / Tahun</span>
                <span>
                  {wo.warna_motor} / {wo.tahun_motor}
                </span>
              </div>
            </div>

            {/* Garansi & Tim Mekanik (Kelompok 1 GARANSI & WO_MEKANIK) */}
            <div className="pt-2 border-t border-[#d0d7de] space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#656d76]">Status Garansi (`fn_status_garansi_by_wo`)</span>
                <span className="font-mono font-semibold text-[#1f2328]">
                  {wo.status_garansi || 'Tidak ada data garansi'}
                </span>
              </div>
              {wo.garansi_id && (
                <div className="p-2 rounded bg-slate-50 border border-[#d0d7de] text-[11px] space-y-0.5">
                  <div className="font-mono font-semibold text-[#0969da]">
                    ID Garansi: {wo.garansi_id}
                  </div>
                  <div className="text-[#1f2328]">{wo.garansi_keterangan}</div>
                </div>
              )}
              {(wo.mechanics || []).length > 0 && (
                <div className="pt-1">
                  <div className="text-[#656d76] mb-1">Tim Mekanik (`WO_MEKANIK`):</div>
                  <div className="space-y-1">
                    {wo.mechanics.map((m) => (
                      <div
                        key={m.pegawai_id}
                        className="px-2 py-1 rounded bg-[#f6f8fa] border border-[#d0d7de] flex items-center justify-between text-[11px]"
                      >
                        <span className="font-medium text-[#1f2328]">{m.pegawai_nama}</span>
                        <span className="font-mono text-[#656d76]">{m.spesialisasi}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

