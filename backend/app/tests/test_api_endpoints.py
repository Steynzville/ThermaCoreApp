"""Unit tests for remote control API endpoints."""

import json
import uuid
from datetime import datetime, timezone

from app.models import Role, RoleEnum, Unit, UnitStatusEnum, User


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
        operator_role = Role.query.filter_by(name=RoleEnum.OPERATOR).first()
        unique_suffix = str(uuid.uuid4())[:8]
        operator_user = User(
            username=f"test_operator_{unique_suffix}",
            email=f"operator_{unique_suffix}@test.com",
            role_id=operator_role.id,
            is_active=True,
        )
        operator_user.set_password("operator123")
        db_session.add(operator_user)
        db_session.commit()

        token = self.get_auth_token(
            client, f"test_operator_{unique_suffix}", "operator123",
        )

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
        viewer_role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
        unique_suffix = str(uuid.uuid4())[:8]
        viewer_user = User(
            username=f"test_viewer_{unique_suffix}",
            email=f"viewer_{unique_suffix}@test.com",
            role_id=viewer_role.id,
            is_active=True,
        )
        viewer_user.set_password("viewer123")
        db_session.add(viewer_user)
        db_session.commit()

        token = self.get_auth_token(
            client, f"test_viewer_{unique_suffix}", "viewer123",
        )

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
        unit_id = f"TEST-{str(uuid.uuid4())[:8]}"
        test_unit = Unit(
            id=unit_id,
            name="Test Unit",
            serial_number=f"SN-{unit_id}",
            install_date=datetime(2024, 1, 15, tzinfo=timezone.utc),
            location="Test Location",
            status=UnitStatusEnum.OFFLINE,
            water_generation=False,
        )
        db_session.add(test_unit)
        db_session.commit()

        # Turn power on
        response = client.post(
            f"/api/v1/remote-control/units/{unit_id}/power",
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
        unit = Unit.query.get(unit_id)
        assert unit.status == UnitStatusEnum.ONLINE

    def test_control_unit_power_turn_off(self, client, db_session):
        """Test turning unit power off."""
        token = self.get_auth_token(client)

        # Create test unit that's online with water generation
        unit_id = f"TEST-{str(uuid.uuid4())[:8]}"
        test_unit = Unit(
            id=unit_id,
            name="Test Unit 2",
            serial_number=f"SN-{unit_id}",
            install_date=datetime(2024, 1, 15, tzinfo=timezone.utc),
            location="Test Location",
            status=UnitStatusEnum.ONLINE,
            water_generation=True,
        )
        db_session.add(test_unit)
        db_session.commit()

        # Turn power off
        response = client.post(
            f"/api/v1/remote-control/units/{unit_id}/power",
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
        unit = Unit.query.get(unit_id)
        assert unit.status == UnitStatusEnum.OFFLINE
        assert unit.water_generation is False

    def test_control_unit_power_unauthorized(self, client, db_session):
        """Test controlling unit power without proper permissions."""
        # Create viewer user
        viewer_role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
        unique_suffix = str(uuid.uuid4())[:8]
        viewer_user = User(
            username=f"test_viewer_power_{unique_suffix}",
            email=f"viewer_power_{unique_suffix}@test.com",
            role_id=viewer_role.id,
            is_active=True,
        )
        viewer_user.set_password("viewer123")
        db_session.add(viewer_user)
        db_session.commit()

        token = self.get_auth_token(
            client, f"test_viewer_power_{unique_suffix}", "viewer123",
        )

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
        unit_id = f"TEST-{str(uuid.uuid4())[:8]}"
        test_unit = Unit(
            id=unit_id,
            name="Test Unit 3",
            serial_number=f"SN-{unit_id}",
            install_date=datetime(2024, 1, 15, tzinfo=timezone.utc),
            location="Test Location",
            status=UnitStatusEnum.ONLINE,
            water_generation=False,
        )
        db_session.add(test_unit)
        db_session.commit()

        # Turn water production on
        response = client.post(
            f"/api/v1/remote-control/units/{unit_id}/water-production",
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
        unit = Unit.query.get(unit_id)
        assert unit.water_generation is True

    def test_control_water_production_unit_offline(self, client, db_session):
        """Test controlling water production on offline unit."""
        token = self.get_auth_token(client)

        # Create test unit that's offline
        unit_id = f"TEST-{str(uuid.uuid4())[:8]}"
        test_unit = Unit(
            id=unit_id,
            name="Test Unit 4",
            serial_number=f"SN-{unit_id}",
            install_date=datetime(2024, 1, 15, tzinfo=timezone.utc),
            location="Test Location",
            status=UnitStatusEnum.OFFLINE,
            water_generation=False,
        )
        db_session.add(test_unit)
        db_session.commit()

        # Try to turn water production on
        response = client.post(
            f"/api/v1/remote-control/units/{unit_id}/water-production",
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
        viewer_role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
        unique_suffix = str(uuid.uuid4())[:8]
        viewer_user = User(
            username=f"test_viewer_water_{unique_suffix}",
            email=f"viewer_water_{unique_suffix}@test.com",
            role_id=viewer_role.id,
            is_active=True,
        )
        viewer_user.set_password("viewer123")
        db_session.add(viewer_user)
        db_session.commit()

        token = self.get_auth_token(
            client, f"test_viewer_water_{unique_suffix}", "viewer123",
        )

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
        unit_id = f"TEST-{str(uuid.uuid4())[:8]}"
        test_unit = Unit(
            id=unit_id,
            name="Test Unit 5",
            serial_number=f"SN-{unit_id}",
            install_date=datetime(2024, 1, 15, tzinfo=timezone.utc),
            location="Test Location",
            status=UnitStatusEnum.ONLINE,
            water_generation=True,
        )
        db_session.add(test_unit)
        db_session.commit()

        response = client.get(
            f"/api/v1/remote-control/units/{unit_id}/status",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["unit_id"] == unit_id
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
