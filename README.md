# Kalawa Service — Workshop Management & Corporate Billing ERP

**Kalawa Service** adalah aplikasi web *Full-Stack Monorepo* manajemen bengkel motor multi-cabang (Pelanggan Individu / B2C) serta ekspansi layanan manajemen armada korporat (Perusahaan Kurir & Rental Motor / B2B). Proyek ini dibangun untuk memenuhi spesifikasi **Tugas 4 — Aplikasi Pengakses Basis Data, Perubahan Requirement, Debugging, Backup & Recovery** berbasis skema asli **Kelompok 1** menggunakan **PostgreSQL 15+**, **Node.js + Express.js**, dan **React 18 + Tailwind CSS (Impeccable GitHub Primer Design)**.

---

## 1. Struktur Monorepo & Arsitektur Sistem

```text
kalawa/
├── database/
│   ├── Kelompok1_schema.sql            # Skema asli Kelompok 1 (17 tabel uppercase ber-tanda kutip)
│   ├── Kelompok1_insert.sql            # Data awal realistis Kelompok 1 (Cabang, Pegawai, Pelanggan, Motor, dll)
│   ├── Kelompok1_admin_security.sql    # 6 Role & Akun RBAC (owner, admin_cabang, kasir, mekanik, gudang, auditor)
│   ├── Kelompok1_programming.sql       # 3 Stored Procedure, 1 Function, 2 Trigger, 4 View Kelompok 1
│   ├── Kelompok1_migration_tugas4.sql  # Perubahan Requirement B2B (KONTRAK_KORPORAT, TAGIHAN_KOLEKTIF, dll)
│   ├── 04_backup_recovery.sh           # Otomatisasi pg_dump, simulasi bencana, pg_restore & verifikasi COUNT(*)
│   └── backups/                        # Arsip hasil eksekusi backup (.sql & .dump)
├── backend/
│   ├── src/
│   │   ├── config/db.js                # Koneksi PostgreSQL pg.Pool & utilitas reset database otomatis
│   │   ├── middlewares/                # JWT Auth, 6-Role RBAC (Kelompok 1), & Defensive Error Handler
│   │   ├── repositories/               # Parameterized SQL ke tabel Kelompok 1 ("WORK_ORDER", "MOTOR", dll)
│   │   ├── services/                   # Logika bisnis & pemanggilan Stored Procedure / Function PostgreSQL
│   │   ├── controllers/                # REST API HTTP Request/Response Handlers
│   │   └── routes/                     # Definisi endpoint API terproteksi RBAC
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/                 # AppShell (Subpath Breadcrumb, Quick 6-Role Bar, GitHub Primer Tabs)
│   │   ├── context/AuthContext.jsx     # Sesi JWT & 1-Click Quick-Switch 6 Akun Demo Kelompok 1
│   │   ├── pages/                      # Halaman Registry, Operations, Corporate, Analytics, & Diagnostics
│   │   └── services/api.js             # Klien HTTP REST API & Audit Log API
│   └── package.json
└── README.md
```

---

## 2. Penjelasan Sebelum & Sesudah Perubahan Requirement (Layanan Korporat B2B)

### Kondisi Awal (`Kelompok1_schema.sql` s/d `Kelompok1_programming.sql` — Operasional B2C Individu)
1. **Entitas Pelanggan Tunggal:** Tabel `"PELANGGAN"` mencatat pelanggan perorangan (`pelanggan_id`, `pelanggan_nama`, `pelanggan_alamat`, `pelanggan_telepon`).
2. **Pembayaran Transaksional Kasir:** Pembayaran dicatat langsung pada kolom `pembayaran_*` di tabel `"WORK_ORDER"` (`TUNAI`, `TRANSFER`, `QRIS`).
3. **Trigger & Procedure:**
   - Trigger `"trg_kurangi_stok"` otomatis memotong `"STOK_CABANG"` saat ada item baru di `"WO_SUKU_CADANG"`.
   - Stored Procedure `sp_hitung_total_tagihan` menghitung biaya jasa dan suku cadang untuk satu Work Order.
   - Function `fn_status_garansi_by_wo` mengecek keabsahan klaim garansi servis.

### Kondisi Sesudah Perubahan Requirement (`Kelompok1_migration_tugas4.sql` — Ekspansi Armada Korporat B2B)
1. **Evolusi Skema `"PELANGGAN"` (`ALTER TABLE`):**
   - Menambahkan atribut korporat: `tipe_pelanggan` (`'INDIVIDU'` / `'KORPORAT'`), `nama_perusahaan`, `npwp`, `pic_nama`, `plafon_kredit`, dan `sisa_plafon`.
