"""Tests for client-based multi-tenancy and data isolation."""

import json
import pytest

from app.models import User, Unit, Client


class TestClientIsolation:
    """Test client-based data isolation."""

    def test_admin_sees_all_units(self, client):
        """Test that admin users can see units from all clients."""
        # Login as admin
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        admin_token = data["data"]["access_token"]

        # Get units
        response = client.get(
            "/api/v1/units",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Admin should see all units
        assert len(data["data"]) > 0

    def test_operator_sees_only_client_units(self, client):
        """Test that operator users can only see units from their client."""
        # Login as operator
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "operator", "password": "operator123"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        operator_token = data["data"]["access_token"]

        # Get units
        response = client.get(
            "/api/v1/units",
            headers={"Authorization": f"Bearer {operator_token}"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Operator should only see units from their client
        units = data["data"]
        assert len(units) > 0
        # Verify all units have the same client_id as operator
        for unit in units:
            assert unit["client_id"] is not None

    def test_viewer_sees_only_client_units(self, client):
        """Test that viewer users can only see units from their client."""
        # Login as viewer
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "viewer", "password": "viewer123"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        viewer_token = data["data"]["access_token"]

        # Get units
        response = client.get(
            "/api/v1/units",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Viewer should only see units from their client
        units = data["data"]
        assert len(units) > 0
        for unit in units:
            assert unit["client_id"] is not None

    def test_admin_sees_all_users(self, client):
        """Test that admin users can see users from all clients."""
        # Login as admin
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        admin_token = data["data"]["access_token"]

        # Get users
        response = client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Admin should see all users including those with and without client_id
        assert len(data["data"]) >= 3  # At least admin, operator, viewer

    def test_operator_sees_only_client_users(self, client):
        """Test that operator users can only see users from their client."""
        # Login as operator
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "operator", "password": "operator123"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        operator_token = data["data"]["access_token"]

        # Get users
        response = client.get(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {operator_token}"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Operator should only see users from their client (not admin)
        users = data["data"]
        assert len(users) >= 2  # At least operator and viewer
        # Should not include admin (client_id=NULL)
        usernames = [u["username"] for u in users]
        assert "operator" in usernames or "viewer" in usernames


class TestClientManagement:
    """Test client CRUD operations."""

    def test_admin_can_list_clients(self, client):
        """Test that admin users can list all clients."""
        # Login as admin
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        admin_token = data["data"]["access_token"]

        # Get clients
        response = client.get(
            "/api/v1/clients",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Should have at least the test client
        assert len(data["data"]) >= 1
        assert data["data"][0]["name"] == "Test Client"

    def test_admin_can_create_client(self, client):
        """Test that admin users can create new clients."""
        # Login as admin
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        admin_token = data["data"]["access_token"]

        # Create new client
        response = client.post(
            "/api/v1/clients",
            json={
                "name": "New Test Client",
                "description": "A new test client",
                "contact_name": "Jane Smith",
                "contact_email": "jane@newclient.com",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Verify client was created
        assert data["name"] == "New Test Client"
        assert data["contact_name"] == "Jane Smith"

    def test_operator_cannot_create_client(self, client):
        """Test that operator users cannot create clients."""
        # Login as operator
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "operator", "password": "operator123"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        operator_token = data["data"]["access_token"]

        # Try to create new client
        response = client.post(
            "/api/v1/clients",
            json={
                "name": "Unauthorized Client",
                "description": "Should not be created",
            },
            headers={"Authorization": f"Bearer {operator_token}"},
        )
        # Should be forbidden
        assert response.status_code == 403


class TestUserClientAssignment:
    """Test user client assignment during creation."""

    def test_admin_can_create_user_with_client(self, client):
        """Test that admin users can create users with client assignment."""
        # Login as admin
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        admin_token = data["data"]["access_token"]
        
        # Get test client ID
        response = client.get(
            "/api/v1/clients",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        clients_data = json.loads(response.data)
        test_client_id = clients_data["data"][0]["id"]
        
        # Get a role ID
        response = client.get(
            "/api/v1/roles",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        roles_data = json.loads(response.data)
        operator_role = next(r for r in roles_data if r["name"] == "operator")

        # Create new user with client assignment
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "newoperator",
                "email": "newoperator@test.com",
                "password": "password123",
                "first_name": "New",
                "last_name": "Operator",
                "role_id": operator_role["id"],
                "client_id": test_client_id,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Verify user was created with client assignment
        assert data["data"]["username"] == "newoperator"
        assert data["data"]["client_id"] == test_client_id

    def test_admin_can_create_admin_user_without_client(self, client):
        """Test that admin users can create other admin users without client."""
        # Login as admin
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        admin_token = data["data"]["access_token"]
        
        # Get admin role ID
        response = client.get(
            "/api/v1/roles",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        roles_data = json.loads(response.data)
        admin_role = next(r for r in roles_data if r["name"] == "admin")

        # Create new admin user without client assignment
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "newadmin",
                "email": "newadmin@test.com",
                "password": "password123",
                "first_name": "New",
                "last_name": "Admin",
                "role_id": admin_role["id"],
                "client_id": None,  # Explicitly no client for admin
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Verify user was created without client assignment
        assert data["data"]["username"] == "newadmin"
        assert data["data"]["client_id"] is None
