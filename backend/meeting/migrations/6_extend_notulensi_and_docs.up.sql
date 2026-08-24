-- Migration 4: Extend notulensi dengan field lengkap + tambah tabel dokumentasi + relasi proker ke rapat

-- Tambah kolom proker_id dan status Dibatalkan ke tabel rapat
ALTER TABLE rapat
    ADD COLUMN IF NOT EXISTS proker_id INT DEFAULT NULL;

ALTER TABLE rapat DROP CONSTRAINT IF EXISTS chk_rapat_status;

ALTER TABLE rapat
    ADD CONSTRAINT chk_rapat_status
    CHECK (status IN ('Terjadwal', 'Berlangsung', 'Selesai', 'Dibatalkan'));

-- Extend notulensi dengan field lengkap
ALTER TABLE notulensi
    ADD COLUMN IF NOT EXISTS tempat            VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS pimpinan_rapat    VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS notulis           VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS peserta           TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS agenda_pembahasan TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS hasil_pembahasan  TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS keputusan_rapat   TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS tindak_lanjut     TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS pic               VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS deadline_tl       DATE DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS catatan_tambahan  TEXT NOT NULL DEFAULT '';

-- Tabel dokumentasi rapat
CREATE TABLE IF NOT EXISTS rapat_dokumentasi (
    dok_id         SERIAL PRIMARY KEY,
    rapat_id       INT NOT NULL REFERENCES rapat(rapat_id) ON DELETE CASCADE,
    file_url       VARCHAR(500) NOT NULL,
    diunggah_oleh  VARCHAR(50) NOT NULL,
    keterangan     VARCHAR(255) NOT NULL DEFAULT '',
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rapat_dok_rapat ON rapat_dokumentasi(rapat_id);
CREATE INDEX IF NOT EXISTS idx_rapat_proker    ON rapat(proker_id);
