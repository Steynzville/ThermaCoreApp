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

**Authentication & Authorization:**
- `password=<value>`, `passwd=<value>`, `pwd=<value>` → `password=***` (or variant)
- `token=<value>` → `token=***`
- `api_key=<value>` or `api-key=<value>` → `api_key=***`
- `secret=<value>` → `secret=***`
- `authorization=<value>` → `authorization=***`
- `jwt=<value>` → `jwt=***`
- `access_token=<value>` → `access_token=***`
- `refresh_token=<value>` → `refresh_token=***`
- `session=<value>` → `session=***`
- `csrf=<value>` → `csrf=***`
- `Bearer <token>` → `Bearer ***`

**Personal Identifiable Information (PII):**
- Social Security Numbers: `123-45-6789` → `***-**-****`
- Credit Card Numbers: `4532-1234-5678-9010` → `****-****-****-****`
- Phone Numbers: `555-123-4567` → `***-***-****`
- Email Addresses: `john.doe.smith@example.com` → `joh***@example.com` (partial redaction)

**Connection Strings & Keys:**
- Database URLs: `postgresql://user:password@host/db` → `postgresql://user:***@host/db`
- Private Keys: `private_key=<value>` → `private_key=***`
- Client Secrets: `client_secret=<value>` → `client_secret=***`
- PEM Private Keys: `-----BEGIN PRIVATE KEY-----...` → `[PRIVATE_KEY_REDACTED]`

#### Sensitive Dictionary Keys

The following dictionary keys are automatically redacted (case-insensitive):

**Credentials:**
- password, passwd, pwd, token, api_key, secret, jwt
- refresh_token, access_token, authorization
- secret_key, private_key, client_secret, api_secret
- auth_token, session_token, csrf_token, session, session_id, sessionid
- x-api-key, x-auth-token, bearer, credentials

**Certificates & Keys:**
- cert, certificate, private_key_path, key_file

**Financial & PII:**
- ssn, social_security, credit_card, card_number, cvv
- pin, security_code, account_number, routing_number

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

### 5. Input Validation (`app/utils/input_validator.py`)

The `InputValidator` class provides comprehensive input validation to prevent injection attacks and ensure data integrity.

#### Features

- **SQL Injection Detection**: Detects common SQL injection patterns (UNION, OR/AND conditions, comments)
- **XSS Detection**: Identifies cross-site scripting attempts (script tags, event handlers, javascript: protocol)
- **Path Traversal Detection**: Prevents directory traversal attacks (../, /etc/passwd, Windows paths)
- **Command Injection Detection**: Blocks shell metacharacters and command substitution
- **Input Sanitization**: Safely sanitizes input for logging while preventing log injection
- **Identifier Validation**: Validates safe identifiers (alphanumeric, underscore, dash, dot)
- **Email Validation**: RFC-compliant email format validation
- **Numeric Range Validation**: Validates numbers within specified ranges

#### Security Validation

Use `validate_input()` for comprehensive security checks:

```python
from app.utils.input_validator import InputValidator

# Validate user input
is_valid, error_msg = InputValidator.validate_input(user_input, 'username')
if not is_valid:
    logger.warning(f"Invalid input: {error_msg}")
    return error_response(error_msg)
```

#### Safe Logging

Use `sanitize_for_logging()` to safely log user input:

```python
from app.utils.input_validator import InputValidator

# Sanitize potentially dangerous input before logging
safe_value = InputValidator.sanitize_for_logging(user_input)
logger.info(f"Processing request with data: {safe_value}")
```

This prevents:
- HTML/JavaScript injection in logs
- Log forging with newlines/control characters
- Log flooding with excessively long input

### 6. Enhanced Error Handler

The `SecurityAwareErrorHandler` has been enhanced with additional methods:

#### Input Validation Error Handling

```python
from app.utils.error_handler import SecurityAwareErrorHandler

# Handle input validation errors securely
return SecurityAwareErrorHandler.handle_input_validation_error(
    field_name='email',
    error_message='Invalid email format',
    context='User registration'
)
```

This ensures:
- Field names and error details are sanitized before logging
- Generic user-facing messages prevent information disclosure
- Detailed errors are logged server-side for debugging
- All validation failures include correlation IDs

#### Automated Input Validation

Use `validate_and_handle_input()` for automatic validation and error handling:

```python
from app.utils.error_handler import SecurityAwareErrorHandler

# Validate and handle in one call
is_valid, error_response = SecurityAwareErrorHandler.validate_and_handle_input(
    value=user_input,
    context='search_query'
)

if not is_valid:
    return error_response  # Already formatted with correlation ID
```

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

