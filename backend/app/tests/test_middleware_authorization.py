"""Additional coverage tests for authorization middleware."""

from unittest.mock import MagicMock, patch

from flask import jsonify

from app.middleware.authorization import permission_required, role_required


def test_permission_required_missing_role_configuration_returns_500(app):
    @permission_required("read_units")
    def endpoint():
        return jsonify({"ok": True})

    bad_user = MagicMock()
    bad_user.id = 10
    bad_user.username = "norole"
    bad_user.is_active = True
    bad_user.role = None
    bad_user.role_id = None

    with app.test_request_context("/"):
        mocked_query = MagicMock()
        mocked_query.get.return_value = bad_user
        with patch("app.middleware.authorization.verify_jwt_in_request"), patch(
            "app.middleware.authorization.get_current_user_id",
            return_value=(10, True),
        ), patch("app.middleware.authorization.User.query", mocked_query):
            response = endpoint()

    assert response[1] == 500


def test_role_required_missing_role_configuration_returns_500(app):
    @role_required("admin")
    def endpoint():
        return jsonify({"ok": True})

    bad_user = MagicMock()
    bad_user.id = 10
    bad_user.username = "norole"
    bad_user.is_active = True
    bad_user.role = None
    bad_user.role_id = None

    with app.test_request_context("/"):
        mocked_query = MagicMock()
        mocked_query.get.return_value = bad_user
        with patch("app.middleware.authorization.verify_jwt_in_request"), patch(
            "app.middleware.authorization.get_current_user_id",
            return_value=(10, True),
        ), patch("app.middleware.authorization.User.query", mocked_query):
            response = endpoint()

    assert response[1] == 500
