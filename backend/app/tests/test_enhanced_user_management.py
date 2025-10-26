"""Tests for enhanced user management features."""

from app.models import Role, User


class TestUserProfileFields:
    """Test new user profile fields in registration and user management."""

    def test_user_registration_with_all_fields(self, client, db_session):
        """Test user registration with all profile fields."""
        # Get admin token
        admin_response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )
        admin_data = admin_response.json
        if "data" in admin_data:
            admin_token = admin_data["data"]["access_token"]
        else:
            admin_token = admin_data["access_token"]

        # Get viewer role ID
        viewer_role = Role.query.filter_by(name="viewer").first()

        # Register new user with all fields
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser123",
                "email": "test@example.com",
                "password": "password123",
                "first_name": "Test",
                "last_name": "User",
                "phone_number": "+1234567890",
                "company": "ABB Group",
                "department": "Engineering",
                "position": "Senior Engineer",
                "role_id": viewer_role.id,
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {admin_token}",
            },
        )

        assert response.status_code == 201

        # Verify user was created with all fields
        user = User.query.filter_by(username="testuser123").first()
        assert user is not None
        assert user.first_name == "Test"
        assert user.last_name == "User"
        assert user.phone_number == "+1234567890"
        assert user.company == "ABB Group"
        assert user.department == "Engineering"
        assert user.position == "Senior Engineer"
        assert user.company_identifier is not None
        assert user.company_identifier.startswith("ABB")

    def test_user_registration_generates_company_identifier(self, client, db_session):
        """Test that company identifier is auto-generated when company is provided."""
        # Get admin token
        admin_response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )
        admin_data = admin_response.json
        if "data" in admin_data:
            admin_token = admin_data["data"]["access_token"]
        else:
            admin_token = admin_data["access_token"]

        # Get viewer role ID
        viewer_role = Role.query.filter_by(name="viewer").first()

        # Register user with company
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "companyuser",
                "email": "company@example.com",
                "password": "password123",
                "company": "MineCor",
                "role_id": viewer_role.id,
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {admin_token}",
            },
        )

        assert response.status_code == 201

        # Verify company_identifier was generated
        user = User.query.filter_by(username="companyuser").first()
        assert user.company_identifier is not None
        assert "MINECOR" in user.company_identifier
        assert "-" in user.company_identifier

    def test_user_registration_without_company_no_identifier(self, client, db_session):
        """Test that company identifier is not generated when company is not provided."""
        # Get admin token
        admin_response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )
        admin_data = admin_response.json
        if "data" in admin_data:
            admin_token = admin_data["data"]["access_token"]
        else:
            admin_token = admin_data["access_token"]

        # Get viewer role ID
        viewer_role = Role.query.filter_by(name="viewer").first()

        # Register user without company
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "nocompanyuser",
                "email": "nocompany@example.com",
                "password": "password123",
                "role_id": viewer_role.id,
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {admin_token}",
            },
        )

        assert response.status_code == 201

        # Verify company_identifier was not generated
        user = User.query.filter_by(username="nocompanyuser").first()
        assert user.company_identifier is None

    def test_get_users_filter_by_company(self, client, db_session):
        """Test filtering users by company."""
        # Get admin token
        admin_response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )
        admin_data = admin_response.json
        if "data" in admin_data:
            admin_token = admin_data["data"]["access_token"]
        else:
            admin_token = admin_data["access_token"]

        # Get viewer role
        viewer_role = Role.query.filter_by(name="viewer").first()

        # Create users with different companies
        user1 = User(
            username="abbuser1",
            email="abb1@example.com",
            company="ABB",
            role_id=viewer_role.id,
        )
        user1.set_password("password123")

        user2 = User(
            username="abbuser2",
            email="abb2@example.com",
            company="ABB",
            role_id=viewer_role.id,
        )
        user2.set_password("password123")

        user3 = User(
            username="minecoruser",
            email="minecor@example.com",
            company="MineCor",
            role_id=viewer_role.id,
        )
        user3.set_password("password123")

        db_session.add_all([user1, user2, user3])
        db_session.commit()

        # Filter by ABB
        response = client.get(
            "/api/v1/users?company=ABB",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json
        assert "data" in data
        users = data["data"]

        # Should return at least 2 ABB users
        abb_users = [u for u in users if u.get("company") == "ABB"]
        assert len(abb_users) >= 2

    def test_user_update_with_new_fields(self, client, db_session):
        """Test updating user with new profile fields."""
        # Get admin token
        admin_response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/json"},
        )
        admin_data = admin_response.json
        if "data" in admin_data:
            admin_token = admin_data["data"]["access_token"]
        else:
            admin_token = admin_data["access_token"]

        # Get viewer role
        viewer_role = Role.query.filter_by(name="viewer").first()

        # Create a test user
        user = User(
            username="updatetest",
            email="update@test.com",
            role_id=viewer_role.id,
        )
        user.set_password("password123")
        db_session.add(user)
        db_session.commit()

        # Update user with new fields
        response = client.put(
            f"/api/v1/users/{user.id}",
            json={
                "phone_number": "+9876543210",
                "company": "TechCorp",
                "department": "IT",
                "position": "Developer",
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {admin_token}",
            },
        )

        assert response.status_code == 200

        # Verify updates
        db_session.refresh(user)
        assert user.phone_number == "+9876543210"
        assert user.company == "TechCorp"
        assert user.department == "IT"
        assert user.position == "Developer"
