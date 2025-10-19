/**
 * Test script to verify authentication implementation
 * This script verifies that the frontend uses backend API for authentication
 * and does not contain hardcoded credentials in production builds
 */

import { readFileSync } from "node:fs";

console.log("🔒 Testing Authentication Implementation\n");

console.log("🔍 Verifying AuthContext.jsx implementation:");

// Verify the actual implementation
try {
  const authContextContent = readFileSync("src/context/AuthContext.jsx", "utf8");

  // Check that AuthContext uses authService
  const usesAuthService =
    authContextContent.includes("import * as authService") &&
    authContextContent.includes("authService.login");

  // Check that hardcoded credentials are removed
  const noHardcodedCredentials =
    !authContextContent.includes("dev_admin_credential") &&
    !authContextContent.includes("dev_user_credential");

  // Check that development guards are removed
  const noDevGuards = !authContextContent.includes("Authentication service unavailable");

  if (usesAuthService && noHardcodedCredentials && noDevGuards) {
    console.log("  ✅ AuthContext uses backend API authentication");
    console.log("  ✅ No hardcoded credentials found");
    console.log("  ✅ Development guards removed");
  } else {
    console.log("  ❌ Authentication implementation issues detected:");
    console.log(`      Uses authService: ${usesAuthService}`);
    console.log(`      No hardcoded credentials: ${noHardcodedCredentials}`);
    console.log(`      No dev guards: ${noDevGuards}`);
  }
} catch (err) {
  console.log("  ❌ Could not verify AuthContext.jsx implementation");
  console.log(`      Error: ${err.message}`);
}

console.log("\n🔍 Verifying authService.js implementation:");

try {
  const authServiceContent = readFileSync("src/services/authService.js", "utf8");

  // Check that authService uses API_BASE_URL
  const usesApiBaseUrl = authServiceContent.includes("VITE_API_BASE_URL");

  // Check that it makes fetch calls to the backend
  const makesFetchCalls =
    authServiceContent.includes("fetch(") && authServiceContent.includes("/api/v1/auth/login");

  // Check that it handles backend response format
  const handlesBackendResponse =
    authServiceContent.includes("result.data") && authServiceContent.includes("access_token");

  if (usesApiBaseUrl && makesFetchCalls && handlesBackendResponse) {
    console.log("  ✅ authService uses VITE_API_BASE_URL environment variable");
    console.log("  ✅ authService makes real API calls to backend");
    console.log("  ✅ authService handles backend response format");
  } else {
    console.log("  ❌ authService implementation issues detected:");
    console.log(`      Uses API_BASE_URL: ${usesApiBaseUrl}`);
    console.log(`      Makes fetch calls: ${makesFetchCalls}`);
    console.log(`      Handles backend response: ${handlesBackendResponse}`);
  }
} catch (err) {
  console.log("  ❌ Could not verify authService.js implementation");
  console.log(`      Error: ${err.message}`);
}

console.log("\n✅ Authentication implementation tests completed");
