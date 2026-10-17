import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { formatNumber } from '../../utils/formatters';
import {
  CustomerTypeBadge,
  ModalDialog,
  AlertBanner,
  EmptyState,
} from '../../components/ui/GitHubComponents';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    pelanggan_id: '',
    plat_nomor: '',
    merk: 'Honda',
    tipe: '',
    tahun: 2024,
    warna: 'Hitam',
    nomor_rangka: '',
    kilometer_terakhir: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, cRes] = await Promise.all([api.getVehicles(), api.getCustomers()]);
      setVehicles(vRes.data || []);
      setCustomers(cRes.data || []);
    } catch (err) {
      setAlert({ type: 'error', title: 'Gagal memuat data motor', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = vehicles.filter((v) => {
    if (filterType !== 'ALL' && v.tipe_pelanggan !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        v.plat_nomor?.toLowerCase().includes(q) ||
        v.merk?.toLowerCase().includes(q) ||
        v.tipe?.toLowerCase().includes(q) ||
        v.nama_pelanggan?.toLowerCase().includes(q) ||
        v.nama_perusahaan?.toLowerCase().includes(q) ||
        v.nomor_rangka?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      pelanggan_id: customers[0]?.id || '',
      plat_nomor: `KH${Math.floor(1000 + Math.random() * 9000)}ZZ`,
      merk: 'Honda',
      tipe: 'Vario 160 CBS',
      tahun: 2024,
      warna: 'Hitam Matte',
      nomor_rangka: `MH1KF${Math.floor(100000 + Math.random() * 900000)}`,
      kilometer_terakhir: 5000,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (v) => {
    setEditingItem(v);
    setFormData({
      pelanggan_id: v.pelanggan_id,
      plat_nomor: v.plat_nomor,
      merk: v.merk,
      tipe: v.tipe,
      tahun: v.tahun,
      warna: v.warna || '',
      nomor_rangka: v.nomor_rangka,
      kilometer_terakhir: v.kilometer_terakhir || 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    try {
      if (editingItem) {
        await api.updateVehicle(editingItem.id, formData);
        setAlert({
          type: 'success',
          title: 'Data Motor Diperbarui',
          message: `Unit ${formData.plat_nomor} berhasil diperbarui.`,
        });
      } else {
        await api.createVehicle(formData);
        setAlert({
          type: 'success',
          title: 'Motor Baru Terdaftar',
          message: `Unit ${formData.plat_nomor} berhasil didaftarkan.`,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Gagal Menyimpan Motor (${err.status || 400})`,
        code: err.code,
        message: err.message,
      });
    }
  };

  const handleDelete = async (v) => {
    if (!window.confirm(`Hapus data motor ${v.plat_nomor}?`)) return;
    setAlert(null);
    try {
      await api.deleteVehicle(v.id);
      setAlert({
        type: 'success',
        title: 'Motor Dihapus',
        message: `Unit ${v.plat_nomor} berhasil dihapus.`,
      });
      loadData();
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Gagal Menghapus (${err.status || 400})`,
        code: err.code,
        message: err.message,
      });
    }
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

      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-white border border-[#d0d7de] rounded-md p-0.5">
            {[
              { id: 'ALL', label: 'All Vehicles', count: vehicles.length },
              {
                id: 'INDIVIDU',
                label: 'Individual (B2C)',
                count: vehicles.filter((v) => v.tipe_pelanggan === 'INDIVIDU').length,
              },
              {
                id: 'KORPORAT',
                label: 'Corporate Fleet (B2B)',
                count: vehicles.filter((v) => v.tipe_pelanggan === 'KORPORAT').length,
              },
            ].map((t) => {
              const active = filterType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterType(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    active ? 'bg-[#0969da] text-white font-semibold' : 'text-[#656d76] hover:text-[#1f2328]'
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
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#656d76] absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari plat KH 1234 AB, rangka, pemilik..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#d0d7de] rounded-md focus:outline-none focus:border-[#0969da]"
              />
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Vehicle</span>
            </button>
          </div>
        </div>

        {filtered.length === 0 && !loading ? (
          <EmptyState title="Data motor tidak ditemukan" description="Tambahkan unit motor baru atau ubah kata kunci pencarian." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Plat Nomor</th>
                  <th className="py-2.5 px-3">Merk &amp; Tipe Motor</th>
                  <th className="py-2.5 px-3">Nomor Rangka (VIN)</th>
                  <th className="py-2.5 px-3">Pemilik / Armada</th>
                  <th className="py-2.5 px-3 text-right">Tahun</th>
                  <th className="py-2.5 px-3 text-right">Odometer (Km)</th>
                  <th className="py-2.5 px-3 text-right">Riwayat WO</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-[#f6f8fa]/70 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 border border-[#d0d7de] text-[#1f2328]">
                        {v.plat_nomor}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#1f2328]">
                        {v.merk} {v.tipe}
                      </div>
                      <div className="text-[11px] text-[#656d76]">Warna: {v.warna || '-'}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-[#656d76]">
                      {v.nomor_rangka}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-[#1f2328]">
                        {v.nama_perusahaan || v.nama_pelanggan}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <CustomerTypeBadge tipe={v.tipe_pelanggan} />
                        <span className="font-mono text-[10px] text-[#656d76]">{v.kode_pelanggan}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums">
                      {v.tahun}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums">
                      {formatNumber(v.kilometer_terakhir)} km
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums">
                      {v.total_servis || 0}x
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(v)}
                          className="p-1.5 rounded border border-[#d0d7de] bg-white hover:bg-[#f6f8fa] text-[#656d76] hover:text-[#1f2328] cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v)}
                          className="p-1.5 rounded border border-[#d0d7de] bg-white hover:bg-red-50 text-[#656d76] hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Motor: ${editingItem.plat_nomor}` : 'Registrasi Unit Motor Baru'}
        subtitle="Hubungkan unit motor ke pelanggan individu atau armada perusahaan korporat."
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">Pemilik Pelanggan / Armada Korporat</label>
            <select
              value={formData.pelanggan_id}
              onChange={(e) => setFormData({ ...formData, pelanggan_id: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-[#f6f8fa] border border-[#d0d7de] rounded-md"
              required
            >
              <option value="">-- Pilih Pelanggan --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.tipe_pelanggan}] {c.kode_pelanggan} — {c.nama_perusahaan || c.nama_pelanggan}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Plat Nomor (Monospace)</label>
              <input
                type="text"
                value={formData.plat_nomor}
                onChange={(e) => setFormData({ ...formData, plat_nomor: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                placeholder="KH 1234 AB"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Nomor Rangka (VIN)</label>
              <input
                type="text"
                value={formData.nomor_rangka}
                onChange={(e) => setFormData({ ...formData, nomor_rangka: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Merk</label>
              <select
                value={formData.merk}
                onChange={(e) => setFormData({ ...formData, merk: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
              >
                <option value="Honda">Honda</option>
                <option value="Yamaha">Yamaha</option>
                <option value="Suzuki">Suzuki</option>
                <option value="Kawasaki">Kawasaki</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#1f2328] mb-1">Tipe / Model Motor</label>
              <input
                type="text"
                value={formData.tipe}
                onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
                placeholder="Vario 160 CBS"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Tahun Perakitan</label>
              <input
                type="number"
                value={formData.tahun}
                onChange={(e) => setFormData({ ...formData, tahun: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Warna</label>
              <input
                type="text"
                value={formData.warna}
                onChange={(e) => setFormData({ ...formData, warna: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Odometer Terakhir (Km)</label>
              <input
                type="number"
                min="0"
                value={formData.kilometer_terakhir}
                onChange={(e) => setFormData({ ...formData, kilometer_terakhir: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#d0d7de] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 rounded-md border border-[#d0d7de] bg-[#f6f8fa] text-[#1f2328] font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[#1f883d] hover:bg-[#1a7f37] text-white font-semibold cursor-pointer"
            >
              Simpan Unit Motor
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

