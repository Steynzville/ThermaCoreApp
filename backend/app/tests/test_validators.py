"""Tests for system validators, input validation, schemas, and out-of-range value handling."""

import pytest
from marshmallow import ValidationError
from app.utils.input_validator import InputValidator
from app.utils.schemas import UnitSchema, DateTimeField, EnumField
from app.models import UnitStatusEnum


class TestValidators:
    """Test validator services, schemas, and converter functions."""

    def test_sql_injection_detection(self):
        """Test detection of SQL injection patterns."""
        assert InputValidator.check_sql_injection("SELECT * FROM users") is True
        assert InputValidator.check_sql_injection("admin' OR '1'='1") is True
        assert InputValidator.check_sql_injection("normal_username_123") is False

    def test_xss_detection(self):
        """Test detection of XSS attack scripts."""
        assert InputValidator.check_xss("<script>alert(1)</script>") is True
        assert InputValidator.check_xss("javascript:alert(1)") is True
        assert InputValidator.check_xss("John Doe") is False

    def test_path_traversal_detection(self):
        """Test detection of directory traversal attempts."""
        assert InputValidator.check_path_traversal("../../etc/passwd") is True
        assert InputValidator.check_path_traversal("/etc/passwd") is True
        assert InputValidator.check_path_traversal("my_folder/my_file.txt") is False

    def test_command_injection_detection(self):
        """Test detection of system command injection patterns."""
        assert InputValidator.check_command_injection("cat /etc/passwd; rm -rf") is True
        assert InputValidator.check_command_injection("$(whoami)") is True
        assert InputValidator.check_command_injection("safe_input") is False

    def test_unit_schema_range_validation(self, db_session):
        """Test range validation for Unit fields (out-of-range sensor values)."""
        schema = UnitSchema(session=db_session)

        # Valid input
        valid_data = {
            "id": "UNIT123",
            "name": "Unit 123",
            "serial_number": "SN12345",
            "install_date": "2024-01-01T12:00:00Z",
            "temp_outside": 25.0,
            "humidity": 60.0,
            "battery_level": 80.0,
            "status": "online",
            "health_status": "optimal"
        }
        loaded = schema.load(valid_data)
        assert loaded.temp_outside == 25.0

        # Out of range temperature
        invalid_temp = valid_data.copy()
        invalid_temp["temp_outside"] = 150.0  # Max is 70.0
        with pytest.raises(ValidationError) as exc:
            schema.load(invalid_temp)
        assert "temp_outside" in exc.value.messages

        # Out of range humidity
        invalid_humidity = valid_data.copy()
        invalid_humidity["humidity"] = -10.0  # Min is 0.0
        with pytest.raises(ValidationError) as exc:
            schema.load(invalid_humidity)
        assert "humidity" in exc.value.messages

    def test_datetime_field_conversions(self):
        """Test robust datetime custom deserialization field."""
        dt_field = DateTimeField()

        # Valid format
        dt_str = "2024-01-01T12:00:00Z"
        serialized = dt_field._serialize(dt_str, "date", None)
        assert "2024-01-01" in serialized

        # Invalid format logs warning and returns None gracefully instead of breaking
        assert dt_field._serialize("not-a-date", "date", None) is None

    def test_enum_field_conversions(self):
        """Test enum field conversions and strict validation error raises."""
        enum_field = EnumField(UnitStatusEnum)

        # Valid deserialization
        assert enum_field.deserialize("online") == UnitStatusEnum.ONLINE

        # Invalid deserialization raises marshmallow ValidationError
        with pytest.raises(ValidationError) as exc:
            enum_field.deserialize("invalid_status")
        assert "Invalid value" in str(exc.value)
