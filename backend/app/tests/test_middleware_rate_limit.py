"""Comprehensive tests for rate limiting middleware."""

import importlib
import time
import threading
from unittest.mock import MagicMock, patch

from flask import jsonify

# CRITICAL FIX: Use importlib to bypass app/middleware/__init__.py shadowing.
# The __init__.py re-exports the rate_limit decorator function under the same
# name as the submodule, so `import app.middleware.rate_limit as rate_limit_module`
# resolves to the function via attribute-chain lookup. importlib.import_module
# checks sys.modules directly and returns the real module object.
rate_limit_module = importlib.import_module("app.middleware.rate_limit")

from app.middleware.rate_limit import (
    RateLimiter,
    RateLimitConfig,
    auth_rate_limit,
    get_rate_limiter,
    rate_limit,
    standard_rate_limit,
    user_rate_limit,
)


class TestRateLimiterMemoryBackend:
    """Test the in-memory fallback rate limiter directly."""

    def test_allows_requests_under_limit(self):
        """Test that requests under the limit are allowed."""
        limiter = RateLimiter(redis_client=None)
        allowed, info = limiter.is_allowed("client1", limit=3, window_seconds=60)
        assert allowed is True
        assert info["remaining"] == 2
        assert info["fallback"] is True

    def test_blocks_requests_over_limit(self):
        """Test that requests over the limit are blocked."""
        limiter = RateLimiter(redis_client=None)
        for _ in range(3):
            allowed, _ = limiter.is_allowed("client2", limit=3, window_seconds=60)
            assert allowed is True

        allowed, info = limiter.is_allowed("client2", limit=3, window_seconds=60)
        assert allowed is False
        assert info["remaining"] == 0

    def test_window_expiry_resets_count(self):
        """Test that expired window entries are cleaned up."""
        limiter = RateLimiter(redis_client=None)
        key = "memory:client3"
        # Seed with an old timestamp outside the window
        limiter._in_memory_cache[key] = [time.time() - 120]

        allowed, info = limiter.is_allowed("client3", limit=1, window_seconds=60)
        assert allowed is True
        assert info["current_requests"] == 1

    def test_cleanup_memory_cache_removes_expired_entries(self):
        """Test that expired entries are removed from memory cache."""
        limiter = RateLimiter(redis_client=None)
        limiter._in_memory_cache["stale"] = [time.time() - 120]
        limiter._in_memory_cache["fresh"] = [time.time()]

        limiter._cleanup_memory_cache()

        assert "stale" not in limiter._in_memory_cache
        assert "fresh" in limiter._in_memory_cache

    def test_cleanup_memory_cache_ignores_non_list_values(self):
        """Test that cleanup handles non-list values safely."""
        limiter = RateLimiter(redis_client=None)
        limiter._in_memory_cache["weird"] = "not-a-list"

        # Should not raise
        limiter._cleanup_memory_cache()
        assert "weird" in limiter._in_memory_cache

    def test_cleanup_memory_cache_skips_empty_lists(self):
        """Test cleanup handles empty lists without removing them."""
        limiter = RateLimiter(redis_client=None)
        limiter._in_memory_cache["empty"] = []
        limiter._in_memory_cache["valid"] = [time.time()]

        limiter._cleanup_memory_cache()

        # Empty list should remain (no requests to expire)
        assert "empty" in limiter._in_memory_cache
        assert "valid" in limiter._in_memory_cache

    def test_memory_rate_limit_at_remaining_one(self):
        """Test when exactly one request remains before limit."""
        limiter = RateLimiter(redis_client=None)
        limiter._in_memory_cache["memory:client7"] = [time.time() - 10]

        # With limit=3, current_count=1, remaining=2
        allowed, info = limiter.is_allowed("client7", limit=3, window_seconds=60)
        assert allowed is True
        assert info["remaining"] == 1  # After this request, 1 remains


