-- FileVault initial schema
-- Runs once on postgres container first start.
-- Subsequent changes go through TypeORM migrations.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- fast LIKE / ILIKE on filenames
CREATE EXTENSION IF NOT EXISTS "btree_gin";   -- GIN indexes on composite columns

-- Ensure the database exists (no-op if created by env var)
SELECT 1;
