# Centralized Input Sanitization

## Overview

The ThermaCore SCADA API includes centralized input sanitization that protects against log injection attacks **at the logging layer**. This approach sanitizes data when it's being logged while keeping the original request data intact for application logic.

## Implementation

### Core Components

1. **`sanitize()` function** (`app/middleware/validation.py`)
   - Removes all ASCII control characters (0-31) and Unicode line/paragraph separators (U+2028, U+2029)
   - Works recursively on strings, dictionaries, and lists
   - Sanitizes dictionary string keys and all values (preserves non-string keys like integers)
   - Includes depth limit (max_depth=10) to prevent DoS from deeply nested structures
   - Safe for all data types (non-string types are returned unchanged)
   - **WARNING**: Removes tabs and other control characters - ONLY use via logging filter, NOT for direct input sanitization
   - **Note**: Designed for text inputs; binary data should be encoded (e.g., base64) before logging

2. **`SanitizingFilter` logging filter** (`app/utils/logging_filter.py`)
   - Registered on root logger to cover all application loggers
   - Also registered on Flask app logger to ensure coverage
   - Converts all log arguments to strings before sanitization (handles objects with custom `__str__` methods)
   - Sanitizes log messages and all argument types (strings, objects, numbers, etc.)
   - Operates transparently without modifying application data
   - Does not attempt to access non-standard LogRecord attributes

### Architecture Decision

**Why sanitize at the logging layer instead of at request ingress?**

The initial implementation sanitized request parameters globally via middleware, but this approach had critical flaws:
- **Data corruption**: Removed control characters from valid user input (e.g., multiline text fields)
- **Silent failures**: Business logic received modified data without awareness
- **Breaking changes**: Extensions or code relying on original data could fail

**The logging-layer approach is superior because:**
- ✅ **Preserves data integrity**: Original request data remains intact for all application logic
- ✅ **Targeted protection**: Only sanitizes when logging, where injection attacks occur
- ✅ **No side effects**: Doesn't affect request processing, validation, or business logic
- ✅ **Explicit and clear**: Developers know logging is sanitized, but data is original

### How It Works

```python
# Logging filter automatically sanitizes at log time
@app.route('/units/<unit_id>')
def get_unit(unit_id):
    # unit_id contains original data (including any control characters)
    # Business logic uses the real, unmodified data
    unit = Unit.query.get(unit_id)
    
    # When logging, the filter sanitizes the output
    # The log file won't have control characters, preventing log injection
    logger.info(f"Getting unit {unit_id}")  # Sanitized in logs!
    
    return jsonify({'unit_id': unit_id})  # Original data in response
```

## Usage

### Automatic Sanitization in Logs

All logging automatically goes through the sanitizing filter:

### Using sanitize() for Other Purposes

You can use the sanitize() function directly when needed:

```python
from app.middleware import sanitize

# Sanitize a string - removes all ASCII control characters (0-31)
user_input = "hello\nworld"
clean_input = sanitize(user_input)  # Returns: "helloworld"

# Sanitize a dictionary - sanitizes both keys and values
data = {'name\n': 'John\nDoe', 'email': 'john@example.com'}
clean_data = sanitize(data)  # Returns: {'name': 'JohnDoe', 'email': 'john@example.com'}

# Sanitize a list
items = ['item1', 'item2\n\r', 'item3\t']
clean_items = sanitize(items)  # Returns: ['item1', 'item2', 'item3']

# Control recursion depth for deeply nested structures
deep_data = {...}  # Very nested structure
safe_data = sanitize(deep_data, max_depth=5)  # Prevents DoS
```

### Logging is Automatically Sanitized

All logging goes through the SanitizingFilter, which sanitizes at the logging layer:

```python
from flask import current_app

@app.route('/api/v1/units/<unit_id>')
def get_unit(unit_id):
    # unit_id contains the ORIGINAL data (unmodified)
    # This is important - business logic gets real data
    
    # Logging is automatically sanitized by the filter
    current_app.logger.info(f"Processing unit: {unit_id}")
    # In log files: control characters are removed
    # In code: unit_id still has original value
    
    return jsonify({'unit_id': unit_id})  # Returns original data

@app.route('/api/v1/sensors')
def get_sensors():
    # Query parameters contain ORIGINAL data
    sensor_type = request.args.get('sensor_type')
    
    # Logging is sanitized automatically
    logger.info(f"Filtering by sensor type: {sensor_type}")  # Safe in logs
    
    # Business logic gets original data
    return jsonify({'type': sensor_type})  # Original data in response
```

