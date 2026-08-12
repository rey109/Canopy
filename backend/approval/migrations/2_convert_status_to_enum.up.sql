CREATE TYPE approval_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Revision');

ALTER TABLE approvals ALTER COLUMN status TYPE approval_status USING status::approval_status;
