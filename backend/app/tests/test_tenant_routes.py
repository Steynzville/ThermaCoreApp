"""Tests for tenant routes requiring JWT authentication."""

import os

import pytest
from flask import g

from app import create_app, db
from app.models import Role, RoleEnum, Tenant, User


@pytest.fixture
def app():
    """Create application for testing."""
    os.environ["FLASK_ENV"] = "testing"
    os.environ["SECRET_KEY"] = "test-secret-key"
    os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key"

    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"

    with app.app_context():
        db.create_all()

        # Create roles
        admin_role = Role(name=RoleEnum.ADMIN)
        operator_role = Role(name=RoleEnum.OPERATOR)
        viewer_role = Role(name=RoleEnum.VIEWER)

        db.session.add_all([admin_role, operator_role, viewer_role])
        db.session.commit()

        yield app

        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def tenant(app):
    """Create test tenant."""
    with app.app_context():
        tenant = Tenant(name="Test Company", slug="test-company")
        db.session.add(tenant)
        db.session.commit()
        tenant_id = tenant.id
        return tenant_id


@pytest.fixture
def user(app, tenant):
    """Create test user with tenant."""
    with app.app_context():
        role = Role.query.filter_by(name=RoleEnum.OPERATOR).first()
        user = User(
            username="testuser",
            email="test@example.com",
            tenant_id=tenant,
            role_id=role.id,
        )
        user.set_password("testpass")
        db.session.add(user)
        db.session.commit()
        user_id = user.id
        return user_id


@pytest.fixture
def admin_user(app):
    """Create admin user without tenant."""
    with app.app_context():
        role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        user = User(
            username="admin",
            email="admin@example.com",
            role_id=role.id,
        )
        user.set_password("adminpass")
        db.session.add(user)
        db.session.commit()
        user_id = user.id
        return user_id


@pytest.fixture
def auth_headers(client):
    """Get authentication headers for test user."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "testpass"},
    )
    assert response.status_code == 200
    data = response.get_json()
    token = data["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(client, admin_user):
    """Get authentication headers for admin user."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "adminpass"},
    )
    assert response.status_code == 200
    data = response.get_json()
    token = data["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestTenantCurrentEndpoint:
    """Test the /tenants/current endpoint."""

    def test_current_tenant_requires_jwt(self, client, user, tenant):
        """Test that /tenants/current requires JWT token."""
        # Request without JWT should return 401
        response = client.get("/api/v1/tenants/current")
        assert response.status_code == 401

    def test_current_tenant_with_valid_jwt(self, client, user, tenant, auth_headers):
        """Test that /tenants/current works with valid JWT."""
        response = client.get("/api/v1/tenants/current", headers=auth_headers)
        assert response.status_code == 200

        data = response.get_json()
        assert "data" in data
        assert data["data"]["id"] == tenant
        assert data["data"]["name"] == "Test Company"

    def test_current_tenant_admin_no_tenant(
        self, client, admin_user, admin_auth_headers
    ):
        """Test that admin user without tenant returns appropriate response."""
        response = client.get("/api/v1/tenants/current", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.get_json()
        assert "data" in data or "message" in data
        # Admin might have data=None with a message about cross-tenant access

    def test_current_tenant_with_invalid_jwt(self, client):
        """Test that /tenants/current rejects invalid JWT."""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = client.get("/api/v1/tenants/current", headers=headers)
        assert response.status_code == 422  # Unprocessable Entity for invalid JWT


class TestOtherTenantEndpoints:
    """Test that other tenant endpoints require JWT."""

    def test_get_tenants_requires_jwt(self, client):
        """Test that /tenants requires JWT."""
        response = client.get("/api/v1/tenants")
        assert response.status_code == 401

    def test_get_tenant_by_id_requires_jwt(self, client, tenant):
        """Test that /tenants/<id> requires JWT."""
        response = client.get(f"/api/v1/tenants/{tenant}")
        assert response.status_code == 401

    def test_create_tenant_requires_jwt(self, client):
        """Test that POST /tenants requires JWT."""
        response = client.post(
            "/api/v1/tenants",
            json={"name": "New Tenant", "slug": "new-tenant"},
        )
        assert response.status_code == 401

    def test_update_tenant_requires_jwt(self, client, tenant):
        """Test that PUT /tenants/<id> requires JWT."""
        response = client.put(
            f"/api/v1/tenants/{tenant}",
            json={"name": "Updated Tenant"},
        )
        assert response.status_code == 401

    def test_delete_tenant_requires_jwt(self, client, tenant):
        """Test that DELETE /tenants/<id> requires JWT."""
        response = client.delete(f"/api/v1/tenants/{tenant}")
        assert response.status_code == 401
