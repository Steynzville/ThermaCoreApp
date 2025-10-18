-- Migration: Add user approval workflow fields (SQLite version)
-- Description: Adds fields to support admin approval workflow for user registrations
-- Date: 2025-10-18

-- Add approval workflow columns to users table
ALTER TABLE users ADD COLUMN registration_status VARCHAR(20) DEFAULT 'pending' NOT NULL;
ALTER TABLE users ADD COLUMN approved_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN rejection_reason TEXT;
ALTER TABLE users ADD COLUMN registration_notes TEXT;

-- Create index for faster pending user queries
CREATE INDEX IF NOT EXISTS idx_users_registration_status ON users(registration_status);

-- Update existing users to 'approved' status (they were approved implicitly)
UPDATE users SET registration_status = 'approved' WHERE registration_status IS NULL OR registration_status = '';
