"""Test DateTimeField robustness improvements."""
from datetime import datetime
from app.utils.schemas import DateTimeField


class TestDateTimeFieldRobustness:
    """Test the improved DateTimeField behavior."""
    
    def test_datetime_field_valid_string(self):
        """Test that valid datetime strings are properly parsed and serialized."""
        field = DateTimeField()
        
        # Test ISO format string
        iso_string = "2024-01-15T10:30:00"
        result = field._serialize(iso_string, 'test_field', None)
        assert result is not None
        assert isinstance(result, str)
    
    def test_datetime_field_valid_string_with_timezone(self):
        """Test that valid datetime strings with timezone are handled properly."""
        field = DateTimeField()
        
        # Test ISO format string with timezone
        iso_string_z = "2024-01-15T10:30:00Z"
        result = field._serialize(iso_string_z, 'test_field', None)
        assert result is not None
        assert isinstance(result, str)
    
    def test_datetime_field_invalid_string_returns_none(self):
        """Test that invalid datetime strings return None instead of malformed data."""
        field = DateTimeField()
        
        # Test completely invalid string
        invalid_string = "not-a-date"
        result = field._serialize(invalid_string, 'test_field', None)
        assert result is None
        
        # Test malformed ISO string
        malformed_string = "2024-13-45T25:70:99"
        result = field._serialize(malformed_string, 'test_field', None)
        assert result is None
    
    def test_datetime_field_none_value(self):
        """Test that None values are handled correctly."""
        field = DateTimeField()
        
        result = field._serialize(None, 'test_field', None)
        assert result is None
    
    def test_datetime_field_datetime_object(self):
        """Test that datetime objects are handled correctly."""
        field = DateTimeField()
        
        dt = datetime(2024, 1, 15, 10, 30, 0)
        result = field._serialize(dt, 'test_field', None)
        assert result is not None
        assert isinstance(result, str)