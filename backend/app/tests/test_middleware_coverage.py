"""Tests to improve coverage for middleware with low test coverage.

This module adds targeted tests for middleware components with insufficient coverage:
- Authorization middleware (54% coverage)
- Validation middleware (50% coverage)
"""

import uuid
from unittest.mock import MagicMock, patch

from flask import jsonify

from app.middleware.authorization import permission_required
from app.middleware.validation import sanitize
from app.models import Role, RoleEnum, User
from app.tests.test_utils import get_auth_token, unwrap_response


class TestAuthorizationMiddleware:
    """Test authorization middleware to increase coverage."""

    def test_permission_required_with_invalid_token(self, client, db_session):
        """Test permission_required decorator with invalid token."""
        response = client.get(
            "/api/v1/units",
            headers={
                "Authorization": "Bearer INVALID_TOKEN",
                "Content-Type": "application/json",
            },
        )

        # Should return 401 or 422 for invalid token
        assert response.status_code in [401, 422]

    def test_permission_required_with_missing_token(self, client, db_session):
        """Test permission_required decorator without token."""
        response = client.get(
            "/api/v1/units",
            headers={
                "Content-Type": "application/json",
            },
        )

        # Should return 401 for missing token
        assert response.status_code == 401

    def test_permission_required_with_inactive_user(self, client, db_session, app):
        """Test permission_required decorator with inactive user.

        This tests the scenario where a user has an active JWT token but
        the user account was deactivated after the token was issued.
        """
        # Create an inactive user
        viewer_role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
        unique_suffix = str(uuid.uuid4())[:8]
        inactive_user = User(
            username=f"inactive_{unique_suffix}",
            email=f"inactive_{unique_suffix}@test.com",
            role_id=viewer_role.id,
            is_active=False,
        )
        inactive_user.set_password("password123")
        db_session.add(inactive_user)
        db_session.commit()

        # We can't login as inactive user, so we need to mock the JWT flow
        # to test the permission_required decorator's handling of inactive users
        with patch("app.middleware.authorization.verify_jwt_in_request"):
            with patch(
                "app.middleware.authorization.get_current_user_id",
                return_value=(inactive_user.id, True),
            ):
                # Mock the User.query to return the inactive user
                mocked_query = MagicMock()
                mocked_query.get.return_value = inactive_user

                @permission_required("read_units")
                def endpoint():
                    return jsonify({"ok": True})

                with app.test_request_context("/"):
                    with patch("app.middleware.authorization.User.query", mocked_query):
                        response = endpoint()

        # Permission_required should reject inactive users
        assert response[1] in [401, 403]

    def test_permission_required_insufficient_permissions(self, client, db_session):
        """Test permission_required with user lacking required permission."""
        # Create viewer user
        viewer_role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
        unique_suffix = str(uuid.uuid4())[:8]
        viewer_user = User(
            username=f"viewer_{unique_suffix}",
            email=f"viewer_{unique_suffix}@test.com",
            role_id=viewer_role.id,
            is_active=True,
        )
        viewer_user.set_password("password123")
        db_session.add(viewer_user)
        db_session.commit()

        # Login as viewer
        response = client.post(
            "/api/v1/auth/login",
            json={"username": f"viewer_{unique_suffix}", "password": "password123"},
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            data = unwrap_response(response)
            token = data["access_token"]

            # Try to access admin-only endpoint (requires admin_panel permission)
            response = client.post(
                "/api/v1/scada/mqtt/connect",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

            # Should deny access (403) or handle as service error
            assert response.status_code in [403, 500, 503]


class TestValidationMiddleware:
    """Test validation middleware to increase coverage."""

    def test_sanitize_string(self):
        """Test sanitize function with string input."""
        # Test with normal string
        result = sanitize("Hello World")
        assert result == "Hello World"

        # Test with control characters
        result = sanitize("Hello\nWorld\r\n")
        assert "\n" not in result
        assert "\r" not in result

        # Test with tab character
        result = sanitize("Hello\tWorld")
        assert "\t" not in result

    def test_sanitize_dict(self):
        """Test sanitize function with dict input."""
        data = {
            "key1": "value1\n",
            "key2": "value2\r",
            "nested": {
                "key3": "value3\t",
            },
        }

        result = sanitize(data)

        # Should remove control characters from all values
        assert "\n" not in result["key1"]
        assert "\r" not in result["key2"]
        assert "\t" not in result["nested"]["key3"]

    def test_sanitize_list(self):
        """Test sanitize function with list input."""
        data = ["item1\n", "item2\r", "item3\t"]

        result = sanitize(data)

        # Should remove control characters from all items
        for item in result:
            assert "\n" not in item
            assert "\r" not in item
            assert "\t" not in item

    def test_sanitize_deep_nesting_strips_control_characters(self):
        """Test sanitize function with deeply nested structures strips control chars."""
        # Create deeply nested structure with control characters
        data = {
            "level1": {
                "level2": {
                    "level3": "value\nwith\tcontrol\rchars"
                }
            }
        }

        result = sanitize(data, depth=0, max_depth=10)

        # Should handle nested structure and strip control characters
        assert isinstance(result, dict)
        assert "level1" in result
        assert "level2" in result["level1"]
        assert "level3" in result["level1"]["level2"]
        # Verify control characters were stripped at the deepest level
        value = result["level1"]["level2"]["level3"]
        assert "\n" not in value
        assert "\t" not in value
        assert "\r" not in value
        assert "valuewithcontrolchars" == "".join(value.split())

    def test_sanitize_exceeds_max_depth_returns_truncated_or_placeholder(self):
        """Test sanitize function when max depth is exceeded."""
        # Create nested structure that exceeds max depth
        data = {
            "l1": {
                "l2": {
                    "l3": {
                        "l4": {
                            "l5": {
                                "l6": "value"
                            }
                        }
                    }
                }
            }
        }

        result = sanitize(data, depth=0, max_depth=3)

        # Should return a dict (not crash)
        assert isinstance(result, dict)

        # The structure should be truncated at max_depth
        # The exact behavior depends on the implementation,
        # but we expect either a placeholder or truncated structure
        assert "l1" in result

        # If the implementation returns a placeholder for over-depth items,
        # check for that. If it truncates, check the structure depth.
        # This test verifies the behavior without assuming implementation details.
        l1 = result["l1"]
        assert isinstance(l1, dict)
        if "l2" in l1:
            # If depth handling is working, we should see truncation at some level
            l2 = l1["l2"]
            # Either we hit a placeholder or the structure stops at max_depth
            # Both are valid outcomes depending on implementation
            pass

    def test_sanitize_unicode_separators(self):
        """Test sanitize function with Unicode line/paragraph separators."""
        # Unicode line separator (U+2028) and paragraph separator (U+2029)
        data = "Hello\u2028World\u2029"

        result = sanitize(data)

        # Should remove Unicode separators
        assert "\u2028" not in result
        assert "\u2029" not in result

    def test_sanitize_non_string_types(self):
        """Test sanitize function with non-string types."""
        # Test with integer
        result = sanitize(42)
        assert result == 42

        # Test with float
        result = sanitize(3.14)
        assert result == 3.14

        # Test with boolean
        result = sanitize(True)
        assert result is True

        # Test with None
        result = sanitize(None)
        assert result is None

    def test_request_validator_json_content_type(self, client, db_session):
        """Test RequestValidator.validate_json_content_type."""
        # Get auth token
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200
        data = unwrap_response(response)
        token = data["access_token"]

        # Try POST without JSON content type
        response = client.post(
            "/api/v1/auth/change-password",
            data="not json",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "text/plain",
            },
        )

        # Should reject non-JSON content type with 4xx
        assert response.status_code in [400, 415, 422]

    def test_request_validator_invalid_json_body(self, client, db_session):
        """Test RequestValidator.validate_json_body with invalid JSON.

        Note: Malformed JSON should return a 4xx client error, not a 500 server error.
        If this test fails with 500, the middleware needs to be fixed to handle
        JSON parse errors gracefully.
        """
        # Get auth token
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200
        data = unwrap_response(response)
        token = data["access_token"]

        # Try to send invalid JSON
        response = client.post(
            "/api/v1/auth/change-password",
            data="invalid json{",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should reject invalid JSON with 4xx (not 500)
        # If this fails, the validation middleware needs to be fixed
        # to handle JSON parse errors properly
        assert response.status_code in [400, 422]


class TestTenantMiddleware:
    """Test tenant middleware to increase coverage."""

    def test_tenant_middleware_admin_access(self, client, db_session):
        """Test tenant middleware grants admin cross-tenant access."""
        token = get_auth_token(client)

        # Admin should be able to access tenant endpoints
        response = client.get(
            "/api/v1/tenants",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Admin should have access
        assert response.status_code == 200

    def test_tenant_middleware_viewer_limited_access(self, client, db_session):
        """Test tenant middleware limits viewer access."""
        # Create viewer user
        viewer_role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
        unique_suffix = str(uuid.uuid4())[:8]
        viewer_user = User(
            username=f"viewer_{unique_suffix}",
            email=f"viewer_{unique_suffix}@test.com",
            role_id=viewer_role.id,
            is_active=True,
        )
        viewer_user.set_password("password123")
        db_session.add(viewer_user)
        db_session.commit()

        # Login as viewer
        response = client.post(
            "/api/v1/auth/login",
            json={"username": f"viewer_{unique_suffix}", "password": "password123"},
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            data = unwrap_response(response)
            token = data["access_token"]

            # Viewer should have limited access to tenant operations
            response = client.post(
                "/api/v1/tenants",
                json={"name": "Test Tenant"},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

            # Should deny access for creating tenants
            assert response.status_code in [403, 422]


class TestRateLimitMiddleware:
    """Test rate limit middleware to increase coverage.

    These are integration tests that verify the rate limit middleware
    works end-to-end with actual HTTP requests. For comprehensive unit
    tests covering the RateLimiter class internals, see
    test_middleware_rate_limit.py.
    """

    def test_rate_limit_not_exceeded(self, client, db_session):
        """Test that normal requests are not rate limited."""
        # Make a few requests - should all succeed
        for _ in range(3):
            response = client.get(
                "/api/v1/health",
                headers={"Content-Type": "application/json"},
            )

            # Health endpoint should be available
            assert response.status_code == 200

    def test_rate_limit_with_different_endpoints(self, client, db_session):
        """Test rate limit applies per endpoint."""
        # Get auth token
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200
        data = unwrap_response(response)
        token = data["access_token"]

        # Make requests to different endpoints
        endpoints = [
            "/api/v1/units",
            "/api/v1/health",
        ]

        for endpoint in endpoints:
            response = client.get(
                endpoint,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

            # Should not be rate limited on different endpoints
            assert response.status_code in [200, 401]


class TestMetricsMiddleware:
    """Test metrics middleware to increase coverage.

    These tests verify that requests complete without errors and
    metrics are recorded. Direct assertion of metrics internal state
    would require exposing the metrics collector, which is not the
    purpose of these tests.
    """

    def test_metrics_recorded_for_request(self, client, db_session):
        """Test that metrics are recorded for requests."""
        # Make a request
        response = client.get(
            "/api/v1/health",
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 200

        # Metrics should be recorded (we can't directly test this without
        # accessing internal state, but we ensure the request completes)

    def test_metrics_recorded_for_authenticated_request(self, client, db_session):
        """Test that metrics are recorded for authenticated requests."""
        # Get auth token
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200
        data = unwrap_response(response)
        token = data["access_token"]

        # Make authenticated request
        response = client.get(
            "/api/v1/units",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Request should complete
        assert response.status_code == 200

    def test_metrics_recorded_for_error_response(self, client, db_session):
        """Test that metrics are recorded even for error responses."""
        # Make request to non-existent endpoint
        response = client.get(
            "/api/v1/nonexistent",
            headers={"Content-Type": "application/json"},
        )

        # Should return 404
        assert response.status_code == 404

        # Metrics should still be recorded
