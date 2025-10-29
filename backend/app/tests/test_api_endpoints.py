"""Unit tests for remote control API endpoints."""

import json

from app.models import Unit, UnitStatusEnum, User


def unwrap_response(response):
    """Helper to extract data from standardized API response envelope.

    The API wraps responses in: {'success': bool, 'data': {...}, 'message': str, ...}
    This helper extracts the actual data payload.
    """
    data = json.loads(response.data)
    # If response has the standard envelope structure, return the inner data
    if "data" in data and "success" in data:
        return data["data"]
    # Otherwise return as-is (for error responses)
    return data


class TestRemoteControlEndpoints:
    """Test remote control API endpoints."""

    def get_auth_token(self, client, username="admin", password="admin123"):
        """Helper method to get auth token."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 200
        data = unwrap_response(response)
        return data["access_token"]

    def test_get_remote_control_permissions_admin(self, client, db_session):
        """Test getting remote control permissions for admin user."""
        token = self.get_auth_token(client)

        response = client.get(
            "/api/v1/remote-control/permissions",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["has_remote_control"] is True
        assert data["role"] == "admin"
        assert data["permissions"]["remote_control"] is True

    def test_get_remote_control_permissions_operator(self, client, db_session):
        """Test getting remote control permissions for operator user."""
        # Create operator user
        from app.models import Role, RoleEnum

        operator_role = Role.query.filter_by(name=RoleEnum.OPERATOR).first()
        operator_user = User(
            username="test_operator",
            email="operator@test.com",
            role_id=operator_role.id,
            is_active=True,
        )
        operator_user.set_password("operator123")
        db_session.add(operator_user)
        db_session.commit()

        token = self.get_auth_token(client, "test_operator", "operator123")

        response = client.get(
            "/api/v1/remote-control/permissions",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["has_remote_control"] is True
        assert data["role"] == "operator"
        assert data["permissions"]["remote_control"] is True

    def test_get_remote_control_permissions_viewer(self, client, db_session):
        """Test getting remote control permissions for viewer user."""
        # Create viewer user
        from app.models import Role, RoleEnum

        viewer_role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
        viewer_user = User(
            username="test_viewer",
            email="viewer@test.com",
            role_id=viewer_role.id,
            is_active=True,
        )
        viewer_user.set_password("viewer123")
        db_session.add(viewer_user)
        db_session.commit()

        token = self.get_auth_token(client, "test_viewer", "viewer123")

        response = client.get(
            "/api/v1/remote-control/permissions",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["has_remote_control"] is False
        assert data["role"] == "viewer"
        assert data["permissions"]["remote_control"] is False

    def test_get_remote_control_permissions_unauthorized(self, client):
        """Test getting remote control permissions without authentication."""
        response = client.get(
            "/api/v1/remote-control/permissions",
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 401

    def test_control_unit_power_success(self, client, db_session):
        """Test controlling unit power successfully."""
        token = self.get_auth_token(client)

        # Create test unit
        test_unit = Unit(
            id="TEST001",
            name="Test Unit",
            location="Test Location",
            status=UnitStatusEnum.OFFLINE,
            water_generation=False,
        )
        db_session.add(test_unit)
        db_session.commit()

        # Turn power on
        response = client.post(
            "/api/v1/remote-control/units/TEST001/power",
            json={"power_on": True},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["success"] is True
        assert data["power_on"] is True
        assert data["status"] == "online"

        # Verify database was updated
        unit = Unit.query.get("TEST001")
        assert unit.status == UnitStatusEnum.ONLINE

    def test_control_unit_power_turn_off(self, client, db_session):
        """Test turning unit power off."""
        token = self.get_auth_token(client)

        # Create test unit that's online with water generation
        test_unit = Unit(
            id="TEST002",
            name="Test Unit 2",
            location="Test Location",
            status=UnitStatusEnum.ONLINE,
            water_generation=True,
        )
        db_session.add(test_unit)
        db_session.commit()

        # Turn power off
        response = client.post(
            "/api/v1/remote-control/units/TEST002/power",
            json={"power_on": False},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["success"] is True
        assert data["power_on"] is False
        assert data["status"] == "offline"
        assert data["water_generation"] is False

        # Verify database was updated
        unit = Unit.query.get("TEST002")
        assert unit.status == UnitStatusEnum.OFFLINE
        assert unit.water_generation is False

    def test_control_unit_power_unauthorized(self, client, db_session):
        """Test controlling unit power without proper permissions."""
        # Create viewer user
        from app.models import Role, RoleEnum

        viewer_role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
        viewer_user = User(
            username="test_viewer_power",
            email="viewer_power@test.com",
            role_id=viewer_role.id,
            is_active=True,
        )
        viewer_user.set_password("viewer123")
        db_session.add(viewer_user)
        db_session.commit()

        token = self.get_auth_token(client, "test_viewer_power", "viewer123")

        response = client.post(
            "/api/v1/remote-control/units/TEST001/power",
            json={"power_on": True},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 403

    def test_control_unit_power_missing_field(self, client, db_session):
        """Test controlling unit power with missing power_on field."""
        token = self.get_auth_token(client)

        response = client.post(
            "/api/v1/remote-control/units/TEST001/power",
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400

    def test_control_unit_power_unit_not_found(self, client, db_session):
        """Test controlling unit power for non-existent unit."""
        token = self.get_auth_token(client)

        response = client.post(
            "/api/v1/remote-control/units/NONEXISTENT/power",
            json={"power_on": True},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 404

    def test_control_water_production_success(self, client, db_session):
        """Test controlling water production successfully."""
        token = self.get_auth_token(client)

        # Create test unit that's online
        test_unit = Unit(
            id="TEST003",
            name="Test Unit 3",
            location="Test Location",
            status=UnitStatusEnum.ONLINE,
            water_generation=False,
        )
        db_session.add(test_unit)
        db_session.commit()

        # Turn water production on
        response = client.post(
            "/api/v1/remote-control/units/TEST003/water-production",
            json={"water_production_on": True},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["success"] is True
        assert data["water_production_on"] is True

        # Verify database was updated
        unit = Unit.query.get("TEST003")
        assert unit.water_generation is True

    def test_control_water_production_unit_offline(self, client, db_session):
        """Test controlling water production on offline unit."""
        token = self.get_auth_token(client)

        # Create test unit that's offline
        test_unit = Unit(
            id="TEST004",
            name="Test Unit 4",
            location="Test Location",
            status=UnitStatusEnum.OFFLINE,
            water_generation=False,
        )
        db_session.add(test_unit)
        db_session.commit()

        # Try to turn water production on
        response = client.post(
            "/api/v1/remote-control/units/TEST004/water-production",
            json={"water_production_on": True},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert "offline" in data["error"].lower()

    def test_control_water_production_unauthorized(self, client, db_session):
        """Test controlling water production without proper permissions."""
        # Create viewer user
        from app.models import Role, RoleEnum

        viewer_role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
        viewer_user = User(
            username="test_viewer_water",
            email="viewer_water@test.com",
            role_id=viewer_role.id,
            is_active=True,
        )
        viewer_user.set_password("viewer123")
        db_session.add(viewer_user)
        db_session.commit()

        token = self.get_auth_token(client, "test_viewer_water", "viewer123")

        response = client.post(
            "/api/v1/remote-control/units/TEST003/water-production",
            json={"water_production_on": True},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 403

    def test_get_unit_status_success(self, client, db_session):
        """Test getting unit remote control status successfully."""
        token = self.get_auth_token(client)

        # Create test unit
        test_unit = Unit(
            id="TEST005",
            name="Test Unit 5",
            location="Test Location",
            status=UnitStatusEnum.ONLINE,
            water_generation=True,
        )
        db_session.add(test_unit)
        db_session.commit()

        response = client.get(
            "/api/v1/remote-control/units/TEST005/status",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["unit_id"] == "TEST005"
        assert data["status"] == "online"
        assert data["water_generation"] is True
        assert data["power_on"] is True

    def test_get_unit_status_unit_not_found(self, client, db_session):
        """Test getting status for non-existent unit."""
        token = self.get_auth_token(client)

        response = client.get(
            "/api/v1/remote-control/units/NONEXISTENT/status",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 404

    def test_get_unit_status_unauthorized(self, client):
        """Test getting unit status without authentication."""
        response = client.get(
            "/api/v1/remote-control/units/TEST005/status",
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 401
