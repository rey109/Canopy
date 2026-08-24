-- Tambah kolom attachments (JSON array of {url, name, type}) ke tabel notulensi
ALTER TABLE notulensi ADD COLUMN IF NOT EXISTS attachments TEXT NOT NULL DEFAULT '[]';
