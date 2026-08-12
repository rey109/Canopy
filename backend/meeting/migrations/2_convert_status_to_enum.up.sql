CREATE TYPE attendance_status AS ENUM ('hadir', 'izin', 'alfa');

ALTER TABLE attendance ALTER COLUMN status DROP DEFAULT;
ALTER TABLE attendance ALTER COLUMN status TYPE attendance_status USING status::attendance_status;
ALTER TABLE attendance ALTER COLUMN status SET DEFAULT 'alfa'::attendance_status;
