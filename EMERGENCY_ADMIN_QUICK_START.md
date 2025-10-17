# Emergency Admin Quick Start Guide

## TL;DR - Get Admin Access NOW

### 1. Create/Reset Emergency Admin (30 seconds)
```bash
# Call this endpoint (works even without authentication)
curl -X POST https://your-app.onrender.com/api/v1/auth/emergency-admin
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Emergency admin account created/updated successfully",
    "username": "emergency_admin",
    "note": "Use password: EmergencyAdmin123! to login. CHANGE THIS PASSWORD IMMEDIATELY after login."
  }
}
```

### 2. Login as Emergency Admin (10 seconds)
```bash
curl -X POST https://your-app.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "emergency_admin", "password": "EmergencyAdmin123!"}'
```

**Save the access_token from response!**

### 3. Create Your First User (20 seconds)
```bash
curl -X POST https://your-app.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "username": "myuser",
    "email": "myuser@example.com",
    "password": "MyPassword123!",
    "role_id": 1,
    "first_name": "My",
    "last_name": "User"
  }'
```

**Role IDs:**
- `1` = Admin (full access)
- `2` = Operator (read + remote control)
- `3` = Viewer (read only)

---

## What Just Happened?

✅ **emergency_admin** account created with FULL permissions  
✅ Can create/manage users (the key capability!)  
✅ Can access all admin endpoints  
✅ Bypasses normal permission checks  

---

## Emergency Admin Permissions

The emergency_admin has ALL 8 permissions:
- ✅ **write_users** - Create and update users (your main need!)
- ✅ read_users - View users
- ✅ delete_users - Remove users
- ✅ read_units - View ThermaCore units
- ✅ write_units - Create/update units
- ✅ delete_units - Remove units
- ✅ admin_panel - Admin panel access
- ✅ remote_control - Remote unit control

---

## Common Tasks

### Create Admin User
```bash
# After logging in as emergency_admin, create a regular admin:
curl -X POST https://your-app.onrender.com/api/v1/auth/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@company.com",
    "password": "AdminPass123!",
    "role_id": 1
  }'
```

### Create Operator User
```bash
curl -X POST https://your-app.onrender.com/api/v1/auth/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "operator1",
    "email": "operator@company.com",
    "password": "OpPass123!",
    "role_id": 2
  }'
```

### List All Users
```bash
curl -X GET https://your-app.onrender.com/api/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

### Get User Details
```bash
curl -X GET https://your-app.onrender.com/api/v1/users/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Web UI Access (Frontend)

If using the web interface:

1. **Navigate to login page**: `https://your-frontend.netlify.app/login`

2. **First time setup**:
   - Open browser console (F12)
   - Run in console:
     ```javascript
     fetch('https://your-app.onrender.com/api/v1/auth/emergency-admin', {
       method: 'POST'
     }).then(r => r.json()).then(d => console.log(d))
     ```

3. **Login**:
   - Username: `emergency_admin`
   - Password: `EmergencyAdmin123!`

4. **Create users** via Admin Panel → Users → Create User

---

## Security Notes

⚠️ **IMPORTANT**: After resolving your admin lockout:

1. **Change emergency admin password** immediately:
   ```bash
   curl -X POST https://your-app.onrender.com/api/v1/auth/change-password \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "current_password": "EmergencyAdmin123!",
       "new_password": "NewSecurePassword123!"
     }'
   ```

2. **Disable emergency admin** when not needed:
   ```sql
   -- Run in database console
   UPDATE users SET is_active = false WHERE username = 'emergency_admin';
   ```

3. **Monitor usage**: Check audit logs for `emergency_admin_bypass` events

---

## Troubleshooting

### ❌ "Permission denied" errors
- ✅ Make sure you're using the emergency_admin token
- ✅ Check token hasn't expired (refresh if needed)
- ✅ Verify emergency_admin is active in database

### ❌ "User already exists"
- ✅ Use a different username/email
- ✅ Or update the existing user instead

### ❌ "Invalid token"
- ✅ Token expired - login again to get new token
- ✅ Token format should be: `Bearer <token>` in Authorization header

### ❌ "Role not found"
- ✅ Use role_id 1, 2, or 3 only
- ✅ Check roles exist in database: `SELECT * FROM roles;`

---

## Database Verification

Check emergency admin exists and has permissions:

```sql
-- Check emergency admin user
SELECT 
  username, 
  email, 
  is_active, 
  role_id,
  permissions
FROM users 
WHERE username = 'emergency_admin';
```

**Expected result:**
- username: `emergency_admin`
- is_active: `true`
- permissions: `["read_units", "write_units", "delete_units", "read_users", "write_users", "delete_users", "admin_panel", "remote_control"]`

---

## Next Steps

After gaining access:

1. ✅ Create a regular admin user for daily use
2. ✅ Document the new admin credentials securely
3. ✅ Change emergency_admin password
4. ✅ Consider disabling emergency_admin
5. ✅ Review and update user management processes

---

## Support

- **Documentation**: See `EMERGENCY_ADMIN_PERMISSIONS.md` for full details
- **Tests**: Run `pytest backend/app/tests/test_emergency_admin.py`
- **Audit Logs**: Check `/api/v1/metrics/audit-logs` endpoint

---

## Technical Details

**What makes emergency_admin special:**

1. **Direct permissions**: Has permissions array in database (bypasses role restrictions)
2. **Middleware bypass**: Special check in authorization.py skips permission validation
3. **Auto-migration**: Permissions automatically applied on app startup
4. **Idempotent endpoint**: Can be called repeatedly without side effects

**Files changed:**
- `backend/app/models/__init__.py` - User model with permissions field
- `backend/app/routes/auth.py` - Emergency admin endpoint
- `backend/app/middleware/authorization.py` - Bypass logic
- `backend/app/utils/auto_migration.py` - Auto-migration
- `backend/migrations/006_*` - SQL migrations

---

**✨ You now have full admin access! Create users and manage your system.** ✨
