"""Integration tests for centralized validation and error handling."""
import pytest
from marshmallow import ValidationError


class TestCentralizedValidation:
    """Test centralized validation schemas and error handling."""
    
    def test_historical_data_query_schema_validation(self):
        """Test HistoricalDataQuerySchema validates correctly."""
        from app.utils.schemas import HistoricalDataQuerySchema
        
        schema = HistoricalDataQuerySchema()
        
        # Valid data
        valid_data = {
            'limit': '100',
            'aggregation': 'hourly'
        }
        result = schema.load(valid_data)
        assert result['limit'] == 100
        assert result['aggregation'] == 'hourly'
        
        # Invalid limit - too high
        with pytest.raises(ValidationError) as exc_info:
            schema.load({'limit': '20000'})
        assert 'limit' in exc_info.value.messages
        
        # Invalid aggregation
        with pytest.raises(ValidationError) as exc_info:
            schema.load({'aggregation': 'invalid'})
        assert 'aggregation' in exc_info.value.messages
    
    def test_statistics_query_schema_validation(self):
        """Test StatisticsQuerySchema validates correctly."""
        from app.utils.schemas import StatisticsQuerySchema
        
        schema = StatisticsQuerySchema()
        
        # Valid data with defaults
        result = schema.load({})
        assert result['days'] == 30  # Default value
        
        # Valid data with custom value
        result = schema.load({'days': '7'})
        assert result['days'] == 7
        
        # Invalid days - out of range
        with pytest.raises(ValidationError) as exc_info:
            schema.load({'days': '500'})
        assert 'days' in exc_info.value.messages
    
    def test_trends_query_schema_validation(self):
        """Test TrendsQuerySchema validates correctly."""
        from app.utils.schemas import TrendsQuerySchema
        
        schema = TrendsQuerySchema()
        
        # Valid data
        result = schema.load({'days': '14', 'sensor_type': 'temperature'})
        assert result['days'] == 14
        assert result['sensor_type'] == 'temperature'
        
        # Invalid days - not an integer
        with pytest.raises(ValidationError) as exc_info:
            schema.load({'days': 'invalid'})
        assert 'days' in exc_info.value.messages
    
    def test_performance_query_schema_validation(self):
        """Test PerformanceQuerySchema validates correctly."""
        from app.utils.schemas import PerformanceQuerySchema
        
        schema = PerformanceQuerySchema()
        
        # Valid data
        result = schema.load({'hours': '48'})
        assert result['hours'] == 48
        
        # Default value
        result = schema.load({})
        assert result['hours'] == 24
        
        # Invalid hours - out of range
        with pytest.raises(ValidationError) as exc_info:
            schema.load({'hours': '10000'})
        assert 'hours' in exc_info.value.messages
    
    def test_alert_patterns_query_schema_validation(self):
        """Test AlertPatternsQuerySchema validates correctly."""
        from app.utils.schemas import AlertPatternsQuerySchema
        
        schema = AlertPatternsQuerySchema()
        
        # Valid data
        result = schema.load({'days': '60'})
        assert result['days'] == 60
        
        # Invalid days - negative
        with pytest.raises(ValidationError) as exc_info:
            schema.load({'days': '-5'})
        assert 'days' in exc_info.value.messages
    
    def test_compare_units_schema_validation(self):
        """Test CompareUnitsSchema validates correctly."""
        from app.utils.schemas import CompareUnitsSchema
        
        schema = CompareUnitsSchema()
        
        # Valid data
        valid_data = {
            'unit_ids': ['UNIT001', 'UNIT002'],
            'sensor_type': 'temperature',
            'aggregation': 'daily'
        }
        result = schema.load(valid_data)
        assert len(result['unit_ids']) == 2
        assert result['sensor_type'] == 'temperature'
        assert result['aggregation'] == 'daily'
        
        # Missing required field
        with pytest.raises(ValidationError) as exc_info:
            schema.load({'unit_ids': ['UNIT001']})
        assert 'sensor_type' in exc_info.value.messages
        
        # Empty unit_ids list
        with pytest.raises(ValidationError) as exc_info:
            schema.load({'unit_ids': [], 'sensor_type': 'temperature'})
        assert 'unit_ids' in exc_info.value.messages
    
    def test_export_data_query_schema_validation(self):
        """Test ExportDataQuerySchema validates correctly."""
        from app.utils.schemas import ExportDataQuerySchema
        
        schema = ExportDataQuerySchema()
        
        # Valid data
        result = schema.load({'format': 'csv', 'sensor_types': 'temperature,pressure'})
        assert result['format'] == 'csv'
        assert result['sensor_types'] == 'temperature,pressure'
        
        # Default format
        result = schema.load({})
        assert result['format'] == 'json'
        
        # Invalid format
        with pytest.raises(ValidationError) as exc_info:
            schema.load({'format': 'xml'})
        assert 'format' in exc_info.value.messages


class TestSecurityAwareErrorHandler:
    """Test SecurityAwareErrorHandler methods."""
    
    def test_handle_value_error(self):
        """Test handle_value_error returns proper response."""
        from app.utils.error_handler import SecurityAwareErrorHandler
        from flask import Flask, g
        
        app = Flask(__name__)
        
        with app.app_context():
            # Set a request ID
            g.request_id = 'test-123'
            
            error = ValueError("Sensitive internal details")
            response, status_code = SecurityAwareErrorHandler.handle_value_error(
                error, 'test_endpoint', 'Invalid parameter provided.'
            )
            
            # Check status code
            assert status_code == 400
            
            # Check response structure
            response_data = response.get_json()
            assert response_data['success'] is False
            assert response_data['error']['code'] == 'VALIDATION_ERROR'
            assert response_data['error']['message'] == 'Invalid parameter provided.'
            assert 'Sensitive internal details' not in str(response_data)
            assert 'correlation_id' in response_data['error']['details']
            assert response_data['request_id'] == 'test-123'
