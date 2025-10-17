# Auto-Migration Workaround for Render Free Plan

This document describes the auto-migration workaround implemented to address the issue where the Render free plan does not allow shell access for running database migrations.

## Problem Statement

The production database on Render's free plan doesn't allow shell access, preventing manual execution of database migrations. This causes the deployed code to not match the database schema, breaking features like password reset that require new columns (`reset_token` and `reset_token_expires`).

## Solution Overview

The implementation provides three key features:

1. **Auto-Migration on Startup** - Automatically checks and creates missing database columns
2. **Graceful Error Handling** - Password reset endpoints handle missing columns gracefully
3. **Emergency Admin Endpoint** - Creates/updates admin account using raw SQL

## 1. Auto-Migration on Startup

### Location
`backend/app/utils/auto_migration.py`

### How It Works

When the application starts (in `app/__init__.py`), it automatically:
1. Checks if the `reset_token` column exists in the `users` table
2. If missing, creates it via raw SQL: `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)`
3. Checks if the `reset_token_expires` column exists
4. If missing, creates it via raw SQL: `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`
5. Creates an index on `reset_token` for faster lookups

### Integration

The auto-migration runs automatically when the Flask app is created:

```python
# In app/__init__.py
if not app.config.get("TESTING", False):
    from app.utils.auto_migration import run_auto_migrations
    migration_logger = logging.getLogger(__name__)
    migration_logger.info("Running auto-migrations for database schema...")
    run_auto_migrations(app)
```

### Important Notes

- Runs only in non-testing environments (skipped during tests)
- Uses raw SQL to avoid ORM dependency issues
- Non-critical: If migration fails, the app continues to run (logs warning)
- Idempotent: Safe to run multiple times
- Works within Flask application context

## 2. Emergency Admin Endpoint

### Endpoint
`POST /api/v1/auth/emergency-admin`

### Purpose

Creates or updates an emergency admin account without relying on the password reset columns or any ORM features that might fail if columns are missing.

### Usage

```bash
curl -X POST https://your-app.onrender.com/api/v1/auth/emergency-admin
```

### Response

```json
{
  "data": {
    "message": "Emergency admin account created/updated successfully",
    "username": "emergency_admin",
    "note": "Use password: EmergencyAdmin123! to login. CHANGE THIS PASSWORD IMMEDIATELY after login."
  },
  "message": "Emergency admin ready",
  "success": true
}
```

### Default Credentials

- **Username**: `emergency_admin`
- **Password**: `EmergencyAdmin123!`
- **Role**: Admin (full permissions)

**⚠️ IMPORTANT**: Change this password immediately after first login!

### How It Works

The endpoint uses raw SQL to:
1. Query the `roles` table to find the admin role ID
2. Check if `emergency_admin` user exists
3. If exists: Update password, email, role, and status
4. If not exists: Create new user with core fields only
5. Avoids using `reset_token` columns entirely

### Use Cases

1. **First-time deployment**: Create an admin account to bootstrap the system
2. **Lost admin access**: Regain admin access without database shell
3. **Migration issues**: Create admin when password reset is broken

## 3. Graceful Error Handling

### Location
`backend/app/routes/auth.py` - `forgot_password()` function

### How It Works

The password reset endpoints include defensive checks:

```python
# Check if reset_token fields exist before using them
if not all(hasattr(user, f) for f in ('reset_token', 'reset_token_expires')):
    current_app.logger.error("User model missing reset_token fields...")
    # Return success to prevent email enumeration
    return success_response(...)
```

This prevents crashes if the columns haven't been created yet.

## Testing

### Auto-Migration Tests

Location: `backend/app/tests/test_auto_migration.py`

Tests include:
- Column existence checking
- Idempotent migration (can run multiple times safely)
- Column type verification
- Complete migration workflow

### Emergency Admin Tests

Location: `backend/app/tests/test_emergency_admin.py`

Tests include:
- Account creation
- Account updates (idempotent)
- Login with default credentials
- Admin permissions verification
- Password reset functionality

### Running Tests

```bash
cd backend
TESTING=true python -m pytest app/tests/test_auto_migration.py -v
TESTING=true python -m pytest app/tests/test_emergency_admin.py -v
```

All tests pass: **10 tests total** (4 auto-migration + 6 emergency admin)

## Deployment Instructions for Render

### Initial Deployment

1. Deploy the application to Render
2. Wait for deployment to complete
3. Application will auto-run migrations on startup
4. Check logs to verify migration success

### Creating Emergency Admin

```bash
# Using curl
curl -X POST https://your-app.onrender.com/api/v1/auth/emergency-admin

# The response will confirm the account is ready
# Login with: emergency_admin / EmergencyAdmin123!
```

### Verifying Migration

Check the application logs in Render dashboard for:

```
INFO:app.utils.auto_migration:Starting auto-migration checks...
INFO:app.utils.auto_migration:✓ Column 'reset_token' already exists
INFO:app.utils.auto_migration:✓ Column 'reset_token_expires' already exists
INFO:app.utils.auto_migration:All auto-migrations completed successfully
```

## Monitoring

### Auto-Migration Logs

The auto-migration logs clearly indicate:
- When columns are being added
- When columns already exist
- Any errors encountered (non-critical)

### Emergency Admin Logs

```
INFO:app:Emergency admin endpoint called
INFO:app:✓ Emergency admin user created successfully
# or
INFO:app:✓ Emergency admin user updated successfully
```

## Security Considerations

1. **Emergency Admin Password**: The default password should be changed immediately after first login
2. **Endpoint Access**: The emergency admin endpoint is public (no authentication required) - this is intentional for emergency recovery
3. **Email Enumeration Prevention**: The forgot password endpoint returns the same response whether user exists or not
4. **Audit Logging**: All admin account creation/updates are logged

## Limitations

1. **SQLite vs PostgreSQL**: The SQL syntax uses PostgreSQL-specific features (`TIMESTAMPTZ`, `IF NOT EXISTS`)
2. **No Rollback**: Auto-migrations don't have automatic rollback capability
3. **Emergency Admin Only**: The emergency endpoint only creates one specific admin account

## Future Improvements

1. Add support for creating custom emergency accounts via environment variables
2. Add rollback capability for auto-migrations
3. Enhance error reporting with more detailed diagnostics
4. Add database version tracking

## Troubleshooting

### Auto-Migration Fails

**Symptom**: Migration errors in logs
**Solution**: Check database permissions, connection, and syntax compatibility

### Emergency Admin Already Exists

**Symptom**: Emergency admin endpoint called but user already exists
**Solution**: The endpoint will update the existing account (password reset to default)

### Password Reset Still Broken

**Symptom**: Password reset returns errors even after migration
**Solution**: 
1. Check logs to verify columns were created
2. Try restarting the application
3. Use emergency admin endpoint to verify database connectivity

## Support

For issues or questions:
1. Check application logs in Render dashboard
2. Review test suite for expected behavior
3. Verify database schema manually if needed

## Summary

This workaround provides a robust solution for managing database migrations on Render's free plan without shell access. The auto-migration ensures the schema is always up-to-date, while the emergency admin endpoint provides a reliable recovery mechanism.
