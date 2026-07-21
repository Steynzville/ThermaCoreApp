"""Tests for utility helper functions."""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.models import RoleEnum, Sensor, SensorReading, Unit, db
from app.utils.helpers import (
    build_search_filter,
    calculate_time_range,
    calculate_unit_efficiency,
    format_timestamp,
    generate_health_score,
    get_current_user_id,
    get_recent_sensor_readings,
    get_role_permissions,
    paginate_query,
    parse_timestamp,
    validate_json_request,
    validate_unit_readings,
)


def test_get_current_user_id():
    """Test retrieving user ID from JWT identity with different types."""
    # Case 1: Valid int ID
    with patch("app.utils.helpers.get_jwt_identity", return_value="123"):
        user_id, success = get_current_user_id()
        assert user_id == 123
        assert success is True

    # Case 2: None identity
    with patch("app.utils.helpers.get_jwt_identity", return_value=None):
        user_id, success = get_current_user_id()
        assert user_id is None
        assert success is False

    # Case 3: Invalid type/non-numeric ID
    with patch("app.utils.helpers.get_jwt_identity", return_value="not_an_int"):
        user_id, success = get_current_user_id()
        assert user_id is None
        assert success is False


def test_get_role_permissions():
    """Test permission mapping for different roles."""
    # Case 1: String ADMIN
    perms_admin = get_role_permissions("admin")
    assert "admin_panel" in perms_admin
    assert "remote_control" in perms_admin

    # Case 2: String OPERATOR
    perms_operator = get_role_permissions("operator")
    assert "remote_control" in perms_operator
    assert "admin_panel" not in perms_operator

    # Case 3: RoleEnum VIEWER
    perms_viewer = get_role_permissions(RoleEnum.VIEWER)
    assert "read_units" in perms_viewer
    assert "remote_control" not in perms_viewer

    # Case 4: Unknown role string
    assert get_role_permissions("ghost") == []

    # Case 5: Invalid role type
    assert get_role_permissions(12345) == []


def test_paginate_query(app):
    """Test SQL query pagination function."""
    with app.app_context():
        mock_query = MagicMock()
        mock_pagination = MagicMock()
        mock_pagination.items = ["item1", "item2"]
        mock_pagination.total = 10
        mock_pagination.pages = 5
        mock_pagination.has_next = True
        mock_pagination.has_prev = False

        mock_query.paginate.return_value = mock_pagination

        res = paginate_query(mock_query, page=2, per_page=2)
        assert res["data"] == ["item1", "item2"]
        assert res["page"] == 2
        assert res["total"] == 10
        assert res["pages"] == 5
        assert res["has_next"] is True
        assert res["has_prev"] is False


def test_validate_json_request_decorator(app):
    """Test the JSON validation decorator handles content-types properly."""

    @validate_json_request()
    def dummy_route():
        return "Success"

    # Case 1: Not JSON
    with app.test_request_context(headers={"Content-Type": "text/html"}):
        _res, status_code = dummy_route()
        assert status_code == 400

    # Case 2: Empty JSON body
    with app.test_request_context(
        headers={"Content-Type": "application/json"},
        data="",
    ):
        with pytest.raises(Exception):
            dummy_route()

    # Case 3: Valid JSON body
    with app.test_request_context(
        headers={"Content-Type": "application/json"},
        json={"key": "val"},
    ):
        assert dummy_route() == "Success"


