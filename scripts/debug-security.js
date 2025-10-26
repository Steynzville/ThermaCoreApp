#!/usr/bin/env node
/**
 * Debug version of security check to understand what's being flagged
 */

import { existsSync, readFileSync } from "node:fs";

const SECURITY_PATTERNS = [
  /admin123/g, // Old development password - ALWAYS flagged
  /user123/g, // Old development password - ALWAYS flagged
  /username\s*\.toLowerCase\(\)\s*===\s*"admin"/g, // Specific username login check pattern
  /password\s*===\s*"admin123"/g, // Admin password check pattern - hardcoded credential check
  /password\s*===\s*"user123"/g, // User password check pattern - hardcoded credential check
];

async function debugSecurityViolations() {
  try {
    // Find JavaScript files in build output and source
    const { execSync } = await import("node:child_process");
    const findResult = execSync(
      'find dist src -name "*.js" -o -name "*.jsx" 2>/dev/null || true',
      { encoding: "utf8" },
    );
    const filesToCheck = findResult
      .trim()
      .split("\n")
      .filter((f) => f);

    const violations = [];

    for (const file of filesToCheck) {
      if (!file || !existsSync(file)) continue;

      try {
        const content = readFileSync(file, "utf8");

        // Check each pattern individually for better debugging
        for (const pattern of SECURITY_PATTERNS) {
          const matches = content.match(pattern);
          if (matches) {
            // Show context around each match
            matches.forEach((match, _index) => {
              const matchIndex = content.indexOf(match);
              const _context = content
                .substring(
                  Math.max(0, matchIndex - 50),
                  matchIndex + match.length + 50,
                )
                .replace(/\n/g, "\\n");
            });

            violations.push({
              file,
              pattern: pattern.source,
              matches: matches.length,
              type: "critical",
            });
          }
        }
      } catch (_err) {}
    }

    if (violations.length > 0) {
      violations.forEach((_violation, _i) => {});
    } else {
    }
  } catch (_error) {}
}

debugSecurityViolations();
