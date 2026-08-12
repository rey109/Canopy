CREATE TABLE users (
    nis VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    major VARCHAR(100) NOT NULL,
    class VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'Pembina', 'Trimitra', 'Sekretariat', 'Bendahara', 'Ketua Bidang', 'Anggota'
    division_id INT DEFAULT NULL,
    management_period VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
