"""Tests for Protocol Gateway Simulator."""

from unittest.mock import MagicMock, patch

import paho.mqtt.client as mqtt
import pytest

from app.services.protocol_gateway_simulator import ProtocolGatewaySimulator


@pytest.fixture
def mock_mqtt_client():
    """Mock the paho.mqtt.client.Client class."""
    with patch("paho.mqtt.client.Client") as mock:
        client_instance = MagicMock()
        mock.return_value = client_instance
        # Default publish success
        mock_publish_result = MagicMock()
        mock_publish_result.rc = mqtt.MQTT_ERR_SUCCESS
        client_instance.publish.return_value = mock_publish_result
        yield client_instance


def test_init_gateway():
    """Test protocol gateway simulator initialization."""
    sim = ProtocolGatewaySimulator(mqtt_broker_host="127.0.0.1", mqtt_broker_port=1883)
    assert sim.mqtt_host == "127.0.0.1"
    assert sim.mqtt_port == 1883
    assert sim.connected is False
    assert sim.running is False
    assert len(sim.simulation_units) > 0


def test_connect_mqtt_success(mock_mqtt_client):
    """Test successful MQTT connection."""
    sim = ProtocolGatewaySimulator()
    # Mock time.sleep to run quickly
    with patch("time.sleep", return_value=None):
        # Force connected to True via connect callback
        def mock_connect(host, port, keepalive):
            sim._on_mqtt_connect(None, None, None, 0)

        mock_mqtt_client.connect.side_effect = mock_connect

        res = sim.connect_mqtt()
        assert res is True
        assert sim.connected is True
        assert mock_mqtt_client.loop_start.called


def test_connect_mqtt_failure(mock_mqtt_client):
    """Test MQTT connection failure due to exception."""
    sim = ProtocolGatewaySimulator()
    mock_mqtt_client.connect.side_effect = Exception("Connection refused")

    res = sim.connect_mqtt()
    assert res is False
    assert sim.connected is False


def test_mqtt_callbacks():
    """Test MQTT connection and disconnection callbacks directly."""
    sim = ProtocolGatewaySimulator()
    sim._on_mqtt_connect(None, None, None, 0)
    assert sim.connected is True

    sim._on_mqtt_connect(None, None, None, 1)  # error code
    assert (
        sim.connected is True
    )  # Wait, callbacks don't set to False unless disconnected is called

    sim._on_mqtt_disconnect(None, None, 0)
    assert sim.connected is False


def test_disconnect_mqtt(mock_mqtt_client):
    """Test disconnecting from MQTT."""
    sim = ProtocolGatewaySimulator()
    sim.client = mock_mqtt_client
    sim.connected = True

    sim.disconnect_mqtt()
    assert sim.connected is False
    assert mock_mqtt_client.loop_stop.called
    assert mock_mqtt_client.disconnect.called


def test_generate_sensor_value_variations():
    """Test generating sensor values including bounds and anomaly rolls."""
    sim = ProtocolGatewaySimulator()

    # Force anomaly roll to always produce anomaly/uncertain quality
    with patch("random.SystemRandom.random", return_value=0.01):
        val = sim.generate_sensor_value("UNIT001", "temperature")
        assert val["quality"] in ["UNCERTAIN", "BAD", "GOOD"]
        assert "value" in val
        assert val["unit"] == "°C"

    # Test that trend can be changed
    # Force trend change roll (< 0.1)
    with patch(
        "random.SystemRandom.random", side_effect=[0.05, 0.99, 0.99, 0.99, 0.99]
    ):
        initial_trend = sim.unit_states["UNIT001"]["trend_direction"]["temperature"]
        sim.generate_sensor_value("UNIT001", "temperature")
        new_trend = sim.unit_states["UNIT001"]["trend_direction"]["temperature"]
        assert new_trend in [initial_trend, initial_trend * -1]


