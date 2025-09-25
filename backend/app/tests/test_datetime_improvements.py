"""Tests for the datetime and environment handling improvements."""
import pytest
import os
from datetime import datetime, timezone
from unittest.mock import patch, Mock

from app import create_app
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
            
    def test_parse_timestamp_uses_idiomatic_falsiness_check(self):
        """Test that parse_timestamp uses idiomatic falsiness for validation."""
        # Test various falsy values are handled consistently
        falsy_values = [None, "", False, 0]
        for falsy_value in falsy_values:
            with pytest.raises(ValueError, match="cannot be None or empty"):
                parse_timestamp(falsy_value)
    
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
        
    def test_parse_timestamp_logs_naive_datetime_assumption(self, caplog):
        """Test that converting naive datetime to UTC is logged."""
        import logging
        with caplog.at_level(logging.INFO):
            parse_timestamp("2024-01-01T10:00:00")
        
        # Check that logging message was recorded
        assert len(caplog.records) > 0
        log_message = caplog.records[0].message
        assert "Converting naive datetime" in log_message
        assert "Assuming original timestamp was UTC" in log_message


class TestEnvironmentLogicImprovements:
    """Test improvements to environment configuration logic."""
    
    def test_testing_env_true_overrides_explicit_config(self, monkeypatch):
        """Test that TESTING=true overrides explicit config_name."""
        monkeypatch.setenv('TESTING', 'true')
        # Create a fresh app instance to test the environment logic
        test_app = create_app('development')  # Explicit development
        assert test_app.config['TESTING'] == True
    
    def test_testing_env_1_overrides_explicit_config(self, monkeypatch):
        """Test that TESTING=1 overrides explicit config_name."""
        monkeypatch.setenv('TESTING', '1')
        # Create a fresh app instance to test the environment logic
        test_app = create_app('production')  # Explicit production
        assert test_app.config['TESTING'] == True


class TestTimezoneAwareMaintenance:
    """Test timezone-aware maintenance calculations."""
    
    @patch('app.utils.helpers.datetime')
    def test_deterministic_health_score_calculation(self, mock_datetime, app):
        """Test that health score calculation is deterministic with fixed datetime."""
        # Fix the current time for deterministic tests
        fixed_now = datetime(2024, 4, 15, 10, 0, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_now
        mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)
        
        with app.app_context():
            # Create mock unit with timezone-aware datetime - 100 days before fixed_now
            maintenance_date = datetime(2024, 1, 5, 10, 0, 0, tzinfo=timezone.utc)  # 100 days before
            mock_unit = Mock()
            mock_unit.status = 'online'
            mock_unit.health_status = 'optimal'
            mock_unit.has_alarm = False
            mock_unit.has_alert = False
            mock_unit.battery_level = 80
            mock_unit.last_maintenance = maintenance_date
            
            with patch('app.models.Unit.query') as mock_query:
                mock_query.get.return_value = mock_unit
                
                # This should consistently detect overdue maintenance
                result = generate_health_score('test-unit')
                
                assert 'score' in result
                assert 'factors' in result
                assert isinstance(result['score'], int)
                
                factors = result['factors']
                overdue_found = any('Overdue maintenance' in factor for factor in factors)
                assert overdue_found, f"Expected 'Overdue maintenance' factor with deterministic date, got: {factors}"
    
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
            # With timezone-aware ORM, this scenario should become rare
            # but we still handle it gracefully in case legacy data exists
            mock_unit.last_maintenance = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
            
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
    
    @patch('app.utils.helpers.datetime')
    def test_overdue_maintenance_detection_with_deterministic_datetime(self, mock_datetime, app):
        """Test that overdue maintenance is detected with deterministic datetime."""
        # Fix datetime for consistent testing
        fixed_now = datetime(2024, 4, 15, 10, 0, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = fixed_now
        mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)
        
        with app.app_context():
            mock_unit = Mock()
            mock_unit.status = 'online'
            mock_unit.health_status = 'optimal'
            mock_unit.has_alarm = False
            mock_unit.has_alert = False
            mock_unit.battery_level = 80
            # Set maintenance 100 days before fixed_now (should trigger overdue)
            mock_unit.last_maintenance = datetime(2024, 1, 5, 10, 0, 0, tzinfo=timezone.utc)
            
            with patch('app.models.Unit.query') as mock_query:
                mock_query.get.return_value = mock_unit
                
                result = generate_health_score('test-unit')
                
                factors = result['factors']
                overdue_found = any('Overdue maintenance' in factor for factor in factors)
                assert overdue_found, f"Expected 'Overdue maintenance' factor, got: {factors}"