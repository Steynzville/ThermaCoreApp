-- Migration 008: Comprehensive User Profile Fields Migration
-- This migration ensures all required user profile fields exist with correct specifications
-- Safe to run multiple times (idempotent with IF NOT EXISTS)

-- Add phone_number column
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add company column with default value
ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(255) DEFAULT 'Default';

-- Add company_identifier column
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_identifier VARCHAR(255);

-- Add department column
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Add position column
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);

-- Add first_name column (ensures it exists even if initial schema migration was incomplete)
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);

-- Add last_name column (ensures it exists even if initial schema migration was incomplete)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Add is_active column with default value (ensures it exists even if initial schema migration was incomplete)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add last_login column (ensures it exists even if initial schema migration was incomplete)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Create indexes for performance (if they don't already exist)
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_company_identifier ON users(company_identifier);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Verification query to check all columns exist
-- Run this after the migration to verify success
-- SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;
