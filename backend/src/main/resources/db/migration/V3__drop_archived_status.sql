-- ARCHIVED is no longer a valid FormStatus value (the status model was
-- simplified to just DRAFT/PUBLISHED). status is an unconstrained VARCHAR,
-- so this cleans up any existing ARCHIVED rows before the Java enum can no
-- longer deserialize them.
UPDATE forms SET status = 'DRAFT' WHERE status = 'ARCHIVED';
