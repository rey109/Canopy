-- ============================================================
-- Seed: DIVISIONS (10 Seksi Bidang)
-- ============================================================
CREATE TABLE divisions (
    division_id   SERIAL PRIMARY KEY,
    division_name VARCHAR(255) NOT NULL UNIQUE,
    deskripsi     TEXT NOT NULL DEFAULT ''
);

INSERT INTO divisions (division_name, deskripsi) VALUES
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
     'Fokus pada English Club, lomba debat bahasa asing, komunitas pidato bahasa asing, dan pelatihan bahasa.');

-- ============================================================
-- MODULES: daftar modul navigasi yang tersedia di sistem
-- ============================================================
CREATE TABLE modules (
    module_id    SERIAL PRIMARY KEY,
    module_name  VARCHAR(100) NOT NULL UNIQUE,
    -- Home, Task, Program Kerja, Rapat, Keuangan, Sekretariat,
    -- Divisiku, Organisasi, Info, Member, Profile, Setting
    is_core      BOOLEAN NOT NULL DEFAULT FALSE
    -- TRUE = tampil untuk semua role di nav utama
);

-- ============================================================
-- ROLE_GROUP_MODULES: modul tambahan per role group (slot dinamis)
-- group_name merujuk ke role_groups.group_name di service user
-- disimpan VARCHAR karena cross-service DB tidak bisa FK langsung
-- ============================================================
CREATE TABLE role_group_modules (
    id          SERIAL PRIMARY KEY,
    group_name  VARCHAR(100) NOT NULL,
    -- 'Trimitra', 'Sekretaris', 'Bendahara', 'Kepala Divisi', 'Staf', 'Pembina'
    module_id   INT NOT NULL REFERENCES modules(module_id),
    UNIQUE(group_name, module_id)
);

-- ============================================================
-- DIVISI_MODULES: modul tambahan spesifik 1 divisi
-- (di luar baseline role_group)
-- ============================================================
CREATE TABLE divisi_modules (
    id           SERIAL PRIMARY KEY,
    division_id  INT NOT NULL REFERENCES divisions(division_id),
    module_id    INT NOT NULL REFERENCES modules(module_id),
    UNIQUE(division_id, module_id)
);

-- ============================================================
-- Seed: MODULES
-- ============================================================
INSERT INTO modules (module_name, is_core) VALUES
    ('Home',          TRUE),
    ('Task',          TRUE),
    ('Program Kerja', TRUE),
    ('Rapat',         TRUE),
    ('Keuangan',      FALSE),
    ('Sekretariat',   FALSE),
    ('Divisiku',      FALSE),
    ('Organisasi',    FALSE),
    ('Info',          FALSE),
    ('Member',        FALSE),
    ('Profile',       FALSE),
    ('Setting',       FALSE);

-- ============================================================
-- Seed: ROLE_GROUP_MODULES (slot dinamis per group)
-- ============================================================
INSERT INTO role_group_modules (group_name, module_id)
SELECT v.group_name, m.module_id
FROM (VALUES
    ('Bendahara',     'Keuangan'),
    ('Sekretaris',    'Sekretariat'),
    ('Kepala Divisi', 'Divisiku'),
    ('Trimitra',      'Organisasi'),
    ('Pembina',       'Organisasi')
) AS v(group_name, module_name)
JOIN modules m ON m.module_name = v.module_name;
