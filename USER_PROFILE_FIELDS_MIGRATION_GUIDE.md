# User Profile Fields Migration Guide

## Overview

This guide documents the auto-migration for user profile fields that was implemented to resolve the critical authentication system blockage caused by missing columns in the `users` table.

## Problem Statement

The authentication system was blocked due to missing columns in the `users` table, causing schema mismatch errors. The required columns were:

- `phone_number` VARCHAR(20)
- `company` VARCHAR(255) DEFAULT 'Default'
- `company_identifier` VARCHAR(255)
- `department` VARCHAR(100)
- `position` VARCHAR(100)
- `first_name` VARCHAR(100)
- `last_name` VARCHAR(100)
- `is_active` BOOLEAN DEFAULT true
- `last_login` TIMESTAMP

## Solution

The solution implements an **automatic migration system** that runs on every application startup to ensure all required columns exist with the correct specifications.

### Files Changed

1. **backend/app/utils/auto_migration.py**
   - Added `add_user_profile_fields()` function
   - Updated `run_auto_migrations()` to include user profile fields migration
   - Migration is idempotent and safe to run multiple times

2. **backend/app/models/__init__.py**
   - Updated User model to match requested field specifications
   - Changed `phone_number` from VARCHAR(50) to VARCHAR(20)
   - Changed `company` from VARCHAR(200) to VARCHAR(255) with default 'Default'
   - Changed `company_identifier` from VARCHAR(100) to VARCHAR(255)

3. **backend/migrations/007_add_user_profile_fields.sql**
   - Updated to match the exact specifications from the problem statement
   - Added first_name, last_name, is_active, and last_login to ensure completeness

4. **backend/migrations/008_add_user_profile_fields_comprehensive.sql** (NEW)
   - Comprehensive migration script for manual execution if needed
   - Includes verification comments

5. **backend/app/tests/test_auto_migration.py**
   - Added tests for user profile fields migration
   - Tests verify idempotency and column types
   - All 6 tests passing ✅

6. **backend/scripts/verify_user_schema.py** (NEW)
   - Verification script to check database schema
   - Can be run before/after migration
   - Provides detailed report of missing columns and indexes

## Auto-Migration Details

### How It Works

1. The auto-migration runs automatically on every application startup
2. It checks for each required column using SQLAlchemy's inspector
3. If a column is missing, it adds it using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
4. Creates indexes for `company` and `company_identifier` fields
5. All operations are logged for audit purposes

### Key Features

- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Non-blocking** - App continues even if migration fails
- ✅ **Database-aware** - Uses PostgreSQL-specific syntax for production
- ✅ **Logged** - All operations logged for troubleshooting
- ✅ **Tested** - 6 comprehensive tests ensure correctness

### Code Example

```python
def add_user_profile_fields(engine):
    """Add user profile fields to users table if they don't exist."""
    columns_to_add = [
        ('phone_number', "VARCHAR(20)"),
        ('company', "VARCHAR(255) DEFAULT 'Default'"),
        ('company_identifier', "VARCHAR(255)"),
        ('department', "VARCHAR(100)"),
        ('position', "VARCHAR(100)"),
        ('first_name', "VARCHAR(100)"),
        ('last_name', "VARCHAR(100)"),
        ('is_active', "BOOLEAN DEFAULT true"),
        ('last_login', "TIMESTAMP"),
    ]
    
    for column_name, column_def in columns_to_add:
        if not column_exists(engine, 'users', column_name):
            with engine.begin() as conn:
                conn.execute(text(
                    f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {column_name} {column_def}"
                ))
```

## Manual Migration (If Needed)

If you need to run the migration manually on the production database:

### Option 1: Via SQL Script

```bash
# Connect to your database and run:
psql $DATABASE_URL -f backend/migrations/008_add_user_profile_fields_comprehensive.sql
```

### Option 2: Via psql Interactive

```sql
-- Connect to database
\c thermacore

-- Run the migration commands
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(255) DEFAULT 'Default';
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_identifier VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_company_identifier ON users(company_identifier);

-- Verify columns
\d users
```

## Verification

### Automatic Verification (Recommended)

