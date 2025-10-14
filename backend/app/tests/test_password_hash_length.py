"""Test that password_hash field can handle long hashes from scrypt and other algorithms."""
import pytest
from app.models import User, Role, RoleEnum


class TestPasswordHashLength:
    """Test password hash field can accommodate long hashes."""
    
    def test_password_hash_accepts_long_values(self, app):
        """Test that password_hash column can store hashes longer than 128 characters."""
        with app.app_context():
            # Ensure we have a role for the user
            role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
            if not role:
                role = Role(name=RoleEnum.VIEWER, description="Test role")
                from app import db
                db.session.add(role)
                db.session.commit()
            
            # Create a user with a very long password hash (simulating scrypt output)
            # Scrypt hashes can be 200+ characters
            long_hash = "scrypt:32768:8:1$" + ("a" * 200)  # Simulated scrypt hash > 128 chars
            
            user = User(
                username="test_long_hash_user",
                email="longhash@test.com",
                first_name="Test",
                last_name="User",
                role_id=role.id,
                is_active=True
            )
            # Directly set the hash instead of using set_password
            user.password_hash = long_hash
            
            from app import db
            db.session.add(user)
            db.session.commit()
            
            # Verify it was stored correctly
            saved_user = User.query.filter_by(username="test_long_hash_user").first()
            assert saved_user is not None
            assert saved_user.password_hash == long_hash
            assert len(saved_user.password_hash) > 128
            
            # Clean up
            db.session.delete(saved_user)
            db.session.commit()
    
    def test_password_hash_from_werkzeug_generate(self, app):
        """Test that werkzeug's generate_password_hash creates acceptable hashes."""
        with app.app_context():
            from werkzeug.security import generate_password_hash
            
            # Ensure we have a role for the user
            role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
            if not role:
                role = Role(name=RoleEnum.VIEWER, description="Test role")
                from app import db
                db.session.add(role)
                db.session.commit()
            
            # Test with scrypt method (if available)
            test_password = "TestPassword123!"
            
            # Try scrypt if available (Python 3.6+)
            try:
                hash_scrypt = generate_password_hash(test_password, method='scrypt')
                
                user = User(
                    username="test_scrypt_user",
                    email="scrypt@test.com",
                    first_name="Test",
                    last_name="User",
                    role_id=role.id,
                    is_active=True
                )
                user.set_password(test_password)
                
                from app import db
                db.session.add(user)
                db.session.commit()
                
                # Verify the user was created
                saved_user = User.query.filter_by(username="test_scrypt_user").first()
                assert saved_user is not None
                assert saved_user.password_hash is not None
                assert len(saved_user.password_hash) > 0
                
                # Verify password checking works
                assert saved_user.check_password(test_password)
                assert not saved_user.check_password("WrongPassword")
                
                # Clean up
                db.session.delete(saved_user)
                db.session.commit()
            except ValueError:
                # Scrypt not available on this system
                pytest.skip("Scrypt not available in this environment")
    
    def test_default_admin_user_creation(self, app):
        """Test that the default admin user can be created with current password hashing."""
        with app.app_context():
            from app import db
            
            # Check if admin role exists
            admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
            if not admin_role:
                admin_role = Role(
                    name=RoleEnum.ADMIN,
                    description="Test admin role"
                )
                db.session.add(admin_role)
                db.session.commit()
            
            # Try to create an admin user (similar to run.py)
            test_admin = User.query.filter_by(username="test_admin_user").first()
            if test_admin:
                db.session.delete(test_admin)
                db.session.commit()
            
            admin_user = User(
                username="test_admin_user",
                email="testadmin@thermacore.com",
                first_name="Admin",
                last_name="User",
                role_id=admin_role.id,
                is_active=True
            )
            admin_user.set_password("password")
            
            db.session.add(admin_user)
            db.session.commit()
            
            # Verify the admin user was created successfully
            saved_admin = User.query.filter_by(username="test_admin_user").first()
            assert saved_admin is not None
            assert saved_admin.password_hash is not None
            assert saved_admin.check_password("password")
            
            # Verify no "value too long" error occurred
            # (if we got here, the commit succeeded)
            print(f"✅ Default admin user created successfully")
            print(f"   Password hash length: {len(saved_admin.password_hash)}")
            
            # Clean up
            db.session.delete(saved_admin)
            db.session.commit()
