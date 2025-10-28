"""Tests for user approval workflow implementation."""

from app import db
from app.models import Role, User


class TestApprovalWorkflowMigration:
    """Tests for approval workflow database migration."""

    def test_approval_columns_exist(self, app):
        """Test that approval workflow columns exist in users table."""
        from sqlalchemy import inspect

        with app.app_context():
            inspector = inspect(db.engine)
            columns = {col["name"] for col in inspector.get_columns("users")}

            assert "registration_status" in columns
            assert "approval_date" in columns
            assert "approved_by" in columns
            assert "rejection_reason" in columns

    def test_existing_users_have_approved_status(self, app, admin_user):
        """Test that existing users have 'approved' registration status."""
        with app.app_context():
            user = User.query.filter_by(username=admin_user["username"]).first()
            assert user is not None
            assert user.registration_status == "approved"

    def test_default_registration_status_is_approved(self, app):
        """Test that default registration_status is 'approved' for backward compatibility."""
        with app.app_context():
            # Get admin role
            admin_role = Role.query.filter_by(name="admin").first()

            # Create user without specifying registration_status
            user = User(
                username="test_default_status",
                email="test_default@example.com",
                role_id=admin_role.id,
            )
            user.set_password("testpass123")
            db.session.add(user)
            db.session.commit()

            # Verify default is 'approved'
            assert user.registration_status == "approved"

            # Cleanup
            db.session.delete(user)
            db.session.commit()


class TestUserCanLogin:
    """Tests for User.can_login() method."""

    def test_approved_active_user_can_login(self, app):
        """Test that approved and active user can login."""
        with app.app_context():
            admin_role = Role.query.filter_by(name="admin").first()
            user = User(
                username="approved_user",
                email="approved@example.com",
                role_id=admin_role.id,
                is_active=True,
                registration_status="approved",
            )
            user.set_password("testpass123")
            db.session.add(user)
            db.session.commit()

            assert user.can_login() is True

            # Cleanup
            db.session.delete(user)
            db.session.commit()

    def test_pending_user_cannot_login(self, app):
        """Test that pending user cannot login."""
        with app.app_context():
            viewer_role = Role.query.filter_by(name="viewer").first()
            user = User(
                username="pending_user",
                email="pending@example.com",
                role_id=viewer_role.id,
                is_active=True,
                registration_status="pending",
            )
            user.set_password("testpass123")
            db.session.add(user)
            db.session.commit()

            assert user.can_login() is False

            # Cleanup
            db.session.delete(user)
            db.session.commit()

    def test_rejected_user_cannot_login(self, app):
        """Test that rejected user cannot login."""
        with app.app_context():
            viewer_role = Role.query.filter_by(name="viewer").first()
            user = User(
                username="rejected_user",
                email="rejected@example.com",
                role_id=viewer_role.id,
                is_active=True,
                registration_status="rejected",
            )
            user.set_password("testpass123")
            db.session.add(user)
            db.session.commit()

            assert user.can_login() is False

            # Cleanup
            db.session.delete(user)
            db.session.commit()

    def test_inactive_approved_user_cannot_login(self, app):
        """Test that inactive user cannot login even if approved."""
        with app.app_context():
            admin_role = Role.query.filter_by(name="admin").first()
            user = User(
                username="inactive_user",
                email="inactive@example.com",
                role_id=admin_role.id,
                is_active=False,
                registration_status="approved",
            )
            user.set_password("testpass123")
            db.session.add(user)
            db.session.commit()

            assert user.can_login() is False

            # Cleanup
            db.session.delete(user)
            db.session.commit()


