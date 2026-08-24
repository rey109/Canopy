-- Migration 7: metadata lampiran dokumentasi (nama file, tipe, ukuran)
ALTER TABLE rapat_dokumentasi
    ADD COLUMN IF NOT EXISTS nama_file VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS tipe_file VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS ukuran    BIGINT NOT NULL DEFAULT 0;
