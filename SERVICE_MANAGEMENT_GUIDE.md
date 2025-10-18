# Service Management Framework Guide

## Overview

The Service Management Framework provides a robust solution for service initialization and monitoring in the ThermaCore SCADA backend. It prevents optional services like OPC-UA from crashing the entire application in production due to security or connectivity issues.

## Key Features

### 1. Service Classification
Services are classified into two types:
- **REQUIRED**: Core services that must be available (e.g., Database, Auth API)
- **OPTIONAL**: External services that can fail gracefully (e.g., OPC-UA, MQTT)

### 2. Configuration-Driven Initialization
Services can be controlled via environment variables:
- `SERVICE_{NAME}_ENABLED`: Enable/disable the service
- `SERVICE_{NAME}_REQUIRED`: Mark service as required or optional

### 3. Graceful Degradation
Optional services that fail to initialize:
- Log warnings instead of crashing
- Continue application startup
- Report status via health endpoints

### 4. Service Health Monitoring
- `/health` - Overall application health with service details
- `/api/v1/services/status` - Detailed service status and classification

## Configuration

### Environment Variables

#### OPC-UA Service
```bash
# Enable/disable OPC-UA service
SERVICE_OPCUA_ENABLED=true

# Make OPC-UA required (fails app if initialization fails)
# Default: true in development, false in production
SERVICE_OPCUA_REQUIRED=false
```

#### MQTT Service
```bash
# Enable/disable MQTT service
SERVICE_MQTT_ENABLED=true

# Make MQTT required
# Default: true (MQTT is typically critical for SCADA operations)
SERVICE_MQTT_REQUIRED=true
```

### Production vs Development Defaults

**Development (DevelopmentConfig):**
- All services enabled by default
- All services required by default (to catch configuration issues early)

**Production (ProductionConfig):**
- OPC-UA: Enabled but **OPTIONAL** (prevents crashes from security/cert issues)
- MQTT: Enabled and **REQUIRED** (critical for SCADA data flow)

## Usage Examples

### Making OPC-UA Optional in Production

In your `.env` file for production:
```bash
# OPC-UA is enabled but won't crash the app if it fails
SERVICE_OPCUA_ENABLED=true
SERVICE_OPCUA_REQUIRED=false
```

### Disabling OPC-UA Completely

```bash
# Completely disable OPC-UA (won't attempt initialization)
SERVICE_OPCUA_ENABLED=false
```

### Checking Service Status

#### Via API
```bash
# Check all services
curl http://localhost:5000/api/v1/services/status

# Response:
{
  "overall_health": "degraded",
  "services": {
    "opcua": {
      "status": "error",
      "type": "optional",
      "enabled": true,
      "available": false,
      "error": "Connection timeout"
    },
    "mqtt": {
      "status": "healthy",
      "type": "required",
      "enabled": true,
      "available": true,
      "error": null
    }
  }
}
```

#### Health Status Values
- `healthy` - All enabled services are working
- `degraded` - Some optional services failed
- `critical` - One or more required services failed

## Implementation Details

### ServiceManager Class

Located in `backend/app/utils/service_manager.py`

Key methods:
- `register_service(name, type, enabled)` - Register a service
- `set_service_instance(name, instance)` - Mark service as initialized
- `set_service_error(name, error)` - Record initialization failure
- `get_service_status(name)` - Get status of specific service
- `get_overall_health()` - Get system-wide health status

### Integration with Flask App

The `_initialize_critical_service()` function in `backend/app/__init__.py` now accepts a `required` parameter:

```python
# Initialize as optional service
_initialize_critical_service(
    opcua_client, "OPC UA client", app, logger,
    'init_app', required=False, data_storage_service=data_storage_service
)

# Initialize as required service
_initialize_critical_service(
    mqtt_client, "MQTT client", app, logger,
    'init_app', required=True, data_storage_service=data_storage_service
)
```

## Migration Guide

### For Existing Deployments

1. **No immediate action required** - The framework is backwards compatible
2. **Recommended for production**: Add to your production `.env`:
   ```bash
   SERVICE_OPCUA_REQUIRED=false
   ```
3. **Monitor services**: Use `/api/v1/services/status` to track service health

### For New Services

When adding new services:

1. **Register the service** in `service_manager` before initialization
2. **Add configuration** in `config.py`:
   ```python
   SERVICE_MYSERVICE_ENABLED = os.environ.get('SERVICE_MYSERVICE_ENABLED', 'true').lower() == 'true'
   SERVICE_MYSERVICE_REQUIRED = os.environ.get('SERVICE_MYSERVICE_REQUIRED', 'true').lower() == 'true'
   ```
3. **Initialize with framework**:
   ```python
   _initialize_critical_service(
       my_service, "My Service", app, logger,
       'init_app', required=app.config.get('SERVICE_MYSERVICE_REQUIRED', True)
   )
   ```

## Benefits

### Before Service Management Framework
```
❌ OPC-UA security error → Entire backend crashes
❌ No visibility into which services are down
❌ Hard to debug production issues
❌ Can't run backend without all external services
```

### After Service Management Framework
```
✅ OPC-UA security error → Backend continues, service marked as unavailable
✅ Clear visibility of service status via API
✅ Easy debugging with service health endpoints
✅ Backend can run with partial service availability
✅ Frontend can adapt to available capabilities
```

## Troubleshooting

### Service Shows as "error" in Status

1. Check logs for initialization error details
2. Verify configuration (URLs, credentials, certificates)
3. If optional, app continues - fix configuration and restart
4. If required in production, app won't start - fix before deployment

### Service Shows as "not_initialized"

- Service is registered but initialization was skipped
- Usually means `SERVICE_{NAME}_ENABLED=false`
- Or service registration failed

### Service Shows as "unavailable"

- Service initialized but instance is None
- Check for exceptions during initialization
- Review application logs for error details

## Security Considerations

### Why OPC-UA is Optional in Production

OPC-UA often requires:
- Client certificates
- Server certificate trust
- Specific security policies
- Network connectivity to industrial systems

Making it optional prevents:
- Backend crashes from certificate expiry
- Deployment failures from network configuration
- Production outages from external dependencies

### MQTT Remains Required

MQTT is typically:
- Central to SCADA data collection
- Under your infrastructure control
- Critical for real-time monitoring

Therefore, MQTT failures should prevent startup to ensure proper configuration.

## Related Documentation

- [OPCUA_SECURITY_IMPLEMENTATION.md](./OPCUA_SECURITY_IMPLEMENTATION.md) - OPC-UA security details
- [HEALTH_CHECK_FIX_SUMMARY.md](./HEALTH_CHECK_FIX_SUMMARY.md) - Health check endpoint
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Production deployment guide
