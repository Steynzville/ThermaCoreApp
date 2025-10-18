-- Migration: Add user profile fields for multi-tenancy and enhanced user management (SQLite)
-- Version: 007
-- Description: Adds phone_number, company, company_identifier, department, and position columns to users table

-- Add phone_number column
ALTER TABLE users ADD COLUMN phone_number VARCHAR(50);

-- Add company column
ALTER TABLE users ADD COLUMN company VARCHAR(200);

-- Add company_identifier column (auto-generated unique identifier for batching)
ALTER TABLE users ADD COLUMN company_identifier VARCHAR(100);

-- Add department column
ALTER TABLE users ADD COLUMN department VARCHAR(100);

-- Add position column
ALTER TABLE users ADD COLUMN position VARCHAR(100);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_company_identifier ON users(company_identifier);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
