"""DNP3 protocol support service for Phase 4 SCADA integration."""
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import time

logger = logging.getLogger(__name__)

# Mock DNP3 implementation for demonstration
# In a real implementation, you would use pydnp3 or similar library


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


class MockDNP3Master:
    """Mock DNP3 Master implementation for demonstration."""
    
    def __init__(self, master_address: int = 1):
        self.master_address = master_address
        self.connected_outstations = {}
        self.data_cache = {}
        
    def add_outstation(self, outstation_address: int, host: str, port: int) -> bool:
        """Add outstation configuration."""
        try:
            outstation_config = {
                'address': outstation_address,
                'host': host,
                'port': port,
                'connected': False,
                'last_poll': None
            }
            
            self.connected_outstations[outstation_address] = outstation_config
            logger.info(f"Added DNP3 outstation {outstation_address} at {host}:{port}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add DNP3 outstation {outstation_address}: {e}")
            return False
    
    def connect_outstation(self, outstation_address: int) -> bool:
        """Connect to DNP3 outstation."""
        try:
            if outstation_address not in self.connected_outstations:
                logger.error(f"Outstation {outstation_address} not configured")
                return False
            
            # Simulate connection
            logger.info(f"Connecting to DNP3 outstation {outstation_address}")
            self.connected_outstations[outstation_address]['connected'] = True
            
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
    
    def read_binary_inputs(self, outstation_address: int, start_index: int, count: int) -> List[Tuple[int, bool, DNP3Quality]]:
        """Read binary input points."""
        if not self._is_outstation_connected(outstation_address):
            raise ConnectionError(f"Outstation {outstation_address} not connected")
        
        # Simulate binary input readings
        import random
        readings = []
        
        for i in range(count):
            index = start_index + i
            # Simulate some realistic binary states
            value = random.choice([True, False])
            quality = DNP3Quality.GOOD
            
            readings.append((index, value, quality))
        
        logger.debug(f"Read {count} binary inputs from outstation {outstation_address}")
        return readings
    
    def read_analog_inputs(self, outstation_address: int, start_index: int, count: int) -> List[Tuple[int, float, DNP3Quality]]:
        """Read analog input points."""
        if not self._is_outstation_connected(outstation_address):
            raise ConnectionError(f"Outstation {outstation_address} not connected")
        
        # Simulate analog input readings
        import random
        readings = []
        
        for i in range(count):
            index = start_index + i
            
            # Generate realistic analog values based on index
            if index < 10:  # Temperature sensors
                value = 20.0 + random.uniform(0, 60)  # 20-80°C
            elif index < 20:  # Pressure sensors
                value = random.uniform(0, 150)  # 0-150 PSI
            elif index < 30:  # Flow sensors
                value = random.uniform(0, 100)  # 0-100 L/min
            else:
                value = random.uniform(0, 1000)  # Generic 0-1000
            
            quality = DNP3Quality.GOOD
            readings.append((index, value, quality))
        
        logger.debug(f"Read {count} analog inputs from outstation {outstation_address}")
        return readings
    
    def read_counters(self, outstation_address: int, start_index: int, count: int) -> List[Tuple[int, int, DNP3Quality]]:
        """Read counter points."""
        if not self._is_outstation_connected(outstation_address):
            raise ConnectionError(f"Outstation {outstation_address} not connected")
        
        # Simulate counter readings
        import random
        readings = []
        
        for i in range(count):
            index = start_index + i
            value = random.randint(0, 1000000)  # Counter value
            quality = DNP3Quality.GOOD
            
            readings.append((index, value, quality))
        
        logger.debug(f"Read {count} counters from outstation {outstation_address}")
        return readings
    
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
        self.connected_outstations[outstation_address]['last_poll'] = datetime.utcnow()
        return True
    
    def _is_outstation_connected(self, outstation_address: int) -> bool:
        """Check if outstation is connected."""
        return (outstation_address in self.connected_outstations and
                self.connected_outstations[outstation_address]['connected'])


