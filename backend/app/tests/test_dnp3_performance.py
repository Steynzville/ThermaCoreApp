"""Tests for DNP3 performance optimizations and measurements."""
import pytest
import time
from datetime import datetime, timedelta
from unittest.mock import patch

from app.services.dnp3_service import (
    DNP3Service, DNP3PerformanceMetrics,
    dnp3_performance_monitor
)
from app.models import utc_now


class TestDNP3PerformanceMetrics:
    """Test DNP3 performance metrics collection."""
    
    def test_metrics_initialization(self):
        """Test that performance metrics initialize correctly."""
        metrics = DNP3PerformanceMetrics()
        
        assert hasattr(metrics, 'operation_times')
        assert hasattr(metrics, 'operation_counts')
        assert hasattr(metrics, 'error_counts')
        assert hasattr(metrics, 'data_throughput')
        assert metrics.max_history == 1000
    
    def test_record_operation_success(self):
        """Test recording successful operations."""
        metrics = DNP3PerformanceMetrics()
        
        metrics.record_operation('test_op', 0.5, True, 10)
        
        assert metrics.operation_counts['test_op'] == 1
        assert len(metrics.operation_times['test_op']) == 1
        assert metrics.operation_times['test_op'][0] == 0.5
        assert metrics.error_counts['test_op'] == 0
        assert len(metrics.data_throughput['test_op']) == 1
        assert metrics.data_throughput['test_op'][0] == 20.0  # 10 points / 0.5s
    
    def test_record_operation_failure(self):
        """Test recording failed operations."""
        metrics = DNP3PerformanceMetrics()
        
        metrics.record_operation('test_op', 1.0, False, 0)
        
        assert metrics.operation_counts['test_op'] == 1
        assert metrics.error_counts['test_op'] == 1
        assert len(metrics.data_throughput['test_op']) == 0  # No data points
    
    def test_get_operation_stats(self):
        """Test getting operation statistics."""
        metrics = DNP3PerformanceMetrics()
        
        # Record several operations
        metrics.record_operation('read_data', 0.1, True, 5)
        metrics.record_operation('read_data', 0.2, True, 10)
        metrics.record_operation('read_data', 0.3, False, 0)
        
        stats = metrics.get_operation_stats('read_data')
        
        assert stats['operation'] == 'read_data'
        assert stats['count'] == 3
        assert stats['errors'] == 1
        assert stats['avg_time'] == pytest.approx(0.2)
        assert stats['min_time'] == 0.1
        assert stats['max_time'] == 0.3
        assert stats['success_rate'] == pytest.approx(66.67, rel=1e-2)
        assert 'avg_throughput' in stats
    
    def test_get_stats_no_data(self):
        """Test getting stats for operations with no data."""
        metrics = DNP3PerformanceMetrics()
        
        stats = metrics.get_operation_stats('nonexistent')
        
        assert 'no_data' in stats
        assert stats['operation'] == 'nonexistent'


class TestDNP3PerformanceMonitor:
    """Test DNP3 performance monitoring decorator."""
    
    def test_performance_monitor_decorator(self):
        """Test that the performance monitor decorator works."""
        
        class TestService:
            def __init__(self):
                self._performance_metrics = DNP3PerformanceMetrics()
            
            @dnp3_performance_monitor('test_operation')
            def test_method(self, data_count=5):
                time.sleep(0.1)  # Simulate work
                return {'total_points': data_count}
        
        service = TestService()
        result = service.test_method(10)
        
        assert result['total_points'] == 10
        
        # Check metrics were recorded
        stats = service._performance_metrics.get_operation_stats('test_operation')
        assert stats['count'] == 1
        assert stats['errors'] == 0
        assert stats['avg_time'] > 0.1  # Should be at least the sleep time
    
    def test_performance_monitor_with_exception(self):
        """Test performance monitor with exceptions."""
        
        class TestService:
            def __init__(self):
                self._performance_metrics = DNP3PerformanceMetrics()
            
            @dnp3_performance_monitor('failing_operation')
            def failing_method(self):
                time.sleep(0.05)
                raise ValueError("Test error")
        
        service = TestService()
        
        with pytest.raises(ValueError):
            service.failing_method()
        
        # Check that error was recorded
        stats = service._performance_metrics.get_operation_stats('failing_operation')
        assert stats['count'] == 1
        assert stats['errors'] == 1
        assert stats['success_rate'] == 0.0


