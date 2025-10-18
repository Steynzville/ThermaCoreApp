-- Migration: Add user profile fields for multi-tenancy and enhanced user management (SQLite)
-- Version: 007
-- Description: Adds phone_number, company, company_identifier, department, and position columns to users table

-- Add phone_number column if it does not exist
-- The following block checks if the column exists before adding it
PRAGMA foreign_keys=off;
BEGIN TRANSACTION;
CREATE TEMP TABLE IF NOT EXISTS _columns_to_add(name, type);
INSERT INTO _columns_to_add(name, type) VALUES
  ('phone_number', 'VARCHAR(50)'),
  ('company', 'VARCHAR(200)'),
  ('company_identifier', 'VARCHAR(100)'),
  ('department', 'VARCHAR(100)'),
  ('position', 'VARCHAR(100)');
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'phone_number') THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(50);
    END IF;
END;
$$;

-- For each column, check if it exists, and if not, add it
-- phone_number
INSERT INTO _columns_to_add(name, type)
  SELECT 'phone_number', 'VARCHAR(50)'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'phone_number');
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'company') THEN
        ALTER TABLE users ADD COLUMN company VARCHAR(200);
    END IF;
END;
$$;

-- company
INSERT INTO _columns_to_add(name, type)
  SELECT 'company', 'VARCHAR(200)'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'company');
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'company_identifier') THEN
        ALTER TABLE users ADD COLUMN company_identifier VARCHAR(100);
    END IF;
END;
$$;

-- company_identifier
INSERT INTO _columns_to_add(name, type)
  SELECT 'company_identifier', 'VARCHAR(100)'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'company_identifier');
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'department') THEN
        ALTER TABLE users ADD COLUMN department VARCHAR(100);
    END IF;
END;
$$;

-- department
INSERT INTO _columns_to_add(name, type)
  SELECT 'department', 'VARCHAR(100)'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'department');
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'position') THEN
        ALTER TABLE users ADD COLUMN position VARCHAR(100);
    END IF;
END;
$$;

-- position
INSERT INTO _columns_to_add(name, type)
  SELECT 'position', 'VARCHAR(100)'
  WHERE NOT EXISTS (SELECT 1 FROM pragma_table_info('users') WHERE name = 'position');

-- Now, for each column in _columns_to_add, add the column if not present
-- (This step requires a client-side script or migration tool to loop over the table and execute ALTER TABLE for each missing column)
-- If running manually, execute the following for each row in _columns_to_add:
-- ALTER TABLE users ADD COLUMN <name> <type>;

DROP TABLE _columns_to_add;
COMMIT;
PRAGMA foreign_keys=on;
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_company_identifier ON users(company_identifier);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
