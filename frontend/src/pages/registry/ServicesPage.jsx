import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah } from '../../utils/formatters';
import { ModalDialog, AlertBanner, EmptyState } from '../../components/ui/GitHubComponents';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    kode_jasa: '',
    nama_jasa: '',
    kategori: 'Servis Berkala',
    harga_jasa: 65000,
    estimasi_menit: 30,
    deskripsi: '',
  });

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await api.getServices();
      setServices(res.data || []);
    } catch (err) {
      setAlert({ type: 'error', title: 'Gagal memuat katalog jasa', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const filtered = services.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.kode_jasa?.toLowerCase().includes(q) ||
      s.nama_jasa?.toLowerCase().includes(q) ||
      s.kategori?.toLowerCase().includes(q)
    );
  });

  const openCreateModal = () => {
    const nextNum = String(services.length + 1).padStart(3, '0');
    setEditingItem(null);
    setFormData({
      kode_jasa: `JS${nextNum}`,
      nama_jasa: '',
      kategori: 'Servis Berkala',
      harga_jasa: 65000,
      estimasi_menit: 30,
      deskripsi: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (s) => {
    setEditingItem(s);
    setFormData({
      kode_jasa: s.kode_jasa,
      nama_jasa: s.nama_jasa,
      kategori: s.kategori,
      harga_jasa: s.harga_jasa,
      estimasi_menit: s.estimasi_menit || 30,
      deskripsi: s.deskripsi || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    try {
      if (editingItem) {
        await api.updateService(editingItem.id, formData);
        setAlert({
          type: 'success',
          title: 'Jasa Servis Diperbarui',
          message: `${formData.nama_jasa} telah diperbarui.`,
        });
      } else {
        await api.createService(formData);
        setAlert({
          type: 'success',
          title: 'Jasa Servis Ditambahkan',
          message: `${formData.nama_jasa} (${formData.kode_jasa}) ditambahkan ke katalog.`,
        });
      }
      setIsModalOpen(false);
      loadServices();
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Gagal Menyimpan Jasa (${err.status || 400})`,
        code: err.code,
        message: err.message,
      });
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Hapus layanan ${s.nama_jasa}?`)) return;
    setAlert(null);
    try {
      await api.deleteService(s.id);
      setAlert({ type: 'success', title: 'Jasa Servis Dihapus', message: `${s.nama_jasa} dihapus.` });
      loadServices();
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Penghapusan Ditolak (${err.status || 400})`,
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
          <div className="text-xs font-semibold text-[#1f2328]">
            Katalog Standar Jasa Servis Bengkel ({filtered.length} Layanan)
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#656d76] absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode atau nama jasa..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#d0d7de] rounded-md focus:outline-none focus:border-[#0969da]"
              />
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Service</span>
            </button>
          </div>
        </div>

        {filtered.length === 0 && !loading ? (
          <EmptyState title="Katalog jasa kosong" description="Belum ada layanan servis yang sesuai pencarian." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Kode Jasa</th>
                  <th className="py-2.5 px-3">Nama Layanan &amp; Deskripsi</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3 text-right">Estimasi</th>
                  <th className="py-2.5 px-3 text-right">Digunakan</th>
                  <th className="py-2.5 px-3 text-right">Tarif Standar</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f6f8fa]/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[#0969da] whitespace-nowrap">
                      {s.kode_jasa}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#1f2328]">{s.nama_jasa}</div>
                      {s.deskripsi && (
                        <div className="text-[11px] text-[#656d76] mt-0.5 max-w-lg">{s.deskripsi}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-[#d0d7de] text-[11px] font-medium">
                        {s.kategori}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums">
                      {s.estimasi_menit} mnt
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums">
                      {s.frekuensi_penggunaan || 0} WO
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap">
                      {formatRupiah(s.harga_jasa)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-1.5 rounded border border-[#d0d7de] bg-white hover:bg-[#f6f8fa] text-[#656d76] hover:text-[#1f2328] cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
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
        title={editingItem ? `Edit Jasa: ${editingItem.kode_jasa}` : 'Tambah Katalog Jasa Servis'}
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Kode Jasa (Monospace)</label>
              <input
                type="text"
                value={formData.kode_jasa}
                onChange={(e) => setFormData({ ...formData, kode_jasa: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Kategori</label>
              <input
                type="text"
                value={formData.kategori}
                onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">Nama Layanan Jasa</label>
            <input
              type="text"
              value={formData.nama_jasa}
              onChange={(e) => setFormData({ ...formData, nama_jasa: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Tarif Jasa (Rp)</label>
              <input
                type="number"
                min="0"
                value={formData.harga_jasa}
                onChange={(e) => setFormData({ ...formData, harga_jasa: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Estimasi Pengerjaan (Menit)</label>
              <input
                type="number"
                min="5"
                value={formData.estimasi_menit}
                onChange={(e) => setFormData({ ...formData, estimasi_menit: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">Deskripsi Pekerjaan</label>
            <textarea
              rows={2}
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
            />
          </div>

          <div className="pt-3 border-t border-[#d0d7de] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 rounded-md border border-[#d0d7de] bg-[#f6f8fa] text-[#1f2328]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[#1f883d] hover:bg-[#1a7f37] text-white font-semibold cursor-pointer"
            >
              Simpan Jasa
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

