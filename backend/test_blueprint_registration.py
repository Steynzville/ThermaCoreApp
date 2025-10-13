#!/usr/bin/env python3
"""Test blueprint registration with detailed logging."""

import sys
import os
import logging
from io import StringIO

# Add backend to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)


def test_blueprint_registration_logging():
    """Test that blueprint registration produces detailed logs."""
    print("\n=== Testing Blueprint Registration Logging ===\n")
    
    # Set up environment for testing
    os.environ['SKIP_EXTERNAL_SERVICES'] = 'true'
    os.environ['TESTING'] = 'true'
    
    # Capture logs
    log_capture = StringIO()
    handler = logging.StreamHandler(log_capture)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(levelname)s - %(name)s - %(message)s')
    handler.setFormatter(formatter)
    
    # Add handler to root logger
    logger = logging.getLogger('app')
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    
    try:
        from app import create_app
        app = create_app()
        
        # Get the captured logs
        log_output = log_capture.getvalue()
        
        # Check for expected log messages
        expected_logs = [
            "Starting blueprint registration",
            "Registered auth routes",
            "Registered units routes",
            "Registered users routes",
            "Registered scada routes",
            "Registered analytics routes",
            "Registered historical routes",
            "Registered multiprotocol routes",
            "Registered remote_control routes",
            "Registered services routes",
            "Initialized OPC-UA monitoring endpoints",
            "Blueprint registration complete",
            "Total routes registered",
        ]
        
        all_found = True
        for expected in expected_logs:
            if expected in log_output:
                print(f"✓ Found log: '{expected}'")
            else:
                print(f"✗ Missing log: '{expected}'")
                all_found = False
        
        # Check that registration completed successfully
        if "10 registered, 0 failed" in log_output:
            print("\n✓ All 10 blueprints registered successfully")
        else:
            print("\n✗ Blueprint registration count not found")
            all_found = False
        
        # Verify blueprints are actually registered
        registered_blueprints = list(app.blueprints.keys())
        expected_blueprints = [
            'auth', 'units', 'users', 'scada', 'analytics',
            'historical', 'multiprotocol', 'remote_control',
            'services', 'opcua_monitoring'
        ]
        
        print(f"\n✓ Registered blueprints: {len(registered_blueprints)}")
        for bp in expected_blueprints:
            if bp in registered_blueprints:
                print(f"  ✓ {bp}")
            else:
                print(f"  ✗ {bp} missing!")
                all_found = False
        
        # Check route count
        route_count = len(list(app.url_map.iter_rules()))
        print(f"\n✓ Total routes registered: {route_count}")
        
        if route_count < 80:  # Should have at least 80 routes
            print(f"✗ Warning: Expected at least 80 routes, got {route_count}")
            all_found = False
        
        return all_found
        
    except Exception as e:
        print(f"\n✗ Error during test: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        logger.removeHandler(handler)
        # Clean up environment
        if 'SKIP_EXTERNAL_SERVICES' in os.environ:
            del os.environ['SKIP_EXTERNAL_SERVICES']
        if 'TESTING' in os.environ:
            del os.environ['TESTING']


def test_blueprint_failure_handling():
    """Test that blueprint registration handles failures gracefully."""
    print("\n=== Testing Blueprint Failure Handling ===\n")
    
    # Set up environment for testing
    os.environ['SKIP_EXTERNAL_SERVICES'] = 'true'
    os.environ['TESTING'] = 'true'
    
    # Temporarily rename analytics route to simulate import error
    analytics_path = os.path.join(backend_dir, 'app', 'routes', 'analytics.py')
    analytics_backup = analytics_path + '.test_backup'
    
    try:
        # Move the file to simulate missing module
        if os.path.exists(analytics_path):
            os.rename(analytics_path, analytics_backup)
            print("✓ Simulated missing analytics module")
        
        # Clear any cached modules to force reimport
        if 'app.routes.analytics' in sys.modules:
            del sys.modules['app.routes.analytics']
        if 'app' in sys.modules:
            del sys.modules['app']
        
        # Capture logs from root logger to catch all app logs
        log_capture = StringIO()
        handler = logging.StreamHandler(log_capture)
        handler.setLevel(logging.INFO)  # Capture INFO and ERROR
        formatter = logging.Formatter('%(levelname)s - %(name)s - %(message)s')
        handler.setFormatter(formatter)
        
        # Add to root logger to capture all logs
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)
        original_level = root_logger.level
        root_logger.setLevel(logging.INFO)  # Capture INFO and ERROR
        
        try:
            # Import fresh
            import importlib
            app_module = importlib.import_module('app')
            app = app_module.create_app()
            
            log_output = log_capture.getvalue()
            
            # Check that error was logged
            if "Failed to import analytics routes" in log_output:
                print("✓ Import error was logged")
            else:
                print("✗ Import error was not logged")
                return False
            
            # Check that other blueprints still registered
            registered_blueprints = list(app.blueprints.keys())
            if 'auth' in registered_blueprints and 'analytics' not in registered_blueprints:
                print("✓ Other blueprints registered despite analytics failure")
            else:
                print("✗ Blueprint registration failed completely")
                return False
            
            # Check that at least 9 blueprints registered
            expected_count = 9  # All except analytics
            actual_count = sum(1 for bp in ['auth', 'units', 'users', 'scada', 'historical',
                                           'multiprotocol', 'remote_control', 'services',
                                           'opcua_monitoring'] if bp in registered_blueprints)
            
            if actual_count >= expected_count:
                print(f"✓ {actual_count}/{expected_count} blueprints registered")
            else:
                print(f"✗ Only {actual_count}/{expected_count} blueprints registered")
                return False
            
            return True
            
        finally:
            root_logger.removeHandler(handler)
            root_logger.setLevel(original_level)
            
    except Exception as e:
        print(f"\n✗ Error during test: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Restore the analytics file
        if os.path.exists(analytics_backup):
            os.rename(analytics_backup, analytics_path)
            print("✓ Restored analytics module")
        
        # Clean up environment
        if 'SKIP_EXTERNAL_SERVICES' in os.environ:
            del os.environ['SKIP_EXTERNAL_SERVICES']
        if 'TESTING' in os.environ:
            del os.environ['TESTING']


if __name__ == '__main__':
    print("=" * 70)
    print("Blueprint Registration Test Suite")
    print("=" * 70)
    
    tests = [
        ("Blueprint Registration Logging", test_blueprint_registration_logging),
        ("Blueprint Failure Handling", test_blueprint_failure_handling),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n{'=' * 70}")
        try:
            if test_func():
                passed += 1
                print(f"\n✅ {test_name} PASSED")
            else:
                failed += 1
                print(f"\n❌ {test_name} FAILED")
        except Exception as e:
            failed += 1
            print(f"\n❌ {test_name} FAILED with exception: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{'=' * 70}")
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 70)
    
    sys.exit(0 if failed == 0 else 1)
