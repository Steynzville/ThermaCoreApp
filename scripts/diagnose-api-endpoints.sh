#!/bin/bash
# 
# API Endpoint Diagnostic Script
# 
# This script tests the ThermaCoreApp API endpoints to diagnose login and dashboard issues.
# It performs systematic testing as described in the issue:
# 1. Test login API and verify JWT token return
# 2. Test health endpoint
# 3. If login succeeds, test dashboard endpoint with token
# 
# Usage:
#   ./scripts/diagnose-api-endpoints.sh [base_url] [username] [password]
# 
# Example:
#   ./scripts/diagnose-api-endpoints.sh https://thermacoreapp.onrender.com admin YOUR_PASSWORD
#

# Note: Not using 'set -e' to allow graceful failure handling

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
BASE_URL="${1:-https://thermacoreapp.onrender.com}"
USERNAME="${2:-admin}"
PASSWORD="${3:-admin123}"

# Remove trailing slash from base URL
BASE_URL="${BASE_URL%/}"

# Temporary files for storing responses
TMP_DIR=$(mktemp -d)
LOGIN_RESPONSE="${TMP_DIR}/login_response.json"
HEALTH_RESPONSE="${TMP_DIR}/health_response.json"
DASHBOARD_RESPONSE="${TMP_DIR}/dashboard_response.json"

