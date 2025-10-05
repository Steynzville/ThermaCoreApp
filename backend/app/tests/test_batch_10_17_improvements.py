"""Tests for batch 10-17 improvements: environment detection, policy validation, and service initialization."""

import os
import pytest
from unittest.mock import Mock, patch

from app.utils.environment import is_production_environment, is_development_environment, is_testing_environment
from app.services.opcua_service import OPCUAClient
from app import _initialize_critical_service


class TestEnvironmentDetection:
    """Test robust environment detection."""
    
    def test_production_detection_via_flask_env(self):
        """Test production detection via FLASK_ENV."""
        # Create a mock app that doesn't have TESTING=True to bypass Flask app context
        mock_app = type('MockApp', (), {'config': {}})()
        
        with patch.dict('os.environ', {'FLASK_ENV': 'production'}, clear=True):
            assert is_production_environment(mock_app) is True
            assert is_development_environment(mock_app) is False
    
    def test_production_detection_via_app_env(self):
        """Test production detection via APP_ENV."""
        # Create a mock app that doesn't have TESTING=True to bypass Flask app context
        mock_app = type('MockApp', (), {'config': {}})()
        
        with patch.dict('os.environ', {'APP_ENV': 'production'}, clear=True):
            assert is_production_environment(mock_app) is True
    
    def test_development_detection_via_flask_env(self):
        """Test development detection via FLASK_ENV."""
        # Create a mock app that doesn't have TESTING=True to bypass Flask app context
        mock_app = type('MockApp', (), {'config': {}})()
        
        with patch.dict('os.environ', {'FLASK_ENV': 'development'}, clear=True):
            assert is_development_environment(mock_app) is True
            assert is_production_environment(mock_app) is False
    
    def test_production_detection_via_debug_false(self):
        """Test production detection when DEBUG=False in app config."""
        mock_app = Mock()
        mock_app.config = {'DEBUG': False}
        
        with patch.dict('os.environ', {}, clear=True):
            assert is_production_environment(mock_app) is True
    
    def test_development_detection_via_debug_true(self):
        """Test development detection when DEBUG=True in app config."""
        mock_app = Mock()
        mock_app.config = {'DEBUG': True}
        
        with patch.dict('os.environ', {}, clear=True):
            assert is_production_environment(mock_app) is False
    
    def test_default_to_production_when_unclear(self):
        """Test that unclear environment defaults to production for safety."""
        # Create a mock app that doesn't have TESTING=True to bypass Flask app context
        mock_app = type('MockApp', (), {'config': {}})()
        
        env_keys_to_clear = ['FLASK_ENV', 'APP_ENV', 'TESTING', 'DEBUG'] 
        with patch.dict('os.environ', {}, clear=True):
            # Explicitly ensure no environment vars that affect detection
            for key in env_keys_to_clear:
                os.environ.pop(key, None)
            assert is_production_environment(mock_app) is True
    
    def test_testing_environment_detection(self):
        """Test testing environment detection."""
        # Create a mock app to ensure consistent behavior
        mock_app = type('MockApp', (), {'config': {}})()
        
        with patch.dict('os.environ', {'TESTING': 'true'}):
            assert is_testing_environment(mock_app) is True
        
        with patch.dict('os.environ', {'TESTING': '1'}):
            assert is_testing_environment(mock_app) is True
    
    def test_testing_environment_not_development(self):
        """Test that testing environment is not classified as development."""
        # Create a mock app to ensure consistent behavior
        mock_app = type('MockApp', (), {'config': {}})()
        
        with patch.dict('os.environ', {'TESTING': 'true'}):
            assert is_testing_environment(mock_app) is True
            assert is_development_environment(mock_app) is False
            assert is_production_environment(mock_app) is False
    
    def test_testing_environment_not_production(self):
        """Test that testing environment is not classified as production."""
        # Create a mock app to ensure consistent behavior
        mock_app = type('MockApp', (), {'config': {}})()
        
        # Even with production environment variables, testing takes priority
        with patch.dict('os.environ', {'TESTING': 'true', 'FLASK_ENV': 'production'}):
            assert is_testing_environment(mock_app) is True
            assert is_production_environment(mock_app) is False
            assert is_development_environment(mock_app) is False


