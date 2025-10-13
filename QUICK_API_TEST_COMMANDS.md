# Quick API Test Commands

Use these curl commands to quickly test the ThermaCoreApp API endpoints.

## Prerequisites

Replace these values in the commands below:
- `YOUR_PASSWORD` - Your actual admin password
- `YOUR_TOKEN` - The JWT token returned from login

## Command 1: Test Health Endpoint

```bash
curl "https://thermacoreapp.onrender.com/health"
```

**Expected:** 200 OK with status response

**Indicates:** Backend server is running and accessible

---

## Command 2: Test Login Endpoint

```bash
curl -X POST "https://thermacoreapp.onrender.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin", "password":"YOUR_PASSWORD"}'
```

**Expected:** 200 OK with JWT token

**Look for:** `"access_token": "eyJhbGci..."`

**Indicates:** Authentication is working and JWT tokens are being generated

---

## Command 3: Test Dashboard Endpoint

**First, extract the token from Command 2, then:**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://thermacoreapp.onrender.com/api/v1/dashboard"
```

**Alternative endpoint (if above returns 404):**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://thermacoreapp.onrender.com/api/v1/analytics/dashboard/summary"
```

**Expected:** 200 OK with dashboard data

**Indicates:** Authenticated access to dashboard is working

---

## Complete Test Flow Example

```bash
# Step 1: Test health
echo "=== Testing Health Endpoint ==="
curl "https://thermacoreapp.onrender.com/health"
echo -e "\n"

# Step 2: Test login and save response
echo "=== Testing Login Endpoint ==="
LOGIN_RESPONSE=$(curl -s -X POST "https://thermacoreapp.onrender.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin", "password":"YOUR_PASSWORD"}')
echo "$LOGIN_RESPONSE" | python3 -m json.tool
echo -e "\n"

# Step 3: Extract token and test dashboard
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])" 2>/dev/null)

if [ -n "$TOKEN" ]; then
    echo "=== Testing Dashboard Endpoint ==="
    curl -H "Authorization: Bearer $TOKEN" \
      "https://thermacoreapp.onrender.com/api/v1/analytics/dashboard/summary" | python3 -m json.tool
else
    echo "ERROR: Could not extract token from login response"
fi
```

---

## Using the Diagnostic Scripts (Recommended)

Instead of running curl commands manually, use the provided diagnostic scripts:

### Python Script
```bash
python backend/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD
```

### Bash Script
```bash
./scripts/diagnose-api-endpoints.sh https://thermacoreapp.onrender.com admin YOUR_PASSWORD
```

These scripts automatically:
- Test all three endpoints in sequence
- Extract and use the JWT token
- Provide color-coded results
- Give actionable recommendations

---

## Interpreting Results

### ✅ All Tests Pass
- Backend API is working correctly
- Issue is likely in the frontend React code
- Check browser console for JavaScript errors
- Review routing and component rendering

### ❌ Login Returns 500
- Backend authentication code is crashing
- Check Render logs for Python exceptions
- Review `AUTHENTICATION_500_ERROR_FIX.md`
- Verify database connection and user roles

### ❌ Dashboard Returns 401/403
- Authentication works but authorization fails
- Check user permissions in database
- Verify JWT token is valid
- Review RBAC configuration

### ❌ Health Check Fails
- Backend server is down or unreachable
- Check Render deployment status
- Review deployment logs
- Verify domain configuration

---

## Quick Troubleshooting

**Can't connect at all?**
- Check if backend is deployed on Render
- Verify the URL is correct
- Check for network/firewall issues

**Getting 401 Unauthorized?**
- Check username and password are correct
- Verify user exists in database
- Check JWT token is being sent correctly

**Getting 500 Internal Server Error?**
- Backend code is crashing
- Check Render logs for exceptions
- Review recent code changes
- Verify database connection

**Frontend shows blank page but API works?**
- Open browser DevTools (F12)
- Check Console for JavaScript errors
- Check Network tab for failed requests
- Review React component code

---

## See Also

- `API_DIAGNOSTICS_GUIDE.md` - Comprehensive debugging guide
- `AUTHENTICATION_500_ERROR_FIX.md` - Authentication issue fixes
- `FRONTEND_DEPLOYMENT.md` - Frontend configuration
