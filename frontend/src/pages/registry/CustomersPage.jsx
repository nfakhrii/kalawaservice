import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah } from '../../utils/formatters';
import {
  CustomerTypeBadge,
  ModalDialog,
  AlertBanner,
  EmptyState,
} from '../../components/ui/GitHubComponents';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [filterTab, setFilterTab] = useState('ALL'); // ALL, INDIVIDU, KORPORAT
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const { token } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    kode_pelanggan: '',
    nama_pelanggan: '',
    telepon: '',
    alamat: '',
    tipe_pelanggan: 'INDIVIDU',
    nama_perusahaan: '',
    npwp: '',
    pic_nama: '',
    plafon_kredit: 0,
    sisa_plafon: 0,
  });

  const loadCustomers = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
  
    try {
      const res = await api.getCustomers();
      setCustomers(res.data || []);
    } catch (err) {
      // Jangan tampilkan popup berulang ketika polling berjalan.
      if (!silent) {
        window.alert(
          `Gagal memuat data pelanggan.\n\n${
            err.message || 'Terjadi kesalahan pada server.'
          }`
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!token) {
      setCustomers([]);
      return;
    }
  
    // Ambil data saat halaman dibuka atau role berubah.
    setCustomers([]);
    loadCustomers();
  
    // Periksa apakah ada data baru setiap 5 detik.
    const intervalId = setInterval(() => {
      loadCustomers({ silent: true });
    }, 5000);
  
    // Hentikan polling saat komponen dilepas atau token berubah.
    return () => {
      clearInterval(intervalId);
    };
  }, [token]);

  const filtered = customers.filter((c) => {
    if (filterTab !== 'ALL' && c.tipe_pelanggan !== filterTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.kode_pelanggan?.toLowerCase().includes(q) ||
        c.nama_pelanggan?.toLowerCase().includes(q) ||
        c.nama_perusahaan?.toLowerCase().includes(q) ||
        c.telepon?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countAll = customers.length;
  const countInd = customers.filter((c) => c.tipe_pelanggan === 'INDIVIDU').length;
  const countCorp = customers.filter((c) => c.tipe_pelanggan === 'KORPORAT').length;

  const openCreateModal = () => {
    const nextNum = String(customers.length + 1).padStart(3, '0');
    setEditingItem(null);
    setFormData({
      kode_pelanggan: `PL${nextNum}`,
      nama_pelanggan: '',
      telepon: '',
      alamat: '',
      tipe_pelanggan: filterTab === 'KORPORAT' ? 'KORPORAT' : 'INDIVIDU',
      nama_perusahaan: '',
      npwp: '',
      pic_nama: '',
      plafon_kredit: 15000000,
      sisa_plafon: 15000000,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      kode_pelanggan: item.kode_pelanggan,
      nama_pelanggan: item.nama_pelanggan,
      telepon: item.telepon || '',
      alamat: item.alamat || '',
      tipe_pelanggan: item.tipe_pelanggan || 'INDIVIDU',
      nama_perusahaan: item.nama_perusahaan || '',
      npwp: item.npwp || '',
      pic_nama: item.pic_nama || '',
      plafon_kredit: item.plafon_kredit || 0,
      sisa_plafon: item.sisa_plafon || 0,
    });
    setIsModalOpen(true);
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    try {
      // Buat payload tanpa field email.
      const {
        email,
        ...customerPayload
      } = formData;

      if (editingItem) {
        await api.updateCustomer(
          editingItem.id,
          customerPayload
        );
      } else {
        await api.createCustomer(customerPayload);
      }

      // Tutup modal setelah operasi berhasil.
      setIsModalOpen(false);

      // Ambil data terbaru melalui API tanpa reload browser.
      await loadCustomers();

      setAlert({
        type: 'success',
        title: editingItem
          ? 'Berhasil Diperbarui'
          : 'Pelanggan Baru Ditambahkan',
        message: editingItem
          ? `Data pelanggan ${formData.nama_pelanggan} telah diperbarui.`
          : `Pelanggan ${formData.nama_pelanggan} (${formData.kode_pelanggan}) berhasil disimpan.`,
      });
    } catch (err) {
      // Tutup modal dan tampilkan popup error.
      setIsModalOpen(false);

      window.alert(
        `Gagal menyimpan data pelanggan.\n\n${err.message || 'Terjadi kesalahan pada server.'}`
      );
    }
  };
  
  const handleDelete = async (item) => {
    if (
      !window.confirm(
        `Hapus pelanggan ${item.nama_pelanggan} (${item.kode_pelanggan})?`
      )
    ) {
      return;
    }

    setAlert(null);

    try {
      await api.deleteCustomer(item.id);

      await loadCustomers();

      setAlert({
        type: 'success',
        title: 'Pelanggan Dihapus',
        message: `Data ${item.nama_pelanggan} berhasil dihapus.`,
      });
    } catch (err) {
      window.alert(
        `Penghapusan pelanggan gagal.\n\n${err.message || 'Terjadi kesalahan pada server.'}`
      );
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
        {/* Filter Bar: All / Individual / Corporate + Search + New Customer CTA */}
        <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-white border border-[#d0d7de] rounded-md p-0.5">
            {[
              { id: 'ALL', label: 'All', count: countAll },
              { id: 'INDIVIDU', label: 'Individual', count: countInd },
              { id: 'KORPORAT', label: 'Corporate', count: countCorp },
            ].map((t) => {
              const active = filterTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterTab(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0969da] text-white font-semibold'
                      : 'text-[#656d76] hover:text-[#1f2328]'
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

          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#656d76] absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode, nama, perusahaan..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#d0d7de] rounded-md focus:outline-none focus:border-[#0969da]"
              />
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Customer</span>
            </button>
          </div>
        </div>

        {/* High-Density Data Table */}
        {filtered.length === 0 && !loading ? (
          <EmptyState
            title="Tidak ada data pelanggan ditemukan"
            description="Coba ubah filter tab (All / Individual / Corporate) atau kata kunci pencarian."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Kode</th>
                  <th className="py-2.5 px-3">Nama Pelanggan / Perusahaan</th>
                  <th className="py-2.5 px-3">Tipe</th>
                  <th className="py-2.5 px-3">Kontak &amp; NPWP</th>
                  <th className="py-2.5 px-3 text-right">Armada Motor</th>
                  <th className="py-2.5 px-3 text-right">Plafon Kredit</th>
                  <th className="py-2.5 px-3 text-right">Sisa Plafon</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f6f8fa]/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[#0969da] whitespace-nowrap">
                      {c.kode_pelanggan}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#1f2328]">
                        {c.nama_perusahaan || c.nama_pelanggan}
                      </div>
                      {c.pic_nama && (
                        <div className="text-[11px] text-[#656d76]">PIC: {c.pic_nama}</div>
                      )}
                      {c.alamat && (
                        <div className="text-[11px] text-[#656d76] truncate max-w-xs">{c.alamat}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <CustomerTypeBadge tipe={c.tipe_pelanggan} />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono text-xs text-[#1f2328]">{c.telepon}</div>
                      {c.npwp && (
                        <div className="font-mono text-[11px] text-[#656d76]">NPWP: {c.npwp}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums">
                      {c.jumlah_motor || 0} unit
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums">
                      {c.tipe_pelanggan === 'KORPORAT' ? formatRupiah(c.plafon_kredit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold tabular-nums">
                      {c.tipe_pelanggan === 'KORPORAT' ? (
                        <span className="text-emerald-700">{formatRupiah(c.sisa_plafon)}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded border border-[#d0d7de] bg-white hover:bg-[#f6f8fa] text-[#656d76] hover:text-[#1f2328] cursor-pointer"
                          title="Edit Pelanggan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded border border-[#d0d7de] bg-white hover:bg-red-50 text-[#656d76] hover:text-red-600 cursor-pointer"
                          title="Hapus Pelanggan"
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

      {/* Modal Create / Edit Pelanggan */}
      <ModalDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Pelanggan: ${editingItem.kode_pelanggan}` : 'Tambah Pelanggan Baru (B2C / B2B)'}
        subtitle="Mendukung pelanggan individu maupun ekspansi layanan korporat (plafon kredit & NPWP)."
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Tipe Pelanggan</label>
              <select
                value={formData.tipe_pelanggan}
                onChange={(e) => {
                  const tipe = e.target.value;
                  const nextNum = String(customers.length + 1).padStart(3, '0');
                  setFormData((prev) => ({
                    ...prev,
                    tipe_pelanggan: tipe,
                    kode_pelanggan: editingItem ? prev.kode_pelanggan : `PL${nextNum}`,
                  }));
                }}
                className="w-full px-2.5 py-1.5 bg-[#f6f8fa] border border-[#d0d7de] rounded-md font-medium"
              >
                <option value="INDIVIDU">INDIVIDU (Pelanggan Perorangan / B2C)</option>
                <option value="KORPORAT">KORPORAT (Perusahaan Kurir / Rental B2B)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Kode Pelanggan</label>
              <input
                type="text"
                value={formData.kode_pelanggan}
                disabled={Boolean(editingItem)}
                onChange={(e) => setFormData({ ...formData, kode_pelanggan: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono bg-[#f6f8fa] border border-[#d0d7de] rounded-md"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                {formData.tipe_pelanggan === 'KORPORAT' ? 'Nama Entitas / Akun' : 'Nama Lengkap Pelanggan'}
              </label>
              <input
                type="text"
                value={formData.nama_pelanggan}
                onChange={(e) => setFormData({ ...formData, nama_pelanggan: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
                placeholder="Contoh: Arif Rahman / PT Borneo Logistik"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">Nomor Telepon</label>
              <input
                type="text"
                value={formData.telepon}
                onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                placeholder="0812-xxxx-xxxx"
                required
              />
            </div>
          </div>

          {formData.tipe_pelanggan === 'KORPORAT' && (
            <div className="p-3 rounded-md bg-blue-50/50 border border-blue-200 space-y-3">
              <div className="font-semibold text-blue-900">
                Atribut Perubahan Requirement — Pelanggan Korporat (B2B)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1f2328] mb-1">Nama Resmi Perusahaan</label>
                  <input
                    type="text"
                    value={formData.nama_perusahaan}
                    onChange={(e) => setFormData({ ...formData, nama_perusahaan: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#d0d7de] rounded-md"
                    placeholder="PT Borneo Ekspres Logistik"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1f2328] mb-1">NPWP Perusahaan</label>
                  <input
                    type="text"
                    value={formData.npwp}
                    onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                    className="w-full px-2.5 py-1.5 font-mono bg-white border border-[#d0d7de] rounded-md"
                    placeholder="01.348.992.1-711.000"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1f2328] mb-1">Plafon Kredit Bulanan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.plafon_kredit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plafon_kredit: e.target.value,
                        sisa_plafon: editingItem ? formData.sisa_plafon : e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 font-mono bg-white border border-[#d0d7de] rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1f2328] mb-1">Sisa Plafon Kredit (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sisa_plafon}
                    onChange={(e) => setFormData({ ...formData, sisa_plafon: e.target.value })}
                    className="w-full px-2.5 py-1.5 font-mono bg-white border border-[#d0d7de] rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#1f2328] mb-1">Nama PIC Armada</label>
                <input
                  type="text"
                  value={formData.pic_nama}
                  onChange={(e) => setFormData({ ...formData, pic_nama: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#d0d7de] rounded-md"
                  placeholder="Bpk. Antonius Wibowo (Fleet Manager)"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Alamat
              </label>
              <input
                type="text"
                value={formData.alamat}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    alamat: e.target.value,
                  }))
                }
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
                placeholder="Alamat pelanggan"
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
              Simpan Data Pelanggan
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

