#!/usr/bin/env python3
"""
Validation script for render.yaml deployment configuration.

This script validates that the render.yaml file in the repository root
is properly configured for deploying the Flask backend on Render.

Can be run as:
  python validate_render_config.py
  python -m pytest validate_render_config.py -v
"""

import sys
from pathlib import Path
import yaml


def get_render_yaml_path():
    """Get the path to render.yaml in the repository root."""
    repo_root = Path(__file__).parent
    render_yaml = repo_root / "render.yaml"
    
    if not render_yaml.exists():
        raise FileNotFoundError(f"render.yaml not found at {render_yaml}")
    
    return render_yaml


def validate_render_yaml():
    """Validate render.yaml against deployment requirements."""
    
    print("Validating render.yaml deployment configuration")
    print("=" * 70)
    
    # Load YAML file
    render_yaml_path = get_render_yaml_path()
    try:
        with open(render_yaml_path, 'r') as f:
            config = yaml.safe_load(f)
    except yaml.YAMLError as e:
        print(f"❌ FAIL: Invalid YAML syntax: {e}")
        return False
    
    all_checks_passed = True
    
    # Check 1: Services section exists
    if 'services' not in config:
        print("❌ FAIL: 'services' section not found")
        all_checks_passed = False
        return all_checks_passed
    
    print("✅ PASS: 'services' section exists")
    services = config['services']
    
    # Ensure at least one service exists before accessing
    if not services or len(services) == 0:
        print("❌ FAIL: No services defined")
        all_checks_passed = False
        return all_checks_passed
    
    # Safe to access first service after bounds check above
    service = services[0]
    
    # Check 2-7: Service configuration
    checks = [
        ('type', 'web', "Service type"),
        ('name', 'thermacore-backend', "Service name"),
        ('env', 'python', "Environment"),
        ('rootDir', 'backend', "Root directory"),
        ('buildCommand', 'pip install -r requirements.txt', "Build command"),
        ('startCommand', 'gunicorn run:app --bind 0.0.0.0:$PORT', "Start command"),
    ]
    
    for key, expected, description in checks:
        actual = service.get(key)
        if actual == expected:
            print(f"✅ PASS: {description} is '{expected}'")
        else:
            print(f"❌ FAIL: {description} is '{actual}', expected '{expected}'")
            all_checks_passed = False
    
    # Check 8: Environment variables
    env_vars = service.get('envVars', [])
    if not env_vars:
        print("❌ FAIL: No environment variables defined")
        all_checks_passed = False
    else:
        print(f"✅ PASS: Environment variables section exists ({len(env_vars)} vars)")
        
        # Create a dict for easier checking
        env_dict = {var['key']: var for var in env_vars}
        
        # Check DATABASE_URL
        if 'DATABASE_URL' in env_dict:
            db_var = env_dict['DATABASE_URL']
            if 'fromDatabase' in db_var:
                from_db = db_var['fromDatabase']
                if from_db.get('name') == 'thermacore-db' and from_db.get('property') == 'connectionString':
                    print("✅ PASS: DATABASE_URL configured correctly from database")
                else:
                    print(f"❌ FAIL: DATABASE_URL fromDatabase config incorrect")
                    all_checks_passed = False
            else:
                print("❌ FAIL: DATABASE_URL missing 'fromDatabase' configuration")
                all_checks_passed = False
        else:
            print("❌ FAIL: DATABASE_URL environment variable not found")
            all_checks_passed = False
        
        # Check SECRET_KEY
        if 'SECRET_KEY' in env_dict:
            secret_var = env_dict['SECRET_KEY']
            if secret_var.get('generateValue') is True:
                print("✅ PASS: SECRET_KEY configured with generateValue: true")
            else:
                print("❌ FAIL: SECRET_KEY generateValue is misconfigured, expected 'generateValue: true'")
                all_checks_passed = False
        else:
            print("❌ FAIL: SECRET_KEY environment variable not found")
            all_checks_passed = False
        
        # Check DEBUG
        if 'DEBUG' in env_dict:
            debug_var = env_dict['DEBUG']
            if debug_var.get('value') == "False":
                print("✅ PASS: DEBUG configured with value: 'False'")
            else:
                print(f"❌ FAIL: DEBUG value is '{debug_var.get('value')}', expected 'False'")
                all_checks_passed = False
        else:
            print("❌ FAIL: DEBUG environment variable not found")
            all_checks_passed = False
    
    # Check 9: Database section
    if 'databases' not in config:
        print("❌ FAIL: 'databases' section not found")
        all_checks_passed = False
    else:
        print("✅ PASS: 'databases' section exists")
        databases = config['databases']
        # Ensure at least one database exists before accessing
        if not databases or len(databases) == 0:
            print("❌ FAIL: No databases defined")
            all_checks_passed = False
            return all_checks_passed
        else:
            # Safe to access first database after bounds check above
            db = databases[0]
            db_checks = [
                ('name', 'thermacore-db', "Database name"),
                ('databaseName', 'thermacore', "Database databaseName"),
                ('user', 'thermacore_user', "Database user"),
            ]
            
            for key, expected, description in db_checks:
                actual = db.get(key)
                if actual == expected:
                    print(f"✅ PASS: {description} is '{expected}'")
                else:
                    print(f"❌ FAIL: {description} is '{actual}', expected '{expected}'")
                    all_checks_passed = False
    
    # Check 10: Gunicorn in requirements.txt
    requirements_path = Path(__file__).parent / "backend" / "requirements.txt"
    if requirements_path.exists():
        with open(requirements_path, 'r') as f:
            content = f.read()
        
        if 'gunicorn' in content.lower():
            print("✅ PASS: gunicorn found in requirements.txt")
        else:
            print("❌ FAIL: gunicorn not found in requirements.txt")
            all_checks_passed = False
    else:
        print("⚠️  WARNING: requirements.txt not found, skipping gunicorn check")
    
    print("=" * 70)
    if all_checks_passed:
        print("✅ ALL CHECKS PASSED - render.yaml is correctly configured")
        return True
    else:
        print("❌ SOME CHECKS FAILED - render.yaml needs corrections")
        return False


# For pytest compatibility
def test_render_yaml_configuration():
    """Test that render.yaml is properly configured."""
    assert validate_render_yaml(), "render.yaml validation failed"


if __name__ == "__main__":
    success = validate_render_yaml()
    sys.exit(0 if success else 1)
