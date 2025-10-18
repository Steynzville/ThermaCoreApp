-- Migration: Add user approval workflow fields
-- Description: Adds fields to support admin approval workflow for user registrations
-- Date: 2025-10-18

-- Add approval workflow columns to users table
ALTER TABLE users 
ADD COLUMN registration_status VARCHAR(20) DEFAULT 'approved' NOT NULL,
ADD COLUMN approved_by INTEGER REFERENCES users(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN rejection_reason TEXT,
ADD COLUMN registration_notes TEXT;

-- Create index for faster pending user queries
CREATE INDEX idx_users_registration_status ON users(registration_status);

-- Update existing users to 'approved' status (they were approved implicitly)
UPDATE users SET registration_status = 'approved' WHERE registration_status IS NULL OR registration_status = '';

-- Add comment for documentation
COMMENT ON COLUMN users.registration_status IS 'User registration approval status: pending, approved, rejected, invited';
COMMENT ON COLUMN users.approved_by IS 'User ID of the admin who approved this registration';
COMMENT ON COLUMN users.approved_at IS 'Timestamp when the registration was approved';
COMMENT ON COLUMN users.rejection_reason IS 'Reason provided when registration was rejected';
COMMENT ON COLUMN users.registration_notes IS 'Admin notes about the registration approval/rejection';
