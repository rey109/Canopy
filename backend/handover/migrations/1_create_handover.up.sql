CREATE TABLE handover_records (
    id SERIAL PRIMARY KEY,
    period VARCHAR(100) NOT NULL, -- e.g. '2025/2026 -> 2026/2027'
    final_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    unfinished_proker JSONB DEFAULT '[]',
    vendor_contacts JSONB DEFAULT '[]',
    signature_old_ketua VARCHAR(255) DEFAULT '',
    signature_new_ketua VARCHAR(255) DEFAULT '',
    signature_pembina VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
