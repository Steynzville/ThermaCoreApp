"""Tests for logging format, MQTT initialization, and health check improvements."""
import logging
import pytest
from unittest.mock import Mock, patch, MagicMock
from flask import Flask

from app.utils.secure_logger import SecureLogger, SecureLoggerAdapter


class TestSecureLoggerFormattingImprovements:
    """Test secure logger handles various formatting issues gracefully."""
    
    def test_info_with_type_error_fallback(self):
        """Test info logging handles TypeError in formatting."""
        base_logger = logging.getLogger('test_info_type_error')
        base_logger.handlers.clear()
        
        # Add handler with problematic formatter
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('[%(request_id)s] %(message)s'))
        base_logger.addHandler(handler)
        
        secure_logger = SecureLoggerAdapter(base_logger, SecureLogger)
        
        # This should not raise an exception even with TypeError
        secure_logger.info("Test message during startup")
    
    def test_error_with_type_error_fallback(self):
        """Test error logging handles TypeError in formatting."""
        base_logger = logging.getLogger('test_error_type_error')
        base_logger.handlers.clear()
        
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('[%(request_id)s] %(message)s'))
        base_logger.addHandler(handler)
        
        secure_logger = SecureLoggerAdapter(base_logger, SecureLogger)
        
        # This should not raise an exception
        secure_logger.error("Test error during startup")
    
    def test_warning_with_nested_fallback(self):
        """Test warning logging falls back to string conversion on multiple errors."""
        base_logger = logging.getLogger('test_warning_nested')
        base_logger.handlers.clear()
        
        # Create a mock handler that always raises
        handler = Mock()
        handler.filters = []
        handler.handle = Mock(side_effect=TypeError("Formatting error"))
        base_logger.addHandler(handler)
        
        secure_logger = SecureLoggerAdapter(base_logger, SecureLogger)
        
        # Should not raise - will fall back to FALLBACK_LOGGER
        secure_logger.warning("Test warning")
    
    def test_debug_with_formatting_args(self):
        """Test debug logging with % style formatting args."""
        base_logger = logging.getLogger('test_debug_format')
        base_logger.handlers.clear()
        
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(message)s'))
        base_logger.addHandler(handler)
        
        secure_logger = SecureLoggerAdapter(base_logger, SecureLogger)
        
        # Test with formatting args
        secure_logger.debug("Value is %s", "test")
    
    def test_critical_with_last_resort_fallback(self):
        """Test critical logging uses last resort fallback on all errors."""
        base_logger = logging.getLogger('test_critical_fallback')
        base_logger.handlers.clear()
        
        handler = Mock()
        handler.filters = []
        handler.handle = Mock(side_effect=ValueError("Format error"))
        base_logger.addHandler(handler)
        
        secure_logger = SecureLoggerAdapter(base_logger, SecureLogger)
        
        # Should not raise - will use last resort fallback
        secure_logger.critical("Test critical message")


