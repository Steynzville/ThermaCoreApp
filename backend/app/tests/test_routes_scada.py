"""Additional coverage tests for SCADA routes."""

from unittest.mock import MagicMock, patch


def test_mqtt_unavailable_and_publish_failure(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    unavailable_response = client.post("/api/v1/scada/mqtt/connect", headers=headers)
    assert unavailable_response.status_code in (200, 503)

    mock_mqtt = MagicMock()
    mock_mqtt.publish_message.return_value = False
    with patch("flask.current_app.mqtt_client", mock_mqtt, create=True):
        publish_response = client.post(
            "/api/v1/scada/mqtt/publish",
            json={"topic": "x", "payload": "y"},
            headers=headers,
        )
    assert publish_response.status_code == 503


def test_opcua_connect_error_and_unavailable_paths(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    unavailable = client.post("/api/v1/scada/opcua/connect", headers=headers)
    assert unavailable.status_code in (200, 503)

    mock_opcua = MagicMock()
    mock_opcua.connect.side_effect = ConnectionError("nope")
    with patch("flask.current_app.opcua_client", mock_opcua, create=True):
        failed = client.post("/api/v1/scada/opcua/connect", headers=headers)
    assert failed.status_code == 503


def test_simulator_start_stop_and_status_branches(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # unavailable branches
    assert client.get("/api/v1/scada/simulator/status", headers=headers).status_code in (500, 503)
    assert client.post("/api/v1/scada/simulator/start", headers=headers).status_code in (500, 503)
    assert client.post("/api/v1/scada/simulator/stop", headers=headers).status_code in (500, 503)

    # connect_mqtt failure path
    simulator = MagicMock()
    simulator.connected = False
    simulator.connect_mqtt.return_value = False
    with patch("flask.current_app.protocol_simulator", simulator, create=True):
        failed = client.post("/api/v1/scada/simulator/start", headers=headers)
    assert failed.status_code == 500


def test_device_status_dnp3_fallback_and_history_filter(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    modbus = MagicMock()
    modbus.get_device_status.return_value = {"devices": {}}
    dnp3 = MagicMock()
    dnp3.get_device_status.return_value = {"devices": {"DNP3_1": {"connected": True}}}

    with patch("flask.current_app.modbus_service", modbus, create=True), patch(
        "flask.current_app.dnp3_service",
        dnp3,
        create=True,
    ):
        response = client.get("/api/v1/scada/devices/DNP3_1/status", headers=headers)
    assert response.status_code == 200

    history = client.get(
        "/api/v1/scada/devices/status/history?device_id=UNKNOWN&limit=1",
        headers=headers,
    )
    assert history.status_code == 200
    assert len(history.get_json()["history"]) == 1
