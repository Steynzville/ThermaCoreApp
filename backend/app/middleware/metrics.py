"""Metrics collection middleware for ThermaCore SCADA API."""
import time
from datetime import datetime
from collections import defaultdict, deque
from threading import Lock
from typing import Dict, Any, Optional, List, Callable
from functools import wraps

from flask import request, g, current_app, escape
from werkzeug.exceptions import HTTPException

from app.middleware.request_id import RequestIDManager


class MetricsCollector:
    """Thread-safe metrics collector for API performance monitoring."""
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.lock = Lock()
        
        # Core metrics
        self.request_count = defaultdict(int)
        self.response_times = defaultdict(deque)
        self.status_codes = defaultdict(lambda: defaultdict(int))
        self.error_rates = defaultdict(lambda: {'total': 0, 'errors': 0})
        
        # Performance metrics
        self.endpoint_metrics = defaultdict(lambda: {
            'calls': 0,
            'total_time': 0.0,
            'min_time': float('inf'),
            'max_time': 0.0,
            'errors': 0
        })
        
        # Recent activity tracking
        self.recent_requests = deque(maxlen=max_history)
        self.recent_errors = deque(maxlen=100)  # Track last 100 errors
        
    def record_request_start(self, endpoint: str, method: str):
        """Record the start of a request."""
        # Set request-scoped data in Flask's g object (no lock needed - thread-local)
        g.request_start_time = time.time()
        g.request_endpoint = endpoint
        g.request_method = method
        
        # Increment request count (protected by lock - shared state)
        with self.lock:
            key = f"{method} {endpoint}"
            self.request_count[key] += 1
    
    def record_request_end(self, status_code: int, error: Optional[Exception] = None):
        """Record the end of a request."""
        if not hasattr(g, 'request_start_time'):
            return
            
        end_time = time.time()
        duration = end_time - g.request_start_time
        endpoint = getattr(g, 'request_endpoint', 'unknown')
        method = getattr(g, 'request_method', 'unknown')
        
        with self.lock:
            key = f"{method} {endpoint}"
            
            # Record response time
            self.response_times[key].append(duration)
            if len(self.response_times[key]) > self.max_history:
                self.response_times[key].popleft()
            
            # Record status code
            self.status_codes[key][status_code] += 1
            
            # Update error rates
            self.error_rates[key]['total'] += 1
            if status_code >= 400:
                self.error_rates[key]['errors'] += 1
            
            # Update endpoint metrics
            metrics = self.endpoint_metrics[key]
            metrics['calls'] += 1
            metrics['total_time'] += duration
            metrics['min_time'] = min(metrics['min_time'], duration)
            metrics['max_time'] = max(metrics['max_time'], duration)
            if status_code >= 400:
                metrics['errors'] += 1
            
            # Record recent activity
            self.recent_requests.append({
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'endpoint': endpoint,
                'method': method,
                'status_code': status_code,
                'duration': round(duration, 4),
                'request_id': escape(RequestIDManager.get_request_id() or ''),
                'error': str(error) if error else None
            })
            
            # Record errors
            if error:
                self.recent_errors.append({
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'endpoint': endpoint,
                    'method': method,
                    'error': str(error),
                    'error_type': type(error).__name__,
                    'status_code': status_code,
                    'request_id': escape(RequestIDManager.get_request_id() or '')
                })
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get a summary of all collected metrics."""
        with self.lock:
            summary = {
                'overview': {
                    'total_requests': sum(self.request_count.values()),
                    'total_endpoints': len(self.endpoint_metrics),
                    'collection_time': datetime.utcnow().isoformat() + 'Z'
                },
                'endpoints': {},
                'top_endpoints': [],
                'error_summary': {
                    'recent_errors': len(self.recent_errors),
                    'error_rate_by_endpoint': {}
                }
            }
            
            # Calculate endpoint statistics
            endpoint_stats = []
            for key, metrics in self.endpoint_metrics.items():
                if metrics['calls'] > 0:
                    avg_time = metrics['total_time'] / metrics['calls']
                    error_rate = (metrics['errors'] / metrics['calls']) * 100
                    
                    stats = {
                        'endpoint': escape(key),
                        'calls': metrics['calls'],
                        'avg_response_time': round(avg_time, 4),
                        'min_response_time': round(metrics['min_time'], 4),
                        'max_response_time': round(metrics['max_time'], 4),
                        'error_rate': round(error_rate, 2),
                        'total_errors': metrics['errors']
                    }
                    
                    summary['endpoints'][escape(key)] = stats
                    endpoint_stats.append(stats)
                    summary['error_summary']['error_rate_by_endpoint'][escape(key)] = error_rate
            
            # Sort by call count for top endpoints
            summary['top_endpoints'] = sorted(
                endpoint_stats, 
                key=lambda x: x['calls'], 
                reverse=True
            )[:10]
            
            return summary
    
    def get_recent_activity(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent request activity."""
        with self.lock:
            activity_list = list(self.recent_requests)[-limit:]
            # Escape endpoint and error fields in each activity record to prevent XSS
            return [
                {
                    **activity,
                    'endpoint': escape(activity['endpoint']),
                    'error': escape(activity['error']) if activity['error'] else None
                }
                for activity in activity_list
            ]
    
    def get_recent_errors(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent errors."""
        with self.lock:
            errors_list = list(self.recent_errors)[-limit:]
            # Escape endpoint and error fields in each error record to prevent XSS
            return [
                {
                    **error,
                    'endpoint': escape(error['endpoint']),
                    'error': escape(error['error'])
                }
                for error in errors_list
            ]
    
    def get_endpoint_metrics(self, endpoint: str) -> Dict[str, Any]:
        """Get metrics for a specific endpoint."""
        with self.lock:
            if endpoint not in self.endpoint_metrics:
                return {}
            
            metrics = self.endpoint_metrics[endpoint]
            response_times = list(self.response_times.get(endpoint, []))
            
            result = {
                'endpoint': escape(endpoint),
                'calls': metrics['calls'],
                'total_time': round(metrics['total_time'], 4),
                'avg_response_time': round(metrics['total_time'] / metrics['calls'], 4) if metrics['calls'] > 0 else 0,
                'min_response_time': round(metrics['min_time'], 4) if metrics['min_time'] != float('inf') else 0,
                'max_response_time': round(metrics['max_time'], 4),
                'errors': metrics['errors'],
                'error_rate': round((metrics['errors'] / metrics['calls']) * 100, 2) if metrics['calls'] > 0 else 0,
                'status_codes': dict(self.status_codes.get(endpoint, {}))
            }
            
            # Add percentile calculations if we have enough data
            if len(response_times) >= 5:
                sorted_times = sorted(response_times)
                result.update({
                    'p50_response_time': round(self._percentile(sorted_times, 50), 4),
                    'p95_response_time': round(self._percentile(sorted_times, 95), 4),
                    'p99_response_time': round(self._percentile(sorted_times, 99), 4)
                })
            
            return result
    
    @staticmethod
    def _percentile(sorted_data: List[float], percentile: int) -> float:
        """Calculate percentile from sorted data."""
        if not sorted_data:
            return 0.0
        index = (percentile / 100.0) * (len(sorted_data) - 1)
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower = sorted_data[int(index)]
            upper = sorted_data[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))


# Global metrics collector instance
_metrics_collector = None


def get_metrics_collector() -> MetricsCollector:
    """Get or create metrics collector instance."""
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = MetricsCollector()
    return _metrics_collector


def collect_metrics(f: Callable) -> Callable:
    """
    Decorator to collect metrics for route handlers.
    
    DEPRECATED: This decorator is deprecated in favor of the app-level middleware.
    Metrics are automatically collected for all routes via setup_metrics_middleware.
    This decorator is kept for backward compatibility and now acts as a no-op wrapper.
    
    To enable metrics collection, use:
        from app.middleware.metrics import setup_metrics_middleware
        setup_metrics_middleware(app)
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # No-op: Metrics are collected by middleware, not decorator
        # This prevents double-counting when both are used
        return f(*args, **kwargs)
    
    return decorated_function


def setup_metrics_middleware(app):
    """Set up metrics collection middleware for the Flask app."""
    
    @app.before_request
    def before_request():
        """Start metrics collection for request."""
        collector = get_metrics_collector()
        # Use request.path as fallback to ensure consistent endpoint tracking
        endpoint = request.endpoint or request.path
        method = request.method
        collector.record_request_start(endpoint, method)
    
    @app.after_request
    def after_request(response):
        """Store response for teardown_request to access."""
        g.response = response
        return response
    
    @app.teardown_request
    def teardown_request(exc):
        """Complete metrics collection, including errors."""
        collector = get_metrics_collector()
        
        # Get response from g if available (normal requests)
        response = getattr(g, 'response', None)
        
        if exc is not None:
            # Exception occurred - check if it's a Werkzeug HTTPException with a status code
            if isinstance(exc, HTTPException) and exc.code is not None:
                status_code = exc.code
            else:
                # Default to 500 for non-HTTP exceptions
                status_code = 500
            collector.record_request_end(status_code, exc)
        elif response is not None:
            # Normal request with response
            collector.record_request_end(response.status_code)
        # If neither exc nor response, request was likely aborted before after_request
    
    return app


# Metrics endpoint helpers
def create_metrics_blueprint():
    """Create a blueprint with metrics endpoints."""
    from flask import Blueprint
    
    metrics_bp = Blueprint('metrics', __name__, url_prefix='/api/v1/metrics')
    
    @metrics_bp.route('/summary', methods=['GET'])
    def get_metrics_summary():
        """Get comprehensive metrics summary."""
        collector = get_metrics_collector()
        return {
            'success': True,
            'data': collector.get_metrics_summary(),
            'request_id': escape(RequestIDManager.get_request_id() or ''),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    
    @metrics_bp.route('/activity', methods=['GET'])
    def get_recent_activity():
        """Get recent request activity."""
        limit = request.args.get('limit', 50, type=int)
        limit = min(max(1, limit), 100)  # Clamp between 1 and 100
        
        collector = get_metrics_collector()
        return {
            'success': True,
            'data': collector.get_recent_activity(limit),
            'request_id': escape(RequestIDManager.get_request_id() or ''),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    
    @metrics_bp.route('/errors', methods=['GET'])
    def get_recent_errors():
        """Get recent errors."""
        limit = request.args.get('limit', 20, type=int)
        limit = min(max(1, limit), 50)  # Clamp between 1 and 50
        
        collector = get_metrics_collector()
        return {
            'success': True,
            'data': collector.get_recent_errors(limit),
            'request_id': escape(RequestIDManager.get_request_id() or ''),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    
    @metrics_bp.route('/endpoint/<path:endpoint>', methods=['GET'])
    def get_endpoint_metrics(endpoint: str):
        """Get metrics for specific endpoint."""
        collector = get_metrics_collector()
        data = collector.get_endpoint_metrics(endpoint)
        
        if not data:
            return {
                'success': False,
                'error': {
                    'code': 'ENDPOINT_NOT_FOUND',
                    'message': f'No metrics found for endpoint: {escape(endpoint)}'
                },
                'request_id': escape(RequestIDManager.get_request_id() or ''),
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }, 404
        
        return {
            'success': True,
            'data': data,
            'request_id': escape(RequestIDManager.get_request_id() or ''),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    
    return metrics_bp