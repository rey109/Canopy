CREATE TABLE IF NOT EXISTS pengumuman (
    pengumuman_id SERIAL PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    isi TEXT NOT NULL DEFAULT '',
    dibuat_oleh VARCHAR(50) NOT NULL,
    target VARCHAR(12) NOT NULL DEFAULT 'Organisasi',
    division_id INT DEFAULT NULL,
    tanggal TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pengumuman_target ON pengumuman(target);
CREATE INDEX IF NOT EXISTS idx_pengumuman_division ON pengumuman(division_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_pengumuman_target'
    ) THEN
        ALTER TABLE pengumuman ADD CONSTRAINT chk_pengumuman_target CHECK (target IN ('Organisasi', 'Divisi'));
    END IF;
END $$;
