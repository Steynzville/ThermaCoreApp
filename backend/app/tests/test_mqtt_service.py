"""Tests for MQTT client service."""

import json
from datetime import datetime, timezone
import os
import sys
import tempfile
from unittest.mock import Mock, patch
import pytest

from app.services.mqtt_service import MQTTClient


class TestMQTTClient:
    """Test MQTT client functionality."""

    def test_init_without_app(self):
        """Test MQTTClient initialization without Flask app."""
        client = MQTTClient()
        assert client.client is None
        assert client.connected is False
        assert client._app is None

    def test_init_with_app(self):
        """Test MQTTClient initialization with Flask app."""
        mock_app = Mock()
        mock_app.config = {
            "MQTT_BROKER_HOST": "test-broker",
            "MQTT_BROKER_PORT": 1883,
            "MQTT_CLIENT_ID": "test-client",
            "MQTT_USE_TLS": True,
            "MQTT_CA_CERTS": "/dummy/path/to/ca.pem",
            "MQTT_CERT_FILE": "/dummy/path/to/cert.pem",
            "MQTT_KEY_FILE": "/dummy/path/to/key.pem",
            "MQTT_USERNAME": "test-user",
            "MQTT_PASSWORD": "test-pass",
            "TESTING": True,
        }

        with (
            patch("paho.mqtt.client.Client") as mock_mqtt_client,
            patch(
                "app.services.mqtt_service.is_production_environment",
                return_value=False,
            ),
        ):
            client = MQTTClient(mock_app)

            assert client._app == mock_app
            assert client.broker_host == "test-broker"
            assert client.broker_port == 1883
            assert client.client_id == "test-client"
            mock_mqtt_client.assert_called_once_with(client_id="test-client")

    def test_parse_scada_message_valid_json(self):
        """Test parsing valid SCADA message with JSON payload."""
        client = MQTTClient()

        topic = "scada/UNIT001/temperature"
        payload = json.dumps(
            {"value": 25.5, "quality": "GOOD", "timestamp": "2024-01-01T12:00:00Z"},
        )

        result = client._parse_scada_message(topic, payload)

        assert result is not None
        assert result["unit_id"] == "UNIT001"
        assert result["sensor_type"] == "temperature"
        assert result["value"] == 25.5
        assert result["quality"] == "GOOD"
        assert isinstance(result["timestamp"], datetime)

    def test_parse_scada_message_simple_value(self):
        """Test parsing SCADA message with simple numeric value."""
        client = MQTTClient()

        topic = "scada/UNIT002/pressure"
        payload = "42.7"

        result = client._parse_scada_message(topic, payload)

        assert result is not None
        assert result["unit_id"] == "UNIT002"
        assert result["sensor_type"] == "pressure"
        assert result["value"] == 42.7
        assert result["quality"] == "GOOD"
        assert isinstance(result["timestamp"], datetime)

    def test_parse_scada_message_invalid_topic(self):
        """Test parsing message with invalid topic format."""
        client = MQTTClient()

        topic = "invalid/topic"
        payload = "25.0"

        result = client._parse_scada_message(topic, payload)
        assert result is None

    def test_parse_scada_message_invalid_payload(self):
        """Test parsing message with invalid payload."""
        client = MQTTClient()

        topic = "scada/UNIT001/temperature"
        payload = "invalid-data"

        result = client._parse_scada_message(topic, payload)
        assert result is None

    def test_parse_scada_message_missing_value(self):
        """Test parsing message with missing value field."""
        client = MQTTClient()

        topic = "scada/UNIT001/temperature"
        payload = json.dumps({"quality": "GOOD"})  # Missing 'value'

        result = client._parse_scada_message(topic, payload)
        assert result is None

    def test_get_status(self):
        """Test getting MQTT client status."""
        mock_app = Mock()
        mock_app.config = {
            "MQTT_BROKER_HOST": "test-broker",
            "MQTT_BROKER_PORT": 1883,
            "MQTT_CLIENT_ID": "test-client",
        }

        with (
            patch("paho.mqtt.client.Client"),
            patch(
                "app.services.mqtt_service.is_production_environment",
                return_value=False,
            ),
        ):
            client = MQTTClient(mock_app)
            client.connected = True
            client._subscribed_topics = ["scada/+/temperature"]

            status = client.get_status()

            assert status["connected"] is True
            assert status["broker_host"] == "test-broker"
            assert status["broker_port"] == 1883
            assert status["client_id"] == "test-client"
            assert "scada/+/temperature" in status["subscribed_topics"]

    @patch("paho.mqtt.client.Client")
    @patch("app.services.mqtt_service.is_production_environment")
    def test_connect_success(self, mock_prod_env, mock_client_class):
        """Test successful MQTT connection."""
        mock_prod_env.return_value = False
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_app = Mock()
        mock_app.config = {
            "MQTT_BROKER_HOST": "test-broker",
            "MQTT_BROKER_PORT": 1883,
            "MQTT_CLIENT_ID": "test-client",
            "MQTT_KEEPALIVE": 60,
        }

        client = MQTTClient(mock_app)
        client.connect()

        mock_client.connect.assert_called_once_with("test-broker", 1883, 60)
        mock_client.loop_start.assert_called_once()

    @patch("paho.mqtt.client.Client")
    @patch("app.services.mqtt_service.is_production_environment")
    def test_connect_failure(self, mock_prod_env, mock_client_class):
        """Test MQTT connection failure."""
        mock_prod_env.return_value = False
        mock_client = Mock()
        mock_client.connect.side_effect = Exception("Connection failed")
        mock_client_class.return_value = mock_client

        mock_app = Mock()
        mock_app.config = {"MQTT_BROKER_HOST": "test-broker", "MQTT_BROKER_PORT": 1883}

        client = MQTTClient(mock_app)

        with pytest.raises(Exception, match="Connection failed"):
            client.connect()

    @patch("paho.mqtt.client.Client")
    @patch("app.services.mqtt_service.is_production_environment")
    def test_disconnect(self, mock_prod_env, mock_client_class):
        """Test MQTT disconnection."""
        mock_prod_env.return_value = False
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_app = Mock()
        mock_app.config = {"MQTT_BROKER_HOST": "localhost", "MQTT_BROKER_PORT": 1883}

        client = MQTTClient(mock_app)
        client.connected = True
        client.disconnect()

        mock_client.loop_stop.assert_called_once()
        mock_client.disconnect.assert_called_once()
        assert client.connected is False

    def test_on_connect_success(self):
        """Test successful connection callback."""
        client = MQTTClient()
        client.default_topics = ["test/topic"]
        client.subscribe_topic = Mock()

        client._on_connect(None, None, None, 0)

        assert client.connected is True
        client.subscribe_topic.assert_called_once_with("test/topic")

    def test_on_connect_failure(self):
        """Test failed connection callback."""
        client = MQTTClient()

        client._on_connect(None, None, None, 1)

        assert client.connected is False

    def test_on_disconnect(self):
        """Test disconnection callback."""
        client = MQTTClient()
        client.connected = True

        client._on_disconnect(None, None, 0)

    def test_init_with_generated_certificates(self):
        """Test MQTTClient initialization with generated certificates (TLS Handshake test)."""
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
        import generate_certs

        with tempfile.TemporaryDirectory() as tmpdir:
            ca_cert = os.path.join(tmpdir, "ca.crt")
            ca_key = os.path.join(tmpdir, "ca.key")
            client_cert = os.path.join(tmpdir, "client.crt")
            client_key = os.path.join(tmpdir, "client.key")

            generate_certs.generate_self_signed_cert(ca_cert, ca_key)
            generate_certs.generate_self_signed_cert(client_cert, client_key)

            mock_app = Mock()
            mock_app.config = {
                "MQTT_BROKER_HOST": "test-broker",
                "MQTT_BROKER_PORT": 8883,
                "MQTT_CLIENT_ID": "test-client",
                "MQTT_USE_TLS": True,
                "MQTT_CA_CERTS": ca_cert,
                "MQTT_CERT_FILE": client_cert,
                "MQTT_KEY_FILE": client_key,
                "MQTT_USERNAME": "test-user",
                "MQTT_PASSWORD": "test-pass",
                "TESTING": True,
            }

            with patch("paho.mqtt.client.Client") as mock_mqtt_client:
                with patch(
                    "app.services.mqtt_service.is_production_environment",
                    return_value=False,
                ):
                    mock_client_instance = Mock()
                    mock_mqtt_client.return_value = mock_client_instance

                    MQTTClient(mock_app)

                    mock_client_instance.tls_set.assert_called_once()
                    call_kwargs = mock_client_instance.tls_set.call_args[1]
                    assert call_kwargs["ca_certs"] == ca_cert
                    assert call_kwargs["certfile"] == client_cert
                    assert call_kwargs["keyfile"] == client_key

    def test_publishing(self):
        """Test publishing messages via MQTT Client."""
        mock_app = Mock()
        mock_app.config = {
            "MQTT_BROKER_HOST": "test-broker",
            "MQTT_BROKER_PORT": 1883,
            "MQTT_CLIENT_ID": "test-client",
        }
        with (
            patch("paho.mqtt.client.Client") as mock_mqtt_client,
            patch(
                "app.services.mqtt_service.is_production_environment",
                return_value=False,
            ),
        ):
            mock_client_instance = Mock()
            mock_mqtt_client.return_value = mock_client_instance
            client = MQTTClient(mock_app)
            client.connected = True

            # Mock client publish
            mock_client_instance.publish.return_value = (0, 1)
            
            # Test publishing string
            client.publish("test/topic", "test-payload")
            mock_client_instance.publish.assert_called_with("test/topic", "test-payload", qos=1, retain=False)

    def test_on_message_malformed_payload(self):
        """Test on_message handles malformed/corrupted payloads gracefully."""
        client = MQTTClient()
        client.connected = True
        
        # Mock parsing to return None
        client._parse_scada_message = Mock(return_value=None)
        
        mock_msg = Mock()
        mock_msg.topic = "scada/UNIT001/temperature"
        mock_msg.payload = b"invalid-bytes\xff\xfe"
        
        # Invoking message callback should not raise exception
        try:
            client._on_message(None, None, mock_msg)
        except Exception as e:
            pytest.fail(f"_on_message raised exception on malformed payload: {e}")

    def test_reconnection_logic(self):
        """Test reconnection loop triggers when connection is lost."""
        mock_app = Mock()
        mock_app.config = {
            "MQTT_BROKER_HOST": "test-broker",
            "MQTT_BROKER_PORT": 1883,
        }
        with (
            patch("paho.mqtt.client.Client") as mock_mqtt_client,
            patch(
                "app.services.mqtt_service.is_production_environment",
                return_value=False,
            ),
        ):
            mock_client_instance = Mock()
            mock_mqtt_client.return_value = mock_client_instance
            client = MQTTClient(mock_app)
            
            # Reconnect mock
            client.connect = Mock()
            client._on_disconnect(None, None, 1)  # rc != 0 (unexpected disconnect)
            
            assert client.connected is False
