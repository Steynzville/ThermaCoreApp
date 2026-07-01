"""Tests for protocol status registry."""

import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from flask import Flask

from app.protocols.registry import (
    validate_registry,
    collect_protocol_status,
    get_protocols_list,
    _fallback,
)
from app.protocols.base import ProtocolStatus


def test_validate_registry_success():
    """Test that validate_registry passes without duplicates."""
    # This should pass without raising since our default registry is valid
    validate_registry()


def test_validate_registry_failure():
    """Test that validate_registry raises ValueError with duplicates."""
    bad_registry = [("mqtt", "mqtt_client"), ("mqtt", "mqtt_client_dup")]
    
    with patch("app.protocols.registry.REGISTRY", bad_registry):
        with pytest.raises(ValueError) as exc:
            validate_registry()
        assert "Duplicate protocol names found" in str(exc.value)


def test_get_protocols_list():
    """Test that get_protocols_list returns correct protocol names."""
    names = get_protocols_list()
    assert "mqtt" in names
    assert "opcua" in names
    assert "modbus" in names


def test_collect_protocol_status_success(app):
    """Test collect_protocol_status under various success conditions."""
    mock_mqtt = MagicMock()
    # Mock return values for mqtt status dictionary
    mock_mqtt.get_status.return_value = {
        "available": True,
        "connected": True,
        "status": "connected",
        "last_heartbeat": "2026-06-26T17:12:29.000Z",
        "last_error_time": datetime(2026, 6, 26, 17, 12, 29, tzinfo=timezone.utc),
        "version": "1.0.0",
        "metrics": {"messages_sent": 100}
    }

    mock_opcua = MagicMock()
    mock_opcua.get_status.return_value = {
        "available": False,
        "status": "error",
        "last_heartbeat": datetime(2026, 6, 26, 17, 10, 0, tzinfo=timezone.utc),
        "last_error_time": "2026-06-26T17:10:00.000Z",
        "heartbeat_timeout_seconds": 60,
        "retry_count": 5
    }

    # Rest of protocols won't have adapters on app, they will fall back
    with app.app_context():
        with patch("flask.current_app.mqtt_client", mock_mqtt, create=True), \
             patch("flask.current_app.opcua_client", mock_opcua, create=True):
            
            statuses = collect_protocol_status()
            assert len(statuses) == 5 # Default registry size
            
            # Find mqtt status
            mqtt_status = next(s for s in statuses if s["name"] == "mqtt")
            assert mqtt_status["available"] is True
            assert mqtt_status["connected"] is True
            assert mqtt_status["status"] == "connected"
            assert mqtt_status["last_heartbeat"] == "2026-06-26T17:12:29+00:00"
            assert mqtt_status["last_error_time"] == "2026-06-26T17:12:29+00:00"

            # Find opcua status
            opcua_status = next(s for s in statuses if s["name"] == "opcua")
            assert opcua_status["available"] is False
            assert opcua_status["status"] == "error"
            assert opcua_status["last_heartbeat"] == "2026-06-26T17:10:00+00:00"
            assert opcua_status["last_error_time"] == "2026-06-26T17:10:00+00:00"


def test_collect_protocol_status_invalid_formats_and_exceptions(app):
    """Test invalid heartbeat / error format handling and exceptions."""
    mock_mqtt = MagicMock()
    mock_mqtt.get_status.return_value = {
        "available": True,
        "last_heartbeat": "invalid-date-format",
        "last_error_time": "invalid-error-date"
    }

    mock_opcua = MagicMock()
    mock_opcua.get_status.side_effect = Exception("Adapter malfunction")

    with app.app_context():
        with patch("flask.current_app.mqtt_client", mock_mqtt, create=True), \
             patch("flask.current_app.opcua_client", mock_opcua, create=True):
            
            statuses = collect_protocol_status()
            
            # mqtt should fallback to None for invalid dates
            mqtt_status = next(s for s in statuses if s["name"] == "mqtt")
            assert mqtt_status["last_heartbeat"] is None
            assert mqtt_status["last_error_time"] is None

            # opcua should register status as "error" due to exception
            opcua_status = next(s for s in statuses if s["name"] == "opcua")
            assert opcua_status["status"] == "error"
            assert opcua_status["error"]["code"] == "STATUS_FETCH_ERROR"


def test_collect_protocol_status_duplicates_and_non_dict_adapter(app):
    """Test collection when encountering duplicate protocol names or non-dict adapter."""
    mock_mqtt = MagicMock()
    # Returns raw ProtocolStatus object instead of dict
    raw_status_obj = ProtocolStatus(
        name="mqtt",
        available=True,
        connected=True,
        status="healthy"
    )
    mock_mqtt.get_status.return_value = raw_status_obj

    # Create dummy registry with duplicate mqtt protocol
    bad_registry = [
        ("mqtt", "mqtt_client"),
        ("mqtt", "mqtt_client_dup")
    ]

    with app.app_context():
        with patch("flask.current_app.mqtt_client", mock_mqtt, create=True), \
             patch("app.protocols.registry.REGISTRY", bad_registry):
            
            statuses = collect_protocol_status()
            # The second mqtt duplicate should have been skipped in the collection loop
            assert len(statuses) == 1
            assert statuses[0]["name"] == "mqtt"
            assert statuses[0]["status"] == "healthy"
