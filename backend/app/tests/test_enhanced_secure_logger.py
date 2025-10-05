"""Tests for enhanced SecureLogger sensitive patterns."""
from app.utils.secure_logger import SecureLogger


class TestEnhancedSensitivePatterns:
    """Test enhanced sensitive data patterns in SecureLogger."""
    
    def test_sanitize_ssn(self):
        """Test SSN redaction."""
        message = "User SSN is 123-45-6789"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert '123-45-6789' not in sanitized
        assert '***-**-****' in sanitized
    
    def test_sanitize_credit_card(self):
        """Test credit card redaction."""
        message = "Payment with card 4532-1234-5678-9010"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert '4532-1234-5678-9010' not in sanitized
        assert '****-****-****-****' in sanitized
    
    def test_sanitize_credit_card_no_dashes(self):
        """Test credit card redaction without dashes."""
        message = "Card number: 4532123456789010"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert '4532123456789010' not in sanitized
        assert '****-****-****-****' in sanitized
    
    def test_sanitize_phone_number(self):
        """Test phone number redaction."""
        message = "Contact: 555-123-4567"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert '555-123-4567' not in sanitized
        assert '***-***-****' in sanitized
    
    def test_sanitize_database_url(self):
        """Test database URL password redaction."""
        message = "Connecting to postgresql://user:secretpass@localhost:5432/db"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'secretpass' not in sanitized
        assert 'user:***@' in sanitized
    
    def test_sanitize_email_partial(self):
        """Test partial email redaction for privacy."""
        message = "User email: john.doe.smith@example.com"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        # Should partially redact the local part
        assert 'john.doe.smith@' not in sanitized
        assert '@example.com' in sanitized
    
    def test_sanitize_bearer_token(self):
        """Test Bearer token redaction."""
        message = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' not in sanitized
        # The token is redacted - either as "Bearer ***" or "authorization=***"
        assert ('Bearer ***' in sanitized or 'authorization=***' in sanitized)
    
    def test_sanitize_private_key_pem(self):
        """Test private key PEM redaction."""
        message = "Key: -----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQ...\n-----END RSA PRIVATE KEY-----"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'BEGIN RSA PRIVATE KEY' not in sanitized
        assert '[PRIVATE_KEY_REDACTED]' in sanitized
    
    def test_sanitize_passwd_variant(self):
        """Test passwd variant redaction."""
        message = "Login failed with passwd=mypassword123"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'mypassword123' not in sanitized
        assert 'passwd=***' in sanitized
    
    def test_sanitize_pwd_variant(self):
        """Test pwd variant redaction."""
        message = "Auth error: pwd=secret"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'secret' not in sanitized
        assert 'pwd=***' in sanitized
    
    def test_sanitize_session_token(self):
        """Test session token redaction."""
        message = "Session created: session=abc123xyz789"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'abc123xyz789' not in sanitized
        assert 'session=***' in sanitized
    
    def test_sanitize_csrf_token(self):
        """Test CSRF token redaction."""
        message = "Form submitted with csrf=token123"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'token123' not in sanitized
        assert 'csrf=***' in sanitized
    
    def test_sanitize_private_key_field(self):
        """Test private_key field redaction."""
        message = "Config: private_key=AKIAIOSFODNN7EXAMPLE"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'AKIAIOSFODNN7EXAMPLE' not in sanitized
        assert 'private_key=***' in sanitized
    
    def test_sanitize_client_secret(self):
        """Test client_secret redaction."""
        message = "OAuth config: client_secret=mysecret123"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'mysecret123' not in sanitized
        assert 'client_secret=***' in sanitized


