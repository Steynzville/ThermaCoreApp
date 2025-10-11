# ThermaCore Frontend Deployment Checklist

## ✅ Pre-Deployment Checklist

### Backend Requirements
- [ ] Backend is deployed and running at https://thermacoreapp.onrender.com
- [ ] Backend `/api/v1/auth/login` endpoint is accessible
- [ ] Admin user credentials are configured in backend database
- [ ] Backend CORS is configured to allow Netlify domain

### Frontend Requirements
- [ ] All tests pass (62/62 tests passing)
- [ ] Build completes successfully
- [ ] No linting errors
- [ ] Security validation passes

## 🚀 Netlify Deployment Steps

### 1. Set Environment Variable

1. Log in to Netlify
2. Navigate to your site dashboard
3. Click "Site settings"
4. Go to "Build & deploy" → "Environment variables"
5. Click "Add a variable"
6. Add the following:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://thermacoreapp.onrender.com`
7. Click "Save"

### 2. Deploy

Option A - Automatic (Recommended):
- Push to main branch or merge PR
- Netlify will automatically build and deploy

Option B - Manual:
- In Netlify dashboard, click "Deploys"
- Click "Trigger deploy" → "Deploy site"

### 3. Verify Deployment

After deployment completes:

1. **Check build logs**:
   - Look for `✓ built in` success message
   - Ensure no build errors

2. **Test authentication**:
   - Visit your Netlify URL
   - Go to login page
   - Open browser DevTools → Console tab
   - Enter valid backend credentials
   - Click "Sign In"

3. **Expected behavior**:
   - Network request to `https://thermacoreapp.onrender.com/api/v1/auth/login` visible in Network tab
   - No CORS errors in console
   - On success: redirected to dashboard
   - JWT token stored in localStorage as `thermacore_token`

## 🔍 Troubleshooting

### Issue: "Network error" on login

**Possible causes**:
- Backend not running
- Wrong VITE_API_BASE_URL value
- CORS not configured

**Solutions**:
1. Verify backend is accessible: `curl https://thermacoreapp.onrender.com/api/v1/health`
2. Check Netlify environment variable is set correctly
3. Check backend CORS settings allow your Netlify domain
4. Check browser console for specific error messages

### Issue: "Invalid credentials"

**Possible causes**:
- Credentials not in backend database
- Backend authentication not working

**Solutions**:
1. Verify credentials exist in backend
2. Test backend directly: 
   ```bash
   curl -X POST https://thermacoreapp.onrender.com/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"your-password"}'
   ```
3. Check backend logs for errors

### Issue: CORS error

**Error message**: "Access to fetch at '...' from origin '...' has been blocked by CORS policy"

**Solution**:
1. Add your Netlify domain to backend CORS_ORIGINS
2. Update backend .env file:
   ```
   CORS_ORIGINS=https://your-app.netlify.app,https://thermacoreapp.onrender.com
   ```
3. Restart backend

### Issue: Build fails on Netlify

**Possible causes**:
- Missing dependencies
- Environment variable not set during build

**Solutions**:
1. Check Netlify build logs for specific error
2. Ensure Node version matches (v18+)
3. Clear cache and retry: "Deploys" → "Clear cache and retry deploy"

## 📋 Post-Deployment Verification

After successful deployment, verify:

- [ ] Login page loads correctly
- [ ] Login with valid credentials works
- [ ] JWT token is stored in localStorage
- [ ] User is redirected to dashboard after login
- [ ] Logout works correctly (clears token)
- [ ] Invalid credentials show appropriate error
- [ ] Network errors are handled gracefully
- [ ] No console errors in browser DevTools

## 🔐 Security Notes

1. **Environment Variables**: Never commit `.env` file to git
2. **JWT Token**: Currently stored in localStorage (consider httpOnly cookies for production)
3. **CORS**: Ensure only trusted domains are allowed
4. **Rate Limiting**: Backend should have rate limiting enabled
5. **HTTPS**: Always use HTTPS in production (automatic with Netlify)

## 📞 Support

If issues persist:
1. Check AUTHENTICATION_INTEGRATION_SUMMARY.md for detailed implementation info
2. Review browser console and network tab for specific errors
3. Check Netlify build logs for deployment issues
4. Verify backend logs for API errors

## ✨ Success Criteria

Deployment is successful when:
- ✅ Frontend loads without errors
- ✅ Login with backend credentials works
- ✅ JWT token is properly stored
- ✅ User can access protected routes after login
- ✅ No CORS errors in console
- ✅ Logout properly clears authentication state