## Security Benefits

### 1. Log Injection Prevention

The logging filter prevents log injection while preserving data integrity:

**Without logging filter:**
```
# Malicious input: "user123\n[ERROR] Fake error message"
# Log output:
INFO: Processing request for user user123
ERROR: Fake error message  # <-- Injected fake log entry!
```

**With logging filter:**
```
# Same malicious input
# Log output:
INFO: Processing request for user user123[ERROR] Fake error message  # <-- Sanitized, all on one line
# Application data: "user123\n[ERROR] Fake error message"  # <-- Original, intact for validation/business logic
```

### 2. Data Integrity Preserved

Unlike request-mutation approaches, the logging filter approach:
- ✅ **Keeps original data intact** - Business logic receives real, unmodified input
- ✅ **Allows proper validation** - Can validate that multiline input is actually invalid
- ✅ **No silent failures** - Application knows exactly what user sent
- ✅ **Compatible with extensions** - Other middleware/extensions see original request data

### 3. Targeted Protection

Security is applied exactly where needed:
- Logs are sanitized (preventing log injection)
- Application data is original (enabling proper validation and processing)

## Testing

Comprehensive tests are available in `app/tests/test_sanitization_middleware.py`:

```bash
# Run sanitization tests
pytest app/tests/test_sanitization_middleware.py -v
```

Test coverage includes:
- String sanitization with all ASCII control characters (0-31)
- Dictionary key and value sanitization
- List and nested structure sanitization
- Depth limit protection against DoS
- Logging filter sanitization
- Data integrity preservation (original data unchanged)

## Migration from Previous Approach

If you previously used request-mutation middleware or manual sanitization:

**Old approach (problematic):**
```python
# DON'T DO THIS - mutates request data
@app.before_request
def sanitize_params():
    request.view_args = sanitize(request.view_args)  # Corrupts data!

def export_data(unit_id):
    # unit_id has been corrupted by middleware
    # Can't properly validate or process original input
    logger.warning("Export for unit_id=%s", unit_id)
```

**New approach (recommended):**
```python
# Logging filter is set up once in app initialization
# No per-request hooks needed

def export_data(unit_id):
    # unit_id contains original, unmodified data
    # Proper validation can check for invalid characters
    if '\n' in unit_id or '\r' in unit_id:
        return jsonify({'error': 'Invalid unit_id format'}), 400
    
    # Logging is automatically sanitized
    logger.warning("Export for unit_id=%s", unit_id)  # Safe in logs
    
    # Business logic uses original data
    return export_unit(unit_id)
```

## Performance

The logging filter has minimal performance impact:
- Only processes data when logging occurs (not on every request)
- Uses efficient str.translate() for string sanitization
- Includes depth limit to prevent DoS from deeply nested structures
- No database or network calls

## Best Practices

1. **Don't manually sanitize for logging** - The logging filter handles it automatically
2. **Validate input properly** - Use original data to detect and reject invalid input
3. **Use sanitize() for display** - When showing user input in UI, sanitize to remove control chars
4. **Preserve data integrity** - Let validation logic see real input, not sanitized version

## Examples

### Example 1: Historical Data Export (Corrected)
```python
@historical_bp.route('/historical/export/<unit_id>', methods=['GET'])
def export_historical_data(unit_id):
    # unit_id contains original data
    try:
        unit = Unit.query.get(unit_id)
        # ... export logic
    except ValueError as e:
        # Logging is automatically sanitized by SanitizingFilter
        current_app.logger.warning(
            "Invalid date parameter for unit_id=%s",
            unit_id  # Original data, sanitized in logs only!
        )
```

### Example 2: API with Multiple Parameters
```python
@app.route('/api/v1/search')
def search():
    # Query parameters contain original, unsanitized data
    query = request.args.get('q', '')
    category = request.args.get('category', '')
    
    # Logging is automatically sanitized by the filter
    logger.info(f"Search: query={query}, category={category}")
    
    # Return original data in the response
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
