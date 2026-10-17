import React, { useEffect, useState } from 'react';
import { Building2, Plus, Bike, Edit2 } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah, formatDate, formatNumber } from '../../utils/formatters';
import { ModalDialog, AlertBanner } from '../../components/ui/GitHubComponents';

export default function CorporateContractsPage() {
  const [creditMonitoring, setCreditMonitoring] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [fleetVehicles, setFleetVehicles] = useState([]);
  const [selectedCorpId, setSelectedCorpId] = useState('ALL');
  const [alert, setAlert] = useState(null);

  // Modal Create Contract
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    nomor_kontrak: '',
    pelanggan_id: '',
    cabang_utama_id: 1,
    nama_kontrak: '',
    jenis_armada: 'KURIR_LOGISTIK',
    tanggal_mulai: '2026-01-01',
    tanggal_berakhir: '2026-12-31',
    kuota_servis_bulanan: 30,
    diskon_kontrak_persen: 10,
    sla_jam_pengerjaan: 18,
    catatan: '',
  });

  // Modal Adjust Credit Limit
  const [creditModalItem, setCreditModalItem] = useState(null);
  const [creditForm, setCreditForm] = useState({ plafon_kredit: 0, sisa_plafon: 0 });

  const loadData = async () => {
    try {
      const res = await api.getCorporateContracts();
      setCreditMonitoring(res.data?.creditMonitoring || []);
      setContracts(res.data?.contracts || []);
      setFleetVehicles(res.data?.fleetVehicles || []);
    } catch (err) {
      setAlert({ type: 'error', title: 'Gagal memuat data korporat', message: err.message });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewContractModal = () => {
    const nextNum = String(contracts.length + 1).padStart(3, '0');
    setContractForm({
      nomor_kontrak: `KK${nextNum}`,
      pelanggan_id: creditMonitoring[0]?.pelanggan_id || '',
      cabang_utama_id: 'CB001',
      nama_kontrak: 'Kontrak Pemeliharaan Berkala Armada 2026',
      jenis_armada: 'KURIR_LOGISTIK',
      tanggal_mulai: '2026-01-01',
      tanggal_berakhir: '2026-12-31',
      kuota_servis_bulanan: 30,
      diskon_kontrak_persen: 10,
      sla_jam_pengerjaan: 18,
      catatan: '',
    });
    setIsContractModalOpen(true);
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    setAlert(null);
    try {
      await api.createCorporateContract(contractForm);
      setIsContractModalOpen(false);
      loadData();
      setAlert({
        type: 'success',
        title: 'Kontrak Korporat Diterbitkan',
        message: `Kontrak ${contractForm.nomor_kontrak} berhasil disimpan.`,
      });
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Gagal Membuat Kontrak (${err.status || 400})`,
        code: err.code,
        message: err.message,
      });
    }
  };

  const handleUpdateCredit = async (e) => {
    e.preventDefault();
    if (!creditModalItem) return;
    setAlert(null);
    try {
      await api.updateCorporateCreditLimit(creditModalItem.pelanggan_id, creditForm);
      setCreditModalItem(null);
      loadData();
      setAlert({
        type: 'success',
        title: 'Plafon Kredit Diperbarui',
        message: `Plafon kredit ${creditModalItem.nama_perusahaan} telah diperbarui.`,
      });
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Penyesuaian Plafon Ditolak (${err.status || 403})`,
        code: err.code,
        message: err.message,
      });
    }
  };

  const filteredFleet = fleetVehicles.filter((v) =>
    selectedCorpId === 'ALL' ? true : String(v.pelanggan_id) === String(selectedCorpId)
  );

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

      {/* Section 1: Corporate Credit Limit (Plafon Kredit) Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {creditMonitoring.map((corp) => {
          const pct = Number(corp.persentase_utilisasi_plafon || 0);
          return (
            <div
              key={corp.pelanggan_id}
              className="bg-white border border-[#d0d7de] rounded-md p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] font-semibold text-[#0969da]">
                      {corp.kode_pelanggan}
                    </span>
                    <h3 className="text-sm font-bold text-[#1f2328] mt-0.5">
                      {corp.nama_perusahaan}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCreditModalItem(corp);
                      setCreditForm({
                        plafon_kredit: corp.plafon_kredit,
                        sisa_plafon: corp.sisa_plafon,
                      });
                    }}
                    className="p-1.5 rounded border border-[#d0d7de] bg-[#f6f8fa] hover:bg-slate-200/70 text-[#656d76] hover:text-[#1f2328] cursor-pointer"
                    title="Sesuaikan Plafon Kredit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-[#656d76] mt-1 font-mono">
                  NPWP: {corp.npwp || '-'} &middot; Armada: {corp.total_unit_armada} Motor
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#d0d7de] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#656d76]">Plafon Kredit Total:</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatRupiah(corp.plafon_kredit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#656d76]">Plafon Terpakai:</span>
                  <span className="font-mono text-amber-800 tabular-nums">
                    {formatRupiah(corp.plafon_terpakai)} ({pct}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#1f2328]">Sisa Plafon Aktif:</span>
                  <span className="font-mono font-bold text-emerald-700 tabular-nums">
                    {formatRupiah(corp.sisa_plafon)}
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-[#d0d7de] mt-1">
                  <div
                    className={`h-full ${pct > 80 ? 'bg-red-600' : 'bg-[#0969da]'}`}
                    style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section 2: Tabel Kontrak Servis Bulanan (kontrak_korporat) */}
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0969da]" />
            <h2 className="text-sm font-semibold text-[#1f2328]">
              Daftar Kontrak Servis Bulanan Korporat (Tabel `kontrak_korporat`)
            </h2>
          </div>
          <button
            type="button"
            onClick={openNewContractModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Corporate Contract</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                <th className="py-2.5 px-3">Nomor Kontrak</th>
                <th className="py-2.5 px-3">Perusahaan &amp; Jenis Armada</th>
                <th className="py-2.5 px-3">Masa Berlaku</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Kuota / Bln</th>
                <th className="py-2.5 px-3 text-right">SLA</th>
                <th className="py-2.5 px-3 text-right">Diskon</th>
                <th className="py-2.5 px-3 text-right">Unit Motor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d7de] text-xs">
              {contracts.map((k) => (
                <tr key={k.id} className="hover:bg-[#f6f8fa]/70">
                  <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[#0969da] whitespace-nowrap">
                    {k.nomor_kontrak}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-[#1f2328]">{k.nama_perusahaan}</div>
                    <div className="text-[11px] text-[#656d76]">
                      {k.nama_kontrak} ({k.jenis_armada})
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap">
                    {formatDate(k.tanggal_mulai)} &mdash; {formatDate(k.tanggal_berakhir)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-300">
                      {k.status_kontrak}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {k.kuota_servis_bulanan} WO
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    &le; {k.sla_jam_pengerjaan} jam
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {k.diskon_kontrak_persen}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums">
                    {k.jumlah_armada} unit
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Daftar Banyak Motor Korporat (Corporate Multi-Vehicle Fleet) */}
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bike className="w-4 h-4 text-[#0969da]" />
            <h2 className="text-sm font-semibold text-[#1f2328]">
              Daftar Unit Motor Armada Korporat ({filteredFleet.length} Unit Terdaftar)
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-white border border-[#d0d7de] rounded-md p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCorpId('ALL')}
              className={`px-2.5 py-1 rounded cursor-pointer ${
                selectedCorpId === 'ALL'
                  ? 'bg-[#0969da] text-white font-semibold'
                  : 'text-[#656d76]'
              }`}
            >
              Semua Perusahaan
            </button>
            {creditMonitoring.map((c) => (
              <button
                key={c.pelanggan_id}
                type="button"
                onClick={() => setSelectedCorpId(c.pelanggan_id)}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  String(selectedCorpId) === String(c.pelanggan_id)
                    ? 'bg-[#0969da] text-white font-semibold'
                    : 'text-[#656d76]'
                }`}
              >
                {c.nama_perusahaan}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                <th className="py-2.5 px-3">Plat Nomor</th>
                <th className="py-2.5 px-3">Merk &amp; Tipe Unit</th>
                <th className="py-2.5 px-3">Perusahaan Pemilik</th>
                <th className="py-2.5 px-3">Nomor Kontrak</th>
                <th className="py-2.5 px-3 text-right">Odometer</th>
                <th className="py-2.5 px-3 text-right">Frekuensi Servis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d7de] text-xs">
              {filteredFleet.map((v) => (
                <tr key={v.id} className="hover:bg-[#f6f8fa]/70">
                  <td className="py-2.5 px-3 font-mono font-bold">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-[#d0d7de]">
                      {v.plat_nomor}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[#1f2328]">
                    {v.merk} {v.tipe} ({v.tahun})
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#1f2328]">{v.nama_perusahaan}</td>
                  <td className="py-2.5 px-3 font-mono text-[#0969da]">{v.nomor_kontrak || '-'}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {formatNumber(v.kilometer_terakhir)} km
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {v.jumlah_servis || 0} WO
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create Corporate Contract */}
      <ModalDialog
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        title="Buat Kontrak Servis Bulanan Korporat Baru"
      >
        <form onSubmit={handleCreateContract} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Nomor Kontrak</label>
              <input
                type="text"
                value={contractForm.nomor_kontrak}
                onChange={(e) => setContractForm({ ...contractForm, nomor_kontrak: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Pelanggan Korporat</label>
              <select
                value={contractForm.pelanggan_id}
                onChange={(e) => setContractForm({ ...contractForm, pelanggan_id: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
                required
              >
                {creditMonitoring.map((c) => (
                  <option key={c.pelanggan_id} value={c.pelanggan_id}>
                    {c.kode_pelanggan} — {c.nama_perusahaan}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">Nama Kontrak</label>
            <input
              type="text"
              value={contractForm.nama_kontrak}
              onChange={(e) => setContractForm({ ...contractForm, nama_kontrak: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Jenis Armada</label>
              <select
                value={contractForm.jenis_armada}
                onChange={(e) => setContractForm({ ...contractForm, jenis_armada: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
              >
                <option value="KURIR_LOGISTIK">KURIR_LOGISTIK</option>
                <option value="RENTAL_MOTOR">RENTAL_MOTOR</option>
                <option value="OPERASIONAL_KANTOR">OPERASIONAL_KANTOR</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={contractForm.tanggal_mulai}
                onChange={(e) => setContractForm({ ...contractForm, tanggal_mulai: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Tanggal Berakhir</label>
              <input
                type="date"
                value={contractForm.tanggal_berakhir}
                onChange={(e) => setContractForm({ ...contractForm, tanggal_berakhir: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#d0d7de] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsContractModalOpen(false)}
              className="px-3 py-1.5 rounded-md border border-[#d0d7de] bg-[#f6f8fa]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[#1f883d] hover:bg-[#1a7f37] text-white font-semibold cursor-pointer"
            >
              Simpan Kontrak
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal Adjust Credit Limit */}
      <ModalDialog
        isOpen={Boolean(creditModalItem)}
        onClose={() => setCreditModalItem(null)}
        title={`Penyesuaian Plafon Kredit: ${creditModalItem?.nama_perusahaan || ''}`}
      >
        <form onSubmit={handleUpdateCredit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">Plafon Kredit Total (Rp)</label>
            <input
              type="number"
              min="0"
              value={creditForm.plafon_kredit}
              onChange={(e) => setCreditForm({ ...creditForm, plafon_kredit: e.target.value })}
              className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">Sisa Plafon Tersedia (Rp)</label>
            <input
              type="number"
              min="0"
              value={creditForm.sisa_plafon}
              onChange={(e) => setCreditForm({ ...creditForm, sisa_plafon: e.target.value })}
              className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
              required
            />
          </div>
          <div className="pt-3 border-t border-[#d0d7de] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreditModalItem(null)}
              className="px-3 py-1.5 rounded-md border border-[#d0d7de] bg-[#f6f8fa]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[#1f883d] hover:bg-[#1a7f37] text-white font-semibold cursor-pointer"
            >
              Update Plafon Kredit
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

