# Database Migration Guide

> **Last Updated**: October 2024  
> **Status**: Production-Ready

Guide for database schema changes, migrations, and data management in ThermaCoreApp.

## Table of Contents

1. [Overview](#overview)
2. [Migration System](#migration-system)
3. [Running Migrations](#running-migrations)
4. [Creating New Migrations](#creating-new-migrations)
5. [Rolling Back Migrations](#rolling-back-migrations)
6. [Data Migrations](#data-migrations)

---

## Overview

ThermaCoreApp uses SQL-based migrations for database schema management:

- **Sequential Versioning**: Numbered migration files (001, 002, 003...)
- **PostgreSQL Primary**: Optimized for PostgreSQL/TimescaleDB
- **SQLite Support**: Alternative migrations for development
- **Auto-Migration**: Automatic execution on startup (production)
- **Rollback Support**: Down migrations for schema changes

---

## Migration System

### Migration File Structure

```
backend/migrations/
├── 001_initial_schema.sql          # Initial tables
├── 002_seed_data.sql                # Default roles, permissions
├── 003_add_user_fields.sql          # Add phone, company fields
├── 004_fix_null_roles.sql           # Fix NULL role_id
├── 005_fix_password_hash_length.sql # Extend password_hash column
├── 006_add_sensor_indexes.sql       # Performance indexes
└── 007_add_user_profile_fields.sql  # Company, department, position
```

### Migration Naming Convention

```
{number}_{description}.sql

Examples:
- 008_add_mqtt_config.sql
- 009_create_alerts_table.sql
- 010_add_unit_metadata.sql
```

---

## Running Migrations

### Automatic Migration (Production)

Migrations run automatically on application startup:

```python
# backend/app/utils/auto_migration.py
def run_auto_migrations():
    """Execute pending migrations on startup"""
    migrations = get_pending_migrations()
    for migration in migrations:
        execute_migration(migration)
```

**Verify in logs**:
```
[2024-10-23 10:00:00] INFO: Running auto-migrations...
[2024-10-23 10:00:01] INFO: Applied migration 007_add_user_profile_fields.sql
[2024-10-23 10:00:02] INFO: All migrations completed successfully
```

### Manual Migration (Development)

```bash
cd backend

# Apply all pending migrations
bash apply_migrations.sh

# Apply specific migration
psql $DATABASE_URL -f migrations/007_add_user_profile_fields.sql

# Check migration status
python scripts/check_migration_status.py
```

### Using Flask CLI

```bash
# Initialize database (runs all migrations)
flask init-db

# Run specific migration
flask migrate apply 007

# Check current version
flask migrate status
```

---

## Creating New Migrations

### Step 1: Create Migration File

```bash
cd backend/migrations

# Create new migration (next number in sequence)
touch 008_add_alert_system.sql
```

### Step 2: Write Migration SQL

**PostgreSQL Version** (`008_add_alert_system.sql`):
```sql
-- Add alert system tables
-- Migration: 008
-- Description: Create alert and notification system
-- Author: DevTeam
-- Date: 2024-10-23

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
    sensor_id INTEGER REFERENCES sensors(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved'))
);

-- Create indexes for performance
CREATE INDEX idx_alerts_unit_id ON alerts(unit_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at DESC);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Grant permissions
GRANT ALL ON alerts TO thermacore_user;
GRANT ALL ON notifications TO thermacore_user;
GRANT USAGE, SELECT ON SEQUENCE alerts_id_seq TO thermacore_user;
GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO thermacore_user;
```

**SQLite Version** (`008_add_alert_system_sqlite.sql`):
```sql
-- SQLite version (no SERIAL, different CHECK syntax)
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
    sensor_id INTEGER REFERENCES sensors(id) ON DELETE CASCADE,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    status TEXT DEFAULT 'active'
);

CREATE INDEX idx_alerts_unit_id ON alerts(unit_id);
CREATE INDEX idx_alerts_status ON alerts(status);
```

### Step 3: Test Migration

```bash
# Test on development database
psql postgresql://localhost/thermacore_dev -f migrations/008_add_alert_system.sql

# Verify tables created
psql postgresql://localhost/thermacore_dev -c "\dt alerts notifications"

# Verify indexes
psql postgresql://localhost/thermacore_dev -c "\di idx_alerts*"
```

### Step 4: Document Migration

Update migration registry:
```python
# backend/migrations/migration_registry.py
MIGRATIONS = [
    {
        'version': '001',
        'file': '001_initial_schema.sql',
        'description': 'Initial database schema'
    },
    # ... existing migrations ...
    {
        'version': '008',
        'file': '008_add_alert_system.sql',
        'description': 'Add alert and notification system'
    }
]
```

---

## Rolling Back Migrations

### Create Down Migration

For each migration, create a corresponding rollback:

**Example**: `008_add_alert_system_down.sql`
```sql
-- Rollback migration 008
-- Drops alert system tables

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS alerts;
```

### Execute Rollback

```bash
# Manual rollback
psql $DATABASE_URL -f migrations/008_add_alert_system_down.sql

# Using script
python scripts/rollback_migration.py 008
```

---

## Data Migrations

### Adding New Fields with Defaults

**Example**: Adding `company_identifier` with auto-generation

```sql
-- Add column
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_identifier VARCHAR(100);

-- Generate identifiers for existing users
UPDATE users 
SET company_identifier = 
    UPPER(REGEXP_REPLACE(company, '[^A-Za-z0-9]', '', 'g')) 
    || '-' 
    || SUBSTRING(MD5(company || email), 1, 8)
WHERE company IS NOT NULL 
  AND company_identifier IS NULL;

-- Create index
CREATE INDEX idx_users_company_identifier ON users(company_identifier);
```

### Migrating User Permissions

**Example**: Adding permissions to existing roles

```sql
-- Update admin role permissions
UPDATE roles 
SET permissions = ARRAY[
    'read_all', 'write_all', 'delete_all', 
    'admin_panel', 'manage_users', 'view_audit_logs',
    'acknowledge_alerts'  -- NEW
]
WHERE name = 'admin';

-- Update operator role permissions
UPDATE roles 
SET permissions = permissions || ARRAY['acknowledge_alerts']
WHERE name = 'operator';
```

### Batch User Updates

**Example**: Activating pending users

```sql
-- Find users needing activation
SELECT id, username, email, created_at
FROM users
WHERE is_active = false 
  AND role_id IS NOT NULL 
  AND created_at < NOW() - INTERVAL '30 days';

-- Activate users (after review)
UPDATE users
SET is_active = true
WHERE is_active = false 
  AND role_id IS NOT NULL;
```

---

## Common Migration Tasks

### Adding a New Table

```sql
CREATE TABLE IF NOT EXISTS example_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_example_name ON example_table(name);
GRANT ALL ON example_table TO thermacore_user;
GRANT USAGE, SELECT ON SEQUENCE example_table_id_seq TO thermacore_user;
```

### Adding a Column

```sql
ALTER TABLE units 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX idx_units_metadata ON units USING gin(metadata);
```

### Modifying a Column

```sql
-- Extend column length
ALTER TABLE users 
ALTER COLUMN password_hash TYPE TEXT;

-- Add NOT NULL constraint
ALTER TABLE sensors 
ALTER COLUMN unit_id SET NOT NULL;

-- Add CHECK constraint
ALTER TABLE units 
ADD CONSTRAINT check_status 
CHECK (status IN ('active', 'inactive', 'maintenance'));
```

### Adding Foreign Key

```sql
ALTER TABLE sensors
ADD CONSTRAINT fk_sensors_unit
FOREIGN KEY (unit_id) 
REFERENCES units(id) 
ON DELETE CASCADE;
```

### Renaming Column/Table

```sql
-- Rename column
ALTER TABLE users 
RENAME COLUMN phone TO phone_number;

-- Rename table
ALTER TABLE old_table_name 
RENAME TO new_table_name;
```

---

## Migration Best Practices

### 1. Always Use IF NOT EXISTS/IF EXISTS

```sql
-- Good
CREATE TABLE IF NOT EXISTS new_table (...);
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field VARCHAR(100);
DROP TABLE IF EXISTS old_table;

-- Bad (will fail if already exists/doesn't exist)
CREATE TABLE new_table (...);
ALTER TABLE users ADD COLUMN new_field VARCHAR(100);
DROP TABLE old_table;
```

### 2. Make Migrations Idempotent

Migrations should be safe to run multiple times:

```sql
-- Check before adding constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_email_format'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT check_email_format 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$');
    END IF;
END $$;
```

### 3. Add Indexes for Performance

```sql
-- Columns used in WHERE clauses
CREATE INDEX idx_users_email ON users(email);

-- Columns used in JOIN operations
CREATE INDEX idx_sensors_unit_id ON sensors(unit_id);

-- Timestamp columns for time-series queries
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);
```

### 4. Handle Existing Data

```sql
-- Add column with default, then update
ALTER TABLE units ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Update existing nulls
UPDATE units SET status = 'active' WHERE status IS NULL;

-- Add NOT NULL constraint after data migration
ALTER TABLE units ALTER COLUMN status SET NOT NULL;
```

### 5. Grant Appropriate Permissions

```sql
-- Grant table access
GRANT ALL ON new_table TO thermacore_user;

-- Grant sequence access (for SERIAL columns)
GRANT USAGE, SELECT ON SEQUENCE new_table_id_seq TO thermacore_user;
```

---

## Troubleshooting Migrations

### Migration Fails

**Check error message**:
```bash
# View last migration attempt
tail -n 50 logs/migration.log
```

**Common errors**:

1. **Column already exists**
   ```sql
   -- Use IF NOT EXISTS
   ALTER TABLE users ADD COLUMN IF NOT EXISTS field VARCHAR(100);
   ```

2. **Foreign key violation**
   ```sql
   -- Temporarily disable constraints
   SET CONSTRAINTS ALL DEFERRED;
   -- Run migration
   SET CONSTRAINTS ALL IMMEDIATE;
   ```

3. **Permission denied**
   ```sql
   -- Grant necessary permissions
   GRANT ALL ON TABLE name TO user;
   ```

### Verify Migration Status

```bash
# Check applied migrations
python scripts/check_migration_status.py

# Output:
# ✅ 001_initial_schema.sql
# ✅ 002_seed_data.sql
# ✅ 007_add_user_profile_fields.sql
# ⏸  008_add_alert_system.sql (pending)
```

---

**Related Documentation:**
- [Setup Guide](../DEVELOPMENT/SETUP_GUIDE.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Database Schema](../DEVELOPMENT/ARCHITECTURE.md#database-design)

*Last Updated: October 2024*
