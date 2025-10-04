"""Example route demonstrating PR2 middleware usage."""
from flask import Blueprint, request, g
from marshmallow import Schema, fields, validate
from webargs.flaskparser import use_args

from app.middleware.validation import validate_query_params
from app.middleware.rate_limit import standard_rate_limit, RateLimitConfig
from app.middleware.request_id import track_request_id
# Note: collect_metrics is deprecated - kept for backward compatibility but not used
from app.middleware.metrics import collect_metrics
from app.utils.error_handler import SecurityAwareErrorHandler


# Example schema for validation
class ExampleRequestSchema(Schema):
    """Example schema showing validation features."""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=True)
    age = fields.Int(validate=validate.Range(min=1, max=150))
    tags = fields.List(fields.Str(), missing=[])


# Create blueprint
example_bp = Blueprint('example', __name__, url_prefix='/api/v1/examples')


@example_bp.route('/comprehensive', methods=['POST'])
@track_request_id
@standard_rate_limit  # 100 requests per minute per IP
@use_args(ExampleRequestSchema, location='json')
@validate_query_params(
    include_meta=lambda x: x.lower() in ['true', 'false'],
    format=lambda x: x in ['json', 'xml']
)
def comprehensive_example(validated_data):
    """
    Comprehensive example showing all PR2 middleware features.
    
    This endpoint demonstrates:
    - Request ID tracking
    - Rate limiting
    - JSON schema validation
    - Query parameter validation  
    - Metrics collection (automatic via middleware)
    - Standardized error envelope responses
    """
    
    # Get query parameters
    include_meta = request.args.get('include_meta', 'false').lower() == 'true'
    format_type = request.args.get('format', 'json')
    
    # Process the request
    result = {
        'processed_data': validated_data,
        'query_params': {
            'include_meta': include_meta,
            'format': format_type
        },
        'processing_info': {
            'request_id': g.request_id,
            'validation_passed': True,
            'rate_limit_check': 'passed'
        }
    }
    
    if include_meta:
        result['meta'] = {
            'api_version': 'v1',
            'middleware_features': [
                'input_validation',
                'rate_limiting', 
                'request_tracking',
                'metrics_collection',
                'error_envelopes'
            ]
        }
    
    # Return success response using standardized envelope
    return SecurityAwareErrorHandler.create_success_response(
        result,
        'Request processed successfully',
        200
    )


@example_bp.route('/rate-limited', methods=['GET'])
@track_request_id
@rate_limit(limit=5, window_seconds=60, per='ip')  # Custom rate limit: 5 per minute
def rate_limited_example():
    """Example with strict rate limiting."""
    return SecurityAwareErrorHandler.create_success_response(
        {
            'message': 'This endpoint has strict rate limiting',
            'limit': '5 requests per minute per IP',
            'request_id': g.request_id
        },
        'Rate limited endpoint accessed',
        200
    )


@example_bp.route('/metrics-demo', methods=['GET', 'POST', 'PUT'])
@track_request_id
@standard_rate_limit
def metrics_demo():
    """Example showing metrics collection for different methods (automatic via middleware)."""
    method = request.method
    
    # Simulate different processing based on method
    if method == 'GET':
        message = 'Data retrieved successfully'
    elif method == 'POST':
        message = 'Data created successfully'
    elif method == 'PUT':
        message = 'Data updated successfully'
    else:
        message = 'Method processed'
    
    return SecurityAwareErrorHandler.create_success_response(
        {
            'method': method,
            'message': message,
            'metrics_note': 'This request is being tracked in the metrics system'
        },
        f'{method} request processed',
        200
    )


@example_bp.route('/validation-demo', methods=['POST'])
@track_request_id
@standard_rate_limit
@use_args(ExampleRequestSchema, location='json')
def validation_demo(validated_data):
    """Example showing comprehensive input validation."""
    
    # The data has already been validated by middleware
    # We can use it safely without additional checks
    
    return SecurityAwareErrorHandler.create_success_response(
        {
            'validated_input': validated_data,
            'validation_details': {
                'schema_used': 'ExampleRequestSchema',
                'validation_middleware': 'validate_schema',
                'validation_status': 'passed'
            }
        },
        'Input validation successful',
        200
    )


# Function to register the example blueprint
def register_example_routes(app):
    """Register example routes with the Flask app."""
    app.register_blueprint(example_bp)
    return app