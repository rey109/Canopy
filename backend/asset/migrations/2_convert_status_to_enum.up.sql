CREATE TYPE asset_status AS ENUM ('Available', 'Maintenance', 'Booked');

ALTER TABLE assets ALTER COLUMN status DROP DEFAULT;
ALTER TABLE assets ALTER COLUMN status TYPE asset_status USING status::asset_status;
ALTER TABLE assets ALTER COLUMN status SET DEFAULT 'Available'::asset_status;
