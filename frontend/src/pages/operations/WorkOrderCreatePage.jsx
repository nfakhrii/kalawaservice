import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GitPullRequest, ArrowLeft, Plus, Trash2, Building2 } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah } from '../../utils/formatters';
import { AlertBanner, CustomerTypeBadge } from '../../components/ui/GitHubComponents';

export default function WorkOrderCreatePage() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [servicesCatalog, setServicesCatalog] = useState([]);
  const [sparepartsCatalog, setSparepartsCatalog] = useState([]);
  const [alert, setAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    cabang_id: 'CB001',
    motor_id: '',
    mekanik_id: '',
    kilometer_masuk: 15000,
    keluhan: '',
    catatan_mekanik: '',
    diskon: 0,
    status: 'antre',
    skema_pembayaran: 'LANGSUNG',
  });

  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getVehicles(),
      api.getLookups(),
      api.getServices(),
      api.getSpareparts(),
    ])
      .then(([vRes, lRes, sRes, spRes]) => {
        const vList = vRes.data || [];
        const bList = lRes.data?.branches || [];
        setVehicles(vList);
        setBranches(bList);
        setMechanics(lRes.data?.mechanics || []);
        setServicesCatalog(sRes.data || []);
        setSparepartsCatalog(spRes.data || []);

        if (vList[0]) {
          setFormData((prev) => ({
            ...prev,
            cabang_id: bList[0]?.id || 'CB001',
            motor_id: vList[0].id,
            kilometer_masuk: vList[0].kilometer_terakhir || 15000,
            skema_pembayaran:
              vList[0].tipe_pelanggan === 'KORPORAT' ? 'TAGIHAN_KOLEKTIF' : 'LANGSUNG',
          }));
        }
      })
      .catch((err) => {
        setAlert({ type: 'error', title: 'Gagal memuat data referensi', message: err.message });
      });
  }, []);

  const selectedVehicle = vehicles.find((v) => String(v.id) === String(formData.motor_id));

  const handleVehicleChange = (motorId) => {
    const found = vehicles.find((v) => String(v.id) === String(motorId));
    setFormData((prev) => ({
      ...prev,
      motor_id: motorId,
      kilometer_masuk: found ? found.kilometer_terakhir : prev.kilometer_masuk,
      skema_pembayaran: found?.tipe_pelanggan === 'KORPORAT' ? 'TAGIHAN_KOLEKTIF' : 'LANGSUNG',
    }));
  };

  const addServiceRow = (jasaId) => {
    if (!jasaId) return;
    const srv = servicesCatalog.find((s) => String(s.id) === String(jasaId));
    if (!srv) return;
    setSelectedServices((prev) => [
      ...prev,
      { jasa_servis_id: srv.id, kode_jasa: srv.kode_jasa, nama_jasa: srv.nama_jasa, harga: srv.harga_jasa },
    ]);
  };

  const addPartRow = (partId) => {
    if (!partId) return;
    const sp = sparepartsCatalog.find((p) => String(p.id) === String(partId));
    if (!sp) return;
    setSelectedParts((prev) => [
      ...prev,
      {
        suku_cadang_id: sp.id,
        kode_sku: sp.kode_sku,
        nama_part: sp.nama_part,
        harga: sp.harga_jual,
        stok_saat_ini: sp.stok_saat_ini,
        jumlah: 1,
      },
    ]);
  };

  const estJasa = selectedServices.reduce((sum, s) => sum + Number(s.harga || 0), 0);
  const estPart = selectedParts.reduce(
    (sum, p) => sum + Number(p.harga || 0) * Number(p.jumlah || 1),
    0
  );
  const estTotal = Math.max(0, estJasa + estPart - Number(formData.diskon || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        initial_services: selectedServices,
        initial_spareparts: selectedParts,
      };
      const res = await api.createWorkOrder(payload);
      navigate(`/app/operations/work-orders/${res.data.nomor_wo}`);
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Pembuatan Work Order Ditolak (HTTP ${err.status || 400})`,
        code: err.code,
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8 Columns: Main Work Order Creation Card */}
        <div className="lg:col-span-8 bg-white border border-[#d0d7de] rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-[#1f883d]" />
            <h2 className="text-sm font-semibold text-[#1f2328]">
              Open New Work Order (Penerimaan Servis Motor)
            </h2>
          </div>

          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#1f2328] mb-1">
                  Pilih Unit Motor (Plat Nomor &amp; Pemilik) *
                </label>
                <select
                  value={formData.motor_id}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md font-mono text-xs"
                >
                  <option value="">-- Kosongkan untuk Menguji Validasi Skenario #1 --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plat_nomor} — {v.merk} {v.tipe} ({v.nama_perusahaan || v.nama_pelanggan})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1f2328] mb-1">Cabang Penerima</label>
                <select
                  value={formData.cabang_id}
                  onChange={(e) => setFormData({ ...formData, cabang_id: e.target.value })}
                  className="w-full px-2.5 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.kode_cabang} — {b.nama_cabang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedVehicle && (
              <div className="p-3 rounded-md bg-[#f6f8fa] border border-[#d0d7de] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CustomerTypeBadge tipe={selectedVehicle.tipe_pelanggan} />
                  <span className="font-semibold text-[#1f2328]">
                    {selectedVehicle.nama_perusahaan || selectedVehicle.nama_pelanggan}
                  </span>
                  <span className="font-mono text-[#656d76]">
                    ({selectedVehicle.kode_pelanggan})
                  </span>
                </div>
                {selectedVehicle.tipe_pelanggan === 'KORPORAT' && (
                  <div className="inline-flex items-center gap-1.5 text-blue-700 font-medium">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Otomatis terhubung ke Kontrak Korporat &amp; Tagihan Kolektif</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-[#1f2328] mb-1">Mekanik Penanggung Jawab</label>
                <select
                  value={formData.mekanik_id}
                  onChange={(e) => setFormData({ ...formData, mekanik_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
                >
                  <option value="">-- Pilih Mekanik --</option>
                  {mechanics.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama_lengkap} ({m.nama_cabang})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#1f2328] mb-1">Odometer Masuk (Km)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.kilometer_masuk}
                  onChange={(e) => setFormData({ ...formData, kilometer_masuk: e.target.value })}
                  className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1f2328] mb-1">Status Awal</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md font-medium"
                >
                  <option value="antre">antre</option>
                  <option value="dikerjakan">dikerjakan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Keluhan Pelanggan / Instruksi Servis *
              </label>
              <textarea
                rows={3}
                value={formData.keluhan}
                onChange={(e) => setFormData({ ...formData, keluhan: e.target.value })}
                placeholder="Contoh: Tarikan awal gredek di putaran bawah, ganti oli mesin rutin, dan cek rem depan..."
                className="w-full px-3 py-2 border border-[#d0d7de] rounded-md"
                required
              />
            </div>

            {/* Optional Initial Services & Spareparts */}
            <div className="pt-3 border-t border-[#d0d7de] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1f2328]">
                  Item Jasa Servis Awal (Opsional)
                </span>
                <select
                  value=""
                  onChange={(e) => addServiceRow(e.target.value)}
                  className="px-2.5 py-1 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-xs"
                >
                  <option value="">+ Tambah Jasa Servis...</option>
                  {servicesCatalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.kode_jasa} — {s.nama_jasa} ({formatRupiah(s.harga_jasa)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedServices.length > 0 && (
                <div className="border border-[#d0d7de] rounded-md divide-y divide-[#d0d7de]">
                  {selectedServices.map((srv, i) => (
                    <div key={`${srv.jasa_servis_id}-${i}`} className="px-3 py-2 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-[#0969da] font-semibold mr-2">{srv.kode_jasa}</span>
                        <span>{srv.nama_jasa}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold">{formatRupiah(srv.harga)}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedServices(selectedServices.filter((_, idx) => idx !== i))
                          }
                          className="text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="font-semibold text-[#1f2328]">
                  Alokasi Suku Cadang Awal (Trigger Validasi Stok PostgreSQL)
                </span>
                <select
                  value=""
                  onChange={(e) => addPartRow(e.target.value)}
                  className="px-2.5 py-1 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-xs"
                >
                  <option value="">+ Tambah Suku Cadang (SKU)...</option>
                  {sparepartsCatalog.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.kode_sku} — {sp.nama_part} (Stok: {sp.stok_saat_ini} | {formatRupiah(sp.harga_jual)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedParts.length > 0 && (
                <div className="border border-[#d0d7de] rounded-md divide-y divide-[#d0d7de]">
                  {selectedParts.map((pt, i) => (
                    <div key={`${pt.suku_cadang_id}-${i}`} className="px-3 py-2 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-[#0969da] font-semibold mr-2">{pt.kode_sku}</span>
                        <span>{pt.nama_part}</span>
                        <span className="ml-2 font-mono text-[11px] text-[#656d76]">
                          (Tersedia: {pt.stok_saat_ini})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          value={pt.jumlah}
                          onChange={(e) => {
                            const next = [...selectedParts];
                            next[i].jumlah = Number(e.target.value);
                            setSelectedParts(next);
                          }}
                          className="w-16 px-2 py-0.5 text-right font-mono border border-[#d0d7de] rounded"
                        />
                        <span className="font-mono font-semibold w-24 text-right tabular-nums">
                          {formatRupiah(pt.harga * pt.jumlah)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedParts(selectedParts.filter((_, idx) => idx !== i))
                          }
                          className="text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Summary & Submit Box */}
        <div className="lg:col-span-4 bg-white border border-[#d0d7de] rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1f2328]">
              Estimasi Ringkasan Work Order
            </h3>
          </div>
          <div className="p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#656d76]">Skema Penagihan</span>
              <span className="font-mono font-semibold text-[#1f2328]">
                {formData.skema_pembayaran}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#656d76]">Estimasi Jasa ({selectedServices.length} item)</span>
              <span className="font-mono tabular-nums">{formatRupiah(estJasa)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#656d76]">Estimasi Suku Cadang ({selectedParts.length} SKU)</span>
              <span className="font-mono tabular-nums">{formatRupiah(estPart)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#656d76]">Diskon (Rp)</span>
              <input
                type="number"
                min="0"
                value={formData.diskon}
                onChange={(e) => setFormData({ ...formData, diskon: e.target.value })}
                className="w-28 px-2 py-1 text-right font-mono border border-[#d0d7de] rounded"
              />
            </div>
            <div className="pt-3 border-t border-[#d0d7de] flex items-center justify-between text-sm font-bold">
              <span>Total Estimasi</span>
              <span className="font-mono text-[#1f2328] tabular-nums">{formatRupiah(estTotal)}</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2 px-4 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Membuat Work Order...' : 'Create Work Order'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

