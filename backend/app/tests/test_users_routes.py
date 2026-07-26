"""Tests for user management routes."""

from unittest.mock import MagicMock, patch

from sqlalchemy.exc import IntegrityError


def test_get_users_list(client, admin_token):
    """Test get_users with pagination and filters."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Simple get - should succeed
    response = client.get("/api/v1/users", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert "data" in data

    # 2. Search with special characters and filtering
    response = client.get(
        "/api/v1/users?search=test%40%23%24&role=admin&active=true&company=TestCorp",
        headers=headers,
    )
    assert response.status_code == 200


def test_get_user_by_id(client, admin_token):
    """Test getting single user by id (success and 404)."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    with patch("app.models.User.query") as mock_query:
        # Success
        mock_user = MagicMock()
        mock_user.id = 123
        mock_query.get_or_404.return_value = mock_user

        response = client.get("/api/v1/users/123", headers=headers)
        assert response.status_code == 200

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
        assert response.status_code == 200

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
        class FakeOrig:
            def __str__(self):
                return "duplicate key value violates unique constraint on username"

        mock_commit.side_effect = IntegrityError("statement", "params", FakeOrig())
        response = client.put(
            "/api/v1/users/2",
            json={"first_name": "DupUser"},
            headers=headers,
        )
        assert response.status_code == 409
        assert "Username already exists" in response.get_json()["error"]

        # 5. Duplicate email conflict (IntegrityError)
        class FakeOrigEmail:
            def __str__(self):
                return "duplicate key value violates unique constraint on email"

        mock_commit.side_effect = IntegrityError("statement", "params", FakeOrigEmail())
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
        assert response.status_code == 200
        assert mock_user.is_active is False

        # Activate
        response = client.patch("/api/v1/users/5/activate", headers=headers)
        assert response.status_code == 200
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
        assert response.get_json().get("activated_count", 0) >= 0

        # Batch deactivate
        response = client.post(
            "/api/v1/users/batch/deactivate",
            json={"user_ids": [1, 2, 3]},
            headers=headers,
        )
        assert response.status_code == 200
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
        assert response.status_code == 200
        assert mock_user.approval_status == "approved"

        # Reject
        response = client.post(
            "/api/v1/users/4/reject",
            json={"reason": "Incomplete profile"},
            headers=headers,
        )
        assert response.status_code == 200
        assert mock_user.approval_status == "rejected"


# ============================================================
# CLIENT ADMIN SCOPING TESTS
# ============================================================


