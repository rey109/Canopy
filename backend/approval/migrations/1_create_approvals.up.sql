-- ============================================================
-- JENIS_DOKUMEN: tipe-tipe dokumen yang bisa diajukan
-- ============================================================
CREATE TABLE jenis_dokumen (
    jenis_id   SERIAL PRIMARY KEY,
    nama       VARCHAR(100) NOT NULL UNIQUE
    -- 'Proposal Kegiatan', 'Surat Tugas', 'Surat Keluar', 'LPJ'
);

INSERT INTO jenis_dokumen (nama) VALUES
    ('Proposal Kegiatan'),
    ('Surat Tugas'),
    ('Surat Keluar'),
    ('LPJ');

-- ============================================================
-- ALUR_PERSETUJUAN_TEMPLATE: rantai approver per jenis dokumen
-- approver_group_name merujuk group_name di role_groups (service user)
-- disimpan sebagai VARCHAR karena cross-service DB tidak bisa FK langsung
-- ============================================================
CREATE TABLE alur_persetujuan_template (
    template_id          SERIAL PRIMARY KEY,
    jenis_id             INT NOT NULL REFERENCES jenis_dokumen(jenis_id),
    urutan               INT NOT NULL,
    approver_group_name  VARCHAR(100) NOT NULL,
    -- 'Sekretaris', 'Bendahara', 'Trimitra', 'Pembina'
    UNIQUE(jenis_id, urutan)
);

-- Seed alur approval sesuai spec 03-alur-kerja.md:
-- Proposal Kegiatan : 1=Sekretaris → 2=Bendahara → 3=Trimitra → 4=Pembina
-- Surat Tugas       : 1=Sekretaris → 2=Trimitra
-- Surat Keluar      : 1=Sekretaris → 2=Trimitra
-- LPJ               : 1=Sekretaris → 2=Bendahara → 3=Trimitra → 4=Pembina
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
JOIN jenis_dokumen jd ON jd.nama = v.jenis_nama;

-- ============================================================
-- DOKUMEN: dokumen yang diunggah (file fisik)
-- ============================================================
CREATE TABLE dokumen (
    dokumen_id      SERIAL PRIMARY KEY,
    proker_id       INT DEFAULT NULL,
    -- referensi ke program_kerja di service proker (cross-service, tanpa FK)
    jenis_id        INT NOT NULL REFERENCES jenis_dokumen(jenis_id),
    diunggah_oleh   VARCHAR(50) NOT NULL,
    -- NIS (cross-service ke users)
    diperiksa_oleh  VARCHAR(50) DEFAULT NULL,
    -- NIS Sekretaris yang periksa kelengkapan awal
    file_url        VARCHAR(500) NOT NULL DEFAULT '',
    is_eksternal    BOOLEAN NOT NULL DEFAULT FALSE,
    status          VARCHAR(50) NOT NULL DEFAULT 'Draft',
    -- 'Draft', 'Menunggu Kelengkapan', 'Perlu Revisi',
    -- 'Menunggu Approval Berjenjang', 'Disetujui'
    catatan_revisi  TEXT DEFAULT NULL,
    versi           INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dokumen_proker ON dokumen(proker_id);
CREATE INDEX idx_dokumen_status ON dokumen(status);

-- ============================================================
-- PERSETUJUAN: instance rantai approval untuk satu dokumen
-- ============================================================
CREATE TABLE persetujuan (
    persetujuan_id       SERIAL PRIMARY KEY,
    dokumen_id           INT NOT NULL REFERENCES dokumen(dokumen_id) ON DELETE CASCADE,
    urutan               INT NOT NULL,
    approver_group_name  VARCHAR(100) NOT NULL,
    -- 'Sekretaris', 'Bendahara', 'Trimitra', 'Pembina'
    disetujui_oleh       VARCHAR(50) DEFAULT NULL,
    -- NIS approver (cross-service)
    keputusan            VARCHAR(20) NOT NULL DEFAULT 'Menunggu',
    -- 'Menunggu', 'Disetujui', 'Ditolak'
    catatan              TEXT DEFAULT NULL,
    waktu                TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    UNIQUE(dokumen_id, urutan)
);

CREATE INDEX idx_persetujuan_dokumen   ON persetujuan(dokumen_id);
CREATE INDEX idx_persetujuan_keputusan ON persetujuan(keputusan);
