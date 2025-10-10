"""Test that ProductionConfig validation occurs at instantiation, not import time."""
import os
import pytest
from unittest.mock import patch


class TestProductionConfigValidation:
    """Test ProductionConfig validation timing."""
    
    def test_import_production_config_without_env_vars_succeeds(self):
        """Test that importing ProductionConfig module doesn't raise errors."""
        # This should not raise an error even without env vars set
        # because validation happens in __init__, not at import time
        from config import ProductionConfig
        assert ProductionConfig is not None
    
    def test_instantiate_production_config_without_mqtt_certs_fails(self):
        """Test that instantiating ProductionConfig without MQTT certs raises ValueError."""
        from config import ProductionConfig
        
        # Clear MQTT cert environment variables
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-secret-key',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'DATABASE_URL': 'postgresql://test:test@localhost/test',
            'CORS_ORIGINS': 'https://localhost:3000',  # Production requires HTTPS
            'MQTT_CA_CERTS': '',
            'MQTT_CERT_FILE': '',
            'MQTT_KEY_FILE': ''
        }, clear=False):
            with pytest.raises(ValueError, match="MQTT certificate paths must be set"):
                ProductionConfig()
    
    def test_instantiate_production_config_without_opcua_certs_fails(self):
        """Test that instantiating ProductionConfig without OPC UA certs raises ValueError."""
        from config import ProductionConfig
        
        # Set MQTT certs but not OPC UA certs
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-secret-key',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'DATABASE_URL': 'postgresql://test:test@localhost/test',
            'CORS_ORIGINS': 'https://localhost:3000',  # Production requires HTTPS
            'MQTT_CA_CERTS': '/path/to/ca',
            'MQTT_CERT_FILE': '/path/to/cert',
            'MQTT_KEY_FILE': '/path/to/key',
            'OPCUA_CERT_FILE': '',
            'OPCUA_PRIVATE_KEY_FILE': '',
            'OPCUA_TRUST_CERT_FILE': ''
        }, clear=False):
            with pytest.raises(ValueError, match="OPC UA certificate paths must be set"):
                ProductionConfig()
    
    def test_instantiate_production_config_with_all_certs_succeeds(self):
        """Test that instantiating ProductionConfig with all required certs succeeds."""
        from config import ProductionConfig
        
        # Set all required environment variables
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-secret-key',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'DATABASE_URL': 'postgresql://test:test@localhost/test',
            'CORS_ORIGINS': 'https://localhost:3000',  # Production requires HTTPS
            'MQTT_CA_CERTS': '/path/to/ca',
            'MQTT_CERT_FILE': '/path/to/cert',
            'MQTT_KEY_FILE': '/path/to/key',
            'OPCUA_CERT_FILE': '/path/to/opcua/cert',
            'OPCUA_PRIVATE_KEY_FILE': '/path/to/opcua/key',
            'OPCUA_TRUST_CERT_FILE': '/path/to/opcua/trust'
        }, clear=False):
            config = ProductionConfig()
            
            # Verify validation set the expected values
            assert config.MQTT_USE_TLS is True
            assert config.OPCUA_SECURITY_POLICY == 'Basic256Sha256'
            assert config.OPCUA_SECURITY_MODE == 'SignAndEncrypt'
    
    def test_production_config_respects_custom_opcua_security_settings(self):
        """Test that custom OPC UA security settings are preserved."""
        from config import ProductionConfig
        
        # Set custom OPC UA security settings
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-secret-key',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'DATABASE_URL': 'postgresql://test:test@localhost/test',
            'CORS_ORIGINS': 'https://localhost:3000',  # Production requires HTTPS
            'MQTT_CA_CERTS': '/path/to/ca',
            'MQTT_CERT_FILE': '/path/to/cert',
            'MQTT_KEY_FILE': '/path/to/key',
            'OPCUA_SECURITY_POLICY': 'Basic128Rsa15',
            'OPCUA_SECURITY_MODE': 'Sign',
            'OPCUA_CERT_FILE': '/path/to/opcua/cert',
            'OPCUA_PRIVATE_KEY_FILE': '/path/to/opcua/key',
            'OPCUA_TRUST_CERT_FILE': '/path/to/opcua/trust'
        }, clear=False):
            config = ProductionConfig()
            
            # Custom settings should be preserved
            assert config.OPCUA_SECURITY_POLICY == 'Basic128Rsa15'
            assert config.OPCUA_SECURITY_MODE == 'Sign'
    
    def test_production_config_websocket_cors_from_env(self):
        """Test that WebSocket CORS origins can be set via environment variable."""
        from config import ProductionConfig
        
        # Set custom WebSocket CORS origins
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-secret-key',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'DATABASE_URL': 'postgresql://test:test@localhost/test',
            'CORS_ORIGINS': 'https://localhost:3000',  # Production requires HTTPS
            'MQTT_CA_CERTS': '/path/to/ca',
            'MQTT_CERT_FILE': '/path/to/cert',
            'MQTT_KEY_FILE': '/path/to/key',
            'OPCUA_CERT_FILE': '/path/to/opcua/cert',
            'OPCUA_PRIVATE_KEY_FILE': '/path/to/opcua/key',
            'OPCUA_TRUST_CERT_FILE': '/path/to/opcua/trust',
            'WEBSOCKET_CORS_ORIGINS': 'https://app.example.com,https://admin.example.com'
        }, clear=False):
            config = ProductionConfig()
            
            # Custom CORS origins should be set
            assert config.WEBSOCKET_CORS_ORIGINS == ['https://app.example.com', 'https://admin.example.com']
            assert '*' not in config.WEBSOCKET_CORS_ORIGINS
    
    def test_production_config_websocket_cors_default(self):
        """Test that WebSocket CORS has secure default when not set."""
        from config import ProductionConfig
        
        # Don't set WEBSOCKET_CORS_ORIGINS
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-secret-key',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'DATABASE_URL': 'postgresql://test:test@localhost/test',
            'CORS_ORIGINS': 'https://localhost:3000',  # Production requires HTTPS
            'MQTT_CA_CERTS': '/path/to/ca',
            'MQTT_CERT_FILE': '/path/to/cert',
            'MQTT_KEY_FILE': '/path/to/key',
            'OPCUA_CERT_FILE': '/path/to/opcua/cert',
            'OPCUA_PRIVATE_KEY_FILE': '/path/to/opcua/key',
            'OPCUA_TRUST_CERT_FILE': '/path/to/opcua/trust',
            'WEBSOCKET_CORS_ORIGINS': ''
        }, clear=False):
            config = ProductionConfig()
            
            # Should have secure default (not wildcard)
            assert config.WEBSOCKET_CORS_ORIGINS == ['https://yourdomain.com']
            assert '*' not in config.WEBSOCKET_CORS_ORIGINS
    
    def test_production_config_rejects_wildcard_cors(self):
        """Test that ProductionConfig rejects wildcard CORS origins."""
        from config import ProductionConfig
        
        # Try to set wildcard CORS origins
        # Must set FLASK_ENV and APP_ENV to 'production' to trigger validation
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-secret-key',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'DATABASE_URL': 'postgresql://test:test@localhost/test',
            'MQTT_CA_CERTS': '/path/to/ca',
            'MQTT_CERT_FILE': '/path/to/cert',
            'MQTT_KEY_FILE': '/path/to/key',
            'OPCUA_CERT_FILE': '/path/to/opcua/cert',
            'OPCUA_PRIVATE_KEY_FILE': '/path/to/opcua/key',
            'OPCUA_TRUST_CERT_FILE': '/path/to/opcua/trust',
            'WEBSOCKET_CORS_ORIGINS': '*',
            'FLASK_ENV': 'production',
            'APP_ENV': 'production',
            'CI': '',  # Clear CI flag to simulate true production
            'PYTEST_CURRENT_TEST': ''  # Clear test flag
        }, clear=False):
            with pytest.raises(ValueError, match="Wildcard CORS origins"):
                ProductionConfig()
    
    def test_production_config_rejects_http_cors(self):
        """Test that ProductionConfig rejects HTTP (non-HTTPS) CORS origins."""
        from config import ProductionConfig
        
        # Try to set HTTP CORS origins
        # Must set FLASK_ENV and APP_ENV to 'production' to trigger validation
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-secret-key',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'DATABASE_URL': 'postgresql://test:test@localhost/test',
            'MQTT_CA_CERTS': '/path/to/ca',
            'MQTT_CERT_FILE': '/path/to/cert',
            'MQTT_KEY_FILE': '/path/to/key',
            'OPCUA_CERT_FILE': '/path/to/opcua/cert',
            'OPCUA_PRIVATE_KEY_FILE': '/path/to/opcua/key',
            'OPCUA_TRUST_CERT_FILE': '/path/to/opcua/trust',
            'WEBSOCKET_CORS_ORIGINS': 'http://app.example.com',
            'FLASK_ENV': 'production',
            'APP_ENV': 'production',
            'CI': '',  # Clear CI flag to simulate true production
            'PYTEST_CURRENT_TEST': ''  # Clear test flag
        }, clear=False):
            with pytest.raises(ValueError, match="must use HTTPS"):
                ProductionConfig()
    
    def test_production_config_rejects_mixed_http_https_cors(self):
        """Test that ProductionConfig rejects mixed HTTP/HTTPS CORS origins."""
        from config import ProductionConfig
        
        # Try to set mixed HTTP and HTTPS CORS origins
        # Must set FLASK_ENV and APP_ENV to 'production' to trigger validation
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-secret-key',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'DATABASE_URL': 'postgresql://test:test@localhost/test',
            'MQTT_CA_CERTS': '/path/to/ca',
            'MQTT_CERT_FILE': '/path/to/cert',
            'MQTT_KEY_FILE': '/path/to/key',
            'OPCUA_CERT_FILE': '/path/to/opcua/cert',
            'OPCUA_PRIVATE_KEY_FILE': '/path/to/opcua/key',
            'OPCUA_TRUST_CERT_FILE': '/path/to/opcua/trust',
            'WEBSOCKET_CORS_ORIGINS': 'https://app.example.com,http://admin.example.com',
            'FLASK_ENV': 'production',
            'APP_ENV': 'production',
            'CI': '',  # Clear CI flag to simulate true production
            'PYTEST_CURRENT_TEST': ''  # Clear test flag
        }, clear=False):
            with pytest.raises(ValueError, match="must use HTTPS"):
                ProductionConfig()
