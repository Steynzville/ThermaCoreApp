"""DNP3 protocol support service for Phase 4 SCADA integration."""
import os
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import time
from functools import wraps
from collections import defaultdict, deque
from threading import Lock, RLock
from cachetools import TTLCache, LRUCache

from app.models import utc_now  # Use timezone-aware datetime

logger = logging.getLogger(__name__)

# Mock DNP3 implementation for demonstration
# In a real implementation, you would use pydnp3 or similar library


class DNP3PerformanceMetrics:
    """Performance metrics tracking for DNP3 operations."""
    
    def __init__(self):
        self.lock = RLock()  # Use RLock to prevent deadlock in get_all_stats
        self.operation_times = defaultdict(deque)  # Track operation response times
        self.operation_counts = defaultdict(int)
        self.error_counts = defaultdict(int)
        self.connection_times = defaultdict(deque)
        self.data_throughput = defaultdict(deque)  # Track data points per second
        self.max_history = 1000
        
    def record_operation(self, operation: str, duration: float, success: bool = True, data_points: int = 0):
        """Record performance metrics for a DNP3 operation."""
        with self.lock:
            self.operation_times[operation].append(duration)
            if len(self.operation_times[operation]) > self.max_history:
                self.operation_times[operation].popleft()
                
            self.operation_counts[operation] += 1
            
            if not success:
                self.error_counts[operation] += 1
                
            if data_points > 0:
                throughput = data_points / duration if duration > 0 else 0
                self.data_throughput[operation].append(throughput)
                if len(self.data_throughput[operation]) > self.max_history:
                    self.data_throughput[operation].popleft()
    
    def get_operation_stats(self, operation: str) -> Dict[str, Any]:
        """Get performance statistics for a specific operation."""
        with self.lock:
            times = list(self.operation_times.get(operation, []))
            if not times:
                return {'operation': operation, 'no_data': True}
            
            throughput_data = list(self.data_throughput.get(operation, []))
            
            stats = {
                'operation': operation,
                'count': self.operation_counts[operation],
                'errors': self.error_counts[operation],
                'avg_time': sum(times) / len(times),
                'min_time': min(times),
                'max_time': max(times),
                'total_time': sum(times),
                'success_rate': (self.operation_counts[operation] - self.error_counts[operation]) / self.operation_counts[operation] * 100
            }
            
            if throughput_data:
                stats.update({
                    'avg_throughput': sum(throughput_data) / len(throughput_data),
                    'max_throughput': max(throughput_data),
                    'min_throughput': min(throughput_data)
                })
            
            return stats
    
    def get_all_stats(self) -> Dict[str, Any]:
        """Get performance statistics for all operations."""
        with self.lock:
            operations = set(self.operation_counts.keys())
            return {op: self.get_operation_stats(op) for op in operations}


def dnp3_performance_monitor(operation_name: str = None):
    """Decorator to monitor DNP3 operation performance."""
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            op_name = operation_name or func.__name__
            start_time = time.time()
            data_points = 0
            success = True
            
            try:
                result = func(self, *args, **kwargs)
                
                # Try to extract data point count from result
                if isinstance(result, dict):
                    if 'total_points' in result:
                        data_points = result['total_points']
                    elif 'readings' in result and isinstance(result['readings'], dict):
                        data_points = len(result['readings'])
                elif isinstance(result, list):
                    data_points = len(result)
                
                return result
            except Exception as e:
                success = False
                raise
            finally:
                duration = time.time() - start_time
                if hasattr(self, '_performance_metrics'):
                    self._performance_metrics.record_operation(
                        op_name, duration, success, data_points
                    )
        return wrapper
    return decorator


class DNP3DataType(Enum):
    """DNP3 data point types."""
    BINARY_INPUT = "binary_input"
    BINARY_OUTPUT = "binary_output"
    ANALOG_INPUT = "analog_input" 
    ANALOG_OUTPUT = "analog_output"
    COUNTER = "counter"
    FROZEN_COUNTER = "frozen_counter"


class DNP3Quality(Enum):
    """DNP3 quality flags."""
    GOOD = "good"
    COMM_LOST = "comm_lost"
    LOCAL_FORCE = "local_force"
    REMOTE_FORCE = "remote_force"
    OVER_RANGE = "over_range"
    REFERENCE_ERR = "reference_err"


@dataclass
class DNP3DataPoint:
    """DNP3 data point configuration."""
    index: int
    data_type: DNP3DataType
    description: str
    sensor_type: str = 'generic'
    scale_factor: float = 1.0
    offset: float = 0.0
    deadband: float = 0.0  # For analog inputs
    unit: str = ''


@dataclass 
class DNP3Device:
    """DNP3 device configuration."""
    device_id: str
    master_address: int
    outstation_address: int
    host: str
    port: int
    link_timeout: float = 5.0
    app_timeout: float = 5.0
    is_connected: bool = False