# Cleanup function
cleanup() {
    rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

# Print header
echo ""
echo "=========================================="
echo "  ThermaCoreApp API Diagnostic Tool"
echo "=========================================="
echo ""
echo "Base URL: ${BASE_URL}"
echo "Username: ${USERNAME}"
echo "Password: $(echo ${PASSWORD} | sed 's/./*/g')"
echo ""
echo "=========================================="
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${BLUE}  $1${NC}"
    echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Function to print success
print_success() {
    echo "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo "${RED}❌ $1${NC}"
}

# Function to print warning
print_warning() {
    echo "${YELLOW}⚠️  $1${NC}"
}

# Function to print info
print_info() {
    echo "ℹ️  $1"
}

# Function to pretty-print JSON (pure bash, no Python dependency)
# Falls back to raw output if jq or python3 not available
pretty_json() {
    local file="$1"
    # Try jq first (if available), then python3, then raw output
    if command -v jq &> /dev/null; then
        jq '.' "$file" 2>/dev/null || cat "$file"
    elif command -v python3 &> /dev/null; then
        python3 -m json.tool "$file" 2>/dev/null || cat "$file"
    else
        # Fallback: just output the file as-is
        cat "$file"
    fi
}

#
# STEP 1: Test Health Endpoint
#
print_section "STEP 1: Testing Health Endpoint"

print_info "Testing: GET ${BASE_URL}/health"
echo ""

HTTP_STATUS=$(curl -s -o "${HEALTH_RESPONSE}" -w "%{http_code}" \
    "${BASE_URL}/health" 2>/dev/null || echo "000")

echo "HTTP Status: ${HTTP_STATUS}"
echo ""

if [ "${HTTP_STATUS}" = "200" ]; then
    print_success "Health endpoint is responding correctly"
    echo ""
    echo "Response:"
    pretty_json "${HEALTH_RESPONSE}"
elif [ "${HTTP_STATUS}" = "000" ]; then
    print_error "Failed to connect to backend - network error or server is down"
    print_info "Check if the backend is deployed and running on Render"
    exit 1
else
    print_warning "Health endpoint returned unexpected status: ${HTTP_STATUS}"
    echo ""
    echo "Response:"
    cat "${HEALTH_RESPONSE}"
fi

#
# STEP 2: Test Login Endpoint
#
print_section "STEP 2: Testing Login Endpoint"

print_info "Testing: POST ${BASE_URL}/api/v1/auth/login"
echo ""

HTTP_STATUS=$(curl -s -o "${LOGIN_RESPONSE}" -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}" \
    "${BASE_URL}/api/v1/auth/login" 2>/dev/null || echo "000")

echo "HTTP Status: ${HTTP_STATUS}"
echo ""

if [ "${HTTP_STATUS}" = "200" ]; then
    print_success "Login endpoint returned 200 OK"
    
    # Check if response contains access_token
    if grep -q "access_token" "${LOGIN_RESPONSE}"; then
        print_success "JWT token found in response"
        
        # Extract the token using pure bash/grep/cut (no Python dependency)
        ACCESS_TOKEN=$(grep -o '"access_token":"[^"]*' "${LOGIN_RESPONSE}" | cut -d'"' -f4)
        
        if [ -n "${ACCESS_TOKEN}" ]; then
            print_success "Successfully extracted access token"
            echo ""
            echo "Token (first 50 chars): ${ACCESS_TOKEN:0:50}..."
        else
            print_warning "Could not extract access token from response"
        fi
    else
        print_warning "No access_token found in response"
    fi
    
    echo ""
    echo "Login Response:"
    pretty_json "${LOGIN_RESPONSE}"
    
elif [ "${HTTP_STATUS}" = "401" ]; then
    print_error "Login failed: Invalid credentials (401 Unauthorized)"
    print_info "Check if the username/password are correct"
    echo ""
    echo "Response:"
    pretty_json "${LOGIN_RESPONSE}"
    exit 1
    
elif [ "${HTTP_STATUS}" = "500" ]; then
    print_error "Login failed: Internal Server Error (500)"
    print_error "Backend is crashing during authentication!"
    print_info "Check backend logs on Render for stack traces"
    echo ""
    echo "Response:"
    pretty_json "${LOGIN_RESPONSE}"
    exit 1
    
elif [ "${HTTP_STATUS}" = "000" ]; then
    print_error "Failed to connect to login endpoint - network error"
    exit 1
    
else
    print_warning "Login endpoint returned unexpected status: ${HTTP_STATUS}"
    echo ""
    echo "Response:"
    pretty_json "${LOGIN_RESPONSE}"
    exit 1
fi

#
# STEP 3: Test Dashboard Endpoint (if login succeeded)
#
if [ -n "${ACCESS_TOKEN}" ]; then
    print_section "STEP 3: Testing Dashboard Endpoint"
    
    print_info "Testing: GET ${BASE_URL}/api/v1/dashboard"
    print_info "Using JWT token from login response"
    echo ""
    
    HTTP_STATUS=$(curl -s -o "${DASHBOARD_RESPONSE}" -w "%{http_code}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        "${BASE_URL}/api/v1/dashboard" 2>/dev/null || echo "000")
    
    echo "HTTP Status: ${HTTP_STATUS}"
    echo ""
    
    if [ "${HTTP_STATUS}" = "200" ]; then
        print_success "Dashboard endpoint returned 200 OK"
        print_success "Dashboard data retrieved successfully"
        echo ""
        echo "Dashboard Response:"
        pretty_json "${DASHBOARD_RESPONSE}"
        
    elif [ "${HTTP_STATUS}" = "401" ]; then
        print_error "Dashboard access denied: Unauthorized (401)"
        print_warning "Token may be invalid or expired"
        echo ""
        echo "Response:"
        pretty_json "${DASHBOARD_RESPONSE}"
        
    elif [ "${HTTP_STATUS}" = "403" ]; then
        print_error "Dashboard access denied: Forbidden (403)"
        print_warning "User may not have permission to access dashboard"
        echo ""
        echo "Response:"
        pretty_json "${DASHBOARD_RESPONSE}"
        
    elif [ "${HTTP_STATUS}" = "404" ]; then
        print_error "Dashboard endpoint not found (404)"
        print_info "The /api/v1/dashboard endpoint may not exist"
        print_info "Try /api/v1/analytics/dashboard/summary instead"
        echo ""
        
        # Try alternative dashboard endpoint
        print_info "Testing alternative: GET ${BASE_URL}/api/v1/analytics/dashboard/summary"
        echo ""
        
        HTTP_STATUS=$(curl -s -o "${DASHBOARD_RESPONSE}" -w "%{http_code}" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            "${BASE_URL}/api/v1/analytics/dashboard/summary" 2>/dev/null || echo "000")
        
        echo "HTTP Status: ${HTTP_STATUS}"
        echo ""
        
        if [ "${HTTP_STATUS}" = "200" ]; then
            print_success "Alternative dashboard endpoint works!"
            echo ""
            echo "Dashboard Response:"
            pretty_json "${DASHBOARD_RESPONSE}"
        else
            print_error "Alternative dashboard endpoint also failed"
            echo ""
            echo "Response:"
            pretty_json "${DASHBOARD_RESPONSE}"
        fi
        
    elif [ "${HTTP_STATUS}" = "500" ]; then
        print_error "Dashboard failed: Internal Server Error (500)"
        print_error "Backend is crashing when accessing dashboard!"
        print_info "Check backend logs on Render for stack traces"
        echo ""
        echo "Response:"
        pretty_json "${DASHBOARD_RESPONSE}"
        
    elif [ "${HTTP_STATUS}" = "000" ]; then
        print_error "Failed to connect to dashboard endpoint - network error"
        
    else
        print_warning "Dashboard endpoint returned unexpected status: ${HTTP_STATUS}"
        echo ""
        echo "Response:"
        pretty_json "${DASHBOARD_RESPONSE}"
    fi
else
    print_section "STEP 3: Skipped Dashboard Test"
    print_warning "Skipping dashboard test - no access token available"
fi

#
# Summary and Recommendations
#
print_section "Summary and Recommendations"

echo "Test Results:"
echo ""

# Health check summary
if [ "${HTTP_STATUS}" = "200" ]; then
    print_success "Backend is running (health check passed)"
else
    print_error "Backend health check failed or returned unexpected status"
fi

# Login summary
if grep -q "access_token" "${LOGIN_RESPONSE}" 2>/dev/null; then
    print_success "Login authentication working (JWT token received)"
else
    print_error "Login authentication failed (no JWT token)"
fi

# Dashboard summary
if [ -n "${ACCESS_TOKEN}" ]; then
    if [ "${HTTP_STATUS}" = "200" ]; then
        print_success "Dashboard endpoint working correctly"
    else
        print_error "Dashboard endpoint failed or returned error"
    fi
fi

echo ""
echo "Next Steps:"
echo ""

# Provide recommendations based on results
if grep -q "access_token" "${LOGIN_RESPONSE}" 2>/dev/null && [ "${HTTP_STATUS}" != "200" ]; then
    echo "1. Login is working but dashboard access failed"
    echo "   → Check dashboard endpoint exists and user has correct permissions"
    echo "   → Review backend logs for dashboard-related errors"
    echo ""
elif ! grep -q "access_token" "${LOGIN_RESPONSE}" 2>/dev/null; then
    echo "1. Login authentication is failing"
    echo "   → Verify credentials are correct"
    echo "   → Check backend logs for authentication errors"
    echo "   → Review AUTHENTICATION_500_ERROR_FIX.md for known issues"
    echo ""
fi

echo "2. Check Render backend logs for detailed error messages:"
echo "   → Go to Render dashboard"
echo "   → Select the thermacoreapp service"
echo "   → View the 'Logs' tab"
echo "   → Look for Python stack traces or error messages"
echo ""

echo "3. If you see a blank page in the frontend after login:"
echo "   → This suggests the frontend received a token but failed to redirect"
echo "   → Check browser console for JavaScript errors"
echo "   → Verify routing in src/App.jsx or src/router"
echo "   → Check AuthContext.jsx for post-login navigation logic"
echo ""

print_section "Diagnostic Complete"
echo ""
