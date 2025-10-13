# API Diagnostics Guide - Debugging Login and Dashboard Issues

This guide provides step-by-step instructions for diagnosing login and dashboard issues in the ThermaCoreApp using the provided diagnostic tools.

## Problem Description

When entering login details in the app, users experience:
1. A spinner appears briefly
2. Then a blank page is displayed
3. No error messages are shown

This guide will help you systematically diagnose whether the issue is in the backend API or the frontend React application.

## Quick Start

We've provided two diagnostic scripts that you can use to test the backend API endpoints:

### Option 1: Python Script (Recommended)

```bash
python backend/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD
```

### Option 2: Bash Script

```bash
./scripts/diagnose-api-endpoints.sh https://thermacoreapp.onrender.com admin YOUR_PASSWORD
```

Both scripts will:
1. Test the health endpoint to verify the backend is running
2. Test the login endpoint and verify JWT token is returned
3. Test the dashboard endpoint with the JWT token (if login succeeds)
4. Provide detailed analysis and recommendations

## Diagnostic Steps

### Step 1: Test Health Endpoint

**Purpose:** Verify the backend server is running and accessible.

**Manual Test:**
```bash
curl "https://thermacoreapp.onrender.com/health"
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**What to Check:**
- **200 OK**: Backend is running properly ✅
- **Connection Error**: Backend is down or unreachable ❌
- **500 Error**: Backend has a critical issue ❌

### Step 2: Test Login Endpoint

**Purpose:** Verify authentication is working and JWT tokens are being generated.

**Manual Test:**
```bash
curl -X POST "https://thermacoreapp.onrender.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin", "password":"YOUR_PASSWORD"}'
```

**Expected Success Response (200):**
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

**What to Check:**
- **200 OK with access_token**: Authentication working ✅
- **401 Unauthorized**: Invalid credentials ⚠️
- **500 Internal Server Error**: Backend authentication code is crashing ❌
- **Connection Error**: Backend is unreachable ❌

### Step 3: Test Dashboard Endpoint

**Purpose:** Verify authenticated users can access dashboard data.

**Manual Test:**

First, extract the token from Step 2, then:

```bash
# Using the token from login response
TOKEN="your_access_token_here"

curl -H "Authorization: Bearer $TOKEN" \
  "https://thermacoreapp.onrender.com/api/v1/dashboard"
```

**Alternative Endpoint:**

If `/api/v1/dashboard` returns 404, try the analytics dashboard:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://thermacoreapp.onrender.com/api/v1/analytics/dashboard/summary"
```

**Expected Success Response (200):**
```json
{
  "overview": {
    "total_units": 10,
    "active_units": 8,
    "total_sensors": 45,
    "recent_readings": 150
  },
  "trends": { ... },
  "performance": { ... }
}
```

**What to Check:**
- **200 OK**: Dashboard access working ✅
- **401 Unauthorized**: Token is invalid or expired ⚠️
- **403 Forbidden**: User lacks dashboard permissions ⚠️
- **404 Not Found**: Dashboard endpoint doesn't exist ❌
- **500 Internal Server Error**: Dashboard code is crashing ❌

## Analyzing Results

### Scenario 1: Login Works, Dashboard Fails

**Symptoms:**
- Step 1 ✅ Health check passes
- Step 2 ✅ Login returns JWT token
- Step 3 ❌ Dashboard returns 401, 403, or 500

**Likely Causes:**
1. **401 Error**: Token validation issue
   - Check JWT_SECRET_KEY matches between services
   - Verify token hasn't expired
   
2. **403 Error**: Permission issue
   - User role doesn't have dashboard access
   - Check RBAC configuration in database
   
3. **500 Error**: Dashboard code error
   - Check Render logs for Python stack traces
   - Database query might be failing
   - Review `backend/app/routes/analytics.py`

**Actions:**
1. Check Render backend logs for errors
2. Verify user permissions in database
3. Review dashboard endpoint implementation

### Scenario 2: Login Fails with 500 Error

**Symptoms:**
- Step 1 ✅ Health check passes
- Step 2 ❌ Login returns 500 Internal Server Error
- Step 3 ⏭️ Not reached

**Likely Causes:**
1. Database connection failure
2. User role is NULL in database
3. JWT token generation failure
4. Password hashing error

**Actions:**
1. Check Render logs for Python exceptions
2. Review `AUTHENTICATION_500_ERROR_FIX.md`
3. Verify database connection (DATABASE_URL)
4. Check user has valid role in database

### Scenario 3: Login Works, Frontend Shows Blank Page

**Symptoms:**
- Step 1 ✅ Health check passes
- Step 2 ✅ Login returns JWT token
- Step 3 ✅ Dashboard returns data
- Frontend still shows blank page

**This indicates a FRONTEND issue, not backend!**

**Likely Causes:**
1. React routing issue after login
2. JavaScript error preventing page render
3. Missing error handling in AuthContext
4. Dashboard component crash

**Actions:**
1. Open browser DevTools (F12)
2. Check Console tab for JavaScript errors
3. Check Network tab to see if API calls are being made
4. Review these files:
   - `src/context/AuthContext.jsx` - Login flow
   - `src/App.jsx` - Routing configuration
   - `src/pages/Dashboard.jsx` - Dashboard component

### Scenario 4: Backend Not Responding

**Symptoms:**
- Step 1 ❌ Health check fails with connection error
- Step 2 ⏭️ Not reached
- Step 3 ⏭️ Not reached

**Likely Causes:**
1. Backend service is down on Render
2. Deployment failed
3. Network/DNS issue

**Actions:**
1. Go to Render dashboard
2. Check service status
3. Check recent deployments
4. Review deployment logs

