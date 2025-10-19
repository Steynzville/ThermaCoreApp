#!/usr/bin/env node
/**
 * Security check script to verify development credentials are stripped from production builds
 * This script should be run as part of CI/CD pipeline to prevent hardcoded credentials in production
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';

const SECURITY_PATTERNS = [
  /admin123/g,          // Old development password - ALWAYS flagged
  /user123/g,           // Old development password - ALWAYS flagged  
  /username\s*\.toLowerCase\(\)\s*===\s*"admin"/g, // Specific username login check pattern
  /password\s*===\s*"admin123"/g, // Admin password check pattern - hardcoded credential check
  /password\s*===\s*"user123"/g,  // User password check pattern - hardcoded credential check
];

const ROLE_PATTERNS = [
  /"admin"/g,           // Development username pattern - only flag in auth contexts
];

const ROLE_CONTEXT_FILES = [
  'AuthContext.jsx',    // Authentication context files
  'authService.js',     // Authentication service files
  'auth.js',            // General auth files
  'login.js',           // Login files
];

const ALLOWED_FILES = [
  'scripts/check-security.js', // This file itself
  'README.md',                 // Documentation files
  'BATCH_1_2_IMPLEMENTATION.md', // Implementation docs
];

async function checkSecurityViolations() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isBuild = process.argv.includes('--build');
  
  if (!isProduction && !isBuild) {
    console.log('ℹ️  Security check skipped: not production build');
    return;
  }

  console.log('🔍 Running security check for production build...');
  
  // Simple glob implementation for this specific use case
  const { execSync } = await import('child_process');
  
  try {
    // Find JavaScript files in build output
    const findResult = execSync('find dist src -name "*.js" -o -name "*.jsx" -o -name "*.html" 2>/dev/null || true', { encoding: 'utf8' });
    const filesToCheck = findResult.trim().split('\n').filter(f => f);
    
    let violations = [];
    
    for (const file of filesToCheck) {
      if (!file || !existsSync(file)) continue;
      
      // Skip allowed files
      if (ALLOWED_FILES.some(allowed => file.includes(allowed))) {
        continue;
      }
      
      try {
        const content = readFileSync(file, 'utf8');
        
        // Check critical security patterns (always flagged)
        for (const pattern of SECURITY_PATTERNS) {
          const matches = content.match(pattern);
          if (matches) {
            violations.push({
              file,
              pattern: pattern.source,
              matches: matches.length,
              type: 'critical',
              preview: content.substring(
                Math.max(0, content.indexOf(matches[0]) - 30),
                content.indexOf(matches[0]) + matches[0].length + 30
              )
            });
          }
        }
        
        // Check role patterns only in authentication-related files
        const isAuthFile = ROLE_CONTEXT_FILES.some(authFile => file.includes(authFile));
        if (isAuthFile) {
          for (const pattern of ROLE_PATTERNS) {
            const matches = content.match(pattern);
            if (matches) {
              // Only flag if it appears to be hardcoded credential usage (not just role checks)
              const contextLines = content.split('\n');
              const matchingLines = contextLines.filter(line => pattern.test(line));
              
              // Look for credential-like patterns 
              const credentialPatterns = [
                /username.*===.*"admin"/,
                /password.*===.*"admin"/,
                /login.*admin/,
                /auth.*admin/
              ];
              
              const credentialMatches = matchingLines.filter(line => 
                credentialPatterns.some(credPattern => credPattern.test(line))
              );
              
              if (credentialMatches.length > 0) {
                violations.push({
                  file,
                  pattern: pattern.source,
                  matches: credentialMatches.length,
                  type: 'auth-context',
                  preview: credentialMatches.slice(0, 2).join('\n')
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn(`⚠️  Could not read file ${file}: ${err.message}`);
      }
    }
    
    if (violations.length > 0) {
      console.error('🚨 SECURITY VIOLATIONS FOUND:');
      console.error('Hardcoded development credentials detected in production build!\n');
      
      violations.forEach((violation, i) => {
        console.error(`${i + 1}. File: ${violation.file}`);
        console.error(`   Type: ${violation.type || 'security'}`);
        console.error(`   Pattern: ${violation.pattern}`);
        console.error(`   Matches: ${violation.matches}`);
        console.error(`   Context: ...${violation.preview}...`);
        console.error('');
      });
      
      console.error('❌ BUILD FAILED: Remove hardcoded credentials before production deployment');
      process.exit(1);
    }
    
    console.log('✅ Security check passed: No hardcoded credentials found in production build');
    
  } catch (error) {
    console.error('❌ Security check failed:', error.message);
    process.exit(1);
  }
}

checkSecurityViolations().catch(err => {
  console.error('❌ Security check failed:', err.message);
  process.exit(1);
});