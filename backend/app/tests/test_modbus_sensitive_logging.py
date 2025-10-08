"""Tests for Modbus sensitive logging configuration."""
import os
from unittest.mock import Mock, patch

from app.services.modbus_service import (
    ModbusService, ModbusClient, _is_sensitive_logging_enabled
)


class TestModbusSensitiveLogging:
    """Test Modbus sensitive logging configuration and behavior."""

    def test_sensitive_logging_disabled_by_default(self):
        """Test that sensitive logging is disabled by default."""
        # Clear any existing environment variable
        if 'MODBUS_LOG_SENSITIVE_DATA' in os.environ:
            del os.environ['MODBUS_LOG_SENSITIVE_DATA']

        assert _is_sensitive_logging_enabled() is False

    def test_sensitive_logging_enabled_with_env_var(self):
        """Test that sensitive logging can be enabled via environment variable."""
        os.environ['MODBUS_LOG_SENSITIVE_DATA'] = 'true'
        assert _is_sensitive_logging_enabled() is True

        # Clean up
        del os.environ['MODBUS_LOG_SENSITIVE_DATA']

    def test_sensitive_logging_disabled_with_false_env_var(self):
        """Test that sensitive logging stays disabled with false value."""
        os.environ['MODBUS_LOG_SENSITIVE_DATA'] = 'false'
        assert _is_sensitive_logging_enabled() is False

        # Clean up
        del os.environ['MODBUS_LOG_SENSITIVE_DATA']

    def test_read_device_data_logs_sensor_type_on_error(self):
        """Test that read_device_data includes sensor_type in error logs."""
        service = ModbusService()

        # Add and connect a device
        service.add_device('test_device', 1, 'localhost', 502)
        service.connect_device('test_device')

        # Add register configuration with sensor_type
        registers = [{
            'register_type': 'holding_register',
            'address': 100,
            'count': 2,
            'data_type': 'float32',
            'sensor_type': 'temperature'
        }]
        service.add_register_config('test_device', registers)

        # Mock the client to raise an exception
        mock_client = service._clients['test_device']
        mock_client.read_holding_registers = Mock(side_effect=Exception("Read error"))

        # Capture log output
        with patch('app.services.modbus_service.logger') as mock_logger:
            service.read_device_data('test_device')

            # Verify error was logged with sensor_type context
            assert mock_logger.error.called
            error_call_args = str(mock_logger.error.call_args)
            assert 'sensor_type=temperature' in error_call_args
            assert 'test_device' in error_call_args

    def test_write_register_logs_register_type_on_error(self):
        """Test that write_register includes register_type in error logs."""
        service = ModbusService()

        # Add and connect a device
        service.add_device('test_device', 1, 'localhost', 502)
        service.connect_device('test_device')

        # Mock the client to raise an exception
        mock_client = service._clients['test_device']
        mock_client.write_single_register = Mock(side_effect=Exception("Write error"))

        # Capture log output
        with patch('app.services.modbus_service.logger') as mock_logger:
            result = service.write_register(
                'test_device', 'holding_register', 100, 42, 'uint16'
            )

            # Verify error was logged with register_type context
            assert mock_logger.error.called
            error_call_args = str(mock_logger.error.call_args)
            assert 'register_type=holding_register' in error_call_args
            assert 'test_device' in error_call_args
            assert result is False

    def test_read_logs_no_address_when_sensitive_disabled(self):
        """Test that read operations don't log addresses when sensitive logging disabled."""
        # Ensure sensitive logging is disabled
        if 'MODBUS_LOG_SENSITIVE_DATA' in os.environ:
            del os.environ['MODBUS_LOG_SENSITIVE_DATA']

        service = ModbusService()
        service.add_device('test_device', 1, 'localhost', 502)
        service.connect_device('test_device')

        registers = [{
            'register_type': 'holding_register',
            'address': 100,
            'count': 2,
            'data_type': 'float32',
            'sensor_type': 'temperature'
        }]
        service.add_register_config('test_device', registers)

        # Capture log output
        with patch('app.services.modbus_service.logger') as mock_logger:
            service.read_device_data('test_device')

            # Check debug logs - they should not contain address
            debug_calls = [str(call) for call in mock_logger.debug.call_args_list]
            for call in debug_calls:
                # Should not log address 100
                assert 'address 100' not in call.lower() or 'address {address}' in call

    def test_read_logs_address_when_sensitive_enabled(self):
        """Test that read operations log addresses when sensitive logging enabled."""
        # Enable sensitive logging
        os.environ['MODBUS_LOG_SENSITIVE_DATA'] = 'true'

        try:
            service = ModbusService()
            service.add_device('test_device', 1, 'localhost', 502)
            service.connect_device('test_device')

            registers = [{
                'register_type': 'holding_register',
                'address': 100,
                'count': 2,
                'data_type': 'float32',
                'sensor_type': 'temperature'
            }]
            service.add_register_config('test_device', registers)

            # Capture log output
            with patch('app.services.modbus_service.logger') as mock_logger:
                service.read_device_data('test_device')

                # Check debug logs - they should contain address
                debug_calls = [str(call) for call in mock_logger.debug.call_args_list]
                has_address = any('address 100' in call.lower() or 
                                '100' in call for call in debug_calls)
                assert has_address, "Expected address to be logged when sensitive logging enabled"
        finally:
            # Clean up
            del os.environ['MODBUS_LOG_SENSITIVE_DATA']

    def test_write_logs_no_address_when_sensitive_disabled(self):
        """Test that write operations don't log addresses when sensitive logging disabled."""
        # Ensure sensitive logging is disabled
        if 'MODBUS_LOG_SENSITIVE_DATA' in os.environ:
            del os.environ['MODBUS_LOG_SENSITIVE_DATA']

        service = ModbusService()
        service.add_device('test_device', 1, 'localhost', 502)
        service.connect_device('test_device')

        # Capture log output
        with patch('app.services.modbus_service.logger') as mock_logger:
            service.write_register(
                'test_device', 'holding_register', 100, 42, 'uint16'
            )

            # Check info logs - they should not contain address
            info_calls = [str(call) for call in mock_logger.info.call_args_list]
            for call in info_calls:
                # Should not log specific address 100
                assert 'address 100' not in call.lower() or 'address {address}' in call

    def test_write_logs_address_when_sensitive_enabled(self):
        """Test that write operations log addresses when sensitive logging enabled."""
        # Enable sensitive logging
        os.environ['MODBUS_LOG_SENSITIVE_DATA'] = 'true'

        try:
            service = ModbusService()
            service.add_device('test_device', 1, 'localhost', 502)
            service.connect_device('test_device')

            # Capture log output
            with patch('app.services.modbus_service.logger') as mock_logger:
                service.write_register(
                    'test_device', 'holding_register', 100, 42, 'uint16'
                )

                # Check info logs - they should contain address
                info_calls = [str(call) for call in mock_logger.info.call_args_list]
                has_address = any('address 100' in call.lower() or 
                                '100' in call for call in info_calls)
                assert has_address, "Expected address to be logged when sensitive logging enabled"
        finally:
            # Clean up
            del os.environ['MODBUS_LOG_SENSITIVE_DATA']

    def test_write_float32_logs_multiple_registers_correctly(self):
        """Test that float32 writes log correctly as multiple register operations."""
        # Ensure sensitive logging is disabled
        if 'MODBUS_LOG_SENSITIVE_DATA' in os.environ:
            del os.environ['MODBUS_LOG_SENSITIVE_DATA']

        service = ModbusService()
        service.add_device('test_device', 1, 'localhost', 502)
        service.connect_device('test_device')

        # Mock the write_multiple_registers method
        mock_client = service._clients['test_device']
        mock_client.write_multiple_registers = Mock(return_value=True)

        # Capture log output
        with patch('app.services.modbus_service.logger') as mock_logger:
            result = service.write_register(
                'test_device', 'holding_register', 100, 3.14159, 'float32'
            )

            # Check that it logs as multiple register write
            info_calls = [str(call) for call in mock_logger.info.call_args_list]
            # Should mention "multiple registers" or "registers" (plural)
            has_multiple = any('multiple' in call.lower() or 
                             'registers' in call.lower() for call in info_calls)
            assert has_multiple
            assert result is True

    def test_error_logs_include_context_without_address(self):
        """Test that error logs include useful context without exposing addresses."""
        # Ensure sensitive logging is disabled
        if 'MODBUS_LOG_SENSITIVE_DATA' in os.environ:
            del os.environ['MODBUS_LOG_SENSITIVE_DATA']

        service = ModbusService()
        service.add_device('test_device', 1, 'localhost', 502)
        service.connect_device('test_device')

        # Add register with sensor_type
        registers = [{
            'register_type': 'holding_register',
            'address': 100,
            'count': 1,
            'data_type': 'uint16',
            'sensor_type': 'pressure_sensor'
        }]
        service.add_register_config('test_device', registers)

        # Mock error
        mock_client = service._clients['test_device']
        mock_client.read_holding_registers = Mock(side_effect=Exception("Connection timeout"))

        # Capture log output
        with patch('app.services.modbus_service.logger') as mock_logger:
            service.read_device_data('test_device')

            # Verify error log has context but no address
            assert mock_logger.error.called
            error_call_args = str(mock_logger.error.call_args)

            # Should have sensor_type and register_type for context
            assert 'sensor_type=pressure_sensor' in error_call_args
            assert 'register_type=holding_register' in error_call_args

            # Should not have address=100 (since sensitive logging disabled)
            assert 'address=100' not in error_call_args

    def test_client_read_methods_respect_sensitive_logging(self):
        """Test that ModbusClient read methods respect sensitive logging setting."""
        client = ModbusClient('localhost', 502)
        client.connected = True

        # Test with sensitive logging disabled
        if 'MODBUS_LOG_SENSITIVE_DATA' in os.environ:
            del os.environ['MODBUS_LOG_SENSITIVE_DATA']

        with patch('app.services.modbus_service.logger') as mock_logger:
            client.read_holding_registers(100, 2, 1)

            # Should not log address
            debug_calls = [str(call) for call in mock_logger.debug.call_args_list]
            for call in debug_calls:
                assert 'address 100' not in call.lower() or 'address {address}' in call

        # Test with sensitive logging enabled
        os.environ['MODBUS_LOG_SENSITIVE_DATA'] = 'true'
        try:
            with patch('app.services.modbus_service.logger') as mock_logger:
                client.read_holding_registers(200, 2, 1)

                # Should log address
                debug_calls = [str(call) for call in mock_logger.debug.call_args_list]
                has_address = any('200' in call for call in debug_calls)
                assert has_address
        finally:
            del os.environ['MODBUS_LOG_SENSITIVE_DATA']

    def test_client_write_methods_respect_sensitive_logging(self):
        """Test that ModbusClient write methods respect sensitive logging setting."""
        client = ModbusClient('localhost', 502)
        client.connected = True

        # Test with sensitive logging disabled
        if 'MODBUS_LOG_SENSITIVE_DATA' in os.environ:
            del os.environ['MODBUS_LOG_SENSITIVE_DATA']

        with patch('app.services.modbus_service.logger') as mock_logger:
            client.write_single_register(100, 42, 1)

            # Should not log address
            info_calls = [str(call) for call in mock_logger.info.call_args_list]
            for call in info_calls:
                assert 'address 100' not in call.lower() or 'address {address}' in call

        # Test with sensitive logging enabled
        os.environ['MODBUS_LOG_SENSITIVE_DATA'] = 'true'
        try:
            with patch('app.services.modbus_service.logger') as mock_logger:
                client.write_single_register(200, 42, 1)

                # Should log address
                info_calls = [str(call) for call in mock_logger.info.call_args_list]
                has_address = any('200' in call for call in info_calls)
                assert has_address
        finally:
            del os.environ['MODBUS_LOG_SENSITIVE_DATA']
