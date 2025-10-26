"""Middleware package for ThermaCore SCADA API.

This package contains all middleware components for the PR2 implementation:
- Input validation and sanitization middleware
- Rate limiting middleware
- Request ID tracking middleware
- Metrics collection middleware
- Audit logging middleware (PR3)

These components work together to provide:
- Comprehensive input validation with error envelopes
- Centralized input sanitization to prevent injection attacks
- Rate limiting with Redis or memory fallback
- Request ID tracking across all requests
- Performance metrics collection and monitoring
- Comprehensive audit logging for security events
"""

from .audit import (
    AuditLogger,
    audit_login_failure,
    audit_login_success,
    audit_operation,
    audit_permission_check,
    setup_audit_middleware,
)
from .metrics import (
    MetricsCollector,
    collect_metrics,
    create_metrics_blueprint,
    reset_metrics_collector,
    setup_metrics_middleware,
)
from .rate_limit import (
    RateLimitConfig,
    RateLimiter,
    auth_rate_limit,
    rate_limit,
    standard_rate_limit,
    user_rate_limit,
)
from .request_id import RequestIDManager, setup_request_id_middleware, track_request_id
from .validation import (
    RequestValidator,
    sanitize,
    validate_path_params,
    validate_query_params,
)

__all__ = [
    # Audit Logging
    "AuditLogger",
    # Metrics
    "MetricsCollector",
    "RateLimitConfig",
    # Rate Limiting
    "RateLimiter",
    # Request ID
    "RequestIDManager",
    # Validation
    "RequestValidator",
    "audit_login_failure",
    "audit_login_success",
    "audit_operation",
    "audit_permission_check",
    "auth_rate_limit",
    "collect_metrics",
    "create_metrics_blueprint",
    "rate_limit",
    "reset_metrics_collector",
    "sanitize",
    "setup_audit_middleware",
    "setup_metrics_middleware",
    "setup_request_id_middleware",
    "standard_rate_limit",
    "track_request_id",
    "user_rate_limit",
    "validate_path_params",
    "validate_query_params",
]
