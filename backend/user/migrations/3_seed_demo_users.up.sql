INSERT INTO users (nis, name, major, class, role, division_id, management_period, password_hash)
VALUES
    -- 1. Pembina
    ('10001', 'Budi Hartono, M.Pd.', 'Pendidikan', 'Guru', 'Pembina', NULL, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),

    -- 2. Trimitra (Ketua & Wakil Ketua OSIS)
    ('20001', 'Reyza Fauzi', 'SIJA', 'XII-SIJA-1', 'Trimitra', NULL, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20002', 'Aditya Pratama', 'TKJ', 'XII-TKJ-2', 'Trimitra', NULL, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),

    -- 3. BPH (Sekretaris & Bendahara)
    ('20003', 'Siti Aminah', 'RPL', 'XI-RPL-1', 'Sekretariat', NULL, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20004', 'Larasati Dewi', 'AKL', 'XI-AKL-2', 'Bendahara', NULL, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),

    -- 4. Ketua Bidang (10 Seksi Bidang)
    ('20101', 'Ahmad Syarif', 'TKJ', 'XI-TKJ-1', 'Ketua Bidang', 1, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20102', 'Bagus Prasetyo', 'RPL', 'XI-RPL-2', 'Ketua Bidang', 2, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20103', 'Chandra Wijaya', 'SIJA', 'XI-SIJA-2', 'Ketua Bidang', 3, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20104', 'Dina Mariana', 'MM', 'XI-MM-1', 'Ketua Bidang', 4, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20105', 'Eko Sulistyo', 'TKJ', 'XI-TKJ-2', 'Ketua Bidang', 5, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20106', 'Fitri Handayani', 'AKL', 'XI-AKL-1', 'Ketua Bidang', 6, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20107', 'Gilang Ramadhan', 'RPL', 'XI-RPL-3', 'Ketua Bidang', 7, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20108', 'Hana Pertiwi', 'SIJA', 'XI-SIJA-1', 'Ketua Bidang', 8, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20109', 'Irvan Maulana', 'SIJA', 'XI-SIJA-1', 'Ketua Bidang', 9, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20110', 'Julia Lestari', 'RPL', 'XI-RPL-1', 'Ketua Bidang', 10, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),

    -- 5. Anggota (Masing-masing 1 orang per Seksi Bidang)
    ('20201', 'Rian Hidayat', 'TKJ', 'X-TKJ-1', 'Anggota', 1, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20202', 'Siska Amalia', 'RPL', 'X-RPL-2', 'Anggota', 2, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20203', 'Tio Saputra', 'SIJA', 'X-SIJA-2', 'Anggota', 3, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20204', 'Ulfa Dwiyanti', 'MM', 'X-MM-1', 'Anggota', 4, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20205', 'Viko Pratama', 'TKJ', 'X-TKJ-2', 'Anggota', 5, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20206', 'Wanda Lestari', 'AKL', 'X-AKL-1', 'Anggota', 6, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20207', 'Xenia Putri', 'RPL', 'X-RPL-3', 'Anggota', 7, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20208', 'Yuda Perdana', 'SIJA', 'X-SIJA-1', 'Anggota', 8, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20209', 'Zahra Aulia', 'SIJA', 'X-SIJA-1', 'Anggota', 9, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC'),
    ('20210', 'Rendi Wijaya', 'RPL', 'X-RPL-1', 'Anggota', 10, '2025/2026', '$2a$10$h5/q01e1aDQoMwPgF.LxYOaeXpIyWg093g6Qb8cNOfjl8JXLv82GC')
ON CONFLICT (nis) DO NOTHING;
