-- Migration: Add user profile fields for multi-tenancy and enhanced user management (SQLite)
-- Version: 007
-- Description: Adds phone_number, company, company_identifier, department, position, first_name, last_name, is_active, and last_login columns to users table

-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- These columns will be added if they don't already exist
-- If a column already exists, the migration will fail with a "duplicate column" error
-- This is expected and safe - the error can be ignored

-- Add phone_number column
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);

-- Add company column with default value
-- Note: SQLite doesn't enforce VARCHAR length, but we keep it for compatibility
ALTER TABLE users ADD COLUMN company VARCHAR(255) DEFAULT 'Default';

-- Add company_identifier column
ALTER TABLE users ADD COLUMN company_identifier VARCHAR(255);

-- Add department column
ALTER TABLE users ADD COLUMN department VARCHAR(100);

-- Add position column
ALTER TABLE users ADD COLUMN position VARCHAR(100);

-- Add first_name column (in case it's missing from initial schema)
ALTER TABLE users ADD COLUMN first_name VARCHAR(100);

-- Add last_name column (in case it's missing from initial schema)
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);

-- Add is_active column with default value (in case it's missing from initial schema)
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1;

-- Add last_login column (in case it's missing from initial schema)
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_company_identifier ON users(company_identifier);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
