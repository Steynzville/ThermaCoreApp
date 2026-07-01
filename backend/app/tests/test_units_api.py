"""Tests for Unit API endpoints including GET, POST, PUT, DELETE, pagination, filtering, and error cases."""

import json
from datetime import datetime
import pytest
from app.models import Unit


class TestUnitsAPI:
    """Tests for standard unit CRUD operations, filtering, and pagination."""

    def test_get_units_paginated_and_filtered(self, client, admin_token):
        """Test getting units list with pagination and status filters."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test success list and default pagination
        response = client.get("/api/v1/units", headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "data" in data
        assert "page" in data
        assert "per_page" in data
        assert "total" in data

        # Test filtering by status
        response = client.get("/api/v1/units?status=online", headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        for unit in data["data"]:
            assert unit["status"] == "online"

    def test_get_unit_by_id(self, client, admin_token):
        """Test fetching a specific unit by its ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get("/api/v1/units/TEST001", headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["id"] == "TEST001"
        assert data["name"]

    def test_get_unit_not_found(self, client, admin_token):
        """Test fetching a non-existent unit returns 404."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get("/api/v1/units/NONEXISTENT", headers=headers)
        assert response.status_code == 404

    def test_create_unit_success_and_conflict(self, client, admin_token, db_session):
        """Test creating a unit, and verify duplicate conflicts return 409."""
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        unique_suffix = datetime.utcnow().strftime("%H%M%S%f")
        unit_id = f"UNIT{unique_suffix[-6:]}"
        new_unit_payload = {
            "id": unit_id,
            "name": "Factory Unit 002",
            "serial_number": f"SN-UNIT-{unique_suffix}",
            "install_date": "2024-02-01T12:00:00Z",
            "location": "Berlin",
            "status": "online",
            "health_status": "optimal",
            "client_name": "Factory Client",
            "client_email": "factory@example.com",
        }

        # Create unit
        response = client.post("/api/v1/units", json=new_unit_payload, headers=headers)
        assert response.status_code in [200, 201]
        data = json.loads(response.data)
        assert data["id"] == unit_id

        # Attempt to create duplicate should return 409
        response_dup = client.post("/api/v1/units", json=new_unit_payload, headers=headers)
        assert response_dup.status_code == 409

        # Cleanup
        unit = Unit.query.get(unit_id)
        if unit:
            db_session.delete(unit)
            db_session.commit()

    def test_create_unit_validation_error(self, client, admin_token):
        """Test creating a unit with invalid values (out-of-range temp_outside)."""
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        invalid_payload = {
            "id": "UNIT_INVALID",
            "name": "Invalid Unit",
            "serial_number": "SN-INVALID",
            "install_date": "2024-02-01T12:00:00Z",
            "temp_outside": 120.0,  # Max allowed is 70.0
            "humidity": 50.0,
            "battery_level": 90.0
        }

        response = client.post("/api/v1/units", json=invalid_payload, headers=headers)
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data or "validation" in str(data).lower()

    def test_update_unit_success(self, client, admin_token):
        """Test updating fields on an existing unit."""
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        update_payload = {
            "name": "Updated Test Unit Name",
            "location": "Munich"
        }

        response = client.put("/api/v1/units/TEST001", json=update_payload, headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["name"] == "Updated Test Unit Name"
        assert data["location"] == "Munich"

    def test_delete_unit_not_found_and_success(self, client, admin_token, db_session):
        """Test delete endpoints for units (success and 404 cases)."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Test 404
        response = client.delete("/api/v1/units/NONEXISTENT", headers=headers)
        assert response.status_code == 404

        # Test success (create a temporary unit to delete)
        temp_unit = Unit(
            id="DEL001",
            name="Delete Unit",
            serial_number="SN-DEL-001",
            status="offline",
            health_status="optimal"
        )
        db_session.add(temp_unit)
        db_session.commit()

        # Delete it
        response = client.delete("/api/v1/units/DEL001", headers=headers)
        assert response.status_code in [200, 204]
