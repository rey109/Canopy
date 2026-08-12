CREATE TYPE proker_status AS ENUM ('Rencana', 'Berjalan', 'Dinjau', 'Selesai');

ALTER TABLE prokers ALTER COLUMN status DROP DEFAULT;
ALTER TABLE prokers ALTER COLUMN status TYPE proker_status USING status::proker_status;
ALTER TABLE prokers ALTER COLUMN status SET DEFAULT 'Rencana'::proker_status;
