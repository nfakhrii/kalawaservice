import React, { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { formatRupiah } from "../../utils/formatters";
import {
  StockStatusBadge,
  ModalDialog,
  EmptyState,
  FeedbackModal,
} from "../../components/ui/GitHubComponents";

const INITIAL_FORM = {
  supplier_id: "",
  kode_sku: "",
  nama_part: "",
  harga_jual: 0,
  stok_saat_ini: 0,
  stok_minimum: 0,
  satuan: "PCS",
  cabang_kode: "",
};

export default function SparepartsPage() {
  const { user } = useAuth();

  const role = String(user?.role || "").toLowerCase();
  const isOwner = role === "owner";
  const isAuditor = role === "auditor";
  const isGudang = role === "gudang";
  const canChooseBranch = isOwner || isAuditor;
  const canCreate = isOwner;
  const canDelete = isOwner;
  const canEdit = isOwner || isGudang;

  const [spareparts, setSpareparts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);

  const [selectedBranch, setSelectedBranch] = useState("");
  const [filterStock, setFilterStock] = useState("ALL");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [feedback, setFeedback] = useState({
    isOpen: false,
    type: "error",
    title: "",
    message: "",
  });

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    item: null,
    isDeleting: false,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState(INITIAL_FORM);

  const showFeedback = (type, title, message) => {
    setFeedback({
      isOpen: true,
      type,
      title,
      message,
    });
  };

  const closeFeedback = () => {
    setFeedback((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadData = async () => {
    setLoading(true);

    try {
      const branchParam = canChooseBranch ? selectedBranch || null : null;

      const requests = [api.getSpareparts(branchParam), api.getSuppliers()];

      if (canChooseBranch) {
        requests.push(api.getLookups());
      }

      const results = await Promise.all(requests);

      setSpareparts(results[0].data || []);
      setSuppliers(results[1].data || []);

      if (canChooseBranch) {
        const lookupData = results[2]?.data || {};
        setBranches(lookupData.branches || []);
      }

    } catch (err) {
      showFeedback(
        "error",
        "Gagal Memuat Suku Cadang",
        err.message || "Terjadi kesalahan pada server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch, role]);

  // =========================================================
  // FILTER DATA
  // =========================================================

  const filtered = spareparts.filter((sp) => {
    const qty = Number(sp.stok_saat_ini || 0);
    const min = Number(sp.stok_minimum || 0);

    if (filterStock === "KRITIS" && qty > min) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();

      return (
        sp.kode_sku?.toLowerCase().includes(q) ||
        sp.nama_part?.toLowerCase().includes(q) ||
        sp.nama_supplier?.toLowerCase().includes(q) ||
        sp.nama_cabang?.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const lowStockCount = spareparts.filter((sp) => {
    const qty = Number(sp.stok_saat_ini || 0);
    const min = Number(sp.stok_minimum || 0);

    return qty <= min;
  }).length;

  // =========================================================
  // FORM HANDLERS
  // =========================================================

  const updateForm = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openCreateModal = () => {
    if (!isOwner) return;

    const nextNum = String(spareparts.length + 1).padStart(3, "0");

    setEditingItem(null);

    setFormData({
      ...INITIAL_FORM,
      supplier_id: "",
      kode_sku: `SC${nextNum}`,
      harga_jual: 0,
      stok_saat_ini: 0,
      stok_minimum: 5,
      cabang_kode: selectedBranch || "",
    });

    setIsModalOpen(true);
  };

  const openEditModal = (sp) => {
    if (!canEdit) return;

    setEditingItem(sp);

    setFormData({
      supplier_id: sp.supplier_id || "",
      kode_sku: sp.kode_sku || "",
      nama_part: sp.nama_part || "",
      harga_jual: sp.harga_jual ?? 0,
      stok_saat_ini: sp.stok_saat_ini ?? 0,
      stok_minimum: sp.stok_minimum ?? 0,
      satuan: sp.satuan || "PCS",
      cabang_kode: sp.cabang_kode || "",
    });

    setIsModalOpen(true);
  };

  // =========================================================
  // CREATE / UPDATE
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    const isEditing = Boolean(editingItem);
    const kodeSku = formData.kode_sku;
    const namaPart = formData.nama_part;

    try {
      if (isEditing) {
        const payload = {
          stok_qty: Number(formData.stok_saat_ini),
          stok_minimum: Number(formData.stok_minimum),
          cabang_kode: formData.cabang_kode,
        };

        // Owner dapat mengubah master dan stok.
        if (isOwner) {
          payload.suku_cadang_nama = formData.nama_part;
          payload.suku_cadang_harga_satuan = Number(formData.harga_jual);
        }

        // Gunakan kode SKU, bukan ID gabungan SKU:cabang.
        await api.updateSparepart(
          editingItem.suku_cadang_kode || editingItem.kode_sku,
          payload
        );
      } else {
        if (!isOwner) {
          throw new Error("Hanya owner yang dapat membuat master sparepart.");
        }

        if (!formData.cabang_kode) {
          throw new Error("Pilih cabang tujuan untuk stok awal sparepart.");
        }

        const payload = {
          suku_cadang_kode: formData.kode_sku,
          suku_cadang_nama: formData.nama_part,
          suku_cadang_harga_satuan: Number(formData.harga_jual),
          stok_qty: Number(formData.stok_saat_ini),
          stok_minimum: Number(formData.stok_minimum),
          cabang_kode: formData.cabang_kode,
          supplier_id: formData.supplier_id || null,
        };

        await api.createSparepart(payload);
      }

      setIsModalOpen(false);

      showFeedback(
        "success",
        isEditing
          ? "Suku Cadang Berhasil Diperbarui"
          : "Suku Cadang Berhasil Ditambahkan",
        isEditing
          ? `SKU ${kodeSku} berhasil diperbarui pada cabang ${formData.cabang_kode}.`
          : `SKU ${kodeSku} (${namaPart}) berhasil disimpan.`
      );

      await loadData();
    } catch (err) {
      showFeedback(
        "error",
        isEditing
          ? "Gagal Memperbarui Suku Cadang"
          : "Gagal Menambahkan Suku Cadang",
        err.message || "Terjadi kesalahan pada server."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = (item) => {
    if (!canDelete) return;

    setDeleteModal({
      isOpen: true,
      item,
      isDeleting: false,
    });
  };

  const confirmDelete = async () => {
    const item = deleteModal.item;

    if (!item || deleteModal.isDeleting || !isOwner) {
      return;
    }

    setDeleteModal((prev) => ({
      ...prev,
      isDeleting: true,
    }));

    try {
      // Hapus berdasarkan kode master SKU.
      await api.deleteSparepart(item.suku_cadang_kode || item.kode_sku);

      setDeleteModal({
        isOpen: false,
        item: null,
        isDeleting: false,
      });

      showFeedback(
        "success",
        "Suku Cadang Berhasil Dihapus",
        `SKU ${item.kode_sku} (${item.nama_part}) berhasil dihapus.`
      );

      await loadData();
    } catch (err) {
      setDeleteModal({
        isOpen: false,
        item: null,
        isDeleting: false,
      });

      showFeedback(
        "error",
        "Gagal Menghapus Suku Cadang",
        err.message || "Terjadi kesalahan pada server."
      );
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        {/* HEADER & FILTER */}
        <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* FILTER CABANG */}
            {canChooseBranch && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#656d76]">
                  Cabang
                </label>

                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-[#d0d7de] rounded-md"
                >
                  <option value="">Semua Cabang</option>

                  {branches.map((branch) => {
                    const kode =
                      branch.cabang_kode || branch.kode_cabang || branch.id;

                    const nama =
                      branch.cabang_nama ||
                      branch.nama_cabang ||
                      branch.nama ||
                      kode;

                    return (
                      <option key={kode} value={kode}>
                        {kode} — {nama}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* FILTER STOK */}
            <div className="flex items-center gap-1 bg-white border border-[#d0d7de] rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setFilterStock("ALL")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                  filterStock === "ALL"
                    ? "bg-[#0969da] text-white font-semibold"
                    : "text-[#656d76] hover:text-[#1f2328]"
                }`}
              >
                <span>All SKU</span>

                <span className="rounded-full px-1.5 py-0 text-[11px] font-mono bg-slate-200/80 text-slate-700">
                  {spareparts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStock("KRITIS")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                  filterStock === "KRITIS"
                    ? "bg-[#0969da] text-white font-semibold"
                    : "text-[#656d76] hover:text-[#1f2328]"
                }`}
              >
                <span>Low Stock (≤ Min)</span>

                <span className="rounded-full px-1.5 py-0 text-[11px] font-mono bg-amber-100 text-amber-800">
                  {lowStockCount}
                </span>
              </button>
            </div>
          </div>

          {/* SEARCH & CREATE */}
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

            {canCreate && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Sparepart SKU</span>
              </button>
            )}
          </div>
        </div>

        {/* INFO ROLE */}
        {isGudang && (
          <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-800">
            Menampilkan stok cabang {user?.kode_cabang} — {user?.nama_cabang}.
            Anda hanya dapat mengubah jumlah stok dan batas stok minimum.
          </div>
        )}

        {isAuditor && (
          <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-800">
            Mode auditor: data hanya dapat dilihat dan tidak dapat diubah.
          </div>
        )}

        {/* TABLE */}
        {filtered.length === 0 && !loading ? (
          <EmptyState
            title="Suku cadang tidak ditemukan"
            description="Ubah filter atau kata kunci pencarian SKU."
          />
        ) : loading ? (
          <div className="p-8 text-center text-xs text-[#656d76]">
            Memuat data suku cadang...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Kode SKU</th>
                  <th className="py-2.5 px-3">Nama Suku Cadang</th>

                  {canChooseBranch && !selectedBranch && (
                    <th className="py-2.5 px-3">Cabang</th>
                  )}

                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Status Stok</th>
                  <th className="py-2.5 px-3 text-right">Stok Saat Ini</th>
                  <th className="py-2.5 px-3 text-right">Batas Min</th>
                  <th className="py-2.5 px-3 text-right">Harga Jual</th>

                  {canEdit && <th className="py-2.5 px-3 text-right">Aksi</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#d0d7de] text-xs">
                {filtered.map((sp) => (
                  <tr
                    key={sp.id || `${sp.kode_sku}-${sp.cabang_kode}`}
                    className="hover:bg-[#f6f8fa]/70 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[#0969da] whitespace-nowrap">
                      {sp.kode_sku}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#1f2328]">
                        {sp.nama_part}
                      </div>
                    </td>

                    {canChooseBranch && !selectedBranch && (
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-[#1f2328]">
                          {sp.nama_cabang || "-"}
                        </div>
                        <div className="font-mono text-[10px] text-[#656d76]">
                          {sp.cabang_kode || "-"}
                        </div>
                      </td>
                    )}

                    <td className="py-2.5 px-3">
                      <div className="font-medium text-[#1f2328]">
                        {sp.nama_supplier || "-"}
                      </div>
                      <div className="font-mono text-[10px] text-[#656d76]">
                        {sp.kode_supplier || ""}
                      </div>
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

                    <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-[#1f2328] tabular-nums">
                      {formatRupiah(sp.harga_jual)}
                    </td>

                    {canEdit && (
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(sp)}
                            title="Edit"
                            className="p-1.5 rounded border border-[#d0d7de] bg-white hover:bg-[#f6f8fa] text-[#656d76] hover:text-[#1f2328] cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(sp)}
                              title="Hapus"
                              className="p-1.5 rounded border border-[#d0d7de] bg-white hover:bg-red-50 text-[#656d76] hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================
          CREATE / EDIT MODAL
      ===================================================== */}

      <ModalDialog
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsModalOpen(false);
        }}
        title={
          editingItem
            ? `Edit Suku Cadang: ${editingItem.kode_sku}`
            : "Tambah Suku Cadang Baru"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* OWNER: PILIH CABANG */}
          {isOwner && (
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Cabang Stok
              </label>

              <select
                value={formData.cabang_kode}
                onChange={(e) => updateForm("cabang_kode", e.target.value)}
                disabled={Boolean(editingItem)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#d0d7de] rounded-md disabled:bg-[#f6f8fa] disabled:text-[#656d76]"
                required
              >
                <option value="">-- Pilih Cabang --</option>

                {branches.map((branch) => {
                  const kode =
                    branch.cabang_kode || branch.kode_cabang || branch.id;

                  const nama =
                    branch.cabang_nama ||
                    branch.nama_cabang ||
                    branch.nama ||
                    kode;

                  return (
                    <option key={kode} value={kode}>
                      {kode} — {nama}
                    </option>
                  );
                })}
              </select>

              {editingItem && (
                <p className="mt-1 text-[10px] text-[#656d76]">
                  Cabang tidak dapat diganti saat mengedit stok.
                </p>
              )}
            </div>
          )}

          {/* GUDANG: INFORMASI CABANG */}
          {isGudang && (
            <div className="p-2 rounded bg-[#f6f8fa] border border-[#d0d7de]">
              <div className="font-semibold text-[#1f2328]">
                Cabang: {user?.nama_cabang || user?.kode_cabang}
              </div>
              <div className="font-mono text-[10px] text-[#656d76]">
                {user?.kode_cabang}
              </div>
            </div>
          )}

          {/* OWNER: SUPPLIER SAAT MEMBUAT MASTER */}
          {isOwner && !editingItem && (
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Supplier
              </label>

              <select
                value={formData.supplier_id}
                onChange={(e) => updateForm("supplier_id", e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-[#d0d7de] rounded-md"
              >
                <option value="">-- Tanpa Supplier --</option>

                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.kode_supplier} — {sup.nama_supplier}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* KODE SKU */}
          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">
              Kode SKU
            </label>

            <input
              type="text"
              value={formData.kode_sku}
              onChange={(e) => updateForm("kode_sku", e.target.value)}
              disabled={Boolean(editingItem)}
              className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md disabled:bg-[#f6f8fa] disabled:text-[#656d76]"
              required
            />
          </div>

          {/* NAMA MASTER: OWNER SAJA */}
          {isOwner && (
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Nama Suku Cadang
              </label>

              <input
                type="text"
                value={formData.nama_part}
                onChange={(e) => updateForm("nama_part", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md"
                required
              />
            </div>
          )}

          {/* GUDANG: NAMA HANYA INFORMASI */}
          {isGudang && (
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Nama Suku Cadang
              </label>

              <input
                type="text"
                value={formData.nama_part}
                readOnly
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md bg-[#f6f8fa] text-[#656d76]"
              />
            </div>
          )}

          {/* HARGA MASTER: OWNER SAJA */}
          {isOwner && (
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Harga Jual (Rp)
              </label>

              <input
                type="number"
                min="0"
                value={formData.harga_jual}
                onChange={(e) => updateForm("harga_jual", e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
          )}

          {/* GUDANG: HARGA HANYA INFORMASI */}
          {isGudang && (
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Harga Jual
              </label>

              <input
                type="text"
                value={formatRupiah(formData.harga_jual)}
                readOnly
                className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md bg-[#f6f8fa] text-[#656d76]"
              />
            </div>
          )}

          {/* STOK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Stok Saat Ini
              </label>

              <input
                type="number"
                min="0"
                value={formData.stok_saat_ini}
                onChange={(e) => updateForm("stok_saat_ini", e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1f2328] mb-1">
                Batas Stok Minimum
              </label>

              <input
                type="number"
                min="0"
                value={formData.stok_minimum}
                onChange={(e) => updateForm("stok_minimum", e.target.value)}
                className="w-full px-2.5 py-1.5 font-mono border border-[#d0d7de] rounded-md"
                required
              />
            </div>
          </div>

          {/* SATUAN */}
          <div>
            <label className="block font-semibold text-[#1f2328] mb-1">
              Satuan
            </label>

            <input
              type="text"
              value="PCS"
              readOnly
              className="w-full px-2.5 py-1.5 border border-[#d0d7de] rounded-md bg-[#f6f8fa] text-[#656d76]"
            />

            <p className="mt-1 text-[10px] text-[#656d76]">
              Satuan saat ini mengikuti nilai PCS pada repository.
            </p>
          </div>

          {/* FOOTER */}
          <div className="pt-3 border-t border-[#d0d7de] flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 rounded-md border border-[#d0d7de] bg-[#f6f8fa] text-[#1f2328] disabled:opacity-60"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-md bg-[#1f883d] hover:bg-[#1a7f37] text-white font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Menyimpan..."
                : editingItem
                ? "Simpan Perubahan"
                : "Simpan Suku Cadang"}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* =====================================================
          DELETE CONFIRMATION
      ===================================================== */}

      <ModalDialog
        isOpen={deleteModal.isOpen}
        onClose={() => {
          if (deleteModal.isDeleting) return;

          setDeleteModal({
            isOpen: false,
            item: null,
            isDeleting: false,
          });
        }}
        title="Konfirmasi Hapus Suku Cadang"
        subtitle="Pastikan suku cadang yang dipilih sudah benar."
      >
        <div className="space-y-4 text-sm">
          <p className="text-[#1f2328]">
            Apakah kamu yakin ingin menghapus suku cadang{" "}
            <strong>
              {deleteModal.item?.kode_sku}
              {" — "}
              {deleteModal.item?.nama_part}
            </strong>
            ?
          </p>

          <p className="text-xs text-red-600">
            Penghapusan master akan menghapus catatan stok pada seluruh cabang.
            Sparepart yang sudah digunakan dalam Work Order tidak dapat dihapus.
          </p>

          <div className="flex items-center justify-end gap-2 border-t border-[#d0d7de] pt-3">
            <button
              type="button"
              disabled={deleteModal.isDeleting}
              onClick={() =>
                setDeleteModal({
                  isOpen: false,
                  item: null,
                  isDeleting: false,
                })
              }
              className="px-3 py-1.5 rounded-md border border-[#d0d7de] bg-white text-[#1f2328] font-medium hover:bg-[#f6f8fa] disabled:opacity-60"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={deleteModal.isDeleting}
              onClick={confirmDelete}
              className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deleteModal.isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      </ModalDialog>

      {/* FEEDBACK */}
      <FeedbackModal
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={closeFeedback}
      />
    </div>
  );
}
