-- Change password_hash to TEXT for long scrypt hashes
-- This migration fixes the issue where password_hash VARCHAR(128) is too short
-- for scrypt-based password hashes which can exceed 128 characters

-- Alter the password_hash column to TEXT type to support longer hashes
ALTER TABLE users ALTER COLUMN password_hash TYPE TEXT;

-- Also ensure the column is NOT NULL since passwords are required
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- Display confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Changed password_hash column to TEXT for long scrypt hashes';
    RAISE NOTICE '   This allows password hashes of any length';
END $$;
