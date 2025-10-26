-- Migration: Add permissions column and update emergency_admin
-- This migration adds a permissions column to the users table and grants
-- comprehensive permissions to the emergency_admin account.

-- Add permissions column if it doesn't exist (PostgreSQL)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'permissions'
    ) THEN
        ALTER TABLE users ADD COLUMN permissions JSONB;
        RAISE NOTICE 'Added permissions column to users table';
    ELSE
        RAISE NOTICE 'Permissions column already exists';
    END IF;
END $$;

-- Update emergency_admin user with comprehensive permissions if user exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE username = 'emergency_admin') THEN
        UPDATE users 
        SET permissions = '["read_units", "write_units", "delete_units", "read_users", "write_users", "delete_users", "admin_panel", "remote_control"]'::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE username = 'emergency_admin';
        RAISE NOTICE 'Updated emergency_admin user with comprehensive permissions';
    ELSE
        RAISE NOTICE 'Emergency_admin user does not exist yet (will be created when needed)';
    END IF;
END $$;

-- Create index on permissions for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING gin (permissions);

COMMENT ON COLUMN users.permissions IS 'Direct user permissions stored as JSONB array. Takes precedence over role-based permissions. Used for emergency admin and special access scenarios.';
