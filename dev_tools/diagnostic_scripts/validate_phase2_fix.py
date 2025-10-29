#!/usr/bin/env python3
"""
Validation script for Phase 2 Infrastructure Fix.

This script verifies that all the issues mentioned in the problem statement are resolved:
1. Database migrations create tables correctly
2. Authentication flow returns proper JWT tokens
3. Database test fixtures work as designed
"""

import json
import os
import sys


def test_database_creation():
    """Test that database tables are created correctly."""
    print("\n" + "=" * 70)
    print("TEST 1: Database Migrations")
    print("=" * 70)

    from sqlalchemy import inspect

    from app import create_app, db

    # Test with development config
    os.environ["FLASK_ENV"] = "development"
    os.environ["FLASK_DEBUG"] = "true"

    app = create_app()

    with app.app_context():
        print(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print("\nCreating tables with db.create_all()...")
        db.create_all()

        # Verify tables
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()

        expected_tables = [
            "users",
            "roles",
            "permissions",
            "role_permissions",
            "units",
            "sensors",
            "sensor_readings",
        ]

        print(f"\nExpected tables: {expected_tables}")
        print(f"Created tables:  {sorted(tables)}")

        missing = set(expected_tables) - set(tables)
        if missing:
            print(f"\n❌ FAILED: Missing tables: {missing}")
            return False

        print(f"\n✅ PASSED: All {len(tables)} tables created successfully")

        # Show table details
        print("\nTable Details:")
        for table in sorted(tables):
            columns = inspector.get_columns(table)
            print(f"  • {table}: {len(columns)} columns")

        return True


def test_authentication_flow():
    """Test that authentication returns proper JWT tokens."""
    print("\n" + "=" * 70)
    print("TEST 2: Authentication Flow")
    print("=" * 70)

    os.environ["TESTING"] = "true"

    from app import create_app, db
    from app.models import Permission, PermissionEnum, Role, RoleEnum, User

    app = create_app("testing")

    with app.app_context():
        # Create test database
        db.create_all()

        # Create minimal data for auth test
        admin_perm = Permission(name=PermissionEnum.ADMIN_PANEL, description="Admin")
        db.session.add(admin_perm)
        db.session.commit()

        admin_role = Role(name=RoleEnum.ADMIN, description="Admin")
        admin_role.permissions = [admin_perm]
        db.session.add(admin_role)
        db.session.commit()

        test_user = User(
            username="testuser",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            role_id=admin_role.id,
            is_active=True,
        )
        test_user.set_password("testpass123")
        db.session.add(test_user)
        db.session.commit()

        print("Test user created: testuser / testpass123")

        # Test login endpoint
        with app.test_client() as client:
            print("\nSending login request to /api/v1/auth/login...")
            response = client.post(
                "/api/v1/auth/login",
                json={"username": "testuser", "password": "testpass123"},
                headers={"Content-Type": "application/json"},
            )

            print(f"Response status: {response.status_code}")

            if response.status_code != 200:
                print(f"❌ FAILED: Expected 200, got {response.status_code}")
                print(f"Response: {response.data.decode()}")
                return False

            data = json.loads(response.data)

            # Check response structure
            print("\nResponse structure:")
            print(f"  • success: {data.get('success')}")
            print(f"  • message: {data.get('message')}")
            print(f"  • data present: {'data' in data}")

            if "data" not in data:
                print("❌ FAILED: Response missing 'data' field")
                return False

            inner_data = data["data"]

            # Check for required fields
            required_fields = ["access_token", "refresh_token", "expires_in", "user"]
            missing_fields = [
                field for field in required_fields if field not in inner_data
            ]

            if missing_fields:
                print(f"❌ FAILED: Missing fields in response data: {missing_fields}")
                print(f"Available fields: {list(inner_data.keys())}")
                return False

            print("\n  • data.access_token: ✓ Present")
            print("  • data.refresh_token: ✓ Present")
            print(f"  • data.expires_in: {inner_data['expires_in']} seconds")
            print(f"  • data.user.username: {inner_data['user']['username']}")
            print(f"  • data.user.email: {inner_data['user']['email']}")

            print("\n✅ PASSED: Authentication flow returns proper JWT tokens")
            return True


def test_database_fixtures():
    """Test that conftest.py creates all required tables."""
    print("\n" + "=" * 70)
    print("TEST 3: Database Test Fixtures")
    print("=" * 70)

    os.environ["TESTING"] = "true"

    # Import test fixtures
    from sqlalchemy import inspect

    from app import create_app, db
    from app.tests.conftest import _init_database

    app = create_app("testing")

    with app.app_context():
        print("Running _init_database() from conftest.py...")
        print("(This should show detailed debug output)\n")

        try:
            _init_database()

            # Verify all tables exist
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()

            expected_tables = [
                "users",
                "roles",
                "permissions",
                "role_permissions",
                "units",
                "sensors",
                "sensor_readings",
            ]

            missing = set(expected_tables) - set(tables)
            if missing:
                print(f"\n❌ FAILED: Missing tables after _init_database(): {missing}")
                return False

            print(
                f"\n✅ PASSED: Conftest.py _init_database() creates all {len(tables)} required tables"
            )
            return True

        except Exception as e:
            print(f"\n❌ FAILED: _init_database() raised exception: {e}")
            import traceback

            traceback.print_exc()
            return False


def main():
    """Run all validation tests."""
    print("\n" + "#" * 70)
    print("# Phase 2 Infrastructure Fix - Validation Script")
    print("#" * 70)

    results = []

    # Test 1: Database Migrations
    results.append(("Database Migrations", test_database_creation()))

    # Test 2: Authentication Flow
    results.append(("Authentication Flow", test_authentication_flow()))

    # Test 3: Database Test Fixtures
    results.append(("Database Test Fixtures", test_database_fixtures()))

    # Summary
    print("\n" + "=" * 70)
    print("VALIDATION SUMMARY")
    print("=" * 70)

    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")

    all_passed = all(passed for _, passed in results)

    if all_passed:
        print("\n" + "=" * 70)
        print("🎉 ALL TESTS PASSED - Phase 2 Infrastructure is Working!")
        print("=" * 70)
        return 0
    else:
        print("\n" + "=" * 70)
        print("⚠️  SOME TESTS FAILED - Please review the output above")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
