# SKIP_EXTERNAL_SERVICES Environment Variable Guide

## Overview

The `SKIP_EXTERNAL_SERVICES` environment variable allows you to skip the initialization of external services (MQTT and OPC-UA) during application startup. This is useful for:

- Development environments without external service infrastructure
- Testing scenarios where external services are not needed
- Faster application startup when external services are not available
- Avoiding connection timeout errors during login

## Usage

### Setting the Environment Variable

**To skip external services:**
```bash
export SKIP_EXTERNAL_SERVICES=true
```

**To enable external services (default):**
```bash
export SKIP_EXTERNAL_SERVICES=false
# OR simply don't set the variable
```

### Docker Compose

Add to your `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - SKIP_EXTERNAL_SERVICES=true
```

### .env File

Add to your `.env` file:

```bash
SKIP_EXTERNAL_SERVICES=true
```

## Behavior

### When SKIP_EXTERNAL_SERVICES=true

1. **Log Messages:**
   - "SKIP_EXTERNAL_SERVICES is set to 'true' - external services (MQTT, OPC-UA) will not be initialized"
   - "Skipping MQTT client initialization (external services disabled)"
   - "Skipping OPC-UA client initialization (external services disabled)"

2. **Service State:**
   - `app.mqtt_client = None`
   - `app.opcua_client = None`
   - `app.secure_opcua_client = None`

3. **Benefits:**
   - Faster application startup
   - No connection errors for MQTT or OPC-UA
   - Login spinner completes quickly
   - Application remains functional for features that don't require external services

### When SKIP_EXTERNAL_SERVICES=false or not set (default)

- All services initialize normally
- MQTT and OPC-UA clients attempt to connect
- Standard behavior as before

## Technical Implementation

### Location of Changes

1. **backend/app/utils/service_manager.py**
   - New function: `should_skip_external_services()`
   - Checks `os.getenv('SKIP_EXTERNAL_SERVICES', 'false').lower() == 'true'`

2. **backend/app/__init__.py**
   - Checks skip flag before initializing MQTT client
   - Checks skip flag before initializing OPC-UA client
   - Logs appropriate messages
   - Sets service references to `None` when skipped

### Code Example

```python
from app.utils.service_manager import should_skip_external_services

# Check if external services should be skipped
skip_external = should_skip_external_services()

if skip_external:
    logger.info("Skipping MQTT client initialization (external services disabled)")
    app.mqtt_client = None
else:
    # Initialize MQTT client normally
    _initialize_critical_service(mqtt_client, ...)
```

## Testing

### Unit Tests

Run the test suite:
```bash
cd backend
pytest app/tests/test_skip_external_services.py -v
```

### Manual Testing

1. Set the environment variable:
   ```bash
   export SKIP_EXTERNAL_SERVICES=true
   ```

2. Start the application:
   ```bash
   cd backend
   python run.py
   ```

3. Check the logs for skip messages

4. Verify:
   - Application starts successfully
   - No MQTT connection errors
   - No OPC-UA connection errors
   - Login spinner completes quickly

## Important Notes

- The variable is **case-insensitive** (`true`, `TRUE`, `True` all work)
- Only the value `"true"` enables skipping; all other values (including `"1"`, `"yes"`, etc.) are treated as false
- This only affects **MQTT** and **OPC-UA** services; other services like data storage still initialize normally
- The feature is designed for **development and testing**; in production, external services should typically be available

## Related Configuration

This feature complements the existing service configuration system:

```bash
# Service-specific configuration (still works)
SERVICE_MQTT_REQUIRED=false
SERVICE_OPCUA_REQUIRED=false

# Skip all external services at once (new feature)
SKIP_EXTERNAL_SERVICES=true
```

The difference:
- `SERVICE_*_REQUIRED=false`: Service attempts to initialize but failure is tolerated
- `SKIP_EXTERNAL_SERVICES=true`: Service initialization is completely skipped (faster, no connection attempts)

## Troubleshooting

### Services still attempting to connect

- Verify the environment variable is set correctly: `echo $SKIP_EXTERNAL_SERVICES`
- Check logs for the skip message
- Ensure you're using lowercase `"true"`

### Application errors when services are skipped

- Check that your code handles `app.mqtt_client = None` and `app.opcua_client = None` gracefully
- Use conditional checks: `if app.mqtt_client is not None:`

## See Also

- [SERVICE_MANAGEMENT_GUIDE.md](./SERVICE_MANAGEMENT_GUIDE.md) - General service management framework
- [SERVICE_MANAGER_BEFORE_AFTER.md](./SERVICE_MANAGER_BEFORE_AFTER.md) - Service manager improvements
