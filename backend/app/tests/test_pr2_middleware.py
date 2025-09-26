"""Tests for PR2 middleware implementations."""
import json
import time
import uuid
from unittest.mock import patch, MagicMock

import pytest
from flask import Flask, request, g

from app.middleware.validation import (
    RequestValidator, validate_schema, validate_query_params, validate_path_params
)
from app.middleware.rate_limit import RateLimiter, rate_limit, get_rate_limiter
from app.middleware.request_id import RequestIDManager, RequestIDFilter, track_request_id
from app.middleware.metrics import MetricsCollector, collect_metrics
from app.utils.error_handler import SecurityAwareErrorHandler


class TestRequestValidator:
    """Test request validation middleware."""
    
    def test_validate_json_content_type_success(self, app):
        """Test successful JSON content type validation."""
        with app.test_request_context('/', method='POST', 
                                    content_type='application/json',
                                    json={}):
            result = RequestValidator.validate_json_content_type()
            assert result is None
    
    def test_validate_json_content_type_failure(self, app):
        """Test failed JSON content type validation."""
        with app.test_request_context('/', method='POST', 
                                    content_type='text/plain'):
            g.request_id = 'test-id'
            result = RequestValidator.validate_json_content_type()
            assert result is not None
            response, status_code = result
            assert status_code == 400
            data = json.loads(response.data)
            assert not data['success']
            assert data['error']['code'] == 'INVALID_CONTENT_TYPE'
    
    def test_validate_request_size_success(self, app):
        """Test successful request size validation."""
        with app.test_request_context('/', method='POST', 
                                    content_length=500):
            result = RequestValidator.validate_request_size(1000)
            assert result is None
    
    def test_validate_request_size_failure(self, app):
        """Test failed request size validation."""
        with app.test_request_context('/', method='POST', 
                                    content_length=2000):
            g.request_id = 'test-id'
            result = RequestValidator.validate_request_size(1000)
            assert result is not None
            response, status_code = result
            assert status_code == 413
            data = json.loads(response.data)
            assert not data['success']
            assert data['error']['code'] == 'PAYLOAD_TOO_LARGE'


class TestRateLimiter:
    """Test rate limiting functionality."""
    
    def test_memory_rate_limiter_allow(self):
        """Test memory-based rate limiter allows requests under limit."""
        limiter = RateLimiter()
        
        # First request should be allowed
        is_allowed, info = limiter.is_allowed('test_user', 5, 60)
        assert is_allowed
        assert info['remaining'] == 4
        assert info['limit'] == 5
        assert info.get('fallback', False)  # Memory limiter is fallback
    
    def test_memory_rate_limiter_block(self):
        """Test memory-based rate limiter blocks requests over limit."""
        limiter = RateLimiter()
        
        # Make requests up to limit
        for i in range(5):
            is_allowed, info = limiter.is_allowed('test_user', 5, 60)
            assert is_allowed
        
        # Next request should be blocked
        is_allowed, info = limiter.is_allowed('test_user', 5, 60)
        assert not is_allowed
        assert info['remaining'] == 0
    
    def test_rate_limit_decorator(self, app):
        """Test rate limiting decorator."""
        @rate_limit(limit=2, window_seconds=60, per='ip')
        def test_route():
            return {'success': True, 'message': 'OK'}
        
        with app.test_request_context('/', environ_base={'REMOTE_ADDR': '127.0.0.1'}):
            g.request_id = 'test-id'
            
            # First two requests should work
            response1 = test_route()
            response2 = test_route()
            
            # Third request should be rate limited
            response3 = test_route()
            assert isinstance(response3, tuple)
            data = json.loads(response3[0].data)
            assert not data['success']
            assert data['error']['code'] == 'RATE_LIMIT_EXCEEDED'


class TestRequestIDManager:
    """Test request ID management."""
    
    def test_generate_request_id(self):
        """Test request ID generation."""
        request_id = RequestIDManager.generate_request_id()
        assert isinstance(request_id, str)
        assert len(request_id) == 36  # UUID4 length
        # Verify it's a valid UUID
        uuid.UUID(request_id)
    
    def test_extract_request_id_from_header(self, app):
        """Test extracting request ID from headers."""
        test_id = str(uuid.uuid4())
        with app.test_request_context('/', headers={'X-Request-ID': test_id}):
            extracted_id = RequestIDManager.extract_request_id()
            assert extracted_id == test_id
    
    def test_extract_request_id_invalid_header(self, app):
        """Test handling invalid request ID in headers."""
        with app.test_request_context('/', headers={'X-Request-ID': 'invalid-uuid'}):
            extracted_id = RequestIDManager.extract_request_id()
            assert extracted_id != 'invalid-uuid'
            # Should generate a new valid UUID
            uuid.UUID(extracted_id)
    
    def test_request_id_filter(self):
        """Test logging filter for request IDs."""
        import logging
        
        filter_obj = RequestIDFilter()
        record = logging.LogRecord(
            name='test', level=logging.INFO, pathname='', lineno=0,
            msg='test message', args=(), exc_info=None
        )
        
        # Without request context
        result = filter_obj.filter(record)
        assert result is True
        assert record.request_id == 'no-request-context'
    
    def test_track_request_id_decorator(self, app):
        """Test request ID tracking decorator."""
        @track_request_id
        def test_route():
            from flask import jsonify
            return jsonify({'message': 'test'})
        
        with app.test_request_context('/'):
            response = test_route()
            # Should have request ID in headers
            assert 'X-Request-ID' in response.headers


