-- ============================================================
-- Ensure all redesign tables exist (for existing databases)
-- ============================================================
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

-- ============================================================
-- Redesign schema adjustment for users table (safe migration)
-- ============================================================
DO $$
BEGIN
    -- Rename name to nama if name exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name') THEN
        ALTER TABLE users RENAME COLUMN name TO nama;
    END IF;

    -- Rename major to jurusan if major exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='major') THEN
        ALTER TABLE users RENAME COLUMN major TO jurusan;
    END IF;

    -- Add tahun_masuk if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='tahun_masuk') THEN
        ALTER TABLE users ADD COLUMN tahun_masuk INT NOT NULL DEFAULT 2024;
    END IF;

    -- Add foto_url if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='foto_url') THEN
        ALTER TABLE users ADD COLUMN foto_url VARCHAR(500) DEFAULT NULL;
    END IF;

    -- Drop class if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='class') THEN
        ALTER TABLE users DROP COLUMN class;
    END IF;

    -- Drop role if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
        ALTER TABLE users DROP COLUMN role;
    END IF;

    -- Drop division_id if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='division_id') THEN
        ALTER TABLE users DROP COLUMN division_id;
    END IF;

    -- Drop management_period if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='management_period') THEN
        ALTER TABLE users DROP COLUMN management_period;
    END IF;
END $$;

-- ============================================================
-- Seed lookup data if they were skipped/empty
-- ============================================================
INSERT INTO role_groups (group_name)
SELECT * FROM (VALUES
    ('Pembina'),
    ('Trimitra'),
    ('Sekretaris'),
    ('Bendahara'),
    ('Kepala Divisi'),
    ('Staf')
) AS v(group_name)
WHERE NOT EXISTS (SELECT 1 FROM role_groups);

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
WHERE NOT EXISTS (SELECT 1 FROM divisions);

INSERT INTO roles (group_id, role_name, level, scope_divisi_awal, scope_divisi_akhir)
SELECT group_id, role_name, level, scope_divisi_awal, scope_divisi_akhir
FROM (VALUES
    (1, 'Pembina OSIS', 1, NULL, NULL),
    (2, 'Ketua OSIS',    1, NULL, NULL),
    (2, 'Wakil Ketua 1', 2, 1, 5),
    (2, 'Wakil Ketua 2', 2, 6, 10),
    (3, 'Sekretaris Umum', 1, NULL, NULL),
    (3, 'Sekretaris 1',    2, 1, 5),
    (3, 'Sekretaris 2',    2, 6, 10),
    (4, 'Bendahara Umum', 1, NULL, NULL),
    (4, 'Bendahara 1',    2, 1, 5),
    (4, 'Bendahara 2',    2, 6, 10),
    (5, 'Ketua Sekbid 1',  1, 1,  1),
    (5, 'Ketua Sekbid 2',  1, 2,  2),
    (5, 'Ketua Sekbid 3',  1, 3,  3),
    (5, 'Ketua Sekbid 4',  1, 4,  4),
    (5, 'Ketua Sekbid 5',  1, 5,  5),
    (5, 'Ketua Sekbid 6',  1, 6,  6),
    (5, 'Ketua Sekbid 7',  1, 7,  7),
    (5, 'Ketua Sekbid 8',  1, 8,  8),
    (5, 'Ketua Sekbid 9',  1, 9,  9),
    (5, 'Ketua Sekbid 10', 1, 10, 10),
    (6, 'Staf Sekbid 1',  2, 1,  1),
    (6, 'Staf Sekbid 2',  2, 2,  2),
    (6, 'Staf Sekbid 3',  2, 3,  3),
    (6, 'Staf Sekbid 4',  2, 4,  4),
    (6, 'Staf Sekbid 5',  2, 5,  5),
    (6, 'Staf Sekbid 6',  2, 6,  6),
    (6, 'Staf Sekbid 7',  2, 7,  7),
    (6, 'Staf Sekbid 8',  2, 8,  8),
    (6, 'Staf Sekbid 9',  2, 9,  9),
    (6, 'Staf Sekbid 10', 2, 10, 10)
) AS v(group_id, role_name, level, scope_divisi_awal, scope_divisi_akhir)
WHERE NOT EXISTS (SELECT 1 FROM roles);

INSERT INTO periode (tahun_ajaran, saldo_awal, is_aktif)
SELECT * FROM (VALUES
    ('2025/2026', 0.00, TRUE)
) AS v(tahun_ajaran, saldo_awal, is_aktif)
WHERE NOT EXISTS (SELECT 1 FROM periode);

