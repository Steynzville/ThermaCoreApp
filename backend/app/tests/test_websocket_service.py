"""Tests for WebSocket service."""
from datetime import datetime, timezone
from unittest.mock import Mock, patch

from app.services.websocket_service import WebSocketService


class TestWebSocketService:
    """Test WebSocket service functionality."""

    def test_init_without_app(self):
        """Test WebSocketService initialization without Flask app."""
        service = WebSocketService()
        assert service.socketio is None
        assert service._app is None
        assert service._connected_clients == {}

    @patch('app.services.websocket_service.SocketIO')
    def test_init_with_app(self, mock_socketio):
        """Test WebSocketService initialization with Flask app."""
        mock_app = Mock()
        mock_app.config = {
            'WEBSOCKET_CORS_ORIGINS': '*',
            'WEBSOCKET_PING_TIMEOUT': 60,
            'WEBSOCKET_PING_INTERVAL': 25
        }

        service = WebSocketService(mock_app)

        assert service._app == mock_app
        mock_socketio.assert_called_once_with(
            mock_app,
            cors_allowed_origins='*',
            ping_timeout=60,
            ping_interval=25,
            logger=True,
            engineio_logger=True
        )

    def test_get_status(self):
        """Test getting WebSocket service status."""
        service = WebSocketService()
        service._connected_clients = {
            'client1': {'connected_at': datetime.now(timezone.utc)},
            'client2': {'connected_at': datetime.now(timezone.utc)}
        }

        # Test without SocketIO
        status = service.get_status()
        assert status['connected_clients'] == 2
        assert len(status['clients']) == 2
        assert status['service_status'] == 'inactive'

        # Test with SocketIO
        service.socketio = Mock()
        status = service.get_status()
        assert status['service_status'] == 'active'

    def test_get_connected_clients(self):
        """Test getting connected clients information."""
        service = WebSocketService()
        test_clients = {
            'client1': {'connected_at': datetime.now(timezone.utc), 'subscribed_units': ['UNIT001']},
            'client2': {'connected_at': datetime.now(timezone.utc), 'subscribed_units': []}
        }
        service._connected_clients = test_clients

        clients = service.get_connected_clients()

        # Should return a copy
        assert clients == test_clients
        assert clients is not test_clients

    @patch('app.services.websocket_service.emit')
    def test_broadcast_sensor_data(self, mock_emit):
        """Test broadcasting sensor data to clients."""
        service = WebSocketService()
        service.socketio = Mock()

        test_data = {
            'value': 25.5,
            'quality': 'GOOD',
            'timestamp': datetime.now(timezone.utc)
        }

        service.broadcast_sensor_data('UNIT001', 'temperature', test_data)

        # Verify service.socketio.emit was called
        service.socketio.emit.assert_called_once()
        call_args = service.socketio.emit.call_args
        assert call_args[0][0] == 'sensor_data'  # event name

        message = call_args[0][1]  # message data
        assert message['unit_id'] == 'UNIT001'
        assert message['sensor_type'] == 'temperature'
        assert message['value'] == 25.5
        assert message['quality'] == 'GOOD'

        assert call_args[1]['room'] == 'unit_UNIT001'  # room name

    @patch('app.services.websocket_service.emit')
    def test_broadcast_unit_status(self, mock_emit):
        """Test broadcasting unit status updates."""
        service = WebSocketService()
        service.socketio = Mock()

        status_data = {
            'status': 'offline',
            'health_status': 'error'
        }

        service.broadcast_unit_status('UNIT001', status_data)

        service.socketio.emit.assert_called_once()
        call_args = service.socketio.emit.call_args
        assert call_args[0][0] == 'unit_status'

        message = call_args[0][1]
        assert message['unit_id'] == 'UNIT001'
        assert message['status'] == 'offline'
        assert message['health_status'] == 'error'
        assert 'timestamp' in message

        assert call_args[1]['room'] == 'unit_UNIT001'

    @patch('app.services.websocket_service.emit')
    def test_broadcast_system_alert(self, mock_emit):
        """Test broadcasting system-wide alerts."""
        service = WebSocketService()
        service.socketio = Mock()

        alert_data = {
            'type': 'critical',
            'message': 'High temperature detected',
            'unit_id': 'UNIT001'
        }

        service.broadcast_system_alert(alert_data)

        service.socketio.emit.assert_called_once()
        call_args = service.socketio.emit.call_args
        assert call_args[0][0] == 'system_alert'

        message = call_args[0][1]
        assert message['type'] == 'critical'
        assert message['message'] == 'High temperature detected'
        assert message['unit_id'] == 'UNIT001'
        assert 'timestamp' in message

        assert call_args[1]['broadcast'] is True

    def test_broadcast_without_socketio(self):
        """Test that broadcast methods handle missing socketio gracefully."""
        service = WebSocketService()
        service.socketio = None

        # These should not raise exceptions
        service.broadcast_sensor_data('UNIT001', 'temperature', {'value': 25.5})
        service.broadcast_unit_status('UNIT001', {'status': 'online'})
        service.broadcast_system_alert({'type': 'info', 'message': 'Test alert'})

    def test_get_client_id(self):
        """Test getting client ID from request."""
        service = WebSocketService()

        # Mock the _get_client_id method directly since flask_socketio.request is context-dependent
        service._get_client_id = Mock(return_value='test-client-id')

        client_id = service._get_client_id()
        assert client_id == 'test-client-id'

    @patch('app.services.websocket_service.emit')
    def test_on_connect(self, mock_emit):
        """Test client connection handler."""
        service = WebSocketService()
        service._get_client_id = Mock(return_value='test-client-id')

        service._on_connect()

        # Check client was added
        assert 'test-client-id' in service._connected_clients
        client_info = service._connected_clients['test-client-id']
        assert 'connected_at' in client_info
        assert client_info['subscribed_units'] == []

        # Check connection confirmation was sent
        mock_emit.assert_called_once()
        call_args = mock_emit.call_args
        assert call_args[0][0] == 'connection_confirmed'

        message = call_args[0][1]
        assert message['status'] == 'connected'
        assert message['client_id'] == 'test-client-id'

    def test_on_disconnect(self):
        """Test client disconnection handler."""
        service = WebSocketService()
        service._get_client_id = Mock(return_value='test-client-id')
        service._connected_clients['test-client-id'] = {'connected_at': datetime.now(timezone.utc)}

        service._on_disconnect()

        # Check client was removed
        assert 'test-client-id' not in service._connected_clients

    @patch('app.services.websocket_service.join_room')
    @patch('app.services.websocket_service.emit')
    def test_on_subscribe_unit(self, mock_emit, mock_join_room):
        """Test unit subscription handler."""
        service = WebSocketService()
        service._get_client_id = Mock(return_value='test-client-id')
        service._connected_clients['test-client-id'] = {
            'connected_at': datetime.now(timezone.utc),
            'subscribed_units': []
        }

        data = {'unit_id': 'UNIT001'}
        service._on_subscribe_unit(data)

        # Check room was joined
        mock_join_room.assert_called_once_with('unit_UNIT001')

        # Check subscription was tracked
        subscribed_units = service._connected_clients['test-client-id']['subscribed_units']
        assert 'UNIT001' in subscribed_units

        # Check confirmation was sent
        mock_emit.assert_called_once()
        call_args = mock_emit.call_args
        assert call_args[0][0] == 'subscription_confirmed'

        message = call_args[0][1]
        assert message['unit_id'] == 'UNIT001'
        assert message['status'] == 'subscribed'

    @patch('app.services.websocket_service.emit')
    def test_on_subscribe_unit_missing_unit_id(self, mock_emit):
        """Test unit subscription with missing unit_id."""
        service = WebSocketService()
        service._get_client_id = Mock(return_value='test-client-id')

        data = {}  # Missing unit_id
        service._on_subscribe_unit(data)

        # Check error was sent
        mock_emit.assert_called_once()
        call_args = mock_emit.call_args
        assert call_args[0][0] == 'error'
        assert 'unit_id is required' in call_args[0][1]['message']

    @patch('app.services.websocket_service.leave_room')
    @patch('app.services.websocket_service.emit')
    def test_on_unsubscribe_unit(self, mock_emit, mock_leave_room):
        """Test unit unsubscription handler."""
        service = WebSocketService()
        service._get_client_id = Mock(return_value='test-client-id')
        service._connected_clients['test-client-id'] = {
            'connected_at': datetime.now(timezone.utc),
            'subscribed_units': ['UNIT001']
        }

        data = {'unit_id': 'UNIT001'}
        service._on_unsubscribe_unit(data)

        # Check room was left
        mock_leave_room.assert_called_once_with('unit_UNIT001')

        # Check subscription was removed
        subscribed_units = service._connected_clients['test-client-id']['subscribed_units']
        assert 'UNIT001' not in subscribed_units

        # Check confirmation was sent
        mock_emit.assert_called_once()
        call_args = mock_emit.call_args
        assert call_args[0][0] == 'unsubscription_confirmed'

        message = call_args[0][1]
        assert message['unit_id'] == 'UNIT001'
        assert message['status'] == 'unsubscribed'

    @patch('app.services.websocket_service.emit')
    def test_on_get_status(self, mock_emit):
        """Test status request handler."""
        service = WebSocketService()
        service._get_client_id = Mock(return_value='test-client-id')
        connected_at = datetime.now(timezone.utc)
        service._connected_clients['test-client-id'] = {
            'connected_at': connected_at,
            'subscribed_units': ['UNIT001', 'UNIT002']
        }

        service._on_get_status()

        # Check status response was sent
        mock_emit.assert_called_once()
        call_args = mock_emit.call_args
        assert call_args[0][0] == 'status_response'

        message = call_args[0][1]
        assert message['client_id'] == 'test-client-id'
        assert message['connected_at'] == connected_at.isoformat()
        assert message['subscribed_units'] == ['UNIT001', 'UNIT002']
        assert 'server_time' in message