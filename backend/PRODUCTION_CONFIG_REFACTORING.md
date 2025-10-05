# ProductionConfig Validation Refactoring

## Overview
This refactoring moves environment variable validation for `ProductionConfig` from import time (class definition) to instantiation time (`__init__` method).

## Problem Statement
Previously, `ProductionConfig` performed validation at the class level during module import:

```python
class ProductionConfig(Config):
    # These lines executed when config.py was imported
    if not os.environ.get("MQTT_CA_CERTS"):
        raise ValueError("MQTT certificate paths must be set...")
```

**Issues with this approach:**
1. **Import-time errors**: Simply importing `config.py` would fail if production environment variables weren't set
2. **Testing difficulties**: Tests couldn't import the config module without mocking all production env vars
3. **Development friction**: Developers working on non-production features had to set production env vars
4. **Violated lazy evaluation**: Validation occurred even when ProductionConfig wasn't being used

## Solution
Moved all validation logic into the `__init__` method:

```python
class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    
    def __init__(self):
        """Initialize production configuration with environment variable validation."""
        # Validation now happens here, only when instantiated
        if not os.environ.get("MQTT_CA_CERTS"):
            raise ValueError("MQTT certificate paths must be set...")
```

## Changes Made

### 1. backend/config.py
- Added `__init__` method to `ProductionConfig`
- Moved all validation logic from class-level to `__init__`
- Converted class attributes to instance attributes in `__init__`
- Preserved all validation logic and error messages

### 2. backend/app/__init__.py
- Updated `create_app()` to instantiate `ProductionConfig` when loading production config
- Special handling: `config_obj = config_obj()` when `config_name == 'production'`
- No changes to development or testing config loading

### 3. Test Updates
Updated tests that directly accessed `ProductionConfig` class attributes:
- `backend/app/tests/test_scada_security.py`
- `backend/app/tests/test_security_improvements.py`

Tests now instantiate `ProductionConfig` with required environment variables using `patch.dict()`.

### 4. New Tests
Created `backend/app/tests/test_production_config_validation.py` with comprehensive tests:
- Import succeeds without env vars
- Instantiation fails without MQTT certs
- Instantiation fails without OPC UA certs  
- Instantiation succeeds with all required certs
- Custom settings are preserved
- Default values are set correctly

## Validation Logic Preserved

All validation remains the same, just executed at a different time:

### MQTT TLS Validation
```python
if os.environ.get("MQTT_CA_CERTS") and os.environ.get("MQTT_CERT_FILE") and os.environ.get("MQTT_KEY_FILE"):
    self.MQTT_USE_TLS = True
else:
    raise ValueError("MQTT certificate paths must be set in environment variables for production")
```

### OPC UA Security Validation
```python
if not os.environ.get("OPCUA_SECURITY_POLICY") or os.environ.get("OPCUA_SECURITY_POLICY") == "None":
    self.OPCUA_SECURITY_POLICY = "Basic256Sha256"
# ... additional validation for certificates
```

### WebSocket CORS Validation
```python
_prod_websocket_origins = os.environ.get('WEBSOCKET_CORS_ORIGINS')
if not _prod_websocket_origins:
    self.WEBSOCKET_CORS_ORIGINS = ['https://yourdomain.com']
else:
    self.WEBSOCKET_CORS_ORIGINS = _prod_websocket_origins.split(',')
```

## Benefits

1. **Import safety**: Config module can be imported in any environment without errors
2. **Better testing**: Tests can import config classes without setting production env vars
3. **Lazy validation**: Validation only occurs when config is actually used
4. **Clearer intent**: `__init__` method makes it explicit when validation occurs
5. **Backward compatible**: Application behavior unchanged - validation still enforced when creating production app

## Migration Guide

### For Application Code
No changes needed. `create_app('production')` works exactly as before.

### For Tests
If tests directly access `ProductionConfig` attributes, update them to:

**Before:**
```python
from config import ProductionConfig
assert ProductionConfig.MQTT_USE_TLS is True  # Fails if env vars not set
```

**After:**
```python
from config import ProductionConfig
from unittest.mock import patch

with patch.dict(os.environ, {
    'MQTT_CA_CERTS': '/path/to/ca',
    'MQTT_CERT_FILE': '/path/to/cert',
    'MQTT_KEY_FILE': '/path/to/key',
    'OPCUA_CERT_FILE': '/path/to/opcua/cert',
    'OPCUA_PRIVATE_KEY_FILE': '/path/to/opcua/key',
    'OPCUA_TRUST_CERT_FILE': '/path/to/opcua/trust'
}):
    prod_config = ProductionConfig()
    assert prod_config.MQTT_USE_TLS is True
```

## Verification

Run the demonstration script to see the refactoring in action:
```bash
cd backend
python3 demo_config_refactoring.py
```

Run the new validation tests:
```bash
cd backend
pytest app/tests/test_production_config_validation.py -v
```

## Security Considerations

This refactoring **does not weaken security**:
- All validation is still performed
- All error messages are preserved
- Production apps still require all certificates
- Validation timing changed, but enforcement remains strict

The refactoring actually **improves security** by:
- Making validation more explicit and testable
- Enabling better test coverage of validation logic
- Reducing workarounds developers might use to bypass import-time errors
