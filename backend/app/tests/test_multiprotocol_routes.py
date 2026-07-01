"""Tests for multi-protocol management routes."""

import pytest
from unittest.mock import MagicMock, patch
from flask import json, current_app


def test_get_protocols_status_success(client, admin_token):
    """Test retrieving normalized protocol statuses."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    mock_status = [
        {
            "name": "modbus",
            "connected": True,
            "status": "ready",
            "is_heartbeat_stale": False,
            "availability_level": "fully_available",
            "health_score": 100.0,
            "is_recovering": False,
        },
        {
            "name": "dnp3",
            "connected": False,
            "status": "error",
            "is_heartbeat_stale": True,
            "availability_level": "unavailable",
            "health_score": 20.0,
            "is_recovering": True,
        }
    ]

    with patch("app.routes.multiprotocol.collect_protocol_status", return_value=mock_status), \
         patch("app.routes.multiprotocol.get_protocols_list", return_value=["modbus", "dnp3"]):
        
        response = client.get("/api/v1/protocols/status", headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["version"] == "1.1.0"
        assert data["summary"]["total_protocols"] == 2
        assert data["summary"]["active_protocols"] == 1
        assert data["summary"]["availability_summary"]["fully_available"] == 1
        assert data["summary"]["availability_summary"]["unavailable"] == 1
        assert data["summary"]["recovering_protocols"] == 1
        assert data["summary"]["health_score"] == 60.0


def test_get_protocols_status_error(client, admin_token):
    """Test protocols status endpoint error handling."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    with patch("app.routes.multiprotocol.collect_protocol_status", side_effect=Exception("Database issue")):
        response = client.get("/api/v1/protocols/status", headers=headers)
        # Standard error mapper converts Exception to a secure response
        assert response.status_code == 500
        data = response.get_json()
        assert data["success"] is False


def test_modbus_devices_not_available(client, admin_token):
    """Test Modbus endpoints when Modbus service is not available (not registered in app)."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Ensure current_app does not have modbus_service attribute
    # Since flask client has conftest app, let's use app_context without modbus_service
    # If conftest registers it, we can temporarily pop it or mock hasattr
    with patch("app.routes.multiprotocol.hasattr", return_value=False):
        response = client.get("/api/v1/protocols/modbus/devices", headers=headers)
        assert response.status_code == 503
        
        response2 = client.post("/api/v1/protocols/modbus/devices", headers=headers, json={})
        assert response2.status_code == 503

        response3 = client.post("/api/v1/protocols/modbus/devices/dev1/connect", headers=headers)
        assert response3.status_code == 503

        response4 = client.get("/api/v1/protocols/modbus/devices/dev1/data", headers=headers)
        assert response4.status_code == 503


def test_modbus_devices_success_scenarios(client, admin_token):
    """Test successful Modbus device operations."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    mock_modbus = MagicMock()
    mock_modbus.get_device_status.return_value = {"devices": {"dev1": {"connected": True}}}
    mock_modbus.add_device.return_value = True
    mock_modbus.connect_device.return_value = True
    mock_modbus.read_device_data.return_value = {"data": {"reg1": 10}}

    # We patch the Flask app's modbus_service attribute
    with patch("flask.current_app.modbus_service", mock_modbus, create=True):
        # 1. List devices
        res_list = client.get("/api/v1/protocols/modbus/devices", headers=headers)
        assert res_list.status_code == 200
        assert "devices" in res_list.get_json()

        # 2. Add device - Bad input
        res_add_fail = client.post(
            "/api/v1/protocols/modbus/devices",
            headers=headers,
            json={"device_id": "new_dev"} # Missing unit_id and host
        )
        assert res_add_fail.status_code == 400

        # Add device - Success
        res_add_ok = client.post(
            "/api/v1/protocols/modbus/devices",
            headers=headers,
            json={"device_id": "new_dev", "unit_id": 2, "host": "127.0.0.1"}
        )
        assert res_add_ok.status_code == 201
        assert "added successfully" in res_add_ok.get_json()["message"]

        # Add device - Service fail
        mock_modbus.add_device.return_value = False
        res_add_service_fail = client.post(
            "/api/v1/protocols/modbus/devices",
            headers=headers,
            json={"device_id": "new_dev", "unit_id": 2, "host": "127.0.0.1"}
        )
        assert res_add_service_fail.status_code == 500

        # 3. Connect device - Success
        mock_modbus.connect_device.return_value = True
        res_conn = client.post("/api/v1/protocols/modbus/devices/new_dev/connect", headers=headers)
        assert res_conn.status_code == 200
        assert "Connected to" in res_conn.get_json()["message"]

        # Connect device - Fail
        mock_modbus.connect_device.return_value = False
        res_conn_fail = client.post("/api/v1/protocols/modbus/devices/new_dev/connect", headers=headers)
        assert res_conn_fail.status_code == 500

        # 4. Read device data
        res_read = client.get("/api/v1/protocols/modbus/devices/new_dev/data", headers=headers)
        assert res_read.status_code == 200
        assert "data" in res_read.get_json()


