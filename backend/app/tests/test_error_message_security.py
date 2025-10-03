"""Tests for secure error message handling in historical and analytics routes."""
import pytest
from unittest.mock import patch, MagicMock
from app import create_app
from flask import current_app


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
                
                # Also mock current_app.logger.error to verify it's called
                with patch.object(current_app.logger, 'error') as mock_logger:
                    response = client.get(
                        '/api/v1/historical/data/TEST001?start_date=invalid',
                        headers={'Authorization': f'Bearer {token}'}
                    )
                    
                    # Verify response
                    assert response.status_code == 400
                    data = response.json
                    assert 'error' in data
                    # Should NOT contain the sensitive error details
                    assert 'Sensitive internal error details' not in str(data)
                    # Should contain generic message
                    assert data['error'] == 'Invalid request parameter.'
                    
                    # Verify logger was called with the correct message
                    mock_logger.assert_called_once()
                    logged_message = mock_logger.call_args[0][0]
                    assert 'ValueError in get_historical_data' in logged_message

    def test_compare_units_valueerror_generic_message(self, client, app):
        """Test that ValueError in compare_units_historical returns generic message."""
        token = self.get_auth_token(client)
        
        with app.app_context():
            # Mock parse_timestamp to raise ValueError
            with patch('app.routes.historical.parse_timestamp') as mock_parse:
                mock_parse.side_effect = ValueError("Sensitive date parsing error")
                
                with patch.object(current_app.logger, 'error') as mock_logger:
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
                    assert 'error' in data
                    # Should NOT contain the sensitive error details
                    assert 'Sensitive date parsing error' not in str(data)
                    # Should contain generic message
                    assert data['error'] == 'Invalid request parameter.'
                    
                    # Verify logger was called with the correct message
                    mock_logger.assert_called_once()
                    logged_message = mock_logger.call_args[0][0]
                    assert 'ValueError in compare_units_historical' in logged_message

    def test_analytics_unit_trends_valueerror_logged(self, client, app):
        """Test that ValueError in get_unit_trends is logged server-side."""
        token = self.get_auth_token(client)
        
        with app.app_context():
            with patch.object(current_app.logger, 'error') as mock_logger:
                # Send invalid days parameter
                response = client.get(
                    '/api/v1/analytics/trends/TEST001?days=invalid',
                    headers={'Authorization': f'Bearer {token}'}
                )
                
                # Verify response
                assert response.status_code == 400
                data = response.json
                assert 'error' in data
                assert data['error'] == 'Invalid days parameter'
                
                # Verify logger was called with the correct message
                mock_logger.assert_called_once()
                logged_message = mock_logger.call_args[0][0]
                assert 'ValueError in get_unit_trends' in logged_message

    def test_analytics_units_performance_valueerror_logged(self, client, app):
        """Test that ValueError in get_units_performance is logged server-side."""
        token = self.get_auth_token(client)
        
        with app.app_context():
            with patch.object(current_app.logger, 'error') as mock_logger:
                # Send invalid hours parameter
                response = client.get(
                    '/api/v1/analytics/performance/units?hours=invalid',
                    headers={'Authorization': f'Bearer {token}'}
                )
                
                # Verify response
                assert response.status_code == 400
                data = response.json
                assert 'error' in data
                assert data['error'] == 'Invalid hours parameter'
                
                # Verify logger was called with the correct message
                mock_logger.assert_called_once()
                logged_message = mock_logger.call_args[0][0]
                assert 'ValueError in get_units_performance' in logged_message

    def test_analytics_alert_patterns_valueerror_logged(self, client, app):
        """Test that ValueError in get_alert_patterns is logged server-side."""
        token = self.get_auth_token(client)
        
        with app.app_context():
            with patch.object(current_app.logger, 'error') as mock_logger:
                # Send invalid days parameter
                response = client.get(
                    '/api/v1/analytics/alerts/patterns?days=invalid',
                    headers={'Authorization': f'Bearer {token}'}
                )
                
                # Verify response
                assert response.status_code == 400
                data = response.json
                assert 'error' in data
                assert data['error'] == 'Invalid days parameter'
                
                # Verify logger was called with the correct message
                mock_logger.assert_called_once()
                logged_message = mock_logger.call_args[0][0]
                assert 'ValueError in get_alert_patterns' in logged_message
