#!/usr/bin/env python3
"""Test logging refinement and domain exception handling improvements."""
import sys
import logging
import uuid
from unittest.mock import patch

# Add the app directory to the path
sys.path.insert(0, '.')

def test_domain_exception_handling():
    """Test that ThermaCoreException instances are properly handled."""
    print("Testing Domain Exception Handling...")
    
    try:
        from app.exceptions import (
            ThermaCoreException, ValidationException, 
            AuthenticationException, DatabaseException,
            UnitOfflineException, SensorNotFoundException
        )
        from app.utils.error_handler import SecurityAwareErrorHandler
        
        # Test basic ThermaCoreException
        test_exception = ThermaCoreException(
            "Test error message",
            error_type="validation_error",
            status_code=400,
            context="TestContext",
            details={"test_key": "test_value"}
        )
        
        print(f"✓ Created test exception: {test_exception}")
        print(f"  - Error type: {test_exception.error_type}")
        print(f"  - Status code: {test_exception.status_code}")
        print(f"  - Context: {test_exception.context}")
        print(f"  - Details: {test_exception.details}")
        
        # Test specific domain exceptions
        auth_exception = AuthenticationException("Invalid token")
        print(f"✓ AuthenticationException: status={auth_exception.status_code}, type={auth_exception.error_type}")
        
        unit_exception = UnitOfflineException("unit_123")
        print(f"✓ UnitOfflineException: status={unit_exception.status_code}, type={unit_exception.error_type}")
        
        sensor_exception = SensorNotFoundException("sensor_456")
        print(f"✓ SensorNotFoundException: status={sensor_exception.status_code}, type={sensor_exception.error_type}")
        
        db_exception = DatabaseException("Connection failed")
        print(f"✓ DatabaseException: status={db_exception.status_code}, type={db_exception.error_type}")
        
        print("✓ Domain exception creation tests passed")
        return True
        
    except Exception as e:
        print(f"✗ Domain exception test failed: {e}")
        return False

def test_correlation_id_handling():
    """Test correlation ID handling in error responses."""
    print("\nTesting Correlation ID Handling...")
    
    try:
        from app.utils.error_handler import SecurityAwareErrorHandler
        from app.exceptions import ValidationException
        
        # Mock Flask's g object for request context
        class MockG:
            request_id = str(uuid.uuid4())
        
        with patch('app.utils.error_handler.g', MockG()):
            with patch('app.utils.error_handler.jsonify') as mock_jsonify:
                
                # Test handling a domain exception
                test_exception = ValidationException(
                    "Invalid data format",
                    field="email",
                    details={"reason": "not a valid email"}
                )
                
                response, status = SecurityAwareErrorHandler.handle_thermacore_exception(test_exception)
                
                # Verify jsonify was called
                assert mock_jsonify.called, "jsonify should be called"
                call_args = mock_jsonify.call_args[0][0]
                
                # Verify response structure
                assert 'success' in call_args and call_args['success'] is False
                assert 'error' in call_args
                assert 'request_id' in call_args
                assert 'timestamp' in call_args
                
                # Verify correlation ID in error details
                assert 'details' in call_args['error']
                assert 'correlation_id' in call_args['error']['details']
                
                print(f"✓ Correlation ID properly included in error response")
                print(f"  - Request ID: {call_args['request_id']}")
                print(f"  - Error details contain correlation_id: {call_args['error']['details']['correlation_id']}")
                print(f"  - Status code: {status}")
                
        print("✓ Correlation ID handling tests passed")
        return True
        
    except Exception as e:
        print(f"✗ Correlation ID test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_logging_filter():
    """Test that RequestIDFilter adds correlation ID to log records."""
    print("\nTesting Logging Filter...")
    
    try:
        from app.middleware.request_id import RequestIDFilter, RequestIDManager
        
        # Create a filter and log record
        filter_obj = RequestIDFilter()
        
        # Create a mock log record
        record = logging.LogRecord(
            name='test_logger',
            level=logging.INFO,
            pathname='test.py',
            lineno=1,
            msg='Test message',
            args=(),
            exc_info=None
        )
        
        # Test filter without request context
        result = filter_obj.filter(record)
        
        assert result is True, "Filter should always return True"
        assert hasattr(record, 'request_id'), "Record should have request_id attribute"
        assert record.request_id == 'no-request-context', "Should set no-request-context when no context"
        
        print(f"✓ Logging filter works correctly")
        print(f"  - Record has request_id: {record.request_id}")
        print(f"  - Filter returns: {result}")
        
        print("✓ Logging filter tests passed")
        return True
        
    except Exception as e:
        print(f"✗ Logging filter test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_error_handler_registration():
    """Test that error handler registration works."""
    print("\nTesting Error Handler Registration...")
    
    try:
        from app.utils.error_handler import SecurityAwareErrorHandler
        
        # Check that the register_error_handlers method exists
        assert hasattr(SecurityAwareErrorHandler, 'register_error_handlers'), \
            "SecurityAwareErrorHandler should have register_error_handlers method"
        
        # Verify it's callable
        assert callable(SecurityAwareErrorHandler.register_error_handlers), \
            "register_error_handlers should be callable"
        
        print("✓ Error handler registration method exists and is callable")
        print("✓ Error handler registration tests passed")
        return True
        
    except Exception as e:
        print(f"✗ Error handler registration test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("=" * 70)
    print("Testing Logging Refinement and Domain Exception Improvements")
    print("=" * 70)
    
    tests = [
        test_domain_exception_handling,
        test_correlation_id_handling,
        test_logging_filter,
        test_error_handler_registration
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"✗ Test {test.__name__} failed with exception: {e}")
            results.append(False)
    
    print("\n" + "=" * 70)
    print("Test Results Summary:")
    print("=" * 70)
    
    passed = sum(results)
    total = len(results)
    
    for i, (test, result) in enumerate(zip(tests, results)):
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{i+1}. {test.__name__}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("✓ All tests passed! Implementation is working correctly.")
        return True
    else:
        print(f"✗ {total - passed} tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)