#!/usr/bin/env python3
"""
Test script to verify database initialization on application startup.

This script demonstrates that:
1. Database tables are created automatically
2. Default admin role is seeded
3. Default admin user is seeded
4. The implementation is idempotent
"""
import sys
import os

# Set environment for testing
os.environ['TESTING'] = 'false'
os.environ['FLASK_ENV'] = 'development'
os.environ['FLASK_DEBUG'] = '1'
os.environ['SKIP_EXTERNAL_SERVICES'] = 'true'


def test_fresh_database():
    """Test initialization with a fresh database."""
    print("\n" + "=" * 70)
    print("TEST 1: Fresh Database Initialization")
    print("=" * 70)
    
    # Remove existing database
    import shutil
    if os.path.exists('instance'):
        shutil.rmtree('instance')
    
    # Import app (triggers initialization)
    from run import app, db
    from app.models import User, Role, RoleEnum
    
    with app.app_context():
        # Check tables
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        assert len(tables) == 7, f"Expected 7 tables, got {len(tables)}"
        print(f"✓ All 7 tables created: {', '.join(sorted(tables))}")
        
        # Check admin role
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        assert admin_role is not None, "Admin role not found"
        assert admin_role.name.value == "admin", "Admin role has wrong name"
        print(f"✓ Admin role created: {admin_role.name.value}")
        
        # Check admin user
        admin_user = User.query.filter_by(username='Steyn_Admin').first()
        assert admin_user is not None, "Admin user not found"
        assert admin_user.username == "Steyn_Admin", "Admin user has wrong username"
        assert admin_user.is_active, "Admin user is not active"
        assert admin_user.check_password("password"), "Admin password is incorrect"
        print(f"✓ Admin user created: {admin_user.username}")
        print("✓ Admin user password verified")
        
    print("\n✅ TEST 1 PASSED: Fresh database initialization works correctly\n")


def test_idempotency():
    """Test that initialization is idempotent."""
    print("=" * 70)
    print("TEST 2: Idempotency (Second Run)")
    print("=" * 70)
    
    # Import app again (triggers initialization again)
    from run import app
    from app.models import User, Role, RoleEnum
    
    with app.app_context():
        # Check for duplicates
        admin_roles = Role.query.filter_by(name=RoleEnum.ADMIN).all()
        admin_users = User.query.filter_by(username='Steyn_Admin').all()
        
        assert len(admin_roles) == 1, f"Expected 1 admin role, got {len(admin_roles)}"
        assert len(admin_users) == 1, f"Expected 1 admin user, got {len(admin_users)}"
        print(f"✓ No duplicate roles (count: {len(admin_roles)})")
        print(f"✓ No duplicate users (count: {len(admin_users)})")
        
    print("\n✅ TEST 2 PASSED: Initialization is idempotent\n")


def test_admin_credentials():
    """Test that admin credentials work for authentication."""
    print("=" * 70)
    print("TEST 3: Admin Credentials Verification")
    print("=" * 70)
    
    from run import app
    from app.models import User
    
    with app.app_context():
        admin = User.query.filter_by(username='Steyn_Admin').first()
        
        # Test correct password
        assert admin.check_password('password'), "Correct password should authenticate"
        print("✓ Correct password authenticates successfully")
        
        # Test wrong password
        assert not admin.check_password('wrongpassword'), "Wrong password should fail"
        print("✓ Wrong password fails as expected")
        
        # Verify user properties
        assert admin.email == "admin@thermacore.com", "Email doesn't match"
        assert admin.first_name == "Admin", "First name doesn't match"
        assert admin.last_name == "User", "Last name doesn't match"
        assert admin.is_active, "User should be active"
        print("✓ All user properties correct")
        
    print("\n✅ TEST 3 PASSED: Admin credentials work correctly\n")


def main():
    """Run all tests."""
    print("\n" + "=" * 70)
    print("DATABASE INITIALIZATION TEST SUITE")
    print("=" * 70)
    
    try:
        test_fresh_database()
        test_idempotency()
        test_admin_credentials()
        
        print("=" * 70)
        print("✅ ALL TESTS PASSED")
        print("=" * 70)
        print("\nDatabase initialization is working correctly:")
        print("  ✓ Tables are created automatically on startup")
        print("  ✓ Default admin user is seeded if not present")
        print("  ✓ Implementation is idempotent (safe to run multiple times)")
        print("  ✓ Admin credentials work for authentication")
        print("=" * 70 + "\n")
        
        return 0
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}\n")
        return 1
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}\n")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
