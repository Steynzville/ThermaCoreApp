#!/usr/bin/env python3
"""First-time admin setup script for ThermaCore SCADA System.
Creates an initial admin user with specific credentials.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app, db
from app.models import Role, RoleEnum, User


def create_first_admin():
    """Create the first admin user if no admin exists."""
    # Admin credentials as specified
    admin_username = "Steyn_Admin"
    admin_password = os.environ.get("FIRST_ADMIN_PASSWORD", "Steiner1!")
    admin_email = "Steyn.Enslin@ThermaCore.com.au"
    admin_first_name = "Steyn"
    admin_last_name = "Enslin"

    app = create_app("production")

    with app.app_context():
        # Check if any admin user already exists
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()

        if not admin_role:
            print("❌ Error: Admin role not found in database.")
            print("Please ensure the database is initialized with roles.")
            print("Run migrations first: flask db upgrade")
            return 1

        # Check if admin user already exists
        existing_admin = User.query.filter_by(role_id=admin_role.id).first()

        if existing_admin:
            print("⚠️  Admin user already exists!")
            print(f"   Username: {existing_admin.username}")
            print(f"   Email: {existing_admin.email}")
            print("\nNo new admin user created.")
            return 0

        # Check if username or email already exists
        existing_username = User.query.filter_by(username=admin_username).first()
        if existing_username:
            print(f"❌ Error: Username '{admin_username}' already exists.")
            return 1

        existing_email = User.query.filter_by(email=admin_email).first()
        if existing_email:
            print(f"❌ Error: Email '{admin_email}' already exists.")
            return 1

        # Create the admin user
        try:
            admin_user = User(
                username=admin_username,
                email=admin_email,
                first_name=admin_first_name,
                last_name=admin_last_name,
                role_id=admin_role.id,
                is_active=True,
            )
            admin_user.set_password(admin_password)

            db.session.add(admin_user)
            db.session.commit()

            # Success message with exact credentials
            print("=" * 70)
            print("✅ First admin user created!")
            print("=" * 70)
            print(f"Username: {admin_username}")
            print("Password: [HIDDEN]")
            print(f"Email: {admin_email}")
            print("=" * 70)
            print("⚠️  Please login and change password immediately.")
            print("=" * 70)

            return 0

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating admin user: {e!s}")
            return 1


if __name__ == "__main__":
    exit_code = create_first_admin()
    sys.exit(exit_code)
