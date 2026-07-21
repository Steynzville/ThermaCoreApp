"""Integration tests for service manager with production scenarios."""

import importlib
import os
from unittest.mock import Mock, patch

import pytest

from app.utils.service_manager import (
    ServiceManager,
    ServiceType,
    initialize_service,
    service_manager,
)


class TestProductionScenarios:
    """Test production scenarios for service management."""

    def test_opcua_optional_in_production(self):
        """Test that OPC-UA is optional in production by default."""
        # Simulate production config
        mock_app = Mock()
        mock_app.config = {
            "SERVICE_OPCUA_ENABLED": True,
            "SERVICE_OPCUA_REQUIRED": False,  # Optional in production
            "TESTING": False,
        }
        mock_logger = Mock()

        # Create a failing service
        mock_service = Mock()
        mock_service.init_app = Mock(side_effect=Exception("Certificate error"))

        # Should not raise exception even though service fails
        with patch(
            "app.utils.environment.is_production_environment",
            return_value=True,
        ):
            result = initialize_service(
                mock_service,
                "OPC UA client",
                mock_app,
                mock_logger,
                "init_app",
                required=False,
            )

        # Service should fail gracefully
        assert result is False
        mock_logger.warning.assert_called()

    def test_mqtt_required_in_production(self):
        """Test that MQTT is required in production by default."""
        # Simulate production config
        mock_app = Mock()
        mock_app.config = {
            "SERVICE_MQTT_ENABLED": True,
            "SERVICE_MQTT_REQUIRED": True,  # Required in production
            "TESTING": False,
        }
        mock_logger = Mock()

        # Create a failing service
        mock_service = Mock()
        mock_service.init_app = Mock(side_effect=Exception("Connection refused"))

        # Should raise exception because MQTT is required
        with (
            patch(
                "app.utils.environment.is_production_environment",
                return_value=True,
            ),
            patch(
                "app.utils.environment.is_testing_environment",
                return_value=False,
            ),
            pytest.raises(
                RuntimeError,
                match="Critical service initialization failed",
            ),
        ):
            initialize_service(
                mock_service,
                "MQTT client",
                mock_app,
                mock_logger,
                "init_app",
                required=True,
            )

    def test_disabled_service_never_raises(self):
        """Test that disabled services never raise exceptions."""
        mock_app = Mock()
        mock_app.config = {
            "SERVICE_OPCUA_CLIENT_ENABLED": False,  # Disabled (need normalized name)
            "SERVICE_OPCUA_CLIENT_REQUIRED": True,
            "TESTING": False,
        }
        mock_logger = Mock()

        # Create service that would fail if initialized
        mock_service = Mock()
        mock_service.init_app = Mock(side_effect=Exception("Should not be called"))

        # Pre-register as disabled with the correct normalized name
        manager_name = "opc_ua_client"
        if manager_name in service_manager._services:
            del service_manager._services[manager_name]
        service_manager.register_service(
            manager_name,
            ServiceType.REQUIRED,
            enabled=False,
        )

        # Should not attempt initialization
        result = initialize_service(
            mock_service,
            "OPC UA client",
            mock_app,
            mock_logger,
            "init_app",
            required=True,
        )

        assert result is False
        # init_app should not be called because service is disabled
        mock_service.init_app.assert_not_called()

    def test_service_manager_tracks_service_states(self):
        """Test that service manager correctly tracks multiple service states."""
        manager = ServiceManager()

        # Register multiple services with different states
        manager.register_service("service_ok", ServiceType.REQUIRED, enabled=True)
        manager.register_service("service_fail", ServiceType.OPTIONAL, enabled=True)
        manager.register_service(
            "service_disabled",
            ServiceType.REQUIRED,
            enabled=False,
        )

        # Set different states
        manager.set_service_instance("service_ok", Mock())
        manager.set_service_error("service_fail", Exception("Failed"))
        # service_disabled remains not_initialized

        # Get all statuses
        all_status = manager.get_all_services_status()

        assert all_status["service_ok"]["status"] == "healthy"
        assert all_status["service_fail"]["status"] == "error"
        assert all_status["service_disabled"]["status"] == "not_initialized"

        # Overall health should be degraded (optional service failed)
        health = manager.get_overall_health()
        assert health == "degraded"

    def test_production_config_values(self):
        """Test that production config has correct defaults based on environment."""
        import config

        # Test case 1: True production (PRODUCTION=true)
        # Mock _is_true_production to return True for production scenario
        with patch.dict(
            os.environ,
            {
                "SECRET_KEY": "test-secret",
                "DATABASE_URL": "postgresql://test",
                "JWT_SECRET_KEY": "test-jwt",
                "MQTT_CA_CERTS": "/path/to/ca.crt",
                "MQTT_CERT_FILE": "/path/to/cert.crt",
                "MQTT_KEY_FILE": "/path/to/key.pem",
                "OPCUA_CERT_FILE": "/path/to/opcua.crt",
                "OPCUA_PRIVATE_KEY_FILE": "/path/to/opcua.key",
                "OPCUA_TRUST_CERT_FILE": "/path/to/trust.crt",
                "PRODUCTION": "true",
                "CI": "true",
            },
            clear=False,
        ):
            with patch.object(
                config.ProductionConfig,
                '_is_true_production',
                return_value=True
            ):
                importlib.reload(config)
                ProductionConfig = config.ProductionConfig
                config_obj = ProductionConfig()

                # In true production, OPC-UA is optional
                assert config_obj.SERVICE_OPCUA_ENABLED is True
                assert config_obj.SERVICE_OPCUA_REQUIRED is False
                # MQTT is always required in production
                assert config_obj.SERVICE_MQTT_ENABLED is True
                assert config_obj.SERVICE_MQTT_REQUIRED is True

        # Test case 2: Non-production (PRODUCTION=false)
        with patch.dict(
            os.environ,
            {
                "SECRET_KEY": "test-secret",
                "DATABASE_URL": "postgresql://test",
                "JWT_SECRET_KEY": "test-jwt",
                "MQTT_CA_CERTS": "/path/to/ca.crt",
                "MQTT_CERT_FILE": "/path/to/cert.crt",
                "MQTT_KEY_FILE": "/path/to/key.pem",
                "OPCUA_CERT_FILE": "/path/to/opcua.crt",
                "OPCUA_PRIVATE_KEY_FILE": "/path/to/opcua.key",
                "OPCUA_TRUST_CERT_FILE": "/path/to/trust.crt",
                "PRODUCTION": "false",
                "CI": "true",
            },
            clear=False,
        ):
            with patch.object(
                config.ProductionConfig,
                '_is_true_production',
                return_value=False
            ):
                importlib.reload(config)
                ProductionConfig = config.ProductionConfig
                config_obj = ProductionConfig()

                # In non-production, OPC-UA is required (for testing)
                assert config_obj.SERVICE_OPCUA_ENABLED is True
                assert config_obj.SERVICE_OPCUA_REQUIRED is True
                # MQTT is still required
                assert config_obj.SERVICE_MQTT_ENABLED is True
                assert config_obj.SERVICE_MQTT_REQUIRED is True


