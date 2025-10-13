# SKIP_EXTERNAL_SERVICES Implementation Summary

## Objective
Update service initialization so that setting the `SKIP_EXTERNAL_SERVICES` environment variable to "true" prevents MQTT and OPC-UA services from starting.

## Changes Implemented

### 1. backend/app/utils/service_manager.py
Added a new function to check the environment variable:

```python
def should_skip_external_services() -> bool:
    """Check if external services should be skipped based on environment variable.
    
    Returns:
        True if SKIP_EXTERNAL_SERVICES environment variable is set to "true", False otherwise
    """
    skip_env = os.getenv('SKIP_EXTERNAL_SERVICES', 'false').lower()
    return skip_env == 'true'
```

**Key Features:**
- Reads `SKIP_EXTERNAL_SERVICES` environment variable
- Defaults to `'false'` if not set
- Case-insensitive (accepts `'true'`, `'TRUE'`, `'True'`)
- Only returns `True` for the exact string `'true'`

### 2. backend/app/__init__.py
Updated the `create_app()` function to check the skip flag before initializing external services:

```python
# Check if external services should be skipped
from app.utils.service_manager import should_skip_external_services
skip_external = should_skip_external_services()

if skip_external:
    logger.info("SKIP_EXTERNAL_SERVICES is set to 'true' - external services (MQTT, OPC-UA) will not be initialized")

# MQTT client - Skip if flag is set
if skip_external:
    logger.info("Skipping MQTT client initialization (external services disabled)")
else:
    mqtt_required = app.config.get("SERVICE_MQTT_REQUIRED", True)
    _initialize_critical_service(mqtt_client, ...)

# OPC-UA client - Skip if flag is set
if skip_external:
    logger.info("Skipping OPC-UA client initialization (external services disabled)")
    app.opcua_client = None
    app.secure_opcua_client = None
else:
    opcua_required = app.config.get("SERVICE_OPCUA_REQUIRED", False)
    _initialize_critical_service(secure_opcua_client, ...)

# Store references - Set to None if skipped
app.mqtt_client = None if skip_external else mqtt_client
```

**Changes Made:**
- Added check for `skip_external` flag at the beginning of service initialization
- Log informational message when services are being skipped
- Conditionally initialize MQTT client based on skip flag
- Conditionally initialize OPC-UA client based on skip flag
- Set service references to `None` when skipped
- Added comments explaining the skip logic

### 3. backend/app/tests/test_skip_external_services.py
Created comprehensive tests for the new functionality:

```python
class TestSkipExternalServices:
    def test_should_skip_external_services_true(self):
        """Test that should_skip_external_services returns True when env var is 'true'."""
        with patch.dict(os.environ, {'SKIP_EXTERNAL_SERVICES': 'true'}):
            assert should_skip_external_services() is True

    def test_should_skip_external_services_false(self):
        """Test that should_skip_external_services returns False when env var is 'false'."""
        with patch.dict(os.environ, {'SKIP_EXTERNAL_SERVICES': 'false'}):
            assert should_skip_external_services() is False

    def test_should_skip_external_services_not_set(self):
        """Test that should_skip_external_services returns False when env var is not set."""
        # ...

    def test_should_skip_external_services_case_insensitive(self):
        """Test that should_skip_external_services is case insensitive."""
        # ...

    def test_should_skip_external_services_other_values(self):
        """Test that should_skip_external_services returns False for other values."""
        # ...
```

**Test Coverage:**
- ✅ Returns `True` when set to `'true'`
- ✅ Returns `False` when set to `'false'`
- ✅ Returns `False` when not set
- ✅ Case-insensitive handling
- ✅ Rejects non-`'true'` values (e.g., `'1'`, `'yes'`)

### 4. SKIP_EXTERNAL_SERVICES_GUIDE.md
Comprehensive documentation covering:
- Usage instructions
- Docker Compose configuration
- Behavior description
- Technical implementation details
- Testing procedures
- Troubleshooting tips

## Log Messages

When `SKIP_EXTERNAL_SERVICES=true`, you will see these log messages:

```
INFO: SKIP_EXTERNAL_SERVICES is set to 'true' - external services (MQTT, OPC-UA) will not be initialized
INFO: Skipping MQTT client initialization (external services disabled)
INFO: Skipping OPC-UA client initialization (external services disabled)
```

## Usage Example

### Set Environment Variable
```bash
export SKIP_EXTERNAL_SERVICES=true
```

### Docker Compose
```yaml
services:
  backend:
    environment:
      - SKIP_EXTERNAL_SERVICES=true
```

### .env File
```bash
SKIP_EXTERNAL_SERVICES=true
```

## Benefits

✅ **Faster Startup**: No time wasted attempting to connect to unavailable services  
✅ **No Connection Errors**: Clean logs without MQTT/OPC-UA connection errors  
✅ **Login Spinner**: Completes quickly without waiting for external services  
✅ **Development Friendly**: Easy to develop without full infrastructure  
✅ **Testing**: Simplifies testing scenarios that don't need external services  

## Verification

### Check Functionality
```python
# Test the function directly
from app.utils.service_manager import should_skip_external_services
result = should_skip_external_services()  # Returns True if SKIP_EXTERNAL_SERVICES=true
```

### Check Logs
When the application starts with `SKIP_EXTERNAL_SERVICES=true`, look for:
- Skip confirmation message
- MQTT skip message
- OPC-UA skip message
- No connection error messages for MQTT or OPC-UA

### Check Service References
```python
# After app creation
assert app.mqtt_client is None  # When skipped
assert app.opcua_client is None  # When skipped
```

## Important Notes

1. **Only affects MQTT and OPC-UA**: Other services (data storage, websocket, etc.) still initialize normally
2. **Case-insensitive**: `'true'`, `'TRUE'`, and `'True'` all work
3. **Exact match required**: Only `'true'` enables skipping; values like `'1'` or `'yes'` don't work
4. **Default is false**: If not set, services initialize normally
5. **Production use**: Typically used for development/testing; production usually has external services available

## Files Modified

- ✅ `backend/app/utils/service_manager.py` - Added `should_skip_external_services()` function
- ✅ `backend/app/__init__.py` - Added skip logic for MQTT and OPC-UA initialization
- ✅ `backend/app/tests/test_skip_external_services.py` - Added comprehensive tests
- ✅ `SKIP_EXTERNAL_SERVICES_GUIDE.md` - Added documentation

## Related Configuration

This feature complements existing service configuration:

```bash
# Existing: Service-specific required flags
SERVICE_MQTT_REQUIRED=false      # Service tries to init, failure is tolerated
SERVICE_OPCUA_REQUIRED=false     # Service tries to init, failure is tolerated

# New: Skip external services completely
SKIP_EXTERNAL_SERVICES=true      # Service initialization is completely skipped
```

**Key Difference:**
- `SERVICE_*_REQUIRED=false`: Service **attempts** initialization, tolerates failure
- `SKIP_EXTERNAL_SERVICES=true`: Service initialization is **completely bypassed** (faster, no connection attempts)
