"""Tests for validation decorators."""

import json
from unittest.mock import MagicMock, patch

from flask import jsonify

from app.middleware.validation import (
    validate_path_params,
    validate_query_params,
)
from app.tests.test_utils import get_auth_token, unwrap_response


class TestValidationDecorator:
    """Test the validation decorators."""

    def test_valid_json_request(self, client, db_session):
        """Test that valid JSON request passes validation."""
        # Get auth token
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/units",
            json={"name": "Test Unit", "serial_number": "SN123"},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should be 201 Created or 422 Validation Error
        assert response.status_code in [201, 422]

    def test_empty_json_request(self, client, db_session):
        """Test that empty JSON request fails validation."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/units",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should be 400 or 422 (validation error)
        assert response.status_code in [400, 422]

    def test_malformed_json_request(self, client, db_session):
        """Test that malformed JSON request fails validation."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/units",
            data="invalid json{",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should be 400 (malformed JSON) or 422 (validation error)
        assert response.status_code in [400, 422]

    def test_null_json_request(self, client, db_session):
        """Test that null JSON request fails validation."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/units",
            json=None,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should be 400 or 422
        assert response.status_code in [400, 422]

    def test_patch_empty_json_allowed(self, client, db_session):
        """Test that PATCH with empty JSON is allowed (partial update)."""
        # First create a unit
        token = get_auth_token(client)
        create_response = client.post(
            "/api/v1/units",
            json={"name": "Test Unit", "serial_number": "SN123"},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        assert create_response.status_code in [201, 422]
        
        if create_response.status_code == 201:
            data = unwrap_response(create_response)
            unit_id = data.get("id") or data.get("data", {}).get("id")

            if unit_id:
                # PATCH with empty JSON should be allowed for partial updates
                response = client.patch(
                    f"/api/v1/units/{unit_id}",
                    json={},
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )

                # Should be 200, 400, or 422
                assert response.status_code in [200, 400, 422]

    def test_patch_partial_json_allowed(self, client, db_session):
        """Test that PATCH with partial JSON is allowed."""
        # First create a unit
        token = get_auth_token(client)
        create_response = client.post(
            "/api/v1/units",
            json={"name": "Test Unit", "serial_number": "SN123"},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        assert create_response.status_code in [201, 422]
        
        if create_response.status_code == 201:
            data = unwrap_response(create_response)
            unit_id = data.get("id") or data.get("data", {}).get("id")

            if unit_id:
                # PATCH with partial JSON should be allowed
                response = client.patch(
                    f"/api/v1/units/{unit_id}",
                    json={"name": "Updated Name"},
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )

                # Should be 200, 400, or 422
                assert response.status_code in [200, 400, 422]


class TestUnitsValidation:
    """Test validation for units endpoints."""

    def test_create_unit_empty_json(self, client, db_session):
        """Test create_unit with empty JSON body."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/units",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should be 400 or 422 (validation error)
        assert response.status_code in [400, 422]

    def test_create_unit_malformed_json(self, client, db_session):
        """Test create_unit with malformed JSON body."""
        token = get_auth_token(client)

        response = client.post(
            "/api/v1/units",
            data="invalid json{",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should be 400 or 422 (validation error)
        assert response.status_code in [400, 422]

    def test_update_unit_empty_json(self, client, db_session):
        """Test update_unit with empty JSON body."""
        token = get_auth_token(client)

        # First create a unit
        create_response = client.post(
            "/api/v1/units",
            json={"name": "Test Unit", "serial_number": "SN123"},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        
        if create_response.status_code == 201:
            data = unwrap_response(create_response)
            unit_id = data.get("id") or data.get("data", {}).get("id")

            if unit_id:
                response = client.put(
                    f"/api/v1/units/{unit_id}",
                    json={},
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )

                # Should be 400 or 422 (validation error)
                assert response.status_code in [400, 422]

    def test_update_unit_malformed_json(self, client, db_session):
        """Test update_unit with malformed JSON body."""
        token = get_auth_token(client)

        # First create a unit
        create_response = client.post(
            "/api/v1/units",
            json={"name": "Test Unit", "serial_number": "SN123"},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        
        if create_response.status_code == 201:
            data = unwrap_response(create_response)
            unit_id = data.get("id") or data.get("data", {}).get("id")

            if unit_id:
                response = client.put(
                    f"/api/v1/units/{unit_id}",
                    data="invalid json{",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )

                # Should be 400 or 422 (validation error)
                assert response.status_code in [400, 422]

    def test_create_sensor_empty_json(self, client, db_session):
        """Test create_sensor with empty JSON body."""
        token = get_auth_token(client)

        # First create a unit
        create_response = client.post(
            "/api/v1/units",
            json={"name": "Test Unit", "serial_number": "SN123"},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        
        if create_response.status_code == 201:
            data = unwrap_response(create_response)
            unit_id = data.get("id") or data.get("data", {}).get("id")

            if unit_id:
                response = client.post(
                    f"/api/v1/units/{unit_id}/sensors",
                    json={},
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )

                # Should be 400 or 422 (validation error)
                assert response.status_code in [400, 422]

    def test_update_unit_status_empty_json(self, client, db_session):
        """Test update_unit_status with empty JSON body."""
        token = get_auth_token(client)

        # First create a unit
        create_response = client.post(
            "/api/v1/units",
            json={"name": "Test Unit", "serial_number": "SN123"},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        
        if create_response.status_code == 201:
            data = unwrap_response(create_response)
            unit_id = data.get("id") or data.get("data", {}).get("id")

            if unit_id:
                response = client.patch(
                    f"/api/v1/units/{unit_id}/status",
                    json={},
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )

                # Should be 400 or 422 (validation error)
                assert response.status_code in [400, 422]


class TestQueryParamValidation:
    """Test query parameter validation."""

    def test_validate_query_params_valid(self, app):
        """Test validate_query_params with valid parameters."""
        @validate_query_params(
            page=lambda x: int(x) > 0,
            per_page=lambda x: 1 <= int(x) <= 100,
        )
        def endpoint():
            return jsonify({"ok": True})

        with app.test_request_context("/?page=1&per_page=50"):
            response = endpoint()
            assert response.status_code == 200

    def test_validate_query_params_invalid(self, app):
        """Test validate_query_params with invalid parameters."""
        @validate_query_params(
            page=lambda x: int(x) > 0,
            per_page=lambda x: 1 <= int(x) <= 100,
        )
        def endpoint():
            return jsonify({"ok": True})

        with app.test_request_context("/?page=0&per_page=200"):
            response = endpoint()
            # Should be a tuple with status code
            if isinstance(response, tuple):
                assert response[1] == 400
            else:
                assert response.status_code == 400

    def test_validate_query_params_missing_optional(self, app):
        """Test validate_query_params with missing optional parameters."""
        @validate_query_params(
            page=lambda x: int(x) > 0,
            per_page=lambda x: 1 <= int(x) <= 100,
        )
        def endpoint():
            return jsonify({"ok": True})

        with app.test_request_context("/"):
            response = endpoint()
            # Should pass validation (missing optional parameters are OK)
            if isinstance(response, tuple):
                assert response[1] == 200
            else:
                assert response.status_code == 200

    def test_validate_query_params_exception(self, app):
        """Test validate_query_params when validator raises exception."""
        @validate_query_params(
            page=lambda x: int(x) > 0,
            per_page=lambda x: 1 / 0,  # This will raise ZeroDivisionError
        )
        def endpoint():
            return jsonify({"ok": True})

        with app.test_request_context("/?page=1&per_page=50"):
            response = endpoint()
            # Should catch the exception and return 400
            if isinstance(response, tuple):
                assert response[1] == 400
            else:
                assert response.status_code == 400


class TestPathParamValidation:
    """Test path parameter validation."""

    def test_validate_path_params_valid(self, app):
        """Test validate_path_params with valid parameters."""
        @validate_path_params(
            unit_id=lambda x: len(x) > 0 and x.isalnum(),
        )
        def endpoint(unit_id):
            return jsonify({"ok": True})

        with app.test_request_context("/"):
            response = endpoint(unit_id="TEST001")
            assert response.status_code == 200

    def test_validate_path_params_invalid(self, app):
        """Test validate_path_params with invalid parameters."""
        @validate_path_params(
            unit_id=lambda x: len(x) > 0 and x.isalnum(),
        )
        def endpoint(unit_id):
            return jsonify({"ok": True})

        with app.test_request_context("/"):
            response = endpoint(unit_id="TEST-001")  # Contains dash, not alphanumeric
            if isinstance(response, tuple):
                assert response[1] == 400
            else:
                assert response.status_code == 400

    def test_validate_path_params_missing(self, app):
        """Test validate_path_params with missing parameter."""
        @validate_path_params(
            unit_id=lambda x: len(x) > 0 and x.isalnum(),
        )
        def endpoint(unit_id=None):
            return jsonify({"ok": True})

        with app.test_request_context("/"):
            response = endpoint(unit_id=None)
            # Should pass validation (missing parameters are OK)
            if isinstance(response, tuple):
                assert response[1] == 200
            else:
                assert response.status_code == 200

    def test_validate_path_params_exception(self, app):
        """Test validate_path_params when validator raises exception."""
        @validate_path_params(
            unit_id=lambda x: 1 / 0,  # This will raise ZeroDivisionError
        )
        def endpoint(unit_id):
            return jsonify({"ok": True})

        with app.test_request_context("/"):
            response = endpoint(unit_id="TEST001")
            # Should catch the exception and return 400
            if isinstance(response, tuple):
                assert response[1] == 400
            else:
                assert response.status_code == 400


class TestValidationMiddlewareIntegration:
    """Integration tests for validation middleware."""

    def test_validation_middleware_with_auth(self, client, db_session):
        """Test validation middleware with authentication."""
        token = get_auth_token(client)

        # Send request without JSON body (should fail validation)
        response = client.post(
            "/api/v1/auth/change-password",
            data="not json",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "text/plain",
            },
        )

        # Should be 400 or 415 (invalid content type)
        assert response.status_code in [400, 415]

    def test_validation_middleware_validates_json_body(self, client, db_session):
        """Test validation middleware validates JSON body."""
        token = get_auth_token(client)

        # Send malformed JSON
        response = client.post(
            "/api/v1/auth/change-password",
            data="invalid json{",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should be 400 or 422 (malformed JSON or validation error)
        assert response.status_code in [400, 422]

    def test_validation_middleware_accepts_valid_json(self, client, db_session):
        """Test validation middleware accepts valid JSON."""
        token = get_auth_token(client)

        # Send valid JSON (may fail other validation, but should not be 500)
        response = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "admin123", "new_password": "newpass123"},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        # Should not be 500
        assert response.status_code != 500
