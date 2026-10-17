-- ============================================================================
-- KALAWA SERVICE — WORKSHOP MANAGEMENT & CORPORATE BILLING ERP
-- File: 03_seed_data.sql
-- Deskripsi: Data Uji Lengkap (Cabang, Users 4 Role, Pelanggan Individu &
--            Korporat, Kontrak Armada, Motor, Jasa Servis, Supplier,
--            Suku Cadang, Work Order, Pembayaran, dan Tagihan Kolektif)
-- ============================================================================

BEGIN;

-- Kosongkan tabel dengan urutan aman dan reset sequence
TRUNCATE TABLE
    tagihan_kolektif_detail,
    tagihan_kolektif,
    pembayaran,
    work_order_suku_cadang,
    work_order_servis,
    work_order,
    kontrak_korporat,
    suku_cadang,
    supplier,
    jasa_servis,
    motor,
    pelanggan,
    users,
    cabang
RESTART IDENTITY CASCADE;

-- ============================================================================
-- 1. SEED TABEL CABANG (3 Cabang di Kalimantan Tengah)
-- ============================================================================
INSERT INTO cabang (kode_cabang, nama_cabang, alamat, kota, telepon, status_aktif) VALUES
('CBG-PKY-01', 'Kalawa Service Cabang Palangka Raya Utama', 'Jl. Tjilik Riwut Km. 3,5 No. 88, Menteng', 'Palangka Raya', '0536-3221890', TRUE),
('CBG-SMP-02', 'Kalawa Service Cabang Sampit Timur', 'Jl. Jend. Ahmad Yani No. 42, Mentawa Baru Hulu', 'Sampit', '0531-21450', TRUE),
('CBG-PBN-03', 'Kalawa Service Cabang Pangkalan Bun', 'Jl. Iskandar No. 19, Madurejo, Arut Selatan', 'Pangkalan Bun', '0532-24811', TRUE);

-- ============================================================================
-- 2. SEED TABEL USERS (4 Role Utama + Mekanik Tambahan)
--    Password default demo: "kalawa123"
-- ============================================================================
INSERT INTO users (cabang_id, username, nama_lengkap, email, password_hash, role, status_aktif) VALUES
(1, 'admin_cabang', 'Hendra Wijaya, S.T.', 'hendra.admin@kalawaservice.co.id', '$2b$10$KalawaDemoHashAdminCabang1234567890123456789012', 'admin_cabang', TRUE),
(1, 'kasir_utama', 'Nadia Putri Maharani', 'nadia.kasir@kalawaservice.co.id', '$2b$10$KalawaDemoHashKasirUtama12345678901234567890123', 'kasir', TRUE),
(1, 'mekanik_senior', 'Budi Santoso', 'budi.mekanik@kalawaservice.co.id', '$2b$10$KalawaDemoHashMekanikSenior12345678901234567890', 'mekanik', TRUE),
(1, 'petugas_gudang', 'Rizky Pratama', 'rizky.gudang@kalawaservice.co.id', '$2b$10$KalawaDemoHashPetugasGudang12345678901234567890', 'gudang', TRUE),
(1, 'mekanik_andi', 'Andi Kurniawan', 'andi.mekanik@kalawaservice.co.id', '$2b$10$KalawaDemoHashMekanikAndi1234567890123456789012', 'mekanik', TRUE),
(2, 'mekanik_sampit', 'Dedi Hermawan', 'dedi.mekanik@kalawaservice.co.id', '$2b$10$KalawaDemoHashMekanikSampit12345678901234567890', 'mekanik', TRUE),
(2, 'kasir_sampit', 'Siti Rahmawati', 'siti.kasir@kalawaservice.co.id', '$2b$10$KalawaDemoHashKasirSampit1234567890123456789012', 'kasir', TRUE);

