-- Tambah constraint CHECK untuk jenis, sumber, dan status transaksi

ALTER TABLE transaksi
    ADD CONSTRAINT chk_transaksi_jenis
    CHECK (jenis IN ('Masuk', 'Keluar'));

ALTER TABLE transaksi
    ADD CONSTRAINT chk_transaksi_sumber
    CHECK (sumber IN ('Manual', 'Scan Nota'));

ALTER TABLE transaksi
    ADD CONSTRAINT chk_transaksi_status
    CHECK (status IN (
        'Menunggu Verifikasi',
        'Menunggu Approval Umum',
        'Disetujui',
        'Ditolak'
    ));
