"""Tests for Sensor and SensorReading API endpoints including readings, time-series queries, and error cases."""

import json
from datetime import datetime, timedelta, timezone

from app.models import Sensor, SensorReading


class TestSensorsAPI:
    """Test suite for sensor definition, reading queries, and validation rules."""

    def test_get_unit_sensors(self, client, admin_token):
        """Test listing all sensors configured on a unit."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        response = client.get("/api/v1/units/TEST001/sensors", headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)
        if len(data) > 0:
            assert "sensor_type" in data[0]

    def test_create_unit_sensor_success(self, client, admin_token, db_session):
        """Test creating a sensor on a unit successfully."""
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json",
        }

        payload = {
            "name": "Flow Rate Sensor",
            "sensor_type": "flow_rate",
            "unit_of_measurement": "L/min",
            "min_value": 0.0,
            "max_value": 100.0,
        }

        response = client.post(
            "/api/v1/units/TEST001/sensors", json=payload, headers=headers
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data["name"] == "Flow Rate Sensor"
        assert data["sensor_type"] == "flow_rate"

        # Cleanup
        sensor = Sensor.query.filter_by(
            unit_id="TEST001", name="Flow Rate Sensor"
        ).first()
        if sensor:
            db_session.delete(sensor)
            db_session.commit()

    def test_create_unit_sensor_unit_not_found(self, client, admin_token):
        """Test creating a sensor on a non-existent unit returns 404."""
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json",
        }

        payload = {
            "name": "Orphan Sensor",
            "sensor_type": "temperature",
            "unit_of_measurement": "°C",
            "min_value": 0.0,
            "max_value": 100.0,
        }

        response = client.post(
            "/api/v1/units/NONEXISTENT/sensors", json=payload, headers=headers
        )
        assert response.status_code == 404

    def test_create_unit_sensor_validation_error(self, client, admin_token):
        """Test sensor creation with validation failures (missing sensor_type)."""
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json",
        }

        # Missing sensor_type
        payload = {
            "name": "Incomplete Sensor",
            "unit_of_measurement": "°C",
        }

        response = client.post(
            "/api/v1/units/TEST001/sensors", json=payload, headers=headers
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "details" in data or "error" in data

    def test_get_unit_readings_time_series(self, client, admin_token, db_session):
        """Test querying time-series sensor readings with filters."""
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create some mock sensor readings in the database
        sensor = Sensor.query.filter_by(unit_id="TEST001").first()
        assert sensor is not None

        now = datetime.now(timezone.utc)
        reading1 = SensorReading(
            sensor_id=sensor.id,
            value=22.5,
            quality="GOOD",
            timestamp=now - timedelta(minutes=30),
        )
        reading2 = SensorReading(
            sensor_id=sensor.id,
            value=23.1,
            quality="GOOD",
            timestamp=now - timedelta(minutes=10),
        )

        db_session.add_all([reading1, reading2])
        db_session.commit()

        try:
            # Get readings for the past 2 hours
            response = client.get(
                "/api/v1/units/TEST001/readings?hours=2", headers=headers
            )
            assert response.status_code == 200
            data = json.loads(response.data)
            assert isinstance(data, list)

            # Retrieve with sensor_type filter
            response_filtered = client.get(
                f"/api/v1/units/TEST001/readings?hours=2&sensor_type={sensor.sensor_type}",
                headers=headers,
            )
            assert response_filtered.status_code == 200

        finally:
            db_session.delete(reading1)
            db_session.delete(reading2)
            db_session.commit()
