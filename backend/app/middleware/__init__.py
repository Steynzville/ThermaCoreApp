"""Middleware package for ThermaCore SCADA API.

This package contains all middleware components for the PR2 implementation:
- Input validation middleware
- Rate limiting middleware  
- Request ID tracking middleware
- Metrics collection middleware
- Audit logging middleware (PR3)

These components work together to provide:
- Comprehensive input validation with error envelopes
- Rate limiting with Redis or memory fallback
- Request ID tracking across all requests
- Performance metrics collection and monitoring
- Comprehensive audit logging for security events
"""

from .validation import (
    RequestValidator,
    validate_schema,
    validate_query_params,
    validate_path_params
)

from .rate_limit import (
    RateLimiter,
    rate_limit,
    standard_rate_limit,
    auth_rate_limit,
    user_rate_limit,
    RateLimitConfig
)

from .request_id import (
    RequestIDManager,
    track_request_id,
    setup_request_id_middleware
)

from .metrics import (
    MetricsCollector,
    collect_metrics,
    setup_metrics_middleware,
    create_metrics_blueprint
)

from .audit import (
    AuditLogger,
    audit_operation,
    setup_audit_middleware,
    audit_login_success,
    audit_login_failure,
    audit_permission_check
)

__all__ = [
    # Validation
    'RequestValidator',
    'validate_schema', 
    'validate_query_params',
    'validate_path_params',
    
    # Rate Limiting
    'RateLimiter',
    'rate_limit',
    'standard_rate_limit',
    'auth_rate_limit', 
    'user_rate_limit',
    'RateLimitConfig',
    
    # Request ID
    'RequestIDManager',
    'track_request_id',
    'setup_request_id_middleware',
    
    # Metrics
    'MetricsCollector',
    'collect_metrics',
    'setup_metrics_middleware',
    'create_metrics_blueprint',
    
    # Audit Logging
    'AuditLogger',
    'audit_operation',
    'setup_audit_middleware',
    'audit_login_success',
    'audit_login_failure',
    'audit_permission_check'
]