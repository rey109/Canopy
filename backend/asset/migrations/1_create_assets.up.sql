-- ============================================================
-- ASSETS: inventaris sarana & perlengkapan organisasi
-- ============================================================
CREATE TABLE assets (
    asset_id     SERIAL PRIMARY KEY,
    nama         VARCHAR(255) NOT NULL,
    deskripsi    TEXT NOT NULL DEFAULT '',
    status       VARCHAR(20) NOT NULL DEFAULT 'Tersedia',
    -- 'Tersedia', 'Dipinjam', 'Perawatan'
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE assets
    ADD CONSTRAINT chk_asset_status
    CHECK (status IN ('Tersedia', 'Dipinjam', 'Perawatan'));

-- ============================================================
-- PEMINJAMAN: booking/peminjaman aset untuk proker
-- ============================================================
CREATE TABLE peminjaman (
    peminjaman_id  SERIAL PRIMARY KEY,
    asset_id       INT NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    proker_id      INT DEFAULT NULL,
    -- referensi ke program_kerja, tapi di service terpisah — tidak pakai FK langsung
    dipinjam_oleh  VARCHAR(50) NOT NULL,
    -- NIS peminjam (referensi ke users, tapi cross-service)
    waktu_mulai    TIMESTAMP WITH TIME ZONE NOT NULL,
    waktu_selesai  TIMESTAMP WITH TIME ZONE NOT NULL,
    keterangan     TEXT NOT NULL DEFAULT '',
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_peminjaman_asset   ON peminjaman(asset_id);
CREATE INDEX idx_peminjaman_proker  ON peminjaman(proker_id);
