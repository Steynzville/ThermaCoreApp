# Migration 005 Production Deployment Guide

## 🎯 Objective
Apply migration 005 to the production database to fix the password_hash column type from VARCHAR(128) to TEXT, enabling proper storage of scrypt password hashes (~162 characters).

## ⚠️ Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Backup**: Production database backup completed
- [ ] **Access**: DATABASE_URL from Render dashboard
- [ ] **Tools**: `psql` client installed and tested
- [ ] **Permissions**: Database admin permissions
- [ ] **Time**: Maintenance window scheduled (5-10 minutes)
- [ ] **Rollback**: Rollback plan reviewed

## 🚀 Step-by-Step Deployment

### Step 1: Get Production Database URL

1. Go to https://dashboard.render.com
2. Click on your backend service
3. Navigate to **Environment** tab
4. Copy the `DATABASE_URL` value

### Step 2: Set Environment Variables

```bash
# Set the production database URL
export DATABASE_URL="postgresql://user:pass@host:port/database"

# Verify connection
psql "$DATABASE_URL" -c "SELECT current_database();"
```

Expected output: Your database name

### Step 3: Check Current State

```bash
cd /home/runner/work/ThermaCoreApp/ThermaCoreApp/backend

# Check if migration 005 is already applied
psql "$DATABASE_URL" -c "SELECT * FROM migration_history WHERE migration_name = '005_fix_password_hash_length.sql';"

# Check current password_hash column type
psql "$DATABASE_URL" -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';"
```

**If migration is already applied:**
- data_type will be "text"
- Migration will be in migration_history
- ✅ No action needed, proceed to verification

**If migration is NOT applied:**
- data_type will be "character varying"
- character_maximum_length will be "128"
- ⚠️ Proceed with migration

### Step 4: Apply Migration 005

```bash
cd /home/runner/work/ThermaCoreApp/ThermaCoreApp/backend

# Run the automated migration script
bash apply_migrations.sh
```

**What the script does:**
1. Creates migration_history table if needed
2. Checks which migrations are already applied
3. Applies only missing migrations (including 005)
4. Verifies the password_hash column is TEXT
5. Displays migration summary

**Expected output:**
```
==========================================
ThermaCore Database Migration Tool
==========================================

✅ Migration tracking table ready
✓ 001_initial_schema.sql (already applied)
✓ 002_seed_data.sql (already applied)
✓ 003_update_rbac_security.sql (already applied)
✓ 004_fix_null_roles.sql (already applied)
➤ Applying 005_fix_password_hash_length.sql...
✅ 005_fix_password_hash_length.sql applied successfully

==========================================
✅ All migrations completed successfully
==========================================

✅ password_hash is TEXT (correct)
```

### Step 5: Verify Migration Success

```bash
cd /home/runner/work/ThermaCoreApp/ThermaCoreApp/backend

# Run verification script
python verify_password_hash_migration.py
```

**Expected output:**
```
======================================================================
ThermaCore Password Hash Column Verification
======================================================================

✓ Connecting to database...
✓ Connected successfully
✓ users table exists

Checking password_hash column type...
   Column name: password_hash
   Data type: text
   Max length: unlimited
   Nullable: NO

======================================================================
✅ SUCCESS: password_hash is correctly set to TEXT
======================================================================

Testing password hash storage...
   Generated password hash length: 162 characters
   Saved password hash length: 162 characters

✅ Password hash stored successfully without truncation
✅ Password verification works correctly
```

### Step 6: Test Admin User Creation

```bash
cd /home/runner/work/ThermaCoreApp/ThermaCoreApp/backend

# Set required environment variables
export JWT_SECRET_KEY="your-jwt-secret-from-render"
export SECRET_KEY="your-secret-key-from-render"

# Create admin user (if needed)
python scripts/create_first_admin.py
```

