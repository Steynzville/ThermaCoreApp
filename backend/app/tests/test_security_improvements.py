"""Test security improvements for error handling and data storage."""
import pytest
from unittest.mock import Mock, patch
from app import create_app
from app.utils.error_handler import SecurityAwareErrorHandler
from app.services.data_storage_service import data_storage_service
from sqlalchemy.exc import IntegrityError


class TestSecurityImprovements:
    """Test security improvements implemented."""

    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        return create_app('testing')

    def test_error_handler_generic_messages(self, app):
        """Test that error handler provides generic user-facing messages."""
        with app.app_context():
            # Test different error types
            test_error = Exception("Sensitive database connection details")

            response, status_code = SecurityAwareErrorHandler.handle_service_error(
                test_error, 'database_error', 'Test operation', 500
            )

            # Should not expose the raw error message
            response_data = response.get_json()
            assert 'Sensitive database connection details' not in str(response_data)
            # Check structured error response
            assert 'error' in response_data
            if isinstance(response_data['error'], dict):
                assert response_data['error']['message'] == 'Database operation failed. Please try again later.'
            else:
                assert response_data['error'] == 'Database operation failed. Please try again later.'
            assert status_code == 500

    def test_mqtt_error_handling(self, app):
        """Test MQTT-specific error handling."""
        with app.app_context():
            sensitive_error = Exception("MQTT broker credentials: user=admin, pass=secret123")

            response, status_code = SecurityAwareErrorHandler.handle_mqtt_error(
                sensitive_error, 'connection'
            )

            response_data = response.get_json()
            assert 'secret123' not in str(response_data)
            # Check structured error response
            assert 'error' in response_data
            if isinstance(response_data['error'], dict):
                assert response_data['error']['message'] == 'Service is currently unavailable.'
            else:
                assert response_data['error'] == 'Service is currently unavailable.'

    def test_opcua_error_handling(self, app):
        """Test OPC UA-specific error handling."""
        with app.app_context():
            sensitive_error = Exception("OPC UA server internal path: /etc/opcua/private/keys")

            response, status_code = SecurityAwareErrorHandler.handle_opcua_error(
                sensitive_error, 'connection'
            )

            response_data = response.get_json()
            assert '/etc/opcua/private/keys' not in str(response_data)
            # Check structured error response
            assert 'error' in response_data
            if isinstance(response_data['error'], dict):
                assert response_data['error']['message'] == 'Service is currently unavailable.'
            else:
                assert response_data['error'] == 'Service is currently unavailable.'

    def test_validation_error_handling(self, app):
        """Test validation error handling."""
        with app.app_context():
            validation_error = ValueError("Field validation failed with details")

            response, status_code = SecurityAwareErrorHandler.handle_validation_error(
                validation_error, 'input validation'
            )

            response_data = response.get_json()
            # Check structured error response
            assert 'error' in response_data
            if isinstance(response_data['error'], dict):
                assert response_data['error']['message'] == 'Invalid request data provided.'
            else:
                assert response_data['error'] == 'Invalid request data provided.'
            assert status_code == 400

    def test_service_unavailable_handling(self, app):
        """Test service unavailable error handling."""
        with app.app_context():
            response, status_code = SecurityAwareErrorHandler.handle_service_unavailable('MQTT client')

            response_data = response.get_json()
            # Check for structured error response
            assert 'error' in response_data
            assert 'message' in response_data['error']
            assert response_data['error']['message'] == 'Service is currently unavailable.'
            assert status_code == 500

    def test_data_storage_race_condition_handling(self, app):
        """Test race condition handling in data storage service."""
        with app.app_context():
            with patch('app.services.data_storage_service.db') as mock_db, \
                 patch('app.services.data_storage_service.Unit') as mock_unit, \
                 patch('app.services.data_storage_service.Sensor') as mock_sensor:

                # Setup mocks
                mock_unit.query.filter_by.return_value.first.return_value = Mock(id='UNIT001')

                # First call returns None (sensor doesn't exist)
                # Second call after IntegrityError returns the sensor (created by another process)
                mock_existing_sensor = Mock(id='sensor123')
                mock_sensor.query.filter_by.return_value.first.side_effect = [
                    None,  # First check - no sensor exists
                    mock_existing_sensor  # After IntegrityError - sensor now exists
                ]

                # Mock session operations
                mock_session = Mock()
                mock_db.session = mock_session
                mock_session.commit.side_effect = IntegrityError("duplicate key", None, None)

                # Test race condition handling
                result = data_storage_service.find_or_create_sensor('UNIT001', 'temperature')

                # Should return the sensor found in fallback query
                assert result == mock_existing_sensor
                # Should have rolled back the session
                mock_session.rollback.assert_called_once()

    def test_data_storage_unit_not_found(self, app):
        """Test handling when unit is not found."""
        with app.app_context():
            with patch('app.services.data_storage_service.db'), \
                 patch('app.services.data_storage_service.Unit') as mock_unit:

                # Unit doesn't exist
                mock_unit.query.filter_by.return_value.first.return_value = None

                result = data_storage_service.find_or_create_sensor('NONEXISTENT', 'temperature')

                assert result is None

    def test_production_config_security_defaults(self):
        """Test that production config has secure defaults."""
        import os
        from unittest.mock import patch
        from config import ProductionConfig

        # Set required environment variables for ProductionConfig instantiation
        with patch.dict(os.environ, {
            'MQTT_CA_CERTS': '/path/to/ca',
            'MQTT_CERT_FILE': '/path/to/cert',
            'MQTT_KEY_FILE': '/path/to/key',
            'OPCUA_CERT_FILE': '/path/to/opcua/cert',
            'OPCUA_PRIVATE_KEY_FILE': '/path/to/opcua/key',
            'OPCUA_TRUST_CERT_FILE': '/path/to/opcua/trust'
        }):
            prod_config = ProductionConfig()

            # Should enforce MQTT TLS
            assert prod_config.MQTT_USE_TLS is True

            # Should have restricted WebSocket CORS (not wildcard)
            assert '*' not in prod_config.WEBSOCKET_CORS_ORIGINS

            # Should enforce OPC UA security
            assert prod_config.OPCUA_SECURITY_POLICY != 'None'
            assert prod_config.OPCUA_SECURITY_MODE != 'None'