class TestSelfRegistration:
    """Tests for self-registration endpoint."""

    def test_self_register_creates_pending_user(self, client, app):
        """Test that self-registration creates a user with pending status."""
        data = {
            "username": "selfregistered",
            "email": "selfregistered@example.com",
            "password": "testpass123",
            "first_name": "Self",
            "last_name": "Registered",
        }

        response = client.post("/api/v1/auth/self-register", json=data)
        assert response.status_code == 201

        json_data = response.get_json()
        assert json_data["data"]["registration_status"] == "pending"
        assert "pending admin approval" in json_data["data"]["message"].lower()

        # Verify in database
        with app.app_context():
            user = User.query.filter_by(username="selfregistered").first()
            assert user is not None
            assert user.registration_status == "pending"
            assert user.role.name.value == "viewer"
            assert user.permissions is None

            # Cleanup
            db.session.delete(user)
            db.session.commit()

    def test_self_register_duplicate_username(self, client, admin_user):
        """Test that self-registration rejects duplicate username."""
        data = {
            "username": admin_user["username"],
            "email": "different@example.com",
            "password": "testpass123",
        }

        response = client.post("/api/v1/auth/self-register", json=data)
        assert response.status_code == 409

    def test_self_register_duplicate_email(self, client, admin_user):
        """Test that self-registration rejects duplicate email."""
        data = {
            "username": "different_username",
            "email": admin_user["email"],
            "password": "testpass123",
        }

        response = client.post("/api/v1/auth/self-register", json=data)
        assert response.status_code == 409

    def test_self_register_missing_fields(self, client):
        """Test that self-registration validates required fields."""
        data = {
            "username": "testuser",
            # Missing email and password
        }

        response = client.post("/api/v1/auth/self-register", json=data)
        # webargs returns 422 for validation errors
        assert response.status_code in [400, 422]


class TestPendingUserLogin:
    """Tests for pending user login attempts."""

    def test_pending_user_cannot_login(self, client, app):
        """Test that pending user receives appropriate error on login."""
        with app.app_context():
            viewer_role = Role.query.filter_by(name="viewer").first()
            user = User(
                username="pending_login_test",
                email="pending_login@example.com",
                role_id=viewer_role.id,
                is_active=True,
                registration_status="pending",
            )
            user.set_password("testpass123")
            db.session.add(user)
            db.session.commit()

        # Try to login
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "pending_login_test",
                "password": "testpass123",
            },
        )

        assert response.status_code == 401
        json_data = response.get_json()
        # Error response structure may vary, check both possibilities
        # The error may be in 'error', 'message', or nested in 'details'
        error_str = str(json_data).lower()
        # Check that it mentions approval or account status
        assert "approval" in error_str or "account" in error_str

        # Cleanup
        with app.app_context():
            user = User.query.filter_by(username="pending_login_test").first()
            db.session.delete(user)
            db.session.commit()