2. **Tabel Baru Manajemen Kontrak Armada (`"KONTRAK_KORPORAT"`):**
   - Menyimpan kontrak servis armada korporat (`KK001`, `KK002`, `KK003`) dengan kuota bulanan, diskon kontrak, dan SLA waktu pengerjaan.
3. **Tabel Baru Penagihan Kolektif Akhir Bulan (`"TAGIHAN_KOLEKTIF"`):**
   - Mengkonsolidasikan banyak `"WORK_ORDER"` armada korporat yang selesai menjadi satu tagihan bulanan (`TK001`, `TK002`).
4. **Pembaruan Stored Procedure & Helper Function:**
   - `sp_lunasi_tagihan_kolektif`: Melunasi tagihan kolektif korporat sekaligus memulihkan `sisa_plafon` pelanggan korporat.
   - `fn_hitung_total_tagihan`: Function wrapper untuk menghitung total tagihan dinamis dalam query laporan.
   - Integrasi view audit trail `"AUDIT_LOG"` JSONB di UI System Diagnostics.

---

## 3. Dokumentasi 5 Skenario Debugging & Defensive Error Handling

Seluruh skenario dapat diuji langsung melalui antarmuka UI **`/app/system/diagnostics`** dengan tombol **1-Click Test**:

| No | Skenario Pengujian | Endpoint Target | Mekanisme Validasi (Express / PostgreSQL Kelompok 1) | Respons HTTP |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Input Work Order Tanpa Motor** | `POST /api/operations/work-orders` | Validasi input `motor_id` di Express Service + Constraint `NOT NULL` & `FOREIGN KEY (motor_nopol) REFERENCES "MOTOR"(motor_nopol)`. | **`400 Bad Request`** |
| **2** | **Pembayaran Dobel (Double Payment)** | `POST /api/operations/payments` | Pengecekan status `pembayaran_status = 'Lunas'` di dalam transaksi `BEGIN ... SELECT FOR UPDATE ... ROLLBACK`. | **`409 Conflict`** |
| **3** | **Stok Suku Cadang Tidak Cukup** | `POST /api/operations/work-orders/:woId/spareparts` | Trigger `"trg_kurangi_stok"` + CHECK constraint `chk_stok_qty` (`stok_jumlah >= 0`) pada `"STOK_CABANG"`. | **`422 Unprocessable Entity`** |
| **4** | **User Tanpa Privilege (RBAC)** | `POST /api/operations/payments` | Middleware JWT RBAC memeriksa role pengguna (`user_mekanik` dilarang mencatat pembayaran kasir). | **`403 Forbidden`** |
| **5** | **Query Laporan Rentang Tanggal Kosong** | `GET /api/analytics/branch-revenue?startDate=2025-01-01&endDate=2025-01-31` | Penggunaan `COALESCE(SUM(jumlah_bayar), 0)` pada query JOIN PostgreSQL tanpa menghasilkan `null`. | **`200 OK`** (`data: []`) |

---

## 4. Langkah-Langkah Eksekusi Backup & Recovery PostgreSQL

Skrip otomasi tersedia di [`database/04_backup_recovery.sh`](database/04_backup_recovery.sh):

```bash
# Backup database kalawa_db ke format SQL dan binary dump (.dump)
pg_dump -h 127.0.0.1 -p 5432 -U postgres -Fp -f ./database/backups/kalawa_full_backup.sql kalawa_db
pg_dump -h 127.0.0.1 -p 5432 -U postgres -Fc -f ./database/backups/kalawa_full_backup.dump kalawa_db

# Restore ke database pengujian
pg_restore -h 127.0.0.1 -p 5432 -U postgres --clean --if-exists -d kalawa_db_recovery_test ./database/backups/kalawa_full_backup.dump
```

---

## 5. Cara Menjalankan Proyek

### 1. Inisialisasi Database PostgreSQL
Pastikan PostgreSQL berjalan di `127.0.0.1:5432` dan file `backend/.env` telah terkonfigurasi:
```bash
cd backend
npm install
npm run db:reset
```

### 2. Menjalankan Backend Server (Port 5000)
```bash
cd backend
npm start
```

### 3. Menjalankan Frontend Vite + React (Port 5173)
```bash
cd frontend
npm install
npm run dev
```
Buka browser di **`http://localhost:5173`**.