class TestDNP3ServiceOptimizations:
    """Test DNP3Service optimization features."""
    
    def test_service_initialization_with_optimizations(self):
        """Test that DNP3Service initializes with optimization components."""
        service = DNP3Service()
        
        assert hasattr(service, '_performance_metrics')
        assert hasattr(service, '_connection_pool')
        assert hasattr(service, '_data_cache')
        assert service._enable_caching is True
        assert service._enable_bulk_operations is True
    
    def test_enable_disable_optimizations(self):
        """Test enabling/disabling optimization features."""
        service = DNP3Service()
        
        # Disable optimizations
        service.enable_performance_optimizations(caching=False, bulk_operations=False)
        
        assert service._enable_caching is False
        assert service._enable_bulk_operations is False
        
        # Re-enable
        service.enable_performance_optimizations(caching=True, bulk_operations=True)
        
        assert service._enable_caching is True
        assert service._enable_bulk_operations is True
    
    def test_performance_metrics_collection(self):
        """Test that performance metrics are collected correctly."""
        service = DNP3Service()
        service.init_app(None)  # Initialize without Flask app
        
        # Clear metrics for clean test
        service.clear_performance_metrics()
        
        # Get initial metrics
        metrics = service.get_performance_metrics()
        
        assert 'timestamp' in metrics
        assert 'operation_metrics' in metrics
        assert 'connection_pool' in metrics
        assert 'data_cache' in metrics
        assert 'configuration' in metrics
    
    def test_performance_summary(self):
        """Test performance summary generation."""
        service = DNP3Service()
        service.init_app(None)
        
        summary = service.get_performance_summary()
        
        assert 'total_operations' in summary
        assert 'average_response_time_ms' in summary
        assert 'success_rate_percent' in summary
        assert 'performance_optimizations' in summary
        
        # Check optimization flags
        opts = summary['performance_optimizations']
        assert 'caching' in opts
        assert 'bulk_operations' in opts
        assert 'connection_pooling' in opts
    
    @patch('app.services.dnp3_service.utc_now')
    def test_cache_cleanup(self, mock_utc_now):
        """Test that cache cleanup runs periodically."""
        service = DNP3Service()
        
        # Mock time progression
        start_time = datetime(2024, 1, 1, 12, 0, 0)
        mock_utc_now.return_value = start_time
        
        # Initialize last cleanup time
        service._last_cache_cleanup = start_time
        
        # Advance time past cleanup interval
        future_time = start_time + timedelta(seconds=400)  # > 300s interval
        mock_utc_now.return_value = future_time
        
        # This should trigger cleanup
        service._cleanup_cache_if_needed()
        
        # Cleanup time should be updated
        assert service._last_cache_cleanup == future_time


