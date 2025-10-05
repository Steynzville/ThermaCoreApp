"""Input validation middleware for ThermaCore SCADA API."""
import uuid
from datetime import datetime
from functools import wraps
from typing import Any, Callable

from flask import request, jsonify, g
from webargs.flaskparser import parser



# Translation table to remove all ASCII control characters (0-31)
# and Unicode line/paragraph separators that could be used for log injection
# This is more comprehensive and performant than multiple .replace() calls
CONTROL_CHARS = dict.fromkeys(range(32))
# Add Unicode line separator (U+2028) and paragraph separator (U+2029)
CONTROL_CHARS[0x2028] = None
CONTROL_CHARS[0x2029] = None


def sanitize(value: Any, depth: int = 0, max_depth: int = 10) -> Any:
    """Sanitize input to prevent log injection and other security issues.
    
    Removes all ASCII control characters (0-31) and Unicode line/paragraph
    separators that could be used for log forging or other injection attacks.
    
    WARNING: This function removes control characters including tabs (\t).
    It is ONLY intended for use in the logging layer via SanitizingFilter.
    DO NOT use this function to sanitize request data or user input directly,
    as it will corrupt legitimate multiline text, tabs, and structured data.
    
    Note: This function is designed for text inputs intended for logging.
    Binary or structured payloads should not be passed through this function
    as they may be corrupted. Use appropriate encoding (e.g., base64) before
    logging binary data.
    
    Args:
        value: The value to sanitize (can be str, dict, list, or other types)
        depth: Current recursion depth (internal use)
        max_depth: Maximum recursion depth to prevent DoS attacks
        
    Returns:
        Sanitized value with control characters removed from strings
    """
    # Prevent DoS from deeply nested structures
    # Return safe placeholder to prevent unsanitized data from being logged
    if depth > max_depth:
        return "[deeply nested structure]"
    
    if isinstance(value, str):
        # Remove all ASCII control characters and Unicode separators using str.translate
        return value.translate(CONTROL_CHARS)
    elif isinstance(value, dict):
        # Recursively sanitize both keys and values
        # Only sanitize keys if they are strings to avoid issues with non-string keys
        return {
            (sanitize(k, depth + 1, max_depth) if isinstance(k, str) else k): 
            sanitize(v, depth + 1, max_depth) 
            for k, v in value.items()
        }
    elif isinstance(value, list):
        # Recursively sanitize list items
        return [sanitize(item, depth + 1, max_depth) for item in value]
    else:
        # Return other types as-is
        return value


class RequestValidator:
    """Comprehensive request validation middleware with error envelope support."""
    
    @staticmethod
    def validate_json_content_type():
        """Validate that request has proper JSON content type for POST/PUT requests."""
        if request.method in ['POST', 'PUT', 'PATCH']:
            if not request.is_json:
                return jsonify({
                    'success': False,
                    'error': {
                        'code': 'INVALID_CONTENT_TYPE',
                        'message': 'Content-Type must be application/json',
                        'details': {'expected': 'application/json', 'received': request.content_type}
                    },
                    'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }), 400
        return None
    
    @staticmethod
    def validate_json_body():
        """Validate that request body contains valid JSON."""
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                # Force JSON parsing to catch malformed JSON early
                if request.data and not request.json:
                    return jsonify({
                        'success': False,
                        'error': {
                            'code': 'INVALID_JSON',
                            'message': 'Request body must contain valid JSON',
                            'details': {'error': 'Malformed JSON syntax'}
                        },
                        'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
                        'timestamp': datetime.utcnow().isoformat() + 'Z'
                    }), 400
            except Exception:
                return jsonify({
                    'success': False,
                    'error': {
                        'code': 'INVALID_JSON',
                        'message': 'Request body must contain valid JSON',
                        'details': {'error': 'JSON parsing failed'}
                    },
                    'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }), 400
        return None
    
    @staticmethod
    def validate_request_size(max_size: int = 1024 * 1024):  # 1MB default
        """Validate request payload size."""
        if request.content_length and request.content_length > max_size:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'PAYLOAD_TOO_LARGE',
                    'message': 'Request payload exceeds maximum allowed size',
                    'details': {
                        'max_size': max_size,
                        'received_size': request.content_length,
                        'size_unit': 'bytes'
                    }
                },
                'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }), 413
        return None


# Legacy validate_schema decorator removed - all routes now use webargs @use_args decorator
# This ensures a single, consistent validation strategy across the entire codebase


# Configure webargs error handler to use our standardized error format
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


def validate_query_params(**param_validators):
    """
    Decorator to validate query parameters with custom validators.
    
    Usage:
        @validate_query_params(
            page=lambda x: int(x) > 0,
            per_page=lambda x: 1 <= int(x) <= 100,
            status=lambda x: x in ['online', 'offline', 'maintenance']
        )
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            errors = {}
            
            for param_name, validator in param_validators.items():
                param_value = request.args.get(param_name)
                if param_value is not None:
                    try:
                        if not validator(param_value):
                            errors[param_name] = f'Invalid value: {param_value}'
                    except Exception as e:
                        errors[param_name] = f'Validation error: {str(e)}'
            
            if errors:
                return jsonify({
                    'success': False,
                    'error': {
                        'code': 'QUERY_PARAM_VALIDATION_ERROR',
                        'message': 'Query parameter validation failed',
                        'details': {'field_errors': errors}
                    },
                    'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def validate_path_params(**param_validators):
    """
    Decorator to validate path parameters with custom validators.
    
    Usage:
        @validate_path_params(
            unit_id=lambda x: len(x) > 0 and x.isalnum(),
            sensor_id=lambda x: x.startswith('sensor_')
        )
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            errors = {}
            
            for param_name, validator in param_validators.items():
                param_value = kwargs.get(param_name)
                if param_value is not None:
                    try:
                        if not validator(param_value):
                            errors[param_name] = f'Invalid value: {param_value}'
                    except Exception as e:
                        errors[param_name] = f'Validation error: {str(e)}'
            
            if errors:
                return jsonify({
                    'success': False,
                    'error': {
                        'code': 'PATH_PARAM_VALIDATION_ERROR',
                        'message': 'Path parameter validation failed',
                        'details': {'field_errors': errors}
                    },
                    'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator