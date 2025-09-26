"""Input validation middleware for ThermaCore SCADA API."""
import json
import uuid
from datetime import datetime
from functools import wraps
from typing import Any, Dict, List, Optional, Callable

from flask import request, jsonify, g
from marshmallow import Schema, ValidationError

from app.utils.error_handler import SecurityAwareErrorHandler


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


def validate_schema(schema_class: Schema, location: str = 'json'):
    """
    Decorator to validate request data against a Marshmallow schema.
    
    Args:
        schema_class: Marshmallow schema class to validate against
        location: Where to find the data ('json', 'query', 'form')
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            schema = schema_class()
            
            # Get data based on location
            if location == 'json':
                data = request.get_json() or {}
            elif location == 'query':
                data = request.args.to_dict()
            elif location == 'form':
                data = request.form.to_dict()
            else:
                return jsonify({
                    'success': False,
                    'error': {
                        'code': 'VALIDATION_CONFIG_ERROR',
                        'message': 'Invalid validation configuration',
                        'details': {'location': location, 'valid_locations': ['json', 'query', 'form']}
                    },
                    'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }), 500
            
            try:
                # Validate and deserialize data
                validated_data = schema.load(data)
                # Store validated data in Flask's g object for route access
                g.validated_data = validated_data
                return f(*args, **kwargs)
            except ValidationError as e:
                return jsonify({
                    'success': False,
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': 'Request data validation failed',
                        'details': {
                            'field_errors': e.messages,
                            'location': location
                        }
                    },
                    'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }), 400
        return decorated_function
    return decorator


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