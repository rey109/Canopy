DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaksi') THEN
        ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS division_id INT DEFAULT NULL;
        CREATE INDEX IF NOT EXISTS idx_transaksi_division ON transaksi(division_id);

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'program_kerja') THEN
            EXECUTE 'UPDATE transaksi t SET division_id = COALESCE(pk.division_id, 1) FROM program_kerja pk WHERE t.proker_id = pk.proker_id AND t.division_id IS NULL';
        END IF;

        UPDATE transaksi SET division_id = 1 WHERE division_id IS NULL;

        EXECUTE $sql$
            CREATE TABLE IF NOT EXISTS transaksi_files (
                file_id BIGSERIAL PRIMARY KEY,
                transaksi_id INT NOT NULL REFERENCES transaksi(transaksi_id) ON DELETE CASCADE,
                token VARCHAR(64) NOT NULL UNIQUE,
                file_name TEXT NOT NULL,
                file_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
                file_size BIGINT NOT NULL DEFAULT 0,
                content BYTEA NOT NULL,
                uploaded_by VARCHAR(50) NOT NULL,
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        $sql$;
        CREATE INDEX IF NOT EXISTS idx_transaksi_files_transaksi ON transaksi_files(transaksi_id);
        CREATE INDEX IF NOT EXISTS idx_transaksi_files_token ON transaksi_files(token);

        ALTER TABLE transaksi DROP CONSTRAINT IF EXISTS chk_transaksi_status;
        ALTER TABLE transaksi ADD CONSTRAINT chk_transaksi_status CHECK (status IN (
            'Menunggu Verifikasi', 'Menunggu Approval Umum', 'Disetujui', 'Ditolak', 'Perlu Perbaikan', 'Terverifikasi'
        ));
        CREATE INDEX IF NOT EXISTS idx_transaksi_kategori ON transaksi(kategori_id);
        CREATE INDEX IF NOT EXISTS idx_transaksi_created ON transaksi(created_at);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pengajuan_dana') THEN
        EXECUTE $sql$
            CREATE TABLE IF NOT EXISTS pengajuan_files (
                file_id BIGSERIAL PRIMARY KEY,
                pengajuan_id INT NOT NULL REFERENCES pengajuan_dana(pengajuan_id) ON DELETE CASCADE,
                token VARCHAR(64) NOT NULL UNIQUE,
                file_name TEXT NOT NULL,
                file_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
                file_size BIGINT NOT NULL DEFAULT 0,
                content BYTEA NOT NULL,
                uploaded_by VARCHAR(50) NOT NULL,
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        $sql$;
        CREATE INDEX IF NOT EXISTS idx_pengajuan_files_pengajuan ON pengajuan_files(pengajuan_id);
        CREATE INDEX IF NOT EXISTS idx_pengajuan_files_token ON pengajuan_files(token);

        ALTER TABLE pengajuan_dana DROP CONSTRAINT IF EXISTS chk_pengajuan_status;
        ALTER TABLE pengajuan_dana ADD CONSTRAINT chk_pengajuan_status CHECK (status IN (
            'Menunggu Verifikasi', 'Diproses', 'Disetujui', 'Ditolak', 'Dicairkan', 'Selesai', 'Perlu Perbaikan'
        ));
    END IF;
END $$;
