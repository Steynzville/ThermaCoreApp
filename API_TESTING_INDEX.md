# API Testing and Diagnostics - Complete Index

This document provides a comprehensive index of all diagnostic tools and documentation for debugging the ThermaCoreApp API, specifically for login and dashboard issues.

## 📋 Quick Start Guide

**Problem:** Blank page after login with no error messages?

**Solution:** Run this command:
```bash
python dev_tools/diagnostic_scripts/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD
```

Then follow the recommendations based on the results.

---

## 🛠️ Diagnostic Tools

### Primary Tools

| Tool | Type | Purpose | Command |
|------|------|---------|---------|
| **diagnose_api_endpoints.py** | Python | Full diagnostic suite | `python dev_tools/diagnostic_scripts/diagnose_api_endpoints.py <url> <user> <pass>` |
| **diagnose-api-endpoints.sh** | Bash | Full diagnostic suite | `./scripts/diagnose-api-endpoints.sh <url> <user> <pass>` |
| **test_login_endpoint.py** | Python | Simple login test | `python backend/test_login_endpoint.py <url> <user> <pass>` |

### Tool Comparison

| Feature | Python Script | Bash Script | Simple Test |
|---------|--------------|-------------|-------------|
| No dependencies | ❌ (needs Python) | ✅ (needs curl) | ❌ (needs Python) |
| Color output | ✅ | ✅ | ✅ |
| Auto token extraction | ✅ | ✅ | ❌ |
| Dashboard test | ✅ | ✅ | ❌ |
| Detailed analysis | ✅ | ✅ | ✅ |
| Recommendations | ✅ | ✅ | ❌ |
| **Recommended** | ⭐⭐⭐ | ⭐⭐ | ⭐ |

---

## 📚 Documentation

### Getting Started

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **DEBUG_LOGIN_BLANK_PAGE_SOLUTION.md** | Complete solution overview | Start here first |
| **QUICK_API_TEST_COMMANDS.md** | Quick curl command reference | Need manual testing |

### Comprehensive Guides

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **API_DIAGNOSTICS_GUIDE.md** | Complete diagnostic procedures | Need detailed steps |
| **LOGIN_BLANK_PAGE_TROUBLESHOOTING.md** | Troubleshooting flowchart | Following decision tree |
| **DIAGNOSTIC_TOOLS_USAGE_EXAMPLES.md** | Real-world examples | Learning by example |

### Reference Documentation

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **scripts/README.md** | Scripts documentation | Understanding tools |
| **backend/README.md** | Backend documentation | API reference needed |
| **AUTHENTICATION_500_ERROR_FIX.md** | Authentication fixes | 500 errors on login |
| **FRONTEND_DEPLOYMENT.md** | Frontend configuration | Frontend setup |

---

## 🎯 Use Cases

### Use Case 1: Quick Diagnosis
**Goal:** Fast check if backend is working

**Steps:**
1. Run: `python dev_tools/diagnostic_scripts/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD`
2. Review color-coded results
3. Follow recommendations

**Documentation:** 
- `QUICK_API_TEST_COMMANDS.md`
- `DEBUG_LOGIN_BLANK_PAGE_SOLUTION.md`

---

### Use Case 2: Backend API Fails
**Goal:** Debug backend authentication or dashboard issues

**Steps:**
1. Run diagnostic script
2. Check Render logs
3. Review stack traces
4. Fix backend code

**Documentation:**
- `API_DIAGNOSTICS_GUIDE.md` (Backend debugging section)
- `AUTHENTICATION_500_ERROR_FIX.md`
- `backend/README.md`

---

### Use Case 3: Frontend Shows Blank Page
**Goal:** Debug frontend React components

**Steps:**
1. Run diagnostic script (verify backend works)
2. Open browser DevTools (F12)
3. Check console, network, and storage
4. Review frontend code

**Documentation:**
- `API_DIAGNOSTICS_GUIDE.md` (Frontend debugging section)
- `LOGIN_BLANK_PAGE_TROUBLESHOOTING.md` (Frontend section)
- `DEBUG_LOGIN_BLANK_PAGE_SOLUTION.md` (Scenario 1)

---

### Use Case 4: Manual API Testing
**Goal:** Test individual endpoints with curl

**Steps:**
1. Copy commands from quick reference
2. Replace YOUR_PASSWORD with actual password
3. Run commands sequentially
4. Analyze responses

**Documentation:**
- `QUICK_API_TEST_COMMANDS.md`
- `DIAGNOSTIC_TOOLS_USAGE_EXAMPLES.md` (Example 6)

---

### Use Case 5: CI/CD Integration
**Goal:** Automate API testing in pipeline

**Steps:**
1. Add diagnostic script to workflow
2. Pass credentials via secrets
3. Parse output for pass/fail

**Documentation:**
- `DIAGNOSTIC_TOOLS_USAGE_EXAMPLES.md` (CI/CD section)
- `scripts/README.md`

