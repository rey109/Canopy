-- Dokumentasi PDD — khusus Sekbid 9, setiap kegiatan dimasukkan kesini, setiap Sekbid bisa setor ke PDD
CREATE TABLE dokumentasi_pdd (
    id              SERIAL PRIMARY KEY,
    judul           VARCHAR(255) NOT NULL,
    deskripsi       TEXT NOT NULL DEFAULT '',
    kegiatan        VARCHAR(255) NOT NULL,
    tanggal_kegiatan DATE NOT NULL,
    lokasi          VARCHAR(255) NOT NULL DEFAULT '',
    sekbid_asal     INT DEFAULT NULL,
    -- null = Semua Sekbid / Umum, 1-10 = Sekbid tertentu
    proker_id       INT DEFAULT NULL,
    file_url        VARCHAR(500) DEFAULT NULL,
    file_name       VARCHAR(255) DEFAULT NULL,
    file_type       VARCHAR(100) DEFAULT NULL,
    file_size       BIGINT DEFAULT 0,
    content         BYTEA DEFAULT NULL,
    token           VARCHAR(64) DEFAULT NULL UNIQUE,
    dibuat_oleh     VARCHAR(50) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dokumentasi_sekbid ON dokumentasi_pdd(sekbid_asal);
CREATE INDEX idx_dokumentasi_tanggal ON dokumentasi_pdd(tanggal_kegiatan);
CREATE INDEX idx_dokumentasi_kegiatan ON dokumentasi_pdd(kegiatan);