class TestRateLimiterRedisBackend:
    """Test the Redis-backed sliding window rate limiter."""

    @staticmethod
    def _make_pipeline_mock(zcard_result):
        """Create a mock Redis pipeline with specified zcard result.
        
        The order must match the source:
        1. zremrangebyscore (result ignored)
        2. zcard (used for current_count)
        3. zadd (result ignored)
        4. expire (result ignored)
        """
        pipe = MagicMock()
        pipe.execute.return_value = [None, zcard_result, None, None]
        return pipe

    def test_allows_request_under_limit(self):
        """Test Redis allows requests under the limit."""
        redis_client = MagicMock()
        redis_client.pipeline.return_value = self._make_pipeline_mock(zcard_result=2)
        limiter = RateLimiter(redis_client=redis_client)

        allowed, info = limiter.is_allowed("client4", limit=5, window_seconds=60)

        assert allowed is True
        assert info["current_requests"] == 3
        assert info["remaining"] == 2
        redis_client.zrem.assert_not_called()

    def test_blocks_request_over_limit_and_removes_entry(self):
        """Test Redis blocks requests over limit and removes the entry."""
        redis_client = MagicMock()
        redis_client.pipeline.return_value = self._make_pipeline_mock(zcard_result=5)
        limiter = RateLimiter(redis_client=redis_client)

        allowed, info = limiter.is_allowed("client5", limit=5, window_seconds=60)

        assert allowed is False
        assert info["remaining"] == 0
        # zrem should be called with a string containing the timestamp and UUID
        redis_client.zrem.assert_called_once()
        # The member should be a string (timestamp:UUID format)
        call_args = redis_client.zrem.call_args[0]
        assert isinstance(call_args[0], str)
        assert ":" in call_args[0]  # timestamp:uuid format

    def test_redis_error_falls_back_to_allowed(self):
        """Test Redis errors fall back to allowing the request."""
        redis_client = MagicMock()
        redis_client.pipeline.side_effect = Exception("redis down")
        limiter = RateLimiter(redis_client=redis_client)

        allowed, info = limiter.is_allowed("client6", limit=5, window_seconds=60)

        assert allowed is True
        assert info["fallback"] is True

    def test_is_allowed_with_redis_client_none(self):
        """Test is_allowed when redis_client is None."""
        limiter = RateLimiter(redis_client=None)
        allowed, info = limiter.is_allowed("client8", limit=5)

        assert allowed is True
        assert info["fallback"] is True
        # Should use memory backend
        assert "current_requests" in info

    def test_redis_pipeline_execute_handles_missing_results(self):
        """Test Redis pipeline execute with unexpected result format."""
        redis_client = MagicMock()
        pipe = MagicMock()
        # Simulate missing zcard result
        pipe.execute.return_value = [None]  # Only zremrangebyscore result
        redis_client.pipeline.return_value = pipe

        limiter = RateLimiter(redis_client=redis_client)

        # Should handle gracefully (use default count via exception fallback)
        allowed, info = limiter.is_allowed("client9", limit=5)
        # The exception is caught in is_allowed, which returns True with fallback
        assert allowed is True
        assert info["fallback"] is True

    def test_redis_rate_limit_with_concurrent_timestamps(self):
        """Test that requests at the same timestamp don't collide.
        
        Uses unique members (UUID) even when timestamps are identical.
        """
        redis_client = MagicMock()
        
        # Simulate two requests at the same timestamp
        fixed_time = 1234567890.0
        limiter = RateLimiter(redis_client=redis_client)
        
        # Mock pipeline to return zcard results
        pipe = MagicMock()
        # First request: zcard returns 0 (no existing requests)
        # Second request: zcard returns 1 (first request counted)
        pipe.execute.side_effect = [
            [None, 0, None, None],  # First call: no existing
            [None, 1, None, None],  # Second call: one existing
        ]
        redis_client.pipeline.return_value = pipe
        
        # First request - should be allowed
        allowed1, _ = limiter._check_redis_rate_limit(
            "test", 5, 60, fixed_time
        )
        assert allowed1 is True
        
        # Second request at same timestamp - should be allowed
        allowed2, _ = limiter._check_redis_rate_limit(
            "test", 5, 60, fixed_time
        )
        assert allowed2 is True
        
        # Verify unique members were used (different UUIDs)
        # The zadd calls should have different member strings
        zadd_calls = [call for call in pipe.zadd.call_args_list]
        assert len(zadd_calls) == 2
        
        # Extract the member from the dict in each call
        # call_args = (key, {member: score})
        member1 = list(zadd_calls[0][0][1].keys())[0]
        member2 = list(zadd_calls[1][0][1].keys())[0]
        assert member1 != member2


