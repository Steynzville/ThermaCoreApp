# Secure Logging Implementation

## Overview

This implementation adds secure logging capabilities to the ThermaCore SCADA API to prevent sensitive data from being exposed in log files. The implementation follows the security best practices outlined in `SECURITY_BEST_PRACTICES.md`.

## Components

### 1. SecureLogger Utility (`app/utils/secure_logger.py`)

The `SecureLogger` class provides automatic sanitization of sensitive data from log messages.

#### Features

- **Pattern-based redaction**: Automatically redacts passwords, tokens, API keys, secrets, and other sensitive data
- **Dictionary sanitization**: Recursively sanitizes dictionary structures
- **Logger adapter**: Provides a drop-in replacement for standard Python loggers
- **Case-insensitive matching**: Detects sensitive keys regardless of case

#### Sensitive Patterns Detected

The following patterns are automatically redacted from log messages:
- `password=<value>` → `password=***`
- `token=<value>` → `token=***`
- `api_key=<value>` or `api-key=<value>` → `api_key=***`
- `secret=<value>` → `secret=***`
- `authorization=<value>` → `authorization=***`
- `jwt=<value>` → `jwt=***`
- `access_token=<value>` → `access_token=***`
- `refresh_token=<value>` → `refresh_token=***`

#### Sensitive Dictionary Keys

The following dictionary keys are automatically redacted:
- password, token, api_key, secret, jwt
- refresh_token, access_token, authorization
- secret_key, private_key, client_secret, api_secret
- auth_token, session_token, csrf_token
- x-api-key, x-auth-token

### 2. Enhanced Error Handler (`app/utils/error_handler.py`)

The error handler has been enhanced to:
- Use `SecureLogger` for automatic sensitive data redaction
- Include error class names in log messages for better debugging
- Provide structured logging context with error class information
- Maintain generic user-facing error messages while logging full details

#### Debug Context Enhancement

Log messages now include:
- **Error class name**: The Python class name of the exception (e.g., `ValueError`, `ThermaCoreException`)
- **Request ID**: Correlation ID for tracing requests
- **Error type**: Categorized error type (e.g., `database_error`, `validation_error`)
- **Context**: Descriptive context where the error occurred
- **Status code**: HTTP status code returned

Example log message:
```
Service error [req-123-abc] ValueError in input_validation: Invalid email format
```

### 3. Middleware Integration

The following middleware components have been updated to use `SecureLogger`:

- **Audit Middleware** (`app/middleware/audit.py`): Ensures audit logs don't leak sensitive data
- **Request ID Middleware** (`app/middleware/request_id.py`): Sanitizes correlation tracking logs

### 4. Service Integration

The following services have been updated to use `SecureLogger`:

- **Data Storage Service** (`app/services/data_storage_service.py`)
- **MQTT Service** (`app/services/mqtt_service.py`)
- **OPC UA Service** (`app/services/opcua_service.py`)

## Usage

### Basic Usage

To use `SecureLogger` in a new module:

```python
from app.utils.secure_logger import SecureLogger

# Get a secure logger for your module
logger = SecureLogger.get_secure_logger(__name__)

# Use it like a normal logger - sensitive data is automatically sanitized
logger.info("User login with password=secret123")
# Logs: "User login with password=***"

logger.error("API call failed with token=abc123xyz")
# Logs: "API call failed with token=***"
```

### Sanitizing Messages Manually

You can also manually sanitize messages or dictionaries:

```python
from app.utils.secure_logger import SecureLogger

# Sanitize a string message
message = "Database connection: postgresql://user:password@localhost/db"
sanitized = SecureLogger.sanitize_log_message(message)
# Returns: "Database connection: postgresql://user:password=***@localhost/db"

# Sanitize a dictionary
data = {
    'username': 'admin',
    'password': 'secret123',
    'email': 'admin@example.com'
}
sanitized = SecureLogger.sanitize_dict(data)
# Returns: {'username': 'admin', 'password': '[REDACTED]', 'email': 'admin@example.com'}
```

### Using with Error Handler

The error handler automatically uses `SecureLogger`, so no changes are needed:

```python
from app.utils.error_handler import SecurityAwareErrorHandler

try:
    # Some operation
    sensitive_operation(api_key="secret_key_123")
except Exception as e:
    # Error is logged with sensitive data redacted
    # and includes error class for debugging
    return SecurityAwareErrorHandler.handle_service_error(
        e, 'internal_error', 'sensitive_operation', 500
    )
```

## Testing

Comprehensive tests have been added to ensure secure logging works correctly:

- **`test_secure_logger.py`**: Tests for the SecureLogger utility class
  - Pattern matching and redaction
  - Dictionary sanitization
  - Logger adapter functionality
  - Edge cases and error handling

- **`test_secure_logging_integration.py`**: Integration tests with error handler
  - Sensitive data redaction in error logs
  - Error class inclusion in logs
  - Debug context preservation

Run the tests:

```bash
pytest app/tests/test_secure_logger.py -v
pytest app/tests/test_secure_logging_integration.py -v
```

## Security Considerations

1. **Log Storage**: Ensure log files are stored securely with appropriate access controls
2. **Log Rotation**: Implement log rotation to prevent sensitive data from accumulating
3. **Log Monitoring**: Monitor logs for any patterns that might indicate sensitive data leakage
4. **Pattern Updates**: Regularly review and update sensitive patterns as new patterns emerge
5. **Testing**: Always test logging in development to ensure sensitive data is properly redacted

## Benefits

1. **Security**: Prevents accidental exposure of passwords, tokens, and API keys in logs
2. **Compliance**: Helps meet regulatory requirements for data protection
3. **Debugging**: Enhanced error context improves troubleshooting while maintaining security
4. **Consistency**: Centralized sanitization ensures consistent behavior across the application
5. **Performance**: Minimal overhead with efficient pattern matching

## Migration Guide

To migrate existing modules to use SecureLogger:

1. **Update imports**:
   ```python
   # Old
   import logging
   logger = logging.getLogger(__name__)
   
   # New
   from app.utils.secure_logger import SecureLogger
   logger = SecureLogger.get_secure_logger(__name__)
   ```

2. **Test thoroughly**: Verify that your module's logs are properly sanitized
3. **Review patterns**: Check if your module needs additional sensitive patterns

## Future Enhancements

Potential future improvements:

1. **Configuration-based patterns**: Allow configurable patterns via environment variables
2. **Pattern plugins**: Support for custom pattern plugins
3. **Performance monitoring**: Add metrics for sanitization performance
4. **Log analysis tools**: Tools to detect potential sensitive data patterns
5. **Real-time alerts**: Alert when potential sensitive data is detected in logs

## References

- [SECURITY_BEST_PRACTICES.md](../SECURITY_BEST_PRACTICES.md) - Security guidelines
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Python Logging Best Practices](https://docs.python.org/3/howto/logging.html)
