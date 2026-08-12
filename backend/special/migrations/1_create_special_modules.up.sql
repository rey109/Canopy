-- 1. Keagamaan (Bidang 1)
CREATE TABLE special_b1_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT NOT NULL DEFAULT ''
);

-- 2. Budi Pekerti (Bidang 2)
CREATE TABLE special_b2_records (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    student_class VARCHAR(50) NOT NULL,
    record_type VARCHAR(50) NOT NULL, -- 'Penghargaan' / 'Pelanggaran'
    points INT NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT ''
);

-- 3. Bela Negara (Bidang 3)
CREATE TABLE special_b3_rosters (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    leader_name VARCHAR(255) NOT NULL,
    mc_name VARCHAR(255) NOT NULL,
    flag_bearers TEXT NOT NULL DEFAULT '' -- JSON list of names
);

-- 4. Prestasi & Seni (Bidang 4)
CREATE TABLE special_b4_competitions (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    competition_name VARCHAR(255) NOT NULL,
    achievement VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL -- 'Akademik' / 'Seni' / 'Olahraga'
);

-- 5. Demokrasi & Lingkungan (Bidang 5)
CREATE TABLE special_b5_surveys (
    id SERIAL PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    yes_votes INT NOT NULL DEFAULT 0,
    no_votes INT NOT NULL DEFAULT 0
);

-- 6. Kewirausahaan (Bidang 6)
CREATE TABLE special_b6_sales (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    type VARCHAR(50) NOT NULL -- 'Penjualan' / 'Stok Masuk'
);

-- 7. Kesehatan & UKS (Bidang 7)
CREATE TABLE special_b7_clinic (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    complaint VARCHAR(255) NOT NULL,
    treatment VARCHAR(255) NOT NULL,
    visit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Sastra & Budaya (Bidang 8)
CREATE TABLE special_b8_mading (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Teknologi & Informasi (Bidang 9)
CREATE TABLE special_b9_links (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL
);

-- 10. Bahasa Asing (Bidang 10)
CREATE TABLE special_b10_words (
    id SERIAL PRIMARY KEY,
    word VARCHAR(100) NOT NULL,
    language VARCHAR(50) NOT NULL,
    meaning TEXT NOT NULL,
    example TEXT NOT NULL DEFAULT ''
);
