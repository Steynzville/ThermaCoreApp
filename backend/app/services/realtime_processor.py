"""Real-time data processing service that integrates MQTT and WebSocket services."""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.services.mqtt_service import mqtt_client
from app.services.websocket_service import websocket_service

logger = logging.getLogger(__name__)


class RealTimeDataProcessor:
    """Service for processing and routing real-time SCADA data."""
    
    def __init__(self, app=None):
        """Initialize real-time data processor.
        
        Args:
            app: Flask application instance
        """
        self._app = app
        self._data_handlers: List[callable] = []
        self._alert_rules: List[Dict[str, Any]] = []
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize with Flask app."""
        self._app = app
        
        # Set up default alert rules
        self._setup_default_alert_rules()
    
    def _setup_default_alert_rules(self):
        """Set up default alerting rules for SCADA data."""
        self._alert_rules = [
            {
                'sensor_type': 'temperature',
                'condition': 'greater_than',
                'threshold': 85.0,
                'severity': 'critical',
                'message': 'High temperature alert: {value}°C'
            },
            {
                'sensor_type': 'pressure', 
                'condition': 'greater_than',
                'threshold': 10.0,
                'severity': 'warning',
                'message': 'High pressure alert: {value} bar'
            },
            {
                'sensor_type': 'temperature',
                'condition': 'less_than',
                'threshold': -10.0,
                'severity': 'warning',
                'message': 'Low temperature alert: {value}°C'
            }
        ]
    
    def process_sensor_data(self, unit_id: str, sensor_type: str, data: Dict[str, Any]):
        """Process incoming sensor data and route to appropriate services.
        
        Args:
            unit_id: Unit identifier
            sensor_type: Type of sensor
            data: Sensor data
        """
        try:
            logger.debug(f"Processing sensor data: {unit_id}/{sensor_type} = {data}")
            
            # Apply data validation and transformation
            processed_data = self._validate_and_transform_data(data)
            
            # Check for alerts
            alerts = self._check_alert_rules(unit_id, sensor_type, processed_data)
            
            # Broadcast alerts if any
            for alert in alerts:
                websocket_service.broadcast_system_alert(alert)
            
            # Broadcast sensor data to WebSocket clients
            websocket_service.broadcast_sensor_data(unit_id, sensor_type, processed_data)
            
            # Apply custom data handlers
            for handler in self._data_handlers:
                try:
                    handler(unit_id, sensor_type, processed_data)
                except Exception as e:
                    logger.error(f"Error in custom data handler: {e}")
            
        except Exception as e:
            logger.error(f"Error processing sensor data: {e}")
    
    def _validate_and_transform_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and transform incoming sensor data.
        
        Args:
            data: Raw sensor data
            
        Returns:
            Processed sensor data
        """
        processed = data.copy()
        
        # Ensure timestamp is present
        if 'timestamp' not in processed or not processed['timestamp']:
            processed['timestamp'] = datetime.now(timezone.utc)
        
        # Ensure quality is set
        if 'quality' not in processed:
            processed['quality'] = 'GOOD'
        
        # Validate quality values
        valid_qualities = ['GOOD', 'BAD', 'UNCERTAIN']
        if processed['quality'] not in valid_qualities:
            logger.warning(f"Invalid quality value: {processed['quality']}, setting to UNCERTAIN")
            processed['quality'] = 'UNCERTAIN'
        
        # Round numerical values
        if 'value' in processed and isinstance(processed['value'], (int, float)):
            processed['value'] = round(float(processed['value']), 2)
        
        return processed
    
    def _check_alert_rules(self, unit_id: str, sensor_type: str, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check sensor data against configured alert rules.
        
        Args:
            unit_id: Unit identifier
            sensor_type: Type of sensor
            data: Sensor data
            
        Returns:
            List of alert dictionaries
        """
        alerts = []
        value = data.get('value')
        
        if value is None:
            return alerts
        
        for rule in self._alert_rules:
            if rule['sensor_type'] != sensor_type:
                continue
            
            condition = rule['condition']
            threshold = rule['threshold']
            triggered = False
            
            if condition == 'greater_than' and value > threshold:
                triggered = True
            elif condition == 'less_than' and value < threshold:
                triggered = True
            elif condition == 'equals' and value == threshold:
                triggered = True
            
            if triggered:
                alert = {
                    'type': rule['severity'],
                    'message': rule['message'].format(value=value),
                    'unit_id': unit_id,
                    'sensor_type': sensor_type,
                    'value': value,
                    'threshold': threshold,
                    'rule': rule
                }
                alerts.append(alert)
                logger.warning(f"Alert triggered: {alert['message']}")
        
        return alerts
    
    def add_data_handler(self, handler: callable):
        """Add custom data handler function.
        
        Args:
            handler: Function that takes (unit_id, sensor_type, data)
        """
        if handler not in self._data_handlers:
            self._data_handlers.append(handler)
            logger.info(f"Added data handler: {handler.__name__}")
    
    def remove_data_handler(self, handler: callable):
        """Remove custom data handler function.
        
        Args:
            handler: Function to remove
        """
        if handler in self._data_handlers:
            self._data_handlers.remove(handler)
            logger.info(f"Removed data handler: {handler.__name__}")
    
    def add_alert_rule(self, sensor_type: str, condition: str, threshold: float, 
                      severity: str = 'warning', message: str = None):
        """Add new alert rule.
        
        Args:
            sensor_type: Type of sensor to monitor
            condition: Condition to check ('greater_than', 'less_than', 'equals')
            threshold: Threshold value
            severity: Alert severity ('info', 'warning', 'critical')
            message: Custom alert message template
        """
        if not message:
            message = f"{sensor_type.title()} {condition.replace('_', ' ')} {threshold}: {{value}}"
        
        rule = {
            'sensor_type': sensor_type,
            'condition': condition,
            'threshold': threshold,
            'severity': severity,
            'message': message
        }
        
        self._alert_rules.append(rule)
        logger.info(f"Added alert rule: {rule}")
    
    def get_alert_rules(self) -> List[Dict[str, Any]]:
        """Get all configured alert rules.
        
        Returns:
            List of alert rules
        """
        return self._alert_rules.copy()
    
    def process_unit_status_change(self, unit_id: str, old_status: str, new_status: str):
        """Process unit status change and broadcast to clients.
        
        Args:
            unit_id: Unit identifier
            old_status: Previous status
            new_status: New status
        """
        logger.info(f"Unit {unit_id} status changed: {old_status} -> {new_status}")
        
        status_data = {
            'status': new_status,
            'previous_status': old_status,
            'timestamp': datetime.now(timezone.utc)
        }
        
        websocket_service.broadcast_unit_status(unit_id, status_data)
        
        # Generate alert for critical status changes
        if new_status in ['offline', 'error', 'maintenance']:
            alert = {
                'type': 'warning' if new_status == 'maintenance' else 'critical',
                'message': f"Unit {unit_id} status changed to {new_status}",
                'unit_id': unit_id
            }
            websocket_service.broadcast_system_alert(alert)
    
    def get_status(self) -> Dict[str, Any]:
        """Get real-time data processor status.
        
        Returns:
            Status dictionary
        """
        return {
            'active_handlers': len(self._data_handlers),
            'alert_rules': len(self._alert_rules),
            'mqtt_status': mqtt_client.get_status(),
            'websocket_status': websocket_service.get_status()
        }


# Global real-time data processor instance
realtime_processor = RealTimeDataProcessor()