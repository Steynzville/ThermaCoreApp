# Production Deployment Verification Checklist

## URGENT: Authentication 500 Error - Root Cause Analysis

This document provides a comprehensive checklist to verify that authentication fixes are properly deployed to production and identifies the root cause of persistent 500 errors.

---

## 🔍 Most Likely Root Causes

Based on the error pattern, the 500 error is most likely caused by:

### 1. **Database Not Initialized** (Most Common)
- ⚠️ Tables don't exist (users, roles, permissions)
- ⚠️ Seed data hasn't been loaded
- ⚠️ Admin user doesn't exist

### 2. **Admin User Missing Role Assignment**
- ⚠️ User exists but `role_id` is NULL
- ⚠️ This causes `user.role.name.value` to fail with AttributeError
- ⚠️ Code has error handling, but role check happens AFTER authentication

### 3. **Environment Variables Not Set**
- ⚠️ `DATABASE_URL` pointing to wrong database
- ⚠️ `JWT_SECRET_KEY` not set
- ⚠️ `SECRET_KEY` not set

### 4. **Code Not Deployed**
- ⚠️ Authentication error handling changes not pushed to production
- ⚠️ Render still running old version of code

---

## ✅ Verification Steps

### Step 1: Verify Code is Deployed

1. **Check Render Dashboard**:
   - Go to https://dashboard.render.com
   - Navigate to your `thermacore-backend` service
   - Click on "Events" tab
   - Verify latest deployment shows the commit with authentication fixes
   - Check deployment timestamp

2. **Check Latest Commit**:
   ```bash
   git log --oneline -5
   ```
   - Verify the commit with authentication fixes is present
   - Note the commit SHA

3. **Verify Render is Using Latest Code**:
   - In Render dashboard, check "Deploy" section
   - Confirm it's deploying from the correct branch (main/master)
   - Manual Deploy: Click "Manual Deploy" > "Deploy latest commit" if needed

---

### Step 2: Run Database Diagnostic Script

**On your local machine with production database access:**

```bash
cd backend

# Set production environment variables
export DATABASE_URL="postgresql://..."  # From Render dashboard
export JWT_SECRET_KEY="..."              # From Render dashboard
export SECRET_KEY="..."                  # From Render dashboard

# Run diagnostic script
python diagnose_auth_issue.py
```

**Expected Output:**
- ✅ Database Connection: PASSED
- ✅ Database Tables: PASSED
- ✅ Roles & Permissions: PASSED
- ✅ Admin User: PASSED
- ✅ Login Logic: PASSED

**If any check fails, follow the remediation steps provided by the script.**

---

### Step 3: Verify Database Tables Exist

**Connect to production database:**

```bash
# Get DATABASE_URL from Render dashboard
psql $DATABASE_URL
```

**Run these queries:**

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should show: permissions, role_permissions, roles, units, users, sensors, sensor_readings
```

**If tables don't exist:**
```bash
# Run all migrations using the migration script (recommended)
bash backend/apply_migrations.sh

# Or run manually:
# psql $DATABASE_URL -f backend/migrations/001_initial_schema.sql
# psql $DATABASE_URL -f backend/migrations/002_seed_data.sql
# psql $DATABASE_URL -f backend/migrations/003_update_rbac_security.sql
# psql $DATABASE_URL -f backend/migrations/004_fix_null_roles.sql
# psql $DATABASE_URL -f backend/migrations/005_fix_password_hash_length.sql
```

---

### Step 4: Verify Roles and Permissions

```sql
-- Check roles exist
SELECT id, name, description FROM roles;

-- Expected output:
-- 1 | admin    | ThermaCore staff only - Full system administration
-- 2 | operator | Client power users - Read-only with remote control
-- 3 | viewer   | Client read-only users - View-only access

-- Check permissions exist
SELECT id, name, description FROM permissions;

-- Expected: 8 permissions (read_units, write_units, delete_units, etc.)

-- Check admin role has all permissions
SELECT r.name as role, COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'admin'
GROUP BY r.name;

-- Expected: admin should have 8 permissions
```

**If roles/permissions missing:**
```bash
psql $DATABASE_URL -f backend/migrations/002_seed_data.sql
```

---

### Step 5: Verify Admin User Exists

```sql
-- Check admin user exists
SELECT 
    u.id, 
    u.username, 
    u.email, 
    u.is_active,
    u.role_id,
    r.name as role_name
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.username = 'Steyn_Admin';

-- Expected output:
-- id | username    | email                          | is_active | role_id | role_name
-- 1  | Steyn_Admin | Steyn.Enslin@ThermaCore.com.au | t         | 1       | admin

-- CRITICAL: Check for NULL role_id
SELECT username, role_id FROM users WHERE role_id IS NULL;