class TestDNP3CachetoolsIntegration:
    """Test DNP3Service cachetools integration (TTLCache usage)."""
    
    def test_connection_pool_uses_ttlcache(self):
        """Test that connection pool uses TTLCache with correct settings."""
        from cachetools import TTLCache
        service = DNP3Service()
        
        assert isinstance(service._connection_pool, TTLCache)
        assert service._connection_pool.maxsize == 20
        assert service._connection_pool.ttl == 300.0  # 5 minutes
    
    def test_data_cache_uses_ttlcache(self):
        """Test that data cache uses TTLCache with correct settings."""
        from cachetools import TTLCache
        service = DNP3Service()
        
        assert isinstance(service._data_cache, TTLCache)
        assert service._data_cache.maxsize == 1024
        assert service._data_cache.ttl == 2.0  # 2 seconds
    
    def test_get_performance_metrics_with_cachetools(self):
        """Test that get_performance_metrics works with cachetools API."""
        service = DNP3Service()
        service.init_master()
        
        # Add a device and connection
        service.add_device('test_device', 1, 10, 'localhost', 20000)
        service.connect_device('test_device')
        service._connection_pool['test_device'] = {
            'connected_at': utc_now(),
            'last_used': utc_now()
        }
        
        # Get metrics - should not raise AttributeError
        metrics = service.get_performance_metrics()
        
        assert 'connection_pool' in metrics
        assert 'active_connections' in metrics['connection_pool']
        assert 'max_connections' in metrics['connection_pool']
        assert 'connection_ttl_seconds' in metrics['connection_pool']
        assert metrics['connection_pool']['max_connections'] == 20
        assert metrics['connection_pool']['connection_ttl_seconds'] == 300.0
        
        assert 'data_cache' in metrics
        assert 'cached_readings' in metrics['data_cache']
        assert 'cache_ttl_seconds' in metrics['data_cache']
        assert 'max_cache_size' in metrics['data_cache']
        assert metrics['data_cache']['cache_ttl_seconds'] == 2.0
        assert metrics['data_cache']['max_cache_size'] == 1024
    
    def test_get_device_performance_stats_with_cachetools(self):
        """Test that get_device_performance_stats works with cachetools API."""
        service = DNP3Service()
        service.init_master()
        
        # Add a device
        service.add_device('test_device', 1, 10, 'localhost', 20000)
        service.connect_device('test_device')
        
        # Add to connection pool and cache
        service._connection_pool['test_device'] = {
            'connected_at': utc_now(),
            'last_used': utc_now()
        }
        service._data_cache[('test_device', 1)] = {'value': 25.5}
        service._data_cache[('test_device', 2)] = {'value': 30.0}
        
        # Get device stats - should not raise AttributeError
        stats = service.get_device_performance_stats('test_device')
        
        assert 'device_id' in stats
        assert 'cached_readings' in stats
        assert stats['cached_readings'] == 2
        assert 'connection_established' in stats
        assert 'connection_last_used' in stats
    
    def test_cache_invalidation_on_disconnect(self):
        """Test that cache is properly invalidated when device disconnects."""
        service = DNP3Service()
        service.init_master()
        
        # Add devices and cache entries
        service.add_device('device1', 1, 10, 'localhost', 20000)
        service.add_device('device2', 1, 11, 'localhost', 20001)
        service.connect_device('device1')
        service.connect_device('device2')
        
        # Add cache entries for both devices
        service._data_cache[('device1', 1)] = {'value': 25.5}
        service._data_cache[('device1', 2)] = {'value': 30.0}
        service._data_cache[('device2', 1)] = {'value': 45.0}
        
        assert len(service._data_cache) == 3
        
        # Disconnect device1
        service.disconnect_device('device1')
        
        # Only device2 cache should remain
        remaining_keys = list(service._data_cache.keys())
        assert len(remaining_keys) == 1
        assert remaining_keys[0] == ('device2', 1)
    
    def test_ttlcache_automatic_expiration(self):
        """Test that TTLCache automatically expires entries."""
        service = DNP3Service()
        
        # Add cache entry
        service._data_cache[('device1', 1)] = {'value': 25.5}
        assert len(service._data_cache) == 1
        
        # Wait for expiration (2 seconds + buffer)
        time.sleep(2.5)
        
        # Cache should be empty due to automatic expiration
        assert len(service._data_cache) == 0
    
    def test_connection_pool_automatic_expiration(self):
        """Test that connection pool TTLCache automatically expires entries."""
        service = DNP3Service()
        
        # Add connection
        service._connection_pool['device1'] = {
            'connected_at': utc_now(),
            'last_used': utc_now()
        }
        assert len(service._connection_pool) == 1
        
        # Connection should stay for a while (TTL is 300 seconds)
        time.sleep(1)
        assert len(service._connection_pool) == 1
        
        # Note: Full 300s expiration test would be too slow for unit tests