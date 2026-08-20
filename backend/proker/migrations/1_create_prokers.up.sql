-- ============================================================
-- PROGRAM_KERJA
-- ============================================================
CREATE TABLE program_kerja (
    proker_id            SERIAL PRIMARY KEY,
    division_id          INT DEFAULT NULL,
    -- null = proker organisasi/lintas divisi
    periode_id           INT NOT NULL,
    nama                 VARCHAR(255) NOT NULL,
    deskripsi            TEXT NOT NULL DEFAULT '',
    anggaran_disetujui   NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    status               VARCHAR(30) NOT NULL DEFAULT 'Belum Mulai',
    -- 'Belum Mulai', 'Berjalan', 'Selesai', 'Dibatalkan'
    penanggung_jawab     VARCHAR(50) DEFAULT NULL,
    tanggal_mulai        DATE NOT NULL,
    tanggal_selesai      DATE NOT NULL,
    dibuat_oleh          VARCHAR(50) NOT NULL,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proker_division ON program_kerja(division_id);
CREATE INDEX idx_proker_periode  ON program_kerja(periode_id);

-- ============================================================
-- TASK_TEMPLATE: template form task custom per divisi
-- (dibuat sendiri oleh Kepala Divisi)
-- ============================================================
CREATE TABLE task_template (
    template_id    SERIAL PRIMARY KEY,
    division_id    INT NOT NULL,
    nama_template  VARCHAR(255) NOT NULL,
    -- "Log Prestasi Lomba", "Produk Bazaar", dll
    dibuat_oleh    VARCHAR(50) NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TEMPLATE_FIELD: field-field dalam satu template
-- ============================================================
CREATE TABLE template_field (
    field_id        SERIAL PRIMARY KEY,
    template_id     INT NOT NULL REFERENCES task_template(template_id) ON DELETE CASCADE,
    label           VARCHAR(255) NOT NULL,
    tipe_input      VARCHAR(20) NOT NULL,
    -- 'Teks', 'Angka', 'Tanggal', 'Dropdown', 'File', 'Checkbox'
    opsi_dropdown   TEXT DEFAULT NULL,  -- JSON array string opsi jika Dropdown
    wajib           BOOLEAN NOT NULL DEFAULT FALSE,
    urutan          INT NOT NULL DEFAULT 0
);

-- ============================================================
-- TASKS: tugas individual atau general dalam sebuah proker
-- ============================================================
CREATE TABLE tasks (
    task_id            SERIAL PRIMARY KEY,
    proker_id          INT NOT NULL REFERENCES program_kerja(proker_id) ON DELETE CASCADE,
    template_id        INT DEFAULT NULL REFERENCES task_template(template_id),
    scope              VARCHAR(20) NOT NULL DEFAULT 'Individual',
    -- 'Individual', 'General'
    assigned_to        VARCHAR(50) DEFAULT NULL,
    offered_by         VARCHAR(50) DEFAULT NULL,
    dibuat_oleh        VARCHAR(50) NOT NULL,
    judul              VARCHAR(255) NOT NULL,
    deskripsi          TEXT NOT NULL DEFAULT '',
    deadline           DATE NOT NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'Tersedia',
    -- 'Tersedia', 'Ditugaskan', 'Ditawarkan', 'Selesai'
    custom_data        JSONB DEFAULT NULL,
    -- diisi sesuai TEMPLATE_FIELD
    eskalasi_terkirim  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_proker      ON tasks(proker_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status      ON tasks(status);

-- ============================================================
-- CATATAN_PEMBINAAN: catatan dari Pembina per proker
-- ============================================================
CREATE TABLE catatan_pembinaan (
    catatan_id   SERIAL PRIMARY KEY,
    proker_id    INT NOT NULL REFERENCES program_kerja(proker_id) ON DELETE CASCADE,
    dibuat_oleh  VARCHAR(50) NOT NULL,
    isi          TEXT NOT NULL,
    tanggal      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
