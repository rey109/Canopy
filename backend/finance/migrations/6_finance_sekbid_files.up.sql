-- ============================================================
-- 6_finance_sekbid_files: Sekbid mandatory + file storage atomic
-- ============================================================

-- 1. Tambah division_id ke transaksi (Sekbid 1-10 mandatory di API, DB nullable untuk migrasi lama)
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS division_id INT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_transaksi_division ON transaksi(division_id);

-- Backfill: isi division_id dari proker jika ada, fallback ke 1
-- (Jika program_kerja table tidak ada di DB finance, query ini safe karena LEFT JOIN akan null dan COALESCE ke 1)
DO $$
BEGIN
  -- Coba backfill via program_kerja jika table ada
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'program_kerja') THEN
    EXECUTE '
      UPDATE transaksi t
      SET division_id = COALESCE(pk.division_id, 1)
      FROM program_kerja pk
      WHERE t.proker_id = pk.proker_id AND t.division_id IS NULL
    ';
  END IF;
  -- Sisa yang masih null (transaksi tanpa proker) set ke 1 sebagai default aman
  UPDATE transaksi SET division_id = 1 WHERE division_id IS NULL;
END $$;

-- 2. Transaksi files: bukti pembayaran storage permanen
CREATE TABLE IF NOT EXISTS transaksi_files (
    file_id      BIGSERIAL PRIMARY KEY,
    transaksi_id INT NOT NULL REFERENCES transaksi(transaksi_id) ON DELETE CASCADE,
    token        VARCHAR(64) NOT NULL UNIQUE,
    file_name    TEXT NOT NULL,
    file_type    VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    file_size    BIGINT NOT NULL DEFAULT 0,
    content      BYTEA NOT NULL,
    uploaded_by  VARCHAR(50) NOT NULL,
    uploaded_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transaksi_files_transaksi ON transaksi_files(transaksi_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_files_token ON transaksi_files(token);

-- 3. Pengajuan dana files: lampiran proposal/bukti pengajuan
CREATE TABLE IF NOT EXISTS pengajuan_files (
    file_id      BIGSERIAL PRIMARY KEY,
    pengajuan_id INT NOT NULL REFERENCES pengajuan_dana(pengajuan_id) ON DELETE CASCADE,
    token        VARCHAR(64) NOT NULL UNIQUE,
    file_name    TEXT NOT NULL,
    file_type    VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    file_size    BIGINT NOT NULL DEFAULT 0,
    content      BYTEA NOT NULL,
    uploaded_by  VARCHAR(50) NOT NULL,
    uploaded_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pengajuan_files_pengajuan ON pengajuan_files(pengajuan_id);
CREATE INDEX IF NOT EXISTS idx_pengajuan_files_token ON pengajuan_files(token);

-- 4. Update status constraint untuk transaksi agar support verifikasi bukti flow
ALTER TABLE transaksi DROP CONSTRAINT IF EXISTS chk_transaksi_status;
ALTER TABLE transaksi
    ADD CONSTRAINT chk_transaksi_status
    CHECK (status IN (
        'Menunggu Verifikasi',
        'Menunggu Approval Umum',
        'Disetujui',
        'Ditolak',
        'Perlu Perbaikan',
        'Terverifikasi'
    ));

-- 5. Update status constraint untuk pengajuan_dana agar konsisten
ALTER TABLE pengajuan_dana DROP CONSTRAINT IF EXISTS chk_pengajuan_status;
-- Buat constraint jika belum ada (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_pengajuan_status' AND table_name = 'pengajuan_dana') THEN
    ALTER TABLE pengajuan_dana
        ADD CONSTRAINT chk_pengajuan_status
        CHECK (status IN (
            'Menunggu Verifikasi',
            'Diproses',
            'Disetujui',
            'Ditolak',
            'Dicairkan',
            'Selesai',
            'Perlu Perbaikan'
        ));
  END IF;
END $$;

-- 6. Pastikan kolom bukti file metadata ada (jika belum, bukti_url sudah ada, tambahkan file info helper view tidak perlu)
--    Bukti disimpan via transaksi_files, bukti_url akan diisi /finance-files/<token> jika ada file

-- 7. Index tambahan untuk filter finance
CREATE INDEX IF NOT EXISTS idx_transaksi_kategori ON transaksi(kategori_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_created ON transaksi(created_at);