class TestServiceManagerHealthReporting:
    """Test service manager health reporting."""

    def test_health_reporting_with_mixed_services(self):
        """Test health reporting with various service states."""
        manager = ServiceManager()

        # Setup services
        manager.register_service("db", ServiceType.REQUIRED, enabled=True)
        manager.register_service("mqtt", ServiceType.REQUIRED, enabled=True)
        manager.register_service("opcua", ServiceType.OPTIONAL, enabled=True)
        manager.register_service("modbus", ServiceType.OPTIONAL, enabled=False)

        # DB and MQTT working
        manager.set_service_instance("db", Mock())
        manager.set_service_instance("mqtt", Mock())

        # OPC-UA failed
        manager.set_service_error("opcua", Exception("Connection timeout"))

        # Get health
        health = manager.get_overall_health()
        assert health == "degraded"  # Optional service failed

        # Get detailed status
        all_status = manager.get_all_services_status()
        assert all_status["db"]["status"] == "healthy"
        assert all_status["mqtt"]["status"] == "healthy"
        assert all_status["opcua"]["status"] == "error"
        assert all_status["modbus"]["status"] == "not_initialized"

    def test_health_critical_when_required_service_fails(self):
        """Test that health is critical when required service fails."""
        manager = ServiceManager()

        manager.register_service("critical_service", ServiceType.REQUIRED, enabled=True)
        manager.set_service_error("critical_service", Exception("Fatal error"))

        health = manager.get_overall_health()
        assert health == "critical"

    def test_health_healthy_when_optional_disabled(self):
        """Test that health is healthy when only disabled optional services exist."""
        manager = ServiceManager()

        manager.register_service("required_ok", ServiceType.REQUIRED, enabled=True)
        manager.register_service(
            "optional_disabled",
            ServiceType.OPTIONAL,
            enabled=False,
        )

        manager.set_service_instance("required_ok", Mock())
        manager.set_service_error("optional_disabled", Exception("Doesn't matter"))

        health = manager.get_overall_health()
        assert health == "healthy"  # Disabled services don't affect health


class TestBackwardsCompatibility:
    """Test backwards compatibility with existing code."""

    def test_old_initialize_pattern_still_works(self):
        """Test that old service initialization pattern still works."""
        from app.utils.service_manager import initialize_service

        mock_service = Mock()
        mock_service.init_app = Mock()
        mock_app = Mock()
        mock_app.config = {"TESTING": False}
        mock_logger = Mock()

        # Old pattern: just pass required=True/False
        result = initialize_service(
            mock_service,
            "legacy service",
            mock_app,
            mock_logger,
            "init_app",
            required=True,
        )

        assert result is True
        mock_service.init_app.assert_called_once()
