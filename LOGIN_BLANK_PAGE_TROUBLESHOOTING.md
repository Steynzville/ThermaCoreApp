# Login Blank Page Troubleshooting Flowchart

This document provides a systematic troubleshooting process for the "blank page after login" issue.

## Problem Statement

When entering login details in the app:
1. ✅ Spinner appears briefly
2. ❌ Then a blank page is displayed
3. ❌ No error messages are shown

## Quick Diagnosis

Run the diagnostic script first:

```bash
python backend/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD
```

## Decision Tree

```
START: Run Diagnostic Script
│
├─> Health Check FAILS ❌
│   └─> Backend is DOWN
│       ├─> Check Render dashboard
│       ├─> Review deployment logs
│       └─> Verify service is running
│
├─> Health Check PASSES, Login FAILS with 500 ❌
│   └─> Backend Authentication Code is CRASHING
│       ├─> Check Render logs for Python exceptions
│       ├─> Review AUTHENTICATION_500_ERROR_FIX.md
│       ├─> Common causes:
│       │   ├─> Database connection failure
│       │   ├─> User role is NULL
│       │   ├─> JWT secret not configured
│       │   └─> Password hashing error
│       └─> Fix backend code
│
├─> Health Check PASSES, Login FAILS with 401 ⚠️
│   └─> Invalid Credentials
│       ├─> Verify username/password are correct
│       ├─> Check user exists in database
│       └─> Try resetting password
│
├─> Login PASSES, Dashboard FAILS with 401/403 ⚠️
│   └─> Authorization Issue
│       ├─> Check user role/permissions in database
│       ├─> Verify JWT token is valid
│       └─> Update user permissions if needed
│
└─> All Tests PASS ✅
    └─> Issue is in the FRONTEND
        ├─> Open Browser DevTools (F12)
        │
        ├─> Check Console Tab
        │   ├─> Look for JavaScript errors
        │   ├─> Check for React component errors
        │   └─> Note any error messages
        │
        ├─> Check Network Tab
        │   ├─> Verify login POST succeeds (200)
        │   ├─> Check subsequent requests include Authorization header
        │   └─> Look for failed API requests
        │
        ├─> Check Application/Storage Tab
        │   ├─> Verify localStorage has 'thermacore_token'
        │   ├─> Verify localStorage has 'thermacore_user'
        │   └─> Verify localStorage has 'thermacore_role'
        │
        └─> Review Frontend Code
            ├─> src/context/AuthContext.jsx
            │   ├─> Check login function completes successfully
            │   ├─> Verify user state is set
            │   └─> Check navigation/redirect logic
            │
            ├─> src/App.jsx
            │   ├─> Verify routing configuration
            │   ├─> Check route protection
            │   └─> Verify dashboard route exists
            │
            └─> src/pages/Dashboard.jsx
                ├─> Check component rendering
                ├─> Look for errors in useEffect hooks
                └─> Verify data fetching logic
```

## Step-by-Step Troubleshooting

### Step 1: Run Diagnostic Script

```bash
python backend/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD
```

⏱️ Takes ~10 seconds to complete

---

### Step 2: Interpret Results

#### Result A: Backend Down ❌

**Symptoms:**
```
❌ Failed to connect to backend - network error or server is down
```

**Actions:**
1. Go to https://dashboard.render.com/
2. Check service status (should show "Running")
3. Check recent deployments (look for failures)
4. Review deployment logs for errors
5. Check if manual deploy is needed
6. Verify environment variables are set

**Fix:** Restart service or redeploy

---

#### Result B: Login Returns 500 ❌

**Symptoms:**
```
HTTP Status: 500
❌ Login failed: Internal Server Error (500)
❌ Backend is crashing during authentication!
```

**Actions:**
1. Open Render dashboard
2. Click on backend service
3. Go to "Logs" tab
4. Look for Python stack traces around the time you ran the test
5. Search for keywords: "ERROR", "Exception", "Traceback", "auth/login"

**Common Root Causes:**

