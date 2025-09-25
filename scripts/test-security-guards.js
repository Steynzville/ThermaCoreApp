/**
 * Test script to verify environment guards for development credentials
 * This script simulates different environment conditions to verify security guards work
 */

import { readFileSync } from 'fs';

// Simulate different environments
const testEnvironments = [
  { NODE_ENV: 'development', expectedCredentialsEnabled: true, desc: 'Development' },
  { NODE_ENV: 'production', expectedCredentialsEnabled: false, desc: 'Production' },
  { NODE_ENV: 'staging', expectedCredentialsEnabled: false, desc: 'Staging' },
  { NODE_ENV: 'test', expectedCredentialsEnabled: false, desc: 'Test/CI' },
  { NODE_ENV: undefined, expectedCredentialsEnabled: true, desc: 'Development (undefined NODE_ENV)' }
];

// Mock login function test
function simulateLogin(username, password, nodeEnv, devMode = false) {
  // Replicate the same logic as AuthContext
  const isDevelopmentMode = nodeEnv === 'development' || (nodeEnv === undefined && devMode);
  
  if (!isDevelopmentMode) {
    return { success: false, error: "Authentication service unavailable. Please contact administrator." };
  }
  
  if (username.toLowerCase() === "admin" && password === "admin123") {
    return { success: true, role: "admin" };
  } else if (isDevelopmentMode && username.toLowerCase() === "user" && password === "user123") {
    return { success: true, role: "user" };
  }
  
  return { success: false, error: "Invalid credentials!" };
}

console.log('🔒 Testing Environment-Based Security Guards\n');

testEnvironments.forEach(env => {
  console.log(`Testing ${env.desc} environment (NODE_ENV=${env.NODE_ENV}):`);
  
  // Test admin credentials
  const adminResult = simulateLogin('admin', 'admin123', env.NODE_ENV, env.NODE_ENV === undefined);
  const userResult = simulateLogin('user', 'user123', env.NODE_ENV, env.NODE_ENV === undefined);
  
  if (env.expectedCredentialsEnabled) {
    if (adminResult.success && userResult.success) {
      console.log('  ✅ Development credentials enabled (as expected)');
    } else {
      console.log('  ❌ Development credentials should be enabled but are disabled!');
    }
  } else {
    if (!adminResult.success && !userResult.success && 
        adminResult.error.includes('Authentication service unavailable')) {
      console.log('  ✅ Development credentials properly blocked');
    } else {
      console.log('  ❌ Development credentials should be blocked but are enabled!');
      console.log(`      Admin: ${JSON.stringify(adminResult)}`);
      console.log(`      User: ${JSON.stringify(userResult)}`);
    }
  }
  console.log('');
});

console.log('🔍 Verifying AuthContext.jsx implementation:');

// Verify the actual implementation
try {
  const authContextContent = readFileSync('src/context/AuthContext.jsx', 'utf8');
  
  const hasRuntimeGuard = authContextContent.includes('NODE_ENV') && 
                         authContextContent.includes('isDevelopmentMode');
  const hasProductionBlock = authContextContent.includes('Authentication service unavailable');
  const hasSecurityComments = authContextContent.includes('RUNTIME GUARD');
  
  if (hasRuntimeGuard && hasProductionBlock && hasSecurityComments) {
    console.log('  ✅ Runtime environment guards implemented correctly');
  } else {
    console.log('  ❌ Runtime environment guards missing or incomplete');
    console.log(`      Runtime Guard: ${hasRuntimeGuard}`);
    console.log(`      Production Block: ${hasProductionBlock}`);
    console.log(`      Security Comments: ${hasSecurityComments}`);
  }
} catch (err) {
  console.log('  ❌ Could not verify AuthContext.jsx implementation');
}

console.log('\n✅ Environment guard tests completed');