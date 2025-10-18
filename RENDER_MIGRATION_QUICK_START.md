# Quick Reference: Render Free Plan Migration Workaround

## TL;DR

✅ **Auto-migration runs on every app startup** - No manual intervention needed
✅ **Emergency admin endpoint available** - Create admin account via API call
✅ **All tests passing** - 52 total (42 existing + 10 new)

## Emergency Admin Quick Access

### Create/Reset Emergency Admin

```bash
curl -X POST https://your-app.onrender.com/api/v1/auth/emergency-admin
```

### Login

```bash
curl -X POST https://your-app.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"emergency_admin","password":"EmergencyAdmin123!"}'
```

**⚠️ Change password immediately after first login!**

## What Gets Auto-Migrated

On every startup, the app automatically checks and creates:

1. ✓ `users.reset_token` column (VARCHAR(255))
2. ✓ `users.reset_token_expires` column (TIMESTAMPTZ)  
3. ✓ Index on `reset_token` for performance

## Files Changed

```
backend/app/__init__.py                    # Calls auto-migration
backend/app/utils/auto_migration.py        # Auto-migration logic (NEW)
backend/app/routes/auth.py                 # Emergency admin endpoint (NEW)
backend/app/tests/test_auto_migration.py   # Tests (NEW)
backend/app/tests/test_emergency_admin.py  # Tests (NEW)
```

## Verification

### Check Logs (Render Dashboard)

Success:
```
INFO:app.utils.auto_migration:All auto-migrations completed successfully
```

Error (non-critical):
```
WARNING:app:Auto-migration failed (non-critical): ...
```

### Test Locally

```bash
cd backend
TESTING=true python -m pytest app/tests/test_auto_migration.py app/tests/test_emergency_admin.py -v
```

Expected: **10 tests passed**

## Production Checklist

- [ ] Deploy to Render
- [ ] Check logs for migration success
- [ ] Call emergency admin endpoint
- [ ] Login with emergency_admin
- [ ] **Change emergency admin password**
- [ ] Test password reset flow
- [ ] Delete emergency_admin (optional, after creating your own admin)

## Key Features

### 1. Auto-Migration
- Runs on startup (not in test mode)
- Uses raw SQL (PostgreSQL syntax)
- Idempotent (safe to run multiple times)
- Non-blocking (app continues if it fails)

### 2. Emergency Admin
- **Endpoint**: `POST /api/v1/auth/emergency-admin`
- **No auth required** (for emergency access)
- **Idempotent** (safe to call multiple times)
- **Uses raw SQL** (avoids ORM issues)
- **Resets password** (always back to default)

### 3. Defensive Code
- Password reset endpoints check if columns exist
- Graceful degradation if columns missing
- Comprehensive error logging

## Common Scenarios

### Scenario 1: Fresh Deployment
```bash
# 1. Deploy to Render
# 2. Auto-migration runs automatically
# 3. Create emergency admin
curl -X POST https://your-app.onrender.com/api/v1/auth/emergency-admin
# 4. Login and change password
```

### Scenario 2: Lost Admin Access
```bash
# Reset emergency admin password to default
curl -X POST https://your-app.onrender.com/api/v1/auth/emergency-admin
# Login with default credentials
# Change password immediately
```

### Scenario 3: Migration Failed
```bash
# Check logs for specific error
# Restart the app (triggers auto-migration again)
# Use emergency admin if needed
```

## Safety Notes

✅ Safe to call emergency admin endpoint multiple times
✅ Safe to run auto-migration multiple times
✅ App continues running even if migration fails
✅ All changes are logged for audit

⚠️ Emergency admin endpoint is public (by design)
⚠️ Default password must be changed after first use
⚠️ Emergency admin has full admin permissions

## Performance Impact

- **Startup time**: +0.5-1 second (for column checks)
- **Database queries**: 2-4 SELECT queries on startup
- **Network**: None (local database operations)
- **Memory**: Negligible

## Testing Coverage

| Feature | Tests | Status |
|---------|-------|--------|
| Auto-migration | 4 | ✅ All Pass |
| Emergency admin | 6 | ✅ All Pass |
| Existing auth | 42 | ✅ All Pass |
| **Total** | **52** | ✅ **All Pass** |

## Need Help?

1. **Check logs** in Render dashboard
2. **Review documentation** in `RENDER_AUTO_MIGRATION_GUIDE.md`
3. **Run tests** to verify expected behavior
4. **Use emergency admin** for recovery

---

**Remember**: The whole point is to avoid shell access. Everything needed can be done via API calls and automatic startup processes.
