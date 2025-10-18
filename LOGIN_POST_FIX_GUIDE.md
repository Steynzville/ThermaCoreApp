# Login POST Request Fix - Deployment Guide

## Problem Diagnosed
Backend was receiving GET requests instead of POST, causing 500 errors during login attempts.

## Root Cause
The `public/_redirects` file had a catch-all rule that was intercepting API calls:
```
/* /index.html 200
```

When `VITE_API_BASE_URL` was undefined or empty, API calls became relative URLs (e.g., `/api/v1/auth/login`), and Netlify's redirect rule would catch them, potentially changing the HTTP method.

## Fix Applied

### 1. Updated `public/_redirects`
```
# Proxy API calls to the backend
/api/*  https://thermacoreapp.onrender.com/api/:splat  200
# Redirect all other requests to index.html for SPA routing
/*      /index.html    200
```

### 2. Added Debug Logging to `src/services/authService.js`
The login function now logs:
- The value of `VITE_API_BASE_URL`
- The full URL being called
- The HTTP method (POST)
- Request body (with password masked)

### 3. Added Environment Variable Validation
- Warns when `VITE_API_BASE_URL` is not configured
- Falls back to relative URLs with a warning

## Deployment Checklist

### Step 1: Verify Environment Variable in Netlify
1. Go to Netlify Dashboard → Site Settings
2. Navigate to "Build & deploy" → "Environment variables"
3. **Ensure this variable exists:**
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://thermacoreapp.onrender.com` (or your backend URL)

### Step 2: Deploy
Push this branch to trigger Netlify deployment. The build will:
- Include the updated `_redirects` file
- Bundle the debug logging code
- Use the environment variable from Netlify settings

### Step 3: Test Login
1. Open the deployed site
2. Open browser Developer Tools (F12) → Console tab
3. Attempt to login
4. **Look for this debug output:**
   ```
   === LOGIN DEBUG ===
   VITE_API_BASE_URL: https://thermacoreapp.onrender.com
   Full URL: https://thermacoreapp.onrender.com/api/v1/auth/login
   Method: POST
   Body: { username: 'admin', password: '***' }
   ```

### Step 4: Verify in Network Tab
1. In Developer Tools → Network tab
2. Filter by "Fetch/XHR"
3. Click on the `login` request
4. **Verify:**
   - Request Method: **POST** (not GET!)
   - Request URL: `https://thermacoreapp.onrender.com/api/v1/auth/login`
   - Request Headers: `Content-Type: application/json`
   - Request Payload: `{"username":"...","password":"..."}`

## Expected Results

### ✅ Success Indicators
- Console shows `Method: POST`
- Network tab shows POST request
- Login succeeds without 500 error
- Backend logs show POST requests, not GET

### ❌ If Still Seeing GET Requests

**Check 1: Environment Variable**
If debug log shows:
```
VITE_API_BASE_URL: 
```
→ The environment variable is not set in Netlify. Add it and redeploy.

**Check 2: Relative URL**
If debug log shows:
```
Full URL: /api/v1/auth/login
```
→ This is a relative URL. The `_redirects` fix should handle this, but ideally set `VITE_API_BASE_URL`.

**Check 3: Cache**
- Clear Netlify deploy cache (Deploy settings → Clear cache and redeploy)
- Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- Try incognito/private browsing mode

## Why This Fix Works

1. **API Proxying**: The `/api/*` rule in `_redirects` proxies all API calls to the backend at `https://thermacoreapp.onrender.com`, ensuring they reach the correct destination regardless of how the URL is constructed.

2. **Method Preservation**: Netlify's proxy rule with status 200 preserves the HTTP method (POST) when forwarding requests to the backend.

3. **Debug Visibility**: The logging makes it immediately obvious what URL is being called and what method is being used, helping diagnose any remaining issues.

## Removing Debug Logging (Optional)

Once the issue is confirmed fixed, you can remove the debug logging by deleting lines 42-52 in `src/services/authService.js`:

```javascript
// Remove these lines after confirming fix:
console.log('=== LOGIN DEBUG ===');
console.log('VITE_API_BASE_URL:', API_BASE_URL);
console.log('Full URL:', `${API_BASE_URL}/api/v1/auth/login`);
console.log('Method: POST');
console.log('Body:', { username: identifier, password: '***' });

if (!API_BASE_URL) {
  console.warn('VITE_API_BASE_URL is not configured. Using relative URL.');
}
```

## Contact

If login still fails after these steps, provide:
1. Screenshot of browser console showing debug output
2. Screenshot of Network tab showing the login request details
3. Backend logs from Render showing what request method was received
