CREATE TABLE IF NOT EXISTS notulensi (
    notulensi_id       SERIAL PRIMARY KEY,
    rapat_id           INT NOT NULL UNIQUE REFERENCES rapat(rapat_id) ON DELETE CASCADE,
    isi                TEXT NOT NULL DEFAULT '',
    difinalisasi_oleh  VARCHAR(50) DEFAULT NULL,
    status             VARCHAR(10) NOT NULL DEFAULT 'Draft',
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE notulensi ADD COLUMN IF NOT EXISTS attachments TEXT NOT NULL DEFAULT '[]';
