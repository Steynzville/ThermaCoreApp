# Emergency User Approval Guide

## Problem

After the auto-migration that added the user approval workflow, all existing users (including `emergency_admin`) were set to `pending` status instead of `approved`. This prevents any admin from logging in to approve accounts, creating a deadlock situation.

## Solution

This repository includes two mechanisms to resolve the issue:

### 1. Automatic Fix on Startup (Recommended)

The application now automatically approves all pending users on startup through the `approve_existing_users_emergency()` function in `app/utils/auto_migration.py`.

**How it works:**
- Runs automatically when the application starts
- Updates all users with `registration_status='pending'` to `registration_status='approved'`
- Safe to run multiple times (idempotent)
- Logs the number of users approved

**No action required** - just restart your application and users will be automatically approved.

### 2. Manual Emergency Script

If you need to manually approve users before starting the application, use the emergency script:

```bash
cd backend
python emergency_user_approval.py
```

**What it does:**
- Connects to the database
- Finds all users with `pending` status
- Updates them to `approved` status
- Sets `approved_at` timestamp
- Sets `approved_by` to the `emergency_admin` user (if exists)

**Output:**
```
======================================================================
EMERGENCY USER APPROVAL SCRIPT
======================================================================

This script will approve all users stuck in 'pending' status.
After running this script, users will be able to log in.

Starting emergency user approval process...
Emergency admin ID: 1
✓ All existing users approved (5 users updated)

======================================================================
SUCCESS: Emergency approval completed
======================================================================
Total users approved: 5

Users can now log in to the system.
```

## Environment Setup

The script uses the same configuration as your application. Make sure your environment variables are set:

```bash
# For production
export SECRET_KEY="your-secret-key"
export DATABASE_URL="postgresql://user:pass@host/db"

# Then run the script
python emergency_user_approval.py
```

Or use a `.env` file with the required configuration.

## Safety Features

Both solutions include safety features:

1. **Idempotent**: Can be run multiple times without issues
2. **SQL Injection Protection**: Uses parameterized queries
3. **Transaction Safety**: All changes are atomic
4. **No Data Loss**: Only updates the `registration_status` field

## Verification

After running the fix, verify users can log in:

```bash
# Test login with emergency_admin
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "emergency_admin", "password": "your-password"}'
```

You should receive a successful response with an access token.

## Technical Details

The emergency approval makes the following SQL update:

```sql
UPDATE users 
SET registration_status = 'approved',
    approved_by = (SELECT id FROM users WHERE username = 'emergency_admin' LIMIT 1),
    approved_at = CURRENT_TIMESTAMP
WHERE registration_status = 'pending'
```

This ensures all pending users are immediately approved and can log in.

## Future Prevention

The auto-migration script (`app/utils/auto_migration.py`) has been updated to:

1. Run emergency approval on every startup (line ~474-477)
2. Backfill existing users to 'approved' when the approval columns are added (line ~448-460)

This prevents the issue from occurring again in the future.

## Support

If you encounter issues:

1. Check your database connection settings
2. Verify the `users` table exists
3. Check application logs for detailed error messages
4. Ensure you have the required environment variables set

For additional help, refer to the main README.md or contact support.
