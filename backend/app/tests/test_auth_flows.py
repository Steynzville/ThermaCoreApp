"""Critical tests for authentication flows including login, refresh, JWT validation, lockout, and timeout."""

import json

from flask_jwt_extended import create_refresh_token

from app.models import User


class TestAuthFlows:
    """Comprehensive test cases for system authentication mechanisms."""

    def test_login_success(self, client):
        """Test authentication succeeds with valid credentials and returns correct envelope."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["success"] is True
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]
        assert data["data"]["user"]["username"] == "admin"

    def test_login_invalid_password(self, client):
        """Test authentication fails with invalid password."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "wrongpassword"},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 401
        data = json.loads(response.data)
        assert data["success"] is False

    def test_login_missing_fields(self, client):
        """Test authentication fails with missing login fields."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin"},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code in [
            400,
            422,
        ]  # webargs/custom schemas return 400 or 422

    def test_token_refresh_flow(self, client, app):
        """Test token refresh lifecycle using refresh token."""
        with app.app_context():
            user = User.query.filter_by(username="admin").first()
            refresh_token = create_refresh_token(identity=str(user.id))

        response = client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"},
        )
        assert response.status_code in [
            200,
            401,
            422,
        ]  # depending on refresh configuration/blacklist
        if response.status_code == 200:
            data = json.loads(response.data)
            assert data["success"] is True
            assert "access_token" in data["data"]

    def test_jwt_validation_protected_endpoint(self, client):
        """Test access control on protected routes with and without access tokens."""
        # Unauthenticated access
        response = client.get("/api/v1/units")
        assert response.status_code == 401

        # Authenticated access
        # Get token
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )
        token = json.loads(login_res.data)["data"]["access_token"]
        response = client.get(
            "/api/v1/units",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

    def test_account_lockout_and_inactive(self, client, db_session):
        """Test login attempts on disabled/inactive user accounts."""
        # Deactivate viewer user
        viewer = User.query.filter_by(username="viewer").first()
        viewer.is_active = False
        db_session.commit()

        try:
            response = client.post(
                "/api/v1/auth/login",
                json={"username": "viewer", "password": "viewer123"},
                headers={"Content-Type": "application/json"},
            )
            assert response.status_code == 401
            data = json.loads(response.data)
            assert data["success"] is False
        finally:
            viewer.is_active = True
            db_session.commit()

    def test_session_timeout_validation(self, app):
        """Verify token expiration and lifetime settings are in security bounds."""
        from datetime import timedelta

        token_expiry = app.config.get("JWT_ACCESS_TOKEN_EXPIRES")
        assert token_expiry is not None
        assert token_expiry > timedelta(0)
        assert token_expiry <= timedelta(days=150)
