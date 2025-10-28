"""Tests for emergency admin endpoint."""

import json

from app.models import User


def unwrap_response(response):
    """Helper to extract data from standardized API response envelope."""
    data = json.loads(response.data)
    if "data" in data and "success" in data:
        return data["data"]
    return data


class TestEmergencyAdmin:
    """Test emergency admin endpoint."""

    def test_emergency_admin_creates_account(self, client, db_session):
        """Test emergency admin endpoint creates account when it doesn't exist."""
        # Delete emergency_admin if it exists
        existing_user = User.query.filter_by(username="emergency_admin").first()
        if existing_user:
            db_session.delete(existing_user)
            db_session.commit()

        # Call emergency admin endpoint
        response = client.post(
            "/api/v1/auth/emergency-admin",
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)
        assert "message" in data
        assert data["username"] == "emergency_admin"

        # Verify user was created
        user = User.query.filter_by(username="emergency_admin").first()
        assert user is not None
        assert user.email == "emergency@thermacore.local"
        assert user.is_active is True
        assert user.first_name == "Emergency"
        assert user.last_name == "Admin"
        # Verify role is admin
        assert user.role is not None
        assert user.role.name.value == "admin"

    def test_emergency_admin_updates_existing_account(self, client, db_session):
        """Test emergency admin endpoint updates existing account."""
        # First call to create
        response1 = client.post(
            "/api/v1/auth/emergency-admin",
            headers={"Content-Type": "application/json"},
        )
        assert response1.status_code == 200

        # Get user and modify it
        user = User.query.filter_by(username="emergency_admin").first()
        original_id = user.id
        user.first_name = "Modified"
        user.is_active = False
        db_session.commit()

        # Second call to update
        response2 = client.post(
            "/api/v1/auth/emergency-admin",
            headers={"Content-Type": "application/json"},
        )
        assert response2.status_code == 200

        # Verify user was updated (same ID, but values restored)
        user = User.query.filter_by(username="emergency_admin").first()
        assert user.id == original_id  # Same user
        assert user.first_name == "Emergency"  # Restored
        assert user.is_active is True  # Restored

    def test_emergency_admin_login(self, client, db_session):
        """Test that emergency admin account can login."""
        # Create emergency admin
        response = client.post(
            "/api/v1/auth/emergency-admin",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200

        # Try to login with emergency admin credentials
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "emergency_admin", "password": "EmergencyAdmin123!"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["username"] == "emergency_admin"

    def test_emergency_admin_has_admin_permissions(self, client, db_session):
        """Test that emergency admin has admin role and permissions."""
        # Create emergency admin
        response = client.post(
            "/api/v1/auth/emergency-admin",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200

        # Login
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "emergency_admin", "password": "EmergencyAdmin123!"},
            headers={"Content-Type": "application/json"},
        )
        data = unwrap_response(response)
        token = data["access_token"]

        # Test admin permission by trying to register a new user (requires write_users permission)
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser_emergency",
                "email": "testuser_emergency@example.com",
                "password": "TestPassword123!",
                "role_id": 3,  # Viewer role
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
        )

        # Should succeed because emergency_admin has admin role
        assert response.status_code == 201

    def test_emergency_admin_idempotent(self, client, db_session):
        """Test that calling emergency admin endpoint multiple times is safe."""
        # Call 3 times
        for _ in range(3):
            response = client.post(
                "/api/v1/auth/emergency-admin",
                headers={"Content-Type": "application/json"},
            )
            assert response.status_code == 200

        # Should only have one emergency_admin user
        users = User.query.filter_by(username="emergency_admin").all()
        assert len(users) == 1

    def test_emergency_admin_password_reset(self, client, db_session):
        """Test that emergency admin password is always reset to the default."""
        # Create emergency admin
        response = client.post(
            "/api/v1/auth/emergency-admin",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200

        # Login with default password
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "emergency_admin", "password": "EmergencyAdmin123!"},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200
        data = unwrap_response(response)
        token = data["access_token"]

        # Change password
        response = client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "EmergencyAdmin123!",
                "new_password": "NewPassword123!",
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
        )
        assert response.status_code == 200

        # Verify new password works
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "emergency_admin", "password": "NewPassword123!"},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200

        # Call emergency admin endpoint again - should reset password
        response = client.post(
            "/api/v1/auth/emergency-admin",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200

        # Old password should work again
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "emergency_admin", "password": "EmergencyAdmin123!"},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200

        # New password should not work
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "emergency_admin", "password": "NewPassword123!"},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 401
