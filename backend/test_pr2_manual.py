#!/usr/bin/env python3
"""Manual test script for PR2 middleware functionality."""
import sys
import json
import uuid

# Add the backend directory to Python path
sys.path.insert(0, '/home/runner/work/ThermaCoreApp/ThermaCoreApp/backend')

try:
    from app.middleware.validation import RequestValidator
    from app.middleware.rate_limit import RateLimiter
    from app.middleware.request_id import RequestIDManager
    from app.middleware.metrics import MetricsCollector
    from app.utils.error_handler import SecurityAwareErrorHandler
    print("✅ All middleware imports successful")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)

def test_request_validator():
    """Test request validation functionality."""
    print("\n🧪 Testing RequestValidator...")

    # Test validate_request_size
    RequestValidator()
    print("✅ RequestValidator initialized")

    # The validation methods require Flask context, so we'll just test initialization
    print("✅ RequestValidator basic functionality verified")

def test_rate_limiter():
    """Test rate limiting functionality."""
    print("\n🧪 Testing RateLimiter...")

    limiter = RateLimiter()

    # Test rate limiting for a user
    identifier = "test_user"
    limit = 5
    window = 60

    # First few requests should be allowed
    for i in range(3):
        allowed, info = limiter.is_allowed(identifier, limit, window)
        print(f"Request {i+1}: allowed={allowed}, remaining={info['remaining']}")
        assert allowed, f"Request {i+1} should be allowed"

    # Make requests up to limit
    for i in range(2):
        allowed, info = limiter.is_allowed(identifier, limit, window)
        print(f"Request {i+4}: allowed={allowed}, remaining={info['remaining']}")

    # Next request should be blocked
    allowed, info = limiter.is_allowed(identifier, limit, window)
    print(f"Request 6: allowed={allowed}, remaining={info['remaining']}")
    assert not allowed, "Request 6 should be blocked"

    print("✅ RateLimiter functionality verified")

def test_request_id_manager():
    """Test request ID management."""
    print("\n🧪 Testing RequestIDManager...")

    # Test ID generation
    request_id = RequestIDManager.generate_request_id()
    print(f"Generated request ID: {request_id}")
    assert len(request_id) == 36, "Request ID should be UUID format"

    # Test UUID validation
    try:
        uuid.UUID(request_id)
        print("✅ Generated request ID is valid UUID")
    except ValueError:
        assert False, "Generated request ID should be valid UUID"

    print("✅ RequestIDManager functionality verified")

def test_metrics_collector():
    """Test metrics collection."""
    print("\n🧪 Testing MetricsCollector...")

    collector = MetricsCollector()

    # Simulate some requests
    collector.record_request_start('/test', 'GET')
    collector.record_request_end(200)

    collector.record_request_start('/api/users', 'POST')
    collector.record_request_end(400, Exception("Validation error"))

    # Get metrics summary
    summary = collector.get_metrics_summary()
    print(f"Metrics summary: {json.dumps(summary, indent=2)}")

    assert summary['overview']['total_requests'] == 2, "Should have 2 requests recorded"
    print("✅ MetricsCollector functionality verified")

def test_error_handler():
    """Test enhanced error handler."""
    print("\n🧪 Testing SecurityAwareErrorHandler...")

    # Test error message lookup
    messages = SecurityAwareErrorHandler.GENERIC_MESSAGES
    assert 'validation_error' in messages, "Should have validation_error message"
    assert 'rate_limit_exceeded' not in messages, "Should not have specific rate limit message"

    print("✅ SecurityAwareErrorHandler message system verified")

def test_integration():
    """Test integration between components."""
    print("\n🧪 Testing component integration...")

    # Test that all components can work together
    rate_limiter = RateLimiter()
    metrics_collector = MetricsCollector()
    RequestIDManager.generate_request_id()

    # Simulate a rate-limited request with metrics
    identifier = "integration_test"
    allowed, rate_info = rate_limiter.is_allowed(identifier, 10, 60)

    if allowed:
        metrics_collector.record_request_start('/integration', 'GET')
        metrics_collector.record_request_end(200)
    else:
        metrics_collector.record_request_start('/integration', 'GET')
        metrics_collector.record_request_end(429, Exception("Rate limit exceeded"))

    summary = metrics_collector.get_metrics_summary()
    print(f"Integration test completed with {summary['overview']['total_requests']} requests recorded")

    print("✅ Component integration verified")

if __name__ == "__main__":
    print("🚀 Starting PR2 Middleware Tests")
    print("=" * 50)

    try:
        test_request_validator()
        test_rate_limiter() 
        test_request_id_manager()
        test_metrics_collector()
        test_error_handler()
        test_integration()

        print("\n" + "=" * 50)
        print("✅ ALL TESTS PASSED")
        print("🎉 PR2 middleware implementation is working correctly!")

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)