-- ============================================================
-- Seed: USERS demo
-- Password semua: "password123" (bcrypt hash)
-- ============================================================
INSERT INTO users (nis, nama, jurusan, tahun_masuk, password_hash) VALUES
    -- Pembina
    ('10001', 'Budi Hartono, M.Pd.', 'Pendidikan', 2010,
     '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),

    -- Trimitra
    ('20001', 'Reyza Fauzi',    'SIJA', 2023,
     '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20002', 'Aditya Pratama', 'TKJ',  2023,
     '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20003', 'Nadira Kusuma',  'RPL',  2023,
     '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),

    -- Sekretaris
    ('20011', 'Siti Aminah',    'RPL', 2024,
     '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20012', 'Dian Permata',   'AKL', 2024,
     '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20013', 'Rina Wulandari', 'TKJ', 2024,
     '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),

    -- Bendahara
    ('20021', 'Larasati Dewi',  'AKL',  2024,
     '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20022', 'Hendra Saputra', 'SIJA', 2024,
     '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20023', 'Maya Safitri',   'RPL',  2024,
     '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),

    -- Ketua Sekbid 1–10
    ('20101', 'Ahmad Syarif',    'TKJ',  2024, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20102', 'Bagus Prasetyo',  'RPL',  2024, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20103', 'Chandra Wijaya',  'SIJA', 2024, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20104', 'Dina Mariana',    'MM',   2024, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20105', 'Eko Sulistyo',    'TKJ',  2024, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20106', 'Fitri Handayani', 'AKL',  2024, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20107', 'Gilang Ramadhan', 'RPL',  2024, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20108', 'Hana Pertiwi',    'SIJA', 2024, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20109', 'Irvan Maulana',   'SIJA', 2024, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20110', 'Julia Lestari',   'RPL',  2024, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),

    -- Staf Sekbid 1–10 (1 per bidang)
    ('20201', 'Rian Hidayat',  'TKJ',  2025, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20202', 'Siska Amalia',  'RPL',  2025, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20203', 'Tio Saputra',   'SIJA', 2025, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20204', 'Ulfa Dwiyanti', 'MM',   2025, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20205', 'Viko Pratama',  'TKJ',  2025, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20206', 'Wanda Lestari', 'AKL',  2025, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20207', 'Xenia Putri',   'RPL',  2025, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20208', 'Yuda Perdana',  'SIJA', 2025, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20209', 'Zahra Aulia',   'SIJA', 2025, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20210', 'Rendi Wijaya',  'RPL',  2025, '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC')
ON CONFLICT (nis) DO NOTHING;

-- ============================================================
-- Seed: KEPENGURUSAN periode 2025/2026
-- role_id mapping (dari seed migration 2):
--   1=Pembina OSIS
--   2=Ketua OSIS, 3=Wakil Ketua 1, 4=Wakil Ketua 2
--   5=Sekretaris Umum, 6=Sekretaris 1, 7=Sekretaris 2
--   8=Bendahara Umum, 9=Bendahara 1, 10=Bendahara 2
--   11-20=Ketua Sekbid 1-10
--   21-30=Staf Sekbid 1-10
-- ============================================================
INSERT INTO kepengurusan (nis, role_id, division_id, periode_id, status)
SELECT nis, role_id, division_id, p.periode_id, 'Aktif'
FROM (VALUES
    -- Pembina
    ('10001', 1,  NULL),
    -- Trimitra
    ('20001', 2,  NULL),
    ('20002', 3,  NULL),
    ('20003', 4,  NULL),
    -- Sekretaris
    ('20011', 5,  NULL),
    ('20012', 6,  NULL),
    ('20013', 7,  NULL),
    -- Bendahara
    ('20021', 8,  NULL),
    ('20022', 9,  NULL),
    ('20023', 10, NULL),
    -- Ketua Sekbid
    ('20101', 11, 1),
    ('20102', 12, 2),
    ('20103', 13, 3),
    ('20104', 14, 4),
    ('20105', 15, 5),
    ('20106', 16, 6),
    ('20107', 17, 7),
    ('20108', 18, 8),
    ('20109', 19, 9),
    ('20110', 20, 10),
    -- Staf Sekbid
    ('20201', 21, 1),
    ('20202', 22, 2),
    ('20203', 23, 3),
    ('20204', 24, 4),
    ('20205', 25, 5),
    ('20206', 26, 6),
    ('20207', 27, 7),
    ('20208', 28, 8),
    ('20209', 29, 9),
    ('20210', 30, 10)
) AS v(nis, role_id, division_id)
CROSS JOIN (SELECT periode_id FROM periode WHERE is_aktif = TRUE LIMIT 1) p
ON CONFLICT DO NOTHING;
