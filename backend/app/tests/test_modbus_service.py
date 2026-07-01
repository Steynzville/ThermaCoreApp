"""Tests for Modbus protocol support service."""

import struct
from unittest.mock import Mock, patch
import pytest

from app.services.modbus_service import ModbusClient, ModbusRegister, ModbusDevice


class TestModbusService:
    """Test suite for Modbus register reading, writing, and type parsing."""

    def test_modbus_client_connect_disconnect(self):
        """Test ModbusClient TCP connection and disconnection simulation."""
        client = ModbusClient(host="127.0.0.1", port=502)
        assert client.connected is False

        assert client.connect() is True
        assert client.connected is True

        client.disconnect()
        assert client.connected is False

    @patch("app.services.modbus_service.logger")
    def test_process_register_value_conversions(self, mock_logger):
        """Test parsing of different Modbus register types with scaling and offsets."""
        from app.services.modbus_service import ModbusService
        service = ModbusService()

        # 1. Test uint16 conversion with scale and offset
        # Formula: (value * scale_factor) + offset
        val_uint16 = service._process_register_value(
            raw_values=[100],
            data_type="uint16",
            scale_factor=2.5,
            offset=-10.0
        )
        assert val_uint16 == (100 * 2.5) - 10.0

        # 2. Test int16 negative conversions
        val_int16 = service._process_register_value(
            raw_values=[65530],  # -6 signed
            data_type="int16",
            scale_factor=1.0,
            offset=0.0
        )
        assert val_int16 == -6

        # 3. Test uint32 combination
        val_uint32 = service._process_register_value(
            raw_values=[1, 0],  # (1 << 16) | 0 = 65536
            data_type="uint32",
            scale_factor=1.0,
            offset=0.0
        )
        assert val_uint32 == 65536

        # 4. Test int32 negative combination
        # Max unsigned int is 4294967295. Let's use 4294967290 -> -6 signed
        high_word = 4294967290 >> 16
        low_word = 4294967290 & 0xFFFF
        val_int32 = service._process_register_value(
            raw_values=[high_word, low_word],
            data_type="int32",
            scale_factor=1.0,
            offset=0.0
        )
        assert val_int32 == -6

        # 5. Test float32 IEEE 754 conversion
        # Pack 123.45 as a big-endian float, unpack as unsigned int
        packed = struct.pack(">f", 123.45)
        unpacked_int = struct.unpack(">I", packed)[0]
        high_w = unpacked_int >> 16
        low_w = unpacked_int & 0xFFFF

        val_float32 = service._process_register_value(
            raw_values=[high_w, low_w],
            data_type="float32",
            scale_factor=1.0,
            offset=0.0
        )
        assert pytest.approx(val_float32, rel=1e-5) == 123.45

    def test_process_register_value_malformed(self):
        """Test processing malformed or incomplete register arrays gracefully falls back."""
        from app.services.modbus_service import ModbusService
        service = ModbusService()

        # float32 expects at least 2 registers; if 1 is passed, it falls back to single register/100
        val_fallback = service._process_register_value(
            raw_values=[450],
            data_type="float32",
            scale_factor=1.0,
            offset=0.0
        )
        assert val_fallback == 4.5

        # Empty raw_values list should log error and return 0.0 gracefully
        val_empty = service._process_register_value(
            raw_values=[],
            data_type="uint16",
            scale_factor=1.0,
            offset=0.0
        )
        assert val_empty == 0.0

    def test_write_register_float32(self):
        """Test write holding register with float32 conversion (splitting into high/low words)."""
        from app.services.modbus_service import ModbusService
        service = ModbusService()

        # Register device
        device = ModbusDevice("DEV1", 1, "127.0.0.1", 502, "tcp")
        device.is_connected = True
        service._devices["DEV1"] = device

        mock_client = Mock()
        mock_client.write_multiple_registers.return_value = True
        service._get_client = Mock(return_value=mock_client)
        service._clients["DEV1"] = mock_client

        # Write float32 value (123.45)
        success = service.write_register("DEV1", "holding_register", 100, 123.45, "float32")
        assert success is True
        
        # Verify write_multiple_registers was called with high/low words
        mock_client.write_multiple_registers.assert_called_once()
        args = mock_client.write_multiple_registers.call_args[0]
        assert args[0] == 100  # address
        assert len(args[1]) == 2  # high and low words

    def test_modbus_read_device_errors_and_timeouts(self):
        """Test read_device_data with register errors, parity failures, and timeouts."""
        from app.services.modbus_service import ModbusService
        service = ModbusService()

        # Config device & registers
        device = ModbusDevice("DEV_ERR", 1, "127.0.0.1", 502, "tcp")
        device.is_connected = True
        service._devices["DEV_ERR"] = device

        reg1 = ModbusRegister("holding_register", 100, 1, "uint16", sensor_type="temp")
        reg2 = ModbusRegister("holding_register", 101, 1, "uint16", sensor_type="press")
        service._register_configs["DEV_ERR"] = [reg1, reg2]

        mock_client = Mock()
        # Mock first call as successful, second call raises TimeoutError / exception
        mock_client.read_holding_registers.side_effect = [
            [50],  # normal reading
            TimeoutError("Modbus response timeout")  # timeout error
        ]
        service._clients["DEV_ERR"] = mock_client

        # Execute read
        res = service.read_device_data("DEV_ERR")
        assert res["success"] is True  # still True because of partial success / graceful loop bypass
        assert "temp_100" in res["readings"]
        assert res["readings"]["temp_100"]["processed_value"] == 50.0
        assert "press_101" not in res["readings"]

        # Mock parity failure (raises custom ValueError/ConnectionError or Exception)
        mock_client.read_holding_registers.side_effect = Exception("Modbus parity error")
        res = service.read_device_data("DEV_ERR")
        assert res["success"] is True
        assert len(res["readings"]) == 0  # all failed but caught gracefully

    def test_modbus_write_register_errors(self):
        """Test write_register with connection errors, parity failures, and timeouts."""
        from app.services.modbus_service import ModbusService
        service = ModbusService()

        device = ModbusDevice("DEV_ERR_W", 1, "127.0.0.1", 502, "tcp")
        device.is_connected = True
        service._devices["DEV_ERR_W"] = device

        mock_client = Mock()
        # Raise parity/timeout exception on write
        mock_client.write_single_coil.side_effect = TimeoutError("Write operation timeout")
        service._clients["DEV_ERR_W"] = mock_client

        # Write should fail gracefully and return False, not crash
        success = service.write_register("DEV_ERR_W", "coil", 100, True)
        assert success is False

        # Write with parity exception
        mock_client.write_single_coil.side_effect = Exception("Parity validation failed")
        success = service.write_register("DEV_ERR_W", "coil", 100, True)
        assert success is False
