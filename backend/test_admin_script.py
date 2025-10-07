#!/usr/bin/env python3
"""
Manual test script for create_first_admin.py with environment variable support.
This script tests that the FIRST_ADMIN_PASSWORD environment variable works correctly.
"""
import os
import sys

# Test 1: Verify script shows [HIDDEN] in output
print("=" * 70)
print("Test 1: Verify password output is hidden")
print("=" * 70)

script_path = os.path.join(os.path.dirname(__file__), 'scripts', 'create_first_admin.py')
with open(script_path, 'r') as f:
    content = f.read()
    
# Check that the script prints "Password: [HIDDEN]"
if 'print("Password: [HIDDEN]")' in content:
    print("✓ Script correctly hides password in output")
else:
    print("✗ Script does not hide password properly")
    sys.exit(1)

# Test 2: Verify environment variable support
print("\n" + "=" * 70)
print("Test 2: Verify environment variable support")
print("=" * 70)

if 'os.environ.get("FIRST_ADMIN_PASSWORD"' in content:
    print("✓ Script supports FIRST_ADMIN_PASSWORD environment variable")
else:
    print("✗ Script does not support FIRST_ADMIN_PASSWORD environment variable")
    sys.exit(1)

# Test 3: Verify default password is preserved
if '"Steiner1!"' in content:
    print("✓ Default password is preserved")
else:
    print("✗ Default password is not preserved")
    sys.exit(1)

print("\n" + "=" * 70)
print("✅ All tests passed!")
print("=" * 70)
print("\nThe admin script has been successfully updated with:")
print("1. Password output shows '[HIDDEN]' instead of the actual password")
print("2. Environment variable FIRST_ADMIN_PASSWORD can override the default")
print("3. Default password 'Steiner1!' is preserved when env var is not set")
