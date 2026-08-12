CREATE TABLE approvals (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL, -- 'proposal', 'surat', 'lpj'
    document_id INT NOT NULL,
    step INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Revision'
    approver_role VARCHAR(50) NOT NULL, -- 'Bendahara', 'Pembina', 'Sekretariat', 'Trimitra'
    approved_by VARCHAR(50) DEFAULT NULL,
    revision_notes TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
