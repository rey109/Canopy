-- ============================================================
-- Seed: ROLE_GROUPS
-- ============================================================
INSERT INTO role_groups (group_name) VALUES
    ('Pembina'),
    ('Trimitra'),
    ('Sekretaris'),
    ('Bendahara'),
    ('Kepala Divisi'),
    ('Staf');

-- ============================================================
-- Seed: DIVISIONS (10 Seksi Bidang)
-- ============================================================
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
-- Seed: ROLES
-- group_id: 1=Pembina, 2=Trimitra, 3=Sekretaris, 4=Bendahara,
--           5=Kepala Divisi, 6=Staf
-- level: 1 = tertinggi dalam group
-- scope: NULL = semua divisi; range = Sekbid X-Y
-- ============================================================
INSERT INTO roles (group_id, role_name, level, scope_divisi_awal, scope_divisi_akhir) VALUES
    -- Pembina
    (1, 'Pembina OSIS', 1, NULL, NULL),

    -- Trimitra
    (2, 'Ketua OSIS',    1, NULL, NULL),
    (2, 'Wakil Ketua 1', 2, 1, 5),
    (2, 'Wakil Ketua 2', 2, 6, 10),

    -- Sekretaris
    (3, 'Sekretaris Umum', 1, NULL, NULL),
    (3, 'Sekretaris 1',    2, 1, 5),
    (3, 'Sekretaris 2',    2, 6, 10),

    -- Bendahara
    (4, 'Bendahara Umum', 1, NULL, NULL),
    (4, 'Bendahara 1',    2, 1, 5),
    (4, 'Bendahara 2',    2, 6, 10),

    -- Kepala Divisi (×10, masing-masing scope 1 divisi)
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

    -- Staf (×10, masing-masing scope 1 divisi)
    (6, 'Staf Sekbid 1',  2, 1,  1),
    (6, 'Staf Sekbid 2',  2, 2,  2),
    (6, 'Staf Sekbid 3',  2, 3,  3),
    (6, 'Staf Sekbid 4',  2, 4,  4),
    (6, 'Staf Sekbid 5',  2, 5,  5),
    (6, 'Staf Sekbid 6',  2, 6,  6),
    (6, 'Staf Sekbid 7',  2, 7,  7),
    (6, 'Staf Sekbid 8',  2, 8,  8),
    (6, 'Staf Sekbid 9',  2, 9,  9),
    (6, 'Staf Sekbid 10', 2, 10, 10);

-- ============================================================
-- Seed: PERIODE aktif
-- ============================================================
INSERT INTO periode (tahun_ajaran, saldo_awal, is_aktif) VALUES
    ('2025/2026', 0.00, TRUE);
