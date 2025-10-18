-- Migration: Add user profile fields for multi-tenancy and enhanced user management
-- Version: 007
-- Description: Adds phone_number, company, company_identifier, department, and position columns to users table

-- Add phone_number column
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

-- Add company column
ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(200);

-- Add company_identifier column (auto-generated unique identifier for batching)
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_identifier VARCHAR(100);

-- Add department column
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Add position column
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);

-- Create index on company for company-based queries
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);

-- Create index on company_identifier for batch operations
CREATE INDEX IF NOT EXISTS idx_users_company_identifier ON users(company_identifier);

-- Create index on username for faster lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create index on email for faster lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
