# Emergency Admin Permissions Enhancement

## Overview
This document describes the enhanced emergency admin permissions implementation that grants the `emergency_admin` account full administrative capabilities, including the ability to create new users.

## Changes Made

### 1. User Model (`backend/app/models/__init__.py`)
- **Added `permissions` field**: JSON column that stores direct user permissions as an array
- **Enhanced `has_permission()` method**: 
  - Now checks direct user permissions first (takes precedence)
  - Falls back to role-based permissions if no direct permissions match
  - Maintains type safety with proper error handling

```python
permissions = Column(JSON, nullable=True)  # Direct user permissions
```

### 2. Emergency Admin Endpoint (`backend/app/routes/auth.py`)
- **Updated `/auth/emergency-admin` endpoint**:
  - Grants comprehensive permissions array to emergency_admin
  - Includes all 8 permissions: read_units, write_units, delete_units, read_users, write_users, delete_users, admin_panel, remote_control
  - Works via raw SQL to avoid ORM issues
  - Idempotent - can be called multiple times safely

### 3. Authorization Middleware (`backend/app/middleware/authorization.py`)
- **Added emergency admin bypass logic** in both decorators:
  - `@permission_required`: Bypasses permission checks for active emergency_admin
  - `@role_required`: Bypasses role checks for active emergency_admin
  - Includes comprehensive audit logging for security tracking
  - Only active when user is both named "emergency_admin" AND is_active=True

### 4. Auto-Migration (`backend/app/utils/auto_migration.py`)
- **Added `add_permissions_column()`**: Creates permissions column if missing
- **Added `update_emergency_admin_permissions()`**: Updates existing emergency_admin with full permissions
- **Integrated into `run_auto_migrations()`**: Runs automatically on app startup

### 5. SQL Migrations
- **PostgreSQL**: `006_add_emergency_admin_permissions.sql`
  - Uses JSONB for efficient JSON storage
  - Includes GIN index for fast permission lookups
  - Handles existing installations gracefully
- **SQLite**: `006_add_emergency_admin_permissions_sqlite.sql`
  - Uses TEXT for JSON storage (SQLite compatible)
  - Simpler migration without advanced PostgreSQL features

## Comprehensive Permissions Granted

The emergency_admin user receives all available permissions:

1. **read_units** - View unit information
2. **write_units** - Create and update units
3. **delete_units** - Delete units
4. **read_users** - View user information
5. **write_users** - Create and update users ✨ (KEY CAPABILITY)
6. **delete_users** - Delete/deactivate users
7. **admin_panel** - Access administration panel
8. **remote_control** - Remote control access to units

## Usage

### Creating/Updating Emergency Admin

Call the emergency admin endpoint (no authentication required):

```bash
curl -X POST http://localhost:5000/api/v1/auth/emergency-admin
```

This will:
1. Create emergency_admin user if it doesn't exist
2. Update password to `EmergencyAdmin123!`
3. Grant comprehensive permissions
4. Activate the account

### Login as Emergency Admin

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "emergency_admin",
    "password": "EmergencyAdmin123!"
  }'
```

### Create a New User as Emergency Admin

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <emergency_admin_token>" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "role_id": 3
  }'
```

## Security Considerations

### Safeguards in Place
1. **Username-specific**: Only the exact username "emergency_admin" gets bypass
2. **Active status required**: Must be is_active=True to bypass permissions
3. **Audit logging**: All bypass operations are logged with special markers
4. **Password reset on creation**: Calling the endpoint resets to default password

### Best Practices
1. **Change the password immediately** after using emergency admin
2. **Disable when not needed**: Set is_active=False via database when emergency access isn't required
3. **Monitor audit logs**: Watch for emergency_admin_bypass events
4. **Regular rotation**: Change emergency admin password regularly

## Testing

### Automated Tests
Run the emergency admin test suite:
```bash
pytest backend/app/tests/test_emergency_admin.py -v
```

### Manual Testing Steps
1. Deploy changes to environment
2. Call `/auth/emergency-admin` endpoint
3. Login as emergency_admin
4. Create a new user via `/auth/register`
5. Verify user creation succeeds
6. Check for permission errors (should be none)

## Rollback Procedure

If issues arise, rollback by:

1. **Disable emergency admin**: Update database to set is_active=False
   ```sql
   UPDATE users SET is_active = false WHERE username = 'emergency_admin';
   ```

2. **Revert code changes**: 
   ```bash
   git revert <commit-hash>
   ```

3. **Remove permissions column** (optional, if causing issues):
   ```sql
   ALTER TABLE users DROP COLUMN IF EXISTS permissions;
   ```

## Database Schema

### New Column
```sql
permissions JSONB  -- PostgreSQL
permissions TEXT   -- SQLite
```

Stores permissions as JSON array:
```json
["read_units", "write_units", "delete_units", "read_users", "write_users", "delete_users", "admin_panel", "remote_control"]
```

### Index (PostgreSQL only)
```sql
CREATE INDEX idx_users_permissions ON users USING gin (permissions);
```

## Implementation Details

### Permission Precedence
1. **Direct permissions** (stored in user.permissions) - HIGHEST PRIORITY
2. **Emergency admin bypass** (username check in middleware)
3. **Role-based permissions** (via user.role relationship)

### Code Flow
```
Request → JWT Auth → permission_required decorator
                   ↓
              Is emergency_admin + active?
                   ↓ YES              ↓ NO
              GRANT ACCESS      Check permissions
                                     ↓
                              Direct permissions?
                                     ↓ YES    ↓ NO
                              GRANT      Check role
```

## Future Enhancements

Potential improvements for consideration:
1. Time-limited emergency access (expiration timestamp)
2. IP whitelist for emergency admin access
3. Multi-factor authentication requirement
4. Automated notification on emergency admin usage
5. Permission-specific bypass (not all-or-nothing)

## Support

For issues or questions:
1. Check audit logs: `/api/v1/metrics/audit-logs`
2. Review application logs for "emergency_admin" events
3. Verify database state: `SELECT * FROM users WHERE username = 'emergency_admin';`

## References

- User Model: `backend/app/models/__init__.py`
- Auth Routes: `backend/app/routes/auth.py`
- Authorization Middleware: `backend/app/middleware/authorization.py`
- Auto-Migration: `backend/app/utils/auto_migration.py`
- SQL Migrations: `backend/migrations/006_add_emergency_admin_permissions*.sql`
