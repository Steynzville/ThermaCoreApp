# Debug Endpoints - Usage Guide

## ⚠️ TEMPORARY DEBUG ENDPOINTS

These endpoints were added to diagnose and fix the authentication 500 error when Render Shell access is not available (free plan).

**IMPORTANT:** These endpoints should be **REMOVED** after the issue is resolved, as they expose sensitive database information.

---

## Available Endpoints

### 1. Check Admin User State

**Endpoint:** `GET /api/v1/auth/debug/admin-state`

**Purpose:** Check the current state of the admin user in the database

**Note:** This endpoint checks for both 'admin' and 'Steyn_Admin' usernames automatically.

**Usage:**
```bash
curl https://thermacoreapp.onrender.com/api/v1/auth/debug/admin-state
```

**Expected Response (Healthy):**
```json
{
  "success": true,
  "admin_user_exists": true,
  "steyn_admin_exists": true,
  "username": "Steyn_Admin",
  "role_id": 1,
  "has_role_object": true,
  "role_name": "admin",
  "all_roles": [
    {"id": 1, "name": "admin"},
    {"id": 2, "name": "operator"},
    {"id": 3, "name": "viewer"}
  ]
}
```

**Expected Response (Problem - NULL role_id):**
```json
{
  "success": true,
  "admin_user_exists": false,
  "steyn_admin_exists": true,
  "username": "Steyn_Admin",
  "role_id": null,
  "has_role_object": false,
  "role_name": null,
  "all_roles": [...]
}
```

---

### 2. Fix Admin Role Assignment

**Endpoint:** `POST /api/v1/auth/debug/fix-admin-role`

**Purpose:** Automatically fix the admin user's role assignment

**Note:** This endpoint checks for both 'admin' and 'Steyn_Admin' usernames automatically.

**Usage:**
```bash
curl -X POST https://thermacoreapp.onrender.com/api/v1/auth/debug/fix-admin-role
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Admin role fixed",
  "admin_user": {
    "username": "Steyn_Admin",
    "role_id": 1,
    "role_name": "admin"
  }
}
```

**Expected Response (Error):**
```json
{
  "success": false,
  "error": "Admin user not found (checked both \"admin\" and \"Steyn_Admin\")"
}
```

---

## Step-by-Step Fix Process

### Step 1: Check Current State
```bash
curl https://thermacoreapp.onrender.com/api/v1/auth/debug/admin-state
```

Review the output:
- Is `admin_user_exists` true?
- Is `role_id` null?
- Is `has_role_object` false?

If `role_id` is null or `has_role_object` is false, proceed to Step 2.

---

### Step 2: Fix the Admin Role
```bash
curl -X POST https://thermacoreapp.onrender.com/api/v1/auth/debug/fix-admin-role
```

This will:
1. Find the admin user
2. Find the admin role in the database
3. Assign the role to the user
4. Commit the change

---

### Step 3: Verify the Fix
```bash
curl https://thermacoreapp.onrender.com/api/v1/auth/debug/admin-state
```

Check that:
- `role_id` is now set (e.g., 1)
- `has_role_object` is true
- `role_name` is "admin"

---

### Step 4: Test Login
```bash
curl -X POST https://thermacoreapp.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

Should now return 200 with JWT tokens!

---

### Step 5: Remove Debug Endpoints

**CRITICAL:** Once the issue is fixed, remove these debug endpoints:

1. Edit `backend/app/routes/auth.py`
2. Remove the two debug endpoint functions (`debug_admin_state` and `fix_admin_role`)
3. Remove the `import traceback` line if not used elsewhere
4. Commit and deploy

---

## Security Notes

⚠️ **These endpoints expose sensitive information:**
- Database structure
- User information
- Role assignments
- Error tracebacks

**They should only be used temporarily** and removed as soon as the issue is resolved.

---

## Alternative: Using Python Script

If you prefer, you can also use the diagnostic scripts locally:

```bash
# Set environment variables
export DATABASE_URL="postgresql://..."
export JWT_SECRET_KEY="..."
export SECRET_KEY="..."

# Run health check
cd backend
python health_check.py

# Run full diagnostic
python diagnose_auth_issue.py
```

---

## Troubleshooting

### Endpoint Returns 404
- Ensure the backend is deployed with the latest code
- Check that the route is registered correctly

### Endpoint Returns 500
- Check the `traceback` field in the response
- Look at backend logs in Render dashboard

### Fix Endpoint Says "Admin user not found"
- The username might be different (e.g., "Steyn_Admin" instead of "admin")
- Modify the endpoint code to use the correct username

### Fix Endpoint Says "Admin role not found"
- Database needs to be seeded with roles
- Run: `psql $DATABASE_URL -f backend/migrations/002_seed_data.sql`

---

**Created:** 2025-10-12  
**Purpose:** Temporary debugging for authentication 500 error  
**Status:** ⚠️ Remove after issue is resolved
