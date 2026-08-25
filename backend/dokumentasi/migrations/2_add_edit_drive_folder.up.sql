-- Tambah drive link, folder multi-foto, dan support edit/hapus
ALTER TABLE dokumentasi_pdd ADD COLUMN IF NOT EXISTS drive_url VARCHAR(1000) DEFAULT NULL;
ALTER TABLE dokumentasi_pdd ADD COLUMN IF NOT EXISTS folder_name VARCHAR(255) DEFAULT NULL;

-- Tabel untuk multi file per dokumentasi (folder)
CREATE TABLE IF NOT EXISTS dokumentasi_files (
    id              SERIAL PRIMARY KEY,
    dokumentasi_id  INT NOT NULL REFERENCES dokumentasi_pdd(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    file_type       VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    file_size       BIGINT NOT NULL DEFAULT 0,
    file_url        VARCHAR(500) DEFAULT NULL,
    drive_url       VARCHAR(1000) DEFAULT NULL,
    content         BYTEA DEFAULT NULL,
    token           VARCHAR(64) DEFAULT NULL UNIQUE,
    dibuat_oleh     VARCHAR(50) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dokumentasi_files_dokumentasi ON dokumentasi_files(dokumentasi_id);
CREATE INDEX IF NOT EXISTS idx_dokumentasi_files_token ON dokumentasi_files(token);