Comprehensive tests have been added to ensure secure logging and input validation work correctly:

### Secure Logging Tests

- **`test_secure_logger.py`**: Tests for the SecureLogger utility class
  - Pattern matching and redaction
  - Dictionary sanitization
  - Logger adapter functionality
  - Edge cases and error handling

- **`test_enhanced_secure_logger.py`**: Tests for enhanced sensitive patterns
  - PII redaction (SSN, credit cards, phone numbers)
  - Email partial redaction
  - Database URL password redaction
  - Bearer token redaction
  - Private key redaction
  - Multiple sensitive patterns in same message

- **`test_secure_logging_integration.py`**: Integration tests with error handler
  - Sensitive data redaction in error logs
  - Error class inclusion in logs
  - Debug context preservation

### Input Validation Tests

- **`test_input_validator.py`**: Comprehensive input validation tests
  - SQL injection detection (52 test cases)
  - XSS detection
  - Path traversal detection
  - Command injection detection
  - Input sanitization for logging
  - Identifier validation
  - Email validation
  - Numeric range validation

Run the tests:

```bash
# Secure logging tests
pytest app/tests/test_secure_logger.py -v
pytest app/tests/test_enhanced_secure_logger.py -v
pytest app/tests/test_secure_logging_integration.py -v

# Input validation tests
pytest app/tests/test_input_validator.py -v
```

## Security Considerations

1. **Log Storage**: Ensure log files are stored securely with appropriate access controls
2. **Log Rotation**: Implement log rotation to prevent sensitive data from accumulating
3. **Log Monitoring**: Monitor logs for any patterns that might indicate sensitive data leakage
4. **Pattern Updates**: Regularly review and update sensitive patterns as new patterns emerge
5. **Testing**: Always test logging in development to ensure sensitive data is properly redacted
6. **Input Validation**: Always validate and sanitize user input before processing or logging
7. **Defense in Depth**: Use multiple layers of protection (validation, sanitization, redaction)
8. **Injection Prevention**: Never trust user input - always validate against known attack patterns
9. **Error Messages**: Never expose system internals, file paths, or database details in user-facing errors
10. **Correlation IDs**: Use correlation IDs to trace errors without exposing sensitive details

## Benefits

1. **Security**: Prevents accidental exposure of passwords, tokens, API keys, and PII in logs
2. **Compliance**: Helps meet regulatory requirements for data protection (GDPR, PCI-DSS, HIPAA)
3. **Debugging**: Enhanced error context improves troubleshooting while maintaining security
4. **Consistency**: Centralized sanitization ensures consistent behavior across the application
5. **Performance**: Minimal overhead with efficient pattern matching
6. **Attack Prevention**: Input validation blocks common injection attacks (SQL, XSS, path traversal, command injection)
7. **Information Hiding**: Generic error messages prevent attackers from learning about system internals
8. **Audit Trail**: Correlation IDs enable tracking issues without exposing sensitive information

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
6. **Machine Learning**: Use ML to detect anomalous patterns that might indicate sensitive data
7. **Context-aware Validation**: Validate input based on expected context and data type
8. **Rate Limiting**: Add rate limiting for validation failures to prevent brute-force attacks
9. **Internationalization**: Support for validating international formats (phone, postal codes, etc.)
10. **Custom Validators**: Plugin system for domain-specific validation rules

## References

- [SECURITY_BEST_PRACTICES.md](../SECURITY_BEST_PRACTICES.md) - Security guidelines
- [VALIDATION_AND_ERROR_HANDLING.md](VALIDATION_AND_ERROR_HANDLING.md) - Centralized validation approach
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Python Logging Best Practices](https://docs.python.org/3/howto/logging.html)

## Summary of Security Enhancements

This implementation provides multiple layers of security:

1. **Expanded Pattern Matching**: Now detects 30+ sensitive patterns including PII (SSN, credit cards, phone numbers)
2. **Input Validation**: Comprehensive validation against SQL injection, XSS, path traversal, and command injection
3. **Safe Logging**: Automatic sanitization of user input before logging to prevent log injection
4. **Enhanced Error Handling**: Generic user-facing messages with detailed server-side logging
5. **Correlation Tracking**: Request IDs for tracing issues without exposing sensitive data
6. **Comprehensive Testing**: 78+ test cases covering all security scenarios

These enhancements significantly improve the security posture of the ThermaCore SCADA API by preventing common attack vectors and accidental data leakage.
