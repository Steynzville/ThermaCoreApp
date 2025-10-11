"""Tests for MQTT client service."""
import json
import pytest
from datetime import datetime
from unittest.mock import Mock, patch

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
            'MQTT_BROKER_HOST': 'test-broker',
            'MQTT_BROKER_PORT': 1883,
            'MQTT_CLIENT_ID': 'test-client',
            'MQTT_USE_TLS': True,
            'MQTT_CA_CERTS': '/dummy/path/to/ca.pem',
            'MQTT_CERT_FILE': '/dummy/path/to/cert.pem',
            'MQTT_KEY_FILE': '/dummy/path/to/key.pem',
            'MQTT_USERNAME': 'test-user',
            'MQTT_PASSWORD': 'test-pass',
            'TESTING': True  # Ensure we're not in production mode
        }
        
        with patch('paho.mqtt.client.Client') as mock_mqtt_client:
            with patch('app.services.mqtt_service.is_production_environment', return_value=False):
                client = MQTTClient(mock_app)
                
                assert client._app == mock_app
                assert client.broker_host == 'test-broker'
                assert client.broker_port == 1883
                assert client.client_id == 'test-client'
                mock_mqtt_client.assert_called_once_with(client_id='test-client')
    
    def test_parse_scada_message_valid_json(self):
        """Test parsing valid SCADA message with JSON payload."""
        client = MQTTClient()
        
        topic = 'scada/UNIT001/temperature'
        payload = json.dumps({
            'value': 25.5,
            'quality': 'GOOD',
            'timestamp': '2024-01-01T12:00:00Z'
        })
        
        result = client._parse_scada_message(topic, payload)
        
        assert result is not None
        assert result['unit_id'] == 'UNIT001'
        assert result['sensor_type'] == 'temperature'
        assert result['value'] == 25.5
        assert result['quality'] == 'GOOD'
        assert isinstance(result['timestamp'], datetime)
    
    def test_parse_scada_message_simple_value(self):
        """Test parsing SCADA message with simple numeric value."""
        client = MQTTClient()
        
        topic = 'scada/UNIT002/pressure'
        payload = '42.7'
        
        result = client._parse_scada_message(topic, payload)
        
        assert result is not None
        assert result['unit_id'] == 'UNIT002'
        assert result['sensor_type'] == 'pressure'
        assert result['value'] == 42.7
        assert result['quality'] == 'GOOD'
        assert isinstance(result['timestamp'], datetime)
    
    def test_parse_scada_message_invalid_topic(self):
        """Test parsing message with invalid topic format."""
        client = MQTTClient()
        
        # Invalid topic format
        topic = 'invalid/topic'
        payload = '25.0'
        
        result = client._parse_scada_message(topic, payload)
        assert result is None
    
    def test_parse_scada_message_invalid_payload(self):
        """Test parsing message with invalid payload."""
        client = MQTTClient()
        
        topic = 'scada/UNIT001/temperature'
        payload = 'invalid-data'
        
        result = client._parse_scada_message(topic, payload)
        assert result is None
    
    def test_parse_scada_message_missing_value(self):
        """Test parsing message with missing value field."""
        client = MQTTClient()
        
        topic = 'scada/UNIT001/temperature'
        payload = json.dumps({'quality': 'GOOD'})  # Missing 'value'
        
        result = client._parse_scada_message(topic, payload)
        assert result is None
    
    def test_parse_scada_message_unix_timestamp(self):
        """Test parsing message with Unix timestamp."""
        client = MQTTClient()
        
        topic = 'scada/UNIT001/temperature'
        unix_timestamp = 1704110400  # 2024-01-01 12:00:00 UTC
        payload = json.dumps({
            'value': 25.5,
            'timestamp': str(unix_timestamp)
        })
        
        result = client._parse_scada_message(topic, payload)
        
        assert result is not None
        assert result['timestamp'].timestamp() == unix_timestamp
    
    def test_get_status(self):
        """Test getting MQTT client status."""
        mock_app = Mock()
        mock_app.config = {
            'MQTT_BROKER_HOST': 'test-broker',
            'MQTT_BROKER_PORT': 1883,
            'MQTT_CLIENT_ID': 'test-client'
        }
        
        with patch('paho.mqtt.client.Client'):
            with patch('app.services.mqtt_service.is_production_environment', return_value=False):
                client = MQTTClient(mock_app)
                client.connected = True
                client._subscribed_topics = ['scada/+/temperature']
                
                status = client.get_status()
                
                assert status['connected'] is True
                assert status['broker_host'] == 'test-broker'
                assert status['broker_port'] == 1883
                assert status['client_id'] == 'test-client'
                assert 'scada/+/temperature' in status['subscribed_topics']
    
    @patch('paho.mqtt.client.Client')
    @patch('app.services.mqtt_service.is_production_environment')
    def test_connect_success(self, mock_prod_env, mock_client_class):
        """Test successful MQTT connection."""
        mock_prod_env.return_value = False  # Force test mode
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        mock_app = Mock()
        mock_app.config = {
            'MQTT_BROKER_HOST': 'test-broker',
            'MQTT_BROKER_PORT': 1883,
            'MQTT_CLIENT_ID': 'test-client',
            'MQTT_KEEPALIVE': 60
        }
        
        client = MQTTClient(mock_app)
        client.connect()
        
        mock_client.connect.assert_called_once_with('test-broker', 1883, 60)
        mock_client.loop_start.assert_called_once()
    
    @patch('paho.mqtt.client.Client')
    @patch('app.services.mqtt_service.is_production_environment')
    def test_connect_failure(self, mock_prod_env, mock_client_class):
        """Test MQTT connection failure."""
        mock_prod_env.return_value = False  # Force test mode
        mock_client = Mock()
        mock_client.connect.side_effect = Exception("Connection failed")
        mock_client_class.return_value = mock_client
        
        mock_app = Mock()
        mock_app.config = {'MQTT_BROKER_HOST': 'test-broker', 'MQTT_BROKER_PORT': 1883}
        
        client = MQTTClient(mock_app)
        
        with pytest.raises(Exception, match="Connection failed"):
            client.connect()
    
    @patch('paho.mqtt.client.Client')
    @patch('app.services.mqtt_service.is_production_environment')
    def test_disconnect(self, mock_prod_env, mock_client_class):
        """Test MQTT disconnection."""
        mock_prod_env.return_value = False  # Force test mode
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        mock_app = Mock()
        mock_app.config = {'MQTT_BROKER_HOST': 'localhost', 'MQTT_BROKER_PORT': 1883}
        
        client = MQTTClient(mock_app)
        client.connected = True
        client.disconnect()
        
        mock_client.loop_stop.assert_called_once()
        mock_client.disconnect.assert_called_once()
        assert client.connected is False
    
    def test_on_connect_success(self):
        """Test successful connection callback."""
        client = MQTTClient()
        client.default_topics = ['test/topic']
        client.subscribe_topic = Mock()
        
        # Simulate successful connection (rc=0)
        client._on_connect(None, None, None, 0)
        
        assert client.connected is True
        client.subscribe_topic.assert_called_once_with('test/topic')
    
    def test_on_connect_failure(self):
        """Test failed connection callback."""
        client = MQTTClient()
        
        # Simulate failed connection (rc!=0)
        client._on_connect(None, None, None, 1)
        
        assert client.connected is False
    
    def test_on_disconnect(self):
        """Test disconnection callback."""
        client = MQTTClient()
        client.connected = True
        
        # Simulate clean disconnect (rc=0)
        client._on_disconnect(None, None, 0)
    
    def test_init_with_generated_certificates(self):
        """Test MQTTClient initialization with generated certificates."""
        import tempfile
        import os
        import sys
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
        import generate_certs
        
        with tempfile.TemporaryDirectory() as tmpdir:
            # Generate test certificates
            ca_cert = os.path.join(tmpdir, "ca.crt")
            ca_key = os.path.join(tmpdir, "ca.key")
            client_cert = os.path.join(tmpdir, "client.crt")
            client_key = os.path.join(tmpdir, "client.key")
            
            generate_certs.generate_self_signed_cert(ca_cert, ca_key)
            generate_certs.generate_self_signed_cert(client_cert, client_key)
            
            # Create mock app with TLS enabled and certificate paths
            mock_app = Mock()
            mock_app.config = {
                'MQTT_BROKER_HOST': 'test-broker',
                'MQTT_BROKER_PORT': 8883,
                'MQTT_CLIENT_ID': 'test-client',
                'MQTT_USE_TLS': True,
                'MQTT_CA_CERTS': ca_cert,
                'MQTT_CERT_FILE': client_cert,
                'MQTT_KEY_FILE': client_key,
                'MQTT_USERNAME': 'test-user',
                'MQTT_PASSWORD': 'test-pass',
                'TESTING': True
            }
            
            with patch('paho.mqtt.client.Client') as mock_mqtt_client:
                with patch('app.services.mqtt_service.is_production_environment', return_value=False):
                    mock_client_instance = Mock()
                    mock_mqtt_client.return_value = mock_client_instance
                    
                    MQTTClient(mock_app)
                    
                    # Verify TLS was configured with certificates
                    mock_client_instance.tls_set.assert_called_once()
                    call_kwargs = mock_client_instance.tls_set.call_args[1]
                    assert call_kwargs['ca_certs'] == ca_cert
                    assert call_kwargs['certfile'] == client_cert
                    assert call_kwargs['keyfile'] == client_key
                    
                    # Verify hostname verification was enabled
                    mock_client_instance.tls_insecure_set.assert_called_once_with(False)
    
    def test_init_with_missing_certificates_development(self):
        """Test MQTTClient initialization with missing certificates in development."""
        mock_app = Mock()
        mock_app.config = {
            'MQTT_BROKER_HOST': 'test-broker',
            'MQTT_BROKER_PORT': 8883,
            'MQTT_CLIENT_ID': 'test-client',
            'MQTT_USE_TLS': True,
            'MQTT_CA_CERTS': '/nonexistent/ca.crt',
            'MQTT_CERT_FILE': '/nonexistent/client.crt',
            'MQTT_KEY_FILE': '/nonexistent/client.key',
            'MQTT_USERNAME': 'test-user',
            'MQTT_PASSWORD': 'test-pass',
            'TESTING': True
        }
        
        with patch('paho.mqtt.client.Client') as mock_mqtt_client:
            with patch('app.services.mqtt_service.is_production_environment', return_value=False):
                mock_client_instance = Mock()
                mock_mqtt_client.return_value = mock_client_instance
                
                # Should not raise in development mode
                MQTTClient(mock_app)
                
                # TLS should not be configured if certificates don't exist
                mock_client_instance.tls_set.assert_not_called()
    
    def test_init_with_missing_certificates_production_fails(self):
        """Test MQTTClient initialization with missing certificates in production."""
        mock_app = Mock()
        mock_app.config = {
            'MQTT_BROKER_HOST': 'test-broker',
            'MQTT_BROKER_PORT': 8883,
            'MQTT_CLIENT_ID': 'test-client',
            'MQTT_USE_TLS': True,
            'MQTT_CA_CERTS': '/nonexistent/ca.crt',
            'MQTT_CERT_FILE': '/nonexistent/client.crt',
            'MQTT_KEY_FILE': '/nonexistent/client.key',
            'MQTT_USERNAME': 'test-user',
            'MQTT_PASSWORD': 'test-pass',
            'FLASK_ENV': 'production'
        }
        
        with patch('paho.mqtt.client.Client') as mock_mqtt_client:
            with patch('app.services.mqtt_service.is_production_environment', return_value=True):
                mock_client_instance = Mock()
                mock_mqtt_client.return_value = mock_client_instance
                
                # Should raise in production mode
                with pytest.raises(ValueError, match="MQTT certificates must be present"):
                    MQTTClient(mock_app)