-- Expected: No rows (all users must have a role)
```

**If admin user doesn't exist:**
```bash
cd backend
export DATABASE_URL="..."  # From Render
python scripts/create_first_admin.py
```

**If user exists but role_id is NULL (THIS IS THE BUG!):**
```sql
-- Fix: Assign admin role to user
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE username = 'Steyn_Admin';
```

---

### Step 6: Verify Environment Variables in Render

1. **Go to Render Dashboard**:
   - Navigate to your backend service
   - Click "Environment" tab

2. **Verify these variables are set**:
   - ✅ `DATABASE_URL` (auto-generated from database)
   - ✅ `SECRET_KEY` (auto-generated)
   - ✅ `JWT_SECRET_KEY` (auto-generated)
   - ✅ `CORS_ORIGINS` (should include your Netlify domain)
   - ✅ `DEBUG` = "False"

3. **Add CORS_ORIGINS if missing**:
   ```
   Key: CORS_ORIGINS
   Value: https://your-app.netlify.app,https://thermacoreapp.onrender.com
   ```
   
   Replace `your-app.netlify.app` with your actual Netlify domain.

4. **After adding/changing variables**:
   - Click "Save Changes"
   - Service will automatically redeploy

---

### Step 7: Test Login Endpoint Directly

**Using curl:**

```bash
curl -X POST https://thermacoreapp.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Steyn_Admin","password":"Steiner1!"}'
```

**Using the test script:**

```bash
cd backend
python test_login_endpoint.py https://thermacoreapp.onrender.com Steyn_Admin Steiner1!
```

**Expected Response (SUCCESS):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "username": "Steyn_Admin",
      "email": "Steyn.Enslin@ThermaCore.com.au",
      "role": "admin"
    }
  },
  "message": "Login successful"
}
```

**If you get 500 error:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal server error occurred."
  }
}
```

---

### Step 8: Check Production Logs

1. **Go to Render Dashboard**
2. **Navigate to your backend service**
3. **Click "Logs" tab**
4. **Look for error messages around the time of login attempt**

**What to look for:**

- ❌ `Database error during login query` - Database connection issue
- ❌ `User X has no role assigned` - Role missing (NULL role_id)
- ❌ `AttributeError: 'NoneType' object has no attribute 'name'` - user.role is None
- ❌ `OperationalError` - Database not initialized
- ❌ `ProgrammingError: relation "users" does not exist` - Tables missing

---

## 🔧 Common Fixes

### Fix 1: Database Not Initialized

**Symptom:** Logs show "relation 'users' does not exist"

**Solution:**
```bash
# Connect to production database
export DATABASE_URL="..."  # From Render

# Run all migrations (recommended)
bash backend/apply_migrations.sh

# Or run manually:
# psql $DATABASE_URL -f backend/migrations/001_initial_schema.sql
# psql $DATABASE_URL -f backend/migrations/002_seed_data.sql
# psql $DATABASE_URL -f backend/migrations/003_update_rbac_security.sql
# psql $DATABASE_URL -f backend/migrations/004_fix_null_roles.sql
# psql $DATABASE_URL -f backend/migrations/005_fix_password_hash_length.sql

# Create admin user
cd backend
python scripts/create_first_admin.py
```

---

### Fix 2: Admin User Has NULL role_id

**Symptom:** Logs show "User Steyn_Admin has no role assigned" or AttributeError on user.role

**Solution:**
```sql
-- Connect to database
psql $DATABASE_URL

-- Check current state
SELECT id, username, role_id FROM users WHERE username = 'Steyn_Admin';

-- Fix: Assign admin role
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE username = 'Steyn_Admin';

-- Verify fix
SELECT u.username, r.name as role 
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE u.username = 'Steyn_Admin';
```

---

### Fix 3: Code Not Deployed

**Symptom:** Latest commit with fixes not visible in Render

**Solution:**
1. In Render dashboard, click "Manual Deploy"
2. Select "Deploy latest commit"
3. Wait for deployment to complete
4. Check logs to verify new version is running

---

### Fix 4: Environment Variables Missing

**Symptom:** App fails to start or JWT errors in logs

**Solution:**
1. Go to Render dashboard > Environment tab
2. Add missing variables:
   - `JWT_SECRET_KEY` (click "Generate")
   - `SECRET_KEY` (click "Generate")
   - `CORS_ORIGINS` (set to your frontend domain)
3. Save changes (service will redeploy)

---

## 📋 Quick Diagnostic Commands

**Check database tables:**
```bash
psql $DATABASE_URL -c "\dt"
```

**Check admin user:**
```bash
psql $DATABASE_URL -c "SELECT username, email, role_id, is_active FROM users WHERE username = 'Steyn_Admin';"
```

**Check roles:**
```bash
psql $DATABASE_URL -c "SELECT * FROM roles;"
```

**Check permissions:**
```bash
psql $DATABASE_URL -c "SELECT * FROM permissions;"
```

**Test login:**
```bash
curl -X POST https://thermacoreapp.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Steyn_Admin","password":"Steiner1!"}'
```

---

## 🚀 Post-Verification Steps

Once all checks pass:

1. ✅ Test login from frontend (Netlify deployment)
2. ✅ Verify JWT tokens are returned
3. ✅ Test authenticated endpoints
4. ✅ Monitor logs for any errors
5. ✅ Document the root cause for future reference

---

## 📞 Still Having Issues?

If authentication still fails after following all steps:

1. **Run the diagnostic script** and share the full output
2. **Share backend logs** from Render (last 100 lines)
3. **Share database schema** output from `\dt` and `\d users`
4. **Verify code version** deployed in Render matches latest commit

---

## 🎯 Success Criteria

You'll know authentication is working when:

- ✅ Login endpoint returns 200 status
- ✅ Response includes `access_token` and `refresh_token`
- ✅ No errors in backend logs
- ✅ Frontend can authenticate successfully
- ✅ Frontend spinner disappears and user is logged in

---

**Last Updated:** 2025-10-12
**Version:** 1.0
