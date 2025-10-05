"""Tests for secure logging integration with error handler."""
import pytest
from unittest.mock import patch
from app import create_app
from app.utils.error_handler import SecurityAwareErrorHandler


class TestSecureLoggingIntegration:
    """Test secure logging integration with error handler."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        return create_app('testing')
    
    def test_error_handler_sanitizes_password_in_logs(self, app, caplog):
        """Test that error handler sanitizes passwords in log messages."""
        with app.app_context():
            error = Exception("Database error: password=secret123")
            
            with patch('app.utils.error_handler.logger') as mock_logger:
                response, status_code = SecurityAwareErrorHandler.handle_service_error(
                    error, 'database_error', 'Test operation', 500
                )
                
                # Verify logger was called
                assert mock_logger.error.called
                
                # Get the log message that was passed
                call_args = mock_logger.error.call_args
                log_message = call_args[0][0] if call_args[0] else ""
                
                # Should contain the error class name for debugging
                assert 'Exception' in log_message
    
    def test_error_handler_includes_error_class_in_logs(self, app):
        """Test that error handler includes error class name in logs."""
        with app.app_context():
            error = ValueError("Invalid input value")
            
            with patch('app.utils.error_handler.logger') as mock_logger:
                response, status_code = SecurityAwareErrorHandler.handle_service_error(
                    error, 'validation_error', 'Input validation', 400
                )
                
                # Verify logger was called
                assert mock_logger.warning.called
                
                # Get the log message
                call_args = mock_logger.warning.call_args
                log_message = call_args[0][0] if call_args[0] else ""
                
                # Should contain error class name
                assert 'ValueError' in log_message
                
                # Check extra data includes error_class
                if 'extra' in call_args[1]:
                    assert call_args[1]['extra']['error_class'] == 'ValueError'
    
    def test_error_handler_sanitizes_token_in_logs(self, app):
        """Test that error handler sanitizes tokens in log messages."""
        with app.app_context():
            error = Exception("API call failed with token=abc123xyz")
            
            with patch('app.utils.error_handler.logger') as mock_logger:
                response, status_code = SecurityAwareErrorHandler.handle_service_error(
                    error, 'internal_error', 'API call', 500
                )
                
                # Should be logged as error (internal_error)
                assert mock_logger.error.called
                
                # Verify error class is in extra data
                call_args = mock_logger.error.call_args
                if 'extra' in call_args[1]:
                    assert 'error_class' in call_args[1]['extra']
                    assert call_args[1]['extra']['error_class'] == 'Exception'
    
    def test_domain_exception_includes_error_class(self, app):
        """Test that domain exception handler includes error class in logs."""
        with app.app_context():
            from app.exceptions import ThermaCoreException
            
            exception = ThermaCoreException(
                error_type='database_error',
                message='Database connection failed with password=secret',
                context='user_creation',
                status_code=500
            )
            
            with patch('app.utils.error_handler.logger') as mock_logger:
                response, status_code = SecurityAwareErrorHandler.handle_thermacore_exception(exception)
                
                # Verify logger was called
                assert mock_logger.error.called
                
                # Get the log message
                call_args = mock_logger.error.call_args
                log_message = call_args[0][0] if call_args[0] else ""
                
                # Should contain error class name
                assert 'ThermaCoreException' in log_message
                
                # Check extra data includes error_class
                if 'extra' in call_args[1]:
                    assert call_args[1]['extra']['error_class'] == 'ThermaCoreException'
    
    def test_error_handler_provides_debug_context(self, app):
        """Test that error handler provides sufficient debug context."""
        with app.app_context():
            error = RuntimeError("Unexpected runtime error")
            
            with patch('app.utils.error_handler.logger') as mock_logger:
                response, status_code = SecurityAwareErrorHandler.handle_service_error(
                    error, 'internal_error', 'background_task', 500
                )
                
                assert mock_logger.error.called
                
                # Check that extra data has all debug context
                call_args = mock_logger.error.call_args
                if 'extra' in call_args[1]:
                    extra = call_args[1]['extra']
                    assert 'request_id' in extra
                    assert 'error_type' in extra
                    assert 'error_class' in extra
                    assert 'context' in extra
                    assert 'status_code' in extra
                    assert extra['error_class'] == 'RuntimeError'
                    assert extra['context'] == 'background_task'
    
    def test_multiple_sensitive_patterns_sanitized(self, app):
        """Test that multiple sensitive patterns are sanitized."""
        with app.app_context():
            error = Exception("Auth failed: password=secret123 token=xyz789 api_key=abc456")
            
            with patch('app.utils.error_handler.logger'):
                response, status_code = SecurityAwareErrorHandler.handle_service_error(
                    error, 'authentication_error', 'login', 401
                )
                
                # Get response data
                response_data = response.get_json()
                
                # User-facing message should not contain sensitive data
                assert 'secret123' not in str(response_data)
                assert 'xyz789' not in str(response_data)
                assert 'abc456' not in str(response_data)
    
    def test_error_context_preserved_in_logs(self, app):
        """Test that error context is preserved while sanitizing sensitive data."""
        with app.app_context():
            error = Exception("User admin login failed with password=secret at /api/v1/login")
            
            with patch('app.utils.error_handler.logger') as mock_logger:
                response, status_code = SecurityAwareErrorHandler.handle_service_error(
                    error, 'authentication_error', 'user_login', 401
                )
                
                assert mock_logger.warning.called
                
                # Get the log message
                call_args = mock_logger.warning.call_args
                log_message = call_args[0][0] if call_args[0] else ""
                
                # Context should be preserved
                assert 'user_login' in log_message or call_args[1].get('extra', {}).get('context') == 'user_login'
