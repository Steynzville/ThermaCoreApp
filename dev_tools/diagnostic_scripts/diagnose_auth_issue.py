#!/usr/bin/env python3
"""
Comprehensive diagnostic script to identify authentication 500 errors.

This script checks:
1. Database connection
2. Database tables exist (users, roles, permissions)
3. Roles and permissions are populated
4. Admin user exists and has proper role assignment
5. Authentication endpoint is accessible
6. Logs detailed diagnostics for production troubleshooting

Usage:
    python diagnose_auth_issue.py

Environment variables needed:
    DATABASE_URL - Database connection string
    JWT_SECRET_KEY - JWT secret key
    SECRET_KEY - Flask secret key
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app, db
from app.models import User, Role, Permission, RoleEnum
from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError


def print_header(title):
    """Print a formatted header."""
    print("\n" + "=" * 80)
    print(f" {title}")
    print("=" * 80)


def print_success(message):
    """Print a success message."""
    print(f"✅ {message}")


def print_error(message):
    """Print an error message."""
    print(f"❌ {message}")


def print_warning(message):
    """Print a warning message."""
    print(f"⚠️  {message}")


def print_info(message):
    """Print an info message."""
    print(f"ℹ️  {message}")


def check_database_connection(app):
    """Check if database is accessible."""
    print_header("1. Database Connection Check")

    try:
        with app.app_context():
            # Try a simple query
            db.session.execute(text("SELECT 1"))
            print_success("Database connection successful")
            print_info(f"Database URL: {app.config['SQLALCHEMY_DATABASE_URI'][:50]}...")
            return True
    except OperationalError as e:
        print_error(f"Database connection failed: {e}")
        print_info("Possible causes:")
        print_info("  - Database server is not running")
        print_info("  - DATABASE_URL environment variable is incorrect")
        print_info("  - Network connectivity issues")
        return False
    except Exception as e:
        print_error(f"Unexpected error connecting to database: {e}")
        return False


def check_tables_exist(app):
    """Check if required tables exist."""
    print_header("2. Database Tables Check")

    required_tables = ["users", "roles", "permissions", "role_permissions"]

    try:
        with app.app_context():
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()

            all_exist = True
            for table in required_tables:
                if table in existing_tables:
                    print_success(f"Table '{table}' exists")
                else:
                    print_error(f"Table '{table}' MISSING!")
                    all_exist = False

            if not all_exist:
                print_warning("Missing tables detected!")
                print_info("Run database migrations to create tables:")
                print_info("  cd backend")
                print_info("  psql $DATABASE_URL -f migrations/001_initial_schema.sql")
                print_info("  psql $DATABASE_URL -f migrations/002_seed_data.sql")
                return False

            return True
    except Exception as e:
        print_error(f"Error checking tables: {e}")
        return False


def check_roles_and_permissions(app):
    """Check if roles and permissions are populated."""
    print_header("3. Roles and Permissions Check")

    try:
        with app.app_context():
            # Check permissions
            permissions = Permission.query.all()
            if len(permissions) == 0:
                print_error("No permissions found in database!")
                print_info(
                    "Run seed data script: psql $DATABASE_URL -f migrations/002_seed_data.sql"
                )
                return False
            else:
                print_success(f"Found {len(permissions)} permissions")
                for perm in permissions:
                    print_info(f"  - {perm.name.value}: {perm.description}")

            # Check roles
            roles = Role.query.all()
            if len(roles) == 0:
                print_error("No roles found in database!")
                print_info(
                    "Run seed data script: psql $DATABASE_URL -f migrations/002_seed_data.sql"
                )
                return False
            else:
                print_success(f"Found {len(roles)} roles")
                for role in roles:
                    perm_count = len(role.permissions)
                    print_info(f"  - {role.name.value}: {perm_count} permissions")
                    if perm_count == 0:
                        print_warning(
                            f"    Role '{role.name.value}' has NO permissions assigned!"
                        )

            # Check admin role specifically
            admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
            if not admin_role:
                print_error("Admin role not found!")
                return False
            else:
                print_success(f"Admin role found (ID: {admin_role.id})")
                if len(admin_role.permissions) < 8:
                    print_warning(
                        f"Admin role has only {len(admin_role.permissions)} permissions (expected 8)"
                    )
                    print_info(
                        "Admin should have all permissions. Re-run seed data script."
                    )

            return True
    except Exception as e:
        print_error(f"Error checking roles and permissions: {e}")
        import traceback

        traceback.print_exc()
        return False


def check_admin_user(app):
    """Check if default admin user exists and is properly configured."""
    print_header("4. Admin User Check")

    try:
        with app.app_context():
            # Check for any admin users
            admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
            if not admin_role:
                print_error("Admin role not found - cannot check admin users")
                return False

            admin_users = User.query.filter_by(role_id=admin_role.id).all()

            if len(admin_users) == 0:
                print_error("No admin users found!")
                print_info("Create admin user with:")
                print_info("  cd backend")
                print_info("  python scripts/create_first_admin.py")
                return False
            else:
                print_success(f"Found {len(admin_users)} admin user(s)")

                for user in admin_users:
                    print_info(f"\nAdmin User: {user.username}")
                    print_info(f"  - Email: {user.email}")
                    print_info(f"  - Active: {user.is_active}")
                    print_info(f"  - Role ID: {user.role_id}")

                    # Check role assignment
                    if not user.role:
                        print_error(
                            "  - Role object is NULL! (Database foreign key issue)"
                        )
                        print_info("    This will cause 500 error during login!")
                        return False
                    else:
                        print_success(f"  - Role: {user.role.name.value}")
                        print_success(
                            f"  - Role has {len(user.role.permissions)} permissions"
                        )

                    # Test password hash
                    if not user.password_hash:
                        print_error("  - No password hash set!")
                        return False
                    else:
                        print_success("  - Password hash exists")

                    # Check if user can authenticate
                    if not user.is_active:
                        print_warning("  - User is INACTIVE - cannot login!")

            # Check for the specific admin user mentioned in the problem
            steyn_admin = User.query.filter_by(username="Steyn_Admin").first()
            if steyn_admin:
                print_success("\nDefault admin 'Steyn_Admin' exists")
                if not steyn_admin.role:
                    print_error("  - Steyn_Admin has NO ROLE assigned!")
                    print_info(
                        "  - This WILL cause 500 error: user.role.name.value will fail!"
                    )
                    return False
            else:
                print_warning("\nDefault admin 'Steyn_Admin' not found")
                print_info("Create with: python scripts/create_first_admin.py")

            return True
    except Exception as e:
        print_error(f"Error checking admin user: {e}")
        import traceback

        traceback.print_exc()
        return False


def check_environment_variables():
    """Check if required environment variables are set."""
    print_header("5. Environment Variables Check")

    required_vars = {
        "DATABASE_URL": "Database connection string",
        "SECRET_KEY": "Flask secret key",
        "JWT_SECRET_KEY": "JWT secret key",
    }

    optional_vars = {
        "CORS_ORIGINS": "CORS allowed origins (frontend domains)",
        "DEBUG": "Debug mode flag",
    }

    all_good = True

    print_info("Required environment variables:")
    for var, description in required_vars.items():
        value = os.environ.get(var)
        if value:
            # Show only first/last few characters for security
            if len(value) > 20:
                masked_value = f"{value[:10]}...{value[-5:]}"
            else:
                masked_value = f"{value[:5]}..."
            print_success(f"  {var}: {masked_value} ({description})")
        else:
            print_error(f"  {var}: NOT SET ({description})")
            all_good = False

    print_info("\nOptional environment variables:")
    for var, description in optional_vars.items():
        value = os.environ.get(var)
        if value:
            print_success(f"  {var}: {value} ({description})")
        else:
            print_warning(f"  {var}: NOT SET ({description})")

    return all_good


def test_login_logic(app):
    """Test the login logic without making HTTP request."""
    print_header("6. Login Logic Test")

    try:
        with app.app_context():
            # Find an admin user to test with
            admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
            if not admin_role:
                print_error("Cannot test login - no admin role")
                return False

            admin_user = User.query.filter_by(role_id=admin_role.id).first()
            if not admin_user:
                print_error("Cannot test login - no admin user")
                return False

            print_info(f"Testing login logic for user: {admin_user.username}")

            # Simulate the critical checks in login endpoint
            checks = []

            # Check 1: User exists
            if admin_user:
                print_success("  1. User exists in database")
                checks.append(True)
            else:
                print_error("  1. User not found")
                checks.append(False)

            # Check 2: User is active
            if admin_user.is_active:
                print_success("  2. User is active")
                checks.append(True)
            else:
                print_error("  2. User is NOT active")
                checks.append(False)

            # Check 3: User has role (CRITICAL - this is where 500 errors happen!)
            if admin_user.role:
                print_success(f"  3. User has role: {admin_user.role.name.value}")
                checks.append(True)
            else:
                print_error("  3. User has NO ROLE - THIS WILL CAUSE 500 ERROR!")
                print_error(
                    "     The line 'user.role.name.value' will fail with AttributeError"
                )
                checks.append(False)

            # Check 4: Role has name attribute
            if admin_user.role and hasattr(admin_user.role, "name"):
                print_success("  4. Role has name attribute")
                checks.append(True)
            else:
                print_error("  4. Role missing name attribute")
                checks.append(False)

            # Check 5: Role name has value
            if admin_user.role and hasattr(admin_user.role.name, "value"):
                print_success(f"  5. Role name has value: {admin_user.role.name.value}")
                checks.append(True)
            else:
                print_error("  5. Role name has no value")
                checks.append(False)

            # Check 6: Password hash exists
            if admin_user.password_hash:
                print_success("  6. Password hash exists")
                checks.append(True)
            else:
                print_error("  6. No password hash")
                checks.append(False)

            if all(checks):
                print_success("\n✅ All login logic checks PASSED - Login should work!")
                return True
            else:
                print_error("\n❌ Some login logic checks FAILED - Login WILL fail!")
                return False

    except Exception as e:
        print_error(f"Error testing login logic: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """Run all diagnostic checks."""
    print("\n" + "=" * 80)
    print(" ThermaCore Authentication Diagnostic Tool")
    print(" " + "=" * 78)
    print(" This tool checks for common authentication issues that cause 500 errors")
    print("=" * 80)

    # Try to create app
    try:
        app = create_app(os.environ.get("FLASK_ENV", "production"))
    except Exception as e:
        print_error(f"Failed to create Flask app: {e}")
        import traceback

        traceback.print_exc()
        return 1

    # Run all checks
    results = []

    results.append(("Environment Variables", check_environment_variables()))
    results.append(("Database Connection", check_database_connection(app)))
    results.append(("Database Tables", check_tables_exist(app)))
    results.append(("Roles & Permissions", check_roles_and_permissions(app)))
    results.append(("Admin User", check_admin_user(app)))
    results.append(("Login Logic", test_login_logic(app)))

    # Print summary
    print_header("DIAGNOSTIC SUMMARY")

    all_passed = True
    for check_name, passed in results:
        if passed:
            print_success(f"{check_name}: PASSED")
        else:
            print_error(f"{check_name}: FAILED")
            all_passed = False

    print("\n" + "=" * 80)
    if all_passed:
        print("✅ ALL CHECKS PASSED - Authentication should be working!")
        print("=" * 80)
        print("\nIf you're still getting 500 errors in production:")
        print("1. Check backend logs on Render for specific error messages")
        print("2. Verify CORS_ORIGINS includes your frontend domain")
        print("3. Ensure database migrations have been run in production")
        print("4. Check that JWT_SECRET_KEY and SECRET_KEY are set")
        return 0
    else:
        print("❌ SOME CHECKS FAILED - This explains the 500 errors!")
        print("=" * 80)
        print("\nRECOMMENDED ACTIONS:")
        print("1. Fix all failed checks above")
        print("2. If tables are missing: Run database migrations")
        print("3. If roles/permissions are missing: Run seed data script")
        print("4. If admin user is missing: Run create_first_admin.py")
        print("5. After fixes, re-run this diagnostic script")
        return 1


if __name__ == "__main__":
    sys.exit(main())