---

## 🔍 Decision Trees

### Main Decision Tree

```
Problem: Blank page after login
│
├─ Step 1: Run Diagnostic
│  └─ python dev_tools/diagnostic_scripts/diagnose_api_endpoints.py [url] [user] [pass]
│
├─ Step 2: Interpret Results
│  ├─ Health FAILS → See "Backend Down" below
│  ├─ Login FAILS → See "Login Issues" below
│  ├─ Dashboard FAILS → See "Dashboard Issues" below
│  └─ All PASS → See "Frontend Issues" below
│
└─ Step 3: Follow Documentation
   └─ Use appropriate guide based on result
```

### Backend Down

**Symptoms:**
- Connection refused
- Timeout
- DNS resolution error

**Actions:**
1. Check Render deployment status
2. Review deployment logs
3. Verify environment variables
4. Restart or redeploy service

**Documentation:**
- `API_DIAGNOSTICS_GUIDE.md` (Scenario 4)
- `LOGIN_BLANK_PAGE_TROUBLESHOOTING.md` (Result A)

---

### Login Issues

**Symptoms:**
- 500 Internal Server Error
- 401 Unauthorized
- 403 Forbidden

**Actions:**
1. Check Render backend logs
2. Search for Python exceptions
3. Review authentication code
4. Fix database/configuration issues

**Documentation:**
- `AUTHENTICATION_500_ERROR_FIX.md`
- `LOGIN_BLANK_PAGE_TROUBLESHOOTING.md` (Result B)
- `DEBUG_LOGIN_BLANK_PAGE_SOLUTION.md` (Scenario 2)

---

### Dashboard Issues

**Symptoms:**
- 401 Unauthorized (token invalid)
- 403 Forbidden (no permission)
- 404 Not Found (endpoint missing)
- 500 Internal Error (code crash)

**Actions:**
1. Check user permissions (403)
2. Verify token validity (401)
3. Try alternative endpoint (404)
4. Check Render logs (500)

**Documentation:**
- `API_DIAGNOSTICS_GUIDE.md` (Scenario 1)
- `LOGIN_BLANK_PAGE_TROUBLESHOOTING.md` (Result C)
- `DEBUG_LOGIN_BLANK_PAGE_SOLUTION.md` (Scenario 3)

---

### Frontend Issues

**Symptoms:**
- All backend tests pass
- Blank page in browser
- No error messages visible

**Actions:**
1. Open browser DevTools (F12)
2. Check console for JavaScript errors
3. Check network for failed requests
4. Review localStorage for token
5. Check routing and navigation

**Documentation:**
- `API_DIAGNOSTICS_GUIDE.md` (Frontend Debugging)
- `LOGIN_BLANK_PAGE_TROUBLESHOOTING.md` (Step 3)
- `DEBUG_LOGIN_BLANK_PAGE_SOLUTION.md` (Scenario 1)

---

## 📖 Documentation Quick Reference

### By Document Type

#### Overview Documents
- `DEBUG_LOGIN_BLANK_PAGE_SOLUTION.md` - Complete solution overview
- `API_TESTING_INDEX.md` - This file

#### Step-by-Step Guides
- `API_DIAGNOSTICS_GUIDE.md` - Comprehensive diagnostic guide
- `LOGIN_BLANK_PAGE_TROUBLESHOOTING.md` - Troubleshooting flowchart

#### Quick References
- `QUICK_API_TEST_COMMANDS.md` - Curl commands
- `scripts/README.md` - Scripts documentation

#### Examples and Tutorials
- `DIAGNOSTIC_TOOLS_USAGE_EXAMPLES.md` - Real-world examples

#### Technical References
- `backend/README.md` - Backend API reference
- `AUTHENTICATION_500_ERROR_FIX.md` - Authentication fixes
- `FRONTEND_DEPLOYMENT.md` - Frontend configuration

---

### By Reader Role

#### Developer Debugging Issue
**Start:** `DEBUG_LOGIN_BLANK_PAGE_SOLUTION.md`  
**Then:** Run diagnostic script  
**Finally:** Follow appropriate guide based on results

#### DevOps/Infrastructure
**Start:** `API_DIAGNOSTICS_GUIDE.md`  
**Focus:** Backend debugging, Render logs, deployment  
**Reference:** `backend/README.md`

#### Frontend Developer
**Start:** `API_DIAGNOSTICS_GUIDE.md` (Frontend section)  
**Focus:** Browser DevTools, React components, routing  
**Reference:** `FRONTEND_DEPLOYMENT.md`

#### QA/Testing
**Start:** `DIAGNOSTIC_TOOLS_USAGE_EXAMPLES.md`  
**Focus:** Automated testing, CI/CD integration  
**Reference:** `QUICK_API_TEST_COMMANDS.md`

---

## 🚀 Common Commands

