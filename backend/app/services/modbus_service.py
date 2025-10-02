"""Modbus protocol support service for Phase 4 SCADA integration."""
import os
import logging
import struct
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import time
from dataclasses import dataclass

from app.models import utc_now  # Use timezone-aware datetime

logger = logging.getLogger(__name__)

# Mock Modbus implementation for demonstration
# In a real implementation, you would use pymodbus library

@dataclass
class ModbusDevice:
    """Modbus device configuration."""
    device_id: str
    unit_id: int  # Modbus slave unit ID
    host: str
    port: int
    device_type: str  # 'tcp', 'rtu', 'ascii'
    timeout: float = 5.0
    is_connected: bool = False


@dataclass
class ModbusRegister:
    """Modbus register configuration."""
    register_type: str  # 'coil', 'discrete_input', 'holding_register', 'input_register'
    address: int
    count: int
    data_type: str  # 'uint16', 'int16', 'uint32', 'int32', 'float32'
    scale_factor: float = 1.0
    offset: float = 0.0
    sensor_type: str = 'generic'


class ModbusClient:
    """Mock Modbus TCP client for demonstration."""
    
    def __init__(self, host: str, port: int = 502, timeout: float = 5.0):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.connected = False
        
    def connect(self) -> bool:
        """Connect to Modbus device."""
        try:
            # In real implementation, establish TCP/serial connection
            logger.info(f"Connecting to Modbus device at {self.host}:{self.port}")
            # Simulate connection
            self.connected = True
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Modbus device: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from Modbus device."""
        self.connected = False
        logger.info("Disconnected from Modbus device")
    
    def read_holding_registers(self, address: int, count: int, unit_id: int = 1) -> List[int]:
        """Read holding registers."""
        if not self.connected:
            raise ConnectionError("Not connected to Modbus device")
        
        # Simulate reading registers with some realistic industrial data
        import random
        
        # Generate simulated data based on register address
        registers = []
        for i in range(count):
            reg_addr = address + i
            if reg_addr < 100:  # Temperature registers
                value = int((20 + random.uniform(0, 60)) * 100)  # 20-80°C scaled by 100
            elif reg_addr < 200:  # Pressure registers  
                value = int((0 + random.uniform(0, 150)) * 100)  # 0-150 PSI scaled by 100
            elif reg_addr < 300:  # Flow registers
                value = int((0 + random.uniform(0, 100)) * 100)  # 0-100 L/min scaled by 100
            else:  # Generic registers
                value = random.randint(0, 65535)
                
            registers.append(value)
        
        logger.debug(f"Read {count} holding registers from address {address}: {registers}")
        return registers
    
    def read_input_registers(self, address: int, count: int, unit_id: int = 1) -> List[int]:
        """Read input registers."""
        # Similar to holding registers but typically read-only
        return self.read_holding_registers(address, count, unit_id)
    
    def read_coils(self, address: int, count: int, unit_id: int = 1) -> List[bool]:
        """Read coil status."""
        if not self.connected:
            raise ConnectionError("Not connected to Modbus device")
        
        # Simulate coil readings
        import random
        coils = [random.choice([True, False]) for _ in range(count)]
        logger.debug(f"Read {count} coils from address {address}: {coils}")
        return coils
    
    def read_discrete_inputs(self, address: int, count: int, unit_id: int = 1) -> List[bool]:
        """Read discrete input status."""
        return self.read_coils(address, count, unit_id)
    
    def write_single_coil(self, address: int, value: bool, unit_id: int = 1) -> bool:
        """Write single coil."""
        if not self.connected:
            raise ConnectionError("Not connected to Modbus device")
        
        logger.info(f"Writing coil at address {address} to {value}")
        # Simulate write operation
        return True
    
    def write_single_register(self, address: int, value: int, unit_id: int = 1) -> bool:
        """Write single holding register."""
        if not self.connected:
            raise ConnectionError("Not connected to Modbus device")
        
        logger.info(f"Writing register at address {address} to {value}")
        # Simulate write operation
        return True
    
    def write_multiple_registers(self, address: int, values: List[int], unit_id: int = 1) -> bool:
        """Write multiple holding registers atomically."""
        if not self.connected:
            raise ConnectionError("Not connected to Modbus device")
        
        logger.info(f"Writing {len(values)} registers starting at address {address}")
        # Simulate atomic write operation
        return True


class ModbusService:
    """Modbus protocol service for industrial device communication."""
    
    def __init__(self, app=None):
        """Initialize Modbus service."""
        self._app = app
        self._devices: Dict[str, ModbusDevice] = {}
        self._clients: Dict[str, ModbusClient] = {}
        self._register_configs: Dict[str, List[ModbusRegister]] = {}
        self._last_readings: Dict[str, Dict[str, Any]] = {}
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize with Flask app."""
        self._app = app
        logger.info("Modbus service initialized")
    
    def add_device(self, device_id: str, unit_id: int, host: str, port: int = 502, 
                   device_type: str = 'tcp', timeout: float = 5.0) -> bool:
        """Add Modbus device configuration."""
        try:
            device = ModbusDevice(
                device_id=device_id,
                unit_id=unit_id,
                host=host,
                port=port,
                device_type=device_type,
                timeout=timeout
            )
            
            self._devices[device_id] = device
            
            # Create client
            if device_type == 'tcp':
                client = ModbusClient(host, port, timeout)
                self._clients[device_id] = client
            else:
                # For RTU/ASCII, you would use different client types
                logger.warning(f"Device type {device_type} not fully implemented")
                return False
            
            logger.info(f"Added Modbus device: {device_id} at {host}:{port}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add Modbus device {device_id}: {e}")
            return False
    
    def remove_device(self, device_id: str) -> bool:
        """Remove Modbus device."""
        try:
            if device_id in self._clients:
                self._clients[device_id].disconnect()
                del self._clients[device_id]
            
            if device_id in self._devices:
                del self._devices[device_id]
                
            if device_id in self._register_configs:
                del self._register_configs[device_id]
                
            if device_id in self._last_readings:
                del self._last_readings[device_id]
            
            logger.info(f"Removed Modbus device: {device_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to remove Modbus device {device_id}: {e}")
            return False
    
    def connect_device(self, device_id: str) -> bool:
        """Connect to Modbus device."""
        try:
            if device_id not in self._devices:
                logger.error(f"Device {device_id} not configured")
                return False
            
            if device_id not in self._clients:
                logger.error(f"Client for device {device_id} not available")
                return False
            
            client = self._clients[device_id]
            success = client.connect()
            
            if success:
                self._devices[device_id].is_connected = True
                logger.info(f"Connected to Modbus device: {device_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to connect to Modbus device {device_id}: {e}")
            return False
    
    def disconnect_device(self, device_id: str) -> bool:
        """Disconnect from Modbus device."""
        try:
            if device_id in self._clients:
                self._clients[device_id].disconnect()
                
            if device_id in self._devices:
                self._devices[device_id].is_connected = False
            
            logger.info(f"Disconnected from Modbus device: {device_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to disconnect from Modbus device {device_id}: {e}")
            return False
    
    def add_register_config(self, device_id: str, registers: List[Dict[str, Any]]) -> bool:
        """Add register configuration for a device."""
        try:
            if device_id not in self._devices:
                logger.error(f"Device {device_id} not configured")
                return False
            
            register_configs = []
            for reg_config in registers:
                register = ModbusRegister(
                    register_type=reg_config['register_type'],
                    address=reg_config['address'],
                    count=reg_config.get('count', 1),
                    data_type=reg_config.get('data_type', 'uint16'),
                    scale_factor=reg_config.get('scale_factor', 1.0),
                    offset=reg_config.get('offset', 0.0),
                    sensor_type=reg_config.get('sensor_type', 'generic')
                )
                register_configs.append(register)
            
            self._register_configs[device_id] = register_configs
            logger.info(f"Added {len(register_configs)} register configs for device {device_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add register config for device {device_id}: {e}")
            return False
    
    def read_device_data(self, device_id: str) -> Dict[str, Any]:
        """Read data from all configured registers of a device."""
        try:
            if device_id not in self._devices:
                raise ValueError(f"Device {device_id} not configured")
                
            device = self._devices[device_id]
            if not device.is_connected:
                raise ConnectionError(f"Device {device_id} not connected")
            
            if device_id not in self._register_configs:
                raise ValueError(f"No register configuration for device {device_id}")
            
            client = self._clients[device_id]
            register_configs = self._register_configs[device_id]
            
            readings = {}
            timestamp = utc_now()
            
            for register in register_configs:
                try:
                    # Read based on register type
                    if register.register_type == 'holding_register':
                        raw_values = client.read_holding_registers(
                            register.address, register.count, device.unit_id
                        )
                    elif register.register_type == 'input_register':
                        raw_values = client.read_input_registers(
                            register.address, register.count, device.unit_id
                        )
                    elif register.register_type == 'coil':
                        raw_values = client.read_coils(
                            register.address, register.count, device.unit_id
                        )
                    elif register.register_type == 'discrete_input':
                        raw_values = client.read_discrete_inputs(
                            register.address, register.count, device.unit_id
                        )
                    else:
                        logger.warning(f"Unknown register type: {register.register_type}")
                        continue
                    
                    # Convert raw values based on data type
                    processed_value = self._process_register_value(
                        raw_values, register.data_type, register.scale_factor, register.offset
                    )
                    
                    reading_key = f"{register.sensor_type}_{register.address}"
                    readings[reading_key] = {
                        'sensor_type': register.sensor_type,
                        'register_type': register.register_type,
                        'address': register.address,
                        'raw_value': raw_values,
                        'processed_value': processed_value,
                        'timestamp': timestamp.isoformat(),
                        'data_type': register.data_type
                    }
                    
                except Exception as e:
                    logger.error(f"Failed to read register {register.address} on device {device_id}: {e}")
                    continue
            
            # Store last readings
            self._last_readings[device_id] = readings
            
            return {
                'device_id': device_id,
                'timestamp': timestamp.isoformat(),
                'readings': readings,
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
    
    def write_register(self, device_id: str, register_type: str, address: int, 
                      value: Any, data_type: str = 'uint16') -> bool:
        """Write value to a specific register."""
        try:
            if device_id not in self._devices:
                raise ValueError(f"Device {device_id} not configured")
                
            device = self._devices[device_id]
            if not device.is_connected:
                raise ConnectionError(f"Device {device_id} not connected")
            
            client = self._clients[device_id]
            
            # Convert value based on data type
            if register_type == 'coil':
                success = client.write_single_coil(address, bool(value), device.unit_id)
            elif register_type == 'holding_register':
                # Convert value to appropriate integer representation
                if data_type == 'float32':
                    # Proper IEEE 754 float32 conversion using struct
                    # Endianness: Big-endian (network byte order) is used by default
                    # This matches the Modbus standard convention where the high-order word
                    # is transmitted first. If your device uses little-endian, modify the
                    # struct format strings from '>f' and '>I' to '<f' and '<I'.
                    # For configurable endianness, this could be made a device parameter.
                    import struct
                    # Convert float to bytes and then to two 16-bit registers
                    bytes_val = struct.pack('>f', value)  # Big-endian float
                    combined = struct.unpack('>I', bytes_val)[0]  # Big-endian unsigned int
                    # Split into high and low 16-bit words
                    high_word = (combined >> 16) & 0xFFFF
                    low_word = combined & 0xFFFF
                    # Use atomic write_multiple_registers to avoid partial write failures
                    success = client.write_multiple_registers(address, [high_word, low_word], device.unit_id)
                else:
                    int_value = int(value)
                    success = client.write_single_register(address, int_value, device.unit_id)
            else:
                raise ValueError(f"Cannot write to register type: {register_type}")
            
            if success:
                logger.info(f"Successfully wrote {value} to {register_type} address {address} on device {device_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to write register on device {device_id}: {e}")
            return False
    
    def get_device_status(self, device_id: str = None) -> Dict[str, Any]:
        """Get status of Modbus devices."""
        if device_id:
            if device_id not in self._devices:
                return {'error': f'Device {device_id} not found'}
            
            device = self._devices[device_id]
            return {
                'device_id': device_id,
                'unit_id': device.unit_id,
                'host': device.host,
                'port': device.port,
                'device_type': device.device_type,
                'connected': device.is_connected,
                'register_count': len(self._register_configs.get(device_id, [])),
                'last_reading': self._last_readings.get(device_id, {}).get('timestamp')
            }
        else:
            # Return status for all devices
            devices_status = {}
            for dev_id, device in self._devices.items():
                devices_status[dev_id] = {
                    'unit_id': device.unit_id,
                    'host': device.host,
                    'port': device.port,
                    'device_type': device.device_type,
                    'connected': device.is_connected,
                    'register_count': len(self._register_configs.get(dev_id, [])),
                    'last_reading': self._last_readings.get(dev_id, {}).get('timestamp')
                }
            
            return {
                'service': 'modbus',
                'total_devices': len(self._devices),
                'connected_devices': sum(1 for d in self._devices.values() if d.is_connected),
                'devices': devices_status
            }
    
    def _process_register_value(self, raw_values: List, data_type: str, 
                              scale_factor: float, offset: float) -> float:
        """Process raw register values based on data type."""
        try:
            if not raw_values:
                return 0.0
            
            if data_type == 'uint16':
                value = raw_values[0]
            elif data_type == 'int16':
                value = raw_values[0]
                # Convert to signed if needed
                if value > 32767:
                    value = value - 65536
            elif data_type == 'uint32':
                # Combine two 16-bit registers
                if len(raw_values) >= 2:
                    value = (raw_values[0] << 16) | raw_values[1]
                else:
                    value = raw_values[0]
            elif data_type == 'int32':
                # Combine two 16-bit registers and convert to signed
                if len(raw_values) >= 2:
                    value = (raw_values[0] << 16) | raw_values[1]
                    if value > 2147483647:
                        value = value - 4294967296
                else:
                    value = raw_values[0]
            elif data_type == 'float32':
                # Proper IEEE 754 float32 conversion using struct
                # Endianness: Big-endian (network byte order) is used by default
                # This matches the Modbus standard convention where the high-order word
                # comes first. If your device uses little-endian, modify the struct
                # format strings from '>I' and '>f' to '<I' and '<f'.
                # For configurable endianness, this could be made a device parameter.
                if len(raw_values) >= 2:
                    import struct
                    # Combine two 16-bit registers into a 32-bit integer
                    # High-word first (big-endian byte order)
                    combined = (raw_values[0] << 16) | raw_values[1]
                    # Convert to bytes and then to float32
                    bytes_val = struct.pack('>I', combined)  # Big-endian unsigned int
                    value = struct.unpack('>f', bytes_val)[0]  # Big-endian float
                else:
                    # Single register - treat as scaled integer
                    value = raw_values[0] / 100.0
            else:
                value = raw_values[0]
            
            # Apply scaling and offset
            processed_value = (value * scale_factor) + offset
            return processed_value
            
        except Exception as e:
            logger.error(f"Failed to process register value: {e}")
            return 0.0
    
    def get_status(self) -> Dict[str, Any]:
        """Get Modbus service status for protocol registry integration.
        
        Returns:
            Status dictionary compatible with protocol registry standards
        """
        connected_devices = [dev for dev in self._devices.values() if dev.is_connected]
        total_devices = len(self._devices)
        num_connected = len(connected_devices)
        
        # Determine service availability and connection status
        available = True  # Service is always available (mock implementation)
        connected = num_connected > 0
        
        # Determine overall status
        if total_devices == 0:
            status = "not_initialized"
        elif num_connected == total_devices:
            status = "ready"
        elif num_connected > 0:
            status = "degraded"
        else:
            status = "error"
        
        # Calculate metrics
        metrics = {
            "total_devices": total_devices,
            "connected_devices": len(connected_devices),
            "total_registers": sum(len(configs) for configs in self._register_configs.values()),
            "devices_with_data": len(self._last_readings)
        }
        
        # Create device summary
        devices_summary = {}
        for device_id, device in self._devices.items():
            devices_summary[device_id] = {
                "host": device.host,
                "port": device.port,
                "unit_id": device.unit_id,
                "connected": device.is_connected,
                "device_type": device.device_type,
                "register_count": len(self._register_configs.get(device_id, []))
            }
        
        # Detect if running in production/development environment
        is_demo_mode = os.getenv('FLASK_ENV', 'production') != 'production' or os.getenv('MODBUS_DEMO', 'false').lower() == 'true'

        return {
            "available": available,
            "connected": connected,
            "status": status,
            "version": "1.0.0-mock",
            "metrics": metrics,
            "demo": is_demo_mode,  # Environment-aware demo flag
            "devices": devices_summary
        }


# Global Modbus service instance
modbus_service = ModbusService()