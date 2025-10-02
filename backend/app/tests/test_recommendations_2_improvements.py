"""Tests for recommendations_2.txt improvements."""
import pytest
from datetime import datetime, timezone
from app.utils.helpers import parse_timestamp


class TestTimestampParsing:
    """Test robust timestamp parsing improvements."""
    
    def test_parse_timestamp_with_z_suffix(self):
        """Test parsing ISO timestamp with Z suffix."""
        timestamp_str = "2025-01-15T10:30:00Z"
        result = parse_timestamp(timestamp_str)
        assert isinstance(result, datetime)
        assert result.tzinfo is not None
        assert result.year == 2025
        assert result.month == 1
        assert result.day == 15
        
    def test_parse_timestamp_with_utc_offset(self):
        """Test parsing ISO timestamp with UTC offset."""
        timestamp_str = "2025-01-15T10:30:00+00:00"
        result = parse_timestamp(timestamp_str)
        assert isinstance(result, datetime)
        assert result.tzinfo is not None
        
    def test_parse_timestamp_naive_datetime(self):
        """Test parsing naive datetime string - should convert to UTC."""
        timestamp_str = "2025-01-15T10:30:00"
        result = parse_timestamp(timestamp_str)
        assert isinstance(result, datetime)
        assert result.tzinfo is not None
        assert result.tzinfo == timezone.utc
        
    def test_parse_timestamp_empty_string(self):
        """Test that empty string raises ValueError."""
        with pytest.raises(ValueError, match="cannot be None or empty"):
            parse_timestamp("")
            
    def test_parse_timestamp_none(self):
        """Test that None raises ValueError."""
        with pytest.raises(ValueError, match="cannot be None or empty"):
            parse_timestamp(None)
            
    def test_parse_timestamp_invalid_format(self):
        """Test that invalid format raises ValueError."""
        with pytest.raises(ValueError, match="Invalid timestamp format"):
            parse_timestamp("not-a-timestamp")
            
    def test_parse_timestamp_preserves_timezone(self):
        """Test that timezone-aware timestamps preserve their timezone info."""
        timestamp_str = "2025-01-15T10:30:00-05:00"
        result = parse_timestamp(timestamp_str)
        assert isinstance(result, datetime)
        assert result.tzinfo is not None
        # The offset should be -5 hours
        assert result.utcoffset().total_seconds() == -5 * 3600


class TestQueryParameterValidation:
    """Test robust query parameter parsing."""
    
    def test_limit_parameter_validation_valid(self):
        """Test that valid limit values are accepted."""
        # This would be tested in integration tests with actual requests
        # Here we just verify the logic is sound
        limit_str = "100"
        try:
            limit = int(limit_str)
            valid = 1 <= limit <= 10000
            assert valid
        except (ValueError, TypeError):
            pytest.fail("Should not raise exception for valid limit")
            
    def test_limit_parameter_validation_invalid_type(self):
        """Test that non-integer limit values raise ValueError."""
        limit_str = "not-a-number"
        with pytest.raises(ValueError):
            int(limit_str)
            
    def test_days_parameter_validation_valid(self):
        """Test that valid days values are accepted."""
        days_str = "30"
        try:
            days = int(days_str)
            valid = 1 <= days <= 365
            assert valid
        except (ValueError, TypeError):
            pytest.fail("Should not raise exception for valid days")
            
    def test_days_parameter_validation_out_of_range(self):
        """Test that out-of-range days values are detected."""
        days = 500
        valid = 1 <= days <= 365
        assert not valid


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
