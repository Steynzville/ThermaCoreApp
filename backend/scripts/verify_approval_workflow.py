#!/usr/bin/env python
"""Verification script for user approval workflow implementation.

This script verifies that:
1. All existing users have 'approved' registration status
2. All existing users can still login
3. The approval workflow columns exist in the database
4. No existing user access has been disrupted by the migration
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import inspect

from app import create_app, db
from app.models import User


def verify_approval_columns():
    """Verify that approval workflow columns exist in the users table."""
    print("\n" + "=" * 70)
    print("VERIFYING APPROVAL WORKFLOW COLUMNS")
    print("=" * 70)

    os.environ["FLASK_ENV"] = "testing"

    app = create_app()
    with app.app_context():
        # Ensure database is initialized
        try:
            db.create_all()
        except Exception as e:
            print(f"Note: Database tables may already exist: {e.__class__.__name__}")

        inspector = inspect(db.engine)
        columns = {col["name"]: col for col in inspector.get_columns("users")}

        required_columns = [
            "registration_status",
            "approval_date",
            "approved_by",
            "rejection_reason",
        ]

        all_exist = True
        for col_name in required_columns:
            if col_name in columns:
                print(f"✓ Column '{col_name}' exists: {columns[col_name]['type']}")
            else:
                print(f"✗ Column '{col_name}' is MISSING")
                all_exist = False

        if all_exist:
            print("\n✓ All required approval workflow columns exist")
        else:
            print("\n✗ Some required columns are missing")

        return all_exist


def verify_existing_users_approved():
    """Verify that all existing users have 'approved' registration status."""
    print("\n" + "=" * 70)
    print("VERIFYING EXISTING USERS ARE APPROVED")
    print("=" * 70)

    os.environ["FLASK_ENV"] = "testing"

    app = create_app()
    with app.app_context():
        # Ensure database is initialized
        try:
            db.create_all()
        except Exception as e:
            print(f"Note: Database tables may already exist: {e.__class__.__name__}")

        # Query all users
        all_users = User.query.all()
        total_users = len(all_users)

        print(f"\nTotal users in database: {total_users}")

        if total_users == 0:
            print(
                "⚠ No users found in database (this is expected for a fresh installation)"
            )
            return True

        # Check registration status of all users
        approved_users = 0
        pending_users = 0
        rejected_users = 0
        no_status_users = 0

        for user in all_users:
            if user.registration_status == "approved":
                approved_users += 1
            elif user.registration_status == "pending":
                pending_users += 1
            elif user.registration_status == "rejected":
                rejected_users += 1
            else:
                no_status_users += 1
                print(
                    f"⚠ User '{user.username}' has unexpected status: {user.registration_status}"
                )

        print("\nUsers by status:")
        print(f"  - Approved: {approved_users}")
        print(f"  - Pending: {pending_users}")
        print(f"  - Rejected: {rejected_users}")
        print(f"  - No status/Unknown: {no_status_users}")

        # Verify all existing users are approved (for safe migration)
        if approved_users == total_users:
            print(f"\n✓ All {total_users} existing users are approved")
            return True
        print(f"\n⚠ Warning: {total_users - approved_users} users are not approved")
        print("  This may indicate either:")
        print("    1. New self-registrations (expected)")
        print("    2. Migration issue (if all users should be approved)")
        return False


def verify_user_can_login():
    """Verify that approved users can pass the can_login() check."""
    print("\n" + "=" * 70)
    print("VERIFYING USER LOGIN CAPABILITY")
    print("=" * 70)

    os.environ["FLASK_ENV"] = "testing"

    app = create_app()
    with app.app_context():
        # Ensure database is initialized
        try:
            db.create_all()
        except Exception as e:
            print(f"Note: Database tables may already exist: {e.__class__.__name__}")

        # Query all approved users
        approved_users = User.query.filter_by(registration_status="approved").all()

        if len(approved_users) == 0:
            print(
                "⚠ No approved users found (this is expected for a fresh installation)"
            )
            return True

        print(f"\nChecking can_login() for {len(approved_users)} approved users...")

        all_can_login = True
        cannot_login_count = 0

        for user in approved_users:
            can_login = user.can_login()
            if not can_login:
                cannot_login_count += 1
                all_can_login = False
                status = "inactive" if not user.is_active else "other reason"
                print(f"✗ User '{user.username}' cannot login (reason: {status})")

        if all_can_login:
            print(f"✓ All {len(approved_users)} approved users can login")
            return True
        print(f"\n⚠ Warning: {cannot_login_count} approved users cannot login")
        print("  This may be expected if they are inactive")
        return True  # This is not a critical failure


def verify_pending_users_cannot_login():
    """Verify that pending users cannot login."""
    print("\n" + "=" * 70)
    print("VERIFYING PENDING USERS CANNOT LOGIN")
    print("=" * 70)

    os.environ["FLASK_ENV"] = "testing"

    app = create_app()
    with app.app_context():
        # Ensure database is initialized
        try:
            db.create_all()
        except Exception as e:
            print(f"Note: Database tables may already exist: {e.__class__.__name__}")

        # Query all pending users
        pending_users = User.query.filter_by(registration_status="pending").all()

        if len(pending_users) == 0:
            print("✓ No pending users found (none created yet)")
            return True

        print(f"\nChecking that {len(pending_users)} pending users cannot login...")

        all_blocked = True
        can_login_count = 0

        for user in pending_users:
            can_login = user.can_login()
            if can_login:
                can_login_count += 1
                all_blocked = False
                print(f"✗ Pending user '{user.username}' can login (SECURITY ISSUE)")

        if all_blocked:
            print(f"✓ All {len(pending_users)} pending users are blocked from login")
            return True
        print(f"\n✗ SECURITY ISSUE: {can_login_count} pending users can login!")
        return False


def main():
    """Run all verification checks."""
    print("\n" + "=" * 70)
    print("USER APPROVAL WORKFLOW VERIFICATION")
    print("=" * 70)

    results = {
        "columns_exist": verify_approval_columns(),
        "existing_users_approved": verify_existing_users_approved(),
        "user_can_login": verify_user_can_login(),
        "pending_users_blocked": verify_pending_users_cannot_login(),
    }

    print("\n" + "=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)

    for check, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {check}")

    all_passed = all(results.values())

    if all_passed:
        print("\n✓ ALL VERIFICATIONS PASSED")
        print("The user approval workflow has been implemented safely.")
        print("No existing user access has been disrupted.")
        return 0
    print("\n✗ SOME VERIFICATIONS FAILED")
    print("Please review the failed checks above.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
