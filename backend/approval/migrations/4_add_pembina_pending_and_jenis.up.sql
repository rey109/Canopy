-- Recovery: pastikan tabel dasar ada (jika DB approval pernah dirty/reset, migration 1 belum ter-apply)
CREATE TABLE IF NOT EXISTS jenis_dokumen (
    jenis_id   SERIAL PRIMARY KEY,
    nama       VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS alur_persetujuan_template (
    template_id          SERIAL PRIMARY KEY,
    jenis_id             INT NOT NULL REFERENCES jenis_dokumen(jenis_id),
    urutan               INT NOT NULL,
    approver_group_name  VARCHAR(100) NOT NULL,
    UNIQUE(jenis_id, urutan)
);
CREATE TABLE IF NOT EXISTS dokumen (
    dokumen_id      SERIAL PRIMARY KEY,
    proker_id       INT DEFAULT NULL,
    jenis_id        INT NOT NULL REFERENCES jenis_dokumen(jenis_id),
    diunggah_oleh   VARCHAR(50) NOT NULL,
    diperiksa_oleh  VARCHAR(50) DEFAULT NULL,
    file_url        VARCHAR(500) NOT NULL DEFAULT '',
    is_eksternal    BOOLEAN NOT NULL DEFAULT FALSE,
    status          VARCHAR(50) NOT NULL DEFAULT 'Draft',
    catatan_revisi  TEXT DEFAULT NULL,
    versi           INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dokumen_proker ON dokumen(proker_id);
CREATE INDEX IF NOT EXISTS idx_dokumen_status ON dokumen(status);
CREATE TABLE IF NOT EXISTS persetujuan (
    persetujuan_id       SERIAL PRIMARY KEY,
    dokumen_id           INT NOT NULL REFERENCES dokumen(dokumen_id) ON DELETE CASCADE,
    urutan               INT NOT NULL,
    approver_group_name  VARCHAR(100) NOT NULL,
    disetujui_oleh       VARCHAR(50) DEFAULT NULL,
    keputusan            VARCHAR(20) NOT NULL DEFAULT 'Menunggu',
    catatan              TEXT DEFAULT NULL,
    waktu                TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    UNIQUE(dokumen_id, urutan)
);
CREATE INDEX IF NOT EXISTS idx_persetujuan_dokumen   ON persetujuan(dokumen_id);
CREATE INDEX IF NOT EXISTS idx_persetujuan_keputusan ON persetujuan(keputusan);

-- Seed awal jika tabel baru dibuat (idempotent)
INSERT INTO jenis_dokumen (nama) VALUES
    ('Proposal Kegiatan'),
    ('Surat Tugas'),
    ('Surat Keluar'),
    ('LPJ')
ON CONFLICT (nama) DO NOTHING;

-- Seed alur untuk 4 jenis awal jika belum ada (recovery untuk DB fresh)
INSERT INTO alur_persetujuan_template (jenis_id, urutan, approver_group_name)
SELECT jd.jenis_id, v.urutan, v.group_name
FROM (VALUES
    ('Proposal Kegiatan', 1, 'Sekretaris'),
    ('Proposal Kegiatan', 2, 'Bendahara'),
    ('Proposal Kegiatan', 3, 'Trimitra'),
    ('Proposal Kegiatan', 4, 'Pembina'),
    ('Surat Tugas',       1, 'Sekretaris'),
    ('Surat Tugas',       2, 'Trimitra'),
    ('Surat Keluar',      1, 'Sekretaris'),
    ('Surat Keluar',      2, 'Trimitra'),
    ('LPJ',               1, 'Sekretaris'),
    ('LPJ',               2, 'Bendahara'),
    ('LPJ',               3, 'Trimitra'),
    ('LPJ',               4, 'Pembina')
) AS v(jenis_nama, urutan, group_name)
JOIN jenis_dokumen jd ON jd.nama = v.jenis_nama
ON CONFLICT (jenis_id, urutan) DO NOTHING;

-- Tambah jenis dokumen baru untuk alur Pembina OSIS (Notulen, RAB, Tupoksi, Jadwal Rapat, dll)
INSERT INTO jenis_dokumen (nama) VALUES
    ('Notulen'),
    ('RAB'),
    ('Tupoksi'),
    ('Jadwal Rapat'),
    ('Dokumen Lainnya')
ON CONFLICT (nama) DO NOTHING;

-- Tambah alur approval untuk jenis baru: semua berakhir di Pembina
-- Notulen: 1=Sekretaris -> 2=Trimitra -> 3=Pembina
-- RAB: 1=Bendahara -> 2=Trimitra -> 3=Pembina
-- Tupoksi: 1=Sekretaris -> 2=Trimitra -> 3=Pembina
-- Jadwal Rapat: 1=Sekretaris -> 2=Pembina
-- Dokumen Lainnya: 1=Sekretaris -> 2=Pembina
INSERT INTO alur_persetujuan_template (jenis_id, urutan, approver_group_name)
SELECT jd.jenis_id, v.urutan, v.group_name
FROM (VALUES
    ('Notulen', 1, 'Sekretaris'),
    ('Notulen', 2, 'Trimitra'),
    ('Notulen', 3, 'Pembina'),
    ('RAB', 1, 'Bendahara'),
    ('RAB', 2, 'Trimitra'),
    ('RAB', 3, 'Pembina'),
    ('Tupoksi', 1, 'Sekretaris'),
    ('Tupoksi', 2, 'Trimitra'),
    ('Tupoksi', 3, 'Pembina'),
    ('Jadwal Rapat', 1, 'Sekretaris'),
    ('Jadwal Rapat', 2, 'Pembina'),
    ('Dokumen Lainnya', 1, 'Sekretaris'),
    ('Dokumen Lainnya', 2, 'Pembina')
) AS v(jenis_nama, urutan, group_name)
JOIN jenis_dokumen jd ON jd.nama = v.jenis_nama
ON CONFLICT (jenis_id, urutan) DO NOTHING;

-- Izinkan keputusan 'Pending' di persetujuan
ALTER TABLE persetujuan DROP CONSTRAINT IF EXISTS chk_persetujuan_keputusan;
ALTER TABLE persetujuan ADD CONSTRAINT chk_persetujuan_keputusan
    CHECK (keputusan IN ('Menunggu', 'Disetujui', 'Ditolak', 'Pending'));

-- Izinkan status 'Pending' di dokumen (untuk jejak aksi Pembina)
ALTER TABLE dokumen DROP CONSTRAINT IF EXISTS chk_dokumen_status;
ALTER TABLE dokumen ADD CONSTRAINT chk_dokumen_status
    CHECK (status IN (
        'Draft',
        'Menunggu Kelengkapan',
        'Perlu Revisi',
        'Menunggu Approval Berjenjang',
        'Pending',
        'Disetujui'
    ));
