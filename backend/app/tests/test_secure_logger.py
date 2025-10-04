"""Tests for SecureLogger utility class."""
import pytest
import logging
from app.utils.secure_logger import SecureLogger, SecureLoggerAdapter


class TestSecureLogger:
    """Test SecureLogger sensitive data redaction functionality."""
    
    def test_sanitize_password_in_log_message(self):
        """Test password redaction from log messages."""
        message = "Login failed with password=secret123"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'secret123' not in sanitized
        assert 'password=***' in sanitized
    
    def test_sanitize_token_in_log_message(self):
        """Test token redaction from log messages."""
        message = "API call failed with token=abc123xyz"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'abc123xyz' not in sanitized
        assert 'token=***' in sanitized
    
    def test_sanitize_api_key_in_log_message(self):
        """Test API key redaction from log messages."""
        message = "Request sent with api_key=my_secret_key"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'my_secret_key' not in sanitized
        assert 'api_key=***' in sanitized
    
    def test_sanitize_api_key_with_dash(self):
        """Test API key with dash redaction from log messages."""
        message = "Request sent with api-key=my_secret_key"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'my_secret_key' not in sanitized
        assert 'api_key=***' in sanitized
    
    def test_sanitize_secret_in_log_message(self):
        """Test secret redaction from log messages."""
        message = "Configuration has secret=mysecretvalue"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'mysecretvalue' not in sanitized
        assert 'secret=***' in sanitized
    
    def test_sanitize_authorization_header(self):
        """Test authorization header redaction from log messages."""
        message = "Request with authorization=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' not in sanitized
        assert 'authorization=***' in sanitized
    
    def test_sanitize_jwt_token(self):
        """Test JWT token redaction from log messages."""
        message = "JWT validation failed: jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' not in sanitized
        assert 'jwt=***' in sanitized
    
    def test_sanitize_access_token(self):
        """Test access token redaction from log messages."""
        message = "Token refresh with access_token=abc123"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'abc123' not in sanitized
        assert 'access_token=***' in sanitized
    
    def test_sanitize_refresh_token(self):
        """Test refresh token redaction from log messages."""
        message = "Token refresh with refresh_token=xyz789"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'xyz789' not in sanitized
        assert 'refresh_token=***' in sanitized
    
    def test_sanitize_case_insensitive(self):
        """Test case-insensitive pattern matching."""
        message = "Login with PASSWORD=secret123 and TOKEN=abc"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'secret123' not in sanitized
        assert 'abc' not in sanitized
        assert 'password=***' in sanitized.lower()
        assert 'token=***' in sanitized.lower()
    
    def test_sanitize_json_like_format(self):
        """Test redaction in JSON-like format."""
        message = '{"password": "secret123", "token": "abc123"}'
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'secret123' not in sanitized
        assert 'abc123' not in sanitized
        assert 'password=***' in sanitized or 'password"***' in sanitized
    
    def test_sanitize_dict_with_password(self):
        """Test dictionary sanitization with password field."""
        data = {
            'username': 'admin',
            'password': 'secret123',
            'email': 'admin@example.com'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['username'] == 'admin'
        assert sanitized['password'] == '[REDACTED]'
        # Email is partially redacted for privacy (new security feature)
        assert '@example.com' in sanitized['email']
        assert 'admin@example.com' not in sanitized['email']
    
    def test_sanitize_dict_with_token(self):
        """Test dictionary sanitization with token field."""
        data = {
            'user_id': 123,
            'token': 'abc123xyz',
            'expires': 3600
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['user_id'] == 123
        assert sanitized['token'] == '[REDACTED]'
        assert sanitized['expires'] == 3600
    
    def test_sanitize_dict_with_api_key(self):
        """Test dictionary sanitization with API key field."""
        data = {
            'api_key': 'my_secret_key',
            'endpoint': '/api/v1/users'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['api_key'] == '[REDACTED]'
        assert sanitized['endpoint'] == '/api/v1/users'
    
    def test_sanitize_nested_dict(self):
        """Test nested dictionary sanitization."""
        data = {
            'user': {
                'username': 'admin',
                'password': 'secret123',
                'settings': {
                    'api_key': 'abc123'
                }
            }
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['user']['username'] == 'admin'
        assert sanitized['user']['password'] == '[REDACTED]'
        assert sanitized['user']['settings']['api_key'] == '[REDACTED]'
    
    def test_sanitize_dict_with_list(self):
        """Test dictionary sanitization with list containing dicts."""
        data = {
            'users': [
                {'username': 'user1', 'password': 'pass1'},
                {'username': 'user2', 'token': 'token2'}
            ]
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['users'][0]['username'] == 'user1'
        assert sanitized['users'][0]['password'] == '[REDACTED]'
        assert sanitized['users'][1]['username'] == 'user2'
        assert sanitized['users'][1]['token'] == '[REDACTED]'
    
    def test_sanitize_dict_case_insensitive(self):
        """Test case-insensitive dictionary key matching."""
        data = {
            'PASSWORD': 'secret',
            'Token': 'abc123',
            'API_KEY': 'xyz789'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['PASSWORD'] == '[REDACTED]'
        assert sanitized['Token'] == '[REDACTED]'
        assert sanitized['API_KEY'] == '[REDACTED]'
    
    def test_sanitize_dict_with_all_sensitive_keys(self):
        """Test all known sensitive keys are redacted."""
        data = {
            'password': 'pass',
            'token': 'tok',
            'api_key': 'key',
            'secret': 'sec',
            'jwt': 'jwt_val',
            'refresh_token': 'ref',
            'access_token': 'acc',
            'authorization': 'auth',
            'secret_key': 'skey',
            'private_key': 'pkey',
            'client_secret': 'csec',
            'api_secret': 'asec'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        for key in data.keys():
            assert sanitized[key] == '[REDACTED]', f"Key {key} was not redacted"
    
    def test_sanitize_non_dict_input(self):
        """Test handling of non-dict input."""
        result = SecureLogger.sanitize_dict("not a dict")
        assert result == "not a dict"
    
    def test_sanitize_log_message_with_non_string(self):
        """Test handling of non-string log messages."""
        message = 12345
        sanitized = SecureLogger.sanitize_log_message(message)
        assert sanitized == "12345"
    
    def test_sanitize_empty_message(self):
        """Test handling of empty message."""
        message = ""
        sanitized = SecureLogger.sanitize_log_message(message)
        assert sanitized == ""
    
    def test_sanitize_message_without_sensitive_data(self):
        """Test message without sensitive data remains unchanged."""
        message = "User logged in successfully"
        sanitized = SecureLogger.sanitize_log_message(message)
        assert sanitized == message
    
    def test_get_secure_logger_returns_adapter(self):
        """Test get_secure_logger returns SecureLoggerAdapter."""
        logger = SecureLogger.get_secure_logger('test_logger')
        assert isinstance(logger, SecureLoggerAdapter)
    
    def test_secure_logger_adapter_process(self):
        """Test SecureLoggerAdapter process method."""
        base_logger = logging.getLogger('test')
        adapter = SecureLoggerAdapter(base_logger, SecureLogger)
        
        msg = "Login with password=secret"
        kwargs = {'extra': {'token': 'abc123'}}
        
        processed_msg, processed_kwargs = adapter.process(msg, kwargs)
        
        assert 'secret' not in processed_msg
        assert 'password=***' in processed_msg
        assert processed_kwargs['extra']['token'] == '[REDACTED]'
    
    def test_secure_logger_adapter_logging_methods(self, caplog):
        """Test SecureLoggerAdapter logging methods sanitize data."""
        caplog.set_level(logging.INFO)
        
        logger = SecureLogger.get_secure_logger('test_logger')
        
        # Test info logging
        logger.info("User login with password=secret123")
        
        # Check that the logged message was sanitized
        assert 'secret123' not in caplog.text
        assert 'password=***' in caplog.text
    
    def test_sanitize_dict_string_values_with_patterns(self):
        """Test that string values in dict are also sanitized for patterns."""
        data = {
            'message': 'Failed to connect with password=secret123',
            'status': 'error'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert 'secret123' not in sanitized['message']
        assert 'password=***' in sanitized['message']
        assert sanitized['status'] == 'error'
    
    def test_multiple_sensitive_values_in_same_message(self):
        """Test multiple sensitive values are all redacted."""
        message = "Auth failed: password=secret123 and token=xyz789 and api_key=abc456"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'secret123' not in sanitized
        assert 'xyz789' not in sanitized
        assert 'abc456' not in sanitized
        assert 'password=***' in sanitized
        assert 'token=***' in sanitized
        assert 'api_key=***' in sanitized


class TestSecureLoggerIntegration:
    """Integration tests for SecureLogger with error handling."""
    
    def test_secure_logger_with_error_message(self):
        """Test SecureLogger works with typical error messages."""
        error_msg = "Database connection failed: postgresql://user:password@localhost:5432/db"
        sanitized = SecureLogger.sanitize_log_message(error_msg)
        
        # Password in connection string should be redacted
        assert 'password=***' in sanitized or 'password@' not in sanitized
    
    def test_secure_logger_preserves_important_context(self):
        """Test that SecureLogger preserves non-sensitive context."""
        message = "User admin failed authentication at endpoint /api/v1/login with password=secret"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        # Context preserved
        assert 'User admin' in sanitized
        assert '/api/v1/login' in sanitized
        
        # Sensitive data removed
        assert 'secret' not in sanitized
        assert 'password=***' in sanitized
