"""Tests for run.py debug mode configuration."""
import os
from unittest.mock import patch

from app import create_app


class TestDebugModeConfiguration:
    """Test that app.debug is correctly set based on FLASK_ENV."""
    
    def test_debug_enabled_with_testing_config(self):
        """Test that app.debug is True when using TestingConfig for better debugging."""
        with patch.dict(os.environ, {'FLASK_ENV': 'testing'}, clear=True):
            app = create_app()
            assert app.debug is True, "TestingConfig should set app.debug=True for test debugging"
            assert app.config['DEBUG'] is True, "TestingConfig should set DEBUG=True for test debugging"
            assert app.config['TESTING'] is True, "TestingConfig should set TESTING=True"
    
    def test_debug_disabled_with_production_config(self):
        """Test that app.debug is False when using ProductionConfig."""
        # FLASK_ENV=production should always disable debug mode, even if FLASK_DEBUG=1
        with patch.dict(os.environ, {
            'FLASK_ENV': 'production',
            'FLASK_DEBUG': '1',
            'SECRET_KEY': 'test-secret-key',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'DATABASE_URL': 'postgresql://test:test@localhost/test',
            'MQTT_CA_CERTS': '/path/to/ca',
            'MQTT_CERT_FILE': '/path/to/cert',
            'MQTT_KEY_FILE': '/path/to/key',
            'MQTT_USERNAME': 'test',
            'MQTT_PASSWORD': 'test',
            'OPCUA_CERT_FILE': '/path/to/opcua/cert',
            'OPCUA_PRIVATE_KEY_FILE': '/path/to/opcua/key',
            'OPCUA_TRUST_CERT_FILE': '/path/to/opcua/trust'
        }, clear=True):
            app = create_app()
            assert app.debug is False, "ProductionConfig should set app.debug=False"
            assert app.config['DEBUG'] is False, "ProductionConfig should set DEBUG=False"
    
    def test_flask_env_development_without_debug_flag(self):
        """Test that FLASK_ENV=development alone falls back to production config."""
        # Per line 120-122 of __init__.py, FLASK_ENV=development without FLASK_DEBUG
        # falls back to production config for security
        with patch.dict(os.environ, {
            'FLASK_ENV': 'development',
            'SECRET_KEY': 'test-secret-key',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'DATABASE_URL': 'postgresql://test:test@localhost/test',
            'MQTT_CA_CERTS': '/path/to/ca',
            'MQTT_CERT_FILE': '/path/to/cert',
            'MQTT_KEY_FILE': '/path/to/key',
            'MQTT_USERNAME': 'test',
            'MQTT_PASSWORD': 'test',
            'OPCUA_CERT_FILE': '/path/to/opcua/cert',
            'OPCUA_PRIVATE_KEY_FILE': '/path/to/opcua/key',
            'OPCUA_TRUST_CERT_FILE': '/path/to/opcua/trust'
        }, clear=True):
            app = create_app()  # Should fall back to production
            assert app.config['DEBUG'] is False, "Should use production config without FLASK_DEBUG"
    
    def test_flask_env_development_with_debug_flag(self):
        """Test that FLASK_ENV=development with FLASK_DEBUG=1 enables debug mode."""
        # Both FLASK_ENV=development and FLASK_DEBUG=1 are required for DevelopmentConfig
        with patch.dict(os.environ, {'FLASK_ENV': 'development', 'FLASK_DEBUG': '1'}, clear=True):
            app = create_app()  # Should use DevelopmentConfig
            assert app.config['DEBUG'] is True, "Should use DevelopmentConfig with both flags"
    
    def test_debug_flag_alone_is_not_enough(self):
        """Test that FLASK_DEBUG=1 alone is not enough to enable debug mode."""
        # For security, we require both FLASK_ENV=development and FLASK_DEBUG=1
        # to enter debug mode. FLASK_ENV defaults to 'production' if not set.
        with patch.dict(os.environ, {
            'FLASK_DEBUG': '1',
            # Add required production config env vars
            'SECRET_KEY': 'test-secret-key',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'DATABASE_URL': 'postgresql://test:test@localhost/test',
            'MQTT_CA_CERTS': '/path/to/ca',
            'MQTT_CERT_FILE': '/path/to/cert',
            'MQTT_KEY_FILE': '/path/to/key',
            'MQTT_USERNAME': 'test',
            'MQTT_PASSWORD': 'test',
            'OPCUA_CERT_FILE': '/path/to/opcua/cert',
            'OPCUA_PRIVATE_KEY_FILE': '/path/to/opcua/key',
            'OPCUA_TRUST_CERT_FILE': '/path/to/opcua/trust'
        }, clear=True):
            app = create_app()
            assert app.debug is False, "FLASK_DEBUG=1 alone should not enable debug mode"
            assert app.config['DEBUG'] is False, "FLASK_DEBUG=1 alone should not set DEBUG=True"

