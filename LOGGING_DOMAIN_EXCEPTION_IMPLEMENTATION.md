# ThermaCore SCADA API - Logging Refinement & Domain Exception Handling

## Implementation Summary

This document describes the implementation of logging refinement, domain exception handling improvements, and correlation ID enhancements for the ThermaCore SCADA API.

## Problem Statement

The original requirements were to:
1. **Implement logging refinement** - Improve structured logging and correlation ID integration
2. **Handle domain exceptions properly** - Ensure ThermaCoreException instances are correctly processed
3. **Add correlation IDs to requests and responses** - Enhance traceability across the system

## Solution Overview

### Key Improvements Made

#### 1. Enhanced Domain Exception Handling

**File: `app/utils/error_handler.py`**

- **Added `handle_thermacore_exception()` method**: Specifically handles all ThermaCoreException instances with proper error mapping, correlation ID tracking, and structured logging.

- **Enhanced correlation ID integration**: All error responses now include `correlation_id` in the error details section, enabling better request traceability.

- **Improved structured logging**: Added comprehensive logging context including request ID, error type, context, details, and status code.

- **Added global error handlers**: New `register_error_handlers()` method registers Flask error handlers for 404, 500, 503, and general exceptions.

**Key Features:**
- Proper error type classification (ERROR vs WARNING based on error severity)
- Correlation ID in all error response envelopes
- Enhanced logging context with structured data
- Generic user-facing messages for security

#### 2. Request ID Middleware Enhancements

**File: `app/middleware/request_id.py`**

- **Enhanced RequestIDFilter**: Now adds `correlation_id` to log record extras for structured logging.

- **Improved structured logging**: Enhanced `init_request_id_logging()` with better logging configuration and structured format.

- **Enhanced `track_request_id` decorator**: 
  - Better structured logging with request context
  - Direct domain exception handling within the decorator
  - Enhanced error logging with correlation ID and context

**Key Features:**
- Structured logging with correlation IDs
- Request context tracking (method, path, IP, user agent)
- Direct ThermaCoreException handling in decorator
- Enhanced error classification and logging

#### 3. Flask Application Integration

**File: `app/__init__.py`**

- **Integrated error handler registration**: Added `SecurityAwareErrorHandler.register_error_handlers(app)` to the Flask app factory.

- **Proper middleware order**: Ensures error handlers are registered after request ID middleware setup.

**Key Features:**
- Global exception handling with correlation IDs
- Proper integration order
- Consistent error responses across all endpoints

## Technical Implementation Details

### Domain Exception Flow

1. **Exception Creation**: Any ThermaCoreException is created with `error_type`, `status_code`, `context`, and `details`.

2. **Exception Handling**: The `handle_thermacore_exception()` method:
   - Extracts correlation ID from Flask's `g` object
   - Logs with appropriate level (ERROR/WARNING) based on error type
   - Creates structured error response with correlation ID
   - Returns proper HTTP status code

3. **Response Format**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data provided.",
    "details": {
      "context": "ValidationException",
      "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-01T10:30:00Z"
}
```

### Correlation ID Flow

1. **Request Start**: `RequestIDManager.ensure_request_id()` generates or extracts correlation ID
2. **Storage**: Stored in Flask's `g.request_id` for request-scoped access
3. **Logging**: `RequestIDFilter` adds correlation ID to all log records
4. **Error Handling**: All error responses include correlation ID in details
5. **Response Headers**: `X-Request-ID` header added to all responses

### Logging Enhancement

**Format**: `[timestamp] [correlation-id] LEVEL in module: message`

**Example**: `[2024-01-01 10:30:00] [550e8400-e29b-41d4-a716-446655440000] INFO in auth: User login successful`

**Structured Context**:
- Request method, path, remote IP, user agent
- Error type, status code, exception class
- Service names and operation context
- Correlation ID in all log records

## Usage Examples

### Route Handler with Domain Exceptions
```python
from app.middleware.request_id import track_request_id
from app.exceptions import ValidationException
from app.utils.error_handler import SecurityAwareErrorHandler

@track_request_id
def update_sensor_data():
    try:
        # Validation logic
        if not valid_data:
            raise ValidationException("Invalid sensor data", field="temperature")
        
        # Success response with correlation ID
        return SecurityAwareErrorHandler.create_success_response(data)
        
    except ValidationException:
        # Automatically handled by track_request_id decorator
        # Returns proper error response with correlation ID
        raise
```

### Service Layer Exception Handling
```python
from app.exceptions import MQTTConnectionException

def connect_to_mqtt_broker(host, port):
    try:
        # Connection logic
        client.connect(host, port)
    except ConnectionError as e:
        # Raise domain exception with context
        raise MQTTConnectionException(host, port) from e
```

## Domain Exception Hierarchy

```
ThermaCoreException (base)
├── AuthenticationException
│   ├── InvalidCredentialsException
│   └── TokenExpiredException
├── AuthorizationException
│   └── InsufficientPermissionsException
├── ValidationException
│   ├── InvalidDataException
│   └── SensorReadingValidationException
├── ResourceException
│   ├── ResourceNotFoundException
│   │   ├── UnitNotFoundException
│   │   ├── SensorNotFoundException
│   │   └── UserNotFoundException
├── ProtocolException
│   ├── MQTTException
│   │   └── MQTTConnectionException
│   ├── OPCUAException
│   │   └── OPCUAConnectionException
│   ├── ModbusException
│   └── DNP3Exception
├── ServiceException
│   └── ServiceUnavailableException
├── DatabaseException
│   ├── DatabaseConnectionException
│   └── DatabaseIntegrityException
├── UnitException
│   ├── UnitOfflineException
│   └── UnitMaintenanceException
├── SensorException
│   ├── SensorInactiveException
│   └── SensorOutOfRangeException
├── ConfigurationException
│   └── MissingConfigurationException
└── TimeoutException
```

## Error Type Mapping

| Error Type | HTTP Status | Log Level | Description |
|------------|-------------|-----------|-------------|
| `validation_error` | 400 | WARNING | Invalid request data |
| `authentication_error` | 401 | WARNING | Authentication failed |
| `permission_error` | 403 | WARNING | Insufficient permissions |
| `not_found_error` | 404 | WARNING | Resource not found |
| `timeout_error` | 504 | WARNING | Operation timeout |
| `internal_error` | 500 | ERROR | Internal server error |
| `database_error` | 500 | ERROR | Database operation failed |
| `configuration_error` | 500 | ERROR | Configuration error |
| `service_unavailable` | 503 | WARNING | Service unavailable |
| `connection_error` | 503 | WARNING | Connection failed |

## Benefits

1. **Enhanced Traceability**: Correlation IDs in all log messages and error responses
2. **Better Error Handling**: Proper mapping of domain exceptions to HTTP responses
3. **Improved Debugging**: Structured logging with comprehensive context
4. **Security**: Generic user messages while maintaining detailed internal logs
5. **Consistency**: Standardized error response format across all endpoints
6. **Maintainability**: Clear separation of concerns and proper error classification

## Integration Points

1. **Flask App Factory**: `SecurityAwareErrorHandler.register_error_handlers(app)`
2. **Route Decorators**: `@track_request_id` for automatic correlation ID handling
3. **Service Layers**: Raise appropriate ThermaCoreException instances
4. **Global Handlers**: Automatic handling of all uncaught exceptions

This implementation provides a robust foundation for error handling and logging in the ThermaCore SCADA API, ensuring proper correlation ID flow and comprehensive domain exception handling.