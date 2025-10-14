-- Fix password_hash column size to accommodate longer scrypt hashes
-- Change from VARCHAR(128) to TEXT to support modern password hashing algorithms
-- that generate hashes longer than 128 characters (e.g., scrypt)

-- This migration is compatible with PostgreSQL
-- For SQLite, TEXT is already compatible and doesn't need strict type conversion

-- Display current password_hash column information before migration
DO $$
BEGIN
    RAISE NOTICE '=== Password Hash Column Migration ===';
    RAISE NOTICE 'Changing password_hash from VARCHAR(128) to TEXT';
    RAISE NOTICE 'This supports longer hashes from scrypt and other modern algorithms';
END $$;

-- Alter the password_hash column type to TEXT
-- PostgreSQL: ALTER COLUMN type change
ALTER TABLE users 
ALTER COLUMN password_hash TYPE TEXT;

-- Make the column NOT NULL if it isn't already
-- This ensures data integrity for all user records
ALTER TABLE users 
ALTER COLUMN password_hash SET NOT NULL;

-- Verify the change
DO $$
DECLARE
    column_type TEXT;
BEGIN
    SELECT data_type INTO column_type
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash';
    
    RAISE NOTICE '✅ Migration completed successfully';
    RAISE NOTICE 'password_hash column type is now: %', column_type;
END $$;
