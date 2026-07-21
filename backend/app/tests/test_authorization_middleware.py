"""Tests for authorization middleware."""

from unittest.mock import MagicMock, patch

from flask import jsonify

from app.middleware.authorization import (
    _ensure_user_has_role,
    permission_required,
    role_required,
)


def test_ensure_user_has_role():
    """Test defensive role checks on user objects."""
    # User with valid role
    user_ok = MagicMock()
    user_ok.role = MagicMock()
    user_ok.role_id = 1
    assert _ensure_user_has_role(user_ok) is True

    # User with no role
    user_no_role = MagicMock()
    user_no_role.role = None
    user_no_role.role_id = None
    user_no_role.username = "bad_user"
    user_no_role.id = 99
    assert _ensure_user_has_role(user_no_role) is False


def test_permission_required_decorator(app):
    """Test permission_required decorator under different scenarios."""

    @permission_required("read_units")
    def dummy_endpoint():
        return jsonify({"success": True})

    # Scenario 1: JWT token invalid or get_current_user_id fails
    with app.test_request_context():
        with (
            patch("app.middleware.authorization.verify_jwt_in_request") as mock_verify,
            patch(
                "app.middleware.authorization.get_current_user_id",
                return_value=(None, False),
            ),
            patch("app.middleware.authorization.audit_permission_check") as mock_audit,
        ):
            res = dummy_endpoint()
            assert res[1] == 401
            assert mock_audit.called

    # Scenario 2: User not found
    with app.test_request_context():
        with (
            patch("app.middleware.authorization.verify_jwt_in_request"),
            patch(
                "app.middleware.authorization.get_current_user_id",
                return_value=(10, True),
            ),
            patch("app.models.User.query") as mock_query,
            patch("app.middleware.authorization.audit_permission_check") as mock_audit,
        ):
            mock_query.get.return_value = None
            res = dummy_endpoint()
            assert res[1] == 401

    # Scenario 3: User is inactive
    with app.test_request_context():
        with (
            patch("app.middleware.authorization.verify_jwt_in_request"),
            patch(
                "app.middleware.authorization.get_current_user_id",
                return_value=(10, True),
            ),
            patch("app.models.User.query") as mock_query,
            patch("app.middleware.authorization.audit_permission_check") as mock_audit,
        ):
            mock_user = MagicMock()
            mock_user.is_active = False
            mock_query.get.return_value = mock_user
            res = dummy_endpoint()
            assert res[1] == 401

    # Scenario 4: Emergency admin bypass - Success (has permissions)
    with app.test_request_context():
        with (
            patch("app.middleware.authorization.verify_jwt_in_request"),
            patch(
                "app.middleware.authorization.get_current_user_id",
                return_value=(10, True),
            ),
            patch("app.models.User.query") as mock_query,
            patch("app.middleware.authorization.audit_permission_check") as mock_audit,
        ):
            mock_user = MagicMock()
            mock_user.username = "emergency_admin"
            mock_user.is_active = True
            mock_user.permissions = ["admin_all"]
            mock_user.role.name.value = "admin"
            mock_query.get.return_value = mock_user

            res = dummy_endpoint()
            # If successful, returns the return value of dummy_endpoint, which is a Flask response
            assert res.status_code == 200

    # Scenario 5: Emergency admin bypass - Failed (no permissions configured, falls back to normal check)
    with app.test_request_context():
        with (
            patch("app.middleware.authorization.verify_jwt_in_request"),
            patch(
                "app.middleware.authorization.get_current_user_id",
                return_value=(10, True),
            ),
            patch("app.models.User.query") as mock_query,
            patch("app.middleware.authorization.audit_permission_check") as mock_audit,
        ):
            mock_user = MagicMock()
            mock_user.username = "emergency_admin"
            mock_user.is_active = True
            mock_user.permissions = []  # Empty permissions
            # Normal check should fail because has_permission is False
            mock_user.has_permission.return_value = False
            mock_user.role.name.value = "admin"
            mock_query.get.return_value = mock_user

            res = dummy_endpoint()
            assert res[1] == 403

    # Scenario 6: Normal User - Insufficient permissions
    with app.test_request_context():
        with (
            patch("app.middleware.authorization.verify_jwt_in_request"),
            patch(
                "app.middleware.authorization.get_current_user_id",
                return_value=(10, True),
            ),
            patch("app.models.User.query") as mock_query,
            patch("app.middleware.authorization.audit_permission_check") as mock_audit,
        ):
            mock_user = MagicMock()
            mock_user.username = "operator"
            mock_user.is_active = True
            mock_user.has_permission.return_value = False
            mock_user.role.name.value = "operator"
            mock_query.get.return_value = mock_user

            res = dummy_endpoint()
            assert res[1] == 403

    # Scenario 7: Normal User - Has permission
    with app.test_request_context():
        with (
            patch("app.middleware.authorization.verify_jwt_in_request"),
            patch(
                "app.middleware.authorization.get_current_user_id",
                return_value=(10, True),
            ),
            patch("app.models.User.query") as mock_query,
            patch("app.middleware.authorization.audit_permission_check") as mock_audit,
        ):
            mock_user = MagicMock()
            mock_user.username = "operator"
            mock_user.is_active = True
            mock_user.has_permission.return_value = True
            mock_user.role.name.value = "operator"
            mock_query.get.return_value = mock_user

            res = dummy_endpoint()
            assert res.status_code == 200


def test_role_required_decorator(app):
    """Test role_required decorator scenarios."""

    @role_required("admin", "operator")
    def dummy_endpoint():
        return jsonify({"success": True})

    # Scenario 1: JWT token invalid or get_current_user_id fails
    with app.test_request_context():
        with (
            patch("app.middleware.authorization.verify_jwt_in_request") as mock_verify,
            patch(
                "app.middleware.authorization.get_current_user_id",
                return_value=(None, False),
            ),
            patch("app.middleware.authorization.audit_permission_check") as mock_audit,
        ):
            res = dummy_endpoint()
            assert res[1] == 401

    # Scenario 2: Normal User - Role mismatch
    with app.test_request_context():
        with (
            patch("app.middleware.authorization.verify_jwt_in_request"),
            patch(
                "app.middleware.authorization.get_current_user_id",
                return_value=(10, True),
            ),
            patch("app.models.User.query") as mock_query,
        ):
            mock_user = MagicMock()
            mock_user.username = "viewer"
            mock_user.is_active = True
            mock_user.role.name.value = "viewer"  # viewer is not in admin/operator
            mock_query.get.return_value = mock_user

            res = dummy_endpoint()
            assert res[1] == 403

    # Scenario 3: Normal User - Role match
    with app.test_request_context():
        with (
            patch("app.middleware.authorization.verify_jwt_in_request"),
            patch(
                "app.middleware.authorization.get_current_user_id",
                return_value=(10, True),
            ),
            patch("app.models.User.query") as mock_query,
        ):
            mock_user = MagicMock()
            mock_user.username = "operator"
            mock_user.is_active = True
            mock_user.role.name.value = "operator"
            mock_query.get.return_value = mock_user

            res = dummy_endpoint()
            assert res.status_code == 200
