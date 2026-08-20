-- Tambah constraint CHECK untuk status dan tipe presensi

ALTER TABLE rapat
    ADD CONSTRAINT chk_rapat_status
    CHECK (status IN ('Terjadwal', 'Berlangsung', 'Selesai'));

ALTER TABLE notulensi
    ADD CONSTRAINT chk_notulensi_status
    CHECK (status IN ('Draft', 'Final'));

ALTER TABLE presensi
    ADD CONSTRAINT chk_presensi_acara_type
    CHECK (acara_type IN ('Rapat', 'Kegiatan'));

ALTER TABLE presensi
    ADD CONSTRAINT chk_presensi_tipe
    CHECK (tipe IN ('Hadir', 'Izin', 'Sakit', 'Alpa'));

ALTER TABLE presensi
    ADD CONSTRAINT chk_presensi_status_verifikasi
    CHECK (status_verifikasi IN ('Menunggu', 'Disetujui', 'Ditolak'));

ALTER TABLE pengumuman
    ADD CONSTRAINT chk_pengumuman_target
    CHECK (target IN ('Organisasi', 'Divisi'));
