#!/usr/bin/env node
/**
 * Debug version of security check to understand what's being flagged
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

async function debugSecurityViolations() {
  console.log('🔍 Debug: Running security check for production build...');
  
  try {
    // Find JavaScript files in build output and source
    const { execSync } = await import('child_process');
    const findResult = execSync('find dist src -name "*.js" -o -name "*.jsx" 2>/dev/null || true', { encoding: 'utf8' });
    const filesToCheck = findResult.trim().split('\n').filter(f => f);
    
    let violations = [];
    
    console.log(`Checking ${filesToCheck.length} files...`);
    
    for (const file of filesToCheck) {
      if (!file || !existsSync(file)) continue;
      
      try {
        const content = readFileSync(file, 'utf8');
        
        // Check each pattern individually for better debugging
        for (const pattern of SECURITY_PATTERNS) {
          const matches = content.match(pattern);
          if (matches) {
            console.log(`\n🔍 MATCH FOUND in ${file}:`);
            console.log(`   Pattern: ${pattern.source}`);
            console.log(`   Matches: ${matches.length}`);
            console.log(`   First match: "${matches[0]}"`);
            
            // Show context around each match
            matches.forEach((match, index) => {
              const matchIndex = content.indexOf(match);
              const context = content.substring(
                Math.max(0, matchIndex - 50),
                matchIndex + match.length + 50
              ).replace(/\n/g, '\\n');
              console.log(`   Context ${index + 1}: ...${context}...`);
            });
            
            violations.push({
              file,
              pattern: pattern.source,
              matches: matches.length,
              type: 'critical'
            });
          }
        }
      } catch (err) {
        console.warn(`⚠️  Could not read file ${file}: ${err.message}`);
      }
    }
    
    console.log(`\n📊 Summary: Found ${violations.length} violations total`);
    
    if (violations.length > 0) {
      console.error('\n🚨 SECURITY VIOLATIONS FOUND:');
      violations.forEach((violation, i) => {
        console.error(`${i + 1}. File: ${violation.file}`);
        console.error(`   Pattern: ${violation.pattern}`);
        console.error(`   Matches: ${violation.matches}`);
      });
      console.error('\n❌ BUILD WOULD FAIL: Remove hardcoded credentials before production deployment');
    } else {
      console.log('\n✅ Security check passed: No hardcoded credentials found');
    }
    
  } catch (error) {
    console.error('❌ Security debug check failed:', error.message);
  }
}

debugSecurityViolations();