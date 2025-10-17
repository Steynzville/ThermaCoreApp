-- Migration: Add permissions column and update emergency_admin (SQLite compatible)
-- This migration adds a permissions column to the users table and grants
-- comprehensive permissions to the emergency_admin account.

-- Add permissions column if it doesn't exist (SQLite)
-- SQLite doesn't support IF NOT EXISTS for columns, so we use a different approach
-- This will fail silently if the column already exists (which is acceptable)

ALTER TABLE users ADD COLUMN permissions TEXT;

-- Update emergency_admin user with comprehensive permissions if user exists
UPDATE users 
SET permissions = '["read_units", "write_units", "delete_units", "read_users", "write_users", "delete_users", "admin_panel", "remote_control"]',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'emergency_admin';

-- Note: SQLite doesn't support comments on columns
-- The permissions column stores direct user permissions as JSON text.
-- Takes precedence over role-based permissions. Used for emergency admin and special access scenarios.