@dataclass
class DNP3Reading:
    """DNP3 data point reading."""
    index: int
    data_type: DNP3DataType
    value: Any
    quality: DNP3Quality
    timestamp: datetime
    sensor_type: str
    description: str


@dataclass
class DNP3CachedReading:
    """Cached DNP3 reading with timestamp for optimization."""
    reading: DNP3Reading
    cached_at: datetime
    cache_ttl: float = 1.0  # Cache time-to-live in seconds
    
    def is_expired(self) -> bool:
        """Check if the cached reading has expired."""
        return (utc_now() - self.cached_at).total_seconds() > self.cache_ttl


class MockDNP3Master:
    """Mock DNP3 Master implementation with performance optimizations."""
    
    def __init__(self, master_address: int = 1):
        self.master_address = master_address
        self.connected_outstations = {}
        self.data_cache = {}
        self._batch_operations = defaultdict(list)  # For batching operations
        self._last_integrity_poll = {}  # Track last integrity poll time
        
    @dnp3_performance_monitor('add_outstation')
    def add_outstation(self, outstation_address: int, host: str, port: int) -> bool:
        """Add outstation configuration."""
        try:
            outstation_config = {
                'address': outstation_address,
                'host': host,
                'port': port,
                'connected': False,
                'last_poll': None,
                'poll_count': 0,
                'error_count': 0
            }
            
            self.connected_outstations[outstation_address] = outstation_config
            logger.info(f"Added DNP3 outstation {outstation_address} at {host}:{port}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add DNP3 outstation {outstation_address}: {e}")
            return False
    
    @dnp3_performance_monitor('connect_outstation')
    def connect_outstation(self, outstation_address: int) -> bool:
        """Connect to DNP3 outstation with connection pooling."""
        try:
            if outstation_address not in self.connected_outstations:
                logger.error(f"Outstation {outstation_address} not configured")
                return False
            
            # Simulate connection with realistic delay
            import random
            connection_delay = random.uniform(0.1, 0.3)  # Simulate network delay
            time.sleep(connection_delay)
            
            logger.info(f"Connecting to DNP3 outstation {outstation_address}")
            self.connected_outstations[outstation_address]['connected'] = True
            self.connected_outstations[outstation_address]['connected_at'] = utc_now()
            
            # Initialize data cache for this outstation
            if outstation_address not in self.data_cache:
                self.data_cache[outstation_address] = {}
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to DNP3 outstation {outstation_address}: {e}")
            return False
    
    def disconnect_outstation(self, outstation_address: int) -> bool:
        """Disconnect from DNP3 outstation."""
        try:
            if outstation_address in self.connected_outstations:
                self.connected_outstations[outstation_address]['connected'] = False
                logger.info(f"Disconnected from DNP3 outstation {outstation_address}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to disconnect from DNP3 outstation {outstation_address}: {e}")
            return False
    
    @dnp3_performance_monitor('read_binary_inputs')
    def read_binary_inputs(self, outstation_address: int, start_index: int, count: int, _is_bulk: bool = False) -> List[Tuple[int, bool, DNP3Quality]]:
        """Read binary input points with optimized bulk operations."""
        if not self._is_outstation_connected(outstation_address):
            raise ConnectionError(f"Outstation {outstation_address} not connected")
        
        # Simulate network delay only if not part of bulk operation
        if not _is_bulk:
            import random
            network_delay = min(0.05 * (count / 10), 0.5)  # Scale with data size, cap at 0.5s
            time.sleep(network_delay)
        
        # Track polling statistics
        self.connected_outstations[outstation_address]['poll_count'] += 1
        self.connected_outstations[outstation_address]['last_poll'] = utc_now()
        
        readings = []
        for i in range(count):
            index = start_index + i
            # Simulate some realistic binary states with persistence
            cache_key = f"binary_{index}"
            if cache_key in self.data_cache[outstation_address]:
                # Add some variation to cached values
                prev_value = self.data_cache[outstation_address][cache_key]
                value = prev_value if random.random() > 0.1 else not prev_value
            else:
                value = random.choice([True, False])
            
            self.data_cache[outstation_address][cache_key] = value
            quality = DNP3Quality.GOOD
            readings.append((index, value, quality))
        
        logger.debug(f"Read {count} binary inputs from outstation {outstation_address}")
        return readings
    
    @dnp3_performance_monitor('read_analog_inputs')
    def read_analog_inputs(self, outstation_address: int, start_index: int, count: int, _is_bulk: bool = False) -> List[Tuple[int, float, DNP3Quality]]:
        """Read analog input points with optimized bulk operations."""
        if not self._is_outstation_connected(outstation_address):
            raise ConnectionError(f"Outstation {outstation_address} not connected")
        
        # Simulate network delay based on data size
        import random
        network_delay = min(0.08 * (count / 10), 0.8)  # Analog reads are slightly slower
        time.sleep(network_delay)
        
        # Track polling statistics
        self.connected_outstations[outstation_address]['poll_count'] += 1
        self.connected_outstations[outstation_address]['last_poll'] = utc_now()
        
        readings = []
        for i in range(count):
            index = start_index + i
            
            # Use cached values with small variations for more realistic simulation
            cache_key = f"analog_{index}"
            if cache_key in self.data_cache[outstation_address]:
                prev_value = self.data_cache[outstation_address][cache_key]
                # Add small variation (±5%)
                variation = prev_value * 0.05 * (random.random() - 0.5)
                value = max(0, prev_value + variation)
            else:
                # Generate realistic analog values based on index
                if index < 10:  # Temperature sensors
                    value = 20.0 + random.uniform(0, 60)  # 20-80°C
                elif index < 20:  # Pressure sensors
                    value = random.uniform(0, 150)  # 0-150 PSI
                elif index < 30:  # Flow sensors
                    value = random.uniform(0, 100)  # 0-100 L/min
                else:
                    value = random.uniform(0, 1000)  # Generic 0-1000
            
            self.data_cache[outstation_address][cache_key] = value
            quality = DNP3Quality.GOOD
            readings.append((index, round(value, 2), quality))
        
        logger.debug(f"Read {count} analog inputs from outstation {outstation_address}")
        return readings
    
    @dnp3_performance_monitor('read_counters')
    def read_counters(self, outstation_address: int, start_index: int, count: int, _is_bulk: bool = False) -> List[Tuple[int, int, DNP3Quality]]:
        """Read counter points with optimized bulk operations."""
        if not self._is_outstation_connected(outstation_address):
            raise ConnectionError(f"Outstation {outstation_address} not connected")
        
        # Simulate network delay only if not part of bulk operation
        if not _is_bulk:
            import random
            network_delay = min(0.06 * (count / 10), 0.6)
            time.sleep(network_delay)
        
        # Track polling statistics
        self.connected_outstations[outstation_address]['poll_count'] += 1
        self.connected_outstations[outstation_address]['last_poll'] = utc_now()
        
        readings = []
        for i in range(count):
            index = start_index + i
            
            # Counters increment over time
            cache_key = f"counter_{index}"
            if cache_key in self.data_cache[outstation_address]:
                prev_value = self.data_cache[outstation_address][cache_key]
                value = prev_value + random.randint(0, 10)  # Increment
            else:
                value = random.randint(0, 1000000)  # Initial counter value
            
            self.data_cache[outstation_address][cache_key] = value
            quality = DNP3Quality.GOOD
            readings.append((index, value, quality))
        
        logger.debug(f"Read {count} counters from outstation {outstation_address}")
        return readings
    
    def read_bulk_data(self, outstation_address: int, data_groups: Dict[str, Tuple[int, int]]) -> Dict[str, List[Tuple[int, Any, DNP3Quality]]]:
        """Optimized bulk data reading for multiple data types in one call."""
        if not self._is_outstation_connected(outstation_address):
            raise ConnectionError(f"Outstation {outstation_address} not connected")
        
        results = {}
        total_points = sum(count for _, count in data_groups.values())
        
        # Single network round trip for all data
        base_delay = 0.1
        bulk_delay = base_delay + (total_points * 0.002)  # 2ms per point
        time.sleep(bulk_delay)
        
        for data_type, (start_index, count) in data_groups.items():
            if data_type == 'binary_inputs':
                results[data_type] = self.read_binary_inputs(outstation_address, start_index, count, _is_bulk=True)
            elif data_type == 'analog_inputs':
                results[data_type] = self.read_analog_inputs(outstation_address, start_index, count, _is_bulk=True)
            elif data_type == 'counters':
                results[data_type] = self.read_counters(outstation_address, start_index, count, _is_bulk=True)
        
        logger.info(f"Bulk read {total_points} data points from outstation {outstation_address}")
        return results
    
    def write_binary_output(self, outstation_address: int, index: int, value: bool) -> bool:
        """Write binary output point."""
        if not self._is_outstation_connected(outstation_address):
            raise ConnectionError(f"Outstation {outstation_address} not connected")
        
        logger.info(f"Writing binary output {index} = {value} to outstation {outstation_address}")
        # Simulate write operation
        return True
    
    def write_analog_output(self, outstation_address: int, index: int, value: float) -> bool:
        """Write analog output point."""
        if not self._is_outstation_connected(outstation_address):
            raise ConnectionError(f"Outstation {outstation_address} not connected")
        
        logger.info(f"Writing analog output {index} = {value} to outstation {outstation_address}")
        # Simulate write operation
        return True
    
    def perform_integrity_poll(self, outstation_address: int) -> bool:
        """Perform integrity poll (read all data)."""
        if not self._is_outstation_connected(outstation_address):
            raise ConnectionError(f"Outstation {outstation_address} not connected")
        
        logger.info(f"Performing integrity poll on outstation {outstation_address}")
        self.connected_outstations[outstation_address]['last_poll'] = utc_now()
        return True
    
    def _is_outstation_connected(self, outstation_address: int) -> bool:
        """Check if outstation is connected."""
        return (outstation_address in self.connected_outstations and
                self.connected_outstations[outstation_address]['connected'])