-- ============================================================================
-- 3. SEED TABEL PELANGGAN (5 Individu B2C & 3 Perusahaan Korporat B2B)
-- ============================================================================
INSERT INTO pelanggan (
    kode_pelanggan, nama_pelanggan, telepon, email, alamat,
    tipe_pelanggan, nama_perusahaan, npwp, pic_nama, plafon_kredit, sisa_plafon
) VALUES
-- Pelanggan Individu (B2C)
('CUST-IND-001', 'Arif Rahman Hakim', '0812-5091-1120', 'arif.hakim@gmail.com', 'Jl. Garuda Induk No. 14, Palangka Raya', 'INDIVIDU', NULL, NULL, NULL, 0, 0),
('CUST-IND-002', 'Dewi Sartika Narang', '0813-4902-3381', 'dewi.narang@yahoo.com', 'Jl. Rajawali Km. 5 No. 27, Palangka Raya', 'INDIVIDU', NULL, NULL, NULL, 0, 0),
('CUST-IND-003', 'Yohanes Kurniadi', '0852-4810-9942', 'yohanes.k@outlook.com', 'Jl. G. Obos XII No. 8, Menteng, Palangka Raya', 'INDIVIDU', NULL, NULL, NULL, 0, 0),
('CUST-IND-004', 'Muhammad Fauzan', '0821-5531-7804', 'mfauzan.sampit@gmail.com', 'Jl. Baamang Tengah I No. 5, Sampit', 'INDIVIDU', NULL, NULL, NULL, 0, 0),
('CUST-IND-005', 'Clara Oktaviani', '0811-5209-4410', 'clara.oktaviani@gmail.com', 'Jl. Diponegoro No. 61, Palangka Raya', 'INDIVIDU', NULL, NULL, NULL, 0, 0),

-- Pelanggan Korporat (B2B)
-- Perhatikan sisa_plafon awal diset penuh; saat pembayaran PLAFON_KORPORAT diinsert di bawah, trigger akan otomatis memotong sisa_plafon!
('CUST-CORP-001', 'PT Borneo Ekspres Logistik', '0536-4210990', 'fleet@borneoekspres.co.id', 'Kawasan Pergudangan Tjilik Riwut Km. 7 Blok A2, Palangka Raya', 'KORPORAT', 'PT Borneo Ekspres Logistik', '01.348.992.1-711.000', 'Bpk. Antonius Wibowo (Fleet Manager)', 25000000, 25000000),
('CUST-CORP-002', 'CV Kahayan Trans Nusantara', '0536-3245811', 'ops@kahayantrans.id', 'Jl. RTA Milono Km. 2,5 No. 102, Palangka Raya', 'KORPORAT', 'CV Kahayan Trans Nusantara', '82.119.405.6-711.000', 'Ibu Maya Sari (Operational Head)', 15000000, 15000000),
('CUST-CORP-003', 'PT Sampit Niaga Kurir', '0531-33910', 'armada@sampitniaga.co.id', 'Jl. HM Arsyad Km. 4 No. 17, Sampit', 'KORPORAT', 'PT Sampit Niaga Kurir', '09.412.881.3-712.000', 'Bpk. Lukman Hakim (GA Supervisor)', 12000000, 12000000);

-- ============================================================================
-- 4. SEED TABEL KONTRAK KORPORAT (B2B Fleet Contracts)
-- ============================================================================
INSERT INTO kontrak_korporat (
    nomor_kontrak, pelanggan_id, cabang_utama_id, nama_kontrak, jenis_armada,
    tanggal_mulai, tanggal_berakhir, kuota_servis_bulanan, diskon_kontrak_persen,
    sla_jam_pengerjaan, status_kontrak, catatan
) VALUES
('KTR-B2B-2026-001', 6, 1, 'Kontrak Pemeliharaan Armada Kurir Ekspres 2026', 'KURIR_LOGISTIK', '2026-01-01', '2026-12-31', 45, 10.00, 12, 'AKTIF', 'Prioritas servis cepat < 12 jam untuk armada kurir dalam kota Palangka Raya.'),
('KTR-B2B-2026-002', 7, 1, 'Kontrak Servis Berkala Unit Rental Motor Harian/Bulanan', 'RENTAL_MOTOR', '2026-01-01', '2026-12-31', 30, 7.50, 24, 'AKTIF', 'Pengecekan wajib rem, ban, dan oli setiap kelipatan 2.500 Km.'),
('KTR-B2B-2026-003', 8, 2, 'Kontrak Servis Armada Distribusi Sampit Timur', 'KURIR_LOGISTIK', '2026-02-01', '2026-12-31', 25, 8.00, 18, 'AKTIF', 'Tagihan kolektif diterbitkan setiap tanggal 28 akhir bulan.');