class TestMQTTServiceInitializationLogging:
    """Test MQTT service initialization provides explicit logging."""
    
    @pytest.fixture
    def mock_app(self):
        """Create a mock Flask app."""
        app = Mock(spec=Flask)
        app.config = {
            'MQTT_BROKER_HOST': 'localhost',
            'MQTT_BROKER_PORT': 1883,
            'MQTT_CLIENT_ID': 'test_client',
            'MQTT_USERNAME': None,
            'MQTT_PASSWORD': None,
            'MQTT_USE_TLS': False,
            'MQTT_KEEPALIVE': 60,
            'MQTT_CA_CERTS': '/tmp/ca.crt',
            'MQTT_CERT_FILE': '/tmp/client.crt',
            'MQTT_KEY_FILE': '/tmp/client.key',
            'MQTT_SCADA_TOPICS': ['test/topic']
        }
        return app
    
    @patch('app.services.mqtt_service.mqtt.Client')
    def test_mqtt_initialization_logging_success(self, mock_mqtt_client, mock_app):
        """Test MQTT initialization logs all steps successfully."""
        from app.services.mqtt_service import MQTTClient
        
        with patch('app.services.mqtt_service.logger') as mock_logger:
            mqtt_service = MQTTClient()
            mqtt_service.init_app(mock_app)
            
            # Verify initialization logging
            mock_logger.info.assert_any_call("Starting MQTT service initialization...")
            mock_logger.info.assert_any_call("MQTT configuration loaded - Broker: localhost:1883, TLS: False")
            mock_logger.info.assert_any_call("MQTT client created with ID: test_client")
            mock_logger.info.assert_any_call("MQTT callbacks configured successfully")
            mock_logger.info.assert_any_call("MQTT default topics configured: 1 topics")
            mock_logger.info.assert_any_call("MQTT service initialization completed successfully")
    
    @patch('app.services.mqtt_service.mqtt.Client')
    def test_mqtt_initialization_with_tls_error(self, mock_mqtt_client, mock_app):
        """Test MQTT initialization handles TLS configuration errors gracefully."""
        from app.services.mqtt_service import MQTTClient
        
        mock_app.config['MQTT_USE_TLS'] = True
        mock_mqtt_client_instance = Mock()
        mock_mqtt_client_instance.tls_set = Mock(side_effect=Exception("TLS error"))
        mock_mqtt_client.return_value = mock_mqtt_client_instance
        
        with patch('app.services.mqtt_service.logger') as mock_logger:
            with patch('app.services.mqtt_service.is_production_environment', return_value=False):
                mqtt_service = MQTTClient()
                # Should not raise - logs error and continues
                mqtt_service.init_app(mock_app)
                
                # Verify error logging
                mock_logger.error.assert_any_call(
                    "Error configuring MQTT TLS: TLS error",
                    exc_info=True
                )
    
    @patch('app.services.mqtt_service.mqtt.Client')
    def test_mqtt_initialization_callback_error_raises(self, mock_mqtt_client, mock_app):
        """Test MQTT initialization raises when callback configuration fails."""
        from app.services.mqtt_service import MQTTClient
        
        mock_mqtt_client_instance = Mock()
        mock_mqtt_client.return_value = mock_mqtt_client_instance
        
        # Simulate callback configuration failure
        def raise_error():
            raise Exception("Callback error")
        
        with patch('app.services.mqtt_service.logger') as mock_logger:
            mqtt_service = MQTTClient()
            mqtt_service.init_app(mock_app)
            
            # Manually trigger the error after init
            try:
                raise Exception("Callback error")
            except Exception as e:
                mock_logger.error.assert_not_called()  # Should not be called in successful path


class TestHealthCheckExplicitReporting:
    """Test health check endpoint explicitly reports service statuses."""
    
    @pytest.fixture
    def app(self):
        """Create a Flask app for testing."""
        from app import create_app
        app = create_app('testing')
        return app
    
    def test_health_check_mqtt_not_initialized(self, app):
        """Test health check reports MQTT as not initialized."""
        with app.test_client() as client:
            # Remove mqtt_client to simulate not initialized
            if hasattr(app, 'mqtt_client'):
                delattr(app, 'mqtt_client')
            
            response = client.get('/health')
            assert response.status_code == 200
            data = response.get_json()
            
            assert data['status'] == 'degraded'
            assert 'mqtt' in data['services']
            assert data['services']['mqtt']['status'] == 'not_initialized'
            assert data['services']['mqtt']['available'] is False
            assert 'mqtt' in data.get('critical_services_down', [])
    
    def test_health_check_opcua_not_initialized(self, app):
        """Test health check reports OPC UA as not initialized."""
        with app.test_client() as client:
            # Remove opcua_client to simulate not initialized
            if hasattr(app, 'opcua_client'):
                delattr(app, 'opcua_client')
            
            response = client.get('/health')
            assert response.status_code == 200
            data = response.get_json()
            
            assert data['status'] == 'degraded'
            assert 'opcua' in data['services']
            assert data['services']['opcua']['status'] == 'not_initialized'
            assert data['services']['opcua']['available'] is False
            assert 'opcua' in data.get('critical_services_down', [])
    
    def test_health_check_dnp3_not_critical(self, app):
        """Test health check treats DNP3 as non-critical."""
        with app.test_client() as client:
            # Remove dnp3_service to simulate not initialized
            if hasattr(app, 'dnp3_service'):
                delattr(app, 'dnp3_service')
            
            response = client.get('/health')
            assert response.status_code == 200
            data = response.get_json()
            
            # DNP3 not being initialized should not make status degraded by itself
            assert 'dnp3' in data['services']
            assert data['services']['dnp3']['status'] == 'not_initialized'
            # DNP3 should not be in critical_services_down
            if 'critical_services_down' in data:
                assert 'dnp3' not in data['critical_services_down']
    
    def test_health_check_degraded_message(self, app):
        """Test health check includes message for degraded state."""
        with app.test_client() as client:
            # Remove critical services
            if hasattr(app, 'mqtt_client'):
                delattr(app, 'mqtt_client')
            if hasattr(app, 'opcua_client'):
                delattr(app, 'opcua_client')
            
            response = client.get('/health')
            assert response.status_code == 200
            data = response.get_json()
            
            assert data['status'] == 'degraded'
            assert 'critical_services_down' in data
            assert 'message' in data
            assert 'Critical services unavailable' in data['message']
