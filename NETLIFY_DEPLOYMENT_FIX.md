# Netlify Deployment Configuration Guide

## Issue Diagnosed
The deployed frontend was producing a blank page due to incorrect build configuration in `netlify.toml`.

## Root Cause
The `netlify.toml` was configured to use `npm run build` but the project uses **pnpm** as its package manager (specified in `package.json`). This caused the build to fail or produce an incomplete/incorrect build on Netlify.

## Fix Applied

### 1. Updated `netlify.toml`
Changed from:
```toml
[build]
  command = "npm run build"
```

To:
```toml
[build]
  command = "pnpm install && pnpm run build"
```

### 2. Added `.env.production`
Created environment variable documentation for production deployment.

## Netlify Configuration Checklist

### Build Settings
- ✅ Build command: `pnpm install && pnpm run build`
- ✅ Publish directory: `dist`
- ✅ Node version: 18 (specified in netlify.toml)

### Environment Variables (Optional)
Configure these in Netlify Dashboard > Site Settings > Environment Variables:

| Variable | Value | Required | Notes |
|----------|-------|----------|-------|
| `VITE_API_BASE_URL` | `https://thermacoreapp.onrender.com` | No | Defaults to this if not set |
| `VITE_API_URL` | `https://thermacoreapp.onrender.com` | No | Same as above |
| `NODE_VERSION` | `18` | No | Already in netlify.toml |

**Note:** The app has fallback defaults for the API URL, so these variables are optional unless you need to change the backend URL.

### Deploy Configuration
The `netlify.toml` includes:
- **Redirects**: All routes (`/*`) redirect to `/index.html` for SPA routing
- **Build environment**: Node 18
- **Package manager**: pnpm (auto-detected from package.json)

## Verification Steps

### Local Build Test
```bash
# Install dependencies
pnpm install

# Run production build
pnpm run build

# Preview the build
pnpm run preview
```

### Check Build Output
After build completes, verify:
1. ✅ `dist/` directory exists
2. ✅ `dist/index.html` exists
3. ✅ `dist/assets/` contains JS and CSS files
4. ✅ No console errors in the build output

### Netlify Deploy
1. Push changes to GitHub
2. Netlify will auto-deploy from the connected branch
3. Check Netlify build logs for:
   - ✅ pnpm installation
   - ✅ Successful build completion
   - ✅ No errors or warnings

## Common Issues & Solutions

### Issue: "pnpm: command not found"
**Solution:** Netlify should auto-detect pnpm from `package.json`. If it doesn't:
- Ensure `packageManager` field exists in package.json
- Try adding pnpm installation step in build command

### Issue: Build succeeds but page is blank
**Possible causes:**
1. JavaScript errors in production bundle
2. Incorrect base path in vite.config.js
3. Missing environment variables
4. CORS issues with backend API

**Debug steps:**
1. Open browser DevTools Console tab
2. Look for JavaScript errors (red messages)
3. Check Network tab for failed API requests
4. Verify API URL is correct

### Issue: Routes don't work (404 on refresh)
**Solution:** Verify `[[redirects]]` section exists in netlify.toml:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Build Analysis

### Build Output (from local test)
- ✅ Main bundle: ~62KB (index-BGc8BOdJ.js)
- ✅ CSS bundle: ~161KB (index-BDQeH8Iu.css) 
- ✅ React vendors properly split
- ✅ Registration component and CSS included
- ✅ All lazy-loaded components generated

### Performance
- No build warnings
- No errors
- Proper code splitting
- Optimized bundle sizes

## Next Steps

1. **Deploy to Netlify**
   - Push this fix to the repository
   - Netlify will auto-deploy
   - Monitor build logs

2. **Verify Deployment**
   - Open the Netlify URL
   - Check that login page loads
   - Test registration form (/register)
   - Verify routing works

3. **Monitor**
   - Check Netlify build logs for any issues
   - Monitor browser console for runtime errors
   - Test API connectivity

## Additional Notes

### Package Manager
The project uses **pnpm@10.4.1** as specified in package.json. This is important because:
- Different package managers (npm, yarn, pnpm) can produce different builds
- pnpm uses a unique node_modules structure
- Dependencies must be installed with pnpm for consistent builds

### Registration Feature
The user registration feature (PR #236) is properly integrated:
- ✅ Component exists: `src/components/UserRegistrationForm.jsx`
- ✅ Styles exist: `src/styles/UserRegistration.css`
- ✅ Route configured: `/register` in App.jsx
- ✅ Service function: `register()` in authService.js
- ✅ Build includes registration code and styles

## Conclusion

The blank page issue was caused by using `npm` instead of `pnpm` in the Netlify build command. The fix is to update `netlify.toml` to use the correct package manager. All other code and configuration is working correctly.
