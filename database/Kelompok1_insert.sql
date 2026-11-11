-- =========================================================
-- DATABASE : KALAWA SERVICE
-- DBMS     : PostgreSQL
-- TUGAS 3 - MINGGU 1 (INSERT)
-- =========================================================

-- =========================================================
-- KELOMPOK 1
-- ANGGOTA KELOMPOK : 
-- ARY SIGIT JULIAN (2330105030001)
-- EDWARD CHRISTIAN RUFUS (2330105030019)
-- FEBRIAN NUR HIDAYAT (2330105030026)
-- NAUFAL FAKHRI (2330105030011)
-- RAYDAMAR RIZKYAKA RIYADI (2330205030035)
-- =========================================================


-- =========================================================
-- 1. CABANG
-- INSERT 3 CABANG
-- =========================================================

INSERT INTO "CABANG"
("cabang_kode", "cabang_nama", "cabang_alamat", "cabang_telp", "jam_buka", "jam_tutup", "kapasitas_slot")
VALUES
('CB001', 'Kalawa Service Pahandut', 'Jl. Diponegoro No. 15, Pahandut', '081234567801', '08:00', '17:00', 20),
('CB002', 'Kalawa Service Jekan Raya', 'Jl. Rajawali No. 25, Jekan Raya', '081234567802', '08:00', '17:00', 18),
('CB003', 'Kalawa Service Bukit Batu', 'Jl. Cilik Riwut Km. 12, Bukit Batu', '081234567803', '08:00', '17:00', 15);


-- =========================================================
-- 2. PEGAWAI
-- INSERT 8 PEGAWAI
-- Minimal: Admin, Kasir, Mekanik Umum, Mekanik Spesialis, Petugas Gudang
-- =========================================================

INSERT INTO "PEGAWAI"
("pegawai_id", "cabang_kode", "pegawai_nama", "pegawai_telp", "pegawai_peran", "tanggal_mulai", "status_aktif")
VALUES
('PG001', 'CB001', 'Rinaldi Rizwar', '081300000001', 'Admin', '2023-01-10', TRUE),
('PG002', 'CB001', 'Budi Santoso', '081300000002', 'Kasir', '2023-02-15', TRUE),
('PG003', 'CB001', 'Candra Hasibuan', '081300000003', 'Mekanik Umum', '2022-08-01', TRUE),
('PG004', 'CB002', 'Dedi Kurniawan', '081300000004', 'Mekanik Umum', '2022-09-12', TRUE),
('PG005', 'CB002', 'Renaldy Pratama', '081300000005', 'Mekanik Spesialis', '2023-03-20', TRUE),
('PG006', 'CB003', 'Fajar Hidayat', '081300000006', 'Mekanik Spesialis', '2023-04-10', TRUE),
('PG007', 'CB002', 'Gilang Ramadhan', '081300000007', 'Petugas Gudang', '2023-05-05', TRUE),
('PG008', 'CB003', 'Hendra Setiawan', '081300000008', 'Admin', '2024-01-08', TRUE),
('PG009', 'CB002', 'Andi Pratama', '081300000009', 'Admin', '2024-02-01', TRUE),
('PG010', 'CB002', 'Rizky Firmansyah', '081300000010', 'Kasir', '2024-02-05', TRUE),
('PG011', 'CB003', 'Dina Maharani', '081300000011', 'Kasir', '2024-02-10', TRUE),
('PG012', 'CB001', 'Agus Setiawan', '081300000012', 'Petugas Gudang', '2024-02-15', TRUE),
('PG013', 'CB003', 'Satria Wijaya', '081300000013', 'Petugas Gudang', '2024-02-20', TRUE);


-- =========================================================
-- 3. MEKANIK
-- INSERT 4 MEKANIK
-- =========================================================

