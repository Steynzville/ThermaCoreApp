"""Tests for DNP3 cache lookup optimization."""
import pytest
from unittest.mock import Mock, patch
from cachetools import TTLCache

from app.services.dnp3_service import DNP3Service
from app.models import utc_now


class TestDNP3CacheLookupOptimization:
    """Test DNP3 cache lookup optimization using .get() method."""
    
    def test_get_device_performance_stats_uses_get_method(self):
        """Test that get_device_performance_stats uses .get() method for cache lookup."""
        service = DNP3Service()
        service.init_master()
        
        # Add a device
        service.add_device('test_device', 1, 10, 'localhost', 20000)
        service.connect_device('test_device')
        
        # Add to connection pool
        service._connection_pool['test_device'] = {
            'connected_at': utc_now(),
            'last_used': utc_now()
        }
        
        # Get device stats - should use .get() method and not raise errors
        stats = service.get_device_performance_stats('test_device')
        
        assert 'device_id' in stats
        assert 'connection_established' in stats
        assert 'connection_last_used' in stats
    
    def test_get_device_performance_stats_handles_missing_device(self):
        """Test that get_device_performance_stats handles missing device gracefully."""
        service = DNP3Service()
        service.init_master()
        
        # Add a device but don't add to connection pool
        service.add_device('test_device', 1, 10, 'localhost', 20000)
        
        # Get device stats for device not in connection pool
        stats = service.get_device_performance_stats('test_device')
        
        assert 'device_id' in stats
        # Should not have connection info since device not in pool
        assert 'connection_established' not in stats
        assert 'connection_last_used' not in stats
    
    def test_get_device_performance_stats_single_lookup(self):
        """Test that cache lookup is done only once using .get() method."""
        service = DNP3Service()
        service.init_master()
        
        # Add a device
        service.add_device('test_device', 1, 10, 'localhost', 20000)
        
        # Add to connection pool
        test_conn_info = {
            'connected_at': utc_now(),
            'last_used': utc_now()
        }
        service._connection_pool['test_device'] = test_conn_info
        
        # Create a Mock that wraps the original get method
        mock_get = Mock(side_effect=service._connection_pool.get)
        service._connection_pool.get = mock_get
        
        # Get device stats
        stats = service.get_device_performance_stats('test_device')
        
        # Verify .get() was called exactly once for the device_id
        mock_get.assert_called_once_with('test_device')
        assert 'connection_established' in stats
    
    def test_connection_pool_is_ttlcache(self):
        """Test that connection pool uses TTLCache which supports .get() method."""
        service = DNP3Service()
        
        # Verify it's a TTLCache instance
        assert isinstance(service._connection_pool, TTLCache)
        
        # Verify it has .get() method
        assert hasattr(service._connection_pool, 'get')
        assert callable(service._connection_pool.get)
    
    def test_cache_get_with_default_none(self):
        """Test that .get() returns None for non-existent keys."""
        service = DNP3Service()
        
        # Get non-existent key
        result = service._connection_pool.get('non_existent_device')
        
        assert result is None
    
    def test_cache_get_with_existing_key(self):
        """Test that .get() returns value for existing keys."""
        service = DNP3Service()
        
        # Add a value
        test_value = {'connected_at': utc_now()}
        service._connection_pool['test_key'] = test_value
        
        # Get existing key
        result = service._connection_pool.get('test_key')
        
        assert result is not None
        assert result == test_value