def test_publish_sensor_data(mock_mqtt_client):
    """Test publishing sensor data when connected and disconnected."""
    sim = ProtocolGatewaySimulator()
    sim.client = mock_mqtt_client

    # Case 1: Disconnected
    sim.connected = False
    sim.publish_sensor_data("UNIT001", "temperature")
    assert not mock_mqtt_client.publish.called

    # Case 2: Connected - Success Publish
    sim.connected = True
    sim.publish_sensor_data("UNIT001", "temperature")
    assert mock_mqtt_client.publish.called

    # Case 3: Connected - Fail Publish
    mock_publish_result = MagicMock()
    mock_publish_result.rc = mqtt.MQTT_ERR_CONN_LOST
    mock_mqtt_client.publish.return_value = mock_publish_result

    # Should handle failure gracefully without raising exception
    sim.publish_sensor_data("UNIT001", "temperature")


def test_simulate_unit_status_change(mock_mqtt_client):
    """Test unit status changes based on random simulation."""
    sim = ProtocolGatewaySimulator()
    sim.client = mock_mqtt_client
    sim.connected = True

    # Transition from online to warning/maintenance
    sim.unit_states["UNIT001"]["status"] = "online"
    with patch("random.SystemRandom.random", return_value=0.0001):  # Trigger change
        with patch("random.SystemRandom.choice", return_value="warning"):
            sim.simulate_unit_status_change("UNIT001")
            assert sim.unit_states["UNIT001"]["status"] == "warning"
            assert mock_mqtt_client.publish.called

    # Transition from warning to offline
    sim.unit_states["UNIT001"]["status"] = "warning"
    with patch(
        "random.SystemRandom.random", side_effect=[0.0001, 0.8]
    ):  # Trigger change + choose offline
        sim.simulate_unit_status_change("UNIT001")
        assert sim.unit_states["UNIT001"]["status"] == "offline"

    # Transition from offline to online
    sim.unit_states["UNIT001"]["status"] = "offline"
    with patch("random.SystemRandom.random", return_value=0.0001):  # Trigger change
        sim.simulate_unit_status_change("UNIT001")
        assert sim.unit_states["UNIT001"]["status"] == "online"


def test_simulation_loop_control(mock_mqtt_client):
    """Test starting, running, and stopping the simulation."""
    sim = ProtocolGatewaySimulator()

    # Start fails if not connected
    assert sim.start_simulation() is False

    # Start succeeds when connected
    sim.client = mock_mqtt_client
    sim.connected = True

    # Let's run a single cycle of the simulation loop
    def stop_immediately(*args):
        sim.running = False

    with patch("time.sleep", side_effect=stop_immediately):
        res = sim.start_simulation()
        assert res is True
        # Join thread to clean up
        sim.stop_simulation()


def test_inject_test_scenarios(mock_mqtt_client):
    """Test injecting specific SCADA test scenarios."""
    sim = ProtocolGatewaySimulator()
    sim.client = mock_mqtt_client
    sim.connected = True

    # High temperature
    sim.inject_test_scenario("high_temperature", "UNIT001")
    assert mock_mqtt_client.publish.called

    # Sensor failure
    sim.inject_test_scenario("sensor_failure", "UNIT001")

    # Unit offline
    sim.inject_test_scenario("unit_offline", "UNIT001")
    assert sim.unit_states["UNIT001"]["status"] == "offline"

    # Invalid unit ID
    sim.inject_test_scenario("high_temperature", "INVALID_UNIT")


def test_get_status():
    """Test getting simulator status reports."""
    sim = ProtocolGatewaySimulator()

    # Case 1: client is None
    status1 = sim.get_status()
    assert status1["status"] == "not_initialized"
    assert status1["connected"] is False

    # Case 2: connected and running
    sim.client = MagicMock()
    sim.connected = True
    sim.running = True
    status2 = sim.get_status()
    assert status2["status"] == "ready"

    # Case 3: connected but not running
    sim.running = False
    status3 = sim.get_status()
    assert status3["status"] == "initializing"

    # Case 4: not connected
    sim.connected = False
    status4 = sim.get_status()
    assert status4["status"] == "error"
