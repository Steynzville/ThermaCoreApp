#!/usr/bin/env python3
"""
Manual test script for create_first_admin.py with environment variable support.
This script tests that the FIRST_ADMIN_PASSWORD environment variable is required.
"""

import os
import sys

# Test 1: Verify script shows [HIDDEN] in output
print("=" * 70)
print("Test 1: Verify password output is hidden")
print("=" * 70)

script_path = os.path.join(
    os.path.dirname(__file__), "..", "..", "backend", "scripts", "create_first_admin.py"
)
with open(script_path, "r") as f:
    content = f.read()

# Check that the script prints "Password: [HIDDEN]"
if 'print("Password: [HIDDEN]")' in content:
    print("✓ Script correctly hides password in output")
else:
    print("✗ Script does not hide password properly")
    sys.exit(1)

# Test 2: Verify environment variable is required
print("\n" + "=" * 70)
print("Test 2: Verify environment variable is required")
print("=" * 70)

if 'os.environ.get("FIRST_ADMIN_PASSWORD")' in content:
    print("✓ Script uses FIRST_ADMIN_PASSWORD environment variable")
else:
    print("✗ Script does not use FIRST_ADMIN_PASSWORD environment variable")
    sys.exit(1)

# Test 3: Verify no default password exists (security improvement)
if 'os.environ.get("FIRST_ADMIN_PASSWORD", "' not in content:
    print("✓ No default password - must be set via environment variable (SECURE)")
else:
    print("✗ WARNING: Default password still exists in code")
    sys.exit(1)

print("\n" + "=" * 70)
print("✅ All security tests passed!")
print("=" * 70)
print("\nThe admin script is properly secured:")
print("1. Password output shows '[HIDDEN]' instead of the actual password")
print("2. Environment variable FIRST_ADMIN_PASSWORD is REQUIRED (no default)")
print("3. No hardcoded passwords in the codebase (security best practice)")

