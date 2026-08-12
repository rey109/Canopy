CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    schedule TIMESTAMP WITH TIME ZONE NOT NULL,
    division_id INT DEFAULT NULL,
    proker_id INT DEFAULT NULL,
    minutes TEXT DEFAULT '',
    qc_status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved'
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    meeting_id INT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_nis VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'alfa', -- 'hadir', 'izin', 'alfa'
    UNIQUE(meeting_id, user_nis)
);
