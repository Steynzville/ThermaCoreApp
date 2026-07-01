"""Tests for SCADA services initialization helper."""

import pytest
import logging
from unittest.mock import ANY, MagicMock, patch
from app.service_init import (
    initialize_all_services,
    _initialize_critical_services,
    _initialize_opcua_clients,
    _initialize_optional_services,
)


def test_initialize_all_services_testing_bypass():
    """Test that services initialization is bypassed when TESTING is True."""
    mock_app = MagicMock()
    mock_app.config = {"TESTING": True}
    mock_logger = MagicMock()

    initialize_all_services(mock_app, mock_logger)
    # No service methods should be imported or run
    assert "mqtt_client" not in mock_app.__dict__


@patch("app.service_init.should_skip_external_services")
@patch("app.service_init._initialize_critical_services")
@patch("app.service_init._initialize_opcua_clients")
@patch("app.service_init._initialize_optional_services")
@patch("app.service_init.ProtocolGatewaySimulator")
def test_initialize_all_services_skip_external(
    mock_sim, mock_opt, mock_opc, mock_crit, mock_skip
):
    """Test initialize_all_services with external services skipped."""
    mock_app = MagicMock()
    mock_app.config = {"TESTING": False}
    mock_logger = MagicMock()
    
    mock_skip.return_value = True

    initialize_all_services(mock_app, mock_logger)

    mock_crit.assert_called_once_with(mock_app, mock_logger, ANY, ANY, True)
    mock_opc.assert_called_once_with(mock_app, mock_logger, ANY, ANY, ANY, True)
    mock_opt.assert_called_once()
    assert mock_app.mqtt_client is None


@patch("app.service_init.should_skip_external_services", return_value=False)
@patch("app.service_init._initialize_critical_services")
@patch("app.service_init._initialize_opcua_clients")
@patch("app.service_init._initialize_optional_services")
@patch("app.service_init.ProtocolGatewaySimulator")
def test_initialize_all_services_with_external(
    mock_sim, mock_opt, mock_opc, mock_crit, mock_skip
):
    """Test initialize_all_services with external services initialized."""
    mock_app = MagicMock()
    mock_app.config = {"TESTING": False}
    mock_logger = MagicMock()

    initialize_all_services(mock_app, mock_logger)

    mock_crit.assert_called_once_with(mock_app, mock_logger, ANY, ANY, False)
    mock_opc.assert_called_once_with(mock_app, mock_logger, ANY, ANY, ANY, False)


def test_initialize_critical_services():
    """Test critical services initialization."""
    mock_app = MagicMock()
    mock_app.config = {"SERVICE_MQTT_REQUIRED": True}
    mock_logger = MagicMock()
    mock_data_storage = MagicMock()
    mock_mqtt = MagicMock()

    with patch("app.service_init.safe_service_init") as mock_safe_init:
        # Scenario 1: Do not skip external
        _initialize_critical_services(mock_app, mock_logger, mock_data_storage, mock_mqtt, False)
        assert mock_safe_init.call_count == 2

        # Scenario 2: Skip external
        mock_safe_init.reset_mock()
        _initialize_critical_services(mock_app, mock_logger, mock_data_storage, mock_mqtt, True)
        assert mock_safe_init.call_count == 1  # Only storage


def test_initialize_opcua_clients_success():
    """Test OPC-UA clients initialization with secure success."""
    mock_app = MagicMock()
    mock_app.config = {"SERVICE_OPCUA_REQUIRED": True}
    mock_logger = MagicMock()
    mock_secure = MagicMock()
    mock_standard = MagicMock()
    mock_storage = MagicMock()

    with patch("app.service_init.safe_service_init") as mock_safe_init:
        _initialize_opcua_clients(mock_app, mock_logger, mock_secure, mock_standard, mock_storage, False)
        assert mock_app.secure_opcua_client == mock_secure
        assert mock_app.opcua_client == mock_secure


def test_initialize_opcua_clients_fallback():
    """Test OPC-UA clients falling back to standard when secure fails."""
    mock_app = MagicMock()
    mock_app.config = {"SERVICE_OPCUA_REQUIRED": False}
    mock_logger = MagicMock()
    mock_secure = MagicMock()
    mock_standard = MagicMock()
    mock_storage = MagicMock()

    with patch("app.service_init.safe_service_init") as mock_safe_init:
        # Mock first init (secure) to raise Exception, second (standard) to succeed
        mock_safe_init.side_effect = [Exception("Secure failed"), None]
        
        _initialize_opcua_clients(mock_app, mock_logger, mock_secure, mock_standard, mock_storage, False)
        assert mock_app.opcua_client == mock_standard


def test_initialize_opcua_clients_all_fail():
    """Test OPC-UA clients standard and secure failure scenarios."""
    mock_app = MagicMock()
    mock_app.config = {"SERVICE_OPCUA_REQUIRED": True}
    mock_logger = MagicMock()
    mock_secure = MagicMock()
    mock_standard = MagicMock()
    mock_storage = MagicMock()

    with patch("app.service_init.safe_service_init") as mock_safe_init:
        # Both raise exception
        mock_safe_init.side_effect = [Exception("Secure failed"), Exception("Standard failed")]
        
        _initialize_opcua_clients(mock_app, mock_logger, mock_secure, mock_standard, mock_storage, False)
        assert mock_app.opcua_client is None


def test_initialize_optional_services():
    """Test optional services initialization."""
    mock_app = MagicMock()
    mock_logger = MagicMock()
    
    with patch("app.service_init.safe_service_init") as mock_safe_init:
        _initialize_optional_services(
            mock_app, mock_logger, MagicMock(), MagicMock(), MagicMock(),
            MagicMock(), MagicMock(), MagicMock()
        )
        assert mock_safe_init.call_count == 5


@patch("app.service_init.is_production_environment", return_value=True)
@patch("app.service_init.should_skip_external_services", side_effect=Exception("Crash during skip check"))
def test_initialize_all_services_production_exception(mock_skip, mock_is_prod):
    """Test that unexpected exceptions in production environment raise RuntimeError."""
    mock_app = MagicMock()
    mock_app.config = {"TESTING": False}
    mock_logger = MagicMock()

    with pytest.raises(RuntimeError):
        initialize_all_services(mock_app, mock_logger)
