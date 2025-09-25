"""MQTT client service for SCADA data ingestion."""
import json
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Callable

import paho.mqtt.client as mqtt
from flask import current_app
from sqlalchemy.exc import IntegrityError

from app.models import db, SensorReading, Sensor, Unit

logger = logging.getLogger(__name__)


class MQTTClient:
    """MQTT client for subscribing to SCADA data topics."""
    
    def __init__(self, app=None):
        """Initialize MQTT client.
        
        Args:
            app: Flask application instance
        """
        self.client = None
        self.connected = False
        self._app = app
        self._message_handlers: Dict[str, Callable] = {}
        self._subscribed_topics: List[str] = []
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the MQTT client with Flask app configuration."""
        self._app = app
        
        # MQTT configuration
        self.broker_host = app.config.get('MQTT_BROKER_HOST', 'localhost')
        self.broker_port = app.config.get('MQTT_BROKER_PORT', 1883)
        self.username = app.config.get('MQTT_USERNAME')
        self.password = app.config.get('MQTT_PASSWORD')
        self.client_id = app.config.get('MQTT_CLIENT_ID', 'thermacore_backend')
        self.keepalive = app.config.get('MQTT_KEEPALIVE', 60)
        
        # Create MQTT client
        self.client = mqtt.Client(client_id=self.client_id)
        
        # Set authentication if provided
        if self.username and self.password:
            self.client.username_pw_set(self.username, self.password)
        
        # Set callbacks
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message
        
        # Default SCADA data topics to subscribe to
        self.default_topics = app.config.get('MQTT_SCADA_TOPICS', [
            'scada/+/temperature',
            'scada/+/pressure', 
            'scada/+/flow_rate',
            'scada/+/power',
            'scada/+/status'
        ])
    
    def connect(self):
        """Connect to MQTT broker."""
        try:
            logger.info(f"Connecting to MQTT broker at {self.broker_host}:{self.broker_port}")
            self.client.connect(self.broker_host, self.broker_port, self.keepalive)
            self.client.loop_start()
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            raise
    
    def disconnect(self):
        """Disconnect from MQTT broker."""
        if self.client:
            logger.info("Disconnecting from MQTT broker")
            self.client.loop_stop()
            self.client.disconnect()
            self.connected = False
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback for when the client receives a CONNACK response."""
        if rc == 0:
            self.connected = True
            logger.info("Connected to MQTT broker successfully")
            
            # Subscribe to default SCADA topics
            for topic in self.default_topics:
                self.subscribe_topic(topic)
        else:
            logger.error(f"Failed to connect to MQTT broker, return code {rc}")
            self.connected = False
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback for when the client disconnects from the broker."""
        self.connected = False
        if rc != 0:
            logger.warning("Unexpected disconnect from MQTT broker")
        else:
            logger.info("Disconnected from MQTT broker")
    
    def _on_message(self, client, userdata, msg):
        """Handle incoming MQTT messages."""
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            
            logger.debug(f"Received message on topic '{topic}': {payload}")
            
            # Parse and validate message
            parsed_data = self._parse_scada_message(topic, payload)
            if parsed_data:
                # Store data in database with app context
                with self._app.app_context():
                    self._store_sensor_data(parsed_data)
        
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")
    
    def subscribe_topic(self, topic: str, qos: int = 0):
        """Subscribe to an MQTT topic.
        
        Args:
            topic: MQTT topic to subscribe to
            qos: Quality of Service level (0, 1, or 2)
        """
        try:
            result, _ = self.client.subscribe(topic, qos)
            if result == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"Subscribed to topic: {topic}")
                if topic not in self._subscribed_topics:
                    self._subscribed_topics.append(topic)
            else:
                logger.error(f"Failed to subscribe to topic {topic}")
        except Exception as e:
            logger.error(f"Error subscribing to topic {topic}: {e}")
    
    def _parse_scada_message(self, topic: str, payload: str) -> Optional[Dict[str, Any]]:
        """Parse SCADA message from MQTT.
        
        Expected topic format: scada/{unit_id}/{sensor_type}
        Expected payload: JSON with value, timestamp (optional), quality (optional)
        
        Args:
            topic: MQTT topic
            payload: Message payload
            
        Returns:
            Parsed data dictionary or None if parsing fails
        """
        try:
            # Parse topic to extract unit_id and sensor_type
            topic_parts = topic.split('/')
            if len(topic_parts) < 3 or topic_parts[0] != 'scada':
                logger.warning(f"Invalid topic format: {topic}")
                return None
            
            unit_id = topic_parts[1]
            sensor_type = topic_parts[2]
            
            # Parse JSON payload
            try:
                data = json.loads(payload)
                # If it's just a number, wrap it in a dict
                if isinstance(data, (int, float)):
                    data = {'value': data}
            except json.JSONDecodeError:
                # Try to parse as simple numeric value
                try:
                    data = {'value': float(payload)}
                except ValueError:
                    logger.error(f"Cannot parse payload as JSON or number: {payload}")
                    return None
            
            # Validate required fields
            if not isinstance(data, dict) or 'value' not in data:
                logger.error(f"Missing 'value' field in payload: {payload}")
                return None
            
            # Extract fields
            value = float(data['value'])
            timestamp = data.get('timestamp')
            quality = data.get('quality', 'GOOD')
            
            # Parse timestamp if provided
            parsed_timestamp = None
            if timestamp:
                try:
                    # Try parsing ISO format timestamp
                    parsed_timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                except ValueError:
                    try:
                        # Try parsing Unix timestamp
                        parsed_timestamp = datetime.fromtimestamp(float(timestamp), tz=timezone.utc)
                    except ValueError:
                        logger.warning(f"Invalid timestamp format: {timestamp}")
            
            if not parsed_timestamp:
                parsed_timestamp = datetime.now(timezone.utc)
            
            return {
                'unit_id': unit_id,
                'sensor_type': sensor_type,
                'value': value,
                'timestamp': parsed_timestamp,
                'quality': quality
            }
            
        except Exception as e:
            logger.error(f"Error parsing SCADA message: {e}")
            return None
    
    def _store_sensor_data(self, data: Dict[str, Any]):
        """Store parsed sensor data in the database and process for real-time streaming.
        
        Args:
            data: Parsed sensor data
        """
        try:
            # Find or create sensor
            sensor = self._find_or_create_sensor(
                unit_id=data['unit_id'],
                sensor_type=data['sensor_type']
            )
            
            if not sensor:
                logger.error(f"Could not create sensor for unit {data['unit_id']}, type {data['sensor_type']}")
                return
            
            # Create sensor reading
            reading = SensorReading(
                sensor_id=sensor.id,
                timestamp=data['timestamp'],
                value=data['value'],
                quality=data['quality']
            )
            
            db.session.add(reading)
            db.session.commit()
            
            logger.debug(f"Stored sensor reading: {data['unit_id']}/{data['sensor_type']} = {data['value']}")
            
            # Process data for real-time streaming (import here to avoid circular imports)
            try:
                from app.services.realtime_processor import realtime_processor
                realtime_processor.process_sensor_data(
                    data['unit_id'], 
                    data['sensor_type'], 
                    data
                )
            except ImportError:
                logger.warning("Real-time processor not available")
            
        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"Database integrity error storing sensor data: {e}")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error storing sensor data: {e}")
    
    def _find_or_create_sensor(self, unit_id: str, sensor_type: str) -> Optional[Sensor]:
        """Find existing sensor or create new one.
        
        Args:
            unit_id: Unit identifier
            sensor_type: Type of sensor
            
        Returns:
            Sensor instance or None if unit not found
        """
        try:
            # Check if unit exists
            unit = Unit.query.filter_by(id=unit_id).first()
            if not unit:
                logger.warning(f"Unit {unit_id} not found, skipping sensor data")
                return None
            
            # Find existing sensor
            sensor = Sensor.query.filter_by(
                unit_id=unit_id,
                sensor_type=sensor_type
            ).first()
            
            if sensor:
                return sensor
            
            # Create new sensor
            sensor_name = f"{sensor_type.title()} Sensor"
            unit_mapping = {
                'temperature': '°C',
                'pressure': 'bar',
                'flow_rate': 'L/min',
                'power': 'kW',
                'status': 'status'
            }
            
            sensor = Sensor(
                unit_id=unit_id,
                name=sensor_name,
                sensor_type=sensor_type,
                unit_of_measurement=unit_mapping.get(sensor_type, ''),
                is_active=True
            )
            
            db.session.add(sensor)
            db.session.commit()
            
            logger.info(f"Created new sensor: {unit_id}/{sensor_type}")
            return sensor
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error finding/creating sensor: {e}")
            return None
    
    def publish_message(self, topic: str, payload: str, qos: int = 0):
        """Publish message to MQTT topic.
        
        Args:
            topic: MQTT topic
            payload: Message payload
            qos: Quality of Service level
        """
        if not self.connected:
            logger.error("Cannot publish message - not connected to MQTT broker")
            return False
        
        try:
            result = self.client.publish(topic, payload, qos)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.debug(f"Published message to topic '{topic}': {payload}")
                return True
            else:
                logger.error(f"Failed to publish message to topic '{topic}'")
                return False
        except Exception as e:
            logger.error(f"Error publishing message: {e}")
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """Get MQTT client status.
        
        Returns:
            Status dictionary
        """
        return {
            'connected': self.connected,
            'broker_host': self.broker_host,
            'broker_port': self.broker_port,
            'client_id': self.client_id,
            'subscribed_topics': self._subscribed_topics.copy()
        }


# Global MQTT client instance
mqtt_client = MQTTClient()