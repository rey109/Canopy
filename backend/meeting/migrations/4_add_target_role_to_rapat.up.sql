-- Tambah kolom target_role pada tabel rapat
ALTER TABLE rapat ADD COLUMN IF NOT EXISTS target_role VARCHAR(50) DEFAULT 'SEMUA SEKBID';
