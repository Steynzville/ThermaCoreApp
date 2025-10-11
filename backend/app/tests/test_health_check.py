"""Tests for health check endpoint."""
from unittest.mock import Mock
from datetime import datetime


class TestHealthCheckEndpoint:
    """Test health check endpoint with various scenarios."""
    
    def test_health_check_basic(self, client):
        """Test basic health check endpoint."""
        response = client.get('/health')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'status' in data
        assert 'version' in data
        assert 'timestamp' in data
        assert data['version'] == '1.0.0'
    
    def test_health_check_with_none_opcua_client(self, app, client):
        """Test health check when opcua_client is None."""
        with app.app_context():
            # Set opcua_client to None to simulate initialization failure
            app.opcua_client = None
            
            response = client.get('/health')
            
            assert response.status_code == 200
            data = response.get_json()
            
            # Should not crash and should report degraded status
            assert data['status'] == 'degraded'
            assert 'services' in data
            assert 'opcua' in data['services']
            assert data['services']['opcua']['status'] == 'not_initialized'
    
    def test_health_check_with_working_opcua_client(self, app, client):
        """Test health check when opcua_client is working."""
        with app.app_context():
            # Mock a working OPC UA client
            mock_client = Mock()
            mock_client.get_status.return_value = {
                'available': True,
                'connected': True,
                'server_url': 'opc.tcp://localhost:4840'
            }
            app.opcua_client = mock_client
            
            response = client.get('/health')
            
            assert response.status_code == 200
            data = response.get_json()
            
            # Should include OPC UA status
            assert 'services' in data
            assert 'opcua' in data['services']
            assert data['services']['opcua']['available'] is True
            assert data['services']['opcua']['connected'] is True
    
    def test_health_check_with_exception_in_get_status(self, app, client):
        """Test health check when get_status() raises an exception."""
        with app.app_context():
            # Mock a client that raises an exception
            mock_client = Mock()
            mock_client.get_status.side_effect = Exception("Connection failed")
            app.opcua_client = mock_client
            
            response = client.get('/health')
            
            # Should not crash
            assert response.status_code == 200
            data = response.get_json()
            
            # Should report degraded status
            assert data['status'] == 'degraded'
            assert 'services' in data
            assert 'opcua' in data['services']
            assert data['services']['opcua']['status'] == 'error'
            assert 'Connection failed' in data['services']['opcua']['message']
    
    def test_health_check_all_services_none(self, app, client):
        """Test health check when all services are None."""
        with app.app_context():
            # Set all services to None
            app.mqtt_client = None
            app.websocket_service = None
            app.realtime_processor = None
            app.opcua_client = None
            app.protocol_simulator = None
            app.data_storage_service = None
            
            response = client.get('/health')
            
            # Should not crash
            assert response.status_code == 200
            data = response.get_json()
            
            # Should report degraded status
            assert data['status'] == 'degraded'
    
    def test_health_check_mixed_services(self, app, client):
        """Test health check with some working and some failing services."""
        with app.app_context():
            # Mock working OPC UA client
            working_client = Mock()
            working_client.get_status.return_value = {'available': True, 'connected': True}
            app.opcua_client = working_client
            
            # Mock failing MQTT client
            failing_client = Mock()
            failing_client.get_status.side_effect = Exception("MQTT connection error")
            app.mqtt_client = failing_client
            
            response = client.get('/health')
            
            assert response.status_code == 200
            data = response.get_json()
            
            # Should report degraded due to MQTT failure
            assert data['status'] == 'degraded'
            assert 'services' in data
            
            # OPC UA should be working
            assert 'opcua' in data['services']
            assert data['services']['opcua']['available'] is True
            
            # MQTT should show error
            assert 'mqtt' in data['services']
            assert data['services']['mqtt']['status'] == 'error'
    
    def test_health_check_timestamp_format(self, client):
        """Test that timestamp is in ISO format."""
        response = client.get('/health')
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Verify timestamp can be parsed
        assert 'timestamp' in data
        # Should not raise exception
        datetime.fromisoformat(data['timestamp'])
