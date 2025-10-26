-- Migration 009: Add User Approval Workflow Columns
-- Description: Adds registration_status and related approval workflow fields to users table
-- Safe to run multiple times (idempotent with IF NOT EXISTS)
-- IMPORTANT: Existing users are automatically approved to prevent access disruption

-- Add registration_status column with default 'approved' for existing users
-- This ensures existing users maintain their access
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_status VARCHAR(20) DEFAULT 'approved';

-- Add approval_date column to track when a user was approved
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;

-- Add approved_by column to track which admin approved the user
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER;

-- Add rejection_reason column for documenting why a user was rejected
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing users to have 'approved' status and set approval_date to created_at
-- This ensures all existing users remain approved with historical approval date
UPDATE users 
SET registration_status = 'approved',
    approval_date = created_at
WHERE registration_status IS NULL OR registration_status = 'approved';

-- Create index on registration_status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_users_registration_status ON users(registration_status);

-- Create index on approved_by for audit queries
CREATE INDEX IF NOT EXISTS idx_users_approved_by ON users(approved_by);

-- Add foreign key constraint for approved_by (optional, for referential integrity)
-- Note: This assumes the approving user won't be deleted; adjust as needed
-- ALTER TABLE users ADD CONSTRAINT fk_users_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Verification query to check all columns exist
-- SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name IN ('registration_status', 'approval_date', 'approved_by', 'rejection_reason')
-- ORDER BY ordinal_position;