INSERT INTO "MEKANIK"
("mekanik_id", "mekanik_keahlian")
VALUES
('PG003', 'Servis dan perawatan umum'),
('PG004', 'Servis dan perawatan umum'),
('PG005', 'Sistem injeksi dan kelistrikan'),
('PG006', 'Mesin dan transmisi');


-- =========================================================
-- 4. PELANGGAN
-- INSERT 6 PELANGGAN
-- =========================================================

INSERT INTO "PELANGGAN"
("pelanggan_id", "pelanggan_nama", "pelanggan_telp",
 "pelanggan_jenis_identitas", "pelanggan_no_identitas",
 "pelanggan_alamat", "pelanggan_cab_favorit", "mekanik_id_pilihan")
VALUES
('PL001', 'Ahmad Fauzi', '082100000001', 'KTP', '6271010101010001',
 'Jl. Seth Adji No. 10, Palangka Raya', 'CB001', 'PG003'),

('PL002', 'Siti Rahma', '082100000002', 'KTP', '6271010101010002',
 'Jl. G. Obos No. 20, Palangka Raya', 'CB002', 'PG005'),

('PL003', 'Rizky Maulana', '082100000003', 'SIM', '2893-8659-235790',
 'Jl. Rajawali No. 35, Palangka Raya', 'CB002', 'PG004'),

('PL004', 'Dewi Lestari', '082100000004', 'KTP', '6271010101010004',
 'Jl. Yos Sudarso No. 18, Palangka Raya', 'CB001', 'PG003'),

('PL005', 'Bayu Pratama', '082100000005', 'KTP', '6271010101010005',
 'Jl. Bukit Keminting No. 12, Palangka Raya', 'CB003', 'PG006'),

('PL006', 'Nadia Putri', '082100000006', 'SIM', '3058-2890-538990',
 'Jl. Cilik Riwut No. 45, Palangka Raya', 'CB003', 'PG006');


-- =========================================================
-- 5. MOTOR
-- INSERT 10 MOTOR
-- =========================================================

INSERT INTO "MOTOR"
("motor_nopol", "pelanggan_id", "motor_no_rangka", "motor_no_mesin",
 "motor_merek", "motor_tipe", "motor_tahun", "motor_warna", "motor_kilometer")
VALUES
('KH1001AA', 'PL001', 'MH1JFZ12345670001', 'JFZ123450001', 'Honda', 'Vario 125', 2021, 'Hitam', 18500),
('KH1002AA', 'PL001', 'MH1JFZ12345670002', 'JFZ123450002', 'Honda', 'Beat', 2020, 'Merah', 22000),
('KH1003BB', 'PL002', 'MH1PCX12345670003', 'PCX123450003', 'Honda', 'PCX 160', 2022, 'Putih', 12000),
('KH1004BB', 'PL002', 'MH1VAR12345670004', 'VAR123450004', 'Honda', 'Vario 150', 2019, 'Biru', 28500),
('KH1005CC', 'PL003', 'MH3NMX12345670005', 'NMX123450005', 'Yamaha', 'NMAX', 2021, 'Hitam', 19500),
('KH1006CC', 'PL003', 'MH3R15X1234567006', 'R15X123450006', 'Yamaha', 'R15', 2020, 'Biru', 24000),
('KH1007DD', 'PL004', 'MH1GEN12345670007', 'GEN123450007', 'Honda', 'Genio', 2022, 'Putih', 11000),
('KH1008EE', 'PL005', 'MH3MIO12345670008', 'MIO123450008', 'Yamaha', 'Mio M3', 2019, 'Merah', 31000),
('KH1009EE', 'PL005', 'MH3LEX12345670009', 'LEX123450009', 'Yamaha', 'Lexi', 2021, 'Abu-abu', 17000),
('KH1010FF', 'PL006', 'MH1SCO1234567010', 'SCO123450010', 'Honda', 'Scoopy', 2023, 'Cokelat', 8000);


-- =========================================================
-- 6. RIWAYAT KEPEMILIKAN
-- INSERT Data tambahan agar fitur riwayat kepemilikan terisi
-- =========================================================

