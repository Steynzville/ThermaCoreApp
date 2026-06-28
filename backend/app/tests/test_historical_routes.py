"""Tests for historical data analysis routes."""

from datetime import datetime, timedelta
import pytest
from flask import json
from app.models import Unit, Sensor, SensorReading, db


@pytest.fixture
def seed_historical_data(app):
    """Seed sensor readings for unit TEST001 and TEST002."""
    with app.app_context():
        # Clean any existing readings or duplicate units first
        SensorReading.query.delete()
        
        # Ensure TEST001 has a temperature sensor
        sensor1 = Sensor.query.filter_by(unit_id="TEST001", sensor_type="temperature").first()
        if not sensor1:
            sensor1 = Sensor(
                unit_id="TEST001",
                name="Test Temperature Sensor",
                sensor_type="temperature",
                unit_of_measurement="°C",
                min_value=-10.0,
                max_value=50.0,
            )
            db.session.add(sensor1)
            db.session.commit()

        # Add a second unit for comparison tests
        unit2 = Unit.query.get("TEST002")
        if not unit2:
            unit2 = Unit(
                id="TEST002",
                name="Test Unit 002",
                serial_number="TEST002-2024-001",
                location="Test Site B",
                status="ONLINE",
                health_status="OPTIMAL",
                water_generation=True,
                client_name="Test Client B",
                client_email="clientb@test.com",
            )
            db.session.add(unit2)
            db.session.commit()

        sensor2 = Sensor.query.filter_by(unit_id="TEST002", sensor_type="temperature").first()
        if not sensor2:
            sensor2 = Sensor(
                unit_id="TEST002",
                name="Test Temperature Sensor 2",
                sensor_type="temperature",
                unit_of_measurement="°C",
                min_value=-10.0,
                max_value=50.0,
            )
            db.session.add(sensor2)
            db.session.commit()

        # Add several days of readings for both sensors
        now = datetime.utcnow()
        for i in range(10):
            timestamp = now - timedelta(hours=i * 6)
            # Sensor 1
            reading1 = SensorReading(
                sensor_id=sensor1.id,
                value=20.0 + i,  # 20 to 29
                timestamp=timestamp,
            )
            db.session.add(reading1)
            # Sensor 2
            reading2 = SensorReading(
                sensor_id=sensor2.id,
                value=15.0 + (i * 1.5),  # 15 to 28.5
                timestamp=timestamp,
            )
            db.session.add(reading2)

        db.session.commit()
        yield


def test_get_historical_data_raw(client, admin_token, seed_historical_data):
    """Test getting historical data raw format with authorization."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get(
        "/historical/data/TEST001?aggregation=raw&limit=5",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["unit_id"] == "TEST001"
    assert data["aggregation"] == "raw"
    assert data["total_records"] == 5
    assert len(data["data"]) == 5
    assert "timestamp" in data["data"][0]
    assert "value" in data["data"][0]


def test_get_historical_data_aggregated(client, admin_token, seed_historical_data):
    """Test get historical data with hourly, daily, and weekly aggregation."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Hourly
    res_hourly = client.get(
        "/historical/data/TEST001?aggregation=hourly&sensor_types=temperature",
        headers=headers,
    )
    assert res_hourly.status_code == 200
    data_h = res_hourly.get_json()
    assert data_h["aggregation"] == "hourly"
    assert data_h["total_records"] > 0
    assert "avg_value" in data_h["data"][0]

    # Daily
    res_daily = client.get(
        "/historical/data/TEST001?aggregation=daily",
        headers=headers,
    )
    assert res_daily.status_code == 200
    assert res_daily.get_json()["aggregation"] == "daily"

    # Weekly
    res_weekly = client.get(
        "/historical/data/TEST001?aggregation=weekly",
        headers=headers,
    )
    assert res_weekly.status_code == 200
    assert res_weekly.get_json()["aggregation"] == "weekly"


def test_get_historical_data_not_found(client, admin_token):
    """Test get historical data for a non-existent unit."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/historical/data/NONEXIST?aggregation=raw", headers=headers)
    assert response.status_code == 404


def test_compare_units_historical_success(client, admin_token, seed_historical_data):
    """Test comparing historical data between multiple units."""
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "unit_ids": ["TEST001", "TEST002"],
        "sensor_type": "temperature",
        "aggregation": "daily",
    }
    response = client.post(
        "/historical/compare/units",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "comparison" in data
    comp = data["comparison"]
    assert comp["unit_ids"] == ["TEST001", "TEST002"]
    assert comp["sensor_type"] == "temperature"
    assert comp["aggregation"] == "daily"
    assert "unit_summaries" in comp
    assert "TEST001" in comp["unit_summaries"]
    assert "TEST002" in comp["unit_summaries"]


def test_compare_units_not_found(client, admin_token):
    """Test comparing historical data when one unit does not exist."""
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "unit_ids": ["TEST001", "NONEXIST"],
        "sensor_type": "temperature",
        "aggregation": "daily",
    }
    response = client.post(
        "/historical/compare/units",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 404


def test_export_historical_csv(client, admin_token, seed_historical_data):
    """Test exporting historical data in CSV format."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get(
        "/historical/export/TEST001?format=csv&sensor_types=temperature",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.mimetype == "text/csv"
    assert "attachment; filename=unit_TEST001_historical_data.csv" in response.headers["Content-Disposition"]
    csv_data = response.data.decode("utf-8")
    assert "timestamp,sensor_type,sensor_name,unit,value" in csv_data


def test_export_historical_json(client, admin_token, seed_historical_data):
    """Test exporting historical data in JSON format."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get(
        "/historical/export/TEST001?format=json",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["unit_id"] == "TEST001"
    assert data["export_format"] == "json"
    assert data["total_records"] > 0


def test_get_historical_statistics_success(client, admin_token, seed_historical_data):
    """Test historical statistics endpoint with stddev calculation."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get(
        "/historical/statistics/TEST001?days=30&sensor_type=temperature",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["unit_id"] == "TEST001"
    assert "statistics" in data
    stats = data["statistics"]["temperature"]
    assert stats["total_readings"] > 0
    assert "average" in stats
    assert "minimum" in stats
    assert "maximum" in stats
    assert "standard_deviation" in stats


def test_get_historical_statistics_empty(client, admin_token):
    """Test statistical analysis with no historical data (empty database)."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Clean readings first
    SensorReading.query.delete()
    db.session.commit()
    
    response = client.get(
        "/historical/statistics/TEST001?days=30",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["total_sensor_types"] == 0
