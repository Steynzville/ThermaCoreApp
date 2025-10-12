#!/usr/bin/env python3
"""
Production health check script for ThermaCore backend.

This script can be run directly in the Render environment to check system health.
It provides a quick sanity check of the authentication system.

Usage:
    python health_check.py
    
This script uses the environment variables already set in Render.
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from app import create_app, db
    from app.models import User, Role, Permission, RoleEnum
    from sqlalchemy import text
except ImportError as e:
    print(f"❌ Failed to import required modules: {e}")
    print("   Make sure all dependencies are installed: pip install -r requirements.txt")
    sys.exit(1)


def main():
    """Quick health check."""
    print("🔍 ThermaCore Backend Health Check")
    print("-" * 60)
    
    try:
        # Create app
        app = create_app(os.environ.get('FLASK_ENV', 'production'))
        
        with app.app_context():
            # Test 1: Database connection
            try:
                db.session.execute(text('SELECT 1'))
                print("✅ Database: Connected")
            except Exception as e:
                print(f"❌ Database: Connection failed - {str(e)[:100]}")
                return 1
            
            # Test 2: Check critical tables
            try:
                role_count = Role.query.count()
                user_count = User.query.count()
                perm_count = Permission.query.count()
                print(f"✅ Tables: OK (Roles: {role_count}, Users: {user_count}, Permissions: {perm_count})")
            except Exception as e:
                print(f"❌ Tables: Missing or corrupted - {str(e)[:100]}")
                return 1
            
            # Test 3: Check admin role
            try:
                admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
                if admin_role:
                    print(f"✅ Admin Role: Found (ID: {admin_role.id}, Permissions: {len(admin_role.permissions)})")
                else:
                    print("❌ Admin Role: Not found")
                    return 1
            except Exception as e:
                print(f"❌ Admin Role: Error - {str(e)[:100]}")
                return 1
            
            # Test 4: Check admin users
            try:
                if admin_role:
                    admin_users = User.query.filter_by(role_id=admin_role.id).all()
                    if len(admin_users) > 0:
                        print(f"✅ Admin Users: {len(admin_users)} found")
                        for user in admin_users:
                            status = "Active" if user.is_active else "Inactive"
                            role_ok = "✓" if user.role else "✗ NO ROLE!"
                            print(f"   - {user.username} ({status}) {role_ok}")
                    else:
                        print("❌ Admin Users: None found")
                        return 1
            except Exception as e:
                print(f"❌ Admin Users: Error - {str(e)[:100]}")
                return 1
            
            # Test 5: Environment check
            try:
                jwt_key = os.environ.get('JWT_SECRET_KEY')
                secret_key = os.environ.get('SECRET_KEY')
                cors = os.environ.get('CORS_ORIGINS', '')
                
                if jwt_key:
                    print("✅ JWT_SECRET_KEY: Set")
                else:
                    print("❌ JWT_SECRET_KEY: Not set")
                    return 1
                
                if secret_key:
                    print("✅ SECRET_KEY: Set")
                else:
                    print("❌ SECRET_KEY: Not set")
                    return 1
                
                if cors:
                    print(f"✅ CORS_ORIGINS: {cors}")
                else:
                    print("⚠️  CORS_ORIGINS: Not set (may block frontend)")
            except Exception as e:
                print(f"❌ Environment: Error - {str(e)[:100]}")
                return 1
            
            print("-" * 60)
            print("✅ All health checks PASSED")
            print("   Authentication should be working!")
            return 0
            
    except Exception as e:
        print(f"❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
