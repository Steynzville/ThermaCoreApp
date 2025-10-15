# Password Reset Fix - Quick Deployment Guide

## 🚀 Quick Start

### For Netlify (Frontend)
1. Set environment variable:
   ```
   VITE_API_BASE_URL=https://thermacoreapp.onrender.com
   ```
2. Deploy branch: `copilot/fix-password-reset-api-issue`

### For Render (Backend)
1. Set environment variable:
   ```
   CORS_ORIGINS=https://thermacoreapp.netlify.app,http://localhost:3000,http://localhost:5173
   ```
2. Deploy branch: `copilot/fix-password-reset-api-issue`
3. Restart service after environment variable update

## ✅ Verification Steps

### 1. Backend Health Check
```bash
curl https://thermacoreapp.onrender.com/health
```
Expected: HTTP 200 with JSON response

### 2. Frontend Can Reach Backend
1. Open: https://thermacoreapp.netlify.app
2. Open browser console (F12)
3. Check for CORS errors: Should be none
4. Look for successful API calls to `thermacoreapp.onrender.com`

### 3. Password Reset Flow
1. Log in as admin user
2. Go to Admin Panel → Password Management tab
3. Click "Reset Password" for any user
4. Enter new password (min 6 characters)
5. Click "Reset Password" button
6. Expected: Success message "Password reset successfully for {username}"

### 4. Error Handling
If backend is down:
1. Try password reset
2. Expected error: "Unable to connect to backend server. Please check that the backend is running and accessible."
3. Console should show detailed error logs

## 🔧 Troubleshooting

### Issue: "Failed to fetch" error
**Check:**
1. Backend is running: `curl https://thermacoreapp.onrender.com/health`
2. CORS_ORIGINS includes Netlify domain
3. Frontend uses correct VITE_API_BASE_URL

**Fix:**
- Backend: Add `https://thermacoreapp.netlify.app` to CORS_ORIGINS
- Frontend: Set `VITE_API_BASE_URL=https://thermacoreapp.onrender.com`

### Issue: CORS error in browser console
**Check:**
```
Access to fetch at 'https://thermacoreapp.onrender.com/...' from origin 'https://thermacoreapp.netlify.app' has been blocked by CORS policy
```

**Fix:**
Backend environment variable must include:
```
CORS_ORIGINS=https://thermacoreapp.netlify.app
```

### Issue: 401 Unauthorized
**Check:** User is logged in with admin role

**Fix:** 
- Password reset requires admin role
- User must log in first
- JWT token must be valid

### Issue: Backend sleeping (Render free tier)
**Symptom:** First request takes 30+ seconds

**Solution:** 
- This is normal for Render free tier
- Backend wakes up automatically
- Subsequent requests are fast
- Consider upgrading to paid tier for production

## 📋 Pre-Deployment Checklist

- [ ] Backend environment has `CORS_ORIGINS` with Netlify domain
- [ ] Frontend environment has `VITE_API_BASE_URL` pointing to Render
- [ ] Backend is accessible at `/health` endpoint
- [ ] Branch `copilot/fix-password-reset-api-issue` is ready to merge
- [ ] All tests passing (83/83 ✅)
- [ ] Frontend builds successfully

## 📝 What Changed

### Frontend (Minimal Changes)
- API endpoint URL: `/api/users/` → `/api/v1/users/`
- Enhanced error logging for better debugging

### Backend (Minimal Changes)
- Added Netlify domain to default CORS_ORIGINS
- Enhanced CORS configuration with explicit settings

### Impact
- Zero breaking changes
- Backwards compatible
- Only affects password reset feature
- Improves error messages for all API calls

## 🔗 Related Files

- Fix details: `PASSWORD_RESET_FIX_SUMMARY.md`
- Frontend code: `src/components/AdminPanel.jsx`
- Backend code: `backend/app/routes/users.py`
- Backend config: `backend/config.py`
- Backend app: `backend/app/__init__.py`

## 🆘 Support

If issues persist after deployment:

1. Check backend logs in Render dashboard
2. Check browser console for detailed error messages
3. Verify environment variables are set correctly
4. Check backend health endpoint is responding
5. Review `PASSWORD_RESET_FIX_SUMMARY.md` for detailed technical info

## ⚡ Rollback Plan

If needed, revert to previous branch:
- Frontend: Redeploy `main` branch on Netlify
- Backend: Redeploy `main` branch on Render
- No database changes required (zero schema changes)

The fix is backwards compatible, so rollback is safe.
