CREATE TYPE attendance_status AS ENUM ('hadir', 'izin', 'alfa');

ALTER TABLE attendance ALTER COLUMN status TYPE attendance_status USING status::attendance_status;
