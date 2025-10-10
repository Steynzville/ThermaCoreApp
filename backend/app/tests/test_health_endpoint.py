"""Test suite for the health check endpoint.

This module tests the /health endpoint to ensure it returns the correct
status information and properly reports SCADA service status when available.
"""
import pytest
from unittest.mock import Mock, patch


class TestHealthEndpoint:
    """Test cases for the /health endpoint."""
    
    def test_health_endpoint_exists(self, client):
        """Test that the health endpoint exists and is accessible."""
        response = client.get('/health')
        assert response.status_code == 200
    
    def test_health_endpoint_returns_json(self, client):
        """Test that the health endpoint returns JSON data."""
        response = client.get('/health')
        assert response.is_json
        data = response.get_json()
        assert isinstance(data, dict)
    
    def test_health_endpoint_required_fields(self, client):
        """Test that the health endpoint returns required fields."""
        response = client.get('/health')
        data = response.get_json()
        
        # Check required fields
        assert 'status' in data
        assert 'version' in data
        
        # Verify values
        assert data['status'] == 'healthy'
        assert isinstance(data['version'], str)
        assert len(data['version']) > 0
    
    def test_health_endpoint_no_authentication_required(self, client):
        """Test that the health endpoint doesn't require authentication."""
        # Make request without any authentication headers
        response = client.get('/health')
        
        # Should succeed without authentication
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'
    
    def test_health_endpoint_with_scada_services(self, app, client):
        """Test health endpoint includes SCADA service status when available."""
        with app.app_context():
            # Mock SCADA services
            mock_mqtt = Mock()
            mock_mqtt.get_status.return_value = {'connected': True}
            app.mqtt_client = mock_mqtt
            
            mock_websocket = Mock()
            mock_websocket.get_status.return_value = {'active_connections': 5}
            app.websocket_service = mock_websocket
            
            # Make request
            response = client.get('/health')
            data = response.get_json()
            
            # Check base fields
            assert data['status'] == 'healthy'
            assert data['version'] == '1.0.0'
            
            # Check SCADA service status
            assert 'mqtt' in data
            assert data['mqtt']['connected'] is True
            
            assert 'websocket' in data
            assert data['websocket']['active_connections'] == 5
    
    def test_health_endpoint_without_scada_services(self, app, client):
        """Test health endpoint works without SCADA services."""
        with app.app_context():
            # Ensure no SCADA services are attached
            if hasattr(app, 'mqtt_client'):
                delattr(app, 'mqtt_client')
            if hasattr(app, 'websocket_service'):
                delattr(app, 'websocket_service')
            
            # Make request
            response = client.get('/health')
            data = response.get_json()
            
            # Should still return base health info
            assert response.status_code == 200
            assert data['status'] == 'healthy'
            assert data['version'] == '1.0.0'
            
            # Should not include SCADA service fields
            assert 'mqtt' not in data
            assert 'websocket' not in data
    
    def test_health_endpoint_returns_consistent_structure(self, client):
        """Test that multiple calls return the same structure."""
        # Make multiple requests
        responses = [client.get('/health') for _ in range(3)]
        
        # All should succeed
        assert all(r.status_code == 200 for r in responses)
        
        # All should have the same keys
        data_list = [r.get_json() for r in responses]
        keys_list = [set(d.keys()) for d in data_list]
        assert all(keys == keys_list[0] for keys in keys_list)
    
    def test_health_endpoint_accepts_only_get_method(self, client):
        """Test that the health endpoint only accepts GET requests."""
        # GET should work
        response = client.get('/health')
        assert response.status_code == 200
        
        # POST should fail with 405 or 500 (depending on error handling)
        response = client.post('/health')
        assert response.status_code in [405, 500]  # Method Not Allowed or Internal Server Error
        
        # PUT should fail
        response = client.put('/health')
        assert response.status_code in [405, 500]
        
        # DELETE should fail
        response = client.delete('/health')
        assert response.status_code in [405, 500]
    
    def test_health_endpoint_not_in_audit_logs(self, app, client):
        """Test that health endpoint is excluded from audit logging."""
        with app.app_context():
            with patch('app.middleware.audit.AuditLogger.log_event') as mock_audit:
                # Make request to health endpoint
                response = client.get('/health')
                assert response.status_code == 200
                
                # Verify audit logging was NOT called for health endpoint
                # (health endpoint is in EXCLUDED_PATHS)
                mock_audit.assert_not_called()
    
    def test_health_endpoint_version_format(self, client):
        """Test that version follows semantic versioning format."""
        response = client.get('/health')
        data = response.get_json()
        
        version = data['version']
        # Should be in format X.Y.Z
        parts = version.split('.')
        assert len(parts) == 3
        assert all(part.isdigit() for part in parts)
    
    def test_health_endpoint_with_all_phase_services(self, app, client):
        """Test health endpoint with all Phase 3 & 4 services."""
        with app.app_context():
            # Mock Phase 3 & 4 services
            mock_anomaly = Mock()
            mock_anomaly.get_status.return_value = {'enabled': True}
            app.anomaly_detection_service = mock_anomaly
            
            mock_modbus = Mock()
            mock_modbus.get_device_status.return_value = {'devices': 2}
            app.modbus_service = mock_modbus
            
            mock_dnp3 = Mock()
            mock_dnp3.get_device_status.return_value = {'devices': 1}
            app.dnp3_service = mock_dnp3
            
            # Make request
            response = client.get('/health')
            data = response.get_json()
            
            # Check Phase 3 & 4 service status
            assert 'anomaly_detection' in data
            assert data['anomaly_detection']['enabled'] is True
            
            assert 'modbus' in data
            assert data['modbus']['devices'] == 2
            
            assert 'dnp3' in data
            assert data['dnp3']['devices'] == 1


class TestHealthEndpointIntegration:
    """Integration tests for health endpoint."""
    
    def test_health_endpoint_in_running_app(self, client):
        """Test that health endpoint works in a full application context."""
        # This tests the endpoint with all app initialization
        response = client.get('/health')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'
        assert 'version' in data
    
    def test_health_endpoint_response_time(self, client):
        """Test that health endpoint responds quickly."""
        import time
        
        start = time.time()
        response = client.get('/health')
        elapsed = time.time() - start
        
        # Health check should be fast (under 1 second)
        assert elapsed < 1.0
        assert response.status_code == 200
    
    def test_multiple_concurrent_health_checks(self, client):
        """Test that multiple concurrent health checks don't cause issues."""
        from concurrent.futures import ThreadPoolExecutor
        
        def make_request():
            return client.get('/health')
        
        # Make 10 concurrent requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [f.result() for f in futures]
        
        # All should succeed
        assert all(r.status_code == 200 for r in responses)
        assert all(r.get_json()['status'] == 'healthy' for r in responses)
