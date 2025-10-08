"""Input validation decorators for the ThermaCore SCADA API."""
import logging
from functools import wraps

from flask import request, jsonify
from werkzeug.exceptions import BadRequest

logger = logging.getLogger(__name__)


def validate_json_request(f):
    """
    Decorator to validate JSON request data.
    
    Checks for:
    - Empty request data
    - Invalid/malformed JSON
    
    For PATCH requests, allows partial or empty JSON payloads.
    For POST/PUT requests, requires valid non-empty JSON.
    
    Returns consistent 400 error responses for validation failures.
    
    Usage:
        @validate_json_request
        def my_endpoint():
            data = request.json
            # ... process data
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Access request.json - this can raise BadRequest for malformed JSON
            json_data = request.json
            # Allow PATCH requests to have empty/partial JSON for partial updates
            if json_data is None and request.method != 'PATCH':
                return jsonify({'error': 'Request must contain valid JSON data'}), 400
        except BadRequest as err:
            # Handle malformed JSON (e.g., syntax errors)
            logger.warning(f"Bad JSON request in {f.__name__}: {str(err)}")
            # All BadRequest exceptions from JSON parsing are treated as invalid format
            # Empty string with Content-Type: application/json is malformed JSON
            return jsonify({
                'error': 'Invalid JSON format',
                'details': 'Request body must contain valid JSON'
            }), 400
        
        return f(*args, **kwargs)
    
    return decorated_function