1. **Database Connection Failed**
   ```
   Error: could not connect to server
   ```
   Fix: Check DATABASE_URL environment variable

2. **User Role is NULL**
   ```
   AttributeError: 'NoneType' object has no attribute 'name'
   ```
   Fix: Update user role in database
   ```sql
   UPDATE users SET role_id = 1 WHERE username = 'admin';
   ```

3. **JWT Secret Not Set**
   ```
   Error: JWT_SECRET_KEY not configured
   ```
   Fix: Set JWT_SECRET_KEY environment variable

4. **Password Hashing Error**
   ```
   ValueError: Invalid salt
   ```
   Fix: Recreate user with proper password hash

**Documentation:** See `AUTHENTICATION_500_ERROR_FIX.md`

---

#### Result C: Login Works, Dashboard Fails ⚠️

**Symptoms:**
```
✅ Login endpoint returned 200 OK
✅ JWT token found in response
❌ Dashboard access denied: Forbidden (403)
```

**Actions:**
1. Check user permissions in database
2. Verify user has required role (admin/operator)
3. Check dashboard endpoint requires correct permission

**Fix:**
```sql
-- Update user to admin role
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin') 
WHERE username = 'youruser';
```

---

#### Result D: All Backend Tests Pass ✅

**Symptoms:**
```
✅ Health endpoint is responding correctly
✅ Login endpoint returned 200 OK
✅ JWT token found in response
✅ Dashboard endpoint returned 200 OK
```

**This means:** Backend API is working perfectly! The issue is in the **frontend React application**.

---

### Step 3: Debug Frontend (When Backend Tests Pass)

#### 3.1 Open Browser DevTools

Press `F12` or right-click → "Inspect"

#### 3.2 Check Console Tab

**Look for:**
- Red error messages
- JavaScript exceptions
- React component errors
- Warnings about missing props or state

**Common Frontend Errors:**

1. **Cannot read property 'role' of undefined**
   - Fix: Check AuthContext.jsx login function
   - Ensure user object is properly set in state

2. **Unexpected token in JSON**
   - Fix: API response format may have changed
   - Check authService.js parsing logic

3. **Maximum update depth exceeded**
   - Fix: useEffect dependency array issue
   - Review Dashboard.jsx hooks

4. **Failed to compile**
   - Fix: Syntax error in React component
   - Check recent code changes

#### 3.3 Check Network Tab

**What to verify:**

1. **Login Request**
   - Method: POST
   - URL: /api/v1/auth/login
   - Status: 200 OK
   - Response contains: access_token

2. **Subsequent Requests**
   - Include Authorization header: "Bearer eyJhbGci..."
   - Status: 200 OK
   - Responses contain expected data

3. **Failed Requests**
   - Look for any red items (4xx or 5xx errors)
   - Check what endpoint is failing
   - Review error messages

#### 3.4 Check Application/Storage Tab

**Verify localStorage:**

```javascript
// Should see these keys:
thermacore_token     // JWT access token
thermacore_user      // User object (JSON string)
thermacore_role      // User role (string)
```

**If missing:**
- Token not being saved after login
- Check AuthContext.jsx localStorage.setItem calls
- Browser may be blocking localStorage

**If present:**
- Token is being saved correctly
- Issue is in navigation/routing logic

#### 3.5 Review Frontend Code

**File 1: src/context/AuthContext.jsx**

Check the login function:

```javascript
const login = async (username, password) => {
  setIsLoading(true);
  
  try {
    const result = await authService.login(username, password);
    
    if (result.success) {
      // ✅ Check: Is user state being set?
      setUser(userData);
      setUserRole(result.user.role);
      
      // ✅ Check: Is token being saved?
      localStorage.setItem("thermacore_token", result.token);
      
      // ✅ Check: Is success being returned?
      return { success: true, role: result.user.role };
    }
  } catch (error) {
    // ❌ Check: Are errors being logged?
    console.error('Login error:', error);
  }
};
```

**File 2: src/App.jsx**

Check routing configuration:

