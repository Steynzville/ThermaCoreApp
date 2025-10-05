"""Tests for Modbus float32 atomic write optimization."""
import pytest
from unittest.mock import Mock
import struct

from app.services.modbus_service import ModbusService, ModbusClient


class TestModbusAtomicWrite:
    """Test Modbus atomic write optimization for float32."""
    
    def test_modbus_client_has_write_multiple_registers(self):
        """Test that ModbusClient has write_multiple_registers method."""
        client = ModbusClient('localhost', 502)
        assert hasattr(client, 'write_multiple_registers')
    
    def test_write_multiple_registers_method(self):
        """Test write_multiple_registers method works correctly."""
        client = ModbusClient('localhost', 502)
        client.connected = True
        
        # Test successful write
        result = client.write_multiple_registers(100, [0x4048, 0xF5C3], unit_id=1)
        assert result is True
    
    def test_write_multiple_registers_disconnected(self):
        """Test write_multiple_registers raises error when disconnected."""
        client = ModbusClient('localhost', 502)
        client.connected = False
        
        with pytest.raises(ConnectionError):
            client.write_multiple_registers(100, [0x4048, 0xF5C3], unit_id=1)
    
    def test_write_register_float32_uses_write_multiple_registers(self):
        """Test that write_register for float32 uses write_multiple_registers."""
        service = ModbusService()
        
        # Add and connect a device
        service.add_device('test_device', 1, 'localhost', 502)
        service.connect_device('test_device')
        
        # Mock the write_multiple_registers method
        mock_client = service._clients['test_device']
        mock_client.write_multiple_registers = Mock(return_value=True)
        
        # Write a float32 value
        test_float = 3.14159
        result = service.write_register('test_device', 'holding_register', 100, test_float, 'float32')
        
        # Verify write_multiple_registers was called
        assert mock_client.write_multiple_registers.called
        assert result is True
        
        # Verify the correct arguments were passed
        call_args = mock_client.write_multiple_registers.call_args
        address = call_args[0][0]
        values = call_args[0][1]
        
        assert address == 100
        assert len(values) == 2
        
        # Verify the values can be converted back to the original float
        high_word, low_word = values
        combined = (high_word << 16) | low_word
        bytes_val = struct.pack('>I', combined)
        reconstructed_float = struct.unpack('>f', bytes_val)[0]
        assert abs(reconstructed_float - test_float) < 0.0001
    
    def test_write_register_float32_single_call(self):
        """Test that float32 write uses a single atomic call instead of two separate calls."""
        service = ModbusService()
        
        # Add and connect a device
        service.add_device('test_device', 1, 'localhost', 502)
        service.connect_device('test_device')
        
        # Mock both methods
        mock_client = service._clients['test_device']
        mock_client.write_single_register = Mock(return_value=True)
        mock_client.write_multiple_registers = Mock(return_value=True)
        
        # Write a float32 value
        result = service.write_register('test_device', 'holding_register', 100, 42.5, 'float32')
        
        # Verify write_multiple_registers was called once
        assert mock_client.write_multiple_registers.call_count == 1
        # Verify write_single_register was NOT called for float32
        assert mock_client.write_single_register.call_count == 0
        assert result is True
    
    def test_write_register_uint16_still_uses_single_register(self):
        """Test that non-float32 types still use write_single_register."""
        service = ModbusService()
        
        # Add and connect a device
        service.add_device('test_device', 1, 'localhost', 502)
        service.connect_device('test_device')
        
        # Mock both methods
        mock_client = service._clients['test_device']
        mock_client.write_single_register = Mock(return_value=True)
        mock_client.write_multiple_registers = Mock(return_value=True)
        
        # Write a uint16 value
        result = service.write_register('test_device', 'holding_register', 100, 42, 'uint16')
        
        # Verify write_single_register was called for uint16
        assert mock_client.write_single_register.call_count == 1
        # Verify write_multiple_registers was NOT called
        assert mock_client.write_multiple_registers.call_count == 0
        assert result is True
