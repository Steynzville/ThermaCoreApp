# MQTT Environment Variables - Production Requirements

## Summary

This document identifies the exact MQTT environment variable names required by the ThermaCoreApp application for production deployments.

## Problem Context

When running the application in production mode, the following error is raised:
```
ValueError: MQTT certificate paths must be set in environment variables for production
```

This error originates from `backend/config.py` at line 194 in the `ProductionConfig.__init__()` method.

## Required MQTT Environment Variables for Production

The following three environment variables **must** be set for production deployments:

### 1. `MQTT_CA_CERTS`
- **Description**: Path to the CA (Certificate Authority) certificate file
- **Type**: String (file path)
- **Example**: `/etc/ssl/certs/mqtt-ca.crt`
- **Purpose**: Used to verify the MQTT broker's certificate

### 2. `MQTT_CERT_FILE`
- **Description**: Path to the client certificate file
- **Type**: String (file path)
- **Example**: `/etc/ssl/certs/mqtt-client.crt`
- **Purpose**: Client certificate for mutual TLS authentication

### 3. `MQTT_KEY_FILE`
- **Description**: Path to the client private key file
- **Type**: String (file path)
- **Example**: `/etc/ssl/private/mqtt-client.key`
- **Purpose**: Private key corresponding to the client certificate

## Code References

### Production Validation Check
**File**: `backend/config.py` (lines 191-194)
```python
# Enforce MQTT TLS in production if certificates are provided
if os.environ.get("MQTT_CA_CERTS") and os.environ.get("MQTT_CERT_FILE") and os.environ.get("MQTT_KEY_FILE"):
    self.MQTT_USE_TLS = True
else:
    raise ValueError("MQTT certificate paths must be set in environment variables for production")
```

### Variable Definitions
**File**: `backend/config.py` (lines 77-79)
```python
MQTT_CA_CERTS = os.environ.get('MQTT_CA_CERTS')  # Path to CA certificate file
MQTT_CERT_FILE = os.environ.get('MQTT_CERT_FILE')  # Path to client certificate file
MQTT_KEY_FILE = os.environ.get('MQTT_KEY_FILE')   # Path to client private key file
```

## Additional MQTT Environment Variables

While not required for production startup, these variables configure MQTT behavior:

- `MQTT_BROKER_HOST` - MQTT broker hostname (default: 'localhost')
- `MQTT_BROKER_PORT` - MQTT broker port (default: 1883)
- `MQTT_USERNAME` - MQTT authentication username (optional but recommended for production)
- `MQTT_PASSWORD` - MQTT authentication password (optional but recommended for production)
- `MQTT_CLIENT_ID` - MQTT client identifier (default: 'thermacore_backend')
- `MQTT_KEEPALIVE` - Keep-alive interval in seconds (default: 60)
- `MQTT_USE_TLS` - Enable TLS (automatically set to True when certificates are provided in production)

## Environment Differences

### Development/Testing
- MQTT TLS certificates are **optional**
- Application will run without TLS if certificates are not provided
- Set `MQTT_USE_TLS=false` for non-TLS connections

### Production
- MQTT TLS certificates are **mandatory**
- All three certificate paths must be set
- `MQTT_USE_TLS` is automatically set to `True` when certificates are provided
- Missing any certificate path will prevent application startup

## Security Notes

1. **Certificate Security**: Store certificate files in secure locations with restricted permissions (e.g., 600 for private keys)
2. **Authentication**: While not enforced by config validation, production environments should also set `MQTT_USERNAME` and `MQTT_PASSWORD`
3. **TLS Version**: The application enforces TLSv1.2+ with secure cipher suites in production
4. **Hostname Verification**: Hostname verification is enabled in production for additional security

## Usage Examples

### Setting Environment Variables

**Linux/macOS (bash/zsh)**:
```bash
export MQTT_CA_CERTS=/etc/ssl/certs/mqtt-ca.crt
export MQTT_CERT_FILE=/etc/ssl/certs/mqtt-client.crt
export MQTT_KEY_FILE=/etc/ssl/private/mqtt-client.key
```

**Docker Compose**:
```yaml
environment:
  - MQTT_CA_CERTS=/certs/mqtt-ca.crt
  - MQTT_CERT_FILE=/certs/mqtt-client.crt
  - MQTT_KEY_FILE=/certs/mqtt-client.key
```

**Kubernetes Secret**:
```yaml
env:
  - name: MQTT_CA_CERTS
    value: /etc/mqtt-certs/ca.crt
  - name: MQTT_CERT_FILE
    value: /etc/mqtt-certs/client.crt
  - name: MQTT_KEY_FILE
    value: /etc/mqtt-certs/client.key
```

## Related Files

- `backend/config.py` - Configuration definitions and validation
- `backend/app/services/mqtt_service.py` - MQTT client implementation that uses these certificates
- `backend/app/tests/test_production_config_validation.py` - Tests for production config validation
- `.env.example` - Example environment variable configuration

## Testing

To test production configuration with certificates:
```python
# See backend/app/tests/test_production_config_validation.py for examples
with patch.dict(os.environ, {
    'SECRET_KEY': 'test-secret-key',
    'JWT_SECRET_KEY': 'test-jwt-secret',
    'DATABASE_URL': 'postgresql://test:test@localhost/test',
    'MQTT_CA_CERTS': '/path/to/ca',
    'MQTT_CERT_FILE': '/path/to/cert',
    'MQTT_KEY_FILE': '/path/to/key',
    # ... other required variables
}):
    config = ProductionConfig()
    assert config.MQTT_USE_TLS is True
```
