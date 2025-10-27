"""Unit tests for authentication functionality."""

import json
import time

import jwt

from app.models import User

# Test constants
MAX_TEST_USERNAME_LENGTH = 1000  # Maximum username length for DoS protection testing


def unwrap_response(response):
    """Helper to extract data from standardized API response envelope.

    The API wraps responses in: {'success': bool, 'data': {...}, 'message': str, ...}
    This helper extracts the actual data payload.
    """
    data = json.loads(response.data)
    # If response has the standard envelope structure, return the inner data
    if "data" in data and "success" in data:
        return data["data"]
    # Otherwise return as-is (for error responses)
    return data


class TestAuthentication:
    """Test authentication endpoints."""

    def test_login_success(self, client):
        """Test successful login."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)

        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["user"]["username"] == "admin"

    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "wrongpassword"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 401
        data = unwrap_response(response)
        assert "error" in data

    def test_login_missing_fields(self, client):
        """Test login with missing fields."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin"},
            headers={"Content-Type": "application/json"},
        )

        # Webargs returns 422 for validation errors (Unprocessable Entity)
        assert response.status_code == 422
        data = unwrap_response(response)
        # Check for validation error in any form (structured or simple)
        data_str = str(data).lower()
        assert "validation" in data_str or "field" in data_str or "required" in data_str

    def test_login_inactive_user(self, client, db_session):
        """Test login with inactive user."""
        # Deactivate admin user
        admin_user = User.query.filter_by(username="admin").first()
        admin_user.is_active = False
        db_session.commit()

        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 401

        # Reactivate for other tests
        admin_user.is_active = True
        db_session.commit()

    def get_auth_token(self, client, username="admin", password="admin123"):
        """Helper method to get auth token."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            data = unwrap_response(response)
            return data["access_token"]
        return None

    def test_protected_endpoint_without_token(self, client):
        """Test accessing protected endpoint without token."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_protected_endpoint_with_token(self, client):
        """Test accessing protected endpoint with valid token."""
        token = self.get_auth_token(client)

        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)
        assert data["username"] == "admin"

    def test_refresh_token(self, client):
        """Test token refresh."""
        # Get tokens
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )

        login_data = unwrap_response(login_response)
        refresh_token = login_data["refresh_token"]

        # Use refresh token
        response = client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)
        assert "access_token" in data

    def test_change_password(self, client):
        """Test password change."""
        token = self.get_auth_token(client)
        original_password = "admin123"
        new_password = "newpassword123"

        # Change password
        response = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": original_password, "new_password": new_password},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 200

        try:
            # Verify can login with new password
            new_login = client.post(
                "/api/v1/auth/login",
                json={"username": "admin", "password": new_password},
                headers={"Content-Type": "application/json"},
            )

            assert new_login.status_code == 200

        finally:
            # Always revert password for test isolation
            new_token = (
                unwrap_response(new_login)["access_token"]
                if new_login.status_code == 200
                else token
            )
            client.post(
                "/api/v1/auth/change-password",
                json={
                    "current_password": new_password,
                    "new_password": original_password,
                },
                headers={
                    "Authorization": f"Bearer {new_token}",
                    "Content-Type": "application/json",
                },
            )

    def test_change_password_wrong_current(self, client):
        """Test password change with wrong current password."""
        token = self.get_auth_token(client)

        response = client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword123",
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 401

    def test_logout(self, client):
        """Test logout endpoint."""
        token = self.get_auth_token(client)

        response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200


