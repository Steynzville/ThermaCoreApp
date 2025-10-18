# Post-Deployment Verification Checklist

Use this checklist after Netlify deploys the fix to verify everything is working correctly.

## 1. Netlify Build Verification

### Check Build Logs
1. Go to Netlify Dashboard
2. Navigate to Deploys
3. Click on the latest deploy
4. Check build logs for:
   - ✅ `pnpm install` command executed
   - ✅ `pnpm run build` command executed
   - ✅ No errors in build output
   - ✅ Build completed successfully
   - ✅ Site published successfully

### Expected Build Output
```
[Build] Running command: pnpm install && pnpm run build
[Build] pnpm install
[Build] ...dependency installation...
[Build] pnpm run build
[Build] vite v6.3.6 building for production...
[Build] ✓ built in Xs
[Build] Site is live ✨
```

## 2. Frontend Verification

### Initial Load Test
1. Open the Netlify site URL in a browser
2. **Expected:** Login page should load (not blank)
3. Check browser DevTools Console:
   - ✅ No red error messages
   - ✅ No 404 errors for assets
   - ✅ CSS is loaded (page is styled)

### Login Page Test
1. Navigate to the login page
2. Verify all elements are visible:
   - ✅ ThermaCore logo
   - ✅ Username/email input field
   - ✅ Password input field
   - ✅ "Sign in" button
   - ✅ "Forgot password?" link
   - ✅ Theme toggle button (top right)

### Registration Page Test
1. Navigate to `/register` (or click "Create account" if available)
2. Verify registration form loads:
   - ✅ Page displays (not blank)
   - ✅ Form fields are visible and styled
   - ✅ All required fields marked with *
   - ✅ "Create Account" button present
   - ✅ "Cancel" button present
   - ✅ Styles are applied correctly

### Routing Test
1. Try navigating directly to different routes:
   - `/login` - Should show login page
   - `/register` - Should show registration form
   - `/forgot-password` - Should show forgot password page
   - `/dashboard` - Should redirect to login (if not authenticated)
2. After navigation:
   - ✅ URL updates correctly
   - ✅ Page content changes
   - ✅ No blank screens
   - ✅ Refresh button works (no 404)

### Theme Toggle Test
1. Click the theme toggle button (top right corner)
2. Verify:
   - ✅ Theme switches between light and dark
   - ✅ No visual glitches
   - ✅ All elements remain visible

## 3. Functionality Test

### Registration Form Submission
1. Fill out the registration form with test data:
   - Username: `testuser123`
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - First Name: `Test`
   - Last Name: `User`
2. Click "Create Account"
3. Expected outcomes:
   - ✅ Form validates properly
   - ✅ API request is sent (check Network tab)
   - ✅ Success/error message displays
   - ✅ If successful, redirects to login page

### Login Test (if you have credentials)
1. Enter valid credentials
2. Click "Sign in"
3. Verify:
   - ✅ Authentication request sent
   - ✅ Redirect to dashboard (if successful)
   - ✅ Error message shows (if invalid)

## 4. Technical Verification

### Browser Console Check
Open DevTools Console and verify:
- ✅ No uncaught errors
- ✅ No failed network requests (check Network tab)
- ✅ No 404 errors for JS/CSS files
- ✅ API calls reach the backend (even if they fail due to auth)

### Network Tab Check
1. Open DevTools Network tab
2. Reload the page
3. Verify:
   - ✅ `index.html` loads (200 status)
   - ✅ All JS bundles load (200 status)
   - ✅ All CSS files load (200 status)
   - ✅ Images/assets load (200 status)
   - ✅ No 404 errors

### Responsive Design Check
Test on different screen sizes:
1. Desktop (1920x1080)
2. Tablet (768x1024)
3. Mobile (375x667)

For each size verify:
- ✅ Page content is visible
- ✅ Layout adapts correctly
- ✅ No horizontal scrolling
- ✅ Buttons are clickable
- ✅ Forms are usable

## 5. Performance Check

### Load Time
- ✅ Initial page load < 3 seconds
- ✅ JavaScript executes without delay
- ✅ CSS applies immediately (no FOUC)

### Bundle Sizes
Check in Network tab:
- Main JS bundle: ~60-70 KB
- CSS bundle: ~160-170 KB
- Total transferred: < 500 KB (first load)

## 6. Cross-Browser Check

Test in multiple browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if available)

For each browser verify:
- Page loads without blank screen
- All features work
- No console errors

## Troubleshooting

### If Page is Still Blank

1. **Check Netlify Build Logs**
   - Look for errors in build process
   - Verify pnpm was used (not npm)
   - Check if build completed successfully

2. **Check Browser Console**
   - Look for JavaScript errors
   - Check for failed network requests
   - Verify API URL is correct

3. **Check Network Tab**
   - Verify all assets loaded
   - Check HTTP status codes
   - Look for CORS errors

4. **Clear Cache and Retry**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Clear browser cache
   - Try incognito/private mode

5. **Check Netlify Redirects**
   - Verify `[[redirects]]` in netlify.toml
   - Test direct URL access (e.g., `/register`)
   - Should redirect to index.html, not 404

### Common Issues

**Issue**: 404 on refresh
- **Cause**: Redirects not configured
- **Fix**: Check netlify.toml has redirect rule

**Issue**: API calls fail with CORS
- **Cause**: Backend CORS not configured
- **Fix**: Configure backend to allow frontend domain

**Issue**: Environment variables not working
- **Cause**: Not configured in Netlify
- **Fix**: Add in Netlify Environment Variables settings

## Success Criteria

The deployment is successful if:
- ✅ Login page loads (not blank)
- ✅ Registration form is accessible and functional
- ✅ No console errors
- ✅ All assets load correctly
- ✅ Routing works (no 404 on refresh)
- ✅ Theme toggle works
- ✅ Forms can be submitted (even if API fails due to other issues)

## Sign-Off

After completing all verification steps:
- [ ] All critical checks passed
- [ ] No blockers identified
- [ ] Minor issues documented (if any)
- [ ] Deployment approved

**Tested by:** _____________  
**Date:** _____________  
**Result:** ⬜ Pass ⬜ Fail with issues (list below)

**Issues Found:**
1. 
2. 
3. 

---

**Note:** This checklist focuses on frontend functionality. Backend API issues (if any) are separate and should be addressed in the backend repository.