class DNP3Service:
    """DNP3 protocol service with performance optimizations for SCADA communication."""
    
    def __init__(self, app=None):
        """Initialize DNP3 service with performance monitoring."""
        self._app = app
        self._devices: Dict[str, DNP3Device] = {}
        self._master: Optional[MockDNP3Master] = None
        self._data_point_configs: Dict[str, List[DNP3DataPoint]] = {}
        self._last_readings: Dict[str, List[DNP3Reading]] = {}
        
        # Performance optimization components using cachetools
        self._performance_metrics = DNP3PerformanceMetrics()
        # LRUCache for connection pool with max 20 connections
        self._connection_pool = LRUCache(maxsize=20)
        # TTLCache for data cache with 2-second TTL and max 1024 entries
        self._data_cache = TTLCache(maxsize=1024, ttl=2.0)
        self._cache_lock = RLock()  # Lock for thread-safe cache access
        
        # Performance configuration
        self._enable_caching = True
        self._enable_bulk_operations = True
        self._cache_cleanup_interval = 300  # 5 minutes (not needed with TTLCache)
        self._last_cache_cleanup = utc_now()
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize with Flask app."""
        self._app = app
        self._master = MockDNP3Master()
        # Give the master access to the performance metrics
        self._master._performance_metrics = self._performance_metrics
        logger.info("DNP3 service initialized with performance monitoring")
    
    def init_master(self, master_address: int = 1):
        """Initialize DNP3 master with specified address."""
        self._master = MockDNP3Master(master_address)
        self._master._performance_metrics = self._performance_metrics
        logger.info(f"DNP3 master initialized with address {master_address}")
    
    @dnp3_performance_monitor('add_device')
    def add_device(self, device_id: str, master_address: int, outstation_address: int,
                   host: str, port: int = 20000, link_timeout: float = 5.0,
                   app_timeout: float = 5.0) -> bool:
        """Add DNP3 device configuration with connection pooling."""
        try:
            device = DNP3Device(
                device_id=device_id,
                master_address=master_address,
                outstation_address=outstation_address,
                host=host,
                port=port,
                link_timeout=link_timeout,
                app_timeout=app_timeout
            )
            
            self._devices[device_id] = device
            
            # Add outstation to master
            if self._master:
                success = self._master.add_outstation(outstation_address, host, port)
                if not success:
                    return False
            
            logger.info(f"Added DNP3 device: {device_id} (outstation {outstation_address} at {host}:{port})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add DNP3 device {device_id}: {e}")
            return False
    
    def remove_device(self, device_id: str) -> bool:
        """Remove DNP3 device."""
        try:
            if device_id in self._devices:
                device = self._devices[device_id]
                
                # Disconnect from outstation
                if self._master:
                    self._master.disconnect_outstation(device.outstation_address)
                
                del self._devices[device_id]
                
            if device_id in self._data_point_configs:
                del self._data_point_configs[device_id]
                
            if device_id in self._last_readings:
                del self._last_readings[device_id]
            
            logger.info(f"Removed DNP3 device: {device_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to remove DNP3 device {device_id}: {e}")
            return False
    
    @dnp3_performance_monitor('connect_device')
    def connect_device(self, device_id: str) -> bool:
        """Connect to DNP3 device with connection pooling."""
        try:
            if device_id not in self._devices:
                logger.error(f"Device {device_id} not configured")
                return False
            
            device = self._devices[device_id]
            
            if not self._master:
                logger.error("DNP3 master not initialized")
                return False
            
            # Use LRUCache-based connection pool
            connection_info = {
                'device_info': device,
                'connected_at': utc_now(),
                'last_used': utc_now()
            }
            self._connection_pool[device_id] = connection_info
            
            success = self._master.connect_outstation(device.outstation_address)
            
            if success:
                device.is_connected = True
                logger.info(f"Connected to DNP3 device: {device_id}")
            else:
                # Remove from pool on failure
                self._connection_pool.pop(device_id, None)
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to connect to DNP3 device {device_id}: {e}")
            return False
    
    @dnp3_performance_monitor('disconnect_device')
    def disconnect_device(self, device_id: str) -> bool:
        """Disconnect from DNP3 device with connection pool cleanup."""
        try:
            if device_id in self._devices:
                device = self._devices[device_id]
                
                if self._master:
                    self._master.disconnect_outstation(device.outstation_address)
                
                device.is_connected = False
                
                # Clean up connection pool
                self._connection_pool.pop(device_id, None)
                
                # Invalidate device cache
                with self._cache_lock:
                    keys_to_remove = [key for key in self._data_cache.keys() if key[0] == device_id]
                    for key in keys_to_remove:
                        self._data_cache.pop(key, None)
            
            logger.info(f"Disconnected from DNP3 device: {device_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to disconnect from DNP3 device {device_id}: {e}")
            return False
    
    def add_data_point_config(self, device_id: str, data_points: List[Dict[str, Any]]) -> bool:
        """Add data point configuration for a device."""
        try:
            if device_id not in self._devices:
                logger.error(f"Device {device_id} not configured")
                return False
            
            point_configs = []
            for point_config in data_points:
                data_point = DNP3DataPoint(
                    index=point_config['index'],
                    data_type=DNP3DataType(point_config['data_type']),
                    description=point_config.get('description', f"Point {point_config['index']}"),
                    sensor_type=point_config.get('sensor_type', 'generic'),
                    scale_factor=point_config.get('scale_factor', 1.0),
                    offset=point_config.get('offset', 0.0),
                    deadband=point_config.get('deadband', 0.0),
                    unit=point_config.get('unit', '')
                )
                point_configs.append(data_point)
            
            self._data_point_configs[device_id] = point_configs
            logger.info(f"Added {len(point_configs)} data point configs for device {device_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add data point config for device {device_id}: {e}")
            return False
    
    @dnp3_performance_monitor('read_device_data')
    def read_device_data(self, device_id: str) -> Dict[str, Any]:
        """Read data from all configured data points with optimization and caching."""
        try:
            # Clean up cache if needed
            self._cleanup_cache_if_needed()
            
            if device_id not in self._devices:
                raise ValueError(f"Device {device_id} not configured")
                
            device = self._devices[device_id]
            if not device.is_connected:
                raise ConnectionError(f"Device {device_id} not connected")
            
            if device_id not in self._data_point_configs:
                raise ValueError(f"No data point configuration for device {device_id}")
            
            if not self._master:
                raise RuntimeError("DNP3 master not initialized")
            
            data_points = self._data_point_configs[device_id]
            readings = []
            timestamp = utc_now()
            
            # Try cache first if enabled
            cached_readings = []
            if self._enable_caching:
                uncached_points = []
                
                with self._cache_lock:
                    for dp in data_points:
                        cache_key = (device_id, dp.index)
                        if cache_key in self._data_cache:
                            cached_reading = self._data_cache[cache_key]
                            cached_readings.append(cached_reading)
                        else:
                            uncached_points.append(dp)
                
                readings.extend(cached_readings)
                data_points = uncached_points  # Only read uncached data
                
                if cached_readings:
                    logger.debug(f"Using {len(cached_readings)} cached readings for device {device_id}")
            
            if data_points:  # Only read if there are uncached data points
                # Group data points by type for efficient bulk reading
                binary_inputs = [dp for dp in data_points if dp.data_type == DNP3DataType.BINARY_INPUT]
                analog_inputs = [dp for dp in data_points if dp.data_type == DNP3DataType.ANALOG_INPUT]
                counters = [dp for dp in data_points if dp.data_type == DNP3DataType.COUNTER]
                
                # Use bulk operations if enabled and available
                if self._enable_bulk_operations and hasattr(self._master, 'read_bulk_data'):
                    try:
                        data_groups = {}
                        if binary_inputs:
                            indices = [dp.index for dp in binary_inputs]
                            data_groups['binary_inputs'] = (min(indices), max(indices) - min(indices) + 1)
                        if analog_inputs:
                            indices = [dp.index for dp in analog_inputs]
                            data_groups['analog_inputs'] = (min(indices), max(indices) - min(indices) + 1)
                        if counters:
                            indices = [dp.index for dp in counters]
                            data_groups['counters'] = (min(indices), max(indices) - min(indices) + 1)
                        
                        # Single bulk read operation
                        bulk_results = self._master.read_bulk_data(device.outstation_address, data_groups)
                        
                        # Process bulk results
                        for data_type, raw_readings in bulk_results.items():
                            if data_type == 'binary_inputs':
                                target_points = binary_inputs
                            elif data_type == 'analog_inputs':
                                target_points = analog_inputs
                            else:  # counters
                                target_points = counters
                            
                            for dp in target_points:
                                for index, value, quality in raw_readings:
                                    if index == dp.index:
                                        # Apply scaling and offset for analog inputs
                                        if dp.data_type == DNP3DataType.ANALOG_INPUT:
                                            processed_value = (value * dp.scale_factor) + dp.offset
                                        else:
                                            processed_value = value
                                        
                                        reading = DNP3Reading(
                                            index=index,
                                            data_type=dp.data_type,
                                            value=processed_value,
                                            quality=quality,
                                            timestamp=timestamp,
                                            sensor_type=dp.sensor_type,
                                            description=dp.description
                                        )
                                        readings.append(reading)
                                        break
                    except Exception as e:
                        logger.error(f"Bulk operations failed for device {device_id}: {e}")
                        readings = []  # Clear and fall back to individual reads
                
                # Fallback to individual reads if bulk operations are disabled or failed
                if not readings or not self._enable_bulk_operations:
                    # Read binary inputs
                    if binary_inputs:
                        # Create lookup dictionary for efficient index-based access
                        binary_lookup = {dp.index: dp for dp in binary_inputs}
                        indices = [dp.index for dp in binary_inputs]
                        start_index = min(indices)
                        count = max(indices) - start_index + 1
                        
                        binary_readings = self._master.read_binary_inputs(
                            device.outstation_address, start_index, count
                        )
                        
                        for index, value, quality in binary_readings:
                            # Use dictionary lookup instead of nested loop
                            if index in binary_lookup:
                                dp = binary_lookup[index]
                                reading = DNP3Reading(
                                    index=index,
                                    data_type=dp.data_type,
                                    value=value,
                                    quality=quality,
                                    timestamp=timestamp,
                                    sensor_type=dp.sensor_type,
                                    description=dp.description
                                )
                                readings.append(reading)
                    
                    # Read analog inputs
                    if analog_inputs:
                        # Create lookup dictionary for efficient index-based access
                        analog_lookup = {dp.index: dp for dp in analog_inputs}
                        indices = [dp.index for dp in analog_inputs]
                        start_index = min(indices)
                        count = max(indices) - start_index + 1
                        
                        analog_readings = self._master.read_analog_inputs(
                            device.outstation_address, start_index, count
                        )
                        
                        for index, raw_value, quality in analog_readings:
                            # Use dictionary lookup instead of nested loop
                            if index in analog_lookup:
                                dp = analog_lookup[index]
                                # Apply scaling and offset
                                processed_value = (raw_value * dp.scale_factor) + dp.offset
                                
                                reading = DNP3Reading(
                                    index=index,
                                    data_type=dp.data_type,
                                    value=processed_value,
                                    quality=quality,
                                    timestamp=timestamp,
                                    sensor_type=dp.sensor_type,
                                    description=dp.description
                                )
                                readings.append(reading)
                    
                    # Read counters
                    if counters:
                        # Create lookup dictionary for efficient index-based access
                        counter_lookup = {dp.index: dp for dp in counters}
                        indices = [dp.index for dp in counters]
                        start_index = min(indices)
                        count = max(indices) - start_index + 1
                        
                        counter_readings = self._master.read_counters(
                            device.outstation_address, start_index, count
                        )
                        
                        for index, value, quality in counter_readings:
                            # Use dictionary lookup instead of nested loop
                            if index in counter_lookup:
                                dp = counter_lookup[index]
                                reading = DNP3Reading(
                                    index=index,
                                    data_type=dp.data_type,
                                    value=value,
                                    quality=quality,
                                    timestamp=timestamp,
                                    sensor_type=dp.sensor_type,
                                    description=dp.description
                                )
                                readings.append(reading)
                
                # Cache the new readings if enabled
                if self._enable_caching and readings:
                    # Efficiently identify new readings using set of cached indices
                    cached_indices = {r.index for r in cached_readings}
                    new_readings = [r for r in readings if r.index not in cached_indices]
                    if new_readings:
                        with self._cache_lock:
                            for reading in new_readings:
                                cache_key = (device_id, reading.index)
                                self._data_cache[cache_key] = reading
            
            # Store last readings
            self._last_readings[device_id] = readings
            
            # Convert readings to dictionary format
            readings_dict = {}
            for reading in readings:
                reading_key = f"{reading.sensor_type}_{reading.index}"
                readings_dict[reading_key] = {
                    'index': reading.index,
                    'data_type': reading.data_type.value,
                    'sensor_type': reading.sensor_type,
                    'description': reading.description,
                    'value': reading.value,
                    'quality': reading.quality.value,
                    'timestamp': reading.timestamp.isoformat()
                }
            
            return {
                'device_id': device_id,
                'outstation_address': device.outstation_address,
                'timestamp': timestamp.isoformat(),
                'readings': readings_dict,
                'total_points': len(readings),
                'success': True
            }
            
        except Exception as e:
            logger.error(f"Failed to read device data for {device_id}: {e}")
            return {
                'device_id': device_id,
                'timestamp': utc_now().isoformat(),
                'readings': {},
                'success': False,
                'error': str(e)
            }
    
    def write_data_point(self, device_id: str, index: int, data_type: str, value: Any) -> bool:
        """Write value to a specific data point."""
        try:
            if device_id not in self._devices:
                raise ValueError(f"Device {device_id} not configured")
                
            device = self._devices[device_id]
            if not device.is_connected:
                raise ConnectionError(f"Device {device_id} not connected")
            
            if not self._master:
                raise RuntimeError("DNP3 master not initialized")
            
            if data_type == DNP3DataType.BINARY_OUTPUT.value:
                success = self._master.write_binary_output(
                    device.outstation_address, index, bool(value)
                )
            elif data_type == DNP3DataType.ANALOG_OUTPUT.value:
                success = self._master.write_analog_output(
                    device.outstation_address, index, float(value)
                )
            else:
                raise ValueError(f"Cannot write to data type: {data_type}")
            
            if success:
                logger.info(f"Successfully wrote {value} to {data_type} index {index} on device {device_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to write data point on device {device_id}: {e}")
            return False
    
    def perform_integrity_poll(self, device_id: str) -> bool:
        """Perform integrity poll on device (read all data)."""
        try:
            if device_id not in self._devices:
                raise ValueError(f"Device {device_id} not configured")
                
            device = self._devices[device_id]
            if not device.is_connected:
                raise ConnectionError(f"Device {device_id} not connected")
            
            if not self._master:
                raise RuntimeError("DNP3 master not initialized")
            
            success = self._master.perform_integrity_poll(device.outstation_address)
            
            if success:
                logger.info(f"Performed integrity poll on device {device_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to perform integrity poll on device {device_id}: {e}")
            return False
    
    def _cleanup_cache_if_needed(self):
        """Clean up stale connections periodically."""
        # TTLCache automatically handles cache expiration, so we only need to clean up connections
        now = utc_now()
        if (now - self._last_cache_cleanup).total_seconds() > self._cache_cleanup_interval:
            # Clean up stale connections that haven't been used recently
            max_idle_time = 300.0  # 5 minutes
            stale_devices = []
            for device_id, conn_info in list(self._connection_pool.items()):
                if 'last_used' in conn_info:
                    idle_time = (now - conn_info['last_used']).total_seconds()
                    if idle_time > max_idle_time:
                        stale_devices.append(device_id)
            
            for device_id in stale_devices:
                self._connection_pool.pop(device_id, None)
                logger.debug(f"Cleaned up stale connection for device {device_id}")
            
            self._last_cache_cleanup = now
            if stale_devices:
                logger.debug(f"Performed DNP3 connection cleanup, removed {len(stale_devices)} connections")
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics for DNP3 operations."""
        metrics = self._performance_metrics.get_all_stats()
        
        # Add connection pool stats
        pool_stats = {
            'active_connections': len(self._connection_pool.connections),
            'max_connections': self._connection_pool.max_connections,
            'connection_usage': dict(self._connection_pool.connection_usage)
        }
        
        # Add cache stats
        cache_stats = {
            'cached_readings': len(self._data_cache.cache),
            'cache_ttl': self._data_cache.default_ttl,
            'cache_enabled': self._enable_caching
        }
        
        # Add device-specific stats
        device_stats = {}
        for device_id, device in self._devices.items():
            if hasattr(device, 'is_connected') and device.is_connected:
                device_stats[device_id] = {
                    'connected': device.is_connected,
                    'outstation_address': device.outstation_address,
                    'data_points_configured': len(self._data_point_configs.get(device_id, [])),
                    'last_readings_count': len(self._last_readings.get(device_id, []))
                }
        
        return {
            'timestamp': utc_now().isoformat(),
            'operation_metrics': metrics,
            'connection_pool': pool_stats,
            'data_cache': cache_stats,
            'devices': device_stats,
            'configuration': {
                'bulk_operations_enabled': self._enable_bulk_operations,
                'caching_enabled': self._enable_caching,
                'cache_cleanup_interval': self._cache_cleanup_interval
            }
        }
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get a summary of key performance metrics."""
        metrics = self._performance_metrics.get_all_stats()
        
        # Calculate overall averages
        total_ops = sum(stat.get('count', 0) for stat in metrics.values() if 'count' in stat)
        avg_response_time = 0
        total_errors = 0
        
        if metrics:
            # Use weighted average based on operation count for more accurate metrics
            total_weighted_time = 0
            total_weight = 0
            for stat in metrics.values():
                if 'avg_time' in stat and 'count' in stat:
                    count = stat.get('count', 0)
                    avg_time = stat.get('avg_time', 0)
                    total_weighted_time += avg_time * count
                    total_weight += count
            
            avg_response_time = total_weighted_time / total_weight if total_weight > 0 else 0
            total_errors = sum(stat.get('errors', 0) for stat in metrics.values() if 'errors' in stat)
        
        success_rate = ((total_ops - total_errors) / total_ops * 100) if total_ops > 0 else 100
        
        return {
            'total_operations': total_ops,
            'average_response_time_ms': round(avg_response_time * 1000, 2),
            'success_rate_percent': round(success_rate, 2),
            'total_errors': total_errors,
            'active_devices': len([d for d in self._devices.values() if d.is_connected]),
            'cached_readings': len(self._data_cache.cache),
            'performance_optimizations': {
                'caching': self._enable_caching,
                'bulk_operations': self._enable_bulk_operations,
                'connection_pooling': True
            }
        }
    
    def enable_performance_optimizations(self, caching: bool = True, bulk_operations: bool = True):
        """Enable or disable performance optimization features."""
        self._enable_caching = caching
        self._enable_bulk_operations = bulk_operations
        logger.info(f"DNP3 performance optimizations updated: caching={caching}, bulk_ops={bulk_operations}")
    
    def clear_performance_metrics(self):
        """Clear all performance metrics (useful for testing)."""
        self._performance_metrics = DNP3PerformanceMetrics()
        if self._master:
            self._master._performance_metrics = self._performance_metrics
        logger.info("DNP3 performance metrics cleared")
    
    def get_device_performance_stats(self, device_id: str) -> Dict[str, Any]:
        """Get performance statistics for a specific device."""
        if device_id not in self._devices:
            return {'error': f'Device {device_id} not found'}
        
        device = self._devices[device_id]
        stats = {
            'device_id': device_id,
            'connected': device.is_connected,
            'outstation_address': device.outstation_address,
            'host': device.host,
            'port': device.port
        }
        
        # Get cached readings for this device
        device_cache_count = len([key for key in self._data_cache.cache.keys() if key[0] == device_id])
        stats['cached_readings'] = device_cache_count
        
        # Get connection pool info
        if device_id in self._connection_pool.connections:
            conn_info = self._connection_pool.connections[device_id]
            stats['connection_established'] = conn_info['connected_at'].isoformat()
            stats['connection_usage'] = self._connection_pool.connection_usage[device_id]
        
        # Get recent readings count
        stats['recent_readings'] = len(self._last_readings.get(device_id, []))
        
        return stats
    
    def get_device_status(self, device_id: str = None) -> Dict[str, Any]:
        """Get status of DNP3 devices."""
        if device_id:
            if device_id not in self._devices:
                return {'error': f'Device {device_id} not found'}
            
            device = self._devices[device_id]
            return {
                'device_id': device_id,
                'master_address': device.master_address,
                'outstation_address': device.outstation_address,
                'host': device.host,
                'port': device.port,
                'connected': device.is_connected,
                'data_point_count': len(self._data_point_configs.get(device_id, [])),
                'last_reading_count': len(self._last_readings.get(device_id, []))
            }
        else:
            # Return status for all devices
            devices_status = {}
            for dev_id, device in self._devices.items():
                devices_status[dev_id] = {
                    'master_address': device.master_address,
                    'outstation_address': device.outstation_address,
                    'host': device.host,
                    'port': device.port,
                    'connected': device.is_connected,
                    'data_point_count': len(self._data_point_configs.get(dev_id, [])),
                    'last_reading_count': len(self._last_readings.get(dev_id, []))
                }
            
            return {
                'service': 'dnp3',
                'master_initialized': self._master is not None,
                'total_devices': len(self._devices),
                'connected_devices': sum(1 for d in self._devices.values() if d.is_connected),
                'devices': devices_status
            }
    
    def get_status(self) -> Dict[str, Any]:
        """Get DNP3 service status for protocol registry integration.
        
        Returns:
            Status dictionary compatible with protocol registry standards
        """
        connected_devices = [dev for dev in self._devices.values() if dev.is_connected]
        total_devices = len(self._devices)
        
        # Determine service availability and connection status
        available = self._master is not None  # Service available if master is initialized
        connected = len(connected_devices) > 0
        
        # Determine overall status
        if not self._master:
            status = "not_initialized"
        elif total_devices == 0:
            status = "initializing"
        elif connected:
            status = "ready"
        elif total_devices > 0 and not connected:
            status = "error"
        else:
            status = "unknown"
        
        # Calculate metrics
        metrics = {
            "master_initialized": self._master is not None,
            "total_devices": total_devices,
            "connected_devices": len(connected_devices),
            "total_data_points": sum(len(configs) for configs in self._data_point_configs.values()),
            "devices_with_data": len(self._last_readings)
        }
        
        # Create device summary
        devices_summary = {}
        for device_id, device in self._devices.items():
            devices_summary[device_id] = {
                "master_address": device.master_address,
                "outstation_address": device.outstation_address,
                "host": device.host,
                "port": device.port,
                "connected": device.is_connected,
                "data_point_count": len(self._data_point_configs.get(device_id, []))
            }
        
        # Detect if running in production/development environment
        is_demo_mode = os.getenv('FLASK_ENV', 'production') != 'production' or os.getenv('DNP3_DEMO', 'false').lower() == 'true'

        return {
            "available": available,
            "connected": connected,
            "status": status,
            "version": "1.0.0-mock",
            "metrics": metrics,
            "demo": is_demo_mode,  # Environment-aware demo flag
            "devices": devices_summary
        }


# Global DNP3 service instance
dnp3_service = DNP3Service()