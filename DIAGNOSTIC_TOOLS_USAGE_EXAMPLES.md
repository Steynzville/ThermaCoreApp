# Diagnostic Tools Usage Examples

This document provides real-world usage examples for the API diagnostic tools.

## Quick Start - Most Common Use Case

**Scenario:** You're experiencing a blank page after login and want to know if it's a backend or frontend issue.

### Step 1: Run the Python Diagnostic Script

```bash
python backend/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD
```

### Step 2: Interpret the Results

The script will show color-coded results for three tests:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 1: Testing Health Endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Testing: GET https://thermacoreapp.onrender.com/health

HTTP Status: 200

✅ Health endpoint is responding correctly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 2: Testing Login Endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Testing: POST https://thermacoreapp.onrender.com/api/v1/auth/login

HTTP Status: 200

✅ Login endpoint returned 200 OK
✅ JWT token found in response
✅ Successfully extracted access token

Token (first 50 chars): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 3: Testing Dashboard Endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Testing: GET https://thermacoreapp.onrender.com/api/v1/dashboard

HTTP Status: 200

✅ Dashboard endpoint returned 200 OK
✅ Dashboard data retrieved successfully
```

**What this means:** ✅ All backend API endpoints are working! The issue is in the **frontend**.

### Step 3: Debug the Frontend

Since backend is working, check:

1. **Browser Console (F12)**
   ```
   - Look for JavaScript errors
   - Check if API requests are being made
   - Verify token is being stored in localStorage
   ```

2. **Network Tab (F12)**
   ```
   - Verify login POST request succeeds
   - Check if subsequent requests include Authorization header
   - Look for failed requests
   ```

3. **Application/Storage Tab (F12)**
   ```
   - Check localStorage for:
     * thermacore_token
     * thermacore_user
     * thermacore_role
   ```

4. **Common Frontend Issues:**
   - React routing not handling post-login redirect
   - Component crash after successful login
   - Missing error boundaries
   - Navigation logic in AuthContext not working

---

## Example 2: Backend Authentication Failure

**Scenario:** Login endpoint returns 500 error

### Output Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 2: Testing Login Endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Testing: POST https://thermacoreapp.onrender.com/api/v1/auth/login

HTTP Status: 500

❌ Login failed: Internal Server Error (500)
❌ Backend is crashing during authentication!
ℹ️  Check backend logs on Render for stack traces

Response:
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal server error occurred."
  }
}
```

**What to do:**

1. Go to Render dashboard
2. View backend logs
3. Look for Python stack traces around the time you ran the test
4. Common causes:
   - Database connection failure
   - User role is NULL in database
   - JWT secret key not configured
   - Password hashing error

**Fix:** See `AUTHENTICATION_500_ERROR_FIX.md` for detailed solutions

---

## Example 3: Dashboard Access Denied

**Scenario:** Login works but dashboard returns 403

### Output Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 3: Testing Dashboard Endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Testing: GET https://thermacoreapp.onrender.com/api/v1/analytics/dashboard/summary

HTTP Status: 403

❌ Dashboard access denied: Forbidden (403)
⚠️  User may not have permission to access dashboard

Response:
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "User does not have required permission: read_units"
  }
}
```

**What to do:**

1. Check user role in database
2. Verify role has correct permissions
3. If using 'viewer' role, they may not have dashboard access
4. Update user role to 'operator' or 'admin'

**Fix:**
```sql
-- Connect to database
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'admin') WHERE username = 'youruser';
```

---

## Example 4: Testing Local Development Backend

**Scenario:** Testing locally during development

### Command

```bash
python backend/diagnose_api_endpoints.py http://localhost:5000 admin admin123
```

### Use Case

- Verify authentication works after code changes
- Test before deploying to production
- Debug local database issues
- Validate JWT token generation

---

## Example 5: Using Bash Script (No Python)

**Scenario:** Running on a system without Python or where Python dependencies are missing

### Command

```bash
./scripts/diagnose-api-endpoints.sh https://thermacoreapp.onrender.com admin YOUR_PASSWORD
```

### Features

- Pure bash/curl implementation
- No dependencies beyond curl and standard Unix tools
- Automatic JSON pretty-printing (using Python if available, raw output otherwise)
- Same diagnostic flow as Python version

---

## Example 6: Quick Manual Test with Curl

**Scenario:** You just want to quickly test login without running the full diagnostic

### Commands

```bash
# Just test login
curl -X POST "https://thermacoreapp.onrender.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin", "password":"YOUR_PASSWORD"}' | python3 -m json.tool
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@thermacore.com",
      "role": {
        "name": "admin"
      }
    }
  }
}
```

---

## Example 7: Complete Manual Test Flow

**Scenario:** Step-by-step manual testing with detailed output

```bash
#!/bin/bash

echo "=== Step 1: Health Check ==="
curl "https://thermacoreapp.onrender.com/health"
echo -e "\n"

echo "=== Step 2: Login ==="
LOGIN_RESPONSE=$(curl -s -X POST "https://thermacoreapp.onrender.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin", "password":"YOUR_PASSWORD"}')
echo "$LOGIN_RESPONSE" | python3 -m json.tool
echo -e "\n"

echo "=== Step 3: Extract Token ==="
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])" 2>/dev/null)
echo "Token: ${TOKEN:0:50}..."
echo -e "\n"

echo "=== Step 4: Test Dashboard ==="
curl -H "Authorization: Bearer $TOKEN" \
  "https://thermacoreapp.onrender.com/api/v1/analytics/dashboard/summary" | python3 -m json.tool
```

---

## Troubleshooting Common Scenarios

### Scenario: "Connection Refused" or "Name Resolution Error"

**Output:**
```
❌ Failed to connect to backend - network error or server is down
ℹ️  Check if the backend is deployed and running on Render
```

**Causes:**
- Backend service is down on Render
- Wrong URL
- Network/firewall blocking connection
- DNS issue

**Actions:**
1. Check Render dashboard for service status
2. Verify the URL is correct
3. Check recent deployments for failures
4. Try accessing health endpoint in browser

---

### Scenario: All Tests Pass But Frontend Still Shows Blank

**This definitively indicates a FRONTEND issue:**

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for red error messages
   - Common errors:
     * "Cannot read property 'role' of undefined"
     * "Unexpected token"
     * React component errors

2. **Check Network Tab:**
   - Verify requests are being made
   - Check Authorization headers are present
   - Look for 401/403 responses

3. **Check Application State:**
   - localStorage has token
   - React state is being updated
   - Navigation is triggered

4. **Review Frontend Code:**
   - `src/context/AuthContext.jsx` - login function and navigation
   - `src/App.jsx` - routing configuration
   - `src/pages/Dashboard.jsx` - component rendering

---

## Integration with CI/CD

You can integrate these diagnostic tools into your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Test Backend Endpoints
  run: |
    python backend/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin ${{ secrets.ADMIN_PASSWORD }}
```

---

## Summary

The diagnostic tools help you quickly identify:

1. ✅ **Backend is healthy** → Focus on backend code
2. ✅ **Backend is down** → Check deployment and infrastructure
3. ✅ **Login fails** → Check authentication code and database
4. ✅ **Dashboard fails** → Check permissions and endpoint code
5. ✅ **All tests pass** → Issue is in the frontend

Use the appropriate tool based on your needs:
- **Python script** - Best for comprehensive diagnostics
- **Bash script** - Best for quick checks without Python
- **Manual curl** - Best for one-off tests or debugging specific endpoints

For more information, see:
- `API_DIAGNOSTICS_GUIDE.md` - Complete guide
- `QUICK_API_TEST_COMMANDS.md` - Quick reference
