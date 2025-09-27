#!/usr/bin/env python3
"""Simple test for domain exceptions without Flask dependencies."""
import sys

# Add the app directory to the path
sys.path.insert(0, '.')

def test_domain_exceptions_basic():
    """Test domain exceptions without Flask dependencies."""
    print("Testing Domain Exceptions (Basic)...")
    
    try:
        # Test direct import of exceptions module
        from app.exceptions import (
            ThermaCoreException, ValidationException, 
            AuthenticationException, DatabaseException,
            UnitOfflineException, SensorNotFoundException,
            ResourceNotFoundException, InvalidDataException
        )
        
        # Test basic ThermaCoreException
        test_exception = ThermaCoreException(
            "Test error message",
            error_type="validation_error",
            status_code=400,
            context="TestContext",
            details={"test_key": "test_value"}
        )
        
        print(f"✓ Created ThermaCoreException:")
        print(f"  - Message: {str(test_exception)}")
        print(f"  - Error type: {test_exception.error_type}")
        print(f"  - Status code: {test_exception.status_code}")
        print(f"  - Context: {test_exception.context}")
        print(f"  - Details: {test_exception.details}")
        
        # Test inheritance hierarchy
        assert isinstance(test_exception, Exception)
        assert hasattr(test_exception, 'error_type')
        assert hasattr(test_exception, 'status_code')
        assert hasattr(test_exception, 'context')
        assert hasattr(test_exception, 'details')
        
        # Test specific domain exceptions
        auth_exception = AuthenticationException("Invalid token")
        print(f"✓ AuthenticationException: status={auth_exception.status_code}, type={auth_exception.error_type}")
        assert auth_exception.status_code == 401
        assert auth_exception.error_type == 'authentication_error'
        
        unit_exception = UnitOfflineException("unit_123")
        print(f"✓ UnitOfflineException: status={unit_exception.status_code}, type={unit_exception.error_type}")
        assert unit_exception.status_code == 503
        assert unit_exception.error_type == 'service_unavailable'
        assert 'unit_id' in unit_exception.details
        
        sensor_exception = SensorNotFoundException("sensor_456")
        print(f"✓ SensorNotFoundException: status={sensor_exception.status_code}, type={sensor_exception.error_type}")
        assert sensor_exception.status_code == 404
        assert sensor_exception.error_type == 'not_found_error'
        
        db_exception = DatabaseException("Connection failed")
        print(f"✓ DatabaseException: status={db_exception.status_code}, type={db_exception.error_type}")
        assert db_exception.status_code == 500
        assert db_exception.error_type == 'database_error'
        
        # Test validation exception with field details
        validation_exception = InvalidDataException("email", "invalid@", "not a valid email format")
        print(f"✓ InvalidDataException: status={validation_exception.status_code}, type={validation_exception.error_type}")
        assert validation_exception.status_code == 400
        assert validation_exception.error_type == 'validation_error'
        assert 'field' in validation_exception.details
        assert validation_exception.details['field'] == 'email'
        
        print("✓ All domain exception tests passed")
        return True
        
    except Exception as e:
        print(f"✗ Domain exception test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_exception_attributes():
    """Test that all exceptions have the required attributes."""
    print("\nTesting Exception Attributes...")
    
    try:
        from app.exceptions import (
            ThermaCoreException, ValidationException, 
            AuthenticationException, ProtocolException,
            MQTTException, OPCUAException, ModbusException,
            DNP3Exception, TimeoutException
        )
        
        # Test various exception types
        exceptions_to_test = [
            (ValidationException("Test validation", field="test_field"), 400, 'validation_error'),
            (AuthenticationException("Test auth"), 401, 'authentication_error'),
            (ProtocolException("MQTT", "Test protocol error"), 503, 'connection_error'),
            (MQTTException("MQTT connection failed"), 503, 'connection_error'),
            (OPCUAException("OPC UA error"), 503, 'connection_error'),
            (ModbusException("Modbus error"), 503, 'connection_error'),
            (DNP3Exception("DNP3 error"), 503, 'connection_error'),
            (TimeoutException("Test operation", 30.0), 504, 'timeout_error'),
        ]
        
        for exception, expected_status, expected_type in exceptions_to_test:
            print(f"  Testing {exception.__class__.__name__}:")
            print(f"    - Status: {exception.status_code} (expected: {expected_status})")
            print(f"    - Type: {exception.error_type} (expected: {expected_type})")
            print(f"    - Context: {exception.context}")
            print(f"    - Details keys: {list(exception.details.keys())}")
            
            assert exception.status_code == expected_status, f"Status code mismatch for {exception.__class__.__name__}"
            assert exception.error_type == expected_type, f"Error type mismatch for {exception.__class__.__name__}"
            assert isinstance(exception.details, dict), f"Details should be dict for {exception.__class__.__name__}"
        
        print("✓ All exception attribute tests passed")
        return True
        
    except Exception as e:
        print(f"✗ Exception attribute test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run basic tests without Flask."""
    print("=" * 70)
    print("Testing Domain Exceptions (Flask-Independent)")
    print("=" * 70)
    
    tests = [
        test_domain_exceptions_basic,
        test_exception_attributes,
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
        print("✓ All basic tests passed! Domain exceptions are working correctly.")
        return True
    else:
        print(f"✗ {total - passed} tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)