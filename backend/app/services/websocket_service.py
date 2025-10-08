"""WebSocket service for real-time data streaming to frontend clients."""
import logging
from typing import Dict, Any
from datetime import datetime, timezone

from flask_socketio import SocketIO, emit, join_room, leave_room

logger = logging.getLogger(__name__)


class WebSocketService:
    """WebSocket service for real-time communication with frontend clients."""
    
    def __init__(self, app=None):
        """Initialize WebSocket service.
        
        Args:
            app: Flask application instance
        """
        self.socketio = None
        self._app = app
        self._connected_clients: Dict[str, Dict[str, Any]] = {}
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the WebSocket service with Flask app."""
        self._app = app
        
        # Initialize SocketIO
        self.socketio = SocketIO(
            app,
            cors_allowed_origins=app.config.get('WEBSOCKET_CORS_ORIGINS', '*'),
            ping_timeout=app.config.get('WEBSOCKET_PING_TIMEOUT', 60),
            ping_interval=app.config.get('WEBSOCKET_PING_INTERVAL', 25),
            logger=True,
            engineio_logger=True
        )
        
        # Register event handlers
        self.socketio.on_event('connect', self._on_connect)
        self.socketio.on_event('disconnect', self._on_disconnect)
        self.socketio.on_event('subscribe_unit', self._on_subscribe_unit)
        self.socketio.on_event('unsubscribe_unit', self._on_unsubscribe_unit)
        self.socketio.on_event('get_status', self._on_get_status)
        
    def _on_connect(self):
        """Handle client connection."""
        client_id = self._get_client_id()
        logger.info(f"WebSocket client connected: {client_id}")
        
        self._connected_clients[client_id] = {
            'connected_at': datetime.now(timezone.utc),
            'subscribed_units': []
        }
        
        # Send connection confirmation
        emit('connection_confirmed', {
            'status': 'connected',
            'client_id': client_id,
            'server_time': datetime.now(timezone.utc).isoformat()
        })
    
    def _on_disconnect(self):
        """Handle client disconnection."""
        client_id = self._get_client_id()
        logger.info(f"WebSocket client disconnected: {client_id}")
        
        # Clean up client data
        if client_id in self._connected_clients:
            del self._connected_clients[client_id]
    
    def _on_subscribe_unit(self, data):
        """Handle unit subscription request.
        
        Args:
            data: Request data containing unit_id
        """
        client_id = self._get_client_id()
        unit_id = data.get('unit_id')
        
        if not unit_id:
            emit('error', {'message': 'unit_id is required'})
            return
        
        logger.info(f"Client {client_id} subscribing to unit {unit_id}")
        
        # Join room for this unit
        room_name = f"unit_{unit_id}"
        join_room(room_name)
        
        # Track subscription
        if client_id in self._connected_clients:
            subscribed_units = self._connected_clients[client_id]['subscribed_units']
            if unit_id not in subscribed_units:
                subscribed_units.append(unit_id)
        
        emit('subscription_confirmed', {
            'unit_id': unit_id,
            'status': 'subscribed'
        })
    
    def _on_unsubscribe_unit(self, data):
        """Handle unit unsubscription request.
        
        Args:
            data: Request data containing unit_id
        """
        client_id = self._get_client_id()
        unit_id = data.get('unit_id')
        
        if not unit_id:
            emit('error', {'message': 'unit_id is required'})
            return
        
        logger.info(f"Client {client_id} unsubscribing from unit {unit_id}")
        
        # Leave room for this unit
        room_name = f"unit_{unit_id}"
        leave_room(room_name)
        
        # Remove from subscriptions
        if client_id in self._connected_clients:
            subscribed_units = self._connected_clients[client_id]['subscribed_units']
            if unit_id in subscribed_units:
                subscribed_units.remove(unit_id)
        
        emit('unsubscription_confirmed', {
            'unit_id': unit_id,
            'status': 'unsubscribed'
        })
    
    def _on_get_status(self):
        """Handle status request."""
        client_id = self._get_client_id()
        client_info = self._connected_clients.get(client_id, {})
        
        emit('status_response', {
            'client_id': client_id,
            'connected_at': client_info.get('connected_at', '').isoformat() if client_info.get('connected_at') else None,
            'subscribed_units': client_info.get('subscribed_units', []),
            'server_time': datetime.now(timezone.utc).isoformat()
        })
    
    def _get_client_id(self) -> str:
        """Get unique client identifier."""
        from flask_socketio import request
        return request.sid
    
    def broadcast_sensor_data(self, unit_id: str, sensor_type: str, data: Dict[str, Any]):
        """Broadcast sensor data to subscribed clients.
        
        Args:
            unit_id: Unit identifier
            sensor_type: Type of sensor
            data: Sensor data to broadcast
        """
        if not self.socketio:
            return
        
        room_name = f"unit_{unit_id}"
        message = {
            'unit_id': unit_id,
            'sensor_type': sensor_type,
            'value': data.get('value'),
            'quality': data.get('quality', 'GOOD'),
            'timestamp': data.get('timestamp', datetime.now(timezone.utc)).isoformat()
        }
        
        logger.debug(f"Broadcasting sensor data to room {room_name}: {message}")
        self.socketio.emit('sensor_data', message, room=room_name)
    
    def broadcast_unit_status(self, unit_id: str, status_data: Dict[str, Any]):
        """Broadcast unit status update to subscribed clients.
        
        Args:
            unit_id: Unit identifier
            status_data: Status update data
        """
        if not self.socketio:
            return
        
        room_name = f"unit_{unit_id}"
        message = {
            'unit_id': unit_id,
            'status': status_data.get('status'),
            'health_status': status_data.get('health_status'),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.debug(f"Broadcasting unit status to room {room_name}: {message}")
        self.socketio.emit('unit_status', message, room=room_name)
    
    def broadcast_system_alert(self, alert_data: Dict[str, Any]):
        """Broadcast system-wide alert to all connected clients.
        
        Args:
            alert_data: Alert data to broadcast
        """
        if not self.socketio:
            return
        
        message = {
            'type': alert_data.get('type', 'info'),
            'message': alert_data.get('message'),
            'unit_id': alert_data.get('unit_id'),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Broadcasting system alert: {message}")
        # Broadcast to all connected clients across all namespaces (no room or namespace specified broadcasts to all clients in all namespaces)
        self.socketio.emit('system_alert', message)

    def broadcast_device_status(self, device_id: str, status_data: Dict[str, Any]):
        """Broadcast device status update to subscribed clients.
        
        Args:
            device_id: Device identifier
            status_data: Device status update data
        """
        if not self.socketio:
            return
        
        room_name = f"device_{device_id}"
        message = {
            'device_id': device_id,
            'device_name': status_data.get('device_name', device_id),
            'timestamp': status_data.get('timestamp', datetime.now(timezone.utc)).isoformat(),
            'changes': status_data.get('changes', []),
            'old_status': status_data.get('old_status', {}),
            'new_status': status_data.get('new_status', {}),
        }
        
        logger.debug(f"Broadcasting device status to room {room_name}: {message}")
        self.socketio.emit('device_status', message, room=room_name)
        
        # Also broadcast to general status room for dashboard updates
        self.socketio.emit('device_status', message, room='status_updates')
    
    def get_connected_clients(self) -> Dict[str, Dict[str, Any]]:
        """Get information about connected clients.
        
        Returns:
            Dictionary of connected clients and their info
        """
        return self._connected_clients.copy()
    
    def get_status(self) -> Dict[str, Any]:
        """Get WebSocket service status.
        
        Returns:
            Status dictionary
        """
        return {
            'connected_clients': len(self._connected_clients),
            'clients': list(self._connected_clients.keys()),
            'service_status': 'active' if self.socketio else 'inactive'
        }


# Global WebSocket service instance
websocket_service = WebSocketService()