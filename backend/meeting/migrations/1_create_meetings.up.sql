-- ============================================================
-- RAPAT: jadwal rapat organisasi atau per divisi
-- ============================================================
CREATE TABLE rapat (
    rapat_id    SERIAL PRIMARY KEY,
    periode_id  INT NOT NULL REFERENCES periode(periode_id),
    division_id INT DEFAULT NULL REFERENCES divisions(division_id),
    -- null = rapat organisasi (semua divisi diundang)
    judul       VARCHAR(255) NOT NULL,
    tanggal     TIMESTAMP WITH TIME ZONE NOT NULL,
    lokasi      VARCHAR(255) NOT NULL DEFAULT '',
    agenda      TEXT NOT NULL DEFAULT '',
    dibuat_oleh VARCHAR(50) NOT NULL REFERENCES users(nis),
    status      VARCHAR(20) NOT NULL DEFAULT 'Terjadwal',
    -- 'Terjadwal', 'Berlangsung', 'Selesai'
    qr_code     VARCHAR(255) DEFAULT NULL,
    -- token unik untuk presensi QR
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rapat_division  ON rapat(division_id);
CREATE INDEX idx_rapat_tanggal   ON rapat(tanggal);
CREATE INDEX idx_rapat_status    ON rapat(status);

-- ============================================================
-- NOTULENSI: catatan hasil rapat (terpisah dari RAPAT)
-- ============================================================
CREATE TABLE notulensi (
    notulensi_id       SERIAL PRIMARY KEY,
    rapat_id           INT NOT NULL UNIQUE REFERENCES rapat(rapat_id) ON DELETE CASCADE,
    -- UNIQUE: satu rapat hanya boleh punya satu notulensi
    isi                TEXT NOT NULL DEFAULT '',
    difinalisasi_oleh  VARCHAR(50) DEFAULT NULL REFERENCES users(nis),
    status             VARCHAR(10) NOT NULL DEFAULT 'Draft',
    -- 'Draft', 'Final'
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PRESENSI: absensi untuk rapat atau kegiatan proker
-- ============================================================
CREATE TABLE presensi (
    presensi_id        SERIAL PRIMARY KEY,
    acara_type         VARCHAR(10) NOT NULL,
    -- 'Rapat', 'Kegiatan'
    acara_id           INT NOT NULL,
    -- FK ke rapat.rapat_id ATAU program_kerja.proker_id tergantung acara_type
    nis                VARCHAR(50) NOT NULL REFERENCES users(nis),
    tipe               VARCHAR(10) NOT NULL DEFAULT 'Alpa',
    -- 'Hadir', 'Izin', 'Sakit', 'Alpa'
    keterangan         TEXT DEFAULT NULL,
    bukti_url          VARCHAR(500) DEFAULT NULL,
    -- upload surat izin/sakit
    foto_url           VARCHAR(500) DEFAULT NULL,
    -- selfie saat scan QR Masuk, anti titip-absen
    status_verifikasi  VARCHAR(20) NOT NULL DEFAULT 'Menunggu',
    -- 'Menunggu', 'Disetujui', 'Ditolak'
    -- (Hadir langsung Disetujui; Izin/Sakit butuh verifikasi Sekretaris)
    waktu_submit       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(acara_type, acara_id, nis)
);

CREATE INDEX idx_presensi_acara ON presensi(acara_type, acara_id);
CREATE INDEX idx_presensi_nis   ON presensi(nis);
CREATE INDEX idx_presensi_tipe  ON presensi(tipe);

-- ============================================================
-- PENGUMUMAN: pengumuman organisasi atau per divisi
-- ============================================================
CREATE TABLE pengumuman (
    pengumuman_id  SERIAL PRIMARY KEY,
    judul          VARCHAR(255) NOT NULL,
    isi            TEXT NOT NULL DEFAULT '',
    dibuat_oleh    VARCHAR(50) NOT NULL REFERENCES users(nis),
    target         VARCHAR(12) NOT NULL DEFAULT 'Organisasi',
    -- 'Organisasi', 'Divisi'
    division_id    INT DEFAULT NULL REFERENCES divisions(division_id),
    tanggal        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pengumuman_target   ON pengumuman(target);
CREATE INDEX idx_pengumuman_division ON pengumuman(division_id);