INSERT INTO "RIWAYAT_KEPEMILIKAN"
("riwayat_id", "motor_nopol", "pelanggan_id", "tanggal_mulai", "tanggal_selesai")
VALUES
('RW001', 'KH1001AA', 'PL001', '2023-01-01', NULL),
('RW002', 'KH1002AA', 'PL001', '2023-02-01', NULL),
('RW003', 'KH1003BB', 'PL002', '2023-03-01', NULL),
('RW004', 'KH1004BB', 'PL002', '2023-04-01', NULL),
('RW005', 'KH1005CC', 'PL003', '2023-05-01', NULL),
('RW006', 'KH1006CC', 'PL003', '2023-06-01', NULL),
('RW007', 'KH1007DD', 'PL004', '2023-07-01', NULL),
('RW008', 'KH1008EE', 'PL005', '2023-08-01', NULL),
('RW009', 'KH1009EE', 'PL005', '2023-09-01', NULL),
('RW010', 'KH1010FF', 'PL006', '2024-01-01', NULL);


-- =========================================================
-- 7. JASA SERVIS
-- INSERT 10 JENIS JASA
-- =========================================================

INSERT INTO "JASA_SERVIS"
("jasa_kode", "jasa_uraian", "jasa_biaya")
VALUES
('JS001', 'Servis ringan', 75000),
('JS002', 'Ganti oli mesin', 25000),
('JS003', 'Ganti oli gardan', 20000),
('JS004', 'Tune up', 120000),
('JS005', 'Servis sistem injeksi', 150000),
('JS006', 'Servis rem depan', 80000),
('JS007', 'Servis rem belakang', 75000),
('JS008', 'Servis CVT', 130000),
('JS009', 'Servis kelistrikan', 100000),
('JS010', 'Servis transmisi', 175000);


-- =========================================================
-- 8. SUKU CADANG
-- INSERT 15 SUKU CADANG
-- =========================================================

INSERT INTO "SUKU_CADANG"
("suku_cadang_kode", "suku_cadang_nama", "suku_cadang_harga_satuan")
VALUES
('SC001', 'Oli Mesin 10W-40', 55000),
('SC002', 'Oli Gardan', 20000),
('SC003', 'Busi', 25000),
('SC004', 'Kampas Rem Depan', 85000),
('SC005', 'Kampas Rem Belakang', 75000),
('SC006', 'Filter Udara', 60000),
('SC007', 'Filter Oli', 35000),
('SC008', 'V-Belt', 150000),
('SC009', 'Roller CVT', 90000),
('SC010', 'Aki Motor', 250000),
('SC011', 'Lampu Depan LED', 80000),
('SC012', 'Kampas Kopling', 175000),
('SC013', 'Rantai Motor', 160000),
('SC014', 'Gear Set', 220000),
('SC015', 'Injector Cleaner', 45000);


-- =========================================================
-- 9. SUPPLIER
-- INSERT 5 SUPPLIER
-- =========================================================

INSERT INTO "SUPPLIER"
("supplier_id", "supplier_nama", "supplier_telp", "supplier_alamat")
VALUES
('SP001', 'PT Sumber Motor Jaya', '081400000001', 'Jl. Ahmad Yani No. 10, Palangka Raya'),
('SP002', 'CV Mitra Sparepart', '081400000002', 'Jl. RTA Milono No. 20, Palangka Raya'),
('SP003', 'PT Karya Otomotif', '081400000003', 'Jl. G. Obos No. 30, Palangka Raya'),
('SP004', 'CV Berkah Motor', '081400000004', 'Jl. Rajawali No. 40, Palangka Raya'),
('SP005', 'PT Prima Suku Cadang', '081400000005', 'Jl. Cilik Riwut No. 50, Palangka Raya');


-- =========================================================
-- 10. SUPPLIER - SUKU CADANG
-- INSERT Hubungan supplier dengan suku cadang
-- =========================================================

