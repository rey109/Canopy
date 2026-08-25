CREATE TABLE IF NOT EXISTS rapat (
    rapat_id    SERIAL PRIMARY KEY,
    periode_id  INT NOT NULL,
    division_id INT DEFAULT NULL,
    judul       VARCHAR(255) NOT NULL,
    tanggal     TIMESTAMP WITH TIME ZONE NOT NULL,
    lokasi      VARCHAR(255) NOT NULL DEFAULT '',
    agenda      TEXT NOT NULL DEFAULT '',
    dibuat_oleh VARCHAR(50) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'Terjadwal',
    qr_code     VARCHAR(255) DEFAULT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notulensi (
    notulensi_id       SERIAL PRIMARY KEY,
    rapat_id           INT NOT NULL UNIQUE REFERENCES rapat(rapat_id) ON DELETE CASCADE,
    isi                TEXT NOT NULL DEFAULT '',
    difinalisasi_oleh  VARCHAR(50) DEFAULT NULL,
    status             VARCHAR(10) NOT NULL DEFAULT 'Draft',
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE notulensi ADD COLUMN IF NOT EXISTS attachments TEXT NOT NULL DEFAULT '[]';
