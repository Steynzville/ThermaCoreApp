# Scripts Directory

This directory contains utility scripts for the ThermaCoreApp project.

## Available Scripts

### diagnose-api-endpoints.sh

**Purpose:** Comprehensive API endpoint diagnostic tool for debugging login and dashboard issues.

**Usage:**
```bash
./scripts/diagnose-api-endpoints.sh [base_url] [username] [password]
```

**Examples:**
```bash
# Test production backend
./scripts/diagnose-api-endpoints.sh https://thermacoreapp.onrender.com admin YOUR_PASSWORD

# Test local backend
./scripts/diagnose-api-endpoints.sh http://localhost:5000 admin admin123
```

**What it does:**
1. Tests health endpoint to verify backend is running
2. Tests login endpoint and extracts JWT token
3. Tests dashboard endpoint with the JWT token
4. Provides color-coded results and recommendations

**Output:**
- ✅ Green checkmarks for successful tests
- ❌ Red X marks for failed tests
- ⚠️  Yellow warnings for issues
- Detailed error messages and recommendations

**See also:** `API_DIAGNOSTICS_GUIDE.md` for detailed documentation

---

### check-security.js

**Purpose:** Security check for build artifacts to ensure no sensitive data is exposed.

**Usage:**
```bash
node scripts/check-security.js --build
```

**What it checks:**
- No hardcoded credentials in build files
- No API keys or secrets in JavaScript bundles
- No development-only code in production builds

---

### debug-security.js

**Purpose:** Debug and test security configurations.

**Usage:**
```bash
node scripts/debug-security.js
```

**What it does:**
- Validates security configurations
- Tests authentication flows
- Checks for common security issues

---

### test-security-guards.js

**Purpose:** Test security guard implementations.

**Usage:**
```bash
node scripts/test-security-guards.js
```

**What it tests:**
- Route protection mechanisms
- Authentication guards
- Authorization checks

---

## Related Python Scripts

The `backend/` directory also contains Python diagnostic scripts:

### dev_tools/diagnostic_scripts/diagnose_api_endpoints.py

**Purpose:** Python version of the API diagnostic tool (recommended).

**Usage:**
```bash
python dev_tools/diagnostic_scripts/diagnose_api_endpoints.py [base_url] [username] [password]
```

**Advantages over bash script:**
- More robust error handling
- Better JSON parsing
- More detailed output
- Cross-platform compatibility

**See:** `API_DIAGNOSTICS_GUIDE.md` for usage examples

### backend/test_login_endpoint.py

**Purpose:** Simple login endpoint tester.

**Usage:**
```bash
python backend/test_login_endpoint.py [backend_url] [username] [password]
```

---

## Quick Reference

### Debugging Login Issues

If you're experiencing login issues (blank page, spinner, etc.):

1. **Run the diagnostic script:**
   ```bash
   python dev_tools/diagnostic_scripts/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD
   ```

2. **Review the results:**
   - If all tests pass → Frontend issue (check browser console)
   - If login fails → Backend auth issue (check Render logs)
   - If dashboard fails → Permission or endpoint issue

3. **See documentation:**
   - `API_DIAGNOSTICS_GUIDE.md` - Comprehensive debugging guide
   - `QUICK_API_TEST_COMMANDS.md` - Quick curl command reference
   - `AUTHENTICATION_500_ERROR_FIX.md` - Known authentication fixes

---

## Contributing

When adding new scripts to this directory:

1. Make them executable: `chmod +x scripts/your-script.sh`
2. Add usage documentation in this README
3. Include inline comments in the script
4. Follow existing naming conventions
5. Test on both local and production environments

---

## Support

For questions or issues with these scripts, please:
1. Check the related documentation (listed above)
2. Review the script source code (all scripts are well-commented)
3. Create an issue with specific error messages and context
