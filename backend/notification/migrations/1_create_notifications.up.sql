CREATE TABLE notifications (
    notifikasi_id SERIAL PRIMARY KEY,
    nis VARCHAR(50) NOT NULL,
    kategori VARCHAR(20) NOT NULL,
    judul VARCHAR(255) NOT NULL,
    pesan TEXT NOT NULL,
    link_ref VARCHAR(500) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'Belum Dibaca',
    dibuat_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_notifications_status CHECK (status IN ('Belum Dibaca', 'Dibaca'))
);

CREATE INDEX idx_notifications_nis_status ON notifications(nis, status);
CREATE INDEX idx_notifications_created ON notifications(dibuat_at DESC);
