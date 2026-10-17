/**
 * Format angka ke mata uang Rupiah (Rp)
 */
export function formatRupiah(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format angka ribuan standar (tabular)
 */
export function formatNumber(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Format tanggal (contoh: 17 Okt 2026)
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format tanggal & waktu lengkap (contoh: 17 Okt 2026, 09:10)
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Semantic Status Badges (Sesuai Spesifikasi Bagian 3.4 & Skema Kelompok 1)
 */
export const WO_STATUS_STYLES = {
  antre: 'bg-amber-50 text-amber-800 border border-amber-300',
  dibuat: 'bg-amber-50 text-amber-800 border border-amber-300',
  dikerjakan: 'bg-blue-50 text-blue-700 border border-blue-300',
  diproses: 'bg-blue-50 text-blue-700 border border-blue-300',
  selesai: 'bg-purple-50 text-purple-700 border border-purple-300',
  dibayar: 'bg-emerald-50 text-emerald-700 border border-emerald-300',
  lunas: 'bg-emerald-50 text-emerald-700 border border-emerald-300',
  dibatalkan: 'bg-red-50 text-red-700 border border-red-300',
};

export const ROLE_METADATA = {
  owner: {
    label: 'Owner (Superuser)',
    shortLabel: 'user_owner',
    dbRole: 'role_owner',
    badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-300',
    description:
      'Hak akses penuh seluruh tabel (SELECT, INSERT, UPDATE, DELETE) + pembacaan tabel "AUDIT_LOG".',
  },
  admin_cabang: {
    label: 'Admin Cabang',
    shortLabel: 'user_admin_cabang',
    dbRole: 'role_admin_cabang',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-300',
    description:
      'Mengelola operasional cabang: CABANG, PEGAWAI, PELANGGAN, MOTOR, WORK_ORDER, KONTRAK_KORPORAT & TAGIHAN_KOLEKTIF.',
  },
  kasir: {
    label: 'Kasir Bengkel',
    shortLabel: 'user_kasir',
    dbRole: 'role_kasir',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-300',
    description:
      'Akses VW_PELANGGAN_AMAN, pembaruan pembayaran pada WORK_ORDER, & pelunasan TAGIHAN_KOLEKTIF B2B.',
  },
  mekanik: {
    label: 'Mekanik Servis',
    shortLabel: 'user_mekanik',
    dbRole: 'role_mekanik',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300',
    description:
      'Akses VW_WORK_ORDER_AMAN, update kolom teknis (work_status, work_tgl_selesai, work_keluhan), WO_JASA & WO_SUKU_CADANG.',
  },
  gudang: {
    label: 'Petugas Gudang',
    shortLabel: 'user_gudang',
    dbRole: 'role_petugas_gudang',
    badgeClass: 'bg-purple-50 text-purple-700 border border-purple-300',
    description:
      'Mengelola inventori SUKU_CADANG, SUPPLIER, SUPPLIER_SUKU_CADANG, dan STOK_CABANG per cabang.',
  },
  auditor: {
    label: 'Auditor Internal',
    shortLabel: 'user_auditor',
    dbRole: 'role_auditor',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-300',
    description:
      'Akses Read-Only (SELECT) pada seluruh tabel/view keamanan (VW_PELANGGAN_AMAN, VW_WORK_ORDER_AMAN) & AUDIT_LOG.',
  },
};
