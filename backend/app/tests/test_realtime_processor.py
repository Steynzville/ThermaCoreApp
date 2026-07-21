"""Tests for real-time data processor."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.services.realtime_processor import RealTimeDataProcessor


def test_realtime_processor_init(app):
    """Test initialization of real-time processor."""
    processor = RealTimeDataProcessor()
    assert processor._app is None
    assert len(processor._data_handlers) == 0
    assert len(processor._alert_rules) == 0

    processor_with_app = RealTimeDataProcessor(app)
    assert processor_with_app._app is app
    assert len(processor_with_app._alert_rules) == 3  # default rules count


def test_data_handlers():
    """Test registering and deregistering custom handlers."""
    processor = RealTimeDataProcessor()

    mock_handler = MagicMock()
    mock_handler.__name__ = "mock_handler"

    # Add handler
    processor.add_data_handler(mock_handler)
    assert mock_handler in processor._data_handlers

    # Adding duplicate should not change count
    processor.add_data_handler(mock_handler)
    assert len(processor._data_handlers) == 1

    # Remove handler
    processor.remove_data_handler(mock_handler)
    assert mock_handler not in processor._data_handlers


def test_validate_and_transform_data():
    """Test data validation, transformation, and normalization."""
    processor = RealTimeDataProcessor()

    # Raw input data
    raw_data = {
        "value": 24.567,
    }
    processed = processor._validate_and_transform_data(raw_data)
    # Check value rounded to 2 decimals
    assert processed["value"] == 24.57
    # Default quality set
    assert processed["quality"] == "GOOD"
    # Timestamp auto generated
    assert "timestamp" in processed
    assert isinstance(processed["timestamp"], datetime)

    # Invalid quality check
    raw_bad_quality = {
        "value": 1.0,
        "quality": "SUPER_GOOD",
    }
    processed_bad = processor._validate_and_transform_data(raw_bad_quality)
    assert processed_bad["quality"] == "UNCERTAIN"


def test_check_alert_rules():
    """Test alert rules evaluation for boundaries and conditions."""
    processor = RealTimeDataProcessor()
    processor._setup_default_alert_rules()

    # 1. High temperature (greater_than 85.0 critical)
    alerts_temp_high = processor._check_alert_rules(
        "UNIT001", "temperature", {"value": 86.5}
    )
    assert len(alerts_temp_high) == 1
    assert alerts_temp_high[0]["type"] == "critical"
    assert "86.5" in alerts_temp_high[0]["message"]

    # 2. Low temperature (less_than -10.0 warning)
    alerts_temp_low = processor._check_alert_rules(
        "UNIT001", "temperature", {"value": -11.0}
    )
    assert len(alerts_temp_low) == 1
    assert alerts_temp_low[0]["type"] == "warning"

    # 3. Value is None
    assert (
        len(processor._check_alert_rules("UNIT001", "temperature", {"value": None}))
        == 0
    )

    # 4. Custom rule: equals
    processor.add_alert_rule(
        "status", "equals", 0.0, severity="critical", message="Status is 0"
    )
    alerts_equals = processor._check_alert_rules("UNIT001", "status", {"value": 0.0})
    assert len(alerts_equals) == 1
    assert alerts_equals[0]["type"] == "critical"


def test_process_sensor_data_broadcasts_and_handlers():
    """Test processing sensor data broadcasts and triggers handlers."""
    processor = RealTimeDataProcessor()
    processor._setup_default_alert_rules()

    mock_handler = MagicMock()
    mock_handler.__name__ = "mock_handler"
    processor.add_data_handler(mock_handler)

    # Mock websocket_service
    with patch("app.services.realtime_processor.websocket_service") as mock_ws:
        # Trigger critical alert + normal broadcast
        processor.process_sensor_data(
            "UNIT002", "temperature", {"value": 95.0, "quality": "GOOD"}
        )

        # Should broadcast critical high temp alert
        assert mock_ws.broadcast_system_alert.called
        # Should broadcast current value
        assert mock_ws.broadcast_sensor_data.called
        # Should call custom handler
        assert mock_handler.called

    # Test error isolation: custom handler throws Exception but doesn't crash the whole processing
    mock_handler_broken = MagicMock(side_effect=Exception("Broken Handler"))
    mock_handler_broken.__name__ = "mock_handler_broken"
    processor.add_data_handler(mock_handler_broken)

    with patch("app.services.realtime_processor.websocket_service") as mock_ws:
        # Should not raise exception
        processor.process_sensor_data("UNIT002", "temperature", {"value": 20.0})
        assert mock_ws.broadcast_sensor_data.called


def test_process_unit_status_change():
    """Test unit status changes broadcasts notifications."""
    processor = RealTimeDataProcessor()

    with patch("app.services.realtime_processor.websocket_service") as mock_ws:
        processor.process_unit_status_change("UNIT003", "online", "error")
        # Should broadcast unit status
        assert mock_ws.broadcast_unit_status.called
        # "error" status change is critical -> triggers alert broadcast
        assert mock_ws.broadcast_system_alert.called

        mock_ws.reset_mock()
        processor.process_unit_status_change("UNIT003", "online", "maintenance")
        # "maintenance" status change -> warning alert broadcast
        assert mock_ws.broadcast_system_alert.called


def test_process_device_status_change():
    """Test device status changes and alert logs parsing."""
    processor = RealTimeDataProcessor()

    status_change_payload = {
        "deviceName": "Gate 1",
        "timestamp": datetime.now(timezone.utc),
        "changes": [
            {
                "event": "Connection Lost",
                "severity": "critical",
                "message": "Gate 1 lost connection!",
            },
            {
                "event": "Backup battery high",
                "severity": "info",
                "message": "Standard notification",
            },
        ],
    }

    with patch("app.services.realtime_processor.websocket_service") as mock_ws:
        processor.process_device_status_change("DEV_GATE_1", status_change_payload)

        # Should broadcast device status
        assert mock_ws.broadcast_device_status.called
        # Should broadcast 1 system alert for critical event
        assert mock_ws.broadcast_system_alert.call_count == 1
        alert_data = mock_ws.broadcast_system_alert.call_args[0][0]
        assert alert_data["severity"] == "critical"
        assert alert_data["title"] == "Connection Lost"


def test_get_status():
    """Test status summary dictionary mapping."""
    processor = RealTimeDataProcessor()
    processor._setup_default_alert_rules()

    status = processor.get_status()
    assert status["active_handlers"] == 0
    assert status["alert_rules"] == 3
    assert "mqtt_status" in status
    assert "websocket_status" in status