-- ============================================================================
-- 5. SEED TABEL MOTOR (Individu & Armada Korporat)
-- ============================================================================
INSERT INTO motor (pelanggan_id, plat_nomor, merk, tipe, tahun, warna, nomor_rangka, kilometer_terakhir) VALUES
-- Motor Pelanggan Individu (1-5)
(1, 'KH 1234 AB', 'Honda', 'Vario 160 CBS', 2024, 'Hitam Matte', 'MH1KF0112RK102931', 14250),
(2, 'KH 2891 QA', 'Yamaha', 'NMAX 155 Connected', 2023, 'Biru Doff', 'MH3SG5620PK291844', 22800),
(3, 'KH 4410 BX', 'Honda', 'PCX 160 ABS', 2024, 'Putih Mutiara', 'MH1KF7110RK441022', 9600),
(4, 'KH 5109 SM', 'Yamaha', 'Aerox 155 CyberCity', 2023, 'Merah Hitam', 'MH3SG6410PK510988', 18400),
(5, 'KH 6012 TG', 'Honda', 'Scoopy Prestige', 2025, 'Hijau Matte', 'MH1JM3115SK601205', 4300),

-- Armada Korporat PT Borneo Ekspres Logistik (pelanggan_id = 6) — 4 Motor Kurir
(6, 'KH 8011 BE', 'Honda', 'BeAT Street eSP', 2024, 'Silver Hitam', 'MH1JM8110RK801101', 34500),
(6, 'KH 8012 BE', 'Honda', 'BeAT Deluxe CBS', 2024, 'Hitam', 'MH1JM8112RK801102', 31200),
(6, 'KH 8013 BE', 'Honda', 'Supra X 125 FI', 2023, 'Merah Hitam', 'MH1JB9115PK801103', 46800),
(6, 'KH 8014 BE', 'Yamaha', 'Gear 125 Standard', 2024, 'Kuning Hitam', 'MH3SE8810RK801104', 28900),

-- Armada Korporat CV Kahayan Trans Nusantara (pelanggan_id = 7) — 3 Motor Rental
(7, 'KH 9101 KT', 'Honda', 'Vario 125 ISS', 2024, 'Merah Matte', 'MH1JM5118RK910101', 19700),
(7, 'KH 9102 KT', 'Yamaha', 'Fazzio Hybrid Neo', 2024, 'Cyan Pastel', 'MH3SE9210RK910102', 12400),
(7, 'KH 9103 KT', 'Honda', 'ADV 160 ABS', 2023, 'Abu-abu Doff', 'MH1KF8114PK910103', 27300),

-- Armada Korporat PT Sampit Niaga Kurir (pelanggan_id = 8) — 2 Motor Kurir Sampit
(8, 'KH 7701 SN', 'Honda', 'Revo X FI', 2023, 'Hitam', 'MH1JB7111PK770101', 41500),
(8, 'KH 7702 SN', 'Yamaha', 'Vega Force DB', 2023, 'Biru Hitam', 'MH3UE2110PK770102', 38900);