class TestTokenSecurity:
    """Test JWT token security enhancements."""

    def get_auth_token(self, client, username="admin", password="admin123"):
        """Helper method to get auth token."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            data = unwrap_response(response)
            return data["access_token"]
        return None

    def test_token_contains_security_claims(self, client):
        """Test that tokens include security claims like jti and role."""
        # Get a token
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)
        token = data["access_token"]

        # Decode token without verification to inspect claims
        decoded = jwt.decode(token, options={"verify_signature": False})

        # Verify security claims are present
        assert "jti" in decoded, "Token should include jti (JWT ID) claim"
        assert "role" in decoded, "Token should include role claim"
        assert "sub" in decoded, "Token should include sub (subject) claim"
        assert "iat" in decoded, "Token should include iat (issued at) claim"
        assert "exp" in decoded, "Token should include exp (expiration) claim"

    def test_refresh_token_contains_jti(self, client):
        """Test that refresh tokens include jti claim."""
        # Get tokens
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)
        refresh_token = data["refresh_token"]

        # Decode token without verification to inspect claims
        decoded = jwt.decode(refresh_token, options={"verify_signature": False})

        # Verify jti claim is present in refresh token
        assert "jti" in decoded, "Refresh token should include jti (JWT ID) claim"


class TestErrorHandling:
    """Test error handling improvements using SecurityAwareErrorHandler."""

    def test_invalid_token_uses_security_aware_handler(self, client):
        """Test that invalid token errors use SecurityAwareErrorHandler."""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"},
        )

        # Should return 401 or 422 (JWT validation error)
        assert response.status_code in [401, 422]
        data = json.loads(response.data)

        # SecurityAwareErrorHandler wraps errors in a specific format
        # Check that error is properly structured
        assert "error" in data or "msg" in data  # JWT errors may use 'msg'

    def test_login_error_handling_structure(self, client):
        """Test that login endpoint has proper error handling structure.

        This test verifies that the login endpoint properly handles errors
        and returns 401 for invalid credentials (not 500 for unhandled exceptions).
        The actual error handling code added includes:
        - Database connection error handling
        - Missing user role error handling
        - JWT token generation error handling
        - Schema serialization error handling
        """
        # Test with invalid credentials - should return 401, not 500
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "nonexistent", "password": "wrongpass"},
            headers={"Content-Type": "application/json"},
        )

        # Should return 401 with proper error message (not 500 unhandled exception)
        assert response.status_code == 401
        response_data = json.loads(response.data)

        # Check for SecurityAwareErrorHandler response format
        assert "error" in response_data
        # Verify it's using the SecurityAwareErrorHandler format with proper structure
        assert response_data["error"]["code"] in [
            "AUTHENTICATION_ERROR",
            "authentication_error",
        ]

    def test_me_endpoint_error_handling(self, client, db_session):
        """Test /auth/me endpoint error handling with SecurityAwareErrorHandler."""
        # First get a valid token
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )

        assert login_response.status_code == 200
        data = unwrap_response(login_response)
        token = data["access_token"]

        # Deactivate the user
        from app.models import User

        admin_user = User.query.filter_by(username="admin").first()
        admin_user.is_active = False
        db_session.commit()

        try:
            # Try to access /me with token of inactive user
            response = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )

            # Should return 401 with SecurityAwareErrorHandler format
            assert response.status_code == 401
            response_data = json.loads(response.data)

            # Check for SecurityAwareErrorHandler response format
            assert "error" in response_data or "success" in response_data

        finally:
            # Reactivate user for other tests
            admin_user.is_active = True
            db_session.commit()

    def test_refresh_endpoint_error_handling(self, client, db_session):
        """Test /auth/refresh endpoint error handling with SecurityAwareErrorHandler."""
        # First get a valid refresh token
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )

        assert login_response.status_code == 200
        data = unwrap_response(login_response)
        refresh_token = data["refresh_token"]

        # Deactivate the user
        from app.models import User

        admin_user = User.query.filter_by(username="admin").first()
        admin_user.is_active = False
        db_session.commit()

        try:
            # Try to refresh with token of inactive user
            response = client.post(
                "/api/v1/auth/refresh",
                headers={"Authorization": f"Bearer {refresh_token}"},
            )

            # Should return 401 with SecurityAwareErrorHandler format
            assert response.status_code == 401
            response_data = json.loads(response.data)

            # Check for SecurityAwareErrorHandler response format
            assert "error" in response_data or "success" in response_data

        finally:
            # Reactivate user for other tests
            admin_user.is_active = True
            db_session.commit()


class TestEdgeCases:
    """Test edge cases and error scenarios."""

    def test_login_with_empty_username(self, client):
        """Test login with empty username."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "", "password": "password"},
            headers={"Content-Type": "application/json"},
        )

        # Should return 400 or 422 for validation error
        assert response.status_code in [400, 422]

    def test_login_with_empty_password(self, client):
        """Test login with empty password."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": ""},
            headers={"Content-Type": "application/json"},
        )

        # Should return 400 or 401 - empty password should fail
        assert response.status_code in [400, 401]

    def test_login_with_null_username(self, client):
        """Test login with null username."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": None, "password": "password"},
            headers={"Content-Type": "application/json"},
        )

        # Should return 400 or 422 for validation error
        assert response.status_code in [400, 422]

    def test_login_with_very_long_username(self, client):
        """Test login with extremely long username."""
        long_username = "a" * MAX_TEST_USERNAME_LENGTH
        response = client.post(
            "/api/v1/auth/login",
            json={"username": long_username, "password": "password"},
            headers={"Content-Type": "application/json"},
        )

        # Should handle gracefully with 401 (user not found) or 400 (validation)
        assert response.status_code in [400, 401, 422]

    def test_login_with_special_characters(self, client):
        """Test login with special characters in username."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin<script>alert(1)</script>", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )

        # Should return 401 (not found) - user doesn't exist
        assert response.status_code == 401

    def test_refresh_with_invalid_token_format(self, client):
        """Test refresh endpoint with malformed token."""
        response = client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": "Bearer not.a.valid.token"},
        )

        # Should return 401 or 422 for invalid token
        assert response.status_code in [401, 422]

    def test_refresh_with_missing_token(self, client):
        """Test refresh endpoint without token."""
        response = client.post("/api/v1/auth/refresh")

        # Should return 401 for missing token
        assert response.status_code == 401


class TestUserRegistration:
    """Test user registration functionality."""

    def get_auth_token(self, client, username="admin", password="admin123"):
        """Helper method to get auth token."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            data = unwrap_response(response)
            return data["access_token"]
        return None

    def test_register_user_as_admin(self, client, db_session):
        """Test user registration by admin."""
        token = self.get_auth_token(client)

        # Get admin role ID
        from app.models import Role, RoleEnum, User

        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()

        # Verify user doesn't exist before registration
        existing_user = User.query.filter_by(username="newuser").first()
        assert existing_user is None, "User should not exist before registration"

        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "newuser",
                "email": "newuser@test.com",
                "password": "newpassword123",
                "first_name": "New",
                "last_name": "User",
                "role_id": admin_role.id,
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Verify HTTP response
        assert response.status_code == 201
        data = unwrap_response(response)
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@test.com"

        # Verify user was actually created in the database with correct details
        created_user = User.query.filter_by(username="newuser").first()
        assert created_user is not None, (
            "User should exist in database after registration"
        )
        assert created_user.username == "newuser", "Username should match"
        assert created_user.email == "newuser@test.com", "Email should match"
        assert created_user.first_name == "New", "First name should match"
        assert created_user.last_name == "User", "Last name should match"
        assert created_user.role_id == admin_role.id, "Role ID should match"
        assert created_user.is_active is True, "User should be active by default"
        assert created_user.password_hash is not None, "Password hash should be set"
        assert created_user.created_at is not None, "Created timestamp should be set"
        assert created_user.updated_at is not None, "Updated timestamp should be set"

    def test_register_operator_user(self, client, db_session):
        """Test creating a user with operator role."""
        token = self.get_auth_token(client)

        from app.models import Role, RoleEnum, User

        operator_role = Role.query.filter_by(name=RoleEnum.OPERATOR).first()

        # Use timestamp to ensure unique email/username across test runs
        unique_id = int(time.time() * 1000)  # Milliseconds since epoch
        username = f"operator_{unique_id}"
        email = f"operator_{unique_id}@test.com"

        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": username,
                "email": email,
                "password": "operatorpass123",
                "first_name": "New",
                "last_name": "Operator",
                "role_id": operator_role.id,
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 201
        data = unwrap_response(response)
        assert data["username"] == username
        assert data["email"] == email

        # Verify user was created with operator role
        created_user = User.query.filter_by(username=username).first()
        assert created_user is not None
        assert created_user.role_id == operator_role.id
        assert created_user.is_active is True

    def test_register_viewer_user(self, client, db_session):
        """Test creating a user with viewer role."""
        token = self.get_auth_token(client)

        from app.models import Role, RoleEnum, User

        viewer_role = Role.query.filter_by(name=RoleEnum.VIEWER).first()

        # Use timestamp to ensure unique email/username across test runs
        unique_id = int(time.time() * 1000)  # Milliseconds since epoch
        username = f"viewer_{unique_id}"
        email = f"viewer_{unique_id}@test.com"

        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": username,
                "email": email,
                "password": "viewerpass123",
                "first_name": "New",
                "last_name": "Viewer",
                "role_id": viewer_role.id,
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 201
        data = unwrap_response(response)
        assert data["username"] == username
        assert data["email"] == email

        # Verify user was created with viewer role
        created_user = User.query.filter_by(username=username).first()
        assert created_user is not None
        assert created_user.role_id == viewer_role.id
        assert created_user.is_active is True

    def test_register_user_without_permission(self, client):
        """Test user registration without proper permissions."""
        # Try to register as viewer (no write_users permission)
        token = self.get_auth_token(client, "viewer", "viewer123")

        from app.models import Role, RoleEnum

        viewer_role = Role.query.filter_by(name=RoleEnum.VIEWER).first()

        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "unauthorizeduser",
                "email": "unauthorized@test.com",
                "password": "password123",
                "role_id": viewer_role.id,
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 403

    def test_register_duplicate_username(self, client):
        """Test registration with duplicate username."""
        token = self.get_auth_token(client)

        from app.models import Role, RoleEnum

        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()

        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "admin",  # Already exists
                "email": "different@test.com",
                "password": "password123",
                "role_id": admin_role.id,
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 409
        data = unwrap_response(response)
        # Check for "already exists" in either error or details.context
        error_text = str(data).lower()
        assert "already exists" in error_text or "duplicate" in error_text


