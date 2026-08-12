CREATE TYPE aspiration_status AS ENUM ('Diterima', 'Diproses', 'Ditindaklanjuti');

ALTER TABLE aspirations ALTER COLUMN status DROP DEFAULT;
ALTER TABLE aspirations ALTER COLUMN status TYPE aspiration_status USING status::aspiration_status;
ALTER TABLE aspirations ALTER COLUMN status SET DEFAULT 'Diterima'::aspiration_status;
