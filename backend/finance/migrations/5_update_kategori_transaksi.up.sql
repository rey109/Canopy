-- ============================================================
-- Update KATEGORI_TRANSAKSI with new categories as per requirements
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kategori_transaksi') THEN
        DELETE FROM kategori_transaksi;

        INSERT INTO kategori_transaksi (nama) VALUES
            ('Dana Sekolah'), ('Sponsor'), ('Iuran'), ('Donasi'), ('Penjualan'), ('Pengembalian Dana'), ('Lainnya (Masuk)'),
            ('Konsumsi'), ('ATK'), ('Transportasi'), ('Perlengkapan Kegiatan'), ('Dokumentasi'), ('Publikasi'),
            ('Hadiah/Penghargaan'), ('Sewa'), ('Operasional'), ('Lainnya (Keluar)');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaksi') THEN
        ALTER TABLE transaksi DROP CONSTRAINT IF EXISTS chk_transaksi_status;
        ALTER TABLE transaksi ADD CONSTRAINT chk_transaksi_status CHECK (status IN (
            'Menunggu Verifikasi', 'Menunggu Approval Umum', 'Disetujui', 'Ditolak', 'Perlu Perbaikan'
        ));
    END IF;
END $$;