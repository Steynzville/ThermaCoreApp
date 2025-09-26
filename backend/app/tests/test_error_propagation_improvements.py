"""Tests for error propagation and handling improvements."""
import pytest
from unittest.mock import Mock, patch
import os

from app.utils.environment import handle_environment_detection_error
from app import _initialize_critical_service


class TestErrorPropagationImprovements:
    """Test improved error propagation following reviewer recommendations."""
    
    def test_handle_environment_detection_error_production_security(self):
        """Test error handler in production with security validation."""
        mock_app = Mock()
        mock_logger = Mock()
        original_error = ValueError("Certificate validation failed")
        
        with patch('app.utils.environment.is_production_environment', return_value=True):
            should_continue, error_to_raise = handle_environment_detection_error(
                "Test Service", mock_logger, mock_app, original_error, 
                "security validation", is_security_validation=True
            )
        
        # Should not continue and should have an error to raise
        assert should_continue is False
        assert error_to_raise is not None
        assert isinstance(error_to_raise, RuntimeError)
        assert "security validation failed in production" in str(error_to_raise)
        assert error_to_raise.__cause__ is original_error
    
    def test_handle_environment_detection_error_production_general(self):
        """Test error handler in production with general initialization."""
        mock_app = Mock()
        mock_logger = Mock()
        original_error = ConnectionError("Cannot connect to server")
        
        with patch('app.utils.environment.is_production_environment', return_value=True):
            should_continue, error_to_raise = handle_environment_detection_error(
                "Test Service", mock_logger, mock_app, original_error, 
                "initialization", is_security_validation=False
            )
        
        # Should not continue and should have an error to raise
        assert should_continue is False
        assert error_to_raise is not None
        assert isinstance(error_to_raise, RuntimeError)
        assert "Critical service initialization failed" in str(error_to_raise)
        assert error_to_raise.__cause__ is original_error
    
    def test_handle_environment_detection_error_testing(self):
        """Test error handler in testing environment."""
        mock_app = Mock()
        mock_logger = Mock()
        original_error = ValueError("Configuration error")
        
        with patch('app.utils.environment.is_production_environment', return_value=False), \
             patch('app.utils.environment.is_testing_environment', return_value=True):
            should_continue, error_to_raise = handle_environment_detection_error(
                "Test Service", mock_logger, mock_app, original_error, 
                "initialization", is_security_validation=False
            )
        
        # Should not continue and should have an error to raise
        assert should_continue is False
        assert error_to_raise is not None
        assert isinstance(error_to_raise, RuntimeError)
        assert "initialization failed in testing" in str(error_to_raise)
        assert error_to_raise.__cause__ is original_error
    
    def test_handle_environment_detection_error_development_config(self):
        """Test error handler in development with configuration errors."""
        mock_app = Mock()
        mock_logger = Mock()
        original_error = ValueError("Missing required configuration")
        
        with patch('app.utils.environment.is_production_environment', return_value=False), \
             patch('app.utils.environment.is_testing_environment', return_value=False):
            should_continue, error_to_raise = handle_environment_detection_error(
                "Test Service", mock_logger, mock_app, original_error, 
                "initialization", is_security_validation=False
            )
        
        # Should not continue but no error to raise (handled in calling code)
        assert should_continue is False
        assert error_to_raise is None
        mock_logger.error.assert_called_with(
            "Test Service failed with configuration error (development). This should be addressed: Missing required configuration"
        )
    
    def test_handle_environment_detection_error_development_other(self):
        """Test error handler in development with non-configuration errors."""
        mock_app = Mock()
        mock_logger = Mock()
        original_error = ImportError("Module not found")
        
        with patch('app.utils.environment.is_production_environment', return_value=False), \
             patch('app.utils.environment.is_testing_environment', return_value=False):
            should_continue, error_to_raise = handle_environment_detection_error(
                "Test Service", mock_logger, mock_app, original_error, 
                "initialization", is_security_validation=False
            )
        
        # Should not continue but no error to raise (handled in calling code)
        assert should_continue is False
        assert error_to_raise is None
        mock_logger.warning.assert_called_with(
            "Test Service initialization failed (development): Module not found"
        )
    
    def test_critical_service_initialization_uses_error_handler_correctly(self):
        """Test that critical service initialization correctly uses error handler return values."""
        mock_service = Mock()
        mock_service.init_app.side_effect = ValueError("Test configuration error")
        mock_app = Mock()
        mock_logger = Mock()
        
        # Test case where error handler returns False, None (development config error)
        with patch('app.utils.environment.is_production_environment', return_value=False), \
             patch('app.utils.environment.is_testing_environment', return_value=False):
            
            result = _initialize_critical_service(mock_service, "Test Service", mock_app, mock_logger)
            assert result is False
            
            # Should log configuration error
            mock_logger.error.assert_called()
    
    def test_environment_detection_error_with_env_detection_failure(self):
        """Test error handler when environment detection itself fails."""
        mock_app = Mock()
        mock_logger = Mock()
        original_error = ValueError("Service init failed")
        
        # Make environment detection throw an error
        with patch('app.utils.environment.is_production_environment', side_effect=ValueError("Env detection failed")):
            should_continue, error_to_raise = handle_environment_detection_error(
                "Test Service", mock_logger, mock_app, original_error, 
                "initialization", is_security_validation=False
            )
        
        # Should not continue and should have a runtime error
        assert should_continue is False
        assert error_to_raise is not None
        assert isinstance(error_to_raise, RuntimeError)
        assert "environment configuration error" in str(error_to_raise)
        assert "Env detection failed" in str(error_to_raise.__cause__)

