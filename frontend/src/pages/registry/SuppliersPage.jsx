import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { ModalDialog, AlertBanner, EmptyState } from '../../components/ui/GitHubComponents';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const { user } = useAuth();

  const currentRole = String(user?.role || '').toLowerCase();

  const canManageSuppliers = ['owner', 'role_owner'].includes(currentRole);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    kode_supplier: '',
    nama_supplier: '',
    telepon: '',
    alamat: '',
  });

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.getSuppliers();
      setSuppliers(res.data || []);
    } catch (err) {
      setAlert({ type: 'error', title: 'Gagal memuat supplier', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filtered = suppliers.filter((s) => {
    if (!search.trim()) return true;
  
    const q = search.toLowerCase();
  
    return (
      s.kode_supplier?.toLowerCase().includes(q) ||
      s.nama_supplier?.toLowerCase().includes(q) ||
      s.telepon?.toLowerCase().includes(q) ||
      s.alamat?.toLowerCase().includes(q)
    );
  });

  const openCreateModal = () => {
    if (!canManageSuppliers) return;
    const nextNum = String(suppliers.length + 1).padStart(3, '0');
  
    setEditingItem(null);
    setFormData({
      kode_supplier: `SP${nextNum}`,
      nama_supplier: '',
      telepon: '',
      alamat: '',
    });
  
    setIsModalOpen(true);
  };

  const openEditModal = (s) => {
    if (!canManageSuppliers) return;
    setEditingItem(s);
  
    setFormData({
      kode_supplier: s.kode_supplier,
      nama_supplier: s.nama_supplier,
      telepon: s.telepon || '',
      alamat: s.alamat || '',
    });
  
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    if (!canManageSuppliers) return;
    e.preventDefault();
    setAlert(null);
    try {
      if (editingItem) {
        await api.updateSupplier(editingItem.id, formData);
        setAlert({
          type: 'success',
          title: 'Data Supplier Diperbarui',
          message: `${formData.nama_supplier} telah diperbarui.`,
        });
      } else {
        await api.createSupplier(formData);
        setAlert({
          type: 'success',
          title: 'Supplier Baru Ditambahkan',
          message: `${formData.nama_supplier} berhasil disimpan.`,
        });
      }
      setIsModalOpen(false);
      loadSuppliers();
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Gagal Menyimpan Supplier (${err.status || 400})`,
        code: err.code,
        message: err.message,
      });
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Hapus supplier ${s.nama_supplier}?`)) return;
    setAlert(null);
    try {
      await api.deleteSupplier(s.id);
      setAlert({ type: 'success', title: 'Supplier Dihapus', message: `${s.nama_supplier} dihapus.` });
      loadSuppliers();
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
            Daftar Mitra Supplier Suku Cadang ({filtered.length} Mitra)
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#656d76] absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari supplier atau kota..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#d0d7de] rounded-md focus:outline-none focus:border-[#0969da]"
              />
            </div>
            {canManageSuppliers && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Supplier</span>
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 && !loading ? (
          <EmptyState title="Supplier tidak ditemukan" description="Ubah kata kunci pencarian." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Kode Supplier</th>
                  <th className="py-2.5 px-3">Nama Perusahaan Supplier</th>
                  <th className="py-2.5 px-3">Telepon</th>
                  <th className="py-2.5 px-3">Alamat</th>
                  <th className="py-2.5 px-3 text-right">Jumlah SKU</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f6f8fa]/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[#0969da] whitespace-nowrap">
                      {s.kode_supplier}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#1f2328]">
                        {s.nama_supplier}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs">
                      {s.telepon}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-[#1f2328]">
                        {s.alamat}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums">
                      {s.jumlah_sku || 0} SKU
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {canManageSuppliers && (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            className="p-1.5 rounded border border-[#d0d7de] bg-white hover:bg-[#f6f8fa] text-[#656d76] hover:text-[#1f2328] cursor-pointer"
                            title="Edit supplier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(s)}
                            className="p-1.5 rounded border border-[#d0d7de] bg-white hover:bg-red-50 text-[#656d76] hover:text-red-600 cursor-pointer"
                            title="Hapus supplier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
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
        title={editingItem ? `Edit Supplier: ${editingItem.kode_supplier}` : 'Tambah Supplier Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Kode Supplier
              </label>
              <input
                type="text"
                value={formData.kode_supplier}
                onChange={(e) =>
                  setFormData({ ...formData, kode_supplier: e.target.value })
                }
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">
              Nama Perusahaan Supplier
            </label>
            <input
              type="text"
              value={formData.nama_supplier}
              onChange={(e) =>
                setFormData({ ...formData, nama_supplier: e.target.value })
              }
              className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Telepon
              </label>
              <input
                type="text"
                value={formData.telepon}
                onChange={(e) =>
                  setFormData({ ...formData, telepon: e.target.value })
                }
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Alamat
              </label>
              <input
                type="text"
                value={formData.alamat}
                onChange={(e) =>
                  setFormData({ ...formData, alamat: e.target.value })
                }
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
                required
              />
            </div>
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
              Simpan Supplier
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