INSERT INTO "SUPPLIER_SUKU_CADANG"
("supplier_id", "suku_cadang_kode")
VALUES
('SP001', 'SC001'),
('SP001', 'SC002'),
('SP001', 'SC003'),
('SP002', 'SC004'),
('SP002', 'SC005'),
('SP002', 'SC006'),
('SP003', 'SC007'),
('SP003', 'SC008'),
('SP003', 'SC009'),
('SP004', 'SC010'),
('SP004', 'SC011'),
('SP004', 'SC012'),
('SP005', 'SC013'),
('SP005', 'SC014'),
('SP005', 'SC015'),
('SP001', 'SC006'),
('SP002', 'SC008'),
('SP003', 'SC010');


-- =========================================================
-- 11. STOK CABANG
-- INSERT Stok beberapa suku cadang pada masing-masing cabang
-- =========================================================

INSERT INTO "STOK_CABANG"
("cabang_kode", "suku_cadang_kode", "stok_qty", "stok_minimum")
VALUES
('CB001', 'SC001', 30, 5),
('CB001', 'SC003', 20, 5),
('CB001', 'SC004', 15, 3),
('CB001', 'SC007', 15, 3),
('CB001', 'SC008', 10, 2),

('CB002', 'SC001', 25, 5),
('CB002', 'SC005', 15, 3),
('CB002', 'SC006', 20, 4),
('CB002', 'SC009', 12, 3),
('CB002', 'SC010', 8, 2),

('CB003', 'SC002', 20, 5),
('CB003', 'SC011', 10, 2),
('CB003', 'SC012', 8, 2),
('CB003', 'SC013', 10, 2),
('CB003', 'SC014', 7, 2),
('CB003', 'SC015', 15, 3);


-- =========================================================
-- 12. WORK ORDER
-- INSERT 8 WORK ORDER
--
-- WO001 dan WO002 akan menggunakan lebih dari satu mekanik
-- melalui tabel WO_MEKANIK.
--
-- Kolom mekanik_id = mekanik penanggung jawab utama.
-- =========================================================

INSERT INTO "WORK_ORDER"
("work_no", "work_tgl_masuk", "work_tgl_selesai",
 "work_status", "work_keluhan", "cabang_kode",
 "motor_nopol", "mekanik_id", "pembayaran_diskon",
 "pembayaran_metode", "pembayaran_status")
VALUES

('WO001', '2026-09-01 08:15:00+07', '2026-09-01 11:30:00+07',
 'Selesai', 'Mesin terasa kurang bertenaga dan suara mesin kasar',
 'CB001', 'KH1001AA', 'PG003', 10000, 'Tunai', 'Lunas'),

('WO002', '2026-09-02 09:00:00+07', '2026-09-02 13:00:00+07',
 'Selesai', 'Motor sulit dihidupkan dan indikator injeksi menyala',
 'CB002', 'KH1003BB', 'PG005', 15000, 'QRIS', 'Lunas'),

('WO003', '2026-09-03 08:30:00+07', '2026-09-03 10:00:00+07',
 'Selesai', 'Rem depan berbunyi saat digunakan',
 'CB002', 'KH1005CC', 'PG004', 0, 'Transfer', 'Lunas'),

('WO004', '2026-09-04 10:00:00+07', '2026-09-04 14:00:00+07',
 'Selesai', 'CVT terasa bergetar ketika berakselerasi',
 'CB001', 'KH1002AA', 'PG003', 20000, 'Debit', 'Lunas'),

('WO005', '2026-09-05 08:45:00+07', '2026-09-05 11:15:00+07',
 'Selesai', 'Kelistrikan lampu depan bermasalah',
 'CB003', 'KH1007DD', 'PG006', 0, 'Tunai', 'Lunas'),

('WO006', '2026-09-06 09:30:00+07', '2026-09-06 12:00:00+07',
 'Selesai', 'Motor membutuhkan perawatan berkala',
 'CB003', 'KH1008EE', 'PG006', 10000, 'QRIS', 'Lunas'),

