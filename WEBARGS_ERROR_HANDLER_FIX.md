# Fix: Webargs Error Handler Registration

## Problem

The test `test_login_missing_fields` in `test_auth.py` was failing with a 500 Internal Server Error instead of the expected 400 Bad Request when required fields were missing from the login request.

The specific error was:
```
ValueError: _on_validation_error hook did not raise an exception
marshmallow.exceptions.ValidationError: {'password': ['Missing data for required field.']}
```

## Root Cause

The webargs error handler defined in `app/middleware/validation.py` was never being imported in the app initialization, AND when it was imported, it had an incorrect implementation. 

### Issue 1: Not Imported (Fixed in commit b7b8874)
The validation module was not imported in `app/__init__.py`, so the `@parser.error_handler` decorator was never executed.

### Issue 2: Incorrect Implementation (This Fix)
The error handler was returning a response tuple `(jsonify(...), status_code)` instead of raising an exception. According to webargs' requirements, the error handler must **abort/raise** rather than return a response.

The error message "ValueError: _on_validation_error hook did not raise an exception" clearly indicates that webargs expects the handler to raise an exception, not return a value.

## Solution

### Fix 1: Import Validation Module (Already Done)
Added import in `app/__init__.py`:
```python
from app.middleware import validation  # noqa: F401
```

### Fix 2: Correct Error Handler Implementation (This Commit)
Changed the error handler to use `abort()` with a prepared response instead of returning:

**Before:**
```python
@parser.error_handler
def handle_webargs_error(error, req, schema, *, error_status_code, error_headers):
    return jsonify({...}), error_status_code or 400  # ❌ Returns instead of raising
```

**After:**
```python
@parser.error_handler
def handle_webargs_error(error, req, schema, *, error_status_code, error_headers):
    from flask import abort, make_response
    
    error_response = {...}
    response = make_response(jsonify(error_response), error_status_code or 400)
    abort(response)  # ✅ Aborts with the prepared response
```

This approach:
1. Creates the standardized error response with proper format
2. Wraps it in a Flask response object with the correct status code
3. Calls `abort(response)` which raises an HTTPException
4. Flask's error handling then returns this response to the client

## Impact

### Before Fix
- Missing required fields in login request → 500 Internal Server Error
- Error: "ValueError: _on_validation_error hook did not raise an exception"
- Webargs validation errors were causing unhandled exceptions

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

- `backend/app/middleware/validation.py` - Fixed error handler to use abort() instead of return

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

## Technical Notes

### Why abort() Instead of Return?

Webargs' error handler hook (`@parser.error_handler`) is designed to integrate with Flask's exception handling mechanism. The hook expects one of two behaviors:

1. **Raise an exception** - The recommended approach, which allows Flask's error handling to process it
2. **Return None** - Let webargs use its default error handling

Returning a response tuple directly violates webargs' contract and causes the "did not raise an exception" error.

By using `abort(make_response(...))`, we:
- Satisfy webargs' requirement (raises an HTTPException)
- Provide a custom response body (via make_response)
- Maintain our standardized error format
- Keep correlation IDs in all error responses
