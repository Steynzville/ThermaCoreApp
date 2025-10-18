"""Test roles endpoint to ensure all three roles are returned."""


class TestRolesEndpoint:
    """Test the /api/v1/roles endpoint."""

    def get_auth_token(self, client, username="admin", password="admin123"):
        """Helper method to get authentication token."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200
        data = response.json
        if "data" in data and "access_token" in data["data"]:
            return data["data"]["access_token"]
        else:
            raise KeyError(f"'access_token' not found in login response: {data}")

    def test_get_roles_returns_all_three_roles(self, client):
        """Test that GET /api/v1/roles returns all three roles (admin, operator, viewer)."""
        # Get authentication token
        token = self.get_auth_token(client)

        # Make request to roles endpoint
        response = client.get(
            "/api/v1/roles",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Assert response is successful
        assert response.status_code == 200

        # Get response data
        roles = response.json
        assert isinstance(roles, list), "Response should be a list of roles"

        # Assert we have exactly 3 roles
        assert len(roles) == 3, f"Expected 3 roles, got {len(roles)}: {roles}"

        # Extract role names
        role_names = [role["name"] for role in roles]

        # Assert all three expected roles are present
        assert "admin" in role_names, f"admin role missing. Got: {role_names}"
        assert "operator" in role_names, f"operator role missing. Got: {role_names}"
        assert "viewer" in role_names, f"viewer role missing. Got: {role_names}"

    def test_get_roles_has_correct_structure(self, client):
        """Test that each role has the expected fields."""
        token = self.get_auth_token(client)

        response = client.get(
            "/api/v1/roles",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        roles = response.json

        # Check each role has required fields
        for role in roles:
            assert "id" in role, f"Role missing 'id' field: {role}"
            assert "name" in role, f"Role missing 'name' field: {role}"
            assert "description" in role, f"Role missing 'description' field: {role}"
            assert "permissions" in role, f"Role missing 'permissions' field: {role}"

    def test_get_roles_requires_authentication(self, client):
        """Test that the roles endpoint requires authentication."""
        # Make request without token
        response = client.get("/api/v1/roles")

        # Assert unauthorized
        assert response.status_code == 401

    def test_role_permissions_structure(self, client):
        """Test that role permissions have correct structure."""
        token = self.get_auth_token(client)

        response = client.get(
            "/api/v1/roles",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        roles = response.json

        # Find admin role and verify it has all permissions
        admin_role = next((r for r in roles if r["name"] == "admin"), None)
        assert admin_role is not None, "Admin role not found"
        assert len(admin_role["permissions"]) == 8, (
            f"Admin should have 8 permissions, got {len(admin_role['permissions'])}"
        )

        # Find operator role and verify it has correct permissions
        operator_role = next((r for r in roles if r["name"] == "operator"), None)
        assert operator_role is not None, "Operator role not found"
        assert len(operator_role["permissions"]) == 3, (
            f"Operator should have 3 permissions, got {len(operator_role['permissions'])}"
        )

        # Find viewer role and verify it has correct permissions
        viewer_role = next((r for r in roles if r["name"] == "viewer"), None)
        assert viewer_role is not None, "Viewer role not found"
        assert len(viewer_role["permissions"]) == 2, (
            f"Viewer should have 2 permissions, got {len(viewer_role['permissions'])}"
        )
