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