class TestClientAdminScoping:
    """Test client_admin users are correctly scoped to their own client."""

    def test_get_users_scoped_to_client(self, client, client_admin_token, db_session):
        token, own_client_id = client_admin_token

        response = client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        for user in data["data"]:
            assert user.get("client_id") == own_client_id

    def test_get_users_no_client_assigned_returns_empty(
        self,
        client,
        client_admin_no_client_token,
    ):
        response = client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {client_admin_no_client_token}"},
        )
        assert response.status_code == 200
        assert response.get_json()["total"] == 0

    def test_get_pending_users_scoped_to_client(
        self,
        client,
        client_admin_token,
        db_session,
    ):
        token, own_client_id = client_admin_token

        # Create a pending user in the same client
        from app.models import Role, User

        viewer_role = Role.query.filter_by(name="viewer").first()
        pending_user = User(
            username="pending_scoped",
            email="pending_scoped@test.com",
            role_id=viewer_role.id,
            client_id=own_client_id,
            registration_status="pending",
            is_active=True,
        )
        pending_user.set_password("password123")
        db_session.add(pending_user)
        db_session.commit()

        response = client.get(
            "/api/v1/users/pending",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert any(u["username"] == "pending_scoped" for u in data["data"])

    def test_get_pending_users_no_client_assigned_returns_empty(
        self,
        client,
        client_admin_no_client_token,
    ):
        response = client.get(
            "/api/v1/users/pending",
            headers={"Authorization": f"Bearer {client_admin_no_client_token}"},
        )
        assert response.status_code == 200
        assert response.get_json()["total"] == 0

    def test_get_user_outside_client_returns_404(
        self,
        client,
        client_admin_token,
        admin_token,
        db_session,
    ):
        token, own_client_id = client_admin_token

        # Create a user in a different client using admin token
        from app.models import Client, Role, User

        viewer_role = Role.query.filter_by(name="viewer").first()
        other_client = Client(name="OtherClient")
        db_session.add(other_client)
        db_session.commit()

        other_user = User(
            username="otherclientuser",
            email="otherclientuser@test.com",
            role_id=viewer_role.id,
            client_id=other_client.id,
            is_active=True,
            registration_status="approved",
        )
        other_user.set_password("password123")
        db_session.add(other_user)
        db_session.commit()

        response = client.get(
            f"/api/v1/users/{other_user.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404

    def test_update_user_outside_client_returns_404(
        self,
        client,
        client_admin_token,
        db_session,
    ):
        token, own_client_id = client_admin_token

        # Create a user outside the client
        from app.models import Client, Role, User

        viewer_role = Role.query.filter_by(name="viewer").first()
        other_client = Client(name="OtherClient2")
        db_session.add(other_client)
        db_session.commit()

        other_user = User(
            username="otherclientuser2",
            email="otherclientuser2@test.com",
            role_id=viewer_role.id,
            client_id=other_client.id,
            is_active=True,
            registration_status="approved",
        )
        other_user.set_password("password123")
        db_session.add(other_user)
        db_session.commit()

        response = client.put(
            f"/api/v1/users/{other_user.id}",
            json={"first_name": "Hacked"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404

    def test_client_admin_cannot_assign_admin_role(
        self,
        client,
        client_admin_token,
        db_session,
    ):
        from app.models import Role, User

        token, own_client_id = client_admin_token

        # Create a user in the client's scope
        viewer_role = Role.query.filter_by(name="viewer").first()
        target_user = User(
            username="target_user",
            email="target_user@test.com",
            role_id=viewer_role.id,
            client_id=own_client_id,
            is_active=True,
            registration_status="approved",
        )
        target_user.set_password("password123")
        db_session.add(target_user)
        db_session.commit()

        admin_role = Role.query.filter_by(name="admin").first()

        response = client.put(
            f"/api/v1/users/{target_user.id}",
            json={"role_id": admin_role.id},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        assert "Cannot assign this role" in response.get_json()["error"]

    def test_client_admin_can_assign_viewer_role(
        self,
        client,
        client_admin_token,
        db_session,
    ):
        from app.models import Role, User

        token, own_client_id = client_admin_token

        viewer_role = Role.query.filter_by(name="viewer").first()
        target_user = User(
            username="target_user2",
            email="target_user2@test.com",
            role_id=viewer_role.id,
            client_id=own_client_id,
            is_active=True,
            registration_status="approved",
        )
        target_user.set_password("password123")
        db_session.add(target_user)
        db_session.commit()

        response = client.put(
            f"/api/v1/users/{target_user.id}",
            json={"role_id": viewer_role.id},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

    def test_client_admin_cannot_unassign_client(
        self,
        client,
        client_admin_token,
        db_session,
    ):
        from app.models import Role, User

        token, own_client_id = client_admin_token

        viewer_role = Role.query.filter_by(name="viewer").first()
        target_user = User(
            username="target_user3",
            email="target_user3@test.com",
            role_id=viewer_role.id,
            client_id=own_client_id,
            is_active=True,
            registration_status="approved",
        )
        target_user.set_password("password123")
        db_session.add(target_user)
        db_session.commit()

        response = client.put(
            f"/api/v1/users/{target_user.id}",
            json={"client_id": None},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        assert "Cannot unassign a user's client" in response.get_json()["error"]

    def test_client_admin_cannot_move_user_to_other_client(
        self,
        client,
        client_admin_token,
        db_session,
    ):
        from app.models import Role, User

        token, own_client_id = client_admin_token

        viewer_role = Role.query.filter_by(name="viewer").first()
        target_user = User(
            username="target_user4",
            email="target_user4@test.com",
            role_id=viewer_role.id,
            client_id=own_client_id,
            is_active=True,
            registration_status="approved",
        )
        target_user.set_password("password123")
        db_session.add(target_user)
        db_session.commit()

        response = client.put(
            f"/api/v1/users/{target_user.id}",
            json={"client_id": own_client_id + 999},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        assert (
            "Cannot assign users to a different client" in response.get_json()["error"]
        )

    def test_batch_activate_filters_out_of_scope_ids(self, client, client_admin_token):
        token, _ = client_admin_token

        response = client.post(
            "/api/v1/users/batch/activate",
            json={"user_ids": [999999]},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        assert "No valid users found in your client" in response.get_json()["error"]

    def test_batch_activate_no_client_assigned(
        self,
        client,
        client_admin_no_client_token,
    ):
        response = client.post(
            "/api/v1/users/batch/activate",
            json={"user_ids": [1, 2]},
            headers={"Authorization": f"Bearer {client_admin_no_client_token}"},
        )
        assert response.status_code == 403
        assert "No client assigned" in response.get_json()["error"]

    def test_batch_deactivate_no_client_assigned(
        self,
        client,
        client_admin_no_client_token,
    ):
        response = client.post(
            "/api/v1/users/batch/deactivate",
            json={"user_ids": [1, 2]},
            headers={"Authorization": f"Bearer {client_admin_no_client_token}"},
        )
        assert response.status_code == 403
        assert "No client assigned" in response.get_json()["error"]

    def test_get_clients_scoped(self, client, client_admin_token):
        token, own_client_id = client_admin_token
        response = client.get(
            "/api/v1/clients",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert all(c["id"] == own_client_id for c in data)

    def test_get_clients_no_client_assigned(self, client, client_admin_no_client_token):
        response = client.get(
            "/api/v1/clients",
            headers={"Authorization": f"Bearer {client_admin_no_client_token}"},
        )
        assert response.status_code == 200
        assert response.get_json() == []

    def test_users_stats_scoped_to_client(self, client, client_admin_token, db_session):
        token, own_client_id = client_admin_token

        response = client.get(
            "/api/v1/users/stats",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        # All stats should be scoped to the client
        assert "total_users" in data
        assert "active_users" in data

    def test_users_stats_empty_when_no_client(
        self,
        client,
        client_admin_no_client_token,
    ):
        response = client.get(
            "/api/v1/users/stats",
            headers={"Authorization": f"Bearer {client_admin_no_client_token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["total_users"] == 0
        assert data["admin_users"] == 0

    def test_companies_scoped_to_client(self, client, client_admin_token):
        token, _ = client_admin_token
        response = client.get(
            "/api/v1/users/companies",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert "companies" in response.get_json()

    def test_companies_empty_when_no_client(self, client, client_admin_no_client_token):
        response = client.get(
            "/api/v1/users/companies",
            headers={"Authorization": f"Bearer {client_admin_no_client_token}"},
        )
        assert response.status_code == 200
        assert response.get_json()["companies"] == []

    def test_company_stats_scoped_to_client(self, client, client_admin_token):
        token, _ = client_admin_token
        response = client.get(
            "/api/v1/users/companies/stats",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert "stats" in response.get_json()

    def test_company_stats_empty_when_no_client(
        self,
        client,
        client_admin_no_client_token,
    ):
        response = client.get(
            "/api/v1/users/companies/stats",
            headers={"Authorization": f"Bearer {client_admin_no_client_token}"},
        )
        assert response.status_code == 200
        assert response.get_json()["stats"] == []


# ============================================================
# UNTESTED ENDPOINT TESTS
# ============================================================


def test_get_roles(client, admin_token):
    """Get roles endpoint."""
    response = client.get(
        "/api/v1/roles",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)


def test_reset_user_password_success(client, admin_token, db_session):
    from app.models import User

    target = User.query.filter(User.username != "admin").first()
    if not target:
        from app.models import Role

        admin_role = Role.query.filter_by(name="admin").first()
        target = User(
            username="password_reset_target",
            email="password_reset_target@test.com",
            role_id=admin_role.id,
            is_active=True,
            registration_status="approved",
        )
        target.set_password("password123")
        db_session.add(target)
        db_session.commit()

    response = client.post(
        f"/api/v1/users/{target.id}/reset-password",
        json={"new_password": "newSecurePass123"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    db_session.refresh(target)
    assert target.check_password("newSecurePass123")


def test_reset_user_password_too_short(client, admin_token, db_session):
    from app.models import User

    target = User.query.filter(User.username != "admin").first()
    response = client.post(
        f"/api/v1/users/{target.id}/reset-password",
        json={"new_password": "abc"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400
    assert "at least 6 characters" in response.get_json()["error"]


def test_reset_user_password_missing_field(client, admin_token, db_session):
    from app.models import User

    target = User.query.filter(User.username != "admin").first()
    response = client.post(
        f"/api/v1/users/{target.id}/reset-password",
        json={},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400
    assert "New password required" in response.get_json()["error"]


def test_get_companies(client, admin_token):
    response = client.get(
        "/api/v1/users/companies",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert "companies" in response.get_json()


def test_get_company_stats(client, admin_token):
    response = client.get(
        "/api/v1/users/companies/stats",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert "stats" in response.get_json()


def test_get_pending_users(client, admin_token, db_session):
    from app.models import Role, User

    # Create a pending user if none exists
    viewer_role = Role.query.filter_by(name="viewer").first()
    pending_user = User.query.filter_by(registration_status="pending").first()
    if not pending_user:
        pending_user = User(
            username="pendingtestuser",
            email="pendingtestuser@test.com",
            role_id=viewer_role.id,
            registration_status="pending",
            is_active=True,
        )
        pending_user.set_password("password123")
        db_session.add(pending_user)
        db_session.commit()

    response = client.get(
        "/api/v1/users/pending",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["data"]) >= 1


def test_approve_pending_user(client, admin_token, db_session):
    from app.models import Role, User

    viewer_role = Role.query.filter_by(name="viewer").first()
    pending_user = User(
        username="toapprove",
        email="toapprove@test.com",
        role_id=viewer_role.id,
        registration_status="pending",
        is_active=True,
    )
    pending_user.set_password("password123")
    db_session.add(pending_user)
    db_session.commit()

    response = client.post(
        f"/api/v1/users/{pending_user.id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    db_session.refresh(pending_user)
    assert pending_user.registration_status == "approved"
    assert pending_user.approval_date is not None
    assert pending_user.permissions is not None


def test_approve_already_approved_user_fails(client, admin_token, db_session):
    from app.models import User

    user = User.query.filter_by(username="admin").first()
    response = client.post(
        f"/api/v1/users/{user.id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400
    assert "not in pending status" in response.get_json()["error"]


def test_reject_pending_user_with_reason(client, admin_token, db_session):
    from app.models import Role, User

    viewer_role = Role.query.filter_by(name="viewer").first()
    pending_user = User(
        username="toreject",
        email="toreject@test.com",
        role_id=viewer_role.id,
        registration_status="pending",
        is_active=True,
    )
    pending_user.set_password("password123")
    db_session.add(pending_user)
    db_session.commit()

    response = client.post(
        f"/api/v1/users/{pending_user.id}/reject",
        json={"reason": "Not a valid company email"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    db_session.refresh(pending_user)
    assert pending_user.registration_status == "rejected"
    assert pending_user.rejection_reason == "Not a valid company email"


def test_reject_pending_user_default_reason(client, admin_token, db_session):
    from app.models import Role, User

    viewer_role = Role.query.filter_by(name="viewer").first()
    pending_user = User(
        username="torejectnoreason",
        email="torejectnoreason@test.com",
        role_id=viewer_role.id,
        registration_status="pending",
        is_active=True,
    )
    pending_user.set_password("password123")
    db_session.add(pending_user)
    db_session.commit()

    response = client.post(
        f"/api/v1/users/{pending_user.id}/reject",
        json={},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    db_session.refresh(pending_user)
    assert pending_user.rejection_reason == "No reason provided"


def test_approve_reject_nonexistent_user(client, admin_token):
    response = client.post(
        "/api/v1/users/999999/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404

    response = client.post(
        "/api/v1/users/999999/reject",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


# ============================================================
# REGRESSION TEST: active query param bug
# ============================================================


def test_get_users_filter_active_false(client, admin_token, db_session):
    """Test that ?active=false correctly filters to inactive users."""
    from app.models import User

    # Ensure there is an inactive user
    inactive_user = User.query.filter(User.is_active.is_(False)).first()
    if not inactive_user:
        from app.models import Role

        viewer = Role.query.filter_by(name="viewer").first()
        inactive_user = User(
            username="inactive_test_filter",
            email="inactive_test_filter@test.com",
            role_id=viewer.id,
            is_active=False,
            registration_status="approved",
        )
        inactive_user.set_password("password123")
        db_session.add(inactive_user)
        db_session.commit()

    response = client.get(
        "/api/v1/users?active=false",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.get_json()
    # The inactive user should be in the results
    assert any(u["username"] == "inactive_test_filter" for u in data["data"])
