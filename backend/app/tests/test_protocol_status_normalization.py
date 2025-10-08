"""Tests for protocol status normalization (PR1)."""
import pytest
from unittest.mock import Mock, patch
from app.protocols.base import ProtocolStatus
from app.protocols.registry import collect_protocol_status, _fallback
from app.utils.status_utils import utc_now  # Import from status_utils
from app.exceptions import (
    ThermaCoreException, MQTTException, OPCUAException, 
    ModbusException, DNP3Exception, ServiceUnavailableException
)


class TestProtocolStatusBase:
    """Test the ProtocolStatus data class."""

    def test_protocol_status_creation(self):
        """Test creating a ProtocolStatus object."""
        status = ProtocolStatus(
            name="mqtt",
            available=True,
            connected=True,
            status="ready"
        )
        assert status.name == "mqtt"
        assert status.available is True
        assert status.connected is True
        assert status.status == "ready"
        assert status.demo is False
        assert status.last_heartbeat is None

    def test_protocol_status_to_dict(self):
        """Test converting ProtocolStatus to dictionary."""
        timestamp = utc_now()  # Use timezone-aware datetime

        status = ProtocolStatus(
            name="opcua",
            available=True,
            connected=False,
            status="error",
            error={"code": "CONNECTION_FAILED", "message": "Server unreachable"},
            version="1.04",
            last_heartbeat=timestamp,
            demo=True
        )

        result = status.to_dict()

        assert result["name"] == "opcua"
        assert result["available"] is True
        assert result["connected"] is False
        assert result["status"] == "error"
        assert result["error"]["code"] == "CONNECTION_FAILED"
        assert result["version"] == "1.04"
        assert result["last_heartbeat"] == timestamp.isoformat()
        assert result["demo"] is True

        # Test that computed fields are present (from status_utils)
        assert "is_heartbeat_stale" in result
        assert "time_since_last_heartbeat" in result
        assert "is_recovering" in result
        assert "health_score" in result


class TestProtocolRegistry:
    """Test the protocol registry collection functionality."""

    def test_fallback_status(self):
        """Test fallback status creation."""
        status = _fallback("test_protocol")

        assert status.name == "test_protocol"
        assert status.available is False
        assert status.connected is False
        assert status.status == "not_initialized"

    @patch('app.protocols.registry.current_app')
    def test_collect_protocol_status_no_adapters(self, mock_app):
        """Test collection when no adapters are available."""
        # Mock current_app to have no protocol adapters
        mock_app.mqtt_client = None
        mock_app.opcua_client = None
        mock_app.modbus_service = None
        mock_app.dnp3_service = None
        mock_app.protocol_simulator = None

        statuses = collect_protocol_status()

        # Should have 5 protocols all in not_initialized state
        assert len(statuses) == 5
        for status in statuses:
            assert status["available"] is False
            assert status["connected"] is False
            assert status["status"] == "not_initialized"

    @patch('app.protocols.registry.current_app')
    def test_collect_protocol_status_with_working_adapters(self, mock_app):
        """Test collection with working protocol adapters."""
        # Mock MQTT adapter
        mock_mqtt = Mock()
        mock_mqtt.get_status.return_value = {
            "available": True,
            "connected": True,
            "status": "ready",
            "version": "3.1.1",
            "metrics": {"messages_sent": 100, "messages_received": 150}
        }
        mock_app.mqtt_client = mock_mqtt

        # Mock OPC UA adapter with error
        mock_opcua = Mock()
        mock_opcua.get_status.return_value = {
            "available": True,
            "connected": False,
            "status": "error",
            "error": {"code": "CONNECTION_REFUSED", "message": "Server unreachable"}
        }
        mock_app.opcua_client = mock_opcua

        # Mock unavailable services
        mock_app.modbus_service = None
        mock_app.dnp3_service = None
        mock_app.protocol_simulator = None

        statuses = collect_protocol_status()
        statuses_dict = {s["name"]: s for s in statuses}

        # Check MQTT status
        mqtt_status = statuses_dict["mqtt"]
        assert mqtt_status["available"] is True
        assert mqtt_status["connected"] is True
        assert mqtt_status["status"] == "ready"
        assert mqtt_status["version"] == "3.1.1"
        assert mqtt_status["metrics"]["messages_sent"] == 100

        # Check OPC UA status
        opcua_status = statuses_dict["opcua"]
        assert opcua_status["available"] is True
        assert opcua_status["connected"] is False
        assert opcua_status["status"] == "error"
        assert opcua_status["error"]["code"] == "CONNECTION_REFUSED"

        # Check fallback statuses
        for protocol_name in ["modbus", "dnp3", "simulator"]:
            protocol_status = statuses_dict[protocol_name]
            assert protocol_status["available"] is False
            assert protocol_status["connected"] is False
            assert protocol_status["status"] == "not_initialized"

    @patch('app.protocols.registry.current_app')
    def test_collect_protocol_status_with_exception(self, mock_app):
        """Test collection when adapter raises exception."""
        # Mock adapter that raises exception
        mock_mqtt = Mock()
        mock_mqtt.get_status.side_effect = Exception("Connection timeout")
        mock_app.mqtt_client = mock_mqtt

        # Mock unavailable services
        mock_app.opcua_client = None
        mock_app.modbus_service = None
        mock_app.dnp3_service = None
        mock_app.protocol_simulator = None

        statuses = collect_protocol_status()
        statuses_dict = {s["name"]: s for s in statuses}

        # Check error handling
        mqtt_status = statuses_dict["mqtt"]
        assert mqtt_status["available"] is False
        assert mqtt_status["connected"] is False
        assert mqtt_status["status"] == "error"
        assert mqtt_status["error"]["code"] == "STATUS_FETCH_ERROR"
        assert "Connection timeout" in mqtt_status["error"]["message"]


