CREATE TYPE approval_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Revision');

ALTER TABLE approvals ALTER COLUMN status DROP DEFAULT;
ALTER TABLE approvals ALTER COLUMN status TYPE approval_status USING status::approval_status;
ALTER TABLE approvals ALTER COLUMN status SET DEFAULT 'Pending'::approval_status;
