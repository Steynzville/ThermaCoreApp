"""Rate limiting middleware for ThermaCore SCADA API."""
import time
import uuid
from datetime import datetime
from functools import wraps
from typing import Dict, Optional, Callable, Tuple

from flask import request, jsonify, g, current_app
import redis


class RateLimiter:
    """Redis-based rate limiter with sliding window algorithm."""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self._in_memory_cache = {}  # Fallback when Redis unavailable
        
    def _get_client_key(self, identifier: str) -> str:
        """Generate Redis key for rate limiting."""
        return f"rate_limit:{identifier}"
    
    def _cleanup_memory_cache(self):
        """Clean expired entries from in-memory cache.
        
        Note: Individual rate limit checks already clean their own entries,
        so this method is kept minimal to avoid interference.
        """
        pass
    
    def is_allowed(self, identifier: str, limit: int, window_seconds: int = 60) -> Tuple[bool, Dict]:
        """
        Check if request is allowed based on rate limit.
        
        Args:
            identifier: Unique identifier (IP, user ID, API key, etc.)
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds
            
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        current_time = time.time()
        current_time - window_seconds
        
        try:
            if self.redis_client:
                return self._check_redis_rate_limit(identifier, limit, window_seconds, current_time)
            else:
                return self._check_memory_rate_limit(identifier, limit, window_seconds, current_time)
        except Exception:
            # Fallback to allowing request if rate limiting fails
            return True, {
                'limit': limit,
                'remaining': limit - 1,
                'reset_time': int(current_time + window_seconds),
                'window_seconds': window_seconds,
                'fallback': True
            }
    
    def _check_redis_rate_limit(self, identifier: str, limit: int, window_seconds: int, current_time: float) -> Tuple[bool, Dict]:
        """Check rate limit using Redis sliding window."""
        key = self._get_client_key(identifier)
        pipe = self.redis_client.pipeline()
        
        # Remove old entries and count current requests
        window_start = current_time - window_seconds
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(current_time): current_time})
        pipe.expire(key, window_seconds + 1)
        
        results = pipe.execute()
        current_count = results[1] + 1  # +1 for the request we just added
        
        is_allowed = current_count <= limit
        remaining = max(0, limit - current_count)
        reset_time = int(current_time + window_seconds)
        
        if not is_allowed:
            # Remove the request we added since it's not allowed
            self.redis_client.zrem(key, str(current_time))
        
        return is_allowed, {
            'limit': limit,
            'remaining': remaining,
            'reset_time': reset_time,
            'window_seconds': window_seconds,
            'current_requests': current_count
        }
    
    def _check_memory_rate_limit(self, identifier: str, limit: int, window_seconds: int, current_time: float) -> Tuple[bool, Dict]:
        """Check rate limit using in-memory cache (fallback)."""
        self._cleanup_memory_cache()
        
        key = f"memory:{identifier}"
        window_start = current_time - window_seconds
        
        if key not in self._in_memory_cache:
            self._in_memory_cache[key] = []
        
        # Clean old requests and count current ones
        requests = self._in_memory_cache[key]
        self._in_memory_cache[key] = [req_time for req_time in requests if req_time > window_start]
        
        current_count = len(self._in_memory_cache[key])
        is_allowed = current_count < limit
        
        if is_allowed:
            self._in_memory_cache[key].append(current_time)
            current_count += 1
        
        remaining = max(0, limit - current_count)
        reset_time = int(current_time + window_seconds)
        
        return is_allowed, {
            'limit': limit,
            'remaining': remaining,
            'reset_time': reset_time,
            'window_seconds': window_seconds,
            'current_requests': current_count,
            'fallback': True
        }


# Global rate limiter instance
_rate_limiter = None


def get_rate_limiter() -> RateLimiter:
    """Get or create rate limiter instance."""
    global _rate_limiter
    if _rate_limiter is None:
        try:
            # Try to initialize Redis client
            redis_url = current_app.config.get('REDIS_URL')
            if redis_url:
                redis_client = redis.from_url(redis_url, decode_responses=True)
                redis_client.ping()  # Test connection
                _rate_limiter = RateLimiter(redis_client)
            else:
                _rate_limiter = RateLimiter()
        except Exception:
            # Fallback to memory-based rate limiting
            _rate_limiter = RateLimiter()
    
    return _rate_limiter


def rate_limit(limit: int, window_seconds: int = 60, per: str = 'ip', key_func: Optional[Callable] = None):
    """
    Rate limiting decorator.
    
    Args:
        limit: Maximum requests allowed in window
        window_seconds: Time window in seconds (default: 60)
        per: Rate limiting strategy ('ip', 'user', 'endpoint') 
        key_func: Custom function to generate rate limiting key
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Generate rate limiting identifier
            if key_func:
                identifier = key_func()
            elif per == 'ip':
                identifier = request.remote_addr or 'unknown'
            elif per == 'user':
                # Try to get user from JWT token
                from flask_jwt_extended import get_jwt_identity
                try:
                    identity = get_jwt_identity()
                    identifier = f"user:{identity}" if identity else f"ip:{request.remote_addr}"
                except Exception:
                    identifier = f"ip:{request.remote_addr or 'unknown'}"
            elif per == 'endpoint':
                identifier = f"endpoint:{request.endpoint}:{request.remote_addr or 'unknown'}"
            else:
                identifier = f"custom:{per}:{request.remote_addr or 'unknown'}"
            
            # Check rate limit
            rate_limiter = get_rate_limiter()
            is_allowed, rate_info = rate_limiter.is_allowed(identifier, limit, window_seconds)
            
            if not is_allowed:
                return jsonify({
                    'success': False,
                    'error': {
                        'code': 'RATE_LIMIT_EXCEEDED',
                        'message': 'Rate limit exceeded. Please try again later.',
                        'details': {
                            'limit': rate_info['limit'],
                            'window_seconds': rate_info['window_seconds'],
                            'reset_time': rate_info['reset_time'],
                            'retry_after': rate_info['reset_time'] - int(time.time())
                        }
                    },
                    'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }), 429
            
            # Add rate limit headers to response
            response = f(*args, **kwargs)
            if hasattr(response, 'headers'):
                response.headers['X-RateLimit-Limit'] = str(rate_info['limit'])
                response.headers['X-RateLimit-Remaining'] = str(rate_info['remaining'])
                response.headers['X-RateLimit-Reset'] = str(rate_info['reset_time'])
                response.headers['X-RateLimit-Window'] = str(rate_info['window_seconds'])
                if rate_info.get('fallback'):
                    response.headers['X-RateLimit-Fallback'] = 'true'
            
            return response
        return decorated_function
    return decorator


# Common rate limiting configurations
class RateLimitConfig:
    """Predefined rate limiting configurations."""
    
    # General API limits
    STANDARD = {'limit': 100, 'window_seconds': 60}  # 100 requests per minute
    STRICT = {'limit': 30, 'window_seconds': 60}     # 30 requests per minute  
    RELAXED = {'limit': 300, 'window_seconds': 60}   # 300 requests per minute
    
    # Specific endpoint limits
    AUTH_ENDPOINT = {'limit': 10, 'window_seconds': 60}      # Login attempts
    SEARCH_ENDPOINT = {'limit': 50, 'window_seconds': 60}    # Search queries
    DATA_UPLOAD = {'limit': 20, 'window_seconds': 60}       # Data uploads
    
    # User-specific limits
    FREE_TIER = {'limit': 1000, 'window_seconds': 3600}     # 1000 per hour
    PREMIUM_TIER = {'limit': 10000, 'window_seconds': 3600} # 10000 per hour


# Convenience decorators
def standard_rate_limit(f):
    """Apply standard rate limiting (100 req/min per IP)."""
    return rate_limit(**RateLimitConfig.STANDARD, per='ip')(f)


def auth_rate_limit(f):
    """Apply authentication rate limiting (10 req/min per IP).""" 
    return rate_limit(**RateLimitConfig.AUTH_ENDPOINT, per='ip')(f)


def user_rate_limit(f):
    """Apply user-based rate limiting (1000 req/hour per user)."""
    return rate_limit(**RateLimitConfig.FREE_TIER, per='user')(f)