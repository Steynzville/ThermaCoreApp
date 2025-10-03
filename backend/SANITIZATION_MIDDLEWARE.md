# Centralized Input Sanitization

## Overview

The ThermaCore SCADA API now includes centralized input sanitization middleware that automatically sanitizes all incoming request parameters before they reach route handlers. This provides application-wide protection against log injection and other injection attacks.

## Implementation

### Core Components

1. **`sanitize()` function** (`app/middleware/validation.py`)
   - Removes control characters (newlines `\n`, carriage returns `\r`, tabs `\t`)
   - Works recursively on strings, dictionaries, and lists
   - Safe for all data types (non-string types are returned unchanged)

2. **`sanitize_request_params()` middleware** (`app/middleware/validation.py`)
   - Registered as `@app.before_request` handler
   - Automatically sanitizes:
     - `request.view_args` (path parameters like `/api/v1/units/<unit_id>`)
     - `request.args` (query parameters like `?sensor_type=temperature`)
     - `request.form` (form data from POST/PUT requests)

### How It Works

```python
# Before - manual sanitization in route handlers
@app.route('/units/<unit_id>')
def get_unit(unit_id):
    # Had to manually sanitize
    sanitized_id = str(unit_id).replace('\n', '').replace('\r', '').replace('\t', '')
    logger.info(f"Getting unit {sanitized_id}")
    # ... rest of code

# After - automatic sanitization via middleware
@app.route('/units/<unit_id>')
def get_unit(unit_id):
    # unit_id is already sanitized by middleware
    logger.info(f"Getting unit {unit_id}")
    # ... rest of code
```

## Usage

### Using the sanitize() function directly

If you need to sanitize user input for other purposes (e.g., database queries, external API calls), you can import and use the `sanitize()` function:

```python
from app.middleware import sanitize

# Sanitize a string
user_input = "hello\nworld"
clean_input = sanitize(user_input)  # Returns: "helloworld"

# Sanitize a dictionary
data = {'name': 'John\nDoe', 'email': 'john@example.com'}
clean_data = sanitize(data)  # Returns: {'name': 'JohnDoe', 'email': 'john@example.com'}

# Sanitize a list
items = ['item1', 'item2\n\r', 'item3\t']
clean_items = sanitize(items)  # Returns: ['item1', 'item2', 'item3']
```

### Request Parameters (Automatic)

All request parameters are automatically sanitized before reaching your route handlers:

```python
@app.route('/api/v1/units/<unit_id>')
def get_unit(unit_id):
    # unit_id is already sanitized - no manual work needed!
    return jsonify({'unit_id': unit_id})

@app.route('/api/v1/sensors')
def get_sensors():
    # Query parameters are already sanitized
    sensor_type = request.args.get('sensor_type')
    # sensor_type is safe to use in logs
    logger.info(f"Filtering by sensor type: {sensor_type}")
    return jsonify({'type': sensor_type})
```

## Security Benefits

### 1. Log Injection Prevention

**Before sanitization:**
```
# Malicious input: "user123\n[ERROR] Fake error message"
# Log output:
INFO: Processing request for user user123
ERROR: Fake error message  # <-- Injected fake log entry!
```

**After sanitization:**
```
# Same input, but sanitized
# Log output:
INFO: Processing request for user user123[ERROR] Fake error message  # <-- All on one line, no injection
```

### 2. Log Forging Prevention

Attackers can't inject fake log entries that might:
- Confuse log analysis tools
- Hide malicious activity
- Trigger false alerts
- Bypass security monitoring

### 3. Consistent Security

All routes benefit automatically without manual effort:
- New routes are protected by default
- No risk of developers forgetting to sanitize
- Uniform security posture across the application

## Testing

Comprehensive tests are available in `app/tests/test_sanitization_middleware.py`:

```bash
# Run sanitization tests
pytest app/tests/test_sanitization_middleware.py -v
```

Test coverage includes:
- String sanitization with various control characters
- Dictionary and list sanitization
- Nested data structure sanitization
- Path parameter sanitization
- Query parameter sanitization
- Form data sanitization
- Log injection prevention
- Clean data preservation

## Migration from Manual Sanitization

If you have existing code with manual sanitization, you can safely remove it:

**Before:**
```python
def export_data(unit_id):
    # Manual sanitization (no longer needed)
    sanitized_id = str(unit_id).replace('\n', '').replace('\r', '').replace('\t', '')
    logger.warning("Export for unit_id=%s", sanitized_id)
```

**After:**
```python
def export_data(unit_id):
    # unit_id is pre-sanitized by middleware
    logger.warning("Export for unit_id=%s", unit_id)
```

## Performance

The sanitization middleware has minimal performance impact:
- Only processes string values
- Non-string types pass through without modification
- Recursive processing is efficient for nested structures
- No database or network calls

## Best Practices

1. **Trust the middleware** - Don't add manual sanitization unless you have a specific need
2. **Use for logging** - Always safe to use sanitized parameters in log messages
3. **Additional validation** - Sanitization removes control characters but doesn't validate format (e.g., email format, UUID format)
4. **Direct use** - Import `sanitize()` function if you need to sanitize other data sources

## Examples

### Example 1: Historical Data Export
```python
@historical_bp.route('/historical/export/<unit_id>', methods=['GET'])
def export_historical_data(unit_id):
    # unit_id is already sanitized
    try:
        unit = Unit.query.get(unit_id)
        # ... export logic
    except ValueError as e:
        # Safe to log unit_id - already sanitized
        current_app.logger.warning(
            "Invalid date parameter for unit_id=%s",
            unit_id  # No manual sanitization needed!
        )
```

### Example 2: API with Multiple Parameters
```python
@app.route('/api/v1/search')
def search():
    # All query parameters are pre-sanitized
    query = request.args.get('q', '')
    category = request.args.get('category', '')
    
    # Safe to use in logs
    logger.info(f"Search: query={query}, category={category}")
    
    # Safe to use in responses
    return jsonify({
        'query': query,
        'category': category,
        'results': perform_search(query, category)
    })
```

## References

- Implementation: `backend/app/middleware/validation.py`
- Integration: `backend/app/__init__.py`
- Tests: `backend/app/tests/test_sanitization_middleware.py`
- Security documentation: `backend/SECURE_LOGGING_IMPLEMENTATION.md`
