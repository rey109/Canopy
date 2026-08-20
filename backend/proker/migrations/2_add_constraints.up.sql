-- Hapus migration lama yang sudah tidak relevan (digantikan migration 1 yang sudah diredesign)
-- File ini dikosongkan karena proker_status enum sudah tidak dipakai,
-- status kini disimpan sebagai VARCHAR dengan constraint CHECK.

ALTER TABLE program_kerja
    ADD CONSTRAINT chk_proker_status
    CHECK (status IN ('Belum Mulai', 'Berjalan', 'Selesai', 'Dibatalkan'));

ALTER TABLE tasks
    ADD CONSTRAINT chk_task_scope
    CHECK (scope IN ('Individual', 'General'));

ALTER TABLE tasks
    ADD CONSTRAINT chk_task_status
    CHECK (status IN ('Tersedia', 'Ditugaskan', 'Ditawarkan', 'Selesai'));

ALTER TABLE template_field
    ADD CONSTRAINT chk_tipe_input
    CHECK (tipe_input IN ('Teks', 'Angka', 'Tanggal', 'Dropdown', 'File', 'Checkbox'));