**Expected output (if admin doesn't exist):**
```
======================================================================
✅ First admin user created!
======================================================================
Username: Steyn_Admin
Password: [HIDDEN]
Email: Steyn.Enslin@ThermaCore.com.au
======================================================================
⚠️  Please login and change password immediately.
======================================================================
```

**Expected output (if admin already exists):**
```
⚠️  Admin user already exists!
   Username: Steyn_Admin
   Email: Steyn.Enslin@ThermaCore.com.au

No new admin user created.
```

### Step 7: Test Authentication (Frontend)

1. Navigate to https://thermacoreapp.netlify.app
2. Click on **Login**
3. Enter credentials:
   - Username: `Steyn_Admin`
   - Password: `password` (or the actual password you set)
4. Click **Submit**

**Expected result:**
- ✅ Login successful
- ✅ Redirected to dashboard
- ✅ No "value too long" errors
- ✅ Authentication token received

### Step 8: Test Authentication (API)

```bash
# Test login endpoint
curl -X POST https://your-app.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Steyn_Admin","password":"password"}'
```

**Expected response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer"
}
```

## ✅ Post-Deployment Validation

### Database Verification

```bash
# Verify password_hash column type
psql "$DATABASE_URL" -c "SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';"
```

Expected: `text`

### Migration History Check

```bash
# Verify migration 005 is recorded
psql "$DATABASE_URL" -c "SELECT * FROM migration_history ORDER BY applied_at;"
```

Expected: 005_fix_password_hash_length.sql should be in the list

### Application Health Check

```bash
cd /home/runner/work/ThermaCoreApp/ThermaCoreApp/backend

# Run health check
python health_check.py
```

Expected: All checks should pass

## 🔄 Rollback Procedure (If Needed)

**⚠️ Only use if migration causes issues**

```sql
-- Connect to database
psql $DATABASE_URL

-- Revert password_hash to VARCHAR(128)
ALTER TABLE users ALTER COLUMN password_hash TYPE VARCHAR(128);

-- Remove migration from history
DELETE FROM migration_history WHERE migration_name = '005_fix_password_hash_length.sql';
```

**⚠️ Note:** After rollback, you will experience the original truncation errors again. This should only be done if there's a critical issue with the TEXT type.

## 📊 Success Criteria

All of the following must be true:

- [x] Migration 005 applied without errors
- [x] password_hash column is TEXT type
- [x] Admin user creation succeeds (no truncation errors)
- [x] Authentication works via frontend (https://thermacoreapp.netlify.app)
- [x] Authentication works via API
- [x] verify_password_hash_migration.py passes all checks
- [x] No "value too long" errors in logs
- [x] Existing users can still authenticate

## 🐛 Troubleshooting

### Issue: "DATABASE_URL environment variable is not set"

**Solution:**
```bash
export DATABASE_URL="postgresql://user:pass@host:port/database"
```

### Issue: "psql: command not found"

**Solution:**
```bash
# Install PostgreSQL client
# Ubuntu/Debian:
sudo apt-get install postgresql-client

# macOS:
brew install postgresql
```

### Issue: "Migration 005 already applied but column is still VARCHAR"

**Possible causes:**
1. Connected to wrong database
2. Migration failed silently
3. Cached connection

**Solution:**
```bash
# Verify current database
psql "$DATABASE_URL" -c "SELECT current_database();"

# Check migration history
psql "$DATABASE_URL" -c "SELECT * FROM migration_history WHERE migration_name = '005_fix_password_hash_length.sql';"

# If not present, apply manually
psql "$DATABASE_URL" -f migrations/005_fix_password_hash_length.sql

# Verify fix
psql "$DATABASE_URL" -c "SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';"
```

### Issue: "Authentication still fails after migration"

**Solution:**
```bash
# Check if there are users with truncated hashes
psql "$DATABASE_URL" -c "SELECT id, username, LENGTH(password_hash) as hash_length FROM users WHERE LENGTH(password_hash) = 128;"

# If users found, they need to reset passwords
# Option 1: Use admin panel to reset passwords
# Option 2: Run password reset script (if available)
```

## 📞 Support

If you encounter issues:

1. Check the logs: `psql "$DATABASE_URL" -c "SELECT * FROM migration_history;"`
2. Run verification: `python verify_password_hash_migration.py`
3. Check application logs on Render dashboard
4. Review this guide's troubleshooting section

## 📝 Deployment Record

**Date:** _______________________  
**Performed by:** _______________________  
**Migration 005 status:** ☐ Applied ☐ Already applied  
**Verification passed:** ☐ Yes ☐ No  
**Authentication tested:** ☐ Yes ☐ No  
**Issues encountered:** _______________________  
**Resolution:** _______________________

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-14
