#!/usr/bin/env python3
"""Validation script for secure logging implementation."""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.utils.secure_logger import SecureLogger

def test_basic_sanitization():
    """Test basic sensitive data sanitization."""
    print("Testing basic sanitization...")
    
    # Test password redaction
    message = "Login failed with password=secret123"
    sanitized = SecureLogger.sanitize_log_message(message)
    assert 'secret123' not in sanitized, "Password not redacted"
    assert 'password=***' in sanitized, "Password pattern not found"
    print("✓ Password redaction works")
    
    # Test token redaction
    message = "API call with token=abc123xyz"
    sanitized = SecureLogger.sanitize_log_message(message)
    assert 'abc123xyz' not in sanitized, "Token not redacted"
    assert 'token=***' in sanitized, "Token pattern not found"
    print("✓ Token redaction works")
    
    # Test API key redaction
    message = "Request with api_key=my_secret_key"
    sanitized = SecureLogger.sanitize_log_message(message)
    assert 'my_secret_key' not in sanitized, "API key not redacted"
    assert 'api_key=***' in sanitized, "API key pattern not found"
    print("✓ API key redaction works")
    
    print()

def test_dict_sanitization():
    """Test dictionary sanitization."""
    print("Testing dictionary sanitization...")
    
    data = {
        'username': 'admin',
        'password': 'secret123',
        'email': 'admin@example.com',
        'token': 'xyz789'
    }
    
    sanitized = SecureLogger.sanitize_dict(data)
    assert sanitized['username'] == 'admin', "Username was modified"
    assert sanitized['password'] == '[REDACTED]', "Password not redacted"
    assert sanitized['email'] == 'admin@example.com', "Email was modified"
    assert sanitized['token'] == '[REDACTED]', "Token not redacted"
    print("✓ Dictionary sanitization works")
    
    print()

def test_nested_sanitization():
    """Test nested dictionary sanitization."""
    print("Testing nested dictionary sanitization...")
    
    data = {
        'user': {
            'username': 'admin',
            'password': 'secret',
            'settings': {
                'api_key': 'abc123'
            }
        }
    }
    
    sanitized = SecureLogger.sanitize_dict(data)
    assert sanitized['user']['username'] == 'admin', "Username was modified"
    assert sanitized['user']['password'] == '[REDACTED]', "Nested password not redacted"
    assert sanitized['user']['settings']['api_key'] == '[REDACTED]', "Nested API key not redacted"
    print("✓ Nested sanitization works")
    
    print()

def test_logger_adapter():
    """Test secure logger adapter."""
    print("Testing logger adapter...")
    
    logger = SecureLogger.get_secure_logger('test')
    assert logger is not None, "Logger not created"
    assert hasattr(logger, 'error'), "Logger missing error method"
    assert hasattr(logger, 'warning'), "Logger missing warning method"
    assert hasattr(logger, 'info'), "Logger missing info method"
    print("✓ Logger adapter created successfully")
    
    print()

def test_multiple_patterns():
    """Test multiple sensitive patterns in same message."""
    print("Testing multiple patterns...")
    
    message = "Auth failed: password=secret123 and token=xyz789 and api_key=abc456"
    sanitized = SecureLogger.sanitize_log_message(message)
    assert 'secret123' not in sanitized, "Password not redacted"
    assert 'xyz789' not in sanitized, "Token not redacted"
    assert 'abc456' not in sanitized, "API key not redacted"
    assert 'password=***' in sanitized, "Password pattern not found"
    assert 'token=***' in sanitized, "Token pattern not found"
    assert 'api_key=***' in sanitized, "API key pattern not found"
    print("✓ Multiple patterns redacted correctly")
    
    print()

def main():
    """Run all validation tests."""
    print("=" * 60)
    print("Secure Logging Implementation Validation")
    print("=" * 60)
    print()
    
    try:
        test_basic_sanitization()
        test_dict_sanitization()
        test_nested_sanitization()
        test_logger_adapter()
        test_multiple_patterns()
        
        print("=" * 60)
        print("✓ All validation tests passed!")
        print("=" * 60)
        return 0
    except AssertionError as e:
        print(f"\n✗ Validation failed: {e}")
        return 1
    except Exception as e:
        print(f"\n✗ Error during validation: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