def test_dnp3_devices_not_available(client, admin_token):
    """Test DNP3 endpoints when service is unavailable."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    with patch("app.routes.multiprotocol.hasattr", return_value=False):
        assert client.get("/api/v1/protocols/dnp3/devices", headers=headers).status_code == 503
        assert client.post("/api/v1/protocols/dnp3/devices", headers=headers, json={}).status_code == 503
        assert client.post("/api/v1/protocols/dnp3/devices/dev1/connect", headers=headers).status_code == 503
        assert client.get("/api/v1/protocols/dnp3/devices/dev1/data", headers=headers).status_code == 503
        assert client.post("/api/v1/protocols/dnp3/devices/dev1/integrity-poll", headers=headers).status_code == 503
        assert client.get("/api/v1/protocols/dnp3/performance/metrics", headers=headers).status_code == 503
        assert client.get("/api/v1/protocols/dnp3/performance/summary", headers=headers).status_code == 503
        assert client.get("/api/v1/protocols/dnp3/devices/dev1/performance", headers=headers).status_code == 503
        assert client.post("/api/v1/protocols/dnp3/performance/config", headers=headers, json={}).status_code == 503
        assert client.delete("/api/v1/protocols/dnp3/performance/metrics", headers=headers).status_code == 503


def test_dnp3_devices_success_scenarios(client, admin_token):
    """Test successful DNP3 device operations."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    mock_dnp3 = MagicMock()
    mock_dnp3.get_device_status.return_value = {"devices": {"dev1": {"connected": True}}}
    mock_dnp3.add_device.return_value = True
    mock_dnp3.connect_device.return_value = True
    mock_dnp3.read_device_data.return_value = {"readings": {"0": 1}}
    mock_dnp3.perform_integrity_poll.return_value = True
    mock_dnp3.get_performance_metrics.return_value = {"metrics": "test"}
    mock_dnp3.get_performance_summary.return_value = {"summary": "test"}
    mock_dnp3.get_device_performance_stats.return_value = {"stats": "test"}

    with patch("flask.current_app.dnp3_service", mock_dnp3, create=True):
        # List
        assert client.get("/api/v1/protocols/dnp3/devices", headers=headers).status_code == 200
        
        # Add device bad input
        assert client.post("/api/v1/protocols/dnp3/devices", headers=headers, json={"device_id": "test"}).status_code == 400
        
        # Add device success
        res_add = client.post(
            "/api/v1/protocols/dnp3/devices",
            headers=headers,
            json={"device_id": "test", "master_address": 1, "outstation_address": 2, "host": "127.0.0.1"}
        )
        assert res_add.status_code == 201

        # Add device failure
        mock_dnp3.add_device.return_value = False
        res_add_fail = client.post(
            "/api/v1/protocols/dnp3/devices",
            headers=headers,
            json={"device_id": "test", "master_address": 1, "outstation_address": 2, "host": "127.0.0.1"}
        )
        assert res_add_fail.status_code == 500

        # Connect device
        mock_dnp3.connect_device.return_value = True
        assert client.post("/api/v1/protocols/dnp3/devices/dev1/connect", headers=headers).status_code == 200
        mock_dnp3.connect_device.return_value = False
        assert client.post("/api/v1/protocols/dnp3/devices/dev1/connect", headers=headers).status_code == 500

        # Read
        assert client.get("/api/v1/protocols/dnp3/devices/dev1/data", headers=headers).status_code == 200

        # Integrity Poll
        mock_dnp3.perform_integrity_poll.return_value = True
        assert client.post("/api/v1/protocols/dnp3/devices/dev1/integrity-poll", headers=headers).status_code == 200
        mock_dnp3.perform_integrity_poll.return_value = False
        assert client.post("/api/v1/protocols/dnp3/devices/dev1/integrity-poll", headers=headers).status_code == 500

        # Performance endpoints
        assert client.get("/api/v1/protocols/dnp3/performance/metrics", headers=headers).status_code == 200
        assert client.get("/api/v1/protocols/dnp3/performance/summary", headers=headers).status_code == 200
        assert client.get("/api/v1/protocols/dnp3/devices/dev1/performance", headers=headers).status_code == 200
        
        mock_dnp3.get_device_performance_stats.return_value = {"error": "Device not found"}
        assert client.get("/api/v1/protocols/dnp3/devices/dev1/performance", headers=headers).status_code == 404

        # Clear metrics
        assert client.delete("/api/v1/protocols/dnp3/performance/metrics", headers=headers).status_code == 200