-- ============================================================================
-- 6. SEED TABEL JASA SERVIS
-- ============================================================================
INSERT INTO jasa_servis (kode_jasa, nama_jasa, kategori, harga_jasa, estimasi_menit, deskripsi) VALUES
('SRV-REG-001', 'Servis Berkala Injeksi Lengkap (Tune Up)', 'Servis Berkala', 85000, 45, 'Pembersihan throttle body, cek busi, filter udara, setel klep, dan reset ECM.'),
('SRV-CVT-002', 'Servis & Pembersihan Transmisi CVT Matic', 'Transmisi CVT', 65000, 40, 'Bongkar pasang rumah CVT, pembersihan debu kampas ganda, dan pemberian grease baru.'),
('SRV-OLI-003', 'Jasa Ganti Oli Mesin & Oli Gardan', 'Pelumasan', 15000, 15, 'Penggantian oli mesin dan oli transmisi gardan beserta pembersihan filter kasa.'),
('SRV-BRK-004', 'Servis Pengereman Cakram & Kuras Minyak Rem', 'Pengereman', 45000, 30, 'Pembersihan kaliper cakram, penggantian kampas rem, dan bleeding minyak rem DOT-4.'),
('SRV-INJ-005', 'Infus Injector & Kalibrasi Sensor FI', 'Mesin & Injeksi', 110000, 50, 'Pembersihan lubang nosel injektor menggunakan cairan khusus bertekanan dan diagnostic scanner.'),
('SRV-ELC-006', 'Pengecekan Kelistrikan, Aki & Sistem Pengisian', 'Kelistrikan', 50000, 35, 'Uji beban tegangan aki, pengecekan kiprok/regulator, spul, dan jalur kabel utama.'),
('SRV-SUS-007', 'Servis Shockbreaker Depan & Ganti Oli Shock', 'Kaki-Kaki', 120000, 60, 'Penggantian sil debu, sil oli shock depan, dan takaran ulang oli suspensi.'),
('SRV-OVH-008', 'Overhaul Kepala Silinder (Top Overhaul)', 'Mesin Berat', 350000, 180, 'Skir klep, pembersihan kerak ruang bakar, ganti paking blok atas, dan cek rantai keteng.');

-- ============================================================================
-- 7. SEED TABEL SUPPLIER
-- ============================================================================
INSERT INTO supplier (kode_supplier, nama_supplier, kontak_person, telepon, email, alamat, kota) VALUES
('SUP-AST-001', 'PT Astra Otoparts Kalimantan Cab. Palangka Raya', 'Herry Setiawan', '0536-3228100', 'sales.pky@astra-otoparts.co.id', 'Jl. Tjilik Riwut Km. 5 No. 12', 'Palangka Raya'),
('SUP-YGP-002', 'CV Sumber Makmur Yamaha Genuine Parts', 'Taufik Hidayat', '0536-3231990', 'order@sumbermakmurpart.id', 'Jl. Ahmad Yani No. 78, Pahandut', 'Palangka Raya'),
('SUP-FED-003', 'PT Federal Karya Mandiri Distribusi', 'Chandra Wijaya', '0511-4312800', 'kalimantan@federalkarya.co.id', 'Jl. A. Yani Km. 9,2 Gudang Blok C', 'Banjarmasin'),
('SUP-DNS-004', 'PT Denso & NGK Spark Plugs Borneo', 'Rina Kusuma', '0531-22901', 'rina.borneo@densoparts.co.id', 'Jl. MT Haryono No. 34', 'Sampit');

