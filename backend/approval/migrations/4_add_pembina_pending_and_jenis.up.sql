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
