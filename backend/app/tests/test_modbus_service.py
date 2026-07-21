"""Tests for Modbus protocol support service."""

import struct
from unittest.mock import Mock, patch

import pytest

from app.services.modbus_service import ModbusClient, ModbusDevice, ModbusRegister


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
            offset=-10.0,
        )
        assert val_uint16 == (100 * 2.5) - 10.0

        # 2. Test int16 negative conversions
        val_int16 = service._process_register_value(
            raw_values=[65530],  # -6 signed
            data_type="int16",
            scale_factor=1.0,
            offset=0.0,
        )
        assert val_int16 == -6

        # 3. Test uint32 combination
        val_uint32 = service._process_register_value(
            raw_values=[1, 0],  # (1 << 16) | 0 = 65536
            data_type="uint32",
            scale_factor=1.0,
            offset=0.0,
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
            offset=0.0,
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
            offset=0.0,
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
            offset=0.0,
        )
        assert val_fallback == 4.5

        # Empty raw_values list should log error and return 0.0 gracefully
        val_empty = service._process_register_value(
            raw_values=[],
            data_type="uint16",
            scale_factor=1.0,
            offset=0.0,
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
        service._clients["DEV1"] = mock_client

        # Write float32 value (123.45)
        success = service.write_register(
            "DEV1",
            "holding_register",
            100,
            123.45,
            "float32",
        )
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
            TimeoutError("Modbus response timeout"),  # timeout error
        ]
        service._clients["DEV_ERR"] = mock_client

        # Execute read
        res = service.read_device_data("DEV_ERR")
        assert (
            res["success"] is True
        )  # still True because of partial success / graceful loop bypass
        assert "temp_100" in res["readings"]
        assert res["readings"]["temp_100"]["processed_value"] == 50.0
        assert "press_101" not in res["readings"]

        # Mock parity failure (raises custom ValueError/ConnectionError or Exception)
        mock_client.read_holding_registers.side_effect = Exception(
            "Modbus parity error",
        )
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
        mock_client.write_single_coil.side_effect = TimeoutError(
            "Write operation timeout",
        )
        service._clients["DEV_ERR_W"] = mock_client

        # Write should fail gracefully and return False, not crash
        success = service.write_register("DEV_ERR_W", "coil", 100, True)
        assert success is False

        # Write with parity exception
        mock_client.write_single_coil.side_effect = Exception(
            "Parity validation failed",
        )
        success = service.write_register("DEV_ERR_W", "coil", 100, True)
        assert success is False

    # ---- device lifecycle tests ----

    def test_add_device_tcp_success_and_unsupported_type(self):
        """Test adding TCP device succeeds and unsupported device type returns False."""
        from app.services.modbus_service import ModbusService

        service = ModbusService()
        assert service.add_device("DEV_TCP", 1, "127.0.0.1", 502, "tcp") is True
        assert "DEV_TCP" in service._devices
        assert "DEV_TCP" in service._clients

        # Unsupported device type returns False and doesn't leave a client behind
        assert service.add_device("DEV_RTU", 1, "127.0.0.1", 502, "rtu") is False

    def test_add_device_exception_path(self):
        """Test add_device handles exceptions gracefully and doesn't orphan device state."""
        from app.services.modbus_service import ModbusService

        service = ModbusService()
        with patch(
            "app.services.modbus_service.ModbusClient",
            side_effect=Exception("boom"),
        ):
            assert service.add_device("DEV_FAIL", 1, "127.0.0.1", 502, "tcp") is False
        # Verify no orphaned state remains
        assert "DEV_FAIL" not in service._devices
        assert "DEV_FAIL" not in service._clients

    def test_remove_device(self):
        """Test removing a device cleans up all associated data."""
        from app.services.modbus_service import ModbusService

        service = ModbusService()
        service.add_device("DEV_RM", 1, "127.0.0.1", 502, "tcp")
        service._register_configs["DEV_RM"] = []
        service._last_readings["DEV_RM"] = {}

        assert service.remove_device("DEV_RM") is True
        assert "DEV_RM" not in service._devices
        assert "DEV_RM" not in service._clients
        assert "DEV_RM" not in service._register_configs
        assert "DEV_RM" not in service._last_readings

    def test_remove_device_exception_path(self):
        """Test remove_device handles disconnect exceptions gracefully."""
        from app.services.modbus_service import ModbusService

        service = ModbusService()
        service._devices["DEV_RM_ERR"] = Mock()
        service._clients["DEV_RM_ERR"] = Mock(
            disconnect=Mock(side_effect=Exception("fail")),
        )
        assert service.remove_device("DEV_RM_ERR") is False

    def test_connect_device_not_configured_or_no_client(self):
        """Test connect_device returns False when device not configured or client missing."""
        from app.services.modbus_service import ModbusDevice, ModbusService

        service = ModbusService()
        assert service.connect_device("MISSING") is False

        service._devices["DEV_NOCLIENT"] = ModbusDevice(
            "DEV_NOCLIENT", 1, "127.0.0.1", 502, "tcp",
        )
        assert service.connect_device("DEV_NOCLIENT") is False

    def test_connect_device_success_and_failure(self):
        """Test connect_device handles both success and failure scenarios."""
        from app.services.modbus_service import ModbusDevice, ModbusService

        service = ModbusService()
        device = ModbusDevice("DEV_C", 1, "127.0.0.1", 502, "tcp")
        service._devices["DEV_C"] = device
        service._clients["DEV_C"] = Mock(connect=Mock(return_value=True))
        assert service.connect_device("DEV_C") is True
        assert device.is_connected is True

        device2 = ModbusDevice("DEV_C2", 1, "127.0.0.1", 502, "tcp")
        service._devices["DEV_C2"] = device2
        service._clients["DEV_C2"] = Mock(connect=Mock(return_value=False))
        assert service.connect_device("DEV_C2") is False

    def test_disconnect_device(self):
        """Test disconnect_device sets connected status to False."""
        from app.services.modbus_service import ModbusDevice, ModbusService

        service = ModbusService()
        device = ModbusDevice("DEV_D", 1, "127.0.0.1", 502, "tcp")
        device.is_connected = True
        service._devices["DEV_D"] = device
        service._clients["DEV_D"] = Mock()

        assert service.disconnect_device("DEV_D") is True
        assert device.is_connected is False

    # ---- register config tests ----

    def test_add_register_config_success_and_error(self):
        """Test adding register configuration succeeds and handles errors."""
        from app.services.modbus_service import ModbusDevice, ModbusService

        service = ModbusService()
        service._devices["DEV_R"] = ModbusDevice("DEV_R", 1, "127.0.0.1", 502, "tcp")

        ok = service.add_register_config(
            "DEV_R",
            [{"register_type": "holding_register", "address": 1, "sensor_type": "t"}],
        )
        assert ok is True
        assert len(service._register_configs["DEV_R"]) == 1

        # Device not configured
        assert service.add_register_config("MISSING", []) is False

        # Missing required key triggers exception path
        assert service.add_register_config("DEV_R", [{"address": 1}]) is False

    # ---- read_device_data guard clauses ----

    def test_read_device_data_guard_clauses(self):
        """Test read_device_data handles missing device, not connected, and no config."""
        from app.services.modbus_service import ModbusDevice, ModbusService

        service = ModbusService()
        res = service.read_device_data("MISSING")
        assert res["success"] is False

        device = ModbusDevice("DEV_NC", 1, "127.0.0.1", 502, "tcp")
        service._devices["DEV_NC"] = device
        res = service.read_device_data("DEV_NC")
        assert res["success"] is False  # not connected

        device.is_connected = True
        res = service.read_device_data("DEV_NC")
        assert res["success"] is False  # no register config

    def test_read_device_data_unknown_register_type_is_skipped(self):
        """Test read_device_data skips unknown register types gracefully."""
        from app.services.modbus_service import (
            ModbusDevice,
            ModbusRegister,
            ModbusService,
        )

        service = ModbusService()
        device = ModbusDevice("DEV_U", 1, "127.0.0.1", 502, "tcp")
        device.is_connected = True
        service._devices["DEV_U"] = device
        service._register_configs["DEV_U"] = [
            ModbusRegister("bogus_type", 1, 1, "uint16"),
        ]
        service._clients["DEV_U"] = Mock()

        res = service.read_device_data("DEV_U")
        assert res["success"] is True
        assert res["readings"] == {}

    # ---- write_register additional paths ----

    def test_write_register_holding_register_non_float(self):
        """Test write_register with non-float holding register values."""
        from app.services.modbus_service import ModbusDevice, ModbusService

        service = ModbusService()
        device = ModbusDevice("DEV_W", 1, "127.0.0.1", 502, "tcp")
        device.is_connected = True
        service._devices["DEV_W"] = device
        mock_client = Mock(write_single_register=Mock(return_value=True))
        service._clients["DEV_W"] = mock_client

        assert service.write_register("DEV_W", "holding_register", 10, 42, "uint16") is True
        mock_client.write_single_register.assert_called_once_with(10, 42, 1)

    def test_write_register_unknown_type_and_guard_clauses(self):
        """Test write_register handles unknown types, missing device, and not connected."""
        from app.services.modbus_service import ModbusDevice, ModbusService

        service = ModbusService()
        assert service.write_register("MISSING", "coil", 1, True) is False

        device = ModbusDevice("DEV_NC2", 1, "127.0.0.1", 502, "tcp")
        service._devices["DEV_NC2"] = device
        assert service.write_register("DEV_NC2", "coil", 1, True) is False  # not connected

        device.is_connected = True
        service._clients["DEV_NC2"] = Mock()
        assert service.write_register("DEV_NC2", "bogus_register", 1, 5) is False

    # ---- status reporting tests ----

    def test_get_device_status_variants(self):
        """Test get_device_status handles both specific device and all devices."""
        from app.services.modbus_service import ModbusDevice, ModbusService

        service = ModbusService()
        assert service.get_device_status("MISSING") == {"error": "Device MISSING not found"}

        device = ModbusDevice("DEV_S", 1, "127.0.0.1", 502, "tcp")
        service._devices["DEV_S"] = device
        single = service.get_device_status("DEV_S")
        assert single["device_id"] == "DEV_S"

        all_status = service.get_device_status()
        assert "DEV_S" in all_status["devices"]
        assert all_status["total_devices"] == 1

    def test_get_status_states(self):
        """Test get_status returns correct states: not_initialized, degraded, ready, error."""
        from app.services.modbus_service import ModbusDevice, ModbusService

        service = ModbusService()
        assert service.get_status()["status"] == "not_initialized"

        d1 = ModbusDevice("DEV_1", 1, "127.0.0.1", 502, "tcp")
        d1.is_connected = True
        d2 = ModbusDevice("DEV_2", 1, "127.0.0.1", 502, "tcp")
        d2.is_connected = False
        service._devices = {"DEV_1": d1, "DEV_2": d2}
        assert service.get_status()["status"] == "degraded"

        d2.is_connected = True
        assert service.get_status()["status"] == "ready"

        d1.is_connected = False
        d2.is_connected = False
        assert service.get_status()["status"] == "error"

    def test_get_status_demo_flag(self, monkeypatch):
        """Test get_status demo flag based on environment settings."""
        from app.services.modbus_service import ModbusService

        # Default: no app, no env vars = production (demo=False)
        monkeypatch.delenv("FLASK_ENV", raising=False)
        monkeypatch.delenv("TESTING", raising=False)
        monkeypatch.delenv("MODBUS_DEMO", raising=False)
        service = ModbusService()
        assert service.get_status()["demo"] is False

        # FLASK_ENV=development enables demo
        monkeypatch.setenv("FLASK_ENV", "development")
        assert service.get_status()["demo"] is True

        # MODBUS_DEMO=true enables demo even in production
        monkeypatch.setenv("FLASK_ENV", "production")
        monkeypatch.setenv("MODBUS_DEMO", "true")
        assert service.get_status()["demo"] is True

        # TESTING=true (via app.config) enables demo
        monkeypatch.delenv("MODBUS_DEMO", raising=False)
        fake_app = Mock()
        fake_app.config = {"TESTING": True}
        service._app = fake_app
        assert service.get_status()["demo"] is True

        # TESTING=true (via environment variable) enables demo
        monkeypatch.setenv("TESTING", "true")
        service = ModbusService()
        assert service.get_status()["demo"] is True

    # ---- mock client direct coverage ----

    def test_modbus_client_direct_methods(self):
        """Test ModbusClient read/write methods directly."""
        from app.services.modbus_service import ModbusClient

        client = ModbusClient("127.0.0.1", 502)
        client.connect()

        assert len(client.read_input_registers(1, 3)) == 3
        assert len(client.read_coils(1, 2)) == 2
        assert len(client.read_discrete_inputs(1, 2)) == 2
        assert client.write_single_coil(1, True) is True
        assert client.write_single_register(1, 100) is True
        assert client.write_multiple_registers(1, [1, 2]) is True

    def test_modbus_client_raises_when_disconnected(self):
        """Test ModbusClient raises ConnectionError when disconnected."""
        from app.services.modbus_service import ModbusClient

        client = ModbusClient("127.0.0.1", 502)
        with pytest.raises(ConnectionError):
            client.read_holding_registers(1, 1)
        with pytest.raises(ConnectionError):
            client.read_coils(1, 1)
        with pytest.raises(ConnectionError):
            client.write_single_coil(1, True)
        with pytest.raises(ConnectionError):
            client.write_single_register(1, 1)
        with pytest.raises(ConnectionError):
            client.write_multiple_registers(1, [1])

    # ---- sensitive logging flag ----

    def test_sensitive_logging_flag(self, monkeypatch):
        """Test _is_sensitive_logging_enabled reads environment variable correctly."""
        from app.services.modbus_service import _is_sensitive_logging_enabled

        monkeypatch.delenv("MODBUS_LOG_SENSITIVE_DATA", raising=False)
        assert _is_sensitive_logging_enabled() is False

        monkeypatch.setenv("MODBUS_LOG_SENSITIVE_DATA", "true")
        assert _is_sensitive_logging_enabled() is True

    def test_service_init_with_app(self):
        """Test ModbusService initialization with Flask app."""
        from app.services.modbus_service import ModbusService

        fake_app = Mock()
        service = ModbusService(app=fake_app)
        assert service._app is fake_app
