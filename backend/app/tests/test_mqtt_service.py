"""Tests for MQTT client service."""
import json
import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock

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
            'MQTT_CLIENT_ID': 'test-client'
        }
        
        with patch('paho.mqtt.client.Client') as mock_mqtt_client:
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
    
    @patch('app.services.mqtt_service.db')
    @patch('app.services.mqtt_service.Unit')
    @patch('app.services.mqtt_service.Sensor')
    def test_find_or_create_sensor_existing(self, mock_sensor, mock_unit, mock_db):
        """Test finding existing sensor."""
        mock_app = Mock()
        mock_app.app_context.return_value.__enter__ = Mock()
        mock_app.app_context.return_value.__exit__ = Mock()
        
        client = MQTTClient()
        client._app = mock_app
        
        # Mock existing unit and sensor
        mock_unit.query.filter_by.return_value.first.return_value = Mock(id='UNIT001')
        existing_sensor = Mock(id=1)
        mock_sensor.query.filter_by.return_value.first.return_value = existing_sensor
        
        result = client._find_or_create_sensor('UNIT001', 'temperature')
        
        assert result == existing_sensor
        mock_sensor.query.filter_by.assert_called_with(unit_id='UNIT001', sensor_type='temperature')
    
    @patch('app.services.mqtt_service.db')
    @patch('app.services.mqtt_service.Unit')
    @patch('app.services.mqtt_service.Sensor')
    def test_find_or_create_sensor_new(self, mock_sensor_class, mock_unit, mock_db):
        """Test creating new sensor."""
        mock_app = Mock()
        mock_app.app_context.return_value.__enter__ = Mock()
        mock_app.app_context.return_value.__exit__ = Mock()
        
        client = MQTTClient()
        client._app = mock_app
        
        # Mock existing unit but no sensor
        mock_unit.query.filter_by.return_value.first.return_value = Mock(id='UNIT001')
        mock_sensor_class.query.filter_by.return_value.first.return_value = None
        
        new_sensor = Mock(id=2)
        mock_sensor_class.return_value = new_sensor
        
        result = client._find_or_create_sensor('UNIT001', 'temperature')
        
        assert result == new_sensor
        mock_sensor_class.assert_called_once()
        mock_db.session.add.assert_called_once_with(new_sensor)
        mock_db.session.commit.assert_called_once()
    
    @patch('app.services.mqtt_service.Unit')
    def test_find_or_create_sensor_no_unit(self, mock_unit):
        """Test handling missing unit."""
        client = MQTTClient()
        
        # Mock no existing unit
        mock_unit.query.filter_by.return_value.first.return_value = None
        
        result = client._find_or_create_sensor('NONEXISTENT', 'temperature')
        
        assert result is None
    
    def test_get_status(self):
        """Test getting MQTT client status."""
        mock_app = Mock()
        mock_app.config = {
            'MQTT_BROKER_HOST': 'test-broker',
            'MQTT_BROKER_PORT': 1883,
            'MQTT_CLIENT_ID': 'test-client'
        }
        
        with patch('paho.mqtt.client.Client'):
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
    def test_connect_success(self, mock_client_class):
        """Test successful MQTT connection."""
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
    def test_connect_failure(self, mock_client_class):
        """Test MQTT connection failure."""
        mock_client = Mock()
        mock_client.connect.side_effect = Exception("Connection failed")
        mock_client_class.return_value = mock_client
        
        mock_app = Mock()
        mock_app.config = {'MQTT_BROKER_HOST': 'test-broker', 'MQTT_BROKER_PORT': 1883}
        
        client = MQTTClient(mock_app)
        
        with pytest.raises(Exception, match="Connection failed"):
            client.connect()
    
    @patch('paho.mqtt.client.Client')
    def test_disconnect(self, mock_client_class):
        """Test MQTT disconnection."""
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
        
        assert client.connected is False