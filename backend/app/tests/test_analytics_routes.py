"""Tests for advanced analytics routes."""

from datetime import datetime, timezone, timedelta
import pytest
from unittest.mock import MagicMock, patch
from flask import json

from app.models import Unit, Sensor, SensorReading, db


def test_get_dashboard_summary_empty(client, admin_token):
    """Test dashboard summary with an empty database."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    with patch("app.models.db.session.query") as mock_query:
        # We can mock the scalar returns for various queries
        # overview query mock:
        # total_units, active_units, total_sensors, recent_readings, current_week, previous_week, avg_temp, max_temp
        mock_query.return_value.scalar.side_effect = [0, 0, 0, 0, 0, 0, None, None]
        
        response = client.get("/api/v1/analytics/dashboard/summary", headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        
        assert data["overview"]["total_units"] == 0
        assert data["overview"]["active_units"] == 0
        assert data["overview"]["uptime_percentage"] == 0
        assert data["trends"]["trend_percentage"] == 0
        assert data["performance"]["avg_temperature_24h"] == 0.0
        assert data["performance"]["max_temperature_24h"] == 0.0
        assert data["performance"]["data_quality_score"] == 0


def test_get_dashboard_summary_with_data(client, admin_token):
    """Test dashboard summary with filled dataset."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    with patch("app.models.db.session.query") as mock_query:
        # total_units, active_units, total_sensors, recent_readings, current_week, previous_week, avg_temp, max_temp
        mock_query.return_value.scalar.side_effect = [10, 8, 30, 240, 1500, 1000, 45.2, 85.0]
        
        response = client.get("/api/v1/analytics/dashboard/summary", headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        
        assert data["overview"]["total_units"] == 10
        assert data["overview"]["active_units"] == 8
        assert data["overview"]["uptime_percentage"] == 80.0
        assert data["trends"]["trend_percentage"] == 50.0 # (1500-1000)/1000 * 100
        assert data["performance"]["avg_temperature_24h"] == 45.2
        assert data["performance"]["max_temperature_24h"] == 85.0


def test_get_unit_trends_not_found(client, admin_token):
    """Test get_unit_trends when unit does not exist."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    with patch("app.models.Unit.query") as mock_unit_query:
        mock_unit_query.get.return_value = None
        response = client.get("/api/v1/analytics/trends/NON_EXIST_UNIT", headers=headers)
        assert response.status_code == 404
        assert "Unit not found" in response.get_json()["error"]


def test_get_unit_trends_success(client, admin_token):
    """Test get_unit_trends calculations and grouping."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    mock_unit = MagicMock()
    mock_unit.id = "UNIT001"
    
    # Mock database return records
    class MockReadingRecord:
        def __init__(self, timestamp, value, sensor_type, name):
            self.timestamp = timestamp
            self.value = value
            self.sensor_type = sensor_type
            self.name = name

    now = datetime.now(timezone.utc)
    records = [
        MockReadingRecord(now - timedelta(hours=3), 20.0, "temperature", "Temp 1"),
        MockReadingRecord(now - timedelta(hours=2), 30.0, "temperature", "Temp 1"),
        MockReadingRecord(now - timedelta(hours=1), 25.0, "temperature", "Temp 1"),
        MockReadingRecord(now - timedelta(hours=2), 101.5, "pressure", "Press 1"),
    ]

    with patch("app.models.Unit.query") as mock_unit_query, \
         patch("app.models.db.session.query") as mock_query:
        
        mock_unit_query.get.return_value = mock_unit
        
        # Configure the chain query: join, filter, filter, order_by, all
        mock_query.return_value.join.return_value.filter.return_value.order_by.return_value.all.return_value = records
        
        # Test default trends (days=7)
        response = client.get("/api/v1/analytics/trends/UNIT001", headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["unit_id"] == "UNIT001"
        assert "temperature" in data["trends"]
        assert "pressure" in data["trends"]
        
        # Statistics for temperature: min=20, max=30, avg=25, count=3
        temp_stats = data["trends"]["temperature"]["statistics"]
        assert temp_stats["min"] == 20.0
        assert temp_stats["max"] == 30.0
        assert temp_stats["avg"] == 25.0
        assert temp_stats["count"] == 3


def test_get_units_performance(client, admin_token):
    """Test get_units_performance score calculations and status scoring."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Mock performance data per unit
    class MockPerformanceData:
        def __init__(self, uid, name, status, count, avg, mx, mn):
            self.id = uid
            self.name = name
            self.status = status
            self.reading_count = count
            self.avg_value = avg
            self.max_value = mx
            self.min_value = mn

    mock_records = [
        # online, 100 readings -> perfect score 100
        MockPerformanceData("U1", "Unit 1", "online", 50, 23.5, 30.0, 15.0),
        # offline, 0 readings -> score 100 - 50 (no readings) - 30 (offline) = 20
        MockPerformanceData("U2", "Unit 2", "offline", 0, None, None, None),
        # maintenance, 10 readings -> score 100 - 20 (low count) - 10 (maintenance) = 70
        MockPerformanceData("U3", "Unit 3", "maintenance", 10, 50.0, 60.0, 40.0),
    ]

    with patch("app.models.db.session.query") as mock_query:
        # Mock outerjoin, outerjoin, group_by, all
        mock_query.return_value.outerjoin.return_value.outerjoin.return_value.group_by.return_value.all.return_value = mock_records
        
        response = client.get("/api/v1/analytics/performance/units?hours=24", headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        
        assert data["summary"]["total_units"] == 3
        # Scores are: U1=100, U3=70, U2=20. Average is 63.3
        assert data["summary"]["avg_performance"] == pytest.approx(63.3, 0.1)
        assert data["units"][0]["unit_id"] == "U1"
        assert data["units"][0]["performance_score"] == 100
        assert data["units"][2]["unit_id"] == "U2"
        assert data["units"][2]["performance_score"] == 20


def test_get_alert_patterns_empty(client, admin_token):
    """Test alert patterns analysis with an empty dataset."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    with patch("app.models.db.session.query") as mock_query:
        mock_query.return_value.join.return_value.filter.return_value.group_by.return_value.all.return_value = []
        
        response = client.get("/api/v1/analytics/alerts/patterns?days=30", headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        
        assert data["total_potential_alerts"] == 0
        assert data["avg_alerts_per_day"] == 0.0
        assert data["most_problematic_sensor"] is None


def test_get_alert_patterns_success(client, admin_token):
    """Test alert patterns grouping and trend calculation."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    class MockAlertRecord:
        def __init__(self, count, date, sensor_type):
            self.count = count
            self.date = date
            self.sensor_type = sensor_type

    from datetime import date
    now_date = date.today()
    mock_records = [
        MockAlertRecord(5, now_date, "temperature"),
        MockAlertRecord(3, now_date, "pressure"),
    ]

    with patch("app.models.db.session.query") as mock_query:
        mock_query.return_value.join.return_value.filter.return_value.group_by.return_value.all.return_value = mock_records
        
        response = client.get("/api/v1/analytics/alerts/patterns?days=10", headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        
        assert data["total_potential_alerts"] == 8
        assert data["avg_alerts_per_day"] == 0.8 # 8 / 10
        assert data["most_problematic_sensor"] == "temperature"
        assert data["sensor_type_breakdown"]["temperature"] == 5
        assert data["sensor_type_breakdown"]["pressure"] == 3
