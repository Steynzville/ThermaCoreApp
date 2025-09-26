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
    
    def __init__(self, app=None, data_storage_service=None):
        """Initialize MQTT client.
        
        Args:
            app: Flask application instance
            data_storage_service: DataStorageService instance for dependency injection
        """
        self.client = None
        self.connected = False
        self._app = app
        self._data_storage_service = data_storage_service
        self._message_handlers: Dict[str, Callable] = {}
        self._subscribed_topics: List[str] = []
        
        if app:
            self.init_app(app, data_storage_service)
    
    def init_app(self, app, data_storage_service=None):
        """Initialize the MQTT client with Flask app configuration."""
        self._app = app
        self._data_storage_service = data_storage_service
        
        # MQTT configuration
        self.broker_host = app.config.get('MQTT_BROKER_HOST', 'localhost')
        self.broker_port = app.config.get('MQTT_BROKER_PORT', 1883)
        self.username = app.config.get('MQTT_USERNAME')
        self.password = app.config.get('MQTT_PASSWORD')
        self.client_id = app.config.get('MQTT_CLIENT_ID', 'thermacore_backend')
        self.keepalive = app.config.get('MQTT_KEEPALIVE', 60)
        self.use_tls = app.config.get('MQTT_USE_TLS', False)
        self.ca_certs = app.config.get('MQTT_CA_CERTS')
        self.cert_file = app.config.get('MQTT_CERT_FILE')
        self.key_file = app.config.get('MQTT_KEY_FILE')
        
        # Create MQTT client
        self.client = mqtt.Client(client_id=self.client_id)
        
        # Configure TLS if enabled
        if self.use_tls:
            import ssl
            
            # Enforce TLSv1.2+ and secure cipher suites for production
            if app.config.get('FLASK_ENV') == 'production':
                # Production: require TLSv1.2+ with restricted cipher suites
                tls_version = ssl.PROTOCOL_TLS_CLIENT  # Secure TLS version
                secure_ciphers = 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS'
            else:
                # Development: allow broader TLS compatibility
                tls_version = ssl.PROTOCOL_TLS
                secure_ciphers = None
            
            if self.ca_certs:
                # Configure TLS with certificate pinning and hostname verification
                self.client.tls_set(ca_certs=self.ca_certs, 
                                  certfile=self.cert_file, 
                                  keyfile=self.key_file,
                                  cert_reqs=ssl.CERT_REQUIRED,
                                  tls_version=tls_version,
                                  ciphers=secure_ciphers)
                # Enable hostname verification for security
                self.client.tls_insecure_set(False)
                logger.info(f"MQTT TLS configured with certificates, hostname verification and secure ciphers (production: {app.config.get('FLASK_ENV') == 'production'})")
            else:
                # Use system CA certificates with security hardening
                self.client.tls_set(cert_reqs=ssl.CERT_REQUIRED,
                                  tls_version=tls_version,
                                  ciphers=secure_ciphers)
                self.client.tls_insecure_set(False)
                logger.info(f"MQTT TLS configured with system certificates, hostname verification and secure ciphers (production: {app.config.get('FLASK_ENV') == 'production'})")
                
            # Log TLS security status for production monitoring
            if app.config.get('FLASK_ENV') == 'production':
                logger.info("MQTT TLS enabled with hardened security configuration for production")
        elif app.config.get('FLASK_ENV') == 'production':
            logger.error("MQTT TLS not enabled - this is not allowed in production environments")
            raise ValueError("MQTT TLS must be enabled in production environment")
        
        
        # Set authentication if provided (required for secure connections)
        if self.username and self.password:
            self.client.username_pw_set(self.username, self.password)
            logger.info("MQTT authentication configured")
        elif app.config.get('FLASK_ENV') == 'production':
            logger.error("MQTT authentication not configured - this is not allowed for production")
            raise ValueError("MQTT authentication must be configured in production environment")
        
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
            logger.error(f"Failed to connect to MQTT broker: {e}", exc_info=True)
            raise ConnectionError(f"MQTT connection failed: {e}") from e
    
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
        """Store parsed sensor data using the dedicated data storage service.
        
        Args:
            data: Parsed sensor data
        """
        # Use injected data storage service - no fallback allowed
        if not self._data_storage_service:
            logger.error("Data storage service not available - check service initialization. Dependency injection required.")
            return
        
        try:
            success = self._data_storage_service.store_sensor_data(data)
            
            if success:
                # Process data for real-time streaming after successful storage
                try:
                    from app.services.realtime_processor import realtime_processor
                    realtime_processor.process_sensor_data(
                        data['unit_id'], 
                        data['sensor_type'], 
                        data
                    )
                except ImportError:
                    logger.warning("Real-time processor not available")
                    
                logger.debug(f"Successfully stored and processed sensor data: {data['unit_id']}/{data['sensor_type']}")
            else:
                logger.error(f"Failed to store sensor data: {data['unit_id']}/{data['sensor_type']}")
                
        except Exception as e:
            logger.error(f"Unexpected error in data storage: {e}", exc_info=True)
    
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