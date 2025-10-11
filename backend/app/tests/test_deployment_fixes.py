"""Tests for deployment fixes - secure logger and MQTT service."""
import pytest
import logging
import tempfile
import os
from unittest.mock import Mock, patch, MagicMock
from app.utils.secure_logger import SecureLogger, SecureLoggerAdapter
from app.services.mqtt_service import MQTTClient


class TestSecureLoggerFallback:
    """Test secure logger fallback mechanism for missing request_id."""
    
    def test_info_with_missing_request_id(self):
        """Test info logging falls back gracefully when request_id is missing."""
        # Create a logger with a formatter that requires request_id
        base_logger = logging.getLogger('test_info')
        base_logger.handlers.clear()
        
        # Add handler with formatter requiring request_id
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('[%(request_id)s] %(message)s'))
        base_logger.addHandler(handler)
        
        # Create secure logger adapter
        secure_logger = SecureLoggerAdapter(base_logger, SecureLogger)
        
        # This should not raise an exception
        secure_logger.info("Test message during startup")
    
    def test_error_with_missing_request_id(self):
        """Test error logging falls back gracefully when request_id is missing."""
        base_logger = logging.getLogger('test_error')
        base_logger.handlers.clear()
        
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('[%(request_id)s] %(message)s'))
        base_logger.addHandler(handler)
        
        secure_logger = SecureLoggerAdapter(base_logger, SecureLogger)
        
        # This should not raise an exception
        secure_logger.error("Test error during startup")
    
    def test_warning_with_missing_request_id(self):
        """Test warning logging falls back gracefully when request_id is missing."""
        base_logger = logging.getLogger('test_warning')
        base_logger.handlers.clear()
        
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('[%(request_id)s] %(message)s'))
        base_logger.addHandler(handler)
        
        secure_logger = SecureLoggerAdapter(base_logger, SecureLogger)
        
        # This should not raise an exception
        secure_logger.warning("Test warning during startup")
    
    def test_debug_with_missing_request_id(self):
        """Test debug logging falls back gracefully when request_id is missing."""
        base_logger = logging.getLogger('test_debug')
        base_logger.handlers.clear()
        
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('[%(request_id)s] %(message)s'))
        base_logger.addHandler(handler)
        
        secure_logger = SecureLoggerAdapter(base_logger, SecureLogger)
        
        # This should not raise an exception
        secure_logger.debug("Test debug during startup")
    
    def test_critical_with_missing_request_id(self):
        """Test critical logging falls back gracefully when request_id is missing."""
        base_logger = logging.getLogger('test_critical')
        base_logger.handlers.clear()
        
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('[%(request_id)s] %(message)s'))
        base_logger.addHandler(handler)
        
        secure_logger = SecureLoggerAdapter(base_logger, SecureLogger)
        
        # This should not raise an exception
        secure_logger.critical("Test critical during startup")


class TestMQTTAuthenticationFallback:
    """Test MQTT service continues without authentication in production."""
    
    def test_mqtt_continues_without_authentication_in_production(self):
        """Test MQTT service continues without authentication in production."""
        mock_app = Mock()
        mock_app.config = {
            'MQTT_BROKER_HOST': 'test-broker',
            'MQTT_BROKER_PORT': 1883,
            'MQTT_CLIENT_ID': 'test-client',
            'MQTT_USE_TLS': False,
            'MQTT_USERNAME': None,
            'MQTT_PASSWORD': None,
            'TESTING': False
        }
        
        with patch('paho.mqtt.client.Client') as mock_mqtt_client:
            with patch('app.services.mqtt_service.is_production_environment', return_value=True):
                # This should NOT raise an exception
                client = MQTTClient()
                client.init_app(mock_app)
                
                # Verify client was created
                assert client.client is not None
                assert client.broker_host == 'test-broker'
    
    def test_mqtt_logs_warning_when_auth_missing_in_production(self):
        """Test MQTT service logs warning when authentication is missing in production."""
        mock_app = Mock()
        mock_app.config = {
            'MQTT_BROKER_HOST': 'test-broker',
            'MQTT_BROKER_PORT': 1883,
            'MQTT_CLIENT_ID': 'test-client',
            'MQTT_USE_TLS': False,
            'MQTT_USERNAME': None,
            'MQTT_PASSWORD': None,
            'TESTING': False
        }
        
        with patch('paho.mqtt.client.Client') as mock_mqtt_client:
            with patch('app.services.mqtt_service.is_production_environment', return_value=True):
                with patch('app.services.mqtt_service.logger') as mock_logger:
                    client = MQTTClient()
                    client.init_app(mock_app)
                    
                    # Verify warning was logged
                    mock_logger.warning.assert_called_with(
                        "MQTT running without authentication in production - security reduced"
                    )


