-- ============================================================
-- Update KATEGORI_TRANSAKSI with new categories as per requirements
-- ============================================================

-- Clear existing and insert new categories
DELETE FROM kategori_transaksi;

-- Kategori MASUK
INSERT INTO kategori_transaksi (nama) VALUES
    ('Dana Sekolah'),
    ('Sponsor'),
    ('Iuran'),
    ('Donasi'),
    ('Penjualan'),
    ('Pengembalian Dana'),
    ('Lainnya (Masuk)');

-- Kategori KELUAR
INSERT INTO kategori_transaksi (nama) VALUES
    ('Konsumsi'),
    ('ATK'),
    ('Transportasi'),
    ('Perlengkapan Kegiatan'),
    ('Dokumentasi'),
    ('Publikasi'),
    ('Hadiah/Penghargaan'),
    ('Sewa'),
    ('Operasional'),
    ('Lainnya (Keluar)');

-- Update transaksi status constraint to include new statuses
ALTER TABLE transaksi DROP CONSTRAINT IF EXISTS chk_transaksi_status;

ALTER TABLE transaksi
    ADD CONSTRAINT chk_transaksi_status
    CHECK (status IN (
        'Menunggu Verifikasi',
        'Menunggu Approval Umum',
        'Disetujui',
        'Ditolak',
        'Perlu Perbaikan'
    ));