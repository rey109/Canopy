-- ============================================================
-- USERS: data identitas siswa/guru, tidak menyimpan role
-- ============================================================
CREATE TABLE users (
    nis            VARCHAR(50) PRIMARY KEY,
    nama           VARCHAR(255) NOT NULL,
    jurusan        VARCHAR(100) NOT NULL,
    tahun_masuk    INT NOT NULL,        -- tahun ajaran masuk, basis "1 angkatan"
    foto_url       VARCHAR(500) DEFAULT NULL,
    password_hash          VARCHAR(255) NOT NULL,
    wajib_ganti_password   BOOLEAN NOT NULL DEFAULT TRUE,
    last_login             TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    failed_attempts        INT NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ROLE_GROUPS: kelompok role (Trimitra, Sekretaris, Bendahara, dst)
-- ============================================================
CREATE TABLE role_groups (
    group_id    SERIAL PRIMARY KEY,
    group_name  VARCHAR(100) NOT NULL UNIQUE
    -- Trimitra, Sekretaris, Bendahara, Kepala Divisi, Staf, Pembina
);

-- ============================================================
-- DIVISIONS: 10 Seksi Bidang (tanpa chair_nis — disimpan di KEPENGURUSAN)
-- ============================================================
CREATE TABLE divisions (
    division_id   SERIAL PRIMARY KEY,
    division_name VARCHAR(255) NOT NULL UNIQUE,
    deskripsi     TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- ROLES: jabatan spesifik dalam sebuah group, dengan scope divisi
-- ============================================================
CREATE TABLE roles (
    role_id              SERIAL PRIMARY KEY,
    group_id             INT NOT NULL REFERENCES role_groups(group_id),
    role_name            VARCHAR(100) NOT NULL,  -- "Ketua OSIS", "Sekretaris Umum", dll
    level                INT NOT NULL DEFAULT 1, -- 1 = tertinggi dalam group
    scope_divisi_awal    INT DEFAULT NULL REFERENCES divisions(division_id),
    scope_divisi_akhir   INT DEFAULT NULL REFERENCES divisions(division_id)
    -- NULL,NULL = scope organisasi penuh
);

-- ============================================================
-- PERIODE: tahun kepengurusan
-- ============================================================
CREATE TABLE periode (
    periode_id   SERIAL PRIMARY KEY,
    tahun_ajaran VARCHAR(20) NOT NULL UNIQUE,  -- "2025/2026"
    saldo_awal   NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    is_aktif     BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- KEPENGURUSAN: join table — satu siswa, satu role, satu periode
-- (satu siswa bisa punya role berbeda di periode berbeda)
-- ============================================================
CREATE TABLE kepengurusan (
    membership_id  SERIAL PRIMARY KEY,
    nis            VARCHAR(50) NOT NULL REFERENCES users(nis),
    role_id        INT NOT NULL REFERENCES roles(role_id),
    division_id    INT DEFAULT NULL REFERENCES divisions(division_id),
    -- null untuk role scope organisasi (Trimitra, BPH Umum)
    periode_id     INT NOT NULL REFERENCES periode(periode_id),
    status         VARCHAR(20) NOT NULL DEFAULT 'Aktif', -- 'Aktif', 'Nonaktif'
    UNIQUE(nis, periode_id)
    -- satu siswa hanya boleh satu role aktif per periode
);