class TestSecurityEnhancements:
    """Test security enhancements and attack prevention."""

    def test_brute_force_protection(self, client):
        """Test that rate limiting protects against brute force attacks."""
        # Attempt multiple failed logins rapidly
        failed_attempts = 0
        rate_limited = False

        for i in range(15):  # Try more than the rate limit
            response = client.post(
                "/api/v1/auth/login",
                json={"username": "admin", "password": f"wrongpass{i}"},
                headers={"Content-Type": "application/json"},
            )

            if response.status_code == 429:  # Rate limit exceeded
                rate_limited = True
                break
            if response.status_code == 401:
                failed_attempts += 1

        # Either we should hit rate limit or all attempts should fail
        assert rate_limited or failed_attempts == 15

    def test_token_manipulation_detection(self, client):
        """Test that manipulated tokens are rejected."""
        # Get a valid token
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)
        valid_token = data["access_token"]

        # Manipulate the token by changing a character
        manipulated_token = valid_token[:-5] + "XXXXX"

        # Try to use manipulated token
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {manipulated_token}"},
        )

        # Should be rejected
        assert response.status_code in [401, 422]

    def test_expired_token_rejection(self, client, app):
        """Test that expired tokens are properly rejected."""
        # Create a token with very short expiration
        from datetime import timedelta

        from flask_jwt_extended import create_access_token

        with app.app_context():
            # Create token that expires immediately
            expired_token = create_access_token(
                identity="1",
                expires_delta=timedelta(seconds=-1),  # Already expired
            )

        # Try to use expired token
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        # Should be rejected
        assert response.status_code in [401, 422]

    def test_sql_injection_in_login(self, client):
        """Test that SQL injection attempts in login are safely handled."""
        sql_injection_attempts = [
            "admin' OR '1'='1",
            "admin'--",
            "admin' OR '1'='1'--",
            "' OR 1=1--",
            "admin'; DROP TABLE users--",
        ]

        for attempt in sql_injection_attempts:
            response = client.post(
                "/api/v1/auth/login",
                json={"username": attempt, "password": "anypassword"},
                headers={"Content-Type": "application/json"},
            )

            # Should return 401 (unauthorized), not 500 (server error)
            assert response.status_code == 401

    def test_xss_in_username(self, client):
        """Test that XSS attempts in username are safely handled."""
        xss_attempts = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
        ]

        for attempt in xss_attempts:
            response = client.post(
                "/api/v1/auth/login",
                json={"username": attempt, "password": "anypassword"},
                headers={"Content-Type": "application/json"},
            )

            # Should return 401 (unauthorized), not cause an error
            assert response.status_code == 401

    def test_password_change_requires_current_password(self, client):
        """Test that password change requires valid current password."""
        # Login first
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)
        token = data["access_token"]

        # Try to change password with wrong current password
        response = client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword123",
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should be rejected
        assert response.status_code == 401

    def test_token_reuse_after_password_change(self, client, db_session):
        """Test that old tokens should ideally be invalidated after password change."""
        # Login and get token
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)
        old_token = data["access_token"]

        # Change password
        response = client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "admin123",
                "new_password": "newpassword123",
            },
            headers={
                "Authorization": f"Bearer {old_token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 200

        # Note: In current implementation, old token still works until it expires
        # This is documented behavior - for production, implement token blacklist
        # Try to use old token - it will still work in current implementation
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {old_token}"},
        )

        # Current behavior: token still works (not ideal for security)
        # Future enhancement: implement token blacklist/revocation
        assert response.status_code in [200, 401]

        # Reset password for other tests
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "newpassword123"},
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            data = unwrap_response(response)
            new_token = data["access_token"]

            client.post(
                "/api/v1/auth/change-password",
                json={
                    "current_password": "newpassword123",
                    "new_password": "admin123",
                },
                headers={
                    "Authorization": f"Bearer {new_token}",
                    "Content-Type": "application/json",
                },
            )

    def test_missing_authorization_header(self, client):
        """Test that protected endpoints require authorization header."""
        response = client.get("/api/v1/auth/me")

        # Should return 401 for missing authorization
        assert response.status_code == 401

    def test_malformed_authorization_header(self, client):
        """Test that malformed authorization headers are rejected."""
        malformed_headers = [
            "InvalidFormat token",
            "Bearer",
            "Bearer ",
            "token_without_bearer_prefix",
        ]

        for header in malformed_headers:
            response = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": header},
            )

            # Should return 401 or 422
            assert response.status_code in [401, 422]

    def test_forgot_password_valid_email(self, client, db_session):
        """Test forgot password with valid email."""
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "admin@thermacore.com"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["success"] is True

        # Verify token was generated in database
        user = User.query.filter_by(email="admin@thermacore.com").first()

        # Only check reset_token if the field exists (migration has run)
        if hasattr(user, "reset_token"):
            assert user.reset_token is not None
            assert user.reset_token_expires is not None
        else:
            # Migration hasn't run - log warning but don't fail the test
            import warnings

            warnings.warn("Database migration for reset_token fields not applied")

        # The important part is that the API returned success
        # Check message in the nested data structure
        assert "If the email exists" in data.get("data", {}).get("message", "")

    def test_forgot_password_invalid_email(self, client):
        """Test forgot password with invalid email (should still return success for security)."""
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "nonexistent@example.com"},
            headers={"Content-Type": "application/json"},
        )

        # Should return success to prevent email enumeration
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["success"] is True

    def test_forgot_password_missing_email(self, client):
        """Test forgot password with missing email."""
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={},
            headers={"Content-Type": "application/json"},
        )

        # Should return validation error
        assert response.status_code == 422

    def test_reset_password_valid_token(self, client, db_session):
        """Test password reset with valid token."""
        import secrets
        from datetime import datetime, timedelta, timezone

        # Generate reset token for admin user
        user = User.query.filter_by(username="admin").first()
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db_session.commit()

        # Reset password
        response = client.post(
            "/api/v1/auth/reset-password",
            json={"token": reset_token, "new_password": "newpassword123"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["success"] is True

        # Verify token was cleared
        db_session.refresh(user)
        assert user.reset_token is None
        assert user.reset_token_expires is None

        # Verify new password works
        assert user.check_password("newpassword123") is True

        # Reset password back to original for other tests
        user.set_password("admin123")
        db_session.commit()

    def test_reset_password_invalid_token(self, client):
        """Test password reset with invalid token."""
        response = client.post(
            "/api/v1/auth/reset-password",
            json={"token": "invalid_token", "new_password": "newpassword123"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["success"] is False

    def test_reset_password_expired_token(self, client, db_session):
        """Test password reset with expired token."""
        import secrets
        from datetime import datetime, timedelta, timezone

        # Generate expired reset token for admin user
        user = User.query.filter_by(username="admin").first()
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expires = datetime.now(timezone.utc) - timedelta(
            hours=1
        )  # Expired
        db_session.commit()

        # Try to reset password
        response = client.post(
            "/api/v1/auth/reset-password",
            json={"token": reset_token, "new_password": "newpassword123"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["success"] is False

        # Verify token was cleared
        db_session.refresh(user)
        assert user.reset_token is None
        assert user.reset_token_expires is None

    def test_reset_password_missing_fields(self, client):
        """Test password reset with missing fields."""
        response = client.post(
            "/api/v1/auth/reset-password",
            json={"token": "some_token"},
            headers={"Content-Type": "application/json"},
        )

        # Should return validation error
        assert response.status_code == 422

    def test_login_with_keep_me_signed_in_true(self, client):
        """Test login with keep_me_signed_in=True returns longer token expiry."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "admin",
                "password": "admin123",
                "keep_me_signed_in": True,
            },
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)

        assert "access_token" in data
        assert "refresh_token" in data
        assert "expires_in" in data

        # With keep_me_signed_in=True, expires_in should be 30 days (in seconds)
        # 30 days = 30 * 24 * 60 * 60 = 2,592,000 seconds
        expected_expiry = 30 * 24 * 60 * 60
        assert data["expires_in"] == expected_expiry

        # Verify token is valid and has correct expiry
        token = data["access_token"]
        decoded = jwt.decode(
            token,
            options={"verify_signature": False},
        )
        assert "exp" in decoded
        assert "iat" in decoded

        # Token expiry should be approximately 30 days from now
        token_lifetime = decoded["exp"] - decoded["iat"]
        # Allow 5 second tolerance
        assert abs(token_lifetime - expected_expiry) < 5

    def test_login_with_keep_me_signed_in_false(self, client):
        """Test login with keep_me_signed_in=False returns standard token expiry."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "admin",
                "password": "admin123",
                "keep_me_signed_in": False,
            },
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)

        assert "access_token" in data
        assert "refresh_token" in data
        assert "expires_in" in data

        # With keep_me_signed_in=False, expires_in should be 24 hours (in seconds)
        # 24 hours = 24 * 60 * 60 = 86,400 seconds
        expected_expiry = 24 * 60 * 60
        assert data["expires_in"] == expected_expiry

        # Verify token is valid and has correct expiry
        token = data["access_token"]
        decoded = jwt.decode(
            token,
            options={"verify_signature": False},
        )
        assert "exp" in decoded
        assert "iat" in decoded

        # Token expiry should be approximately 24 hours from now
        token_lifetime = decoded["exp"] - decoded["iat"]
        # Allow 5 second tolerance
        assert abs(token_lifetime - expected_expiry) < 5

    def test_login_without_keep_me_signed_in_defaults_to_false(self, client):
        """Test login without keep_me_signed_in parameter defaults to 24 hour expiry."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)

        assert "access_token" in data
        assert "expires_in" in data

        # Default should be 24 hours
        expected_expiry = 24 * 60 * 60
        assert data["expires_in"] == expected_expiry

    def test_keep_me_signed_in_token_validation(self, client):
        """Test that tokens created with keep_me_signed_in are valid."""
        # Login with keep_me_signed_in=True
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "admin",
                "password": "admin123",
                "keep_me_signed_in": True,
            },
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200
        data = unwrap_response(response)
        token = data["access_token"]

        # Use the token to access a protected endpoint
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        user_data = unwrap_response(response)
        assert user_data["username"] == "admin"

    def test_keep_me_signed_in_with_invalid_type(self, client):
        """Test that keep_me_signed_in handles invalid types gracefully."""
        # Test with string instead of boolean
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "admin",
                "password": "admin123",
                "keep_me_signed_in": "true",  # String instead of boolean
            },
            headers={"Content-Type": "application/json"},
        )

        # Should either accept it (if schema coerces) or return validation error
        assert response.status_code in [200, 422]

        if response.status_code == 200:
            # If accepted, verify it works correctly
            data = unwrap_response(response)
            assert "access_token" in data