class TestOPCUASecurityPolicyValidation:
    """Test OPC UA security policy validation improvements."""
    
    def test_validate_security_policy_valid_strong(self):
        """Test validation of strong security policies."""
        client = OPCUAClient()
        
        # Strong policies should pass
        assert client._validate_security_policy('Basic256Sha256', require_strong=True) is True
        assert client._validate_security_policy('Aes256_Sha256_RsaPss', require_strong=True) is True
    
    def test_validate_security_policy_valid_weak(self):
        """Test validation of weak security policies when not requiring strong."""
        client = OPCUAClient()
        
        # Weak policies should pass when not requiring strong
        assert client._validate_security_policy('Basic128Rsa15', require_strong=False) is True
        assert client._validate_security_policy('Basic256', require_strong=False) is True
        assert client._validate_security_policy('None', require_strong=False) is True
    
    def test_validate_security_policy_weak_rejected_when_strong_required(self):
        """Test weak policies are rejected when strong is required."""
        client = OPCUAClient()
        
        with pytest.raises(ValueError, match="is too weak for production"):
            client._validate_security_policy('Basic128Rsa15', require_strong=True)
        
        with pytest.raises(ValueError, match="is too weak for production"):
            client._validate_security_policy('None', require_strong=True)
    
    def test_validate_security_policy_invalid_policy_always_fails(self):
        """Test invalid security policies always fail immediately."""
        client = OPCUAClient()
        
        with pytest.raises(ValueError, match="Invalid OPC UA security policy"):
            client._validate_security_policy('InvalidPolicy', require_strong=False)
        
        with pytest.raises(ValueError, match="Invalid OPC UA security policy"):
            client._validate_security_policy('InvalidPolicy', require_strong=True)


class TestCriticalServiceInitialization:
    """Test shared critical service initialization helper."""
    
    def test_successful_service_initialization(self):
        """Test successful service initialization."""
        mock_service = Mock()
        mock_app = Mock()
        mock_logger = Mock()
        
        result = _initialize_critical_service(
            mock_service, "Test Service", mock_app, mock_logger
        )
        
        assert result is True
        mock_service.init_app.assert_called_once_with(mock_app)
        mock_logger.info.assert_called_with("Test Service initialized successfully")
    
    def test_service_initialization_value_error_development(self):
        """Test ValueError handling in development environment."""
        mock_service = Mock()
        mock_service.init_app.side_effect = ValueError("Test validation error")
        mock_app = Mock()
        mock_logger = Mock()
        
        with patch('app.utils.environment.is_production_environment', return_value=False):
            with patch('app.utils.environment.is_testing_environment', return_value=False):
                result = _initialize_critical_service(
                    mock_service, "Test Service", mock_app, mock_logger
                )
        
        assert result is False
        mock_logger.error.assert_called()  # Now expects error level logging for config issues
        
    def test_service_initialization_value_error_production(self):
        """Test ValueError handling in production environment."""
        mock_service = Mock()
        mock_service.init_app.side_effect = ValueError("Test validation error")
        mock_app = Mock()
        mock_logger = Mock()
        
        with patch('app.utils.environment.is_production_environment', return_value=True):
            with pytest.raises(RuntimeError, match="security validation failed in production"):
                _initialize_critical_service(
                    mock_service, "Test Service", mock_app, mock_logger
                )
    
    def test_service_initialization_generic_error_development(self):
        """Test generic exception handling in development environment."""
        mock_service = Mock()
        mock_service.init_app.side_effect = Exception("Generic error")
        mock_app = Mock()
        mock_logger = Mock()
        
        with patch('app.utils.environment.is_production_environment', return_value=False):
            with patch('app.utils.environment.is_testing_environment', return_value=False):
                result = _initialize_critical_service(
                    mock_service, "Test Service", mock_app, mock_logger
                )
        
        assert result is False
        mock_logger.warning.assert_called()
    
    def test_service_initialization_generic_error_production(self):
        """Test generic exception handling in production environment."""
        mock_service = Mock()
        mock_service.init_app.side_effect = Exception("Generic error")
        mock_app = Mock()
        mock_logger = Mock()
        
        with patch('app.utils.environment.is_production_environment', return_value=True):
            with pytest.raises(RuntimeError, match="Critical service initialization failed"):
                _initialize_critical_service(
                    mock_service, "Test Service", mock_app, mock_logger
                )
    
    def test_service_initialization_with_additional_args(self):
        """Test service initialization with additional arguments."""
        mock_service = Mock()
        mock_app = Mock()
        mock_logger = Mock()
        additional_arg = Mock()
        
        result = _initialize_critical_service(
            mock_service, "Test Service", mock_app, mock_logger,
            'init_app', additional_arg
        )
        
        assert result is True
        mock_service.init_app.assert_called_once_with(mock_app, additional_arg)