('WO007', '2026-09-07 08:20:00+07', '2026-09-07 10:30:00+07',
 'Selesai', 'Rem belakang kurang pakem',
 'CB002', 'KH1006CC', 'PG004', 0, 'Transfer', 'Lunas'),

('WO008', '2026-09-08 09:00:00+07', '2026-09-08 12:30:00+07',
 'Selesai', 'Motor mengalami masalah pada sistem transmisi',
 'CB003', 'KH1009EE', 'PG006', 25000, 'Kredit', 'Lunas');


-- =========================================================
-- 13. WO - MEKANIK
-- INSERT Minimal 2 WO menggunakan lebih dari satu mekanik
--
-- WO001 -> PG003 + PG004
-- WO002 -> PG005 + PG006
-- =========================================================

INSERT INTO "WO_MEKANIK"
("work_no", "mekanik_id", "peran_mekanik")
VALUES
('WO001', 'PG003', 'Penanggung Jawab'),
('WO001', 'PG004', 'Pembantu'),

('WO002', 'PG005', 'Penanggung Jawab'),
('WO002', 'PG006', 'Pembantu'),

('WO003', 'PG004', 'Penanggung Jawab'),
('WO004', 'PG003', 'Penanggung Jawab'),
('WO005', 'PG006', 'Penanggung Jawab'),
('WO006', 'PG006', 'Penanggung Jawab'),
('WO007', 'PG004', 'Penanggung Jawab'),
('WO008', 'PG006', 'Penanggung Jawab');


-- =========================================================
-- 14. WO - JASA
-- INSERT 12 DETAIL JASA WORK ORDER
-- =========================================================

INSERT INTO "WO_JASA"
("work_no", "jasa_kode")
VALUES
('WO001', 'JS001'),
('WO001', 'JS002'),

('WO002', 'JS004'),
('WO002', 'JS005'),

('WO003', 'JS006'),

('WO004', 'JS008'),
('WO004', 'JS002'),

('WO005', 'JS009'),

('WO006', 'JS004'),
('WO006', 'JS002'),

('WO007', 'JS007'),

('WO008', 'JS010');


-- =========================================================
-- 15. WO - SUKU CADANG
-- INSERT 12 DETAIL SUKU CADANG WORK ORDER
-- suku_cadang_jumlah = qty x harga satuan
-- =========================================================

INSERT INTO "WO_SUKU_CADANG"
("work_no", "suku_cadang_kode", "suku_cadang_qty", "suku_cadang_jumlah")
VALUES
('WO001', 'SC001', 1, 55000),
('WO001', 'SC003', 1, 25000),

('WO002', 'SC015', 2, 90000),
('WO002', 'SC003', 1, 25000),

('WO003', 'SC004', 1, 85000),

('WO004', 'SC008', 1, 150000),
('WO004', 'SC009', 1, 90000),

('WO005', 'SC011', 1, 80000),

('WO006', 'SC001', 1, 55000),

('WO007', 'SC005', 1, 75000),

('WO008', 'SC012', 1, 175000),
('WO008', 'SC014', 1, 220000);


-- =========================================================
-- 16. GARANSI
-- INSERT 3 DATA GARANSI PEKERJAAN
-- =========================================================

INSERT INTO "GARANSI"
("garansi_id", "work_no", "garansi_jumlah_hari", "garansi_keterangan")
VALUES
('GR001', 'WO001', 14, 'Garansi servis mesin selama 14 hari setelah pekerjaan selesai.'),
('GR002', 'WO002', 14, 'Garansi sistem injeksi selama 14 hari setelah pekerjaan selesai.'),
('GR003', 'WO008', 30, 'Garansi pekerjaan transmisi selama 30 hari setelah pekerjaan selesai.');


-- =========================================================
-- SELESAI
-- =========================================================