class TestApprovalEndpoints:
    """Tests for user approval/rejection endpoints."""

    def test_list_pending_users(self, client, admin_token, app):
        """Test listing pending users endpoint."""
        # Create a pending user
        with app.app_context():
            viewer_role = Role.query.filter_by(name="viewer").first()
            user = User(
                username="pending_for_list",
                email="pending_for_list@example.com",
                role_id=viewer_role.id,
                is_active=True,
                registration_status="pending",
            )
            user.set_password("testpass123")
            db.session.add(user)
            db.session.commit()

        # List pending users
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get("/api/v1/users/pending", headers=headers)

        assert response.status_code == 200
        json_data = response.get_json()
        assert "data" in json_data
        assert len(json_data["data"]) >= 1

        # Verify pending user is in list
        pending_usernames = [u["username"] for u in json_data["data"]]
        assert "pending_for_list" in pending_usernames

        # Cleanup
        with app.app_context():
            user = User.query.filter_by(username="pending_for_list").first()
            db.session.delete(user)
            db.session.commit()

    def test_approve_pending_user(self, client, admin_token, app):
        """Test approving a pending user."""
        # Create a pending user
        with app.app_context():
            viewer_role = Role.query.filter_by(name="viewer").first()
            user = User(
                username="to_approve",
                email="to_approve@example.com",
                role_id=viewer_role.id,
                is_active=True,
                registration_status="pending",
            )
            user.set_password("testpass123")
            db.session.add(user)
            db.session.commit()
            user_id = user.id

        # Approve the user
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(f"/api/v1/users/{user_id}/approve", headers=headers)

        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data["message"] == "User approved successfully"
        assert json_data["user"]["registration_status"] == "approved"
        assert json_data["user"]["approval_date"] is not None

        # Verify in database
        with app.app_context():
            user = User.query.get(user_id)
            assert user.registration_status == "approved"
            assert user.approval_date is not None
            assert user.approved_by is not None
            assert user.permissions is not None  # Should have role permissions now

            # Verify user can now login
            assert user.can_login() is True

            # Cleanup
            db.session.delete(user)
            db.session.commit()

    def test_reject_pending_user(self, client, admin_token, app):
        """Test rejecting a pending user."""
        # Create a pending user
        with app.app_context():
            viewer_role = Role.query.filter_by(name="viewer").first()
            user = User(
                username="to_reject",
                email="to_reject@example.com",
                role_id=viewer_role.id,
                is_active=True,
                registration_status="pending",
            )
            user.set_password("testpass123")
            db.session.add(user)
            db.session.commit()
            user_id = user.id

        # Reject the user
        headers = {"Authorization": f"Bearer {admin_token}"}
        rejection_data = {"reason": "Invalid company email domain"}
        response = client.post(
            f"/api/v1/users/{user_id}/reject",
            headers=headers,
            json=rejection_data,
        )

        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data["message"] == "User rejected successfully"
        assert json_data["user"]["registration_status"] == "rejected"

        # Verify in database
        with app.app_context():
            user = User.query.get(user_id)
            assert user.registration_status == "rejected"
            assert user.rejection_reason == "Invalid company email domain"
            assert user.approved_by is not None  # Track who rejected

            # Verify user cannot login
            assert user.can_login() is False

            # Cleanup
            db.session.delete(user)
            db.session.commit()

    def test_approve_non_pending_user_fails(self, client, admin_token, admin_user, app):
        """Test that approving an already approved user fails."""
        with app.app_context():
            user = User.query.filter_by(username=admin_user["username"]).first()
            user_id = user.id

        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.post(f"/api/v1/users/{user_id}/approve", headers=headers)

        assert response.status_code == 400
        json_data = response.get_json()
        assert "not in pending status" in json_data["error"].lower()

    def test_approve_user_without_permission_fails(self, client, viewer_token, app):
        """Test that non-admin cannot approve users."""
        # Create a pending user
        with app.app_context():
            viewer_role = Role.query.filter_by(name="viewer").first()
            user = User(
                username="cannot_approve",
                email="cannot_approve@example.com",
                role_id=viewer_role.id,
                is_active=True,
                registration_status="pending",
            )
            user.set_password("testpass123")
            db.session.add(user)
            db.session.commit()
            user_id = user.id

        # Try to approve as viewer
        headers = {"Authorization": f"Bearer {viewer_token}"}
        response = client.post(f"/api/v1/users/{user_id}/approve", headers=headers)

        assert response.status_code == 403

        # Cleanup
        with app.app_context():
            user = User.query.get(user_id)
            db.session.delete(user)
            db.session.commit()


class TestAdminRegistrationUnchanged:
    """Tests to ensure admin registration endpoint is unchanged."""

    def test_admin_register_creates_approved_user(self, client, admin_token, app):
        """Test that admin registration still creates approved users."""
        with app.app_context():
            viewer_role = Role.query.filter_by(name="viewer").first()
            role_id = viewer_role.id

        headers = {"Authorization": f"Bearer {admin_token}"}
        data = {
            "username": "admin_created",
            "email": "admin_created@example.com",
            "password": "testpass123",
            "role_id": role_id,
        }

        response = client.post("/api/v1/auth/register", json=data, headers=headers)
        assert response.status_code == 201

        # Verify user is approved (not pending)
        with app.app_context():
            user = User.query.filter_by(username="admin_created").first()
            assert user is not None
            assert user.registration_status == "approved"
            assert user.can_login() is True

            # Cleanup
            db.session.delete(user)
            db.session.commit()
