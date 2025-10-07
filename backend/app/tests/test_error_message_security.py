"""Tests for secure error message handling in historical and analytics routes."""
import pytest
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
            # Response is wrapped in success envelope: {'success': True, 'data': {...}}
            return response.json['data']['access_token']
        return None

    def test_historical_data_valueerror_generic_message(self, client, app):
        """Test that ValueError in get_historical_data returns generic message."""
        token = self.get_auth_token(client)
        
        with app.app_context():
            # Test with invalid date format - webargs schema validation handles this
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
            
            # Should NOT contain sensitive error details
            assert 'invalid' not in data['error']['message'].lower() or \
                   data['error']['message'] == 'Request data validation failed'
            
            # Should contain generic validation error message
            assert data['error']['message'] == 'Request data validation failed'
            assert data['error']['code'] == 'VALIDATION_ERROR'
            
            # Validation errors are handled by webargs before reaching route logic
            # so logger.error is called by the webargs error handler, not the route

    def test_compare_units_valueerror_generic_message(self, client, app):
        """Test that ValueError in compare_units_historical returns generic message."""
        token = self.get_auth_token(client)
        
        with app.app_context():
            # Test with invalid date format - webargs schema validation handles this
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
            
            # Should NOT contain sensitive error details
            assert 'Sensitive' not in str(data)
            assert 'invalid' not in data['error']['message'].lower() or \
                   data['error']['message'] == 'Request data validation failed'
            
            # Should contain generic validation error message
            assert data['error']['message'] == 'Request data validation failed'
            assert data['error']['code'] == 'VALIDATION_ERROR'
            
            # Validation errors are handled by webargs before reaching route logic
            # so logger is called by the webargs error handler, not the route

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
