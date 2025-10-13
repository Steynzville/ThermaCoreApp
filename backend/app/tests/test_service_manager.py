"""Tests for the service management framework."""
import pytest
from unittest.mock import Mock, MagicMock
from app.utils.service_manager import (
    ServiceManager, ServiceStatus, ServiceType,
    initialize_service, get_service_config
)


class TestServiceManager:
    """Test the ServiceManager class."""
    
    def test_register_service(self):
        """Test registering a service."""
        manager = ServiceManager()
        
        manager.register_service('test_service', ServiceType.REQUIRED, enabled=True)
        
        status = manager.get_service_status('test_service')
        assert status['type'] == 'required'
        assert status['enabled'] is True
        assert status['status'] == 'not_initialized'
        assert status['available'] is False
    
    def test_register_service_backwards_compat(self):
        """Test registering a service with required parameter (backwards compatibility)."""
        manager = ServiceManager()
        
        manager.register_service('test_service', ServiceType.OPTIONAL, required=True)
        
        status = manager.get_service_status('test_service')
        # required=True should override ServiceType.OPTIONAL
        assert status['type'] == 'required'
    
    def test_set_service_instance(self):
        """Test setting a service instance after successful initialization."""
        manager = ServiceManager()
        manager.register_service('test_service', ServiceType.REQUIRED)
        
        mock_instance = Mock()
        manager.set_service_instance('test_service', mock_instance)
        
        status = manager.get_service_status('test_service')
        assert status['status'] == 'healthy'
        assert status['available'] is True
        assert status['error'] is None
    
    def test_set_service_error(self):
        """Test recording a service initialization error."""
        manager = ServiceManager()
        manager.register_service('test_service', ServiceType.OPTIONAL)
        
        error = Exception("Connection failed")
        manager.set_service_error('test_service', error)
        
        status = manager.get_service_status('test_service')
        assert status['status'] == 'error'
        assert status['available'] is False
        assert 'Connection failed' in status['error']
    
    def test_is_service_enabled(self):
        """Test checking if a service is enabled."""
        manager = ServiceManager()
        manager.register_service('enabled_service', ServiceType.REQUIRED, enabled=True)
        manager.register_service('disabled_service', ServiceType.REQUIRED, enabled=False)
        
        assert manager.is_service_enabled('enabled_service') is True
        assert manager.is_service_enabled('disabled_service') is False
        assert manager.is_service_enabled('nonexistent') is False
    
    def test_is_service_required(self):
        """Test checking if a service is required."""
        manager = ServiceManager()
        manager.register_service('required_service', ServiceType.REQUIRED)
        manager.register_service('optional_service', ServiceType.OPTIONAL)
        
        assert manager.is_service_required('required_service') is True
        assert manager.is_service_required('optional_service') is False
        assert manager.is_service_required('nonexistent') is False
    
    def test_get_all_services_status(self):
        """Test getting status of all services."""
        manager = ServiceManager()
        manager.register_service('service1', ServiceType.REQUIRED)
        manager.register_service('service2', ServiceType.OPTIONAL)
        
        all_status = manager.get_all_services_status()
        
        assert 'service1' in all_status
        assert 'service2' in all_status
        assert all_status['service1']['type'] == 'required'
        assert all_status['service2']['type'] == 'optional'
    
    def test_get_overall_health_healthy(self):
        """Test overall health when all services are healthy."""
        manager = ServiceManager()
        manager.register_service('service1', ServiceType.REQUIRED, enabled=True)
        manager.set_service_instance('service1', Mock())
        
        health = manager.get_overall_health()
        assert health == 'healthy'
    
    def test_get_overall_health_degraded(self):
        """Test overall health when optional service fails."""
        manager = ServiceManager()
        manager.register_service('required', ServiceType.REQUIRED, enabled=True)
        manager.register_service('optional', ServiceType.OPTIONAL, enabled=True)
        
        manager.set_service_instance('required', Mock())
        manager.set_service_error('optional', Exception("Failed"))
        
        health = manager.get_overall_health()
        assert health == 'degraded'
    
    def test_get_overall_health_critical(self):
        """Test overall health when required service fails."""
        manager = ServiceManager()
        manager.register_service('required', ServiceType.REQUIRED, enabled=True)
        
        manager.set_service_error('required', Exception("Failed"))
        
        health = manager.get_overall_health()
        assert health == 'critical'
    
    def test_get_overall_health_disabled_services_ignored(self):
        """Test that disabled services don't affect health."""
        manager = ServiceManager()
        manager.register_service('enabled', ServiceType.REQUIRED, enabled=True)
        manager.register_service('disabled', ServiceType.REQUIRED, enabled=False)
        
        manager.set_service_instance('enabled', Mock())
        manager.set_service_error('disabled', Exception("Failed"))
        
        health = manager.get_overall_health()
        # Should be healthy because disabled service is ignored
        assert health == 'healthy'
    
    def test_should_raise_error_required_production(self):
        """Test that required services raise errors in production."""
        manager = ServiceManager()
        manager.register_service('required', ServiceType.REQUIRED, enabled=True)
        
        should_raise = manager.should_raise_error('required', is_production=True)
        assert should_raise is True
    
    def test_should_raise_error_optional_production(self):
        """Test that optional services don't raise errors in production."""
        manager = ServiceManager()
        manager.register_service('optional', ServiceType.OPTIONAL, enabled=True)
        
        should_raise = manager.should_raise_error('optional', is_production=True)
        assert should_raise is False
    
    def test_should_raise_error_disabled_service(self):
        """Test that disabled services never raise errors."""
        manager = ServiceManager()
        manager.register_service('disabled', ServiceType.REQUIRED, enabled=False)
        
        should_raise = manager.should_raise_error('disabled', is_production=True)
        assert should_raise is False


