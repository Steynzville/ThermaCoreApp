"""Service management system for robust service initialization and monitoring.

This module provides a centralized service management framework that:
- Classifies services as required or optional
- Handles graceful degradation for optional services
- Tracks service health status
- Enables configuration-driven service initialization
"""

import contextlib
import logging
import os
from enum import Enum
from typing import Any


class ServiceStatus(Enum):
    """Service status enumeration."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    ERROR = "error"
    NOT_INITIALIZED = "not_initialized"


class ServiceType(Enum):
    """Service type classification."""

    REQUIRED = "required"  # Core services that must be available
    OPTIONAL = "optional"  # Services that can fail without crashing the app


class ServiceManager:
    """Centralized service management for tracking and monitoring services."""

    def __init__(self):
        """Initialize the service manager."""
        self._services: dict[str, dict[str, Any]] = {}
        self._logger = logging.getLogger(__name__)

    def register_service(
        self,
        name: str,
        service_type: ServiceType,
        enabled: bool = True,
        required: bool | None = None,
    ):
        """Register a service with the manager.

        Args:
            name: Service name (e.g., 'opcua', 'mqtt')
            service_type: ServiceType.REQUIRED or ServiceType.OPTIONAL
            enabled: Whether the service is enabled (from config)
            required: Backwards compatibility - if provided, overrides service_type

        """
        # Handle backwards compatibility
        if required is not None:
            service_type = ServiceType.REQUIRED if required else ServiceType.OPTIONAL

        self._services[name] = {
            "type": service_type,
            "enabled": enabled,
            "status": ServiceStatus.NOT_INITIALIZED,
            "instance": None,
            "error": None,
        }
        self._logger.debug(
            f"Registered service '{name}' as {service_type.value}, enabled={enabled}",
        )

    def set_service_instance(self, name: str, instance: Any):
        """Set the service instance after successful initialization.

        Args:
            name: Service name
            instance: Initialized service instance

        """
        if name not in self._services:
            self._logger.warning(
                f"Attempted to set instance for unregistered service: {name}",
            )
            return

        self._services[name]["instance"] = instance
        self._services[name]["status"] = ServiceStatus.HEALTHY
        self._services[name]["error"] = None
        self._logger.info(f"Service '{name}' initialized successfully")

    def set_service_error(self, name: str, error: Exception):
        """Record a service initialization error.

        Args:
            name: Service name
            error: Exception that occurred during initialization

        """
        if name not in self._services:
            self._logger.warning(
                f"Attempted to set error for unregistered service: {name}",
            )
            return

        self._services[name]["status"] = ServiceStatus.ERROR
        self._services[name]["error"] = str(error)
        self._logger.error(f"Service '{name}' initialization failed: {error}")

    def is_service_enabled(self, name: str) -> bool:
        """Check if a service is enabled.

        Args:
            name: Service name

        Returns:
            True if service is enabled, False otherwise

        """
        return self._services.get(name, {}).get("enabled", False)

    def is_service_required(self, name: str) -> bool:
        """Check if a service is required.

        Args:
            name: Service name

        Returns:
            True if service is required (type=REQUIRED), False otherwise

        """
        service = self._services.get(name, {})
        return service.get("type") == ServiceType.REQUIRED

    def is_service_registered(self, name: str) -> bool:
        """Check if a service is registered with the manager.

        Args:
            name: Service name

        Returns:
            True if service is registered, False otherwise

        """
        return name in self._services

    def get_service_status(self, name: str) -> dict[str, Any]:
        """Get the current status of a service.

        Args:
            name: Service name

        Returns:
            Dictionary with service status information

        """
        if name not in self._services:
            return {
                "status": ServiceStatus.NOT_INITIALIZED.value,
                "available": False,
                "error": "Service not registered",
            }

        service = self._services[name]
        return {
            "status": service["status"].value,
            "type": service["type"].value,
            "enabled": service["enabled"],
            "available": service["instance"] is not None,
            "error": service["error"],
        }

    def get_all_services_status(self) -> dict[str, dict[str, Any]]:
        """Get status of all registered services.

        Returns:
            Dictionary mapping service names to their status

        """
        return {name: self.get_service_status(name) for name in self._services}

    def get_overall_health(self) -> str:
        """Determine overall system health based on service statuses.

        Returns:
            'healthy', 'degraded', or 'critical'

        """
        required_services_down = []
        optional_services_down = []

        for name, service in self._services.items():
            if not service["enabled"]:
                # Disabled services don't affect health
                continue

            if service["status"] not in [
                ServiceStatus.HEALTHY,
                ServiceStatus.NOT_INITIALIZED,
            ]:
                if service["type"] == ServiceType.REQUIRED:
                    required_services_down.append(name)
                else:
                    optional_services_down.append(name)

        if required_services_down:
            return "critical"
        if optional_services_down:
            return "degraded"
        return "healthy"

    def should_raise_error(self, name: str, is_production: bool) -> bool:
        """Determine if initialization failure should raise an error.

        Args:
            name: Service name
            is_production: Whether running in production

        Returns:
            True if error should be raised (stop app initialization)

        """
        if name not in self._services:
            # Unknown service - be conservative and raise
            return True

        service = self._services[name]

        # If service is disabled, never raise
        if not service["enabled"]:
            return False

        # Required services always raise in production
        if service["type"] == ServiceType.REQUIRED and is_production:
            return True

        # Optional services never raise
        return False


# Global service manager instance
service_manager = ServiceManager()


def should_skip_external_services() -> bool:
    """Check if external services should be skipped based on environment variable.

    Returns:
        True if SKIP_EXTERNAL_SERVICES environment variable is set to "true", False otherwise

    """
    skip_env = os.getenv("SKIP_EXTERNAL_SERVICES", "false").lower()
    return skip_env == "true"


def initialize_service(
    service: Any,
    service_name: str,
    app: Any,
    logger: logging.Logger,
    init_method: str = "init_app",
    *args,
    required: bool = True,
    **kwargs,
) -> bool:
    """Initialize a service with graceful error handling.

    This is a backwards-compatible wrapper around the service manager that
    provides the same interface as the original _initialize_critical_service.

    Args:
        service: Service instance to initialize
        service_name: Human-readable service name for logging
        app: Flask application instance
        logger: Logger instance
        init_method: Method name to call for initialization (default: 'init_app')
        required: Whether this service is required (True) or optional (False)
        *args, **kwargs: Additional arguments to pass to the init method

    Returns:
        True if initialization succeeded, False otherwise

    Raises:
        RuntimeError: If service is required and initialization fails in production

    """
    # Normalize service name for manager (lowercase, replace spaces with underscores)
    manager_name = service_name.lower().replace(" ", "_").replace("-", "_")

    # Check if service is registered with manager
    if not service_manager.is_service_registered(manager_name):
        # Auto-register if not already registered
        service_type = ServiceType.REQUIRED if required else ServiceType.OPTIONAL
        service_manager.register_service(manager_name, service_type, enabled=True)

    # Check if service is enabled
    if not service_manager.is_service_enabled(manager_name):
        logger.info(f"{service_name} is disabled, skipping initialization")
        return False

    try:
        # Call the initialization method
        init_func = getattr(service, init_method)
        init_func(app, *args, **kwargs)

        # Record success
        service_manager.set_service_instance(manager_name, service)
        logger.info(f"{service_name} initialized successfully")
        return True

    except (ValueError, RuntimeError, ConnectionError, OSError, ImportError) as e:
        # Re-raise these specific exceptions so they can be handled by the caller
        # (e.g., for specific error logging in _initialize_critical_service)
        service_manager.set_service_error(manager_name, e)
        raise

    except Exception as e:
        # Record error
        service_manager.set_service_error(manager_name, e)
        logger.exception(f"Failed to initialize {service_name}: {e}")

        # Determine if we should raise based on production status and service type
        from app.utils.environment import (  # noqa: PLC0415 - Avoid circular import
            is_production_environment,
            is_testing_environment,
        )

        is_testing = False
        is_production = False

        with contextlib.suppress(ValueError, AttributeError):
            is_testing = is_testing_environment(app)

        # Testing environment always raises
        if is_testing:
            raise RuntimeError(
                f"{service_name} initialization failed in testing: {e}",
            ) from e

        try:
            is_production = is_production_environment(app)
        except (ValueError, AttributeError):
            # Environment detection failed or app has no config - check if service is required
            # If required=False was explicitly passed, treat as development
            if not required:
                is_production = False
            else:
                # Be conservative for required services
                is_production = True

        # Use service manager to determine if we should raise
        if service_manager.should_raise_error(manager_name, is_production):
            raise RuntimeError(
                f"Critical service initialization failed: {service_name} - {e}",
            ) from e

        # For optional services or development, just log and continue
        logger.warning(
            f"Optional service '{service_name}' failed to initialize, continuing without it",
        )
        return False


def get_service_config(app: Any, service_name: str) -> dict[str, bool]:
    """Get service configuration from app config.

    Args:
        app: Flask application instance
        service_name: Service name (e.g., 'opcua', 'mqtt', 'opc_ua')

    Returns:
        Dictionary with 'enabled' and 'required' keys

    """
    # Normalize the service name by removing underscores for config key lookup
    # This handles both 'opcua' and 'opc_ua' -> 'OPCUA'
    service_upper = service_name.upper().replace("_", "")

    # Check for service-specific config
    enabled_key = f"SERVICE_{service_upper}_ENABLED"
    required_key = f"SERVICE_{service_upper}_REQUIRED"

    enabled = app.config.get(enabled_key, True)  # Default to enabled
    required = app.config.get(required_key, True)  # Default to required

    return {"enabled": enabled, "required": required}