class TestMQTTCertificateValidation:
    """Test MQTT certificate validation with detailed error messages."""
    
    def test_empty_certificate_files_are_detected(self):
        """Test that empty certificate files are detected and logged."""
        # Create temporary empty certificate files
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.crt') as ca_file:
            ca_path = ca_file.name
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.crt') as cert_file:
            cert_path = cert_file.name
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.key') as key_file:
            key_path = key_file.name
        
        try:
            mock_app = Mock()
            mock_app.config = {
                'MQTT_BROKER_HOST': 'test-broker',
                'MQTT_BROKER_PORT': 8883,
                'MQTT_CLIENT_ID': 'test-client',
                'MQTT_USE_TLS': True,
                'MQTT_CA_CERTS': ca_path,
                'MQTT_CERT_FILE': cert_path,
                'MQTT_KEY_FILE': key_path,
                'MQTT_USERNAME': 'test-user',
                'MQTT_PASSWORD': 'test-pass',
                'TESTING': False
            }
            
            with patch('paho.mqtt.client.Client') as mock_mqtt_client:
                with patch('app.services.mqtt_service.is_production_environment', return_value=False):
                    with patch('app.services.mqtt_service.logger') as mock_logger:
                        client = MQTTClient()
                        client.init_app(mock_app)
                        
                        # Verify error was logged for empty files
                        error_calls = [str(call) for call in mock_logger.error.call_args_list]
                        assert any('is empty' in str(call) for call in error_calls), \
                            f"Expected 'is empty' in error logs, got: {error_calls}"
        finally:
            # Clean up temporary files
            os.unlink(ca_path)
            os.unlink(cert_path)
            os.unlink(key_path)
    
    def test_missing_certificate_files_are_detected(self):
        """Test that missing certificate files are detected and logged."""
        mock_app = Mock()
        mock_app.config = {
            'MQTT_BROKER_HOST': 'test-broker',
            'MQTT_BROKER_PORT': 8883,
            'MQTT_CLIENT_ID': 'test-client',
            'MQTT_USE_TLS': True,
            'MQTT_CA_CERTS': '/nonexistent/ca.crt',
            'MQTT_CERT_FILE': '/nonexistent/cert.crt',
            'MQTT_KEY_FILE': '/nonexistent/key.key',
            'MQTT_USERNAME': 'test-user',
            'MQTT_PASSWORD': 'test-pass',
            'TESTING': False
        }
        
        with patch('paho.mqtt.client.Client') as mock_mqtt_client:
            with patch('app.services.mqtt_service.is_production_environment', return_value=False):
                with patch('app.services.mqtt_service.logger') as mock_logger:
                    client = MQTTClient()
                    client.init_app(mock_app)
                    
                    # Verify error was logged for missing files
                    error_calls = [str(call) for call in mock_logger.error.call_args_list]
                    assert any('does not exist' in str(call) for call in error_calls), \
                        f"Expected 'does not exist' in error logs, got: {error_calls}"
    
    def test_valid_certificate_files_pass_validation(self):
        """Test that valid certificate files with content pass validation."""
        # Create temporary certificate files with content
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.crt') as ca_file:
            ca_file.write("FAKE CA CERTIFICATE CONTENT")
            ca_path = ca_file.name
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.crt') as cert_file:
            cert_file.write("FAKE CERTIFICATE CONTENT")
            cert_path = cert_file.name
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.key') as key_file:
            key_file.write("FAKE KEY CONTENT")
            key_path = key_file.name
        
        try:
            mock_app = Mock()
            mock_app.config = {
                'MQTT_BROKER_HOST': 'test-broker',
                'MQTT_BROKER_PORT': 8883,
                'MQTT_CLIENT_ID': 'test-client',
                'MQTT_USE_TLS': True,
                'MQTT_CA_CERTS': ca_path,
                'MQTT_CERT_FILE': cert_path,
                'MQTT_KEY_FILE': key_path,
                'MQTT_USERNAME': 'test-user',
                'MQTT_PASSWORD': 'test-pass',
                'TESTING': False
            }
            
            with patch('paho.mqtt.client.Client') as mock_mqtt_client:
                with patch('app.services.mqtt_service.is_production_environment', return_value=False):
                    client = MQTTClient()
                    client.init_app(mock_app)
                    
                    # Verify TLS was configured (no errors about missing/empty files)
                    mock_mqtt_client.return_value.tls_set.assert_called_once()
        finally:
            # Clean up temporary files
            os.unlink(ca_path)
            os.unlink(cert_path)
            os.unlink(key_path)
