#!/usr/bin/env python3
"""
PR2 Middleware Demo Script

This script demonstrates the new middleware features implemented in PR2:
- Input validation with error envelopes
- Rate limiting with headers
- Request ID tracking
- Metrics collection
- Standardized error responses

Run this script to see examples of the API responses with the new middleware.
"""
import json
from datetime import datetime


def show_examples():
    print("🚀 PR2 Middleware Features Demo")
    print("=" * 60)
    
    print("\n1. ✅ SUCCESS RESPONSE WITH ENVELOPE")
    print("-" * 40)
    success_response = {
        "success": True,
        "data": {
            "user_id": 123,
            "username": "john_doe",
            "email": "john@example.com"
        },
        "message": "User created successfully",
        "request_id": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": "2024-01-20T10:30:45.123Z"
    }
    print(json.dumps(success_response, indent=2))
    
    print("\n2. ❌ VALIDATION ERROR WITH ENVELOPE")
    print("-" * 40)
    validation_error = {
        "success": False,
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "Request data validation failed",
            "details": {
                "field_errors": {
                    "email": ["Not a valid email address"],
                    "age": ["Must be between 1 and 150"]
                },
                "location": "json"
            }
        },
        "request_id": "550e8400-e29b-41d4-a716-446655440001",
        "timestamp": "2024-01-20T10:31:15.456Z"
    }
    print(json.dumps(validation_error, indent=2))
    
    print("\n3. 🚫 RATE LIMIT ERROR WITH ENVELOPE")
    print("-" * 40)
    rate_limit_error = {
        "success": False,
        "error": {
            "code": "RATE_LIMIT_EXCEEDED",
            "message": "Rate limit exceeded. Please try again later.",
            "details": {
                "limit": 100,
                "window_seconds": 60,
                "reset_time": 1705750305,
                "retry_after": 45
            }
        },
        "request_id": "550e8400-e29b-41d4-a716-446655440002",
        "timestamp": "2024-01-20T10:32:00.789Z"
    }
    print(json.dumps(rate_limit_error, indent=2))
    
    print("\n4. 📊 METRICS SUMMARY RESPONSE")
    print("-" * 40)
    metrics_summary = {
        "success": True,
        "data": {
            "overview": {
                "total_requests": 1337,
                "total_endpoints": 15,
                "collection_time": "2024-01-20T10:35:00.000Z"
            },
            "top_endpoints": [
                {
                    "endpoint": "GET /api/v1/units",
                    "calls": 450,
                    "avg_response_time": 0.0234,
                    "error_rate": 2.5,
                    "total_errors": 11
                },
                {
                    "endpoint": "POST /api/v1/auth/login", 
                    "calls": 89,
                    "avg_response_time": 0.1456,
                    "error_rate": 8.9,
                    "total_errors": 8
                }
            ],
            "error_summary": {
                "recent_errors": 5,
                "error_rate_by_endpoint": {
                    "GET /api/v1/units": 2.5,
                    "POST /api/v1/auth/login": 8.9
                }
            }
        },
        "request_id": "550e8400-e29b-41d4-a716-446655440003",
        "timestamp": "2024-01-20T10:35:00.123Z"
    }
    print(json.dumps(metrics_summary, indent=2))
    
    print("\n5. 🔄 HTTP HEADERS WITH NEW FEATURES")
    print("-" * 40)
    headers = {
        "X-Request-ID": "550e8400-e29b-41d4-a716-446655440000",
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "95",
        "X-RateLimit-Reset": "1705750365",
        "X-RateLimit-Window": "60",
        "Content-Type": "application/json"
    }
    
    for header, value in headers.items():
        print(f"{header}: {value}")
    
    print("\n6. 🛠️ MIDDLEWARE FEATURES SUMMARY")
    print("-" * 40)
    features = [
        "✅ Input Validation - Schema-based validation with detailed error messages",
        "✅ Error Envelopes - Consistent error and success response format",
        "✅ Rate Limiting - Redis-backed with memory fallback",
        "✅ Request ID Tracking - UUID generation and automatic logging",
        "✅ Metrics Collection - Performance monitoring with REST API",
        "✅ Query Parameter Validation - Custom validation functions",
        "✅ Path Parameter Validation - Route parameter validation",
        "✅ Request Size Limiting - Configurable payload size limits",
        "✅ Content Type Validation - Automatic JSON validation",
        "✅ Thread-Safe Implementation - Production-ready components"
    ]
    
    for feature in features:
        print(feature)
    
    print("\n7. 🎯 EXAMPLE ROUTE USAGE")
    print("-" * 40)
    example_code = '''
@auth_bp.route('/auth/login', methods=['POST'])
@track_request_id                    # Add request ID to logs and responses
@auth_rate_limit                     # 10 requests per minute rate limit
@validate_schema(LoginSchema)        # Validate JSON against schema
def login():
    data = g.validated_data          # Access validated data from middleware
    
    # Login logic here...
    
    return SecurityAwareErrorHandler.create_success_response(
        token_data, 'Login successful', 200
    )
'''
    print(example_code)
    
    print("\n" + "=" * 60)
    print("🎉 PR2 Implementation Complete!")
    print("All middleware components are ready for production use.")
    print("\nFor full documentation, see: PR2_IMPLEMENTATION_DOCUMENTATION.md")


if __name__ == "__main__":
    show_examples()