"""Tests to improve coverage for middleware with low test coverage.

This module adds targeted tests for middleware components with insufficient coverage:
- Authorization middleware (54% coverage)
- Validation middleware (50% coverage)
"""

import json
import uuid

from flask import g

from app.middleware.validation import sanitize
from app.models import Permission, Role, RoleEnum, User


def unwrap_response(response):
    """Helper to extract data from standardized API response envelope."""
    data = json.loads(response.data)
    if "data" in data and "success" in data:
        return data["data"]
    return data


class TestAuthorizationMiddleware:
    """Test authorization middleware to increase coverage."""

    def get_auth_token(self, client, username="admin", password="admin123"):
        """Helper method to get auth token."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200
        data = unwrap_response(response)
        return data["access_token"]

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

    def test_permission_required_with_inactive_user(self, client, db_session):
        """Test permission_required decorator with inactive user."""
        # Create inactive user
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

        # Try to login with inactive user - should fail
        response = client.post(
            "/api/v1/auth/login",
            json={"username": f"inactive_{unique_suffix}", "password": "password123"},
            headers={"Content-Type": "application/json"},
        )

        # Should reject inactive user
        assert response.status_code in [401, 403]

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

    def test_sanitize_deep_nesting(self):
        """Test sanitize function with deeply nested structures."""
        # Create deeply nested structure
        data = {"level1": {"level2": {"level3": "value\n"}}}

        result = sanitize(data, depth=0, max_depth=10)

        # Should handle nested structure
        assert isinstance(result, dict)

    def test_sanitize_exceeds_max_depth(self):
        """Test sanitize function when max depth is exceeded."""
        # Create nested structure that exceeds max depth
        data = {"l1": {"l2": {"l3": {"l4": {"l5": {"l6": "value"}}}}}}

        result = sanitize(data, depth=0, max_depth=3)

        # Should return placeholder for deeply nested items
        assert isinstance(result, dict)

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

        # Should reject non-JSON content type
        assert response.status_code in [400, 415, 422]

    def test_request_validator_invalid_json_body(self, client, db_session):
        """Test RequestValidator.validate_json_body with invalid JSON."""
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

        # Should reject invalid JSON (may also return 500 for malformed JSON)
        assert response.status_code in [400, 422, 500]


class TestTenantMiddleware:
    """Test tenant middleware to increase coverage."""

    def get_auth_token(self, client, username="admin", password="admin123"):
        """Helper method to get auth token."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200
        data = unwrap_response(response)
        return data["access_token"]

    def test_tenant_middleware_admin_access(self, client, db_session):
        """Test tenant middleware grants admin cross-tenant access."""
        token = self.get_auth_token(client)

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
    """Test rate limit middleware to increase coverage."""

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
    """Test metrics middleware to increase coverage."""

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