def test_configure_dnp3_performance(client, admin_token):
    """Test configuring DNP3 performance optimizations with validations."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    mock_dnp3 = MagicMock()
    
    with patch("flask.current_app.dnp3_service", mock_dnp3, create=True):
        # Invalid inputs - non-boolean enable_caching
        res_bad1 = client.post(
            "/api/v1/protocols/dnp3/performance/config",
            headers=headers,
            json={"enable_caching": "yes"}
        )
        assert res_bad1.status_code == 400

        # Invalid inputs - non-boolean enable_bulk_operations
        res_bad2 = client.post(
            "/api/v1/protocols/dnp3/performance/config",
            headers=headers,
            json={"enable_bulk_operations": "no"}
        )
        assert res_bad2.status_code == 400

        # Valid inputs
        res_ok = client.post(
            "/api/v1/protocols/dnp3/performance/config",
            headers=headers,
            json={"enable_caching": True, "enable_bulk_operations": False}
        )
        assert res_ok.status_code == 200
        data = res_ok.get_json()
        assert data["caching_enabled"] is True
        assert data["bulk_operations_enabled"] is False
        assert mock_dnp3.enable_performance_optimizations.called


def test_unified_devices_status(client, admin_token):
    """Test the unified devices status getter across all services."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    mock_modbus = MagicMock()
    mock_modbus.get_device_status.return_value = {"devices": {"m1": {"connected": True}, "m2": {"connected": False}}}
    
    mock_dnp3 = MagicMock()
    mock_dnp3.get_device_status.return_value = {"devices": {"d1": {"connected": True}}}
    
    mock_mqtt = MagicMock()
    mock_mqtt.get_status.return_value = {"connected": True}
    
    mock_opcua = MagicMock()
    mock_opcua.get_status.return_value = {"connected": False}

    with patch("flask.current_app.modbus_service", mock_modbus, create=True), \
         patch("flask.current_app.dnp3_service", mock_dnp3, create=True), \
         patch("flask.current_app.mqtt_client", mock_mqtt, create=True), \
         patch("flask.current_app.opcua_client", mock_opcua, create=True):
        
        response = client.get("/api/v1/protocols/unified/devices", headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["summary"]["total_devices"] == 5
        assert data["summary"]["connected_devices"] == 3 # m1, d1, mqtt_client
        assert data["summary"]["connection_rate"] == 60.0
        assert data["summary"]["protocols"]["modbus"]["total"] == 2
        assert data["summary"]["protocols"]["modbus"]["connected"] == 1
        assert data["summary"]["protocols"]["dnp3"]["total"] == 1
        assert data["summary"]["protocols"]["dnp3"]["connected"] == 1


def test_convert_protocol_data(client, admin_token):
    """Test protocol data conversion engine endpoint."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Missing required fields
    res_missing = client.post("/api/v1/protocols/convert/data", headers=headers, json={"source_protocol": "modbus"})
    assert res_missing.status_code == 400

    # 2. Modbus to DNP3
    payload_m2d = {
        "source_protocol": "modbus",
        "target_protocol": "dnp3",
        "data": {
            "temp": {"address": 30001, "processed_value": 24.5, "timestamp": "2026-06-26T12:00:00Z"}
        }
    }
    res_m2d = client.post("/api/v1/protocols/convert/data", headers=headers, json=payload_m2d)
    assert res_m2d.status_code == 200
    converted = res_m2d.get_json()["converted_data"]
    assert converted["temp"]["value"] == 24.5
    assert converted["temp"]["data_type"] == "analog_input"
    assert converted["temp"]["index"] == 30001

    # 3. DNP3 to Modbus
    payload_d2m = {
        "source_protocol": "dnp3",
        "target_protocol": "modbus",
        "data": {
            "pressure": {"index": 2, "value": 1.4, "timestamp": "2026-06-26T12:00:00Z"}
        }
    }
    res_d2m = client.post("/api/v1/protocols/convert/data", headers=headers, json=payload_d2m)
    assert res_d2m.status_code == 200
    converted2 = res_d2m.get_json()["converted_data"]
    assert converted2["pressure"]["processed_value"] == 1.4
    assert converted2["pressure"]["register_type"] == "holding_register"
    assert converted2["pressure"]["address"] == 2

    # 4. Same protocol (bypass)
    payload_same = {
        "source_protocol": "modbus",
        "target_protocol": "modbus",
        "data": {"any": "thing"}
    }
    res_same = client.post("/api/v1/protocols/convert/data", headers=headers, json=payload_same)
    assert res_same.status_code == 200
    assert res_same.get_json()["converted_data"] == {"any": "thing"}

    # 5. Unsupported conversion
    payload_bad = {
        "source_protocol": "modbus",
        "target_protocol": "opcua",
        "data": {"any": "thing"}
    }
    res_bad = client.post("/api/v1/protocols/convert/data", headers=headers, json=payload_bad)
    assert res_bad.status_code == 400
    assert "not supported" in res_bad.get_json()["error"]
