-- Migration: Add password reset token fields to users table
-- Version: 005
-- Description: Adds reset_token and reset_token_expires columns to support password reset functionality

-- Add reset_token column
ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);

-- Add reset_token_expires column
ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP;

-- Create index on reset_token for faster lookups
CREATE INDEX idx_users_reset_token ON users(reset_token);
