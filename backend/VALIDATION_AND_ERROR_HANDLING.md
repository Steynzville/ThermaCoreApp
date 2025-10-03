# Centralized Request Validation and Error Handling

## Overview

This document describes the centralized approach to request validation and error handling in the ThermaCore SCADA API. The implementation focuses on:

1. **Centralized ValueError handling** - All ValueError exceptions are handled consistently across the application
2. **Request validation using Marshmallow schemas** - Provides webargs-like functionality for declarative request validation
3. **Consistent error response format** - All errors follow a standardized envelope structure
4. **Security-first approach** - Prevents exposure of sensitive error details to clients

## Architecture

### Components

1. **SecurityAwareErrorHandler** (`backend/app/utils/error_handler.py`)
   - Centralized error handling with `handle_value_error()` method
   - Logs detailed error information server-side
   - Returns generic, safe error messages to clients
   - Includes correlation IDs for request tracing

2. **Validation Schemas** (`backend/app/utils/schemas.py`)
   - Marshmallow schemas for query and body parameter validation
   - Declarative validation rules with automatic type conversion
   - Provides clear validation error messages

3. **Validation Decorators** (`backend/app/middleware/validation.py`)
   - `@use_args()` decorator for automatic request validation
   - Similar to webargs but using Marshmallow directly
   - Validates and passes parsed data to route handlers

## Usage

### Centralized ValueError Handling

**Before (manual logging and error responses):**
```python
@app.route('/data/<unit_id>')
def get_data(unit_id):
    try:
        days = int(request.args.get('days', 30))
        # ... business logic
    except ValueError as e:
        current_app.logger.error("ValueError in get_data: %s", e, exc_info=True)
        return jsonify({'error': 'Invalid days parameter'}), 400
```

**After (centralized error handling):**
```python
from app.utils.error_handler import SecurityAwareErrorHandler
from app.middleware.validation import use_args
from app.utils.schemas import StatisticsQuerySchema

@app.route('/data/<unit_id>')
@use_args(StatisticsQuerySchema, location='query')
def get_data(args, unit_id):
    try:
        # args already contains validated 'days' parameter
        days = args['days']
        # ... business logic
    except ValueError as e:
        return SecurityAwareErrorHandler.handle_value_error(
            e, 'get_data', 'Invalid request parameter.'
        )
```

### Request Validation with Schemas

#### 1. Define a Validation Schema

```python
# In app/utils/schemas.py
from marshmallow import Schema, fields, validate

class StatisticsQuerySchema(Schema):
    """Schema for statistics query parameters."""
    days = fields.Int(
        required=False,
        validate=validate.Range(min=1, max=365),
        load_default=30
    )
    sensor_type = fields.Str(required=False)
```

#### 2. Apply Validation Decorator

```python
from app.middleware.validation import use_args
from app.utils.schemas import StatisticsQuerySchema

@app.route('/statistics/<unit_id>')
@use_args(StatisticsQuerySchema, location='query')
def get_statistics(args, unit_id):
    # args contains validated parameters with defaults applied
    days = args['days']  # Already validated: 1 <= days <= 365
    sensor_type = args.get('sensor_type')  # Optional parameter
    # ... business logic
```

### Available Validation Schemas

Located in `backend/app/utils/schemas.py`:

- **HistoricalDataQuerySchema** - For historical data endpoints
  - `start_date`, `end_date` (ISO 8601 format)
  - `sensor_types` (comma-separated list)
  - `aggregation` (raw, hourly, daily, weekly)
  - `limit` (1-10000)

- **StatisticsQuerySchema** - For statistics endpoints
  - `days` (1-365)
  - `sensor_type`

- **TrendsQuerySchema** - For trend analysis
  - `days` (1-365)
  - `sensor_type`

- **PerformanceQuerySchema** - For performance metrics
  - `hours` (1-8760)

- **AlertPatternsQuerySchema** - For alert pattern analysis
  - `days` (1-365)

- **CompareUnitsSchema** - For unit comparison (JSON body)
  - `unit_ids` (required, array of strings)
  - `sensor_type` (required)
  - `aggregation` (hourly, daily, weekly)
  - `start_date`, `end_date`

