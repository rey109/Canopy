CREATE TYPE aspiration_status AS ENUM ('Diterima', 'Diproses', 'Ditindaklanjuti');

ALTER TABLE aspirations ALTER COLUMN status TYPE aspiration_status USING status::aspiration_status;
