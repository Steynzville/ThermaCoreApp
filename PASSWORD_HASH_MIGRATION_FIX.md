# CRITICAL: Password Hash Migration Fix Guide

## 🚨 Issue Description

**Problem:** The production database has `users.password_hash` as `VARCHAR(128)` instead of `TEXT`, causing password hash truncation errors.

**Error Message:**
```
value too long for type character varying(128)
```

**Impact:**
- Admin user creation fails
- User authentication fails randomly
- Password hashes get truncated (~162 chars scrypt hash → 128 chars)
- System cannot create or authenticate users reliably

**Root Cause:** Migration `005_fix_password_hash_length.sql` was not applied to production database.

---

## ✅ Quick Fix (5 minutes)

### Step 1: Connect to Production Database

Get your `DATABASE_URL` from Render dashboard:
1. Go to https://dashboard.render.com
2. Click on your backend service
3. Go to **Environment** tab
4. Find and copy `DATABASE_URL`

### Step 2: Apply Missing Migration

**Option A: Use Migration Script (Recommended)**

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host:port/database"

# Navigate to backend directory
cd backend

# Run migration script (applies all missing migrations)
bash apply_migrations.sh
```

This script will:
- ✅ Check which migrations have been applied
- ✅ Apply only the missing migrations
- ✅ Track migration history
- ✅ Verify the password_hash column type

**Option B: Manual Migration**

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host:port/database"

# Apply migration 005 directly
psql $DATABASE_URL -f backend/migrations/005_fix_password_hash_length.sql
```

### Step 3: Verify the Fix

```bash
# Run verification script
cd backend
python verify_password_hash_migration.py
```

Expected output:
```
✅ SUCCESS: password_hash is correctly set to TEXT
✅ Password hash stored successfully without truncation
✅ Password verification works correctly
```

**Or verify manually:**

```bash
psql $DATABASE_URL -c "SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';"
```

Expected output: `text`

---

## 🔍 Detailed Diagnosis

### Check Current Column Type

```sql
-- Connect to database
psql $DATABASE_URL

-- Check column type
\d users

-- Or query directly
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'password_hash';
```

**If you see:**
- `VARCHAR(128)` or `character varying(128)` → **Migration 005 NOT applied**
- `TEXT` or `text` → **Migration 005 applied correctly** ✅

---

## 📋 Migration 005 Details

**File:** `backend/migrations/005_fix_password_hash_length.sql`

**What it does:**
1. Changes `password_hash` column from `VARCHAR(128)` to `TEXT`
2. Sets the column to `NOT NULL` (passwords are required)
3. Allows password hashes of any length

**SQL:**
```sql
-- Change password_hash to TEXT for long scrypt hashes
ALTER TABLE users ALTER COLUMN password_hash TYPE TEXT;

-- Ensure the column is NOT NULL
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
```

**Why it's needed:**
- Default Flask password hashing (Werkzeug/scrypt) generates ~162 character hashes
- Original schema used `VARCHAR(128)` which is too short
- Truncated hashes cause authentication to fail

---

## 🧪 Test Password Creation

After applying the migration, test that password hashes work correctly:

```bash
cd backend

# Set environment variables
export DATABASE_URL="postgresql://..."
export JWT_SECRET_KEY="..."  # From Render
export SECRET_KEY="..."      # From Render

# Create a test admin user (if needed)
python scripts/create_first_admin.py
```

If you see this error:
```
value too long for type character varying(128)
```

Then migration 005 was **not applied successfully**. Re-run the migration script.

---

## 🚀 Production Deployment Steps

### For New Deployments

Add this to your deployment script:

```bash
#!/bin/bash
# Deploy script

# Apply all database migrations
cd backend
bash apply_migrations.sh

# Create initial admin user
python scripts/create_first_admin.py

# Start the application
gunicorn ...
```

### For Existing Deployments

1. **Stop creating/modifying users** temporarily
2. **Apply migration 005** using the quick fix above
3. **Verify the fix** with the verification script
4. **Resume normal operations**

---

## 📊 Migration Tracking

The migration script creates a `migration_history` table to track applied migrations:

```sql
-- View migration history
SELECT * FROM migration_history ORDER BY applied_at;

-- Check if migration 005 was applied
SELECT * FROM migration_history WHERE migration_name = '005_fix_password_hash_length.sql';
```

---

## ⚠️ Troubleshooting

### Error: "migration_history table does not exist"

This means you haven't used the migration script yet. Run:
```bash
bash backend/apply_migrations.sh
```

### Error: "relation 'users' does not exist"

The database hasn't been initialized. Run all migrations:
```bash
bash backend/apply_migrations.sh
```

### Error: "Permission denied"

You don't have ALTER TABLE permissions. Contact your database administrator or:
- Ensure you're using the correct database user
- Check that the user has necessary privileges

### Migration appears applied but column is still VARCHAR(128)

Check if multiple databases exist or if you're connected to the wrong database:
```sql
SELECT current_database();
```

---

## 🎯 Success Criteria

You'll know the fix worked when:

- ✅ `users.password_hash` column is `TEXT` type
- ✅ No "value too long" errors when creating users
- ✅ Admin user creation succeeds
- ✅ User authentication works correctly
- ✅ Verification script passes all checks

---

## 📞 Need Help?

If you're still experiencing issues:

1. **Run the verification script:**
   ```bash
   cd backend
   python verify_password_hash_migration.py
   ```

2. **Check the column type:**
   ```bash
   psql $DATABASE_URL -c "\d users"
   ```

3. **Review migration history:**
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM migration_history;"
   ```

4. **Share output** from the above commands for debugging

---

## 📚 Related Files

- Migration script: `backend/apply_migrations.sh`
- Verification script: `backend/verify_password_hash_migration.py`
- Migration 005: `backend/migrations/005_fix_password_hash_length.sql`
- User model: `backend/app/models/__init__.py` (line 130: `password_hash = Column(Text)`)

---

**Last Updated:** 2025-10-14  
**Version:** 1.0