```javascript
// ✅ Check: Does dashboard route exist?
<Route path="/dashboard" element={<Dashboard />} />

// ✅ Check: Is there proper redirection after login?
// Should navigate to dashboard after successful login
```

**File 3: src/pages/Dashboard.jsx**

Check component rendering:

```javascript
// ✅ Check: Is component returning JSX?
// ✅ Check: Are useEffect hooks not causing infinite loops?
// ✅ Check: Is data fetching working correctly?
```

---

### Step 4: Common Frontend Issues and Fixes

#### Issue 1: No Navigation After Login

**Symptom:** Login succeeds but stays on login page or shows blank

**Cause:** Missing navigation logic in login flow

**Fix:** Add navigation after successful login

```javascript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// In login handler
if (result.success) {
  navigate('/dashboard');
}
```

#### Issue 2: Dashboard Component Crashes

**Symptom:** All tests pass, navigation happens, but dashboard shows blank

**Cause:** Error in Dashboard component rendering

**Fix:** Add error boundary and check component logic

```javascript
// Wrap Dashboard in error boundary
<ErrorBoundary>
  <Dashboard />
</ErrorBoundary>
```

#### Issue 3: Missing Role Check

**Symptom:** User object is set but page is blank

**Cause:** Route protection preventing access

**Fix:** Verify user has correct role for dashboard access

```javascript
// Check route protection logic
<ProtectedRoute allowedRoles={['admin', 'operator']}>
  <Dashboard />
</ProtectedRoute>
```

#### Issue 4: API Calls Fail After Login

**Symptom:** Dashboard loads but shows "No data" or errors

**Cause:** Authorization header not being sent

**Fix:** Ensure token is included in API calls

```javascript
// In API service
headers: {
  'Authorization': `Bearer ${localStorage.getItem('thermacore_token')}`
}
```

---

## Quick Reference

### Backend Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Connection refused | Backend down | Check Render deployment |
| 500 on login | Auth code crash | Check Render logs |
| 401 on login | Wrong credentials | Verify username/password |
| 403 on dashboard | No permissions | Update user role |

### Frontend Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank page | Component crash | Check browser console |
| No navigation | Missing redirect | Add navigate() call |
| No data | Missing auth header | Include token in requests |
| localStorage empty | Not saving token | Check AuthContext |

---

## Tools and Resources

### Diagnostic Tools
- `backend/diagnose_api_endpoints.py` - Python diagnostic script
- `scripts/diagnose-api-endpoints.sh` - Bash diagnostic script
- `backend/test_login_endpoint.py` - Simple login tester

### Documentation
- `API_DIAGNOSTICS_GUIDE.md` - Comprehensive guide
- `QUICK_API_TEST_COMMANDS.md` - Quick curl commands
- `AUTHENTICATION_500_ERROR_FIX.md` - Authentication fixes
- `FRONTEND_DEPLOYMENT.md` - Frontend configuration

### Manual Testing Commands
```bash
# Test health
curl "https://thermacoreapp.onrender.com/health"

# Test login
curl -X POST "https://thermacoreapp.onrender.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin", "password":"YOUR_PASSWORD"}'

# Test dashboard (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" \
  "https://thermacoreapp.onrender.com/api/v1/analytics/dashboard/summary"
```

---

## Getting Help

If you've followed this guide and still have issues:

1. ✅ Run diagnostic script and save output
2. ✅ Check Render logs and save errors
3. ✅ Check browser console and save errors
4. ✅ Document what you've tried
5. ✅ Create an issue with all information

**Include:**
- Diagnostic script output
- Backend logs (if relevant)
- Browser console errors (if relevant)
- Network tab screenshot (if relevant)
- Steps to reproduce

---

## Success Criteria

✅ **Backend Working:**
- Health check returns 200
- Login returns JWT token
- Dashboard returns data

✅ **Frontend Working:**
- No console errors
- Navigation works after login
- Dashboard displays properly
- User can interact with UI

When both backend and frontend are working, the blank page issue will be resolved.
