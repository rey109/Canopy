CREATE TYPE user_role AS ENUM ('Pembina', 'Trimitra', 'Sekretariat', 'Bendahara', 'Ketua Bidang', 'Anggota');

ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;