The auto-migration runs on every app startup and logs its progress:

```
INFO:app.utils.auto_migration:Starting auto-migration checks...
INFO:app.utils.auto_migration:Column 'phone_number' not found in 'users' table. Adding...
INFO:app.utils.auto_migration:✓ Column 'phone_number' added successfully
...
INFO:app.utils.auto_migration:User profile fields migration complete: Added columns [...]
INFO:app.utils.auto_migration:All auto-migrations completed successfully
```

### Manual Verification

Use the verification script:

```bash
cd backend
DATABASE_URL=<your-db-url> python scripts/verify_user_schema.py
```

Expected output:
```
✓ 'users' table exists

Verifying columns...
✓ Column 'phone_number' exists with type VARCHAR(20)
✓ Column 'company' exists with type VARCHAR(255)
✓ Column 'company_identifier' exists with type VARCHAR(255)
✓ Column 'department' exists with type VARCHAR(100)
✓ Column 'position' exists with type VARCHAR(100)
✓ Column 'first_name' exists with type VARCHAR(100)
✓ Column 'last_name' exists with type VARCHAR(100)
✓ Column 'is_active' exists with type BOOLEAN
✓ Column 'last_login' exists with type TIMESTAMP

Verifying indexes...
✓ Index 'idx_users_company' exists
✓ Index 'idx_users_company_identifier' exists

======================================================================
VERIFICATION SUMMARY
======================================================================
✅ ALL CHECKS PASSED - Database schema is correct
```

### SQL Verification

```sql
-- List all columns in users table
SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- List all indexes on users table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users';
```

## Testing

Run the auto-migration tests:

```bash
cd backend
TESTING=true python -m pytest app/tests/test_auto_migration.py -v
```

Expected output:
```
app/tests/test_auto_migration.py::TestAutoMigration::test_column_exists_check PASSED
app/tests/test_auto_migration.py::TestAutoMigration::test_add_password_reset_columns_idempotent PASSED
app/tests/test_auto_migration.py::TestAutoMigration::test_run_auto_migrations PASSED
app/tests/test_auto_migration.py::TestAutoMigration::test_password_reset_columns_type PASSED
app/tests/test_auto_migration.py::TestAutoMigration::test_add_user_profile_fields_idempotent PASSED
app/tests/test_auto_migration.py::TestAutoMigration::test_user_profile_fields_columns_type PASSED

6 passed
```

## Production Deployment

### For Render.com Deployment

The auto-migration runs automatically when the app starts. No manual intervention required.

1. **Deploy** the updated code to Render
2. **Check logs** in Render dashboard for migration success messages
3. **Test authentication** with a login API call
4. **Verify** no schema errors in backend logs

### Rollback Plan

If issues occur:

1. The auto-migration is non-critical - app will continue even if it fails
2. Old schema is preserved - no data loss
3. Can manually run migration 008 SQL script
4. Can restore from database backup if needed

## Success Criteria

✅ All columns added with no errors  
✅ Login restored and no more schema errors  
✅ System fully operational  
✅ All tests passing (6/6)  
✅ Verification script passes  
✅ Auto-migration logs show success  

## Troubleshooting

### Issue: Migration Fails on Startup

**Check:** Application logs for specific error message  
**Solution:** Ensure DATABASE_URL is correct and database is accessible

### Issue: Columns Still Missing

**Check:** Run verification script  
**Solution:** Manually run migration 008 SQL script

### Issue: Authentication Still Failing

**Check:** Backend logs for schema-related errors  
**Solution:** Verify all columns exist using `\d users` in psql

## Related Documentation

- [RENDER_AUTO_MIGRATION_GUIDE.md](../RENDER_AUTO_MIGRATION_GUIDE.md)
- [RENDER_MIGRATION_QUICK_START.md](../RENDER_MIGRATION_QUICK_START.md)
- [DATABASE_INITIALIZATION_SUMMARY.md](../DATABASE_INITIALIZATION_SUMMARY.md)

## Support

For issues or questions:

1. Check application logs in Render dashboard
2. Run verification script to diagnose schema issues
3. Review test output for expected behavior
4. Check related documentation listed above
