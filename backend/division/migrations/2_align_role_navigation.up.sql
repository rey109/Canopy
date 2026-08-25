INSERT INTO modules (module_name, is_core)
VALUES
    ('Catat Transaksi', FALSE),
    ('Laporan', FALSE),
    ('Verifikasi Nota', FALSE),
    ('Approval Berisiko', FALSE),
    ('Dokumen', FALSE),
    ('Notulensi', FALSE),
    ('Pengumuman', FALSE),
    ('Presensi', FALSE),
    ('Aset & Sarana', FALSE),
    ('Approval Pusat', FALSE),
    ('Struktur & Keanggotaan', FALSE),
    ('Ringkasan Organisasi', FALSE),
    ('Serah Terima', FALSE)
ON CONFLICT (module_name) DO NOTHING;

DELETE FROM role_group_modules
WHERE group_name IN ('Bendahara', 'Sekretaris', 'Trimitra', 'Kepala Divisi', 'Pembina');

INSERT INTO role_group_modules (group_name, module_id)
SELECT v.group_name, m.module_id
FROM (VALUES
    ('Bendahara', 'Catat Transaksi'),
    ('Bendahara', 'Laporan'),
    ('Bendahara', 'Verifikasi Nota'),
    ('Sekretaris', 'Dokumen'),
    ('Sekretaris', 'Notulensi'),
    ('Sekretaris', 'Pengumuman'),
    ('Sekretaris', 'Presensi'),
    ('Sekretaris', 'Aset & Sarana'),
    ('Kepala Divisi', 'Divisiku'),
    ('Trimitra', 'Approval Pusat'),
    ('Trimitra', 'Struktur & Keanggotaan'),
    ('Trimitra', 'Ringkasan Organisasi'),
    ('Trimitra', 'Serah Terima'),
    ('Pembina', 'Ringkasan Organisasi')
) AS v(group_name, module_name)
JOIN modules m ON m.module_name = v.module_name
ON CONFLICT (group_name, module_id) DO NOTHING;
