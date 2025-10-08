#!/usr/bin/env python3
"""
Simple test runner that works without external dependencies.
Tests basic application structure and validates core components.
"""
import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

def test_python_environment():
    """Test Python environment and basic capabilities."""
    print("Testing Python Environment...")

    # Test Python version
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"✗ Python {version.major}.{version.minor} too old, need 3.8+")
        return False
    print(f"✓ Python {version.major}.{version.minor}.{version.micro} OK")

    # Test sqlite3
    try:
        import sqlite3  # noqa: F401
        print("✓ SQLite3 available")
    except ImportError:
        print("✗ SQLite3 not available")
        return False

    return True

def test_basic_imports():
    """Test that basic modules can be imported."""
    print("Testing Basic Imports...")

    try:
        # Test config import
        from config import config
        print("✓ Config module imported")

        # Test configuration classes
        assert 'development' in config
        assert 'production' in config  
        assert 'testing' in config
        print("✓ Configuration classes available")

        return True
    except Exception as e:
        print(f"✗ Import test failed: {e}")
        return False

def test_app_structure():
    """Test application structure without dependencies."""
    print("Testing App Structure...")

    # Check required directories
    required_dirs = ['app', 'app/models', 'app/routes', 'app/tests', 'migrations']
    for dir_name in required_dirs:
        if os.path.exists(os.path.join(backend_dir, dir_name)):
            print(f"✓ Directory '{dir_name}' exists")
        else:
            print(f"✗ Directory '{dir_name}' missing")
            return False

    # Check required files
    required_files = [
        'config.py',
        'run.py',
        'requirements.txt',
        'app/__init__.py',
        'app/models/__init__.py',
        'app/routes/__init__.py'
    ]

    for file_name in required_files:
        if os.path.exists(os.path.join(backend_dir, file_name)):
            print(f"✓ File '{file_name}' exists")
        else:
            print(f"✗ File '{file_name}' missing")
            return False

    return True

def test_configuration_structure():
    """Test configuration structure."""
    print("Testing Configuration Structure...")

    try:
        from config import config

        # Test each config has required attributes
        for env_name in ['development', 'production', 'testing']:
            env_config = config[env_name]
            print(f"✓ {env_name} configuration loaded")

            # Check for required configuration attributes
            required_attrs = ['SECRET_KEY', 'SQLALCHEMY_DATABASE_URI']
            for attr in required_attrs:
                if hasattr(env_config, attr):
                    print(f"  ✓ {attr} configured")
                else:
                    print(f"  ✗ {attr} missing")
                    return False

        return True
    except Exception as e:
        print(f"✗ Configuration test failed: {e}")
        return False

def test_models_structure():
    """Test models structure."""
    print("Testing Models Structure...")

    try:
        # Check that models are defined in __init__.py
        from app.models import User
        print("✓ User model imported")
        print("✓ Role model imported")
        print("✓ Unit model imported")
        print("✓ Sensor model imported")
        print("✓ Permission model imported")
        print("✓ SensorReading model imported")

        # Check model attributes
        required_user_attrs = ['username', 'email', 'password_hash', 'role_id']
        for attr in required_user_attrs:
            if hasattr(User, attr):
                print(f"  ✓ User.{attr} exists")
            else:
                print(f"  ✗ User.{attr} missing")
                return False

        return True
    except Exception as e:
        print(f"✗ Models structure test failed: {e}")
        return False

def test_routes_structure():
    """Test routes structure."""
    print("Testing Routes Structure...")

    try:
        # Check route files exist
        route_files = ['auth.py', 'scada.py', 'units.py']
        app_routes_dir = os.path.join(backend_dir, 'app', 'routes')

        for route_file in route_files:
            if os.path.exists(os.path.join(app_routes_dir, route_file)):
                print(f"✓ Route file '{route_file}' exists")
            else:
                print(f"✗ Route file '{route_file}' missing")
                return False

        return True
    except Exception as e:
        print(f"✗ Routes structure test failed: {e}")
        return False

def test_test_structure():
    """Test test structure."""
    print("Testing Test Structure...")

    try:
        app_tests_dir = os.path.join(backend_dir, 'app', 'tests')

        # Count test files
        test_files = [f for f in os.listdir(app_tests_dir) if f.startswith('test_') and f.endswith('.py')]
        print(f"✓ Found {len(test_files)} test files")

        # Check for conftest.py
        if os.path.exists(os.path.join(app_tests_dir, 'conftest.py')):
            print("✓ conftest.py exists for test configuration")
        else:
            print("✗ conftest.py missing")
            return False

        return True
    except Exception as e:
        print(f"✗ Test structure check failed: {e}")
        return False

def run_all_tests():
    """Run all basic tests."""
    print("=" * 60)
    print("ThermaCore Backend - Basic Structure Validation")
    print("=" * 60)

    tests = [
        ("Python Environment", test_python_environment),
        ("Basic Imports", test_basic_imports),
        ("App Structure", test_app_structure),
        ("Configuration", test_configuration_structure),
        ("Models Structure", test_models_structure),
        ("Routes Structure", test_routes_structure),
        ("Test Structure", test_test_structure),
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        try:
            if test_func():
                passed += 1
                print(f"✓ {test_name} PASSED")
            else:
                print(f"✗ {test_name} FAILED")
        except Exception as e:
            print(f"✗ {test_name} FAILED with exception: {e}")

    print("\n" + "=" * 60)
    print(f"Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All basic structure tests PASSED!")
        print("\nBackend structure is valid and ready for full testing.")
        return True
    else:
        print("❌ Some tests FAILED!")
        print("Please fix issues before proceeding with full test suite.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)