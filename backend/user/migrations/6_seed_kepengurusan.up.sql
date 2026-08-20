-- ============================================================
-- Migration 6: Seed lookup tables + kepengurusan
-- (This runs fresh in any environment where migration 5 ran but
--  lookup tables remained empty due to earlier migration failures)
-- ============================================================

-- Ensure tables exist (idempotent)
CREATE TABLE IF NOT EXISTS role_groups (
    group_id    SERIAL PRIMARY KEY,
    group_name  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS divisions (
    division_id   SERIAL PRIMARY KEY,
    division_name VARCHAR(255) NOT NULL UNIQUE,
    deskripsi     TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS roles (
    role_id              SERIAL PRIMARY KEY,
    group_id             INT NOT NULL REFERENCES role_groups(group_id),
    role_name            VARCHAR(100) NOT NULL,
    level                INT NOT NULL DEFAULT 1,
    scope_divisi_awal    INT DEFAULT NULL REFERENCES divisions(division_id),
    scope_divisi_akhir   INT DEFAULT NULL REFERENCES divisions(division_id)
);

CREATE TABLE IF NOT EXISTS periode (
    periode_id   SERIAL PRIMARY KEY,
    tahun_ajaran VARCHAR(20) NOT NULL UNIQUE,
    saldo_awal   NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    is_aktif     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS kepengurusan (
    membership_id  SERIAL PRIMARY KEY,
    nis            VARCHAR(50) NOT NULL REFERENCES users(nis),
    role_id        INT NOT NULL REFERENCES roles(role_id),
    division_id    INT DEFAULT NULL REFERENCES divisions(division_id),
    periode_id     INT NOT NULL REFERENCES periode(periode_id),
    status         VARCHAR(20) NOT NULL DEFAULT 'Aktif',
    UNIQUE(nis, periode_id)
);

-- Seed role_groups (if empty)
INSERT INTO role_groups (group_name)
SELECT unnest(ARRAY['Pembina','Trimitra','Sekretaris','Bendahara','Kepala Divisi','Staf'])
WHERE NOT EXISTS (SELECT 1 FROM role_groups LIMIT 1);

-- Seed divisions (if empty)
INSERT INTO divisions (division_name, deskripsi)
SELECT * FROM (VALUES
    ('Pembinaan Keimanan & Ketaqwaan Terhadap Tuhan YME',
     'Fokus pada pengembangan spiritualitas, perayaan hari besar keagamaan, dan toleransi antar umat beragama.'),
    ('Pembinaan Budi Pekerti Luhur / Akhlak Mulia',
     'Fokus pada pembinaan tata krama, kepedulian sosial, ketertiban siswa, dan kegiatan sosial/amal.'),
    ('Pembinaan Kepribadian Unggul, Wawasan Kebangsaan, Bela Negara',
     'Fokus pada wawasan kebangsaan, bela negara, upacara bendera, pramuka, Paskibra, dan cinta tanah air.'),
    ('Pembinaan Prestasi Akademik, Seni, Olahraga',
     'Fokus pada peningkatan prestasi akademik (OSN, debat), perlombaan seni, olahraga (classmeet, turnamen), dan ekstrakurikuler.'),
    ('Demokrasi, HAM, Politik, Lingkungan Hidup, Toleransi Sosial',
     'Fokus pada kegiatan demokrasi (pemilihan ketua OSIS), pelestarian lingkungan hidup, kebersihan sekolah, dan keadilan sosial.'),
    ('Pembinaan Kreativitas, Keterampilan, Kewirausahaan',
     'Fokus pada pengembangan keterampilan, koperasi sekolah, event wirausaha siswa, bazar, dan kreativitas mandiri.'),
    ('Pembinaan Kualitas Jasmani, Kesehatan, Gizi',
     'Fokus pada UKS, penyuluhan kesehatan dan gizi, PMR, kantin sehat, dan kebugaran siswa.'),
    ('Pembinaan Sastra & Budaya',
     'Fokus pada majalah dinding (mading), penerbitan karya sastra, pentas budaya, apresiasi film, dan teater.'),
    ('Pembinaan Teknologi Informasi & Komunikasi',
     'Fokus pada dokumentasi multimedia, website sekolah, pengelolaan media sosial, siaran sekolah, dan edukasi TIK.'),
    ('Pembinaan Komunikasi Bahasa Asing',
     'Fokus pada English Club, lomba debat bahasa asing, komunitas pidato bahasa asing, dan pelatihan bahasa.')
) AS v(division_name, deskripsi)
WHERE NOT EXISTS (SELECT 1 FROM divisions LIMIT 1);

-- Seed roles (if empty) using group name join
INSERT INTO roles (group_id, role_name, level, scope_divisi_awal, scope_divisi_akhir)
SELECT rg.group_id, v.role_name, v.level, v.awal, v.akhir
FROM (VALUES
    ('Pembina',       'Pembina OSIS',     1, NULL::int, NULL::int),
    ('Trimitra',      'Ketua OSIS',       1, NULL,      NULL),
    ('Trimitra',      'Wakil Ketua 1',    2, 1,         5),
    ('Trimitra',      'Wakil Ketua 2',    2, 6,         10),
    ('Sekretaris',    'Sekretaris Umum',  1, NULL,      NULL),
    ('Sekretaris',    'Sekretaris 1',     2, 1,         5),
    ('Sekretaris',    'Sekretaris 2',     2, 6,         10),
    ('Bendahara',     'Bendahara Umum',   1, NULL,      NULL),
    ('Bendahara',     'Bendahara 1',      2, 1,         5),
    ('Bendahara',     'Bendahara 2',      2, 6,         10),
    ('Kepala Divisi', 'Ketua Sekbid 1',   1, 1,         1),
    ('Kepala Divisi', 'Ketua Sekbid 2',   1, 2,         2),
    ('Kepala Divisi', 'Ketua Sekbid 3',   1, 3,         3),
    ('Kepala Divisi', 'Ketua Sekbid 4',   1, 4,         4),
    ('Kepala Divisi', 'Ketua Sekbid 5',   1, 5,         5),
    ('Kepala Divisi', 'Ketua Sekbid 6',   1, 6,         6),
    ('Kepala Divisi', 'Ketua Sekbid 7',   1, 7,         7),
    ('Kepala Divisi', 'Ketua Sekbid 8',   1, 8,         8),
    ('Kepala Divisi', 'Ketua Sekbid 9',   1, 9,         9),
    ('Kepala Divisi', 'Ketua Sekbid 10',  1, 10,        10),
    ('Staf',          'Staf Sekbid 1',    2, 1,         1),
    ('Staf',          'Staf Sekbid 2',    2, 2,         2),
    ('Staf',          'Staf Sekbid 3',    2, 3,         3),
    ('Staf',          'Staf Sekbid 4',    2, 4,         4),
    ('Staf',          'Staf Sekbid 5',    2, 5,         5),
    ('Staf',          'Staf Sekbid 6',    2, 6,         6),
    ('Staf',          'Staf Sekbid 7',    2, 7,         7),
    ('Staf',          'Staf Sekbid 8',    2, 8,         8),
    ('Staf',          'Staf Sekbid 9',    2, 9,         9),
    ('Staf',          'Staf Sekbid 10',   2, 10,        10)
) AS v(group_name, role_name, level, awal, akhir)
JOIN role_groups rg ON rg.group_name = v.group_name
WHERE NOT EXISTS (SELECT 1 FROM roles LIMIT 1);

-- Seed periode (if empty)
INSERT INTO periode (tahun_ajaran, saldo_awal, is_aktif)
SELECT '2025/2026', 0.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM periode LIMIT 1);

-- Seed kepengurusan (using role name join so IDs don't need to be hardcoded)
INSERT INTO kepengurusan (nis, role_id, division_id, periode_id, status)
SELECT v.nis, r.role_id, v.div_id, p.periode_id, 'Aktif'
FROM (VALUES
    ('10001', 'Pembina OSIS',    NULL::int),
    ('20001', 'Ketua OSIS',      NULL),
    ('20002', 'Wakil Ketua 1',   NULL),
    ('20003', 'Wakil Ketua 2',   NULL),
    ('20011', 'Sekretaris Umum', NULL),
    ('20012', 'Sekretaris 1',    NULL),
    ('20013', 'Sekretaris 2',    NULL),
    ('20021', 'Bendahara Umum',  NULL),
    ('20022', 'Bendahara 1',     NULL),
    ('20023', 'Bendahara 2',     NULL),
    ('20101', 'Ketua Sekbid 1',  1),
    ('20102', 'Ketua Sekbid 2',  2),
    ('20103', 'Ketua Sekbid 3',  3),
    ('20104', 'Ketua Sekbid 4',  4),
    ('20105', 'Ketua Sekbid 5',  5),
    ('20106', 'Ketua Sekbid 6',  6),
    ('20107', 'Ketua Sekbid 7',  7),
    ('20108', 'Ketua Sekbid 8',  8),
    ('20109', 'Ketua Sekbid 9',  9),
    ('20110', 'Ketua Sekbid 10', 10),
    ('20201', 'Staf Sekbid 1',   1),
    ('20202', 'Staf Sekbid 2',   2),
    ('20203', 'Staf Sekbid 3',   3),
    ('20204', 'Staf Sekbid 4',   4),
    ('20205', 'Staf Sekbid 5',   5),
    ('20206', 'Staf Sekbid 6',   6),
    ('20207', 'Staf Sekbid 7',   7),
    ('20208', 'Staf Sekbid 8',   8),
    ('20209', 'Staf Sekbid 9',   9),
    ('20210', 'Staf Sekbid 10',  10)
) AS v(nis, role_name, div_id)
JOIN roles r ON r.role_name = v.role_name
CROSS JOIN (SELECT periode_id FROM periode WHERE is_aktif = TRUE LIMIT 1) p
WHERE EXISTS (SELECT 1 FROM users WHERE nis = v.nis)
ON CONFLICT DO NOTHING;