class TestMetricsCollector:
    """Test metrics collection functionality."""
    
    def test_metrics_collector_initialization(self):
        """Test metrics collector initialization."""
        collector = MetricsCollector()
        assert collector.max_history == 1000
        assert len(collector.request_count) == 0
        assert len(collector.endpoint_metrics) == 0
    
    def test_record_request_metrics(self, app):
        """Test recording request metrics."""
        collector = MetricsCollector()
        
        with app.test_request_context('/test', method='GET'):
            g.request_id = 'test-id'
            
            # Record request start
            collector.record_request_start('/test', 'GET')
            assert hasattr(g, 'request_start_time')
            assert g.request_endpoint == '/test'
            
            # Simulate some processing time
            time.sleep(0.01)
            
            # Record request end
            collector.record_request_end(200)
            
            # Check metrics were recorded
            key = 'GET /test'
            assert collector.request_count[key] == 1
            assert len(collector.response_times[key]) == 1
            assert collector.status_codes[key][200] == 1
            assert collector.endpoint_metrics[key]['calls'] == 1
    
    def test_get_metrics_summary(self, app):
        """Test getting metrics summary."""
        collector = MetricsCollector()
        
        with app.test_request_context('/test', method='GET'):
            g.request_id = 'test-id'
            collector.record_request_start('/test', 'GET')
            time.sleep(0.01)
            collector.record_request_end(200)
        
        summary = collector.get_metrics_summary()
        assert 'overview' in summary
        assert 'endpoints' in summary
        assert 'top_endpoints' in summary
        assert summary['overview']['total_requests'] == 1
    
    def test_collect_metrics_decorator(self, app):
        """Test metrics collection decorator."""
        collector = MetricsCollector()
        
        @collect_metrics
        def test_route():
            return {'message': 'test'}, 200
        
        with app.test_request_context('/test', method='GET'):
            g.request_id = 'test-id'
            response = test_route()
            
            # Metrics should have been recorded
            key = 'GET None'  # endpoint is None in test context
            assert collector.endpoint_metrics[key]['calls'] == 1


class TestSecurityAwareErrorHandler:
    """Test enhanced error handler with envelope format."""
    
    def test_handle_service_error(self, app):
        """Test service error handling with envelope format."""
        with app.test_request_context('/'):
            g.request_id = 'test-id'
            error = Exception("Test error")
            
            response, status_code = SecurityAwareErrorHandler.handle_service_error(
                error, 'validation_error', 'test context', 400
            )
            
            assert status_code == 400
            data = json.loads(response.data)
            assert not data['success']
            assert data['error']['code'] == 'VALIDATION_ERROR'
            assert data['error']['message'] == SecurityAwareErrorHandler.GENERIC_MESSAGES['validation_error']
            assert data['request_id'] == 'test-id'
            assert 'timestamp' in data
    
    def test_create_success_response(self, app):
        """Test success response creation with envelope format."""
        with app.test_request_context('/'):
            g.request_id = 'test-id'
            data = {'key': 'value'}
            
            response, status_code = SecurityAwareErrorHandler.create_success_response(
                data, 'Test message', 200
            )
            
            assert status_code == 200
            response_data = json.loads(response.data)
            assert response_data['success']
            assert response_data['data'] == data
            assert response_data['message'] == 'Test message'
            assert response_data['request_id'] == 'test-id'
            assert 'timestamp' in response_data


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret'
    return app


def test_integration_middleware_stack(app):
    """Test that all middleware components work together."""
    from app.middleware.request_id import setup_request_id_middleware
    from app.middleware.metrics import setup_metrics_middleware
    
    # Set up middleware
    setup_request_id_middleware(app)
    setup_metrics_middleware(app)
    
    @app.route('/test')
    @rate_limit(limit=10, window_seconds=60)
    @track_request_id
    @collect_metrics
    def test_endpoint():
        return SecurityAwareErrorHandler.create_success_response({'message': 'success'})
    
    with app.test_client() as client:
        response = client.get('/test')
        assert response.status_code == 200
        
        # Check response format
        data = json.loads(response.data)
        assert data['success']
        assert 'request_id' in data
        assert 'timestamp' in data
        
        # Check headers
        assert 'X-Request-ID' in response.headers
        assert 'X-RateLimit-Limit' in response.headers