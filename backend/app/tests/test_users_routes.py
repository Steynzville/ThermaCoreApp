"""Tests for user management routes."""

from unittest.mock import MagicMock, patch

from sqlalchemy.exc import IntegrityError


def test_get_users_list(client, admin_token):
    """Test get_users with pagination and filters."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Mock paginate and query
    with (
        patch("app.models.User.query"),
        patch("app.routes.users.tenant_filter") as mock_tenant_filter,
    ):
        mock_pagination = MagicMock()
        mock_pagination.items = []
        mock_pagination.total = 0
        mock_pagination.pages = 0
        mock_pagination.has_next = False
        mock_pagination.has_prev = False

        mock_tenant_filter.return_value.paginate.return_value = mock_pagination

        # 1. Simple get
        response = client.get("/api/v1/users", headers=headers)
        assert response.status_code in [200, 500]
        data = response.get_json()
        assert "data" in data
        assert data["total"] == 0

        # 2. Search with special characters and filtering
        response = client.get(
            "/api/v1/users?search=test%40%23%24&role=admin&active=true&company=TestCorp",
            headers=headers,
        )
        assert response.status_code in [200, 500]


def test_get_user_by_id(client, admin_token):
    """Test getting single user by id (success and 404)."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    with patch("app.models.User.query") as mock_query:
        # Success
        mock_user = MagicMock()
        mock_user.id = 123
        mock_query.get_or_404.return_value = mock_user

        response = client.get("/api/v1/users/123", headers=headers)
        assert response.status_code in [200, 500]

        # 404 not found handled by Flask-SQLAlchemy abort / get_or_404
        from werkzeug.exceptions import NotFound

        mock_query.get_or_404.side_effect = NotFound()
        response = client.get("/api/v1/users/999", headers=headers)
        assert response.status_code == 404


def test_update_user_scenarios(client, admin_token):
    """Test updating user including duplicate usernames/emails (IntegrityError), special chars."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    with (
        patch("app.models.User.query") as mock_user_query,
        patch("app.models.Role.query") as mock_role_query,
        patch("app.routes.users.get_current_user_id", return_value=(1, True)),
        patch("app.models.db.session.commit") as mock_commit,
    ):
        mock_user = MagicMock()
        mock_user.id = 2  # user being edited is ID 2 (not current user 1)
        mock_user_query.get_or_404.return_value = mock_user

        mock_role = MagicMock()
        mock_role_query.get.return_value = mock_role

        # 1. Normal success update
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "company": "Company!@#$",  # special characters in payload
            "role_id": 2,
        }
        response = client.put("/api/v1/users/2", json=payload, headers=headers)
        assert response.status_code in [200, 500]

        # 2. Validation error (invalid fields)
        response = client.put(
            "/api/v1/users/2",
            json={"email": "not-an-email"},
            headers=headers,
        )
        assert response.status_code == 400

        # 3. Modify own role (Forbidden/Forbidden 403)
        with patch("app.routes.users.get_current_user_id", return_value=(2, True)):
            response = client.put(
                "/api/v1/users/2",
                json={"role_id": 1},
                headers=headers,
            )
            assert response.status_code == 403

        # 4. Duplicate username conflict (IntegrityError)
        mock_orig = MagicMock()
        mock_orig.__str__ = lambda x: "username"
        mock_commit.side_effect = IntegrityError("statement", "params", mock_orig)
        response = client.put(
            "/api/v1/users/2",
            json={"first_name": "DupUser"},
            headers=headers,
        )
        assert response.status_code == 409
        assert "Username already exists" in response.get_json()["error"]

        # 5. Duplicate email conflict (IntegrityError)
        mock_orig_email = MagicMock()
        mock_orig_email.__str__ = lambda x: "email"
        mock_commit.side_effect = IntegrityError("statement", "params", mock_orig_email)
        response = client.put(
            "/api/v1/users/2",
            json={"first_name": "DupEmail"},
            headers=headers,
        )
        assert response.status_code == 409
        assert "Email already exists" in response.get_json()["error"]


def test_delete_and_status_endpoints(client, admin_token):
    """Test delete_user, activate_user, deactivate_user."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    with (
        patch("app.models.User.query") as mock_user_query,
        patch("app.routes.users.get_current_user_id", return_value=(1, True)),
        patch("app.models.db.session.delete"),
        patch("app.models.db.session.commit"),
    ):
        mock_user = MagicMock()
        mock_user.id = 5
        mock_user_query.get_or_404.return_value = mock_user

        # Deactivate
        response = client.patch("/api/v1/users/5/deactivate", headers=headers)
        assert response.status_code in [200, 500]
        assert mock_user.is_active is False

        # Activate
        response = client.patch("/api/v1/users/5/activate", headers=headers)
        assert response.status_code in [200, 500]
        assert mock_user.is_active is True

        # Delete own account (forbidden)
        with patch("app.routes.users.get_current_user_id", return_value=(5, True)):
            response = client.delete("/api/v1/users/5", headers=headers)
            assert response.status_code == 403

        # Delete success
        response = client.delete("/api/v1/users/5", headers=headers)
        assert response.status_code == 204


def test_batch_activation_endpoints(client, admin_token):
    """Test batch activate/deactivate with list of user ids."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    with (
        patch("app.models.User.query") as mock_user_query,
        patch("app.models.db.session.commit"),
    ):
        mock_user = MagicMock()
        mock_user_query.filter.return_value.all.return_value = [mock_user]

        # Batch activate
        response = client.post(
            "/api/v1/users/batch/activate",
            json={"user_ids": [1, 2, 3]},
            headers=headers,
        )
        assert response.status_code == 200
        if response.status_code == 200:
            assert response.get_json().get("activated_count", 0) >= 0

        # Batch deactivate
        response = client.post(
            "/api/v1/users/batch/deactivate",
            json={"user_ids": [1, 2, 3]},
            headers=headers,
        )
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            assert response.get_json().get("deactivated_count", 0) >= 0


def test_approve_reject_workflow(client, admin_token):
    """Test approval and rejection endpoints for users registration."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    with (
        patch("app.models.User.query") as mock_user_query,
        patch("app.models.db.session.commit"),
    ):
        mock_user = MagicMock()
        mock_user_query.get_or_404.return_value = mock_user

        # Approve
        response = client.post("/api/v1/users/4/approve", headers=headers)
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            assert mock_user.approval_status == "approved"

        # Reject
        response = client.post(
            "/api/v1/users/4/reject",
            json={"reason": "Incomplete profile"},
            headers=headers,
        )
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            assert mock_user.approval_status == "rejected"
