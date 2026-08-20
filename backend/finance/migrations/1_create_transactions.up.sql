-- ============================================================
-- KATEGORI_TRANSAKSI: kategori jenis pengeluaran/pemasukan
-- ============================================================
CREATE TABLE kategori_transaksi (
    kategori_id  SERIAL PRIMARY KEY,
    nama         VARCHAR(100) NOT NULL UNIQUE
    -- Konsumsi, Transportasi, Perlengkapan, Sewa Tempat, dll
);

INSERT INTO kategori_transaksi (nama) VALUES
    ('Konsumsi'),
    ('Transportasi'),
    ('Perlengkapan'),
    ('Sewa Tempat'),
    ('Dokumentasi'),
    ('Hadiah & Piala'),
    ('ATK'),
    ('Cetak & Fotokopi'),
    ('Lain-lain');

-- ============================================================
-- TRANSAKSI
-- ============================================================
CREATE TABLE transaksi (
    transaksi_id       SERIAL PRIMARY KEY,
    proker_id          INT DEFAULT NULL REFERENCES program_kerja(proker_id),
    kategori_id        INT DEFAULT NULL REFERENCES kategori_transaksi(kategori_id),
    dicatat_oleh       VARCHAR(50) NOT NULL REFERENCES users(nis),
    jenis              VARCHAR(10) NOT NULL,
    -- 'Masuk', 'Keluar'
    nominal            NUMERIC(15,2) NOT NULL,
    deskripsi          TEXT NOT NULL DEFAULT '',
    bukti_url          VARCHAR(500) DEFAULT NULL,
    sumber             VARCHAR(20) NOT NULL DEFAULT 'Manual',
    -- 'Manual', 'Scan Nota'
    is_berisiko        BOOLEAN NOT NULL DEFAULT FALSE,
    status             VARCHAR(40) NOT NULL DEFAULT 'Menunggu Verifikasi',
    -- 'Menunggu Verifikasi'  (baru masuk, belum dicek Bendahara)
    -- 'Menunggu Approval Umum' (berisiko, butuh Bendahara Umum)
    -- 'Disetujui'
    -- 'Ditolak'
    alasan_penolakan   TEXT DEFAULT NULL,
    tanggal            DATE NOT NULL,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaksi_proker   ON transaksi(proker_id);
CREATE INDEX idx_transaksi_status   ON transaksi(status);
CREATE INDEX idx_transaksi_sumber   ON transaksi(sumber);
CREATE INDEX idx_transaksi_tanggal  ON transaksi(tanggal);
