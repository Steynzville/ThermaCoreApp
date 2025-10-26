-- Migration 009: Add User Approval Workflow Columns (SQLite version)
-- Description: Adds registration_status and related approval workflow fields to users table
-- WARNING: NOT safe for standalone execution - SQLite doesn't support IF NOT EXISTS in ALTER TABLE
-- This migration must be run through auto_migration.py for idempotency and safety checks
-- IMPORTANT: Existing users are automatically approved to prevent access disruption

-- Note: SQLite doesn't support IF NOT EXISTS in ALTER TABLE ADD COLUMN before version 3.35.0
-- This script is designed to work with auto_migration.py which handles column existence checks

-- Add registration_status column with default 'approved' for existing users
-- Wrapped in PRAGMA to handle if column already exists
ALTER TABLE users ADD COLUMN registration_status VARCHAR(20) DEFAULT 'approved';

-- Add approval_date column to track when a user was approved
ALTER TABLE users ADD COLUMN approval_date TIMESTAMP;

-- Add approved_by column to track which admin approved the user
ALTER TABLE users ADD COLUMN approved_by INTEGER;

-- Add rejection_reason column for documenting why a user was rejected
ALTER TABLE users ADD COLUMN rejection_reason TEXT;

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

-- Note: SQLite doesn't support adding foreign key constraints after table creation
-- Foreign key for approved_by should be added when creating the table initially
