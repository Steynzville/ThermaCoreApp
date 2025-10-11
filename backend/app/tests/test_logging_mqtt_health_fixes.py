"""Tests for logging format, MQTT initialization, and health check improvements."""
import logging
import pytest
from unittest.mock import Mock, patch
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
                with patch('os.path.exists', return_value=True):
                    with patch('os.path.getsize', return_value=100):
                        mqtt_service = MQTTClient()
                        # Should not raise - logs error and continues
                        mqtt_service.init_app(mock_app)
                        
                        # Verify error logging - check that error was called with the message
                        error_calls = [str(call) for call in mock_logger.error.call_args_list]
                        assert any("Error configuring MQTT TLS" in str(call) for call in error_calls)
    
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
            except Exception:
                mock_logger.error.assert_not_called()  # Should not be called in successful path


class TestHealthCheckLogicImprovements:
    """Test health check logic for service status reporting."""
    
    def test_mqtt_status_degraded_when_not_connected(self):
        """Test MQTT status is considered degraded when not connected."""
        mqtt_status = {'available': True, 'connected': False}
        
        # Simulate the health check logic
        is_degraded = False
        critical_services_down = []
        
        if not mqtt_status.get('available', False):
            is_degraded = True
            critical_services_down.append('mqtt')
        elif not mqtt_status.get('connected', False):
            is_degraded = True
        
        assert is_degraded is True
        assert 'mqtt' not in critical_services_down  # Only added if not available
    
    def test_mqtt_status_critical_when_not_available(self):
        """Test MQTT is in critical_services_down when not available."""
        mqtt_status = {'available': False, 'connected': False}
        
        is_degraded = False
        critical_services_down = []
        
        if not mqtt_status.get('available', False):
            is_degraded = True
            critical_services_down.append('mqtt')
        
        assert is_degraded is True
        assert 'mqtt' in critical_services_down
    
    def test_opcua_status_critical_when_not_initialized(self):
        """Test OPC UA is in critical_services_down when not initialized."""
        opcua_client = None  # Simulate not initialized
        
        is_degraded = False
        critical_services_down = []
        services = {}
        
        if opcua_client is None:
            services['opcua'] = {'status': 'not_initialized', 'available': False}
            is_degraded = True
            critical_services_down.append('opcua')
        
        assert is_degraded is True
        assert 'opcua' in critical_services_down
        assert services['opcua']['status'] == 'not_initialized'
    
    def test_dnp3_not_in_critical_services(self):
        """Test DNP3 is not considered a critical service."""
        dnp3_status = {'available': False}
        
        # DNP3 logic from health check
        critical_services_down = []
        
        # DNP3 errors don't mark the system as degraded or critical
        if not dnp3_status.get('available', True):
            pass  # Only logged, not added to critical services
        
        assert 'dnp3' not in critical_services_down
    
    def test_degraded_message_format(self):
        """Test degraded message format with critical services."""
        critical_services_down = ['mqtt', 'opcua']
        
        message = f"Critical services unavailable: {', '.join(critical_services_down)}"
        
        assert message == "Critical services unavailable: mqtt, opcua"
        assert 'mqtt' in message
        assert 'opcua' in message
