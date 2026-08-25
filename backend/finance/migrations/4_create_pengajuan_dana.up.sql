-- ============================================================
-- PENGAJUAN_DANA: pengajuan dana dari divisi/proker
-- ============================================================
CREATE TABLE pengajuan_dana (
    pengajuan_id        SERIAL PRIMARY KEY,
    nama_pengajuan      VARCHAR(255) NOT NULL,
    proker_id           INT DEFAULT NULL,
    division_id         INT DEFAULT NULL,
    pengaju_nis         VARCHAR(50) NOT NULL,
    nominal             NUMERIC(15,2) NOT NULL,
    keperluan           VARCHAR(255) NOT NULL,
    deskripsi           TEXT NOT NULL DEFAULT '',
    deadline            DATE NOT NULL,
    lampiran_url        VARCHAR(500) DEFAULT NULL,
    status              VARCHAR(40) NOT NULL DEFAULT 'Menunggu Verifikasi',
    -- 'Menunggu Verifikasi', 'Diproses', 'Disetujui', 'Ditolak', 'Dicairkan', 'Selesai'
    alasan_penolakan    TEXT DEFAULT NULL,
    dibuat_oleh         VARCHAR(50) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pengajuan_proker     ON pengajuan_dana(proker_id);
CREATE INDEX idx_pengajuan_division   ON pengajuan_dana(division_id);
CREATE INDEX idx_pengajuan_pengaju    ON pengajuan_dana(pengaju_nis);
CREATE INDEX idx_pengajuan_status     ON pengajuan_dana(status);

-- ============================================================
-- PENGAJUAN_DANA_STATUS_HISTORY: riwayat perubahan status
-- ============================================================
CREATE TABLE pengajuan_dana_status_history (
    history_id      SERIAL PRIMARY KEY,
    pengajuan_id    INT NOT NULL REFERENCES pengajuan_dana(pengajuan_id) ON DELETE CASCADE,
    status_sebelum  VARCHAR(40),
    status_sesudah  VARCHAR(40) NOT NULL,
    diubah_oleh     VARCHAR(50) NOT NULL,
    catatan         TEXT DEFAULT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pengajuan_history_pengajuan ON pengajuan_dana_status_history(pengajuan_id);

-- ============================================================
-- PENGAJUAN_DANA_APPROVAL_HISTORY: riwayat approval/verifikasi
-- ============================================================
CREATE TABLE pengajuan_dana_approval_history (
    approval_id     SERIAL PRIMARY KEY,
    pengajuan_id    INT NOT NULL REFERENCES pengajuan_dana(pengajuan_id) ON DELETE CASCADE,
    approver_nis    VARCHAR(50) NOT NULL,
    approver_role   VARCHAR(100) NOT NULL,
    keputusan       VARCHAR(20) NOT NULL,
    -- 'Setujui', 'Tolak', 'Verifikasi', 'Minta Perbaikan', 'Cairkan'
    catatan         TEXT DEFAULT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pengajuan_approval_pengajuan ON pengajuan_dana_approval_history(pengajuan_id);

-- ============================================================
-- Update transaksi table to add pengajuan_id reference
-- ============================================================
ALTER TABLE transaksi
    ADD COLUMN pengajuan_id INT DEFAULT NULL;

CREATE INDEX idx_transaksi_pengajuan ON transaksi(pengajuan_id);

-- Add foreign key constraint (optional, cross-service reference)
-- ALTER TABLE transaksi ADD CONSTRAINT fk_transaksi_pengajuan 
--     FOREIGN KEY (pengajuan_id) REFERENCES pengajuan_dana(pengajuan_id);