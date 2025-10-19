# Quick Reference - User Approval Workflow Migration

## What Was Fixed
Backend crashes due to missing database columns for user approval workflow.

## Columns Added
- `registration_status` - User approval status (pending, approved, rejected, invited)
- `approved_by` - ID of admin who approved the user
- `approved_at` - Timestamp of approval
- `rejection_reason` - Reason for rejection (if applicable)
- `registration_notes` - Admin notes about the registration

## How It Works
**Automatically** - No manual action required!

The migration runs automatically when the backend starts. It:
1. Checks if columns exist
2. Creates missing columns
3. Sets up database index for performance
4. Updates existing users to 'approved' status

## Verification
All columns exist and work correctly:
```
✓ registration_status (VARCHAR(20))
✓ approved_by (INTEGER)
✓ approved_at (TIMESTAMP)
✓ rejection_reason (TEXT)
✓ registration_notes (TEXT)
```

## Testing
- ✅ 9 auto-migration tests pass
- ✅ 5 user registration tests pass
- ✅ End-to-end workflow verified
- ✅ SQLite and PostgreSQL compatible

## Files Modified
1. `backend/app/utils/auto_migration.py` - Added migration function
2. `backend/app/tests/test_auto_migration.py` - Added tests

## Files Created
1. `backend/migrations/add_user_approval_columns.py` - Standalone migration script

## Manual Migration (if needed)
```bash
cd backend
python migrations/add_user_approval_columns.py
```

## Rollback (if needed)
```bash
cd backend
python migrations/add_user_approval_columns.py downgrade
```

## Deployment
Deploy as normal - migration runs automatically on startup.

## Status
✅ **COMPLETE** - Backend will not crash due to missing columns.

## Commit Message
```
fix: add missing database columns for user approval workflow
```

## For More Details
See: `USER_APPROVAL_MIGRATION_SUMMARY.md`
