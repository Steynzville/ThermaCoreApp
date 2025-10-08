#!/usr/bin/env python3
"""
Simple validation script to verify the conftest.py changes.

This script checks that:
1. The conftest.py file has the correct imports
2. The _init_database function has debugging output
3. The error handling is in place
"""

import os
import sys

def check_conftest_changes():
    """Check that the conftest.py file has the expected debugging improvements."""

    print("=" * 70)
    print("Validating conftest.py Database Initialization Improvements")
    print("=" * 70)

    conftest_path = os.path.join(
        os.path.dirname(__file__), 
        'app', 'tests', 'conftest.py'
    )

    if not os.path.exists(conftest_path):
        print(f"✗ ERROR: conftest.py not found at {conftest_path}")
        return False

    print(f"✓ Found conftest.py at {conftest_path}")

    with open(conftest_path, 'r') as f:
        content = f.read()

    # Check for required imports
    checks = {
        "import sys": "sys module import",
        "from sqlalchemy import text, inspect": "SQLAlchemy inspect import",
        "print(f\"\\n{'='*70}\")": "Debug output header",
        "print(\"Database Initialization - Debug Output\")": "Debug output title",
        "print(f\"Database Type:": "Database type logging",
        "print(f\"Database URI:": "Database URI logging",
        "try:": "Error handling try block",
        "except Exception as e:": "Error handling except block",
        "inspector = inspect(db.engine)": "Database inspection",
        "tables = inspector.get_table_names()": "Table listing",
        "expected_tables = [": "Expected tables verification",
        "missing_tables = [": "Missing tables check",
        "if missing_tables:": "Missing tables alert",
        "raise RuntimeError": "Error raising for missing tables",
        "print(f\"Error type: {type(e).__name__}\")": "Error type logging",
        "print(f\"Error message: {str(e)}\")": "Error message logging",
        "existing_tables = inspector.get_table_names()": "Error state inspection",
        "# Re-raise the exception": "Re-raise comment",
    }

    passed = 0
    failed = 0

    print("\nChecking for debugging and error handling features:")
    for check, description in checks.items():
        if check in content:
            print(f"  ✓ {description}")
            passed += 1
        else:
            print(f"  ✗ Missing: {description}")
            print(f"    Expected to find: {check[:50]}...")
            failed += 1

    # Check for detailed table information logging
    if "for col in columns:" in content and "print(f\"    - {col['name']}\")" in content:
        print("  ✓ Column details logging")
        passed += 1
    else:
        print("  ✗ Missing: Column details logging")
        failed += 1

    # Check for PostgreSQL schema path validation
    if 'if not os.path.exists(schema_path):' in content:
        print("  ✓ Schema path validation")
        passed += 1
    else:
        print("  ✗ Missing: Schema path validation")
        failed += 1

    # Check for SQLAlchemy models listing
    if 'print(f"SQLAlchemy models to create:"' in content:
        print("  ✓ SQLAlchemy models listing")
        passed += 1
    else:
        print("  ✗ Missing: SQLAlchemy models listing")
        failed += 1

    print("\n" + "=" * 70)
    print(f"Validation Results: {passed} passed, {failed} failed")
    print("=" * 70)

    if failed == 0:
        print("\n✓ All debugging and error handling features are present!")
        print("\nThe _init_database() function now includes:")
        print("  • Comprehensive debug output for database initialization")
        print("  • Database type and URI logging")
        print("  • Table creation verification with column details")
        print("  • Expected tables validation")
        print("  • Detailed error messages with database state inspection")
        print("  • PostgreSQL schema file validation")
        print("  • SQLAlchemy models listing for SQLite")
        return True
    else:
        print(f"\n✗ {failed} required features are missing!")
        return False

def main():
    """Main validation function."""
    try:
        success = check_conftest_changes()

        if success:
            print("\n" + "=" * 70)
            print("VALIDATION SUCCESSFUL")
            print("=" * 70)
            print("\nThe conftest.py improvements are ready to use.")
            print("\nTo see the debugging output in action, run:")
            print("  cd backend && pytest app/tests/test_workflow.py -v -s")
            print("\nOr any other test that uses the database fixtures.")
            return 0
        else:
            print("\n" + "=" * 70)
            print("VALIDATION FAILED")
            print("=" * 70)
            return 1

    except Exception as e:
        print(f"\n✗ Validation error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
