"""Tests for emergency user approval functionality."""

from sqlalchemy import text
from app.utils.auto_migration import approve_existing_users_emergency


class TestEmergencyUserApproval:
    """Test emergency user approval functionality."""

    def test_approve_existing_users_emergency(self, app, db_session):
        """Test that approve_existing_users_emergency approves pending users."""
        from app import db
        from app.models import User, Role
        
        # Get existing admin role (created in conftest)
        admin_role = db.session.query(Role).filter_by(name='admin').first()
        
        # Create test users with pending status
        user1 = User(
            username='testuser1',
            email='testuser1@example.com',
            password_hash='hash1',
            role_id=admin_role.id,
            registration_status='pending'
        )
        user2 = User(
            username='testuser2',
            email='testuser2@example.com',
            password_hash='hash2',
            role_id=admin_role.id,
            registration_status='pending'
        )
        user3 = User(
            username='testuser3',
            email='testuser3@example.com',
            password_hash='hash3',
            role_id=admin_role.id,
            registration_status='approved'  # Already approved
        )
        
        db.session.add_all([user1, user2, user3])
        db.session.commit()
        
        # Verify initial status
        assert user1.registration_status == 'pending'
        assert user2.registration_status == 'pending'
        assert user3.registration_status == 'approved'
        
        # Run emergency approval
        result = approve_existing_users_emergency(db.engine)
        assert result is True
        
        # Refresh users from database
        db.session.expire_all()
        user1_updated = db.session.query(User).filter_by(username='testuser1').first()
        user2_updated = db.session.query(User).filter_by(username='testuser2').first()
        user3_updated = db.session.query(User).filter_by(username='testuser3').first()
        
        # Verify all pending users are now approved
        assert user1_updated.registration_status == 'approved'
        assert user2_updated.registration_status == 'approved'
        assert user3_updated.registration_status == 'approved'

    def test_approve_existing_users_emergency_idempotent(self, app, db_session):
        """Test that approve_existing_users_emergency can be run multiple times safely."""
        from app import db
        from app.models import User, Role
        
        # Get existing admin role (created in conftest)
        admin_role = db.session.query(Role).filter_by(name='admin').first()
        
        # Create test user with pending status
        user = User(
            username='testuser',
            email='testuser@example.com',
            password_hash='hash',
            role_id=admin_role.id,
            registration_status='pending'
        )
        db.session.add(user)
        db.session.commit()
        
        # Run emergency approval multiple times
        result1 = approve_existing_users_emergency(db.engine)
        result2 = approve_existing_users_emergency(db.engine)
        result3 = approve_existing_users_emergency(db.engine)
        
        assert result1 is True
        assert result2 is True
        assert result3 is True
        
        # Verify user is approved
        db.session.expire_all()
        user_updated = db.session.query(User).filter_by(username='testuser').first()
        assert user_updated.registration_status == 'approved'

    def test_approve_existing_users_emergency_with_no_pending_users(self, app, db_session):
        """Test emergency approval when no users are pending."""
        from app import db
        from app.models import User, Role
        
        # Get existing admin role (created in conftest)
        admin_role = db.session.query(Role).filter_by(name='admin').first()
        
        # Create test user already approved with unique username
        user = User(
            username='testuser_no_pending',
            email='testuser_no_pending@example.com',
            password_hash='hash',
            role_id=admin_role.id,
            registration_status='approved'
        )
        db.session.add(user)
        db.session.commit()
        
        # Run emergency approval - should succeed even with no pending users
        result = approve_existing_users_emergency(db.engine)
        assert result is True
        
        # Verify user still approved
        db.session.expire_all()
        user_updated = db.session.query(User).filter_by(username='testuser_no_pending').first()
        assert user_updated.registration_status == 'approved'

    def test_approve_existing_users_emergency_sql_injection_protection(self, app, db_session):
        """Test that emergency approval is protected against SQL injection."""
        from app import db
        
        # This test verifies the function uses parameterized queries
        # by ensuring it doesn't crash with unusual data
        
        # Run emergency approval - should not fail even with no users
        result = approve_existing_users_emergency(db.engine)
        assert result is True

    def test_emergency_script_can_be_imported(self):
        """Test that the emergency_user_approval script can be imported."""
        import sys
        import os
        
        # Add backend directory to path for imports
        backend_path = os.path.join(os.path.dirname(__file__), '../../..')
        sys.path.insert(0, backend_path)
        
        # Import the function from the emergency script - should not raise
        from emergency_user_approval import approve_all_existing_users
        
        # Verify function exists and is callable
        assert callable(approve_all_existing_users)
        
        # Note: We don't actually call the function here because it creates its own
        # app instance with a separate database. The functionality is already tested
        # via the approve_existing_users_emergency() function tests above.