class TestThermaCoreExceptions:
    """Test the ThermaCore exception hierarchy."""

    def test_base_exception(self):
        """Test base ThermaCore exception."""
        exc = ThermaCoreException(
            "Test error",
            error_type="validation_error",
            status_code=400,
            context="Test Context",
            details={"field": "test_field"}
        )

        assert str(exc) == "Test error"
        assert exc.error_type == "validation_error"
        assert exc.status_code == 400
        assert exc.context == "Test Context"
        assert exc.details["field"] == "test_field"

    def test_protocol_exceptions(self):
        """Test protocol-specific exceptions."""
        mqtt_exc = MQTTException("MQTT connection failed")
        assert mqtt_exc.error_type == "connection_error"
        assert mqtt_exc.status_code == 503
        assert mqtt_exc.details["protocol"] == "MQTT"

        opcua_exc = OPCUAException("OPC UA server unreachable")
        assert opcua_exc.error_type == "connection_error"
        assert opcua_exc.details["protocol"] == "OPC UA"

        modbus_exc = ModbusException("Modbus device timeout")
        assert modbus_exc.details["protocol"] == "Modbus"

        dnp3_exc = DNP3Exception("DNP3 outstation offline")
        assert dnp3_exc.details["protocol"] == "DNP3"

    def test_service_exception(self):
        """Test service unavailable exception."""
        exc = ServiceUnavailableException("Test Service")

        assert "Test Service service is currently unavailable" in str(exc)
        assert exc.error_type == "service_unavailable"
        assert exc.status_code == 503
        assert exc.details["service_name"] == "Test Service"


class TestExceptionIntegration:
    """Test how exceptions integrate with SecurityAwareErrorHandler."""

    def test_exception_error_type_mapping(self):
        """Test that exception error types map to SecurityAwareErrorHandler."""
        # Import SecurityAwareErrorHandler
        from app.utils.error_handler import SecurityAwareErrorHandler

        # Test that our exception error types exist in the handler
        mqtt_exc = MQTTException("Connection failed")
        assert mqtt_exc.error_type in SecurityAwareErrorHandler.GENERIC_MESSAGES

        service_exc = ServiceUnavailableException("Test")
        assert service_exc.error_type in SecurityAwareErrorHandler.GENERIC_MESSAGES

    def test_exception_with_error_handler(self):
        """Test exception used with SecurityAwareErrorHandler."""
        from app.utils.error_handler import SecurityAwareErrorHandler

        exc = MQTTException(
            "Broker connection failed",
            details={"broker": "mqtt.example.com", "port": 1883}
        )

        # Test that we can use handle_service_error with our exception
        response, status_code = SecurityAwareErrorHandler.handle_service_error(
            exc, 
            exc.error_type, 
            exc.context, 
            exc.status_code
        )

        assert status_code == 503
        # Should return generic message, not the actual error details
        assert "temporarily unavailable" in response.get_json()["error"].lower()


if __name__ == "__main__":
    pytest.main([__file__])