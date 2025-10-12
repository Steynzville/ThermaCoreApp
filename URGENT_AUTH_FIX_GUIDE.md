# URGENT: Authentication 500 Error - Fix Guide

## 🚨 Problem Summary

The `/api/v1/auth/login` endpoint returns 500 Internal Server Error despite authentication error handling being added. This guide helps identify and fix the root cause.

---

## 🔍 Quick Diagnosis (3 minutes)

### Option 1: Run Health Check in Production

**SSH into Render or use Render Shell:**

```bash
cd /opt/render/project/src/backend
python health_check.py
```

**Expected Output:**
```
✅ Database: Connected
✅ Tables: OK (Roles: 3, Users: 1, Permissions: 8)
✅ Admin Role: Found (ID: 1, Permissions: 8)
✅ Admin Users: 1 found
   - Steyn_Admin (Active) ✓
✅ JWT_SECRET_KEY: Set
✅ SECRET_KEY: Set
✅ CORS_ORIGINS: https://...
✅ All health checks PASSED
```

**If any check fails, continue to diagnosis below.**

---

### Option 2: Check Production Logs

1. Go to Render Dashboard > thermacore-backend > Logs
2. Try logging in from frontend
3. Look for these error patterns:

**Pattern 1: Database not initialized**
```
ProgrammingError: relation "users" does not exist
```
**Fix:** [Jump to Fix #1](#fix-1-database-not-initialized)

**Pattern 2: User has no role**
```
User Steyn_Admin has no role assigned
```
**Fix:** [Jump to Fix #2](#fix-2-user-missing-role)

**Pattern 3: AttributeError on user.role**
```
AttributeError: 'NoneType' object has no attribute 'name'
```
**Fix:** [Jump to Fix #2](#fix-2-user-missing-role)

**Pattern 4: Database connection failed**
```
OperationalError: could not connect to server
```
**Fix:** [Jump to Fix #4](#fix-4-database-connection-issues)

---

## 🔧 Fixes

### Fix #1: Database Not Initialized

**When:** Logs show "relation 'users' does not exist" or health check shows "Tables: Missing"

**Solution:**

```bash
# Get DATABASE_URL from Render Dashboard
# Go to: thermacore-backend > Environment > DATABASE_URL

# Connect to database
psql $DATABASE_URL

# Check what tables exist
\dt

# If tables are missing, run migrations:
\i /opt/render/project/src/backend/migrations/001_initial_schema.sql
\i /opt/render/project/src/backend/migrations/002_seed_data.sql

# Exit psql
\q
```

**Alternative: Run from local machine**

```bash
# Export DATABASE_URL from Render Dashboard
export DATABASE_URL="postgresql://..."

# Run migrations
psql $DATABASE_URL -f backend/migrations/001_initial_schema.sql
psql $DATABASE_URL -f backend/migrations/002_seed_data.sql

# Create admin user
cd backend
python scripts/create_first_admin.py
```

---

### Fix #2: User Missing Role

**When:** Logs show "User has no role assigned" or health check shows "✗ NO ROLE!"

**This is the MOST COMMON cause of 500 errors!**

**Quick Fix (SQL):**

```bash
# Connect to production database
psql $DATABASE_URL

# Run the fix script
\i /opt/render/project/src/backend/migrations/004_fix_null_roles.sql

# Or manually:
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE username = 'Steyn_Admin' 
  AND role_id IS NULL;

# Verify fix
SELECT u.username, r.name as role 
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE u.username = 'Steyn_Admin';

# Expected output:
#  username    | role  
# -------------+-------
#  Steyn_Admin | admin
```

**After applying fix:**
1. Try logging in again
2. Should work immediately (no restart needed)

---

### Fix #3: Missing Environment Variables

**When:** Health check shows "JWT_SECRET_KEY: Not set" or "SECRET_KEY: Not set"

**Solution:**

1. Go to Render Dashboard
2. Navigate to: thermacore-backend > Environment
3. Add missing variables:

```
Key: JWT_SECRET_KEY
Value: (click "Generate" button)

Key: SECRET_KEY  
Value: (click "Generate" button)

Key: CORS_ORIGINS
Value: https://your-app.netlify.app,https://thermacoreapp.onrender.com
```

4. Click "Save Changes"
5. Wait for automatic redeploy (~2 minutes)
6. Test login again

---

### Fix #4: Database Connection Issues

**When:** Logs show "could not connect to server" or "connection refused"

**Solution:**

1. Check database is running:
   - Go to Render Dashboard
   - Navigate to: thermacore-db
   - Verify status is "Available"

2. Check DATABASE_URL is correct:
   - Go to: thermacore-backend > Environment
   - Verify DATABASE_URL is set and matches database connection string

3. Test connection manually:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

4. If database is down, restart it:
   - In Render dashboard: thermacore-db
   - Click "Restart Database"
   - Wait 1-2 minutes
   - Try login again

---

### Fix #5: Code Not Deployed

**When:** You've made fixes but they're not reflected in production

**Solution:**

1. Check latest commit:
   ```bash
   git log --oneline -5
   ```

2. In Render Dashboard:
   - Go to: thermacore-backend > Manual Deploy
   - Click "Deploy latest commit"
   - Wait for deployment to complete

3. Verify deployment:
   - Check "Events" tab
   - Latest event should show "Deploy live"
   - Note the commit SHA and verify it matches your latest code

---

## 📊 Diagnostic Script (Detailed)

For a comprehensive diagnosis, run the full diagnostic script:

```bash
cd backend

# Set production credentials
export DATABASE_URL="..."  # From Render
export JWT_SECRET_KEY="..." # From Render  
export SECRET_KEY="..."     # From Render

# Run full diagnostics
python diagnose_auth_issue.py
```

**This script checks:**
- ✅ Environment variables
- ✅ Database connection
- ✅ All required tables
- ✅ Roles and permissions
- ✅ Admin user configuration
- ✅ Login logic simulation

**Expected Output (if all good):**
```
✅ Environment Variables: PASSED
✅ Database Connection: PASSED
✅ Database Tables: PASSED
✅ Roles & Permissions: PASSED
✅ Admin User: PASSED
✅ Login Logic: PASSED

✅ ALL CHECKS PASSED - Authentication should be working!
```

---

## 🧪 Test Authentication

After applying fixes, test immediately:

### Test 1: Direct API Call

```bash
curl -X POST https://thermacoreapp.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Steyn_Admin","password":"Steiner1!"}'
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 3600,
    "user": {...}
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal server error occurred."
  }
}
```

If you get the error response, check logs immediately to see which error occurred.

---

### Test 2: Using Test Script

```bash
cd backend
python test_login_endpoint.py https://thermacoreapp.onrender.com Steyn_Admin Steiner1!
```

---

### Test 3: From Frontend

1. Open your Netlify deployment
2. Open browser DevTools (F12)
3. Go to Console tab
4. Try to login
5. Look for:
   - ✅ Network request shows 200 status
   - ✅ Response has `access_token`
   - ❌ Network request shows 500 status (still broken)

---

## 📋 Quick Reference Commands

### Check Database Connection
```bash
psql $DATABASE_URL -c "SELECT 1"
```

### Check Tables Exist
```bash
psql $DATABASE_URL -c "\dt"
```

### Check Admin User
```bash
psql $DATABASE_URL -c "SELECT u.username, r.name as role, u.is_active FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.username = 'Steyn_Admin';"
```

### Fix Missing Role
```bash
psql $DATABASE_URL -c "UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'admin') WHERE username = 'Steyn_Admin' AND role_id IS NULL;"
```

### Run Health Check
```bash
cd backend && python health_check.py
```

### Test Login
```bash
cd backend && python test_login_endpoint.py https://thermacoreapp.onrender.com Steyn_Admin Steiner1!
```

---

## ✅ Success Checklist

Authentication is working when:

- [x] Health check shows all green ✅
- [x] Test login returns 200 status
- [x] Response includes `access_token` and `refresh_token`
- [x] No errors in backend logs
- [x] Frontend login works
- [x] User dashboard loads after login

---

## 🆘 Still Broken?

If you've tried all fixes and authentication still fails:

1. **Capture full diagnostic output:**
   ```bash
   cd backend
   python diagnose_auth_issue.py > diagnostic_output.txt 2>&1
   ```

2. **Capture backend logs:**
   - Render Dashboard > Logs
   - Copy last 100 lines

3. **Capture database state:**
   ```bash
   psql $DATABASE_URL -c "\dt" > db_tables.txt
   psql $DATABASE_URL -c "SELECT * FROM users;" > db_users.txt
   psql $DATABASE_URL -c "SELECT * FROM roles;" > db_roles.txt
   ```

4. **Share these files for analysis:**
   - diagnostic_output.txt
   - Backend logs
   - db_tables.txt
   - db_users.txt
   - db_roles.txt

---

## 📞 Support Contacts

**For immediate assistance:**
- Check Render service status: https://status.render.com
- Review documentation: See PRODUCTION_DEPLOYMENT_VERIFICATION.md
- Run diagnostics: `python diagnose_auth_issue.py`

---

**Last Updated:** 2025-10-12  
**Version:** 1.0  
**Status:** Production-Ready