### Diagnostic Testing
```bash
# Full diagnostic (Python)
python dev_tools/diagnostic_scripts/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD

# Full diagnostic (Bash)
./scripts/diagnose-api-endpoints.sh https://thermacoreapp.onrender.com admin YOUR_PASSWORD

# Simple login test
python backend/test_login_endpoint.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD

# Local testing
python dev_tools/diagnostic_scripts/diagnose_api_endpoints.py http://localhost:5000 admin admin123
```

### Manual Testing
```bash
# Health check
curl "https://thermacoreapp.onrender.com/health"

# Login
curl -X POST "https://thermacoreapp.onrender.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin", "password":"YOUR_PASSWORD"}'

# Dashboard (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" \
  "https://thermacoreapp.onrender.com/api/v1/analytics/dashboard/summary"
```

---

## 📝 File Locations

### Diagnostic Scripts
```
dev_tools/diagnostic_scripts/diagnose_api_endpoints.py          # Python diagnostic tool
backend/test_login_endpoint.py             # Simple login tester
scripts/diagnose-api-endpoints.sh          # Bash diagnostic tool
```

### Documentation
```
API_DIAGNOSTICS_GUIDE.md                   # Comprehensive guide
QUICK_API_TEST_COMMANDS.md                 # Quick reference
DIAGNOSTIC_TOOLS_USAGE_EXAMPLES.md         # Usage examples
LOGIN_BLANK_PAGE_TROUBLESHOOTING.md        # Troubleshooting flowchart
DEBUG_LOGIN_BLANK_PAGE_SOLUTION.md         # Complete solution
API_TESTING_INDEX.md                       # This file
scripts/README.md                          # Scripts documentation
backend/README.md                          # Backend documentation
AUTHENTICATION_500_ERROR_FIX.md            # Auth fixes
FRONTEND_DEPLOYMENT.md                     # Frontend config
```

### Backend Code
```
backend/app/routes/auth.py                 # Authentication endpoint
backend/app/routes/analytics.py            # Dashboard endpoint
backend/config.py                          # Configuration
```

### Frontend Code
```
src/context/AuthContext.jsx                # Authentication context
src/services/authService.js                # API service
src/App.jsx                                # Routing
```

---

## 🎓 Learning Path

### Beginner: First Time Debugging
1. Read: `DEBUG_LOGIN_BLANK_PAGE_SOLUTION.md`
2. Run: Python diagnostic script
3. Read: Appropriate section in `API_DIAGNOSTICS_GUIDE.md`
4. Follow: Step-by-step instructions

### Intermediate: Understanding the System
1. Read: `API_DIAGNOSTICS_GUIDE.md` (full)
2. Review: `DIAGNOSTIC_TOOLS_USAGE_EXAMPLES.md`
3. Study: `LOGIN_BLANK_PAGE_TROUBLESHOOTING.md`
4. Practice: Manual curl commands

### Advanced: Automation and Integration
1. Study: Diagnostic script source code
2. Review: CI/CD integration examples
3. Customize: Scripts for specific needs
4. Contribute: Improvements and fixes

---

## ✅ Success Metrics

### Backend Health
- ✅ Health endpoint returns 200
- ✅ Login returns JWT token
- ✅ Dashboard returns data
- ✅ No 500 errors in logs

### Frontend Health
- ✅ No console errors
- ✅ API calls include Authorization header
- ✅ localStorage contains token
- ✅ Navigation works after login
- ✅ Dashboard displays correctly

### Issue Resolution
- ✅ Blank page issue resolved
- ✅ Users can login successfully
- ✅ Dashboard loads and displays data
- ✅ No unexplained errors

---

## 🆘 Getting Help

If you still need help after using these resources:

1. **Run diagnostic script** and save output
2. **Check Render logs** and save errors
3. **Check browser console** and save errors
4. **Document steps** you've already tried
5. **Create issue** with all information

**Include:**
- Diagnostic script output (full text)
- Backend logs (relevant sections)
- Browser console errors (screenshots)
- Network tab (screenshots if relevant)
- Steps to reproduce
- What you've already tried

---

## 📅 Document Status

**Created:** 2025-10-13  
**Last Updated:** 2025-10-13  
**Status:** Current and Complete  
**Maintained By:** Development Team

---

## 🔗 Related Resources

- [Backend README](backend/README.md)
- [Frontend Deployment Guide](FRONTEND_DEPLOYMENT.md)
- [Authentication Fix Guide](AUTHENTICATION_500_ERROR_FIX.md)
- [Scripts Documentation](scripts/README.md)

---

## Summary

This index provides:
- ✅ Quick access to all diagnostic tools
- ✅ Clear documentation structure
- ✅ Decision trees for troubleshooting
- ✅ Common commands and examples
- ✅ Learning paths for different skill levels

**Start with:** `DEBUG_LOGIN_BLANK_PAGE_SOLUTION.md` and the Python diagnostic script.