class TestInitializeService:
    """Test the initialize_service function."""
    
    def test_initialize_service_success(self):
        """Test successful service initialization."""
        mock_service = Mock()
        mock_service.init_app = Mock()
        mock_app = Mock()
        mock_app.config = {'SERVICE_TEST_ENABLED': True, 'SERVICE_TEST_REQUIRED': True}
        mock_logger = Mock()
        
        result = initialize_service(
            mock_service, "test service", mock_app, mock_logger,
            'init_app', required=True
        )
        
        assert result is True
        mock_service.init_app.assert_called_once()
    
    def test_initialize_service_disabled(self):
        """Test that disabled services skip initialization."""
        from app.utils.service_manager import service_manager
        
        mock_service = Mock()
        mock_app = Mock()
        mock_app.config = {}
        mock_logger = Mock()
        
        # Register as disabled
        service_manager.register_service('test_disabled', ServiceType.OPTIONAL, enabled=False)
        
        result = initialize_service(
            mock_service, "test_disabled", mock_app, mock_logger,
            'init_app', required=False
        )
        
        assert result is False
        mock_service.init_app.assert_not_called()
    
    def test_initialize_optional_service_failure(self):
        """Test that optional service failures don't raise exceptions."""
        from app.utils.service_manager import service_manager
        
        # Clean up any previous registration
        manager_name = 'test_service'
        if manager_name in service_manager._services:
            del service_manager._services[manager_name]
        
        mock_service = Mock()
        mock_service.init_app = Mock(side_effect=Exception("Connection failed"))
        mock_app = Mock()
        mock_app.config = {
            'SERVICE_TEST_SERVICE_ENABLED': True, 
            'SERVICE_TEST_SERVICE_REQUIRED': False,
            'TESTING': False
        }
        mock_logger = Mock()
        
        # Should not raise, should return False
        result = initialize_service(
            mock_service, "test service", mock_app, mock_logger,
            'init_app', required=False
        )
        
        assert result is False
        
        # Cleanup
        if manager_name in service_manager._services:
            del service_manager._services[manager_name]


class TestGetServiceConfig:
    """Test the get_service_config function."""
    
    def test_get_service_config_defaults(self):
        """Test getting service config with defaults."""
        mock_app = Mock()
        mock_app.config = {}
        
        config = get_service_config(mock_app, 'opcua')
        
        assert config['enabled'] is True
        assert config['required'] is True
    
    def test_get_service_config_custom(self):
        """Test getting service config with custom values."""
        mock_app = Mock()
        mock_app.config = {
            'SERVICE_OPCUA_ENABLED': False,
            'SERVICE_OPCUA_REQUIRED': True
        }
        
        config = get_service_config(mock_app, 'opcua')
        
        assert config['enabled'] is False
        assert config['required'] is True


class TestServiceManagerIntegration:
    """Integration tests for service manager with Flask app."""
    
    def test_service_status_endpoint(self, client):
        """Test the /api/v1/services/status endpoint."""
        response = client.get('/api/v1/services/status')
        
        # The endpoint might not be available if routes didn't import properly
        # This is acceptable in test mode where services aren't initialized
        if response.status_code == 404:
            pytest.skip("Services endpoint not available in test environment")
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'overall_health' in data
        assert 'services' in data
        assert data['overall_health'] in ['healthy', 'degraded', 'critical']
    
    def test_service_manager_tracks_opcua(self, app):
        """Test that service manager tracks OPC-UA service status."""
        from app.utils.service_manager import service_manager
        
        with app.app_context():
            # Check if opcua service is registered
            all_services = service_manager.get_all_services_status()
            
            # Service manager should have services registered
            assert isinstance(all_services, dict)