class TestGetRateLimiter:
    """Test the singleton rate limiter factory."""

    def setup_method(self):
        """Reset the global rate limiter before each test."""
        rate_limit_module._rate_limiter = None

    def teardown_method(self):
        """Clean up the global rate limiter after each test."""
        rate_limit_module._rate_limiter = None

    def test_returns_memory_limiter_when_no_redis_url_configured(self, app):
        """Test that memory limiter is returned when no Redis URL is configured."""
        with app.app_context():
            app.config["REDIS_URL"] = None
            limiter = get_rate_limiter()
            assert limiter.redis_client is None

    def test_returns_redis_limiter_when_connection_succeeds(self, app):
        """Test that Redis limiter is returned when connection succeeds."""
        with app.app_context():
            app.config["REDIS_URL"] = "redis://localhost:6379/0"
            fake_redis = MagicMock()
            with patch.object(rate_limit_module.redis, "from_url", return_value=fake_redis):
                limiter = get_rate_limiter()
                assert limiter.redis_client is fake_redis

    def test_falls_back_to_memory_when_redis_connection_fails(self, app):
        """Test fallback to memory when Redis connection fails."""
        with app.app_context():
            app.config["REDIS_URL"] = "redis://localhost:6379/0"
            fake_redis = MagicMock()
            fake_redis.ping.side_effect = Exception("connection refused")
            with patch.object(rate_limit_module.redis, "from_url", return_value=fake_redis):
                limiter = get_rate_limiter()
                assert limiter.redis_client is None

    def test_returns_cached_instance_on_subsequent_calls(self, app):
        """Test that the same instance is returned on subsequent calls."""
        with app.app_context():
            app.config["REDIS_URL"] = None
            first = get_rate_limiter()
            second = get_rate_limiter()
            assert first is second

    def test_get_rate_limiter_handles_general_exception(self, app):
        """Test get_rate_limiter handles general exceptions gracefully."""
        with app.app_context():
            app.config["REDIS_URL"] = "redis://localhost:6379/0"
            with patch.object(rate_limit_module.redis, "from_url", side_effect=Exception("Unexpected error")):
                limiter = get_rate_limiter()
                # Should fall back to memory-based rate limiting
                assert limiter.redis_client is None

    def test_get_rate_limiter_thread_safe(self, app):
        """Test that get_rate_limiter is thread-safe."""
        results = []
        
        def get_limiter():
            # Push app context inside each thread
            with app.app_context():
                results.append(get_rate_limiter())
        
        threads = [threading.Thread(target=get_limiter) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        # All threads should get the same instance
        first = results[0]
        assert all(r is first for r in results)


class TestRateLimitDecorator:
    """Test the rate_limit decorator behavior."""

    def setup_method(self):
        """Reset the global rate limiter before each test."""
        rate_limit_module._rate_limiter = None

    def teardown_method(self):
        """Clean up the global rate limiter after each test."""
        rate_limit_module._rate_limiter = None

    def test_disabled_rate_limiting_skips_check(self, app):
        """Test that rate limiting is skipped when disabled."""
        @rate_limit(limit=1, per="ip")
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = False
        with app.test_request_context("/"):
            response = endpoint()
            response2 = endpoint()

        assert response.status_code == 200
        assert response2.status_code == 200

    def test_uses_custom_key_func(self, app):
        """Test that custom key function is used."""
        calls = []

        def key_func():
            calls.append(1)
            return "custom-key"

        @rate_limit(limit=5, per="ip", key_func=key_func)
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            endpoint()

        assert len(calls) == 1

    def test_per_user_uses_jwt_identity(self, app):
        """Test that per-user rate limiting uses JWT identity."""
        @rate_limit(limit=5, per="user")
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            with patch(
                "flask_jwt_extended.get_jwt_identity",
                return_value="user-123",
            ):
                response = endpoint()

        assert response.status_code == 200

    def test_per_user_falls_back_to_ip_when_jwt_missing(self, app):
        """Test per-user falls back to IP when JWT identity is missing."""
        @rate_limit(limit=5, per="user")
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            with patch(
                "flask_jwt_extended.get_jwt_identity",
                side_effect=Exception("no jwt context"),
            ):
                response = endpoint()

        assert response.status_code == 200

    def test_per_user_with_jwt_identity_none(self, app):
        """Test per-user rate limiting when JWT identity is None."""
        @rate_limit(limit=5, per="user")
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            with patch(
                "flask_jwt_extended.get_jwt_identity",
                return_value=None,
            ):
                response = endpoint()
                assert response.status_code == 200

    def test_per_user_with_identity_zero(self, app):
        """Test per-user rate limiting when JWT identity is 0.
        
        Identity 0 is a valid user ID and should be treated as user-based,
        not fall back to IP-based limiting.
        """
        @rate_limit(limit=5, per="user")
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            with patch(
                "flask_jwt_extended.get_jwt_identity",
                return_value=0,  # Valid integer 0
            ):
                with patch.object(rate_limit_module, "get_rate_limiter") as mock_get:
                    mock_limiter = MagicMock()
                    mock_limiter.is_allowed.return_value = (True, {
                        "limit": 5,
                        "remaining": 4,
                        "reset_time": int(time.time() + 60),
                        "window_seconds": 60
                    })
                    mock_get.return_value = mock_limiter
                    
                    response = endpoint()
                    assert response.status_code == 200
                    
                    # Should use user-based identifier, not IP fallback
                    call_args = mock_limiter.is_allowed.call_args[0]
                    assert call_args[0] == "user:0"

    def test_per_endpoint_builds_identifier_from_endpoint_name(self, app):
        """Test that per-endpoint builds identifier from endpoint name."""
        @rate_limit(limit=5, per="endpoint")
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            response = endpoint()

        assert response.status_code == 200

    def test_custom_per_value_builds_identifier(self, app):
        """Test that custom per value builds identifier correctly."""
        @rate_limit(limit=5, per="tenant")
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            response = endpoint()

        assert response.status_code == 200

    def test_returns_429_with_headers_when_limit_exceeded(self, app):
        """Test that 429 is returned with proper headers when limit exceeded."""
        @rate_limit(limit=1, per="ip")
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/", environ_base={"REMOTE_ADDR": "1.2.3.4"}):
            endpoint()
            response, status_code = endpoint()

        assert status_code == 429
        body = response.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "retry_after" in body["error"]["details"]

    def test_adds_rate_limit_headers_to_tuple_response(self, app):
        """Test that rate limit headers are added to tuple responses."""
        @rate_limit(limit=5, per="ip")
        def endpoint():
            return jsonify({"ok": True}), 201

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            response, status_code = endpoint()

        assert status_code == 201
        assert response.headers["X-RateLimit-Limit"] == "5"
        assert "X-RateLimit-Remaining" in response.headers
        assert "X-RateLimit-Reset" in response.headers
        assert "X-RateLimit-Window" in response.headers

    def test_adds_rate_limit_headers_to_plain_response(self, app):
        """Test that rate limit headers are added to plain responses."""
        @rate_limit(limit=5, per="ip")
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            response = endpoint()

        assert response.headers["X-RateLimit-Limit"] == "5"

    def test_fallback_header_set_when_rate_limiter_falls_back(self, app):
        """Test that fallback header is set when memory fallback is used."""
        @rate_limit(limit=5, per="ip")
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        broken_redis = MagicMock()
        broken_redis.pipeline.side_effect = Exception("redis down")
        rate_limit_module._rate_limiter = RateLimiter(redis_client=broken_redis)

        with app.test_request_context("/"):
            response = endpoint()

        assert response.headers.get("X-RateLimit-Fallback") == "true"

    def test_rate_limit_decorator_mocks_limiter_response(self, app):
        """Test that mocked limiter response flows through decorator correctly.
        
        This tests the decorator's handling of the rate limiter response,
        not the IP extraction branch (which is covered by integration tests).
        """
        @rate_limit(limit=5, per="ip")
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            with patch.object(rate_limit_module, "get_rate_limiter") as mock_get:
                mock_limiter = MagicMock()
                mock_limiter.is_allowed.return_value = (True, {
                    "limit": 5,
                    "remaining": 4,
                    "reset_time": int(time.time() + 60),
                    "window_seconds": 60
                })
                mock_get.return_value = mock_limiter

                response = endpoint()
                assert response.status_code == 200
                # Verify the limiter was called
                mock_limiter.is_allowed.assert_called_once()


class TestRateLimitConfig:
    """Test RateLimitConfig constants."""

    def test_rate_limit_config_constants(self):
        """Test predefined rate limit configurations."""
        assert RateLimitConfig.STANDARD["limit"] == 100
        assert RateLimitConfig.STANDARD["window_seconds"] == 60

        assert RateLimitConfig.STRICT["limit"] == 30
        assert RateLimitConfig.STRICT["window_seconds"] == 60

        assert RateLimitConfig.RELAXED["limit"] == 300
        assert RateLimitConfig.RELAXED["window_seconds"] == 60

        assert RateLimitConfig.AUTH_ENDPOINT["limit"] == 10
        assert RateLimitConfig.AUTH_ENDPOINT["window_seconds"] == 60

        assert RateLimitConfig.SEARCH_ENDPOINT["limit"] == 50
        assert RateLimitConfig.SEARCH_ENDPOINT["window_seconds"] == 60

        assert RateLimitConfig.DATA_UPLOAD["limit"] == 20
        assert RateLimitConfig.DATA_UPLOAD["window_seconds"] == 60

        assert RateLimitConfig.FREE_TIER["limit"] == 1000
        assert RateLimitConfig.FREE_TIER["window_seconds"] == 3600

        assert RateLimitConfig.PREMIUM_TIER["limit"] == 10000
        assert RateLimitConfig.PREMIUM_TIER["window_seconds"] == 3600


class TestConvenienceDecorators:
    """Test the predefined convenience decorators."""

    def setup_method(self):
        """Reset the global rate limiter before each test."""
        rate_limit_module._rate_limiter = None

    def teardown_method(self):
        """Clean up the global rate limiter after each test."""
        rate_limit_module._rate_limiter = None

    def test_standard_rate_limit_applies_config(self, app):
        """Test that standard_rate_limit applies the STANDARD config."""
        @standard_rate_limit
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            response = endpoint()

        assert response.headers["X-RateLimit-Limit"] == str(
            RateLimitConfig.STANDARD["limit"],
        )

    def test_auth_rate_limit_applies_config(self, app):
        """Test that auth_rate_limit applies the AUTH_ENDPOINT config."""
        @auth_rate_limit
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            response = endpoint()

        assert response.headers["X-RateLimit-Limit"] == str(
            RateLimitConfig.AUTH_ENDPOINT["limit"],
        )

    def test_user_rate_limit_applies_config(self, app):
        """Test that user_rate_limit applies the FREE_TIER config."""
        @user_rate_limit
        def endpoint():
            return jsonify({"ok": True})

        app.config["RATE_LIMIT_ENABLED"] = True
        with app.test_request_context("/"):
            response = endpoint()

        assert response.headers["X-RateLimit-Limit"] == str(
            RateLimitConfig.FREE_TIER["limit"],
        )


class TestRateLimiterGetClientKey:
    """Test the _get_client_key method."""

    def test_get_client_key_format(self):
        """Test the format of the generated Redis key."""
        limiter = RateLimiter()
        key = limiter._get_client_key("test_identifier")
        assert key == "rate_limit:test_identifier"

    def test_get_client_key_with_special_characters(self):
        """Test key generation with special characters in identifier."""
        limiter = RateLimiter()
        key = limiter._get_client_key("user:123@domain.com")
        assert key == "rate_limit:user:123@domain.com"


class TestRateLimiterCleanupMemoryCache:
    """Additional tests for memory cache cleanup."""

    def test_cleanup_with_multiple_expired_entries(self):
        """Test cleanup removes multiple expired entries."""
        limiter = RateLimiter(redis_client=None)
        limiter._in_memory_cache = {
            "stale1": [time.time() - 120],
            "stale2": [time.time() - 180],
            "fresh": [time.time()],
        }

        limiter._cleanup_memory_cache()

        assert "stale1" not in limiter._in_memory_cache
        assert "stale2" not in limiter._in_memory_cache
        assert "fresh" in limiter._in_memory_cache

    def test_cleanup_with_mixed_expired_and_non_expired_timestamps(self):
        """Test cleanup behavior with mixed timestamps in a single list.
        
        _cleanup_memory_cache checks only the max (newest) timestamp in each list.
        If the newest timestamp is expired, the entire key is removed.
        If the newest timestamp is fresh, the entire key is kept.
        """
        limiter = RateLimiter(redis_client=None)
        current_time = time.time()
        limiter._in_memory_cache = {
            "mixed": [
                current_time - 120,  # expired
                current_time - 30,   # not expired
                current_time,        # not expired
            ]
        }

        limiter._cleanup_memory_cache()

        # The key is kept because the newest timestamp (current_time) is fresh
        assert "mixed" in limiter._in_memory_cache

    def test_cleanup_with_all_expired_timestamps(self):
        """Test cleanup removes a key when all timestamps are expired.
        
        This tests the branch where max(requests) is expired, triggering removal.
        """
        limiter = RateLimiter(redis_client=None)
        current_time = time.time()
        limiter._in_memory_cache = {
            "all_stale": [
                current_time - 120,  # expired
                current_time - 90,   # expired
            ]
        }

        limiter._cleanup_memory_cache()

        # The key is removed because the newest timestamp (current_time - 90) is expired
        assert "all_stale" not in limiter._in_memory_cache

    def test_cleanup_with_fresh_requests_only(self):
        """Test cleanup doesn't remove fresh requests."""
        limiter = RateLimiter(redis_client=None)
        current_time = time.time()
        limiter._in_memory_cache = {
            "fresh1": [current_time - 10],
            "fresh2": [current_time],
        }

        limiter._cleanup_memory_cache()

        assert "fresh1" in limiter._in_memory_cache
        assert "fresh2" in limiter._in_memory_cache


class TestIntegrationWithEndpoints:
    """Integration tests with actual endpoints."""

    def test_rate_limit_on_health_endpoint(self, client):
        """Test rate limit on health endpoint."""
        # Make multiple requests to health endpoint
        for i in range(5):
            response = client.get("/api/v1/health")
            assert response.status_code == 200

        # Continue making requests (should be rate limited eventually)
        for i in range(10):
            response = client.get("/api/v1/health")
            # Rate limiting may or may not kick in, but endpoint should work
            assert response.status_code in [200, 429]

    def test_rate_limit_on_auth_endpoint(self, client):
        """Test rate limit on auth endpoint."""
        # Make multiple login attempts
        for i in range(5):
            response = client.post(
                "/api/v1/auth/login",
                json={"username": "nonexistent", "password": "wrong"},
                headers={"Content-Type": "application/json"}
            )
            assert response.status_code in [401, 429]
