# Render Production Deployment - Authentication Fix Guide

## 🎯 Objective

Fix the authentication 500 error in production by ensuring the database is properly initialized and the admin user has the correct role assignment.

**Expected Time:** 10-15 minutes  
**Difficulty:** Easy  
**Prerequisites:** Access to Render dashboard

---

## 📋 Pre-Flight Checklist

Before starting, gather these items:

- [ ] Access to Render dashboard (https://dashboard.render.com)
- [ ] Access to GitHub repository
- [ ] Database credentials (available in Render)
- [ ] `psql` client installed locally (optional but recommended)

---

## 🚀 Step-by-Step Fix

### Step 1: Access Render Dashboard (1 minute)

1. Go to https://dashboard.render.com
2. Log in with your credentials
3. You should see two services:
   - `thermacore-backend` (Web Service)
   - `thermacore-db` (PostgreSQL Database)

---

### Step 2: Get Database Credentials (2 minutes)

1. Click on **thermacore-backend** service
2. Click on **Environment** tab
3. Find the `DATABASE_URL` variable
4. Click the **eye icon** to reveal the full connection string
5. Copy the entire URL (it looks like):
   ```
   postgresql://user:password@host:5432/database
   ```
6. Save this temporarily (you'll need it in next steps)

---

### Step 3: Check Current Database State (3 minutes)

**Option A: Using Render Shell (Recommended)**

1. In Render dashboard, go to **thermacore-backend**
2. Click **Shell** tab
3. Wait for shell to connect
4. Run these commands:

```bash
cd backend
python health_check.py
```

5. **Review the output:**
   - If all checks show ✅ - Authentication should already be working!
   - If you see ❌ or "✗ NO ROLE!" - Continue to Step 4

**Option B: Using Local psql**

1. On your local machine, open terminal
2. Connect to production database:
   ```bash
   psql "postgresql://user:password@host:5432/database"
   ```
3. Run this query:
   ```sql
   SELECT u.username, u.role_id, r.name as role_name
   FROM users u
   LEFT JOIN roles r ON u.role_id = r.id
   WHERE u.username = 'Steyn_Admin';
   ```
4. **Check the result:**
   - If `role_id` is NULL → Continue to Step 4
   - If `role_name` shows "admin" → Problem is elsewhere, skip to Step 6

---

### Step 4: Fix the Database (5 minutes)

#### Option A: Quick SQL Fix (Fastest)

**If user exists but has no role:**

```sql
-- Connect to database
psql "postgresql://..."

-- Run fix
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE username = 'Steyn_Admin';

-- Verify
SELECT u.username, r.name as role 
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE u.username = 'Steyn_Admin';

-- Should show: Steyn_Admin | admin

-- Exit
\q
```

#### Option B: Run Fix Script (Recommended)

```sql
-- Connect to database
psql "postgresql://..."

-- Run the fix script
\i backend/migrations/004_fix_null_roles.sql

-- Exit
\q
```

#### Option C: Complete Database Reset (If tables are missing)

**⚠️ Warning: This will delete all existing data!**

```bash
# Export DATABASE_URL
export DATABASE_URL="postgresql://..."

# Run all migrations in order
psql $DATABASE_URL -f backend/migrations/001_initial_schema.sql
psql $DATABASE_URL -f backend/migrations/002_seed_data.sql
psql $DATABASE_URL -f backend/migrations/003_update_rbac_security.sql

# Create admin user
cd backend
export JWT_SECRET_KEY="..."  # From Render Environment
export SECRET_KEY="..."       # From Render Environment
python scripts/create_first_admin.py
```

---

### Step 5: Verify the Fix (3 minutes)

**Test 1: Health Check**

In Render Shell or locally:
```bash
cd backend
python health_check.py
```

Expected output:
```
✅ Database: Connected
✅ Tables: OK (Roles: 3, Users: 1, Permissions: 8)
✅ Admin Role: Found (ID: 1, Permissions: 8)
✅ Admin Users: 1 found
   - Steyn_Admin (Active) ✓
✅ JWT_SECRET_KEY: Set
✅ SECRET_KEY: Set
✅ CORS_ORIGINS: ...
✅ All health checks PASSED
```

**Test 2: Direct API Test**

```bash
curl -X POST https://thermacoreapp.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Steyn_Admin","password":"Steiner1!"}'
```

**Expected Success Response (200):**
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

**If you still get 500 error**, check Step 6.

---

### Step 6: Check CORS Configuration (2 minutes)

1. In Render dashboard, go to **thermacore-backend**
2. Click **Environment** tab
3. Look for `CORS_ORIGINS` variable
4. **If missing or incorrect**, add/update it:

```
Key: CORS_ORIGINS
Value: https://your-app.netlify.app,https://thermacoreapp.onrender.com
```

**Important:** Replace `your-app.netlify.app` with your actual Netlify domain!

5. Click **Save Changes**
6. Wait 1-2 minutes for automatic redeploy

---

### Step 7: Test from Frontend (2 minutes)

1. Open your Netlify deployment: https://your-app.netlify.app
2. Open browser DevTools (press F12)
3. Go to **Console** tab
4. Click **Login** button
5. Enter credentials:
   - Username: `Steyn_Admin`
   - Password: `Steiner1!`
6. Click **Submit**

**Expected Result:**
- ✅ Login succeeds
- ✅ Spinner disappears
- ✅ User is redirected to dashboard
- ✅ No errors in console
- ✅ No network errors (check Network tab)

**If login fails:**
- Check Console for error messages
- Check Network tab - look at the response for `/api/v1/auth/login`
- If 500 error, check backend logs (Step 8)
- If 401 error, password might be wrong
- If CORS error, check CORS_ORIGINS setting

---

### Step 8: Check Backend Logs (if issues persist)

1. In Render dashboard, go to **thermacore-backend**
2. Click **Logs** tab
3. Try logging in again from frontend
4. Watch logs in real-time
5. Look for error messages:

**Common Error Patterns:**

```
ERROR: User Steyn_Admin has no role assigned
→ Role is still NULL, re-run Step 4

ERROR: Database error during login query
→ Database connection issue, check Step 2

ERROR: 'NoneType' object has no attribute 'name'
→ Role is NULL, re-run Step 4

ERROR: Token generation failed
→ JWT_SECRET_KEY missing, check Step 6
```

6. If you see any of these, jump to the appropriate step to fix

---

## ✅ Success Criteria

Authentication is fully working when ALL of these are true:

- [x] Health check script shows all ✅
- [x] Database query shows user has `role_name = 'admin'`
- [x] curl test returns 200 status with tokens
- [x] Frontend login succeeds
- [x] User is redirected to dashboard
- [x] No errors in backend logs
- [x] No CORS errors in browser console

---

## 🆘 Troubleshooting

### Issue: "Database has no users"

**Solution:**
```bash
cd backend
export DATABASE_URL="..."
export JWT_SECRET_KEY="..."
export SECRET_KEY="..."
python scripts/create_first_admin.py
```

### Issue: "Table 'users' does not exist"

**Solution:**
```bash
export DATABASE_URL="..."
psql $DATABASE_URL -f backend/migrations/001_initial_schema.sql
psql $DATABASE_URL -f backend/migrations/002_seed_data.sql
cd backend && python scripts/create_first_admin.py
```

### Issue: "Role not found"

**Solution:**
```bash
export DATABASE_URL="..."
psql $DATABASE_URL -f backend/migrations/002_seed_data.sql
```

### Issue: "Invalid password"

**Solution:**
- Password might have been changed
- Default is `Steiner1!` (capital S, ends with exclamation)
- Create new admin: `python scripts/create_first_admin.py`

### Issue: CORS error in browser

**Solution:**
1. Render Dashboard → thermacore-backend → Environment
2. Set `CORS_ORIGINS` to include your Netlify domain
3. Format: `https://your-app.netlify.app,https://thermacoreapp.onrender.com`
4. Save and wait for redeploy

---

## 📊 Monitoring After Fix

### Check Health Periodically

Add to your monitoring routine:
```bash
curl https://thermacoreapp.onrender.com/api/v1/health
```

### Watch Logs for Errors

In Render dashboard:
1. Go to thermacore-backend → Logs
2. Look for ERROR or WARNING messages
3. Set up log alerts if available

### Test Login Weekly

Use the test script:
```bash
cd backend
python test_login_endpoint.py https://thermacoreapp.onrender.com Steyn_Admin Steiner1!
```

---

## 🔒 Security Notes

After fixing authentication:

1. **Change default password:**
   ```bash
   # Login to frontend
   # Go to Settings → Change Password
   # Use strong password (min 12 chars, mixed case, numbers, symbols)
   ```

2. **Rotate secrets:**
   - In Render dashboard → Environment
   - Regenerate `JWT_SECRET_KEY` and `SECRET_KEY` periodically

3. **Enable 2FA** (if implementing):
   - This is a future enhancement
   - Currently not implemented

---

## 📚 Additional Resources

- **Quick Fix Guide:** `URGENT_AUTH_FIX_GUIDE.md`
- **Root Cause Analysis:** `AUTHENTICATION_500_ROOT_CAUSE_ANALYSIS.md`
- **Detailed Verification:** `PRODUCTION_DEPLOYMENT_VERIFICATION.md`
- **Health Check Script:** `backend/health_check.py`
- **Diagnostic Script:** `backend/diagnose_auth_issue.py`

---

## 🎉 Done!

If you've completed all steps and authentication is working:

1. Test thoroughly from frontend
2. Document any custom changes you made
3. Update password from default
4. Monitor logs for 24 hours
5. Consider this issue **RESOLVED** ✅

---

**Last Updated:** 2025-10-12  
**Version:** 1.0  
**Tested:** Yes  
**Production-Ready:** Yes