## Checking Backend Logs on Render

1. Go to https://dashboard.render.com/
2. Find and click on the `thermacoreapp` service
3. Click the "Logs" tab
4. Look for recent errors around login/dashboard access
5. Search for these keywords:
   - `ERROR`
   - `Exception`
   - `Traceback`
   - `500`
   - `auth/login`
   - `dashboard`

## Frontend Debugging

If backend API is working but frontend shows blank page:

### 1. Check Browser Console

Open DevTools (F12) and look for:
- JavaScript errors
- Failed API requests
- React component errors

### 2. Check Network Requests

In DevTools Network tab, verify:
- Login POST request succeeds (200)
- JWT token is in response
- Subsequent requests include `Authorization` header
- Dashboard requests succeed (200)

### 3. Check localStorage

In DevTools Application/Storage tab, verify:
- `thermacore_token` exists
- `thermacore_user` exists
- `thermacore_role` exists

### 4. Review Login Flow Code

Check `src/context/AuthContext.jsx`:

```javascript
const login = async (username, password) => {
  setIsLoading(true);
  
  try {
    const result = await authService.login(username, password);
    
    if (result.success) {
      // Token stored in localStorage
      localStorage.setItem("thermacore_token", result.token);
      
      // User should be redirected here
      return { success: true, role: result.user.role };
    }
  } catch (error) {
    console.error('Login error:', error);
    // Error should be handled here
  }
};
```

### 5. Check Routing Configuration

Verify routing in `src/App.jsx` handles post-login navigation:

```javascript
// After successful login, should redirect to dashboard
<Route path="/dashboard" element={<Dashboard />} />
```

## Common Issues and Solutions

### Issue: CORS Error in Browser

**Symptom:** Console shows "blocked by CORS policy"

**Solution:** 
1. Check Render environment variables
2. Set `CORS_ORIGINS` to include your frontend domain
3. Example: `CORS_ORIGINS=https://your-app.netlify.app`

### Issue: JWT Token Expired

**Symptom:** Login works but dashboard returns 401

**Solution:**
1. Check `JWT_ACCESS_TOKEN_EXPIRES` setting
2. Consider increasing token lifetime
3. Implement token refresh flow

### Issue: User Role is NULL

**Symptom:** Login returns 500, logs show AttributeError on role

**Solution:**
1. Connect to database
2. Run: `UPDATE users SET role_id = 1 WHERE username = 'admin';`
3. Ensure all users have valid role assignments

### Issue: Database Connection Failed

**Symptom:** All endpoints return 500, logs show database errors

**Solution:**
1. Verify `DATABASE_URL` environment variable
2. Check database is running on Render
3. Verify connection credentials

## Using the Diagnostic Scripts

### Python Script Features

The Python diagnostic script (`backend/diagnose_api_endpoints.py`) provides:

- ✅ Color-coded output for easy reading
- ✅ Automatic token extraction and testing
- ✅ Alternative endpoint testing
- ✅ Detailed error analysis
- ✅ Actionable recommendations

**Usage:**
```bash
# Test production backend
python backend/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD

# Test local backend
python backend/diagnose_api_endpoints.py http://localhost:5000 admin admin123

# Use default credentials
python backend/diagnose_api_endpoints.py https://thermacoreapp.onrender.com
```

### Bash Script Features

The bash script (`scripts/diagnose-api-endpoints.sh`) provides:

- ✅ Pure curl-based testing (no Python required)
- ✅ Color-coded output
- ✅ Automatic cleanup
- ✅ JSON pretty-printing

**Usage:**
```bash
# Test production backend
./scripts/diagnose-api-endpoints.sh https://thermacoreapp.onrender.com admin YOUR_PASSWORD

# Test local backend
./scripts/diagnose-api-endpoints.sh http://localhost:5000 admin admin123
```

## Example Output

### Successful Test Run

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 3: Testing Dashboard Endpoint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Dashboard endpoint returned 200 OK
✅ Dashboard data retrieved successfully
```

## Next Steps After Diagnosis

Based on your diagnostic results:

1. **If all tests pass but frontend shows blank:**
   - Focus on frontend debugging
   - Check browser console
   - Review React components
   - Check routing configuration

2. **If login fails with 500:**
   - Review backend logs
   - Check database connection
   - Verify user roles
   - Review AUTHENTICATION_500_ERROR_FIX.md

3. **If dashboard fails but login works:**
   - Check user permissions
   - Review dashboard endpoint code
   - Verify database queries
   - Check for missing data

4. **If backend is unreachable:**
   - Check Render service status
   - Review deployment logs
   - Verify domain configuration
   - Check for deployment failures

## Additional Resources

- `AUTHENTICATION_500_ERROR_FIX.md` - Known authentication issues and fixes
- `FRONTEND_DEPLOYMENT.md` - Frontend deployment and configuration
- `PR_README.md` - Recent authentication improvements
- `backend/app/routes/auth.py` - Login endpoint implementation
- `backend/app/routes/analytics.py` - Dashboard endpoint implementation
- `src/context/AuthContext.jsx` - Frontend authentication logic
- `src/services/authService.js` - Frontend API service

## Support

If you need help interpreting the diagnostic results or have questions about the issue, please:

1. Run the diagnostic script and save the output
2. Check Render backend logs and save relevant errors
3. Check browser console and save any JavaScript errors
4. Create an issue with all this information

## Summary

This guide provides systematic testing of:
1. ✅ Backend health and availability
2. ✅ Authentication and JWT token generation
3. ✅ Dashboard endpoint access and data retrieval
4. ✅ Frontend integration and routing

Use the provided diagnostic scripts to quickly identify whether the blank page issue is caused by backend API failures or frontend React issues.
