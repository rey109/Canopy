-- ============================================================
-- HANDOVER_RECORDS: catatan serah terima kepengurusan antar periode
-- ============================================================
CREATE TABLE handover_records (
    id                    SERIAL PRIMARY KEY,
    periode_lama          VARCHAR(20) NOT NULL,  -- e.g. '2024/2025'
    periode_baru          VARCHAR(20) NOT NULL,  -- e.g. '2025/2026'
    saldo_akhir           NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    -- Saldo kas akhir periode lama (carry-over ke periode baru)
    proker_belum_selesai  JSONB NOT NULL DEFAULT '[]',
    -- Array JSON: [{proker_id, nama, status}]
    kontak_vendor         JSONB NOT NULL DEFAULT '[]',
    -- Array JSON: [{nama, telepon, keterangan}]
    catatan               TEXT NOT NULL DEFAULT '',
    -- Catatan umum serah terima
    signature_ketua_lama  VARCHAR(500) DEFAULT '',
    -- Base64 tanda tangan atau URL
    signature_ketua_baru  VARCHAR(500) DEFAULT '',
    signature_pembina     VARCHAR(500) DEFAULT '',
    dibuat_oleh           VARCHAR(50) NOT NULL,
    -- NIS Ketua OSIS lama yang memulai proses
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_handover_periode ON handover_records(periode_lama, periode_baru);
