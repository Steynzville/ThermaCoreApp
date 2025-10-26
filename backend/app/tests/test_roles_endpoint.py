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
        data = response.get_json()
        if "data" in data and "access_token" in data["data"]:
            return data["data"]["access_token"]
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
        roles = response.get_json()
        assert isinstance(roles, list), "Response should be a list of roles"

        # Assert we have exactly 3 roles
        assert len(roles) == 3, f"Expected 3 roles, got {len(roles)}: {roles}"

        # Extract role names using set for comparison
        role_names = {role["name"] for role in roles}
        expected_roles = {"admin", "operator", "viewer"}

        # Assert all three expected roles are present
        assert role_names == expected_roles, (
            f"Expected {expected_roles}, got {role_names}"
        )

    def test_get_roles_has_correct_structure(self, client):
        """Test that each role has the expected fields."""
        token = self.get_auth_token(client)

        response = client.get(
            "/api/v1/roles",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        roles = response.get_json()

        # Check each role has required fields
        for role in roles:
            assert "id" in role, f"Role missing 'id' field: {role}"
            assert "name" in role, f"Role missing 'name' field: {role}"
            assert "description" in role, f"Role missing 'description' field: {role}"
            assert "permissions" in role, f"Role missing 'permissions' field: {role}"
            assert isinstance(role["permissions"], list), "Permissions should be a list"

            # Check permission structure
            for permission in role["permissions"]:
                assert "id" in permission, (
                    f"Permission missing 'id' field: {permission}"
                )
                assert "name" in permission, (
                    f"Permission missing 'name' field: {permission}"
                )
                assert "description" in permission, (
                    f"Permission missing 'description' field: {permission}"
                )

    def test_get_roles_requires_authentication(self, client):
        """Test that the roles endpoint requires authentication."""
        # Make request without token
        response = client.get("/api/v1/roles")

        # Assert unauthorized
        assert response.status_code == 401

        data = response.get_json()
        assert data is not None, "Response should contain JSON data"

    def test_role_permissions_structure(self, client):
        """Test that role permissions have correct structure with flexible assertions."""
        token = self.get_auth_token(client)

        response = client.get(
            "/api/v1/roles",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        roles = response.get_json()

        # Convert to dict for easier access
        roles_dict = {role["name"]: role for role in roles}

        # Test admin role has expected permissions (flexible assertion - allows for future additions)
        admin_role = roles_dict.get("admin")
        assert admin_role is not None, "Admin role not found"
        admin_permissions = {perm["name"] for perm in admin_role["permissions"]}

        expected_admin_permissions = {
            "read_units",
            "write_units",
            "delete_units",
            "read_users",
            "write_users",
            "delete_users",
            "admin_panel",
            "remote_control",
        }

        assert expected_admin_permissions.issubset(admin_permissions), (
            f"Admin missing expected permissions: {expected_admin_permissions - admin_permissions}"
        )

        # Test operator role permissions
        operator_role = roles_dict.get("operator")
        assert operator_role is not None, "Operator role not found"
        operator_permissions = {perm["name"] for perm in operator_role["permissions"]}
        expected_operator_permissions = {"read_units", "read_users", "remote_control"}
        assert operator_permissions == expected_operator_permissions, (
            f"Operator permissions mismatch. Expected: {expected_operator_permissions}, got: {operator_permissions}"
        )

        # Test viewer role permissions
        viewer_role = roles_dict.get("viewer")
        assert viewer_role is not None, "Viewer role not found"
        viewer_permissions = {perm["name"] for perm in viewer_role["permissions"]}
        expected_viewer_permissions = {"read_units", "read_users"}
        assert viewer_permissions == expected_viewer_permissions, (
            f"Viewer permissions mismatch. Expected: {expected_viewer_permissions}, got: {viewer_permissions}"
        )
