"""Tests for secure error message handling in historical and analytics routes."""
import pytest
from unittest.mock import patch
from app import create_app


class TestErrorMessageSecurity:
    """Test that error responses don't expose sensitive exception details."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        return create_app('testing')
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def get_auth_token(self, client, username='admin', password='admin123'):
        """Helper method to get auth token."""
        response = client.post('/api/v1/auth/login',
            json={'username': username, 'password': password}
        )
        if response.status_code == 200:
            return response.json['access_token']
        return None

    def test_historical_data_valueerror_generic_message(self, client, app):
        """Test that ValueError in get_historical_data returns generic message."""
        token = self.get_auth_token(client)
        
        with app.app_context():
            # Mock parse_timestamp to raise ValueError
            with patch('app.routes.historical.parse_timestamp') as mock_parse:
                mock_parse.side_effect = ValueError("Sensitive internal error details")
                
                # Mock logger to verify it's called
                with patch('app.utils.error_handler.logger') as mock_logger:
                    response = client.get(
                        '/api/v1/historical/data/TEST001?start_date=invalid',
                        headers={'Authorization': f'Bearer {token}'}
                    )
                    
                    # Verify response
                    assert response.status_code == 400
                    data = response.json
                    
                    # Check new error envelope structure
                    assert 'success' in data
                    assert data['success'] is False
                    assert 'error' in data
                    assert 'code' in data['error']
                    assert 'message' in data['error']
                    
                    # Should NOT contain the sensitive error details
                    assert 'Sensitive internal error details' not in str(data)
                    
                    # Should contain generic message
                    assert data['error']['message'] == 'Invalid date format provided. Please use ISO 8601 format.'
                    assert data['error']['code'] == 'VALIDATION_ERROR'
                    
                    # Verify logger was called
                    assert mock_logger.error.called

    def test_compare_units_valueerror_generic_message(self, client, app):
        """Test that ValueError in compare_units_historical returns generic message."""
        token = self.get_auth_token(client)
        
        with app.app_context():
            # Mock parse_timestamp to raise ValueError
            with patch('app.routes.historical.parse_timestamp') as mock_parse:
                mock_parse.side_effect = ValueError("Sensitive date parsing error")
                
                with patch('app.utils.error_handler.logger') as mock_logger:
                    response = client.post(
                        '/api/v1/historical/compare/units',
                        headers={'Authorization': f'Bearer {token}'},
                        json={
                            'unit_ids': ['TEST001'],
                            'sensor_type': 'temperature',
                            'start_date': 'invalid'
                        }
                    )
                    
                    # Verify response
                    assert response.status_code == 400
                    data = response.json
                    
                    # Check new error envelope structure
                    assert 'success' in data
                    assert data['success'] is False
                    assert 'error' in data
                    
                    # Should NOT contain the sensitive error details
                    assert 'Sensitive date parsing error' not in str(data)
                    
                    # Should contain generic message
                    assert data['error']['message'] == 'Invalid date format provided. Please use ISO 8601 format.'
                    assert data['error']['code'] == 'VALIDATION_ERROR'
                    
                    # Verify logger was called
                    assert mock_logger.error.called

    def test_analytics_unit_trends_valueerror_logged(self, client, app):
        """Test that ValueError in get_unit_trends returns validation error for invalid parameter."""
        token = self.get_auth_token(client)
        
        # Send invalid days parameter - now handled by schema validation
        response = client.get(
            '/api/v1/analytics/trends/TEST001?days=invalid',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        # Verify response
        assert response.status_code == 400
        data = response.json
        
        # Check new error envelope structure
        assert 'success' in data
        assert data['success'] is False
        assert 'error' in data
        assert data['error']['code'] == 'VALIDATION_ERROR'
        assert 'field_errors' in data['error']['details']
        
        # The error should mention the 'days' field
        assert 'days' in data['error']['details']['field_errors']

    def test_analytics_units_performance_valueerror_logged(self, client, app):
        """Test that ValueError in get_units_performance returns validation error for invalid parameter."""
        token = self.get_auth_token(client)
        
        # Send invalid hours parameter - now handled by schema validation
        response = client.get(
            '/api/v1/analytics/performance/units?hours=invalid',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        # Verify response
        assert response.status_code == 400
        data = response.json
        
        # Check new error envelope structure
        assert 'success' in data
        assert data['success'] is False
        assert 'error' in data
        assert data['error']['code'] == 'VALIDATION_ERROR'
        assert 'field_errors' in data['error']['details']
        
        # The error should mention the 'hours' field
        assert 'hours' in data['error']['details']['field_errors']

    def test_analytics_alert_patterns_valueerror_logged(self, client, app):
        """Test that ValueError in get_alert_patterns returns validation error for invalid parameter."""
        token = self.get_auth_token(client)
        
        # Send invalid days parameter - now handled by schema validation
        response = client.get(
            '/api/v1/analytics/alerts/patterns?days=invalid',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        # Verify response
        assert response.status_code == 400
        data = response.json
        
        # Check new error envelope structure
        assert 'success' in data
        assert data['success'] is False
        assert 'error' in data
        assert data['error']['code'] == 'VALIDATION_ERROR'
        assert 'field_errors' in data['error']['details']
        
        # The error should mention the 'days' field
        assert 'days' in data['error']['details']['field_errors']