class DNP3Service:
    """DNP3 protocol service for SCADA communication."""
    
    def __init__(self, app=None):
        """Initialize DNP3 service."""
        self._app = app
        self._devices: Dict[str, DNP3Device] = {}
        self._master: Optional[MockDNP3Master] = None
        self._data_point_configs: Dict[str, List[DNP3DataPoint]] = {}
        self._last_readings: Dict[str, List[DNP3Reading]] = {}
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize with Flask app."""
        self._app = app
        self._master = MockDNP3Master()
        logger.info("DNP3 service initialized")
    
    def add_device(self, device_id: str, master_address: int, outstation_address: int,
                   host: str, port: int = 20000, link_timeout: float = 5.0,
                   app_timeout: float = 5.0) -> bool:
        """Add DNP3 device configuration."""
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
    
    def connect_device(self, device_id: str) -> bool:
        """Connect to DNP3 device."""
        try:
            if device_id not in self._devices:
                logger.error(f"Device {device_id} not configured")
                return False
            
            device = self._devices[device_id]
            
            if not self._master:
                logger.error("DNP3 master not initialized")
                return False
            
            success = self._master.connect_outstation(device.outstation_address)
            
            if success:
                device.is_connected = True
                logger.info(f"Connected to DNP3 device: {device_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to connect to DNP3 device {device_id}: {e}")
            return False
    
    def disconnect_device(self, device_id: str) -> bool:
        """Disconnect from DNP3 device."""
        try:
            if device_id in self._devices:
                device = self._devices[device_id]
                
                if self._master:
                    self._master.disconnect_outstation(device.outstation_address)
                
                device.is_connected = False
            
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
    
    def read_device_data(self, device_id: str) -> Dict[str, Any]:
        """Read data from all configured data points of a device."""
        try:
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
            timestamp = datetime.utcnow()
            
            # Group data points by type for efficient reading
            binary_inputs = [dp for dp in data_points if dp.data_type == DNP3DataType.BINARY_INPUT]
            analog_inputs = [dp for dp in data_points if dp.data_type == DNP3DataType.ANALOG_INPUT]
            counters = [dp for dp in data_points if dp.data_type == DNP3DataType.COUNTER]
            
            try:
                # Read binary inputs
                if binary_inputs:
                    indices = [dp.index for dp in binary_inputs]
                    start_index = min(indices)
                    count = max(indices) - start_index + 1
                    
                    binary_readings = self._master.read_binary_inputs(
                        device.outstation_address, start_index, count
                    )
                    
                    for dp in binary_inputs:
                        for index, value, quality in binary_readings:
                            if index == dp.index:
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
                                break
                
                # Read analog inputs
                if analog_inputs:
                    indices = [dp.index for dp in analog_inputs]
                    start_index = min(indices)
                    count = max(indices) - start_index + 1
                    
                    analog_readings = self._master.read_analog_inputs(
                        device.outstation_address, start_index, count
                    )
                    
                    for dp in analog_inputs:
                        for index, raw_value, quality in analog_readings:
                            if index == dp.index:
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
                                break
                
                # Read counters
                if counters:
                    indices = [dp.index for dp in counters]
                    start_index = min(indices)
                    count = max(indices) - start_index + 1
                    
                    counter_readings = self._master.read_counters(
                        device.outstation_address, start_index, count
                    )
                    
                    for dp in counters:
                        for index, value, quality in counter_readings:
                            if index == dp.index:
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
                                break
                
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
                logger.error(f"Failed to read data from DNP3 device {device_id}: {e}")
                return {
                    'device_id': device_id,
                    'timestamp': timestamp.isoformat(),
                    'readings': {},
                    'success': False,
                    'error': str(e)
                }
            
        except Exception as e:
            logger.error(f"Failed to read device data for {device_id}: {e}")
            return {
                'device_id': device_id,
                'timestamp': datetime.utcnow().isoformat(),
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


# Global DNP3 service instance
dnp3_service = DNP3Service()