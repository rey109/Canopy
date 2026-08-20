-- Tambah constraint CHECK untuk kolom status dan keputusan

ALTER TABLE dokumen
    ADD CONSTRAINT chk_dokumen_status
    CHECK (status IN (
        'Draft',
        'Menunggu Kelengkapan',
        'Perlu Revisi',
        'Menunggu Approval Berjenjang',
        'Disetujui'
    ));

ALTER TABLE persetujuan
    ADD CONSTRAINT chk_persetujuan_keputusan
    CHECK (keputusan IN ('Menunggu', 'Disetujui', 'Ditolak'));
