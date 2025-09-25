"""Tests for the datetime and environment handling improvements."""
import pytest
import os
from datetime import datetime, timezone
from unittest.mock import patch, Mock

from app.utils.helpers import parse_timestamp, generate_health_score


class TestParseTimestampImprovements:
    """Test improvements to parse_timestamp function."""
    
    def test_parse_timestamp_rejects_none_input(self):
        """Test that parse_timestamp raises ValueError for None input."""
        with pytest.raises(ValueError, match="cannot be None or empty"):
            parse_timestamp(None)
    
    def test_parse_timestamp_rejects_empty_string(self):
        """Test that parse_timestamp raises ValueError for empty string."""
        with pytest.raises(ValueError, match="cannot be None or empty"):
            parse_timestamp("")
    
    def test_parse_timestamp_valid_input_still_works(self):
        """Test that valid input still works after null validation."""
        result = parse_timestamp("2024-01-01T10:00:00Z")
        assert result.tzinfo is not None
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 1
    
    def test_parse_timestamp_naive_input_gets_utc_timezone(self):
        """Test that naive datetime strings get UTC timezone."""
        result = parse_timestamp("2024-01-01T10:00:00")
        assert result.tzinfo == timezone.utc


class TestEnvironmentLogicImprovements:
    """Test improvements to environment configuration logic."""
    
    def test_testing_env_true_overrides_explicit_config(self, monkeypatch):
        """Test that TESTING=true overrides explicit config_name."""
        monkeypatch.setenv('TESTING', 'true')
        # Need to reload the module to pick up env changes
        import importlib
        import app
        importlib.reload(app)
        
        test_app = app.create_app('development')  # Explicit development
        assert test_app.config['TESTING'] == True
    
    def test_testing_env_1_overrides_explicit_config(self, monkeypatch):
        """Test that TESTING=1 overrides explicit config_name."""
        monkeypatch.setenv('TESTING', '1')
        # Need to reload the module to pick up env changes
        import importlib
        import app
        importlib.reload(app)
        
        test_app = app.create_app('production')  # Explicit production
        assert test_app.config['TESTING'] == True


class TestTimezoneAwareMaintenance:
    """Test timezone-aware maintenance calculations."""
    
    def test_naive_last_maintenance_handled_correctly(self, app):
        """Test that naive last_maintenance datetime is handled without error."""
        with app.app_context():
            # Create mock unit with naive datetime
            mock_unit = Mock()
            mock_unit.status = 'online'
            mock_unit.health_status = 'optimal'
            mock_unit.has_alarm = False
            mock_unit.has_alert = False
            mock_unit.battery_level = 80
            # Naive datetime from 100 days ago
            mock_unit.last_maintenance = datetime(2024, 1, 1, 10, 0, 0)  # No tzinfo
            
            with patch('app.models.Unit.query') as mock_query:
                mock_query.get.return_value = mock_unit
                
                # This should not raise an exception
                result = generate_health_score('test-unit')
                
                assert 'score' in result
                assert 'factors' in result
                assert isinstance(result['score'], int)
    
    def test_timezone_aware_last_maintenance_handled_correctly(self, app):
        """Test that timezone-aware last_maintenance datetime works correctly."""
        with app.app_context():
            # Create mock unit with timezone-aware datetime
            mock_unit = Mock()
            mock_unit.status = 'online'
            mock_unit.health_status = 'optimal'
            mock_unit.has_alarm = False
            mock_unit.has_alert = False
            mock_unit.battery_level = 80
            # Timezone-aware datetime from 100 days ago
            mock_unit.last_maintenance = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
            
            with patch('app.models.Unit.query') as mock_query:
                mock_query.get.return_value = mock_unit
                
                result = generate_health_score('test-unit')
                
                assert 'score' in result
                assert 'factors' in result
                assert isinstance(result['score'], int)
    
    def test_overdue_maintenance_detection_with_naive_datetime(self, app):
        """Test that overdue maintenance is detected with naive datetime."""
        with app.app_context():
            mock_unit = Mock()
            mock_unit.status = 'online'
            mock_unit.health_status = 'optimal'
            mock_unit.has_alarm = False
            mock_unit.has_alert = False
            mock_unit.battery_level = 80
            # Naive datetime from 100 days ago (should trigger overdue)
            mock_unit.last_maintenance = datetime(2024, 1, 1, 10, 0, 0)
            
            with patch('app.models.Unit.query') as mock_query:
                mock_query.get.return_value = mock_unit
                
                result = generate_health_score('test-unit')
                
                factors = result['factors']
                overdue_found = any('Overdue maintenance' in factor for factor in factors)
                assert overdue_found, f"Expected 'Overdue maintenance' factor, got: {factors}"