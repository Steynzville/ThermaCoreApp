"""Tests for user permissions and role-based access control."""

import json
import pytest

from app.models import User, Role
from app.utils.helpers import get_role_permissions


class TestRolePermissions:
    """Test role-based permission assignment."""

    def test_get_role_permissions_admin(self):
        """Test that admin role gets full permissions."""
        permissions = get_role_permissions('admin')
        
        expected_permissions = [
            "read_units",
            "write_units",
            "delete_units",
            "read_users",
            "write_users",
            "delete_users",
            "admin_panel",
            "remote_control",
        ]
        
        assert permissions == expected_permissions
        assert "read_users" in permissions
        assert "write_users" in permissions
        assert "delete_users" in permissions

    def test_get_role_permissions_operator(self):
        """Test that operator role gets appropriate control permissions."""
        permissions = get_role_permissions('operator')
        
        expected_permissions = [
            "read_units",
            "read_users",
            "remote_control",
        ]
        
        assert permissions == expected_permissions
        assert "read_users" in permissions
        assert "remote_control" in permissions
        # Operators should NOT have write_users permission
        assert "write_users" not in permissions
        assert "delete_users" not in permissions

    def test_get_role_permissions_viewer(self):
        """Test that viewer role gets read-only permissions."""
        permissions = get_role_permissions('viewer')
        
        expected_permissions = [
            "read_units",
            "read_users",
        ]
        
        assert permissions == expected_permissions
        assert "read_users" in permissions
        # Viewers should only have read permissions
        assert "write_users" not in permissions
        assert "delete_users" not in permissions
        assert "remote_control" not in permissions

    def test_get_role_permissions_unknown_role(self):
        """Test that unknown role returns empty permissions."""
        permissions = get_role_permissions('unknown_role')
        assert permissions == []

    def test_get_role_permissions_case_insensitive(self):
        """Test that role names are case-insensitive."""
        permissions_lower = get_role_permissions('admin')
        permissions_upper = get_role_permissions('ADMIN')
        permissions_mixed = get_role_permissions('Admin')
        
        assert permissions_lower == permissions_upper == permissions_mixed


class TestUserCreationWithPermissions:
    """Test user creation with proper permission assignment."""

    def get_auth_token(self, client, username="admin", password="admin123"):
        """Helper method to get auth token."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json"},
        )
        
        if response.status_code == 200:
            data = json.loads(response.data)
            # Handle both wrapped and unwrapped responses
            if "data" in data and "access_token" in data["data"]:
                return data["data"]["access_token"]
            elif "access_token" in data:
                return data["access_token"]
        return None

    def test_register_admin_user_gets_read_users_permission(self, client, db_session):
        """Test that newly registered admin users get read_users permission."""
        # Get admin token
        token = self.get_auth_token(client)
        assert token is not None

        # Get admin role ID
        admin_role = Role.query.filter_by(name="admin").first()
        assert admin_role is not None

        # Register a new admin user
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "newadmin",
                "email": "newadmin@test.com",
                "password": "password123",
                "first_name": "New",
                "last_name": "Admin",
                "role_id": admin_role.id,
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
        )

        assert response.status_code == 201
        
        # Verify the user was created with permissions
        new_user = User.query.filter_by(username="newadmin").first()
        assert new_user is not None
        assert new_user.permissions is not None
        
        # Check permissions (handle both list and JSON string)
        if isinstance(new_user.permissions, str):
            permissions = json.loads(new_user.permissions)
        else:
            permissions = new_user.permissions
        
        assert "read_users" in permissions
        assert "write_users" in permissions
        assert "delete_users" in permissions
        assert "admin_panel" in permissions

    def test_register_operator_user_gets_correct_permissions(self, client, db_session):
        """Test that newly registered operator users get correct permissions."""
        # Get admin token
        token = self.get_auth_token(client)
        assert token is not None

        # Get operator role ID
        operator_role = Role.query.filter_by(name="operator").first()
        assert operator_role is not None

        # Register a new operator user
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "newoperator",
                "email": "newoperator@test.com",
                "password": "password123",
                "first_name": "New",
                "last_name": "Operator",
                "role_id": operator_role.id,
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
        )

        assert response.status_code == 201
        
        # Verify the user was created with permissions
        new_user = User.query.filter_by(username="newoperator").first()
        assert new_user is not None
        assert new_user.permissions is not None
        
        # Check permissions (handle both list and JSON string)
        if isinstance(new_user.permissions, str):
            permissions = json.loads(new_user.permissions)
        else:
            permissions = new_user.permissions
        
        assert "read_users" in permissions
        assert "read_units" in permissions
        assert "remote_control" in permissions
        # Operators should NOT have write/delete user permissions
        assert "write_users" not in permissions
        assert "delete_users" not in permissions

    def test_register_viewer_user_gets_correct_permissions(self, client, db_session):
        """Test that newly registered viewer users get correct permissions."""
        # Get admin token
        token = self.get_auth_token(client)
        assert token is not None

        # Get viewer role ID
        viewer_role = Role.query.filter_by(name="viewer").first()
        assert viewer_role is not None

        # Register a new viewer user
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "newviewer",
                "email": "newviewer@test.com",
                "password": "password123",
                "first_name": "New",
                "last_name": "Viewer",
                "role_id": viewer_role.id,
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
        )

        assert response.status_code == 201
        
        # Verify the user was created with permissions
        new_user = User.query.filter_by(username="newviewer").first()
        assert new_user is not None
        assert new_user.permissions is not None
        
        # Check permissions (handle both list and JSON string)
        if isinstance(new_user.permissions, str):
            permissions = json.loads(new_user.permissions)
        else:
            permissions = new_user.permissions
        
        assert "read_users" in permissions
        assert "read_units" in permissions
        # Viewers should only have read permissions
        assert "write_users" not in permissions
        assert "delete_users" not in permissions
        assert "remote_control" not in permissions

    def test_new_admin_can_access_users_endpoint(self, client, db_session):
        """Test that newly created admin can access the users endpoint."""
        # Get admin token to create new user
        admin_token = self.get_auth_token(client)
        assert admin_token is not None

        # Get admin role ID
        admin_role = Role.query.filter_by(name="admin").first()

        # Register a new admin user
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "testadmin2",
                "email": "testadmin2@test.com",
                "password": "password123",
                "first_name": "Test",
                "last_name": "Admin2",
                "role_id": admin_role.id,
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {admin_token}",
            },
        )

        assert response.status_code == 201

        # Login as the new admin
        new_admin_token = self.get_auth_token(client, "testadmin2", "password123")
        assert new_admin_token is not None

        # Try to access users endpoint
        response = client.get(
            "/api/v1/users",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {new_admin_token}",
            },
        )

        # Should succeed with 200 because new admin has read_users permission
        assert response.status_code == 200
