"""Tests for DNP3 performance optimizations and measurements."""
import pytest
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from app.services.dnp3_service import (
    DNP3Service, DNP3PerformanceMetrics, DNP3ConnectionPool, 
    DNP3DataCache, DNP3Device, DNP3DataPoint, DNP3Reading,
    DNP3DataType, DNP3Quality, dnp3_performance_monitor
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
        assert stats['avg_time'] == 0.2
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


class TestDNP3ConnectionPool:
    """Test DNP3 connection pool functionality."""
    
    def test_connection_pool_initialization(self):
        """Test connection pool initializes correctly."""
        pool = DNP3ConnectionPool(max_connections=5)
        
        assert pool.max_connections == 5
        assert len(pool.connections) == 0
        assert len(pool.connection_usage) == 0
    
    def test_get_connection_new(self):
        """Test getting a new connection."""
        pool = DNP3ConnectionPool(max_connections=5)
        device = DNP3Device(
            device_id='test_device',
            master_address=1,
            outstation_address=10,
            host='localhost',
            port=20000
        )
        
        result = pool.get_connection('test_device', device)
        
        assert result is True
        assert 'test_device' in pool.connections
        assert pool.connection_usage['test_device'] == 1
    
    def test_get_connection_existing(self):
        """Test getting an existing connection."""
        pool = DNP3ConnectionPool(max_connections=5)
        device = DNP3Device(
            device_id='test_device',
            master_address=1,
            outstation_address=10,
            host='localhost',
            port=20000
        )
        
        # First connection
        pool.get_connection('test_device', device)
        initial_usage = pool.connection_usage['test_device']
        
        # Second connection (reuse)
        result = pool.get_connection('test_device', device)
        
        assert result is True
        assert pool.connection_usage['test_device'] == initial_usage + 1
    
    def test_connection_pool_limit(self):
        """Test connection pool enforces maximum connections."""
        pool = DNP3ConnectionPool(max_connections=2)
        
        # Create devices
        devices = []
        for i in range(3):
            devices.append(DNP3Device(
                device_id=f'device_{i}',
                master_address=1,
                outstation_address=10 + i,
                host='localhost',
                port=20000 + i
            ))
        
        # Add connections up to limit
        for i in range(2):
            result = pool.get_connection(f'device_{i}', devices[i])
            assert result is True
        
        assert len(pool.connections) == 2
        
        # Add one more (should remove least used)
        result = pool.get_connection('device_2', devices[2])
        assert result is True
        assert len(pool.connections) == 2  # Still at limit
    
    def test_cleanup_stale_connections(self):
        """Test cleanup of stale connections."""
        pool = DNP3ConnectionPool()
        device = DNP3Device(
            device_id='test_device',
            master_address=1,
            outstation_address=10,
            host='localhost',
            port=20000
        )
        
        # Add connection
        pool.get_connection('test_device', device)
        
        # Simulate old last_used time
        old_time = utc_now() - timedelta(seconds=400)
        pool.connections['test_device']['last_used'] = old_time
        
        # Cleanup
        pool.cleanup_stale_connections(max_idle_time=300.0)
        
        assert 'test_device' not in pool.connections


class TestDNP3DataCache:
    """Test DNP3 data cache functionality."""
    
    def test_cache_initialization(self):
        """Test cache initializes correctly."""
        cache = DNP3DataCache(default_ttl=2.0)
        
        assert cache.default_ttl == 2.0
        assert len(cache.cache) == 0
    
    def test_cache_and_retrieve_reading(self):
        """Test caching and retrieving a reading."""
        cache = DNP3DataCache(default_ttl=60.0)  # Long TTL for test
        
        reading = DNP3Reading(
            index=1,
            data_type=DNP3DataType.ANALOG_INPUT,
            value=25.5,
            quality=DNP3Quality.GOOD,
            timestamp=utc_now(),
            sensor_type='temperature',
            description='Test sensor'
        )
        
        # Cache the reading
        cache.cache_reading('device_1', reading)
        
        # Retrieve it
        retrieved = cache.get_cached_reading('device_1', 1)
        
        assert retrieved is not None
        assert retrieved.value == 25.5
        assert retrieved.sensor_type == 'temperature'
    
    def test_cache_expiration(self):
        """Test cache expiration."""
        cache = DNP3DataCache(default_ttl=0.1)  # Very short TTL
        
        reading = DNP3Reading(
            index=1,
            data_type=DNP3DataType.ANALOG_INPUT,
            value=25.5,
            quality=DNP3Quality.GOOD,
            timestamp=utc_now(),
            sensor_type='temperature',
            description='Test sensor'
        )
        
        # Cache the reading
        cache.cache_reading('device_1', reading)
        
        # Wait for expiration
        time.sleep(0.2)
        
        # Should return None (expired)
        retrieved = cache.get_cached_reading('device_1', 1)
        assert retrieved is None
        
        # Cache should be cleaned up
        assert len(cache.cache) == 0
    
    def test_invalidate_device_cache(self):
        """Test invalidating all cache for a device."""
        cache = DNP3DataCache(default_ttl=60.0)
        
        # Cache multiple readings for different devices
        for device_id in ['device_1', 'device_2']:
            for index in range(3):
                reading = DNP3Reading(
                    index=index,
                    data_type=DNP3DataType.ANALOG_INPUT,
                    value=index * 10,
                    quality=DNP3Quality.GOOD,
                    timestamp=utc_now(),
                    sensor_type='test',
                    description=f'Test {index}'
                )
                cache.cache_reading(device_id, reading)
        
        assert len(cache.cache) == 6
        
        # Invalidate device_1 cache
        cache.invalidate_device_cache('device_1')
        
        # Should have 3 entries left (device_2)
        assert len(cache.cache) == 3
        
        # Verify only device_2 entries remain
        for key in cache.cache.keys():
            assert key[0] == 'device_2'


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