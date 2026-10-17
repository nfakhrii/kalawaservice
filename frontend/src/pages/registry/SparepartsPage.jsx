import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah } from '../../utils/formatters';
import {
  StockStatusBadge,
  ModalDialog,
  AlertBanner,
  EmptyState,
} from '../../components/ui/GitHubComponents';

export default function SparepartsPage() {
  const [spareparts, setSpareparts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filterStock, setFilterStock] = useState('ALL'); // ALL, KRITIS
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    supplier_id: '',
    kode_sku: '',
    nama_part: '',
    kategori: 'Pelumas',
    satuan: 'PCS',
    harga_beli: 45000,
    harga_jual: 60000,
    stok_saat_ini: 15,
    stok_minimum: 5,
    lokasi_rak: 'RAK-A1',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [spRes, supRes] = await Promise.all([api.getSpareparts(), api.getSuppliers()]);
      setSpareparts(spRes.data || []);
      setSuppliers(supRes.data || []);
    } catch (err) {
      setAlert({ type: 'error', title: 'Gagal memuat suku cadang', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = spareparts.filter((sp) => {
    if (filterStock === 'KRITIS' && Number(sp.stok_saat_ini) > Number(sp.stok_minimum)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        sp.kode_sku?.toLowerCase().includes(q) ||
        sp.nama_part?.toLowerCase().includes(q) ||
        sp.kategori?.toLowerCase().includes(q) ||
        sp.nama_supplier?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const lowStockCount = spareparts.filter(
    (sp) => Number(sp.stok_saat_ini) <= Number(sp.stok_minimum)
  ).length;

  const openCreateModal = () => {
    const nextNum = String(spareparts.length + 1).padStart(3, '0');
    setEditingItem(null);
    setFormData({
      supplier_id: suppliers[0]?.id || '',
      kode_sku: `SC${nextNum}`,
      nama_part: '',
      kategori: 'Pelumas',
      satuan: 'PCS',
      harga_beli: 45000,
      harga_jual: 62000,
      stok_saat_ini: 12,
      stok_minimum: 5,
      lokasi_rak: 'RAK-A4',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sp) => {
    setEditingItem(sp);
    setFormData({
      supplier_id: sp.supplier_id,
      kode_sku: sp.kode_sku,
      nama_part: sp.nama_part,
      kategori: sp.kategori,
      satuan: sp.satuan,
      harga_beli: sp.harga_beli,
      harga_jual: sp.harga_jual,
      stok_saat_ini: sp.stok_saat_ini,
      stok_minimum: sp.stok_minimum,
      lokasi_rak: sp.lokasi_rak || 'RAK-A1',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    try {
      if (editingItem) {
        await api.updateSparepart(editingItem.id, formData);
        setAlert({
          type: 'success',
          title: 'Suku Cadang Diperbarui',
          message: `SKU ${formData.kode_sku} berhasil diperbarui.`,
        });
      } else {
        await api.createSparepart(formData);
        setAlert({
          type: 'success',
          title: 'Suku Cadang Baru Ditambahkan',
          message: `SKU ${formData.kode_sku} (${formData.nama_part}) disimpan.`,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setAlert({
        type: 'error',
        title: `Gagal Menyimpan SKU (${err.status || 400})`,
        code: err.code,
        message: err.message,
      });
    }
  };

  const handleDelete = async (sp) => {
    if (!window.confirm(`Hapus suku cadang ${sp.kode_sku} - ${sp.nama_part}?`)) return;
    setAlert(null);
    try {
      await api.deleteSparepart(sp.id);
      setAlert({ type: 'success', title: 'Suku Cadang Dihapus', message: `${sp.kode_sku} dihapus.` });
      loadData();
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
          <div className="flex items-center gap-1 bg-white border border-[#d0d7de] rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setFilterStock('ALL')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                filterStock === 'ALL'
                  ? 'bg-[#0969da] text-white font-semibold'
                  : 'text-[#656d76] hover:text-[#1f2328]'
              }`}
            >
              <span>All SKU</span>
              <span className="rounded-full px-1.5 py-0 text-[11px] font-mono bg-slate-200/80 text-slate-700">
                {spareparts.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStock('KRITIS')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                filterStock === 'KRITIS'
                  ? 'bg-[#0969da] text-white font-semibold'
                  : 'text-[#656d76] hover:text-[#1f2328]'
              }`}
            >
              <span>Low Stock (&le; Min)</span>
              <span className="rounded-full px-1.5 py-0 text-[11px] font-mono bg-amber-100 text-amber-800">
                {lowStockCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#656d76] absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari SKU, nama part, supplier..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#d0d7de] rounded-md focus:outline-none focus:border-[#0969da]"
              />
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Sparepart SKU</span>
            </button>
          </div>
        </div>

        {filtered.length === 0 && !loading ? (
          <EmptyState title="Suku cadang tidak ditemukan" description="Ubah filter atau kata kunci pencarian SKU." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Kode SKU</th>
                  <th className="py-2.5 px-3">Nama Suku Cadang</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Status Stok</th>
                  <th className="py-2.5 px-3 text-right">Stok Saat Ini</th>
                  <th className="py-2.5 px-3 text-right">Batas Min</th>
                  <th className="py-2.5 px-3 text-right">Harga Beli</th>
                  <th className="py-2.5 px-3 text-right">Harga Jual</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {filtered.map((sp) => (
                  <tr key={sp.id} className="hover:bg-[#f6f8fa]/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[#0969da] whitespace-nowrap">
                      {sp.kode_sku}
                      <div className="text-[10px] text-[#656d76]">{sp.lokasi_rak}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#1f2328]">{sp.nama_part}</div>
                      <div className="text-[11px] text-[#656d76]">{sp.kategori}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-[#1f2328]">{sp.nama_supplier}</div>
                      <div className="font-mono text-[10px] text-[#656d76]">{sp.kode_supplier}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StockStatusBadge
                        stokSaatIni={sp.stok_saat_ini}
                        stokMinimum={sp.stok_minimum}
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs font-bold tabular-nums">
                      {sp.stok_saat_ini} {sp.satuan}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-[#656d76] tabular-nums">
                      {sp.stok_minimum} {sp.satuan}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-[#656d76] tabular-nums">
                      {formatRupiah(sp.harga_beli)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-[#1f2328] tabular-nums">
                      {formatRupiah(sp.harga_jual)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(sp)}
                          className="p-1.5 rounded border border-[#d0d7de] bg-white hover:bg-[#f6f8fa] text-[#656d76] hover:text-[#1f2328] cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sp)}
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
        title={editingItem ? `Edit Suku Cadang: ${editingItem.kode_sku}` : 'Tambah Suku Cadang Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">Supplier</label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-[#f6f8fa] border border-[#d0d7de] rounded-md"
              required
            >
              <option value="">-- Pilih Supplier --</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.kode_supplier} — {sup.nama_supplier}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Kode SKU</label>
              <input
                type="text"
                value={formData.kode_sku}
                onChange={(e) => setFormData({ ...formData, kode_sku: e.target.value })}
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
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Lokasi Rak</label>
              <input
                type="text"
                value={formData.lokasi_rak}
                onChange={(e) => setFormData({ ...formData, lokasi_rak: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">Nama Suku Cadang</label>
            <input
              type="text"
              value={formData.nama_part}
              onChange={(e) => setFormData({ ...formData, nama_part: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Harga Beli (Rp)</label>
              <input
                type="number"
                min="0"
                value={formData.harga_beli}
                onChange={(e) => setFormData({ ...formData, harga_beli: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Harga Jual (Rp)</label>
              <input
                type="number"
                min="0"
                value={formData.harga_jual}
                onChange={(e) => setFormData({ ...formData, harga_jual: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Stok Saat Ini</label>
              <input
                type="number"
                min="0"
                value={formData.stok_saat_ini}
                onChange={(e) => setFormData({ ...formData, stok_saat_ini: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Batas Stok Minimum</label>
              <input
                type="number"
                min="0"
                value={formData.stok_minimum}
                onChange={(e) => setFormData({ ...formData, stok_minimum: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Satuan</label>
              <select
                value={formData.satuan}
                onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
              >
                <option value="PCS">PCS</option>
                <option value="SET">SET</option>
                <option value="BOTOL">BOTOL</option>
                <option value="PAKET">PAKET</option>
                <option value="TUBE">TUBE</option>
                <option value="UNIT">UNIT</option>
              </select>
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
              Simpan Suku Cadang
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