- **ExportDataQuerySchema** - For data export
  - `format` (json, csv)
  - `start_date`, `end_date`
  - `sensor_types`

## Error Response Format

All errors follow a standardized envelope structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameter.",
    "details": {
      "context": "get_historical_data",
      "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Validation Error Response

When schema validation fails:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request data validation failed",
    "details": {
      "field_errors": {
        "days": "Must be greater than or equal to 1 and less than or equal to 365.",
        "limit": "Not a valid integer."
      },
      "location": "query"
    }
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Security Benefits

### 1. No Sensitive Information Exposure

**Before:**
```python
except ValueError as e:
    return jsonify({'error': str(e)}), 400
    # Could expose: "invalid literal for int() with base 10: 'malicious<script>'"
```

**After:**
```python
except ValueError as e:
    return SecurityAwareErrorHandler.handle_value_error(e, 'endpoint_name')
    # Returns: "Invalid request parameter."
    # Logs full details server-side only
```

### 2. Comprehensive Server-Side Logging

All errors are logged with:
- Full exception details and stack trace
- Request correlation ID
- Error context (endpoint name)
- Error classification (error_type, error_class)

```python
logger.error(
    "ValueError [550e8400-...] in get_historical_data: invalid literal for int()",
    exc_info=True,
    extra={
        'request_id': '550e8400-...',
        'error_type': 'value_error',
        'context': 'get_historical_data',
        'error_class': 'ValueError'
    }
)
```

### 3. Automatic Input Validation

Marshmallow schemas provide:
- Type conversion (string to int, etc.)
- Range validation
- Format validation (email, date, etc.)
- Required field checking
- Default value assignment

## Migration Guide

### Migrating Existing Endpoints

1. **Identify parameters that need validation**
2. **Create or use existing validation schema**
3. **Replace manual parameter parsing with `@use_args` decorator**
4. **Replace manual ValueError handling with `SecurityAwareErrorHandler.handle_value_error()`**

#### Example Migration

**Before:**
```python
@app.route('/analytics/trends/<unit_id>')
def get_trends(unit_id):
    try:
        days = int(request.args.get('days', 7))
        sensor_type = request.args.get('sensor_type')
        # ... business logic
    except ValueError as e:
        current_app.logger.error("ValueError in get_trends: %s", e)
        return jsonify({'error': 'Invalid days parameter'}), 400
```

**After:**
```python
from app.middleware.validation import use_args
from app.utils.schemas import TrendsQuerySchema

@app.route('/analytics/trends/<unit_id>')
@use_args(TrendsQuerySchema, location='query')
def get_trends(args, unit_id):
    # Validation happens automatically, no try/except needed for basic parameter parsing
    days = args['days']
    sensor_type = args.get('sensor_type')
    # ... business logic
```

## Best Practices

1. **Always use validation schemas for query parameters**
   - Prevents type conversion errors
   - Provides clear error messages
   - Documents expected parameters

2. **Use centralized error handling for ValueErrors**
   - Consistent error responses
   - Prevents information leakage
   - Proper server-side logging

3. **Keep error messages generic**
   - Never expose internal details to clients
   - Use correlation IDs for debugging

4. **Define reusable schemas**
   - Create schemas for common parameter patterns
   - Share schemas across similar endpoints

5. **Document validation rules**
   - Use schema docstrings
   - Include in API documentation

## Testing

The implementation includes comprehensive tests in `backend/app/tests/test_error_message_security.py`:

- Tests that ValueError exceptions are logged server-side
- Verifies generic error messages are returned to clients
- Ensures validation errors provide helpful field-level errors
- Confirms correlation IDs are included in responses

## References

- Error Handler: `backend/app/utils/error_handler.py`
- Validation Middleware: `backend/app/middleware/validation.py`
- Validation Schemas: `backend/app/utils/schemas.py`
- Historical Routes: `backend/app/routes/historical.py`
- Analytics Routes: `backend/app/routes/analytics.py`
- Tests: `backend/app/tests/test_error_message_security.py`
- Security Documentation: `backend/SECURE_LOGGING_IMPLEMENTATION.md`