def test_format_timestamp():
    """Test formatting datetime object to ISO string."""
    dt = datetime(2026, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    assert format_timestamp(dt) == "2026-06-01T12:00:00+00:00"
    assert format_timestamp(None) is None


def test_parse_timestamp():
    """Test parsing ISO string timestamp to timezone-aware datetime."""
    # Timezone-aware ISO string
    ts_aware = "2026-06-01T12:00:00+00:00"
    dt_aware = parse_timestamp(ts_aware)
    assert dt_aware.tzinfo is not None

    # Naive ISO string (should convert to UTC)
    ts_naive = "2026-06-01T12:00:00"
    dt_naive = parse_timestamp(ts_naive)
    assert dt_naive.tzinfo == timezone.utc

    # Invalid timestamp
    with pytest.raises(ValueError, match="Invalid timestamp format"):
        parse_timestamp("not-a-timestamp")

    # None or empty
    with pytest.raises(ValueError, match="timestamp_str cannot be None or empty"):
        parse_timestamp(None)
    with pytest.raises(ValueError, match="timestamp_str cannot be None or empty"):
        parse_timestamp("")


def test_calculate_time_range():
    """Test calculating timezone-aware UTC time range."""
    start, end = calculate_time_range(hours_back=12)
    assert end.tzinfo == timezone.utc
    assert start.tzinfo == timezone.utc
    diff = end - start
    assert abs(diff.total_seconds() - 12 * 3600) < 1.0


def test_build_search_filter():
    """Test building SQLAlchemy search filters."""

    class FakeModel:
        name = Unit.name
        location = Unit.location

    # Empty search term
    assert build_search_filter(FakeModel, ["name"], "") is None

    # Valid search fields
    res = build_search_filter(FakeModel, ["name", "location"], "test")
    assert res is not None


def test_validate_unit_readings():
    """Test validating unit sensor readings data."""
    # Perfect readings
    valid_data = {
        "temp_outside": 25.0,
        "humidity": 50.0,
        "battery_level": 90.0,
    }
    assert validate_unit_readings(valid_data) == []

    # Below minimum
    low_data = {
        "temp_outside": -100.0,  # Min -50.0
    }
    errs_low = validate_unit_readings(low_data)
    assert len(errs_low) == 1
    assert "below minimum" in errs_low[0]

    # Exceeds maximum
    high_data = {
        "humidity": 120.0,  # Max 100.0
    }
    errs_high = validate_unit_readings(high_data)
    assert len(errs_high) == 1
    assert "exceeds maximum" in errs_high[0]


def test_get_recent_sensor_readings(app, db_session):
    """Test querying recent sensor readings using helper."""
    with app.app_context():
        unit_id = "TEST001"
        readings = get_recent_sensor_readings(unit_id, sensor_type="temperature")
        assert isinstance(readings, list)


def test_calculate_unit_efficiency(app, db_session):
    """Test calculating unit efficiency metrics."""
    with app.app_context():
        # Invalid Unit
        assert calculate_unit_efficiency("NONEXIST") == {}

        # Valid Unit TEST001 with mock data
        # We need power and level readings
        unit_id = "TEST001"
        sensor_power = Sensor.query.filter_by(
            unit_id=unit_id,
            sensor_type="power",
        ).first()
        if not sensor_power:
            sensor_power = Sensor(
                unit_id=unit_id,
                name="Power",
                sensor_type="power",
                unit_of_measurement="kW",
            )
            db.session.add(sensor_power)

        sensor_level = Sensor.query.filter_by(
            unit_id=unit_id,
            sensor_type="level",
        ).first()
        if not sensor_level:
            sensor_level = Sensor(
                unit_id=unit_id,
                name="Level",
                sensor_type="level",
                unit_of_measurement="L",
            )
            db.session.add(sensor_level)
        db.session.commit()

        # Seed power and water level readings
        now = datetime.now(timezone.utc)
        reading_power = SensorReading(
            sensor_id=sensor_power.id,
            value=50.0,
            timestamp=now,
        )
        reading_level1 = SensorReading(
            sensor_id=sensor_level.id,
            value=100.0,
            timestamp=now - timedelta(hours=2),
        )
        reading_level2 = SensorReading(
            sensor_id=sensor_level.id,
            value=200.0,
            timestamp=now,
        )

        db.session.add_all([reading_power, reading_level1, reading_level2])
        db.session.commit()

        metrics = calculate_unit_efficiency(unit_id)
        assert metrics["uptime_percentage"] == 100.0
        assert metrics["average_power"] == 50.0
        assert metrics["water_generation_rate"] > 0.0
        assert metrics["efficiency_ratio"] > 0.0


def test_generate_health_score(app, db_session):
    """Test health score generator handles offline/error/maintenance, alarms/alerts, battery levels, overdue maintenance."""
    with app.app_context():
        # Non-existent unit
        assert generate_health_score("NONEXIST") == {}

        unit = Unit.query.get("TEST001")

        # Scenario 1: Perfect Health
        unit.status = "online"
        unit.health_status = "optimal"
        unit.has_alarm = False
        unit.has_alert = False
        unit.battery_level = 100
        unit.last_maintenance = datetime.now(timezone.utc) - timedelta(days=5)
        db.session.commit()

        health = generate_health_score(unit.id)
        assert health["score"] == 100
        assert health["health_level"] == "excellent"

        # Scenario 2: Offline status, critical health, active alarms, low battery
        unit.status = "offline"  # -50
        unit.health_status = "critical"  # -40
        unit.has_alarm = True  # -20
        unit.battery_level = 10  # -15
        unit.last_maintenance = datetime.now(timezone.utc) - timedelta(
            days=120,
        )  # overdue maintenance -10
        db.session.commit()

        health = generate_health_score(unit.id)
        assert health["score"] <= 55
        assert health["health_level"] in ["critical", "fair"]
        assert len(health["factors"]) >= 1
        assert "Low battery level" in health["factors"]
        assert "Overdue maintenance" in health["factors"]

        # Scenario 3: Maintenance, warning status, active alerts, medium battery, naive last maintenance datetime
        unit.status = "maintenance"  # -10
        unit.health_status = "warning"  # -20
        unit.has_alarm = False
        unit.has_alert = True  # -10
        unit.battery_level = 30  # -5
        unit.last_maintenance = datetime.utcnow() - timedelta(
            days=70,
        )  # naive datetime, due soon -5
        db.session.commit()

        health = generate_health_score(unit.id)
        scenario3_score = health["score"]
        assert health["score"] >= 50
        assert health["health_level"] in ["fair", "good", "excellent"]
        assert len(health["factors"]) >= 1
        assert "Maintenance due soon" in health["factors"]

        # Scenario 4: Error status, has alert, battery level 30
        unit.status = "error"  # -30
        db.session.commit()
        health = generate_health_score(unit.id)
        assert health["score"] <= scenario3_score
        assert len(health["factors"]) >= 1
