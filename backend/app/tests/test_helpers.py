"""Tests for utility helper functions."""

from datetime import datetime, timezone

import pytest

from app.models import RoleEnum
from app.utils.helpers import (
    format_timestamp,
    get_role_permissions,
    parse_timestamp,
)


class TestGetRolePermissions:
    """Test role permissions utility function."""

    def test_admin_permissions(self):
        """Test that admin role has all permissions."""
        permissions = get_role_permissions("admin")

        assert "read_units" in permissions
        assert "write_units" in permissions
        assert "delete_units" in permissions
        assert "read_users" in permissions
        assert "write_users" in permissions
        assert "delete_users" in permissions
        assert "admin_panel" in permissions
        assert "remote_control" in permissions

    def test_operator_permissions(self):
        """Test that operator role has appropriate permissions."""
        permissions = get_role_permissions("operator")

        assert "read_units" in permissions
        assert "read_users" in permissions
        assert "remote_control" in permissions
        assert "write_units" not in permissions
        assert "delete_units" not in permissions

    def test_viewer_permissions(self):
        """Test that viewer role has read-only permissions."""
        permissions = get_role_permissions("viewer")

        assert "read_units" in permissions
        assert "read_users" in permissions
        assert "write_units" not in permissions
        assert "delete_units" not in permissions
        assert "remote_control" not in permissions

    def test_role_enum_input(self):
        """Test that function accepts RoleEnum objects."""
        permissions = get_role_permissions(RoleEnum.ADMIN)

        assert "read_units" in permissions
        assert len(permissions) > 0

    def test_unknown_role(self):
        """Test that unknown role returns empty permissions."""
        permissions = get_role_permissions("unknown_role")

        assert permissions == []

    def test_invalid_type(self):
        """Test that invalid type returns empty permissions."""
        permissions = get_role_permissions(123)

        assert permissions == []

    def test_none_input(self):
        """Test that None input returns empty permissions."""
        permissions = get_role_permissions(None)

        assert permissions == []


class TestFormatTimestamp:
    """Test timestamp formatting utility."""

    def test_format_datetime(self):
        """Test formatting a datetime object."""
        dt = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        result = format_timestamp(dt)

        assert result == "2024-01-01T12:00:00+00:00"

    def test_format_none(self):
        """Test formatting None returns None."""
        result = format_timestamp(None)

        assert result is None

    def test_format_datetime_with_microseconds(self):
        """Test formatting datetime with microseconds."""
        dt = datetime(2024, 1, 1, 12, 0, 0, 123456, tzinfo=timezone.utc)
        result = format_timestamp(dt)

        assert "2024-01-01" in result
        assert "12:00:00" in result


class TestParseTimestamp:
    """Test timestamp parsing utility."""

    def test_parse_iso_format(self):
        """Test parsing ISO format timestamp."""
        timestamp_str = "2024-01-01T12:00:00+00:00"
        result = parse_timestamp(timestamp_str)

        assert isinstance(result, datetime)
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 1

    def test_parse_none_raises_error(self):
        """Test that None raises ValueError."""
        with pytest.raises(ValueError, match="cannot be None or empty"):
            parse_timestamp(None)

    def test_parse_empty_string_raises_error(self):
        """Test that empty string raises ValueError."""
        with pytest.raises(ValueError, match="cannot be None or empty"):
            parse_timestamp("")

    def test_parse_whitespace_string_raises_error(self):
        """Test that whitespace string raises ValueError."""
        with pytest.raises(ValueError, match="Invalid timestamp format"):
            parse_timestamp("   ")