class TestEnhancedDictSanitization:
    """Test enhanced dictionary sanitization with new sensitive keys."""
    
    def test_sanitize_dict_with_ssn(self):
        """Test dictionary sanitization with SSN field."""
        data = {
            'name': 'John Doe',
            'ssn': '123-45-6789',
            'email': 'john@example.com'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['name'] == 'John Doe'
        assert sanitized['ssn'] == '[REDACTED]'
    
    def test_sanitize_dict_with_credit_card(self):
        """Test dictionary sanitization with credit card field."""
        data = {
            'user_id': 123,
            'credit_card': '4532-1234-5678-9010',
            'cvv': '123'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['user_id'] == 123
        assert sanitized['credit_card'] == '[REDACTED]'
        assert sanitized['cvv'] == '[REDACTED]'
    
    def test_sanitize_dict_with_session(self):
        """Test dictionary sanitization with session fields."""
        data = {
            'session': 'abc123',
            'session_id': 'xyz789',
            'sessionid': 'def456'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['session'] == '[REDACTED]'
        assert sanitized['session_id'] == '[REDACTED]'
        assert sanitized['sessionid'] == '[REDACTED]'
    
    def test_sanitize_dict_with_credentials(self):
        """Test dictionary sanitization with credentials field."""
        data = {
            'username': 'admin',
            'credentials': 'admin:password123'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['username'] == 'admin'
        assert sanitized['credentials'] == '[REDACTED]'
    
    def test_sanitize_dict_with_cert(self):
        """Test dictionary sanitization with certificate fields."""
        data = {
            'cert': '/path/to/cert.pem',
            'certificate': 'cert_data',
            'private_key_path': '/path/to/key.pem',
            'key_file': 'key.pem'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['cert'] == '[REDACTED]'
        assert sanitized['certificate'] == '[REDACTED]'
        assert sanitized['private_key_path'] == '[REDACTED]'
        assert sanitized['key_file'] == '[REDACTED]'
    
    def test_sanitize_dict_with_financial_data(self):
        """Test dictionary sanitization with financial data."""
        data = {
            'account_number': '1234567890',
            'routing_number': '021000021',
            'pin': '1234',
            'security_code': '123'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['account_number'] == '[REDACTED]'
        assert sanitized['routing_number'] == '[REDACTED]'
        assert sanitized['pin'] == '[REDACTED]'
        assert sanitized['security_code'] == '[REDACTED]'
    
    def test_sanitize_nested_dict_with_pii(self):
        """Test nested dictionary with PII."""
        data = {
            'user': {
                'name': 'John Doe',
                'ssn': '123-45-6789',
                'payment': {
                    'credit_card': '4532123456789010',
                    'cvv': '123'
                }
            }
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['user']['name'] == 'John Doe'
        assert sanitized['user']['ssn'] == '[REDACTED]'
        assert sanitized['user']['payment']['credit_card'] == '[REDACTED]'
        assert sanitized['user']['payment']['cvv'] == '[REDACTED]'
    
    def test_sanitize_dict_string_value_with_database_url(self):
        """Test that string values containing database URLs are sanitized."""
        data = {
            'connection': 'postgresql://user:password123@localhost/db',
            'status': 'connected'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert 'password123' not in sanitized['connection']
        assert 'user:***@' in sanitized['connection']
        assert sanitized['status'] == 'connected'
    
    def test_sanitize_dict_case_insensitive_new_keys(self):
        """Test case-insensitive matching for new sensitive keys."""
        data = {
            'SSN': '123-45-6789',
            'Session': 'abc123',
            'CREDENTIALS': 'user:pass',
            'Cvv': '123'
        }
        sanitized = SecureLogger.sanitize_dict(data)
        
        assert sanitized['SSN'] == '[REDACTED]'
        assert sanitized['Session'] == '[REDACTED]'
        assert sanitized['CREDENTIALS'] == '[REDACTED]'
        assert sanitized['Cvv'] == '[REDACTED]'


class TestMultipleSensitivePatternsInSameMessage:
    """Test handling of multiple sensitive patterns in the same message."""
    
    def test_multiple_credential_types(self):
        """Test multiple credential types in one message."""
        message = "Auth failed: password=secret123, token=xyz789, api_key=abc456, session=sess123"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'secret123' not in sanitized
        assert 'xyz789' not in sanitized
        assert 'abc456' not in sanitized
        assert 'sess123' not in sanitized
        assert 'password=***' in sanitized
        assert 'token=***' in sanitized
        assert 'api_key=***' in sanitized
        assert 'session=***' in sanitized
    
    def test_pii_and_credentials(self):
        """Test PII and credentials in one message."""
        message = "User 123-45-6789 login with password=secret at user@example.com"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert '123-45-6789' not in sanitized
        assert 'secret' not in sanitized
        assert '***-**-****' in sanitized
        assert 'password=***' in sanitized
    
    def test_database_url_with_bearer_token(self):
        """Test database URL and bearer token in one message."""
        message = "DB: postgresql://user:pass@localhost, Auth: Bearer abc123xyz"
        sanitized = SecureLogger.sanitize_log_message(message)
        
        assert 'pass' not in sanitized or 'user:***@' in sanitized
        assert 'abc123xyz' not in sanitized
        assert 'Bearer ***' in sanitized
