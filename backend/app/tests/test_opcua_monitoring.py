"""Tests for OPC-UA monitoring endpoints."""
import pytest
from unittest.mock import Mock
from flask import Flask

from app.routes.opcua_monitoring import init_opcua_monitoring


@pytest.fixture
def app():
    """Create test Flask application."""
    app = Flask(__name__)
    app.config['TESTING'] = True
    init_opcua_monitoring(app)
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


class TestOPCUAMonitoringEndpoints:
    """Test OPC-UA monitoring endpoints."""

    def test_get_security_status_no_client(self, client):
        """Test security status when no OPC-UA client is available."""
        response = client.get('/api/opcua/security/status')

        assert response.status_code == 200
        data = response.get_json()
        assert 'timestamp' in data
        assert 'opcua' in data
        assert data['opcua']['available'] is False

    def test_get_security_status_with_standard_client(self, client, app):
        """Test security status with standard OPC-UA client."""
        # Mock standard client
        mock_client = Mock()
        mock_client.get_status.return_value = {
            'available': True,
            'connected': False,
            'server_url': 'opc.tcp://localhost:4840'
        }

        with app.app_context():
            app.opcua_client = mock_client
            response = client.get('/api/opcua/security/status')

        assert response.status_code == 200
        data = response.get_json()
        assert 'opcua' in data
        assert data['opcua']['available'] is True
        assert 'note' in data

    def test_get_security_status_with_secure_client(self, client, app):
        """Test security status with secure OPC-UA client."""
        # Mock secure client
        mock_client = Mock()
        mock_client.get_status.return_value = {
            'available': True,
            'connected': True,
            'server_url': 'opc.tcp://localhost:4840',
            'security': {
                'wrapper_enabled': True,
                'connection_attempts': 0
            }
        }
        mock_client.get_security_events.return_value = []

        with app.app_context():
            app.secure_opcua_client = mock_client
            response = client.get('/api/opcua/security/status')

        assert response.status_code == 200
        data = response.get_json()
        assert 'opcua' in data
        assert data['opcua']['available'] is True
        assert 'recent_security_events' in data

    def test_get_security_events_no_client(self, client):
        """Test security events when no client is available."""
        response = client.get('/api/opcua/security/events')

        assert response.status_code == 200
        data = response.get_json()
        assert 'events' in data
        assert data['count'] == 0

    def test_get_security_events_with_secure_client(self, client, app):
        """Test security events with secure client."""
        # Mock secure client with events
        mock_client = Mock()
        mock_events = [
            {
                'timestamp': '2024-01-01T00:00:00Z',
                'event_type': 'connection_established',
                'details': {}
            }
        ]
        mock_client.get_security_events.return_value = mock_events

        with app.app_context():
            app.secure_opcua_client = mock_client
            response = client.get('/api/opcua/security/events')

        assert response.status_code == 200
        data = response.get_json()
        assert 'events' in data
        assert data['count'] == 1

    def test_get_connection_status_no_client(self, client):
        """Test connection status when no client is available."""
        response = client.get('/api/opcua/connection/status')

        assert response.status_code == 200
        data = response.get_json()
        assert data['connected'] is False
        assert data['available'] is False

    def test_get_connection_status_with_client(self, client, app):
        """Test connection status with client."""
        # Mock client
        mock_client = Mock()
        mock_client.get_status.return_value = {
            'connected': True,
            'available': True,
            'server_url': 'opc.tcp://localhost:4840',
            'subscribed_nodes': 5
        }

        with app.app_context():
            app.opcua_client = mock_client
            response = client.get('/api/opcua/connection/status')

        assert response.status_code == 200
        data = response.get_json()
        assert data['connected'] is True
        assert data['available'] is True
        assert data['subscribed_nodes'] == 5

    def test_get_nodes_no_client(self, client):
        """Test getting nodes when no client is available."""
        response = client.get('/api/opcua/nodes')

        assert response.status_code == 200
        data = response.get_json()
        assert 'nodes' in data
        assert data['count'] == 0

    def test_get_nodes_with_client(self, client, app):
        """Test getting nodes with client."""
        # Mock client with node mappings
        mock_client = Mock()
        mock_client.get_status.return_value = {
            'mappings': {
                'ns=2;i=123': {
                    'unit_id': 'unit1',
                    'sensor_type': 'temperature',
                    'scale_factor': 1.0,
                    'offset': 0.0
                },
                'ns=2;i=124': {
                    'unit_id': 'unit1',
                    'sensor_type': 'pressure',
                    'scale_factor': 2.0,
                    'offset': -10.0
                }
            }
        }

        with app.app_context():
            app.opcua_client = mock_client
            response = client.get('/api/opcua/nodes')

        assert response.status_code == 200
        data = response.get_json()
        assert 'nodes' in data
        assert data['count'] == 2
        assert len(data['nodes']) == 2

        # Verify node data structure
        node = data['nodes'][0]
        assert 'node_id' in node
        assert 'unit_id' in node
        assert 'sensor_type' in node
        assert 'scale_factor' in node
        assert 'offset' in node

    def test_error_handling(self, client, app):
        """Test error handling in endpoints."""
        # Mock client that raises an exception
        mock_client = Mock()
        mock_client.get_status.side_effect = Exception("Test error")

        with app.app_context():
            app.opcua_client = mock_client
            response = client.get('/api/opcua/connection/status')

        assert response.status_code == 500
        data = response.get_json()
        assert 'error' in data


class TestInitOPCUAMonitoring:
    """Test OPC-UA monitoring initialization."""

    def test_init_opcua_monitoring(self):
        """Test monitoring initialization."""
        app = Flask(__name__)

        init_opcua_monitoring(app)

        # Verify blueprint is registered
        assert 'opcua_monitoring' in app.blueprints
