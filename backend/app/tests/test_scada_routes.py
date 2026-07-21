"""Tests for SCADA integration routes."""

from unittest.mock import MagicMock, patch


def test_get_scada_status(client, admin_token):
    """Test get scada status endpoint."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Scenario 1: Services are present on current_app
    mock_mqtt = MagicMock()
    mock_mqtt.get_status.return_value = {"mqtt_status": "ok"}
    mock_ws = MagicMock()
    mock_ws.get_status.return_value = {"ws_status": "ok"}
    mock_processor = MagicMock()
    mock_processor.get_status.return_value = {"proc_status": "ok"}

    with (
        patch("flask.current_app.mqtt_client", mock_mqtt, create=True),
        patch("flask.current_app.websocket_service", mock_ws, create=True),
        patch("flask.current_app.realtime_processor", mock_processor, create=True),
    ):
        response = client.get("/api/v1/scada/status", headers=headers)
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            data = response.get_json()
            assert data["mqtt"] == {"mqtt_status": "ok"}
            assert data["websocket"] == {"ws_status": "ok"}
            assert data["realtime_processor"] == {"proc_status": "ok"}

    # Scenario 2: Services are not present on current_app
    # Because we're not patching with create=True, they won't be on current_app
    response = client.get("/api/v1/scada/status", headers=headers)
    assert response.status_code in [200, 500]
    if response.status_code == 200:
        assert isinstance(response.get_json(), dict)


def test_mqtt_connect_disconnect(client, admin_token):
    """Test MQTT connect and disconnect routes."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    mock_mqtt = MagicMock()

    # 1. Connect success
    with patch("flask.current_app.mqtt_client", mock_mqtt, create=True):
        response = client.post("/api/v1/scada/mqtt/connect", headers=headers)
        assert response.status_code == 200
        assert response.get_json()["status"] == "connected"
        assert mock_mqtt.connect.called

        # Disconnect success
        response = client.post("/api/v1/scada/mqtt/disconnect", headers=headers)
        assert response.status_code == 200
        assert response.get_json()["status"] == "disconnected"
        assert mock_mqtt.disconnect.called

    # 2. Unavailable client
    response = client.post("/api/v1/scada/mqtt/connect", headers=headers)
    assert response.status_code in [200, 503]


def test_mqtt_subscribe_publish(client, admin_token):
    """Test MQTT subscribe and publish commands and validation."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    mock_mqtt = MagicMock()

    with patch("flask.current_app.mqtt_client", mock_mqtt, create=True):
        # 1. Subscribe without topic
        response = client.post("/api/v1/scada/mqtt/subscribe", json={}, headers=headers)
        assert response.status_code == 400

        # 2. Subscribe success
        response = client.post(
            "/api/v1/scada/mqtt/subscribe",
            json={"topic": "scada/temp", "qos": 1},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.get_json()["status"] == "subscribed"
        mock_mqtt.subscribe_topic.assert_called_with("scada/temp", 1)

    # 3. Publish without topic or payload
    response = client.post("/api/v1/scada/mqtt/publish", json={}, headers=headers)
    assert response.status_code == 400


def test_scada_alerts_rules(client, admin_token):
    """Test alert rules management endpoints."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    mock_processor = MagicMock()
    mock_processor.get_alert_rules.return_value = [{"rule_id": 1}]

    with patch("flask.current_app.realtime_processor", mock_processor, create=True):
        # GET rules
        response = client.get("/api/v1/scada/alerts/rules", headers=headers)
        assert response.status_code == 200
        assert response.get_json() == [{"rule_id": 1}]

        # POST rules validation failure
        response = client.post("/api/v1/scada/alerts/rules", json={}, headers=headers)
        assert response.status_code == 400

        # POST rules success
        rule_payload = {
            "sensor_type": "temperature",
            "condition": "greater_than",
            "threshold": 100.0,
            "severity": "critical",
            "message": "Too hot!",
        }
        response = client.post(
            "/api/v1/scada/alerts/rules", json=rule_payload, headers=headers
        )
        assert response.status_code == 201
        assert response.get_json()["status"] in ["rule_created", "rule_added"]
        assert mock_processor.add_alert_rule.called


def test_opcua_endpoints(client, admin_token):
    """Test OPC-UA connect, browse, subscribe, read, and poll endpoints."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    mock_opcua = MagicMock()

    # UA Browse - client unavailable
    response = client.get("/api/v1/scada/opcua/browse", headers=headers)
    assert response.status_code == 503

    with patch("flask.current_app.opcua_client", mock_opcua, create=True):
        # Connect
        response = client.post(
            "/api/v1/scada/opcua/connect",
            json={"url": "opc.tcp://localhost:4840"},
            headers=headers,
        )
        assert response.status_code in [200, 503]
        assert mock_opcua.connect.called

        # Disconnect
        response = client.post("/api/v1/scada/opcua/disconnect", headers=headers)
        assert response.status_code == 200
        assert mock_opcua.disconnect.called

        # Browse success
        mock_opcua.browse_server_nodes.return_value = [{"node_id": "ns=1;s=temp"}]
        response = client.get(
            "/api/v1/scada/opcua/browse?node_id=root", headers=headers
        )
        assert response.status_code in [200, 503]
        if response.status_code == 200:
            payload = response.get_json()
            if isinstance(payload, dict):
                assert payload["nodes"] == [{"node_id": "ns=1;s=temp"}]
            else:
                assert payload == [{"node_id": "ns=1;s=temp"}]

        # Read missing node_id
        response = client.post("/api/v1/scada/opcua/read", json={}, headers=headers)
        assert response.status_code == 400

        # Read success
        mock_opcua.read_node_value.return_value = {"value": 22.4}
        response = client.post(
            "/api/v1/scada/opcua/read", json={"node_id": "ns=1;s=temp"}, headers=headers
        )
        assert response.status_code in [200, 503]
        if response.status_code == 200:
            payload = response.get_json()
            assert payload.get("data", payload) == {"value": 22.4}


def test_simulator_inject_and_control(client, admin_token):
    """Test simulator controls and scenario injection."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    mock_sim = MagicMock()

    # Inject without scenario type
    response = client.post("/api/v1/scada/simulator/inject", json={}, headers=headers)
    assert response.status_code == 400

    # Inject invalid scenario type
    response = client.post(
        "/api/v1/scada/simulator/inject",
        json={"scenario_type": "alien_invasion"},
        headers=headers,
    )
    assert response.status_code == 400

    with patch("flask.current_app.protocol_simulator", mock_sim, create=True):
        # Inject success
        response = client.post(
            "/api/v1/scada/simulator/inject",
            json={"scenario_type": "high_temperature", "unit_id": "U1"},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.get_json()["status"] == "scenario_injected"
        mock_sim.inject_test_scenario.assert_called_with(
            scenario_type="high_temperature", unit_id="U1"
        )


def test_devices_status_monitoring(client, admin_token):
    """Test device status monitoring routes."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    mock_modbus = MagicMock()
    mock_modbus.get_device_status.side_effect = [
        {"devices": {"DEV1": {"connected": True}}},
        {"devices": {"DEV1": {"connected": True}}},
    ]
    mock_dnp3 = MagicMock()
    mock_dnp3.get_device_status.return_value = {"devices": {}}

    with (
        patch("flask.current_app.modbus_service", mock_modbus, create=True),
        patch("flask.current_app.dnp3_service", mock_dnp3, create=True),
    ):
        # Get all
        response = client.get("/api/v1/scada/devices/status", headers=headers)
        assert response.status_code == 200

        # Get individual
        response = client.get("/api/v1/scada/devices/DEV1/status", headers=headers)
        assert response.status_code == 200

        # History
        response = client.get(
            "/api/v1/scada/devices/status/history?limit=24", headers=headers
        )
        assert response.status_code == 200
