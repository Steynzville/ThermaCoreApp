# Health Check Endpoint Documentation

## Summary

Your Flask backend **already has a health check endpoint** configured and working!

## Health Check Path

**Endpoint:** `/health`  
**Method:** `GET`  
**Authentication:** None required  
**Location in code:** `backend/app/__init__.py` (lines 384-410)

## Testing the Health Check

### 1. When Running Locally

If your backend is running on `http://localhost:5000`, you can test it with:

```bash
# Using curl
curl http://localhost:5000/health

# Using a web browser
# Simply visit: http://localhost:5000/health
```

### 2. Expected Response

```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

When SCADA services are initialized, the response also includes status for:
- `mqtt` - MQTT client status
- `websocket` - WebSocket service status
- `realtime_processor` - Real-time processor status
- `opcua` - OPC-UA client status
- `protocol_simulator` - Protocol simulator status
- `data_storage` - Data storage service status
- `anomaly_detection` - Anomaly detection service status
- `modbus` - Modbus service status
- `dnp3` - DNP3 service status

### 3. Code Location

The health check endpoint is defined in `backend/app/__init__.py`:

```python
@app.route('/health')
def health_check():
    """Health check endpoint."""
    status = {'status': 'healthy', 'version': '1.0.0'}
    
    # Add SCADA services status if available
    if hasattr(app, 'mqtt_client'):
        status['mqtt'] = app.mqtt_client.get_status()
    # ... additional service checks ...
    
    return status
```

## Existing Tests

The health check endpoint is already tested in:

1. **`backend/test_basic_structure.py`** - Basic structure verification test
2. **`backend/app/tests/test_scada_integration.py`** - SCADA integration tests

## Documentation References

The health check endpoint is also documented in:

1. **`backend/README.md`** - Backend README (section: "📊 Monitoring & Health")
2. **`docs/API_Documentation.md`** - API Documentation (section: "7. Health Check")

## Important Notes

1. **No need to create a new endpoint** - The `/health` endpoint already exists and is working correctly.

2. **Excluded from audit logging** - The health check endpoint is intentionally excluded from audit logging (see `backend/app/middleware/audit.py`) to avoid cluttering logs with health check requests.

3. **Used in infrastructure tests** - The health check is used in Docker infrastructure testing (see `test-docker-infrastructure.sh`).

## Quick Verification

To quickly verify the health check endpoint is working, run:

```bash
cd backend
python test_basic_structure.py
```

This will test the health endpoint along with other basic application structure checks.

## API Endpoints Summary

Your system endpoints:
- **Authentication:** `/api/v1/auth/*`
- **Units:** `/api/v1/units/*`
- **Sensors:** `/api/v1/units/{id}/sensors`
- **User Management:** `/api/v1/users/*`
- **System Health:** `/health` ← This is your health check endpoint!

## Conclusion

✅ **Your health check endpoint is already implemented and working!**

The path is: **`/health`**

No additional work is needed. The endpoint is:
- Properly configured in the Flask application
- Tested in the test suite
- Documented in the README and API docs
- Excluded from audit logging for efficiency
- Used in infrastructure health checks
