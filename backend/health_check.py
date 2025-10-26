#!/usr/bin/env python3
"""Production health check script for ThermaCore backend.

This script can be run directly in the Render environment to check system health.
It provides a quick sanity check of the authentication system.

Usage:
    python health_check.py

This script uses the environment variables already set in Render.
"""

import logging
import os
import sys

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Configure logging for the script
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

try:
    from sqlalchemy import text

    from app import create_app, db
    from app.models import Permission, Role, RoleEnum, User
except ImportError as e:
    logger.error(f"❌ Failed to import required modules: {e}")
    logger.error(
        "   Make sure all dependencies are installed: pip install -r requirements.txt",
    )
    sys.exit(1)


def main():
    """Quick health check."""
    logger.info("🔍 ThermaCore Backend Health Check")
    logger.info("-" * 60)

    try:
        # Create app
        app = create_app(os.environ.get("FLASK_ENV", "production"))

        with app.app_context():
            # Test 1: Database connection
            try:
                db.session.execute(text("SELECT 1"))
                logger.info("✅ Database: Connected")
            except Exception as e:
                logger.error(f"❌ Database: Connection failed - {str(e)[:100]}")
                return 1

            # Test 2: Check critical tables
            try:
                role_count = Role.query.count()
                user_count = User.query.count()
                perm_count = Permission.query.count()
                logger.info(
                    f"✅ Tables: OK (Roles: {role_count}, Users: {user_count}, Permissions: {perm_count})",
                )
            except Exception as e:
                logger.error(f"❌ Tables: Missing or corrupted - {str(e)[:100]}")
                return 1

            # Test 3: Check admin role
            try:
                admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
                if admin_role:
                    logger.info(
                        f"✅ Admin Role: Found (ID: {admin_role.id}, Permissions: {len(admin_role.permissions)})",
                    )
                else:
                    logger.error("❌ Admin Role: Not found")
                    return 1
            except Exception as e:
                logger.error(f"❌ Admin Role: Error - {str(e)[:100]}")
                return 1

            # Test 4: Check admin users
            try:
                if admin_role:
                    admin_users = User.query.filter_by(role_id=admin_role.id).all()
                    if len(admin_users) > 0:
                        logger.info(f"✅ Admin Users: {len(admin_users)} found")
                        for user in admin_users:
                            status = "Active" if user.is_active else "Inactive"
                            role_ok = "✓" if user.role else "✗ NO ROLE!"
                            logger.info(f"   - {user.username} ({status}) {role_ok}")
                    else:
                        logger.error("❌ Admin Users: None found")
                        return 1
            except Exception as e:
                logger.error(f"❌ Admin Users: Error - {str(e)[:100]}")
                return 1

            # Test 5: Environment check
            try:
                jwt_key = os.environ.get("JWT_SECRET_KEY")
                secret_key = os.environ.get("SECRET_KEY")
                cors = os.environ.get("CORS_ORIGINS", "")

                if jwt_key:
                    logger.info("✅ JWT_SECRET_KEY: Set")
                else:
                    logger.error("❌ JWT_SECRET_KEY: Not set")
                    return 1

                if secret_key:
                    logger.info("✅ SECRET_KEY: Set")
                else:
                    logger.error("❌ SECRET_KEY: Not set")
                    return 1

                if cors:
                    logger.info(f"✅ CORS_ORIGINS: {cors}")
                else:
                    logger.warning("⚠️  CORS_ORIGINS: Not set (may block frontend)")
            except Exception as e:
                logger.error(f"❌ Environment: Error - {str(e)[:100]}")
                return 1

            logger.info("-" * 60)
            logger.info("✅ All health checks PASSED")
            logger.info("   Authentication should be working!")
            return 0

    except Exception as e:
        logger.exception(f"❌ FATAL ERROR: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
