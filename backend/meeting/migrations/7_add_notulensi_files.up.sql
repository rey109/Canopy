-- ============================================================
-- NOTULENSI FILES: penyimpanan permanen file/foto lampiran notulensi
-- ============================================================
CREATE TABLE notulensi_files (
    file_id    BIGSERIAL PRIMARY KEY,
    rapat_id   BIGINT NOT NULL REFERENCES rapat(rapat_id) ON DELETE CASCADE,
    token      VARCHAR(64) NOT NULL UNIQUE,
    -- token acak unggah: URL download tidak dapat ditebak
    file_name  TEXT NOT NULL,
    file_type  VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    file_size  BIGINT NOT NULL DEFAULT 0,
    content    BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notulensi_files_rapat ON notulensi_files(rapat_id);
