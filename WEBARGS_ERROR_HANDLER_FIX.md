# Fix: Webargs Error Handler Registration

## Problem

The test `test_login_missing_fields` in `test_auth.py` was failing with a 500 Internal Server Error instead of the expected 400 Bad Request when required fields were missing from the login request.

## Root Cause

The webargs error handler defined in `app/middleware/validation.py` was never being imported in the app initialization, so it was not being registered with the Flask-webargs parser. This meant that validation errors from the `@use_args` decorator were not being caught and properly handled, resulting in unhandled exceptions (500 errors) instead of proper validation error responses (400 errors).

### Code Analysis

In `backend/app/middleware/validation.py` (lines 144-165), there's a webargs error handler defined:

```python
@parser.error_handler
def handle_webargs_error(error, req, schema, *, error_status_code, error_headers):
    """
    Custom error handler for webargs validation errors.
    
    This ensures webargs validation errors use our standardized error envelope format
    with correlation IDs and consistent structure.
    """
    return jsonify({
        'success': False,
        'error': {
            'code': 'VALIDATION_ERROR',
            'message': 'Request data validation failed',
            'details': {
                'field_errors': error.messages,
                'location': getattr(error, 'location', 'unknown')
            }
        },
        'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }), error_status_code or 400
```

However, this decorator only registers the handler when the module is imported. The `app/__init__.py` file was not importing this module, so the handler was never registered.

## Solution

Added an import of the `validation` middleware module in `backend/app/__init__.py` to ensure the error handler is registered when the app is initialized:

```python
# Import validation middleware to register webargs error handler
from app.middleware import validation  # noqa: F401
```

This import has been placed in the middleware setup section (line 153), right after importing other middleware modules and before calling the setup functions.

## Impact

### Before Fix
- Missing required fields in login request → 500 Internal Server Error
- Webargs validation errors were unhandled
- No standardized error response format for validation errors

### After Fix
- Missing required fields in login request → 400 Bad Request
- Webargs validation errors are properly caught and handled
- Standardized error response with:
  - `success: false`
  - `error` object with `code`, `message`, and `details`
  - `request_id` for correlation
  - `timestamp` for tracking
  - Proper field-level error messages in `details.field_errors`

## Files Changed

- `backend/app/__init__.py` - Added import of validation middleware (2 lines added)

## Example Error Response

When a required field is missing from the login request, the API now returns:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request data validation failed",
    "details": {
      "field_errors": {
        "password": ["Missing data for required field."]
      },
      "location": "json"
    }
  },
  "request_id": "abc123-def456-...",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

## Testing

The test `test_login_missing_fields` should now pass:

```python
def test_login_missing_fields(self, client):
    """Test login with missing fields."""
    response = client.post('/api/v1/auth/login',
        json={'username': 'admin'},  # Missing 'password' field
        headers={'Content-Type': 'application/json'}
    )
    
    assert response.status_code == 400  # ✅ Now returns 400 instead of 500
    data = unwrap_response(response)
    # Check for validation error in any form (structured or simple)
    data_str = str(data).lower()
    assert 'validation' in data_str or 'field' in data_str or 'required' in data_str
```

## Related Code

All routes using the `@use_args` decorator from webargs will now benefit from this fix:

- `POST /api/v1/auth/login` (LoginSchema)
- `POST /api/v1/auth/register` (UserCreateSchema)
- Other endpoints using webargs validation

## Notes

The `# noqa: F401` comment is used to suppress the "imported but unused" warning from linters, which is expected since we're importing the module solely for its side effect (registering the error handler).