-- ============================================================================
-- 8. SEED TABEL SUKU CADANG (Termasuk Item Stok Kritis / Di Bawah Stok Minimum)
-- ============================================================================
INSERT INTO suku_cadang (
    supplier_id, kode_sku, nama_part, kategori, satuan,
    harga_beli, harga_jual, stok_saat_ini, stok_minimum, lokasi_rak
) VALUES
-- Stok Aman
(1, 'SKU-OLI-001', 'Oli AHM SPX-2 10W-30 Full Synthetic 0.8L', 'Pelumas', 'BOTOL', 52000, 68000, 48, 12, 'RAK-A1'),
(2, 'SKU-OLI-002', 'Oli Yamalube Super Matic 10W-40 1.0L', 'Pelumas', 'BOTOL', 56000, 74000, 35, 10, 'RAK-A2'),
(1, 'SKU-OLI-003', 'Oli Gardan Transmisi Matic 120ml', 'Pelumas', 'TUBE', 12000, 18000, 60, 15, 'RAK-A3'),
-- Stok Kritis (Digunakan juga untuk Skenario Debugging #3: sisa stok kecil!)
(1, 'SKU-BRK-004', 'Kampas Rem Cakram Depan Vario/PCX ABS (Dispad)', 'Pengereman', 'SET', 48000, 65000, 3, 8, 'RAK-B1'),
(3, 'SKU-BRK-005', 'Kampas Rem Tromol Belakang Federal', 'Pengereman', 'SET', 28000, 42000, 22, 8, 'RAK-B2'),
(1, 'SKU-CVT-006', 'V-Belt + Roller Set Honda Vario 160 / PCX 160', 'Transmisi CVT', 'PAKET', 145000, 185000, 4, 6, 'RAK-C1'),
(2, 'SKU-CVT-007', 'Roller Set 6 Pcs Yamaha NMAX / Aerox 155', 'Transmisi CVT', 'SET', 55000, 78000, 18, 6, 'RAK-C2'),
(4, 'SKU-IGN-008', 'Busi NGK Iridium CPR9EAIX-9', 'Pengapian', 'PCS', 72000, 95000, 2, 10, 'RAK-D1'),
(1, 'SKU-FLT-009', 'Filter Udara Ferrox / AHM Vario 125/160', 'Filter', 'PCS', 42000, 58000, 16, 6, 'RAK-D2'),
(4, 'SKU-ELC-010', 'Aki kering Yuasa YTZ6V MF 12V 5Ah', 'Kelistrikan', 'UNIT', 215000, 265000, 3, 5, 'RAK-E1'),
(3, 'SKU-CHN-011', 'Gear Set Rantai Paket Supra X 125 / Revo FI', 'Penggerak Roda', 'PAKET', 135000, 175000, 11, 5, 'RAK-E2'),
(2, 'SKU-BRK-012', 'Minyak Rem Jumbo DOT-4 300ml', 'Pengereman', 'BOTOL', 24000, 35000, 19, 6, 'RAK-B3');

-- ============================================================================
-- 9. SEED TABEL WORK ORDER (8 Work Order Berbagai Status: B2C & B2B)
--    Catatan: Untuk WO yang sudah dibayar, kita masukkan dengan status 'selesai'
--    terlebih dahulu agar trigger mengizinkan penambahan jasa & part, lalu
--    saat record dimasukkan ke tabel `pembayaran`, trigger otomatis mengubah
--    status WO menjadi 'dibayar' dan memotong sisa_plafon jika korporat!
-- ============================================================================
INSERT INTO work_order (
    nomor_wo, cabang_id, motor_id, mekanik_id, kasir_id,
    keluhan, catatan_mekanik, kilometer_masuk, status,
    diskon, kontrak_id, skema_pembayaran, waktu_masuk, waktu_selesai
) VALUES
-- WO 1: Pelanggan Individu (KH 1234 AB) — Akan dibayar TUNAI (status akhir: dibayar)
('WO-2026-0001', 1, 1, 3, 2,
 'Tarikan awal gredek di putaran bawah dan ganti oli rutin 14.000 km.',
 'Rumah CVT sudah dibersihkan, ganti oli SPX-2 dan oli gardan. Kondisi V-belt masih tebal 85%.',
 14250, 'selesai', 0, NULL, 'LANGSUNG', '2026-10-12 08:30:00', '2026-10-12 09:45:00'),

-- WO 2: Pelanggan Individu (KH 2891 QA) — Akan dibayar QRIS (status akhir: dibayar)
('WO-2026-0002', 1, 2, 5, 2,
 'Rem depan terasa dalam dan kurang pakem, sekalian servis injeksi.',
 'Minyak rem dikuras ulang, kaliper dibersihkan, roller CVT diganti 1 set.',
 22800, 'selesai', 10000, NULL, 'LANGSUNG', '2026-10-14 10:15:00', '2026-10-14 11:40:00'),

-- WO 3: Armada Korporat PT Borneo Ekspres Logistik (KH 8011 BE) — Dibayar via PLAFON_KORPORAT (status akhir: dibayar)
('WO-2026-0003', 1, 6, 3, 2,
 'Servis bulanan armada kurir: ganti oli, cek CVT, dan filter udara kotor.',
 'Sudah diganti oli mesin, oli gardan, dan filter udara baru sesuai SLA kontrak.',
 34500, 'selesai', 20000, 1, 'TAGIHAN_KOLEKTIF', '2026-10-15 09:00:00', '2026-10-15 10:20:00'),

-- WO 4: Armada Korporat PT Borneo Ekspres Logistik (KH 8013 BE) — Dibayar via PLAFON_KORPORAT (status akhir: dibayar)
('WO-2026-0004', 1, 8, 5, 2,
 'Rantai motor kurir kendor berisik dan servis berkala 46.000 km.',
 'Penggantian 1 paket gear set rantai Supra X 125 dan oli mesin.',
 46800, 'selesai', 25000, 1, 'TAGIHAN_KOLEKTIF', '2026-10-16 08:45:00', '2026-10-16 10:30:00'),

-- WO 5: Armada Korporat CV Kahayan Trans Nusantara (KH 9101 KT) — Status: SELESAI (Siap dibayar / masuk antrean kasir)
('WO-2026-0005', 1, 10, 3, 2,
 'Unit rental kembali dari penyewa, lampu indikator aki berkedip dan ganti oli.',
 'Tegangan aki lama drop di 10.2V, sudah diganti Aki Yuasa YTZ6V baru dan oli SPX-2.',
 19700, 'selesai', 15000, 2, 'TAGIHAN_KOLEKTIF', '2026-10-17 09:10:00', '2026-10-17 10:25:00'),

-- WO 6: Pelanggan Individu (KH 4410 BX) — Status: SELESAI (Menunggu Pembayaran Kasir; dapat dipakai uji pembayaran!)
('WO-2026-0006', 1, 3, 5, 2,
 'Servis rutin 10.000 km dan pembersihan injektor.',
 'Throttle body & injektor sudah diinfus, performa mesin kembali responsif.',
 9600, 'selesai', 0, NULL, 'LANGSUNG', '2026-10-17 11:00:00', '2026-10-17 12:15:00'),

-- WO 7: Armada Korporat PT Borneo Ekspres Logistik (KH 8012 BE) — Status: DIKERJAKAN
('WO-2026-0007', 1, 7, 3, 2,
 'Mesin brebet saat hujan dan rem belakang kurang pakem.',
 'Sedang dilakukan pengecekan kop busi dan penggantian kampas rem tromol.',
 31200, 'dikerjakan', 10000, 1, 'TAGIHAN_KOLEKTIF', '2026-10-17 13:30:00', NULL),

-- WO 8: Pelanggan Individu Cabang Sampit (KH 5109 SM) — Status: ANTRE
('WO-2026-0008', 2, 4, 6, 7,
 'Suara kasar di bagian CVT belakang dan ganti oli Yamalube.',
 NULL,
 18400, 'antre', 0, NULL, 'LANGSUNG', '2026-10-17 14:20:00', NULL),

-- WO 9: Armada Korporat PT Sampit Niaga Kurir (KH 7701 SN) — Dibayar via PLAFON_KORPORAT di Cabang Sampit
('WO-2026-0009', 2, 13, 6, 7,
 'Servis berkala armada kurir Sampit & ganti busi.',
 'Tune up selesai, busi diganti baru.',
 41500, 'selesai', 15000, 3, 'TAGIHAN_KOLEKTIF', '2026-10-15 13:00:00', '2026-10-15 14:15:00'),

-- WO 10: Pelanggan Individu (KH 6012 TG) — Status: DIBATALKAN
('WO-2026-0010', 1, 5, NULL, 2,
 'Cek berkala 4.000 km (Pelanggan membatalkan karena ada urusan mendadak).',
 'Dibatalkan sebelum pengerjaan dimulai.',
 4300, 'dibatalkan', 0, NULL, 'LANGSUNG', '2026-10-16 15:00:00', NULL);

-- ============================================================================
-- 10. SEED DETAIL JASA SERVIS PADA WORK ORDER (work_order_servis)
-- ============================================================================
INSERT INTO work_order_servis (work_order_id, jasa_servis_id, harga_satuan, subtotal, catatan) VALUES
-- WO 1 (KH 1234 AB)
(1, 1, 85000, 85000, 'Tune up injeksi standar'),
(1, 2, 65000, 65000, 'Pembersihan CVT & grease ulang'),
-- WO 2 (KH 2891 QA)
(2, 1, 85000, 85000, 'Servis berkala NMAX'),
(2, 4, 45000, 45000, 'Servis kaliper & bleeding minyak rem'),
-- WO 3 (KH 8011 BE - Korporat Borneo Ekspres)
(3, 1, 85000, 85000, 'Servis berkala armada kurir'),
(3, 2, 65000, 65000, 'Servis CVT rutin'),
-- WO 4 (KH 8013 BE - Korporat Borneo Ekspres)
(4, 1, 85000, 85000, 'Tune up Supra X 125 kurir'),
(4, 3, 15000, 15000, 'Ganti oli mesin'),
-- WO 5 (KH 9101 KT - Korporat Kahayan Trans)
(5, 1, 85000, 85000, 'Inspeksi unit rental'),
(5, 6, 50000, 50000, 'Cek sistem pengisian & ganti aki'),
-- WO 6 (KH 4410 BX - Individu Selesai, belum dibayar)
(6, 1, 85000, 85000, 'Servis 10.000 km'),
(6, 5, 110000, 110000, 'Infus injektor PCX 160'),
-- WO 7 (KH 8012 BE - Korporat Dikerjakan)
(7, 1, 85000, 85000, 'Tune up mesin brebet'),
-- WO 8 (KH 5109 SM - Individu Antre)
(8, 2, 65000, 65000, 'Pengecekan CVT Aerox'),
-- WO 9 (KH 7701 SN - Korporat Sampit)
(9, 1, 85000, 85000, 'Servis rutin kurir Sampit');

-- ============================================================================
-- 11. SEED DETAIL SUKU CADANG PADA WORK ORDER (work_order_suku_cadang)
--     Trigger `trg_validate_and_deduct_stock` akan otomatis mengurangi stok!
-- ============================================================================
INSERT INTO work_order_suku_cadang (work_order_id, suku_cadang_id, jumlah, harga_satuan, subtotal) VALUES
-- WO 1: Oli SPX-2 (1), Oli Gardan (1)
(1, 1, 1, 68000, 68000),
(1, 3, 1, 18000, 18000),
-- WO 2: Oli Yamalube (1), Roller NMAX (1), Minyak Rem DOT-4 (1)
(2, 2, 1, 74000, 74000),
(2, 7, 1, 78000, 78000),
(2, 12, 1, 35000, 35000),
-- WO 3: Oli SPX-2 (1), Oli Gardan (1), Filter Udara (1)
(3, 1, 1, 68000, 68000),
(3, 3, 1, 18000, 18000),
(3, 9, 1, 58000, 58000),
-- WO 4: Oli SPX-2 (1), Gear Set Rantai Supra X 125 (1)
(4, 1, 1, 68000, 68000),
(4, 11, 1, 175000, 175000),
-- WO 5: Oli SPX-2 (1), Aki Yuasa YTZ6V (1) -> stok Aki dari 3 berkurang 1 jadi 2 (tetap di bawah stok_minimum 5)
(5, 1, 1, 68000, 68000),
(5, 10, 1, 265000, 265000),
-- WO 6: Oli SPX-2 (1)
(6, 1, 1, 68000, 68000),
-- WO 7: Kampas Rem Tromol (1)
(7, 5, 1, 42000, 42000),
-- WO 9: Oli SPX-2 (1)
(9, 1, 1, 68000, 68000);

-- ============================================================================
-- 12. SEED TABEL PEMBAYARAN
--     Trigger `trg_validate_and_process_payment` otomatis mengubah status WO
--     menjadi 'dibayar' dan memotong sisa_plafon untuk PLAFON_KORPORAT!
-- ============================================================================
INSERT INTO pembayaran (
    nomor_kwitansi, work_order_id, kasir_id, metode_pembayaran,
    jumlah_bayar, status_pembayaran, catatan, tanggal_bayar
) VALUES
-- WO 1: Jasa 150.000 + Part 86.000 = 236.000 (TUNAI)
('KWT-2026-0001', 1, 2, 'TUNAI', 236000, 'LUNAS', 'Pembayaran tunai kasir Palangka Raya.', '2026-10-12 09:50:00'),
-- WO 2: Jasa 130.000 + Part 187.000 - Diskon 10.000 = 307.000 (QRIS)
('KWT-2026-0002', 2, 2, 'QRIS', 307000, 'LUNAS', 'Pembayaran via QRIS Bank Kalteng.', '2026-10-14 11:45:00'),
-- WO 3: Jasa 150.000 + Part 144.000 - Diskon 20.000 = 274.000 (PLAFON_KORPORAT - PT Borneo Ekspres Logistik)
('KWT-2026-0003', 3, 2, 'PLAFON_KORPORAT', 274000, 'TERTUNDA_KOLEKTIF', 'Potong plafon kontrak KTR-B2B-2026-001.', '2026-10-15 10:25:00'),
-- WO 4: Jasa 100.000 + Part 243.000 - Diskon 25.000 = 318.000 (PLAFON_KORPORAT - PT Borneo Ekspres Logistik)
('KWT-2026-0004', 4, 2, 'PLAFON_KORPORAT', 318000, 'TERTUNDA_KOLEKTIF', 'Potong plafon kontrak KTR-B2B-2026-001.', '2026-10-16 10:35:00'),
-- WO 9: Jasa 85.000 + Part 68.000 - Diskon 15.000 = 138.000 (PLAFON_KORPORAT - PT Sampit Niaga Kurir)
('KWT-2026-0005', 9, 7, 'PLAFON_KORPORAT', 138000, 'TERTUNDA_KOLEKTIF', 'Potong plafon kontrak KTR-B2B-2026-003 Cabang Sampit.', '2026-10-15 14:20:00');

-- ============================================================================
-- 13. SEED TABEL TAGIHAN KOLEKTIF & DETAIL (Invoicing Bulanan Korporat B2B)
-- ============================================================================
INSERT INTO tagihan_kolektif (
    nomor_invoice, pelanggan_id, kontrak_id, periode_bulan, periode_tahun,
    tanggal_terbit, tanggal_jatuh_tempo, total_wo, total_tagihan,
    status_tagihan, catatan
) VALUES
(
    'INV-CORP-202610-001',
    6, -- PT Borneo Ekspres Logistik
    1, -- KTR-B2B-2026-001
    10,
    2026,
    '2026-10-17',
    '2026-10-31',
    2,
    592000, -- WO-2026-0003 (274.000) + WO-2026-0004 (318.000)
    'BELUM_DIBAYAR',
    'Tagihan kolektif servis armada kurir Oktober 2026 (2 unit selesai).'
),
(
    'INV-CORP-202610-002',
    8, -- PT Sampit Niaga Kurir
    3, -- KTR-B2B-2026-003
    10,
    2026,
    '2026-10-17',
    '2026-10-31',
    1,
    138000, -- WO-2026-0009 (138.000)
    'BELUM_DIBAYAR',
    'Tagihan kolektif servis armada Sampit Oktober 2026.'
);

INSERT INTO tagihan_kolektif_detail (tagihan_kolektif_id, work_order_id, motor_id, nominal_wo) VALUES
(1, 3, 6, 274000),
(1, 4, 8, 318000),
(2, 9, 13, 138000);

COMMIT;

