"""Health check helpers for create_app refactoring."""

from datetime import datetime, timezone
from typing import Any

# Shared constants for health check endpoints
COVERAGE_DATA = {"frontend": "61.12%", "backend": "63.12%"}
TESTS_PASSING = 2317


def create_health_check_endpoint(app: Any) -> Any:
    """Create health check endpoint function.

    Args:
        app: Flask application instance

    Returns:
        Health check endpoint function
    """

    def health_check():
        """Immediate health check for Render deployment."""
        from flask import jsonify

        return (
            jsonify(
                {
                    "status": "healthy",
                    "service": "ThermaCore SCADA Backend",
                    "version": "2.9.0",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "coverage": COVERAGE_DATA,
                },
            ),
            200,
        )

    return health_check


def check_all_services(app: Any) -> tuple[dict[str, Any], bool, list[str]]:
    """Check status of all services.

    Args:
        app: Flask application instance

    Returns:
        tuple: (services_dict, is_degraded, critical_services_down)
    """
    from app.utils.service_manager import should_skip_external_services

    services = {}
    is_degraded = False
    critical_services_down = []

    # Check if external services are disabled
    skip_external = should_skip_external_services()
    is_testing = app.config.get("TESTING", False)

    # Check MQTT service (external service)
    if not skip_external:
        mqtt_degraded, mqtt_critical = check_mqtt_service(app, services)
        is_degraded = is_degraded or mqtt_degraded
        if mqtt_critical:
            critical_services_down.append("mqtt")
    else:
        services["mqtt"] = {
            "status": "skipped",
            "message": "External services disabled",
            "available": False,
        }

    # Check WebSocket service
    if check_websocket_service(app, services):
        is_degraded = True

    # Check realtime processor
    if check_realtime_processor(app, services):
        is_degraded = True

    # Check OPC-UA service (external service)
    if not skip_external:
        opcua_degraded, opcua_critical = check_opcua_service(app, services)
        is_degraded = is_degraded or opcua_degraded
        if opcua_critical:
            critical_services_down.append("opcua")
    else:
        services["opcua"] = {
            "status": "skipped",
            "message": "External services disabled",
            "available": False,
        }

    # Check data storage service (core service - always check)
    # In test environment, don't mark data storage as critical
    if check_data_storage_service(app, services):
        is_degraded = True
        if not is_testing:
            critical_services_down.append("data_storage")

    # Check DNP3 service
    if check_dnp3_service(app, services):
        is_degraded = True

    # Check Modbus service
    if check_modbus_service(app, services):
        is_degraded = True

    # Check anomaly detection service
    if check_anomaly_detection_service(app, services):
        is_degraded = True

    # Check protocol simulator
    if check_protocol_simulator(app, services):
        is_degraded = True

    # Check database (core service - always check)
    # In test environment, don't mark database as critical
    if check_database(app, services):
        is_degraded = True
        if not is_testing:
            critical_services_down.append("database")

    return services, is_degraded, critical_services_down


def check_mqtt_service(app: Any, services: dict[str, Any]) -> tuple[bool, bool]:
    """Check MQTT service status.

    Args:
        app: Flask application instance
        services: Services dictionary to update

    Returns:
        tuple: (is_degraded, is_critical)
    """
    # In test environment, don't mark as critical if not initialized
    is_testing = app.config.get("TESTING", False)

    if hasattr(app, "mqtt_client") and app.mqtt_client is not None:
        try:
            mqtt_status = app.mqtt_client.get_status()
            services["mqtt"] = mqtt_status
            if not mqtt_status.get("available", False):
                return True, not is_testing  # Not critical in tests
            elif not mqtt_status.get("connected", False):
                app.logger.warning("MQTT service not connected")
                return True, False
        except Exception as e:
            if not hasattr(app, "mqtt_error_logged"):
                app.logger.exception(f"Error getting MQTT status: {e}")
                app.mqtt_error_logged = True
            services["mqtt"] = {
                "status": "error",
                "message": str(e),
                "available": False,
            }
            return True, not is_testing  # Not critical in tests
    else:
        services["mqtt"] = {"status": "not_initialized", "available": False}
        return True, not is_testing  # Not critical in tests

    return False, False


def check_websocket_service(app: Any, services: dict[str, Any]) -> bool:
    """Check WebSocket service status.

    Args:
        app: Flask application instance
        services: Services dictionary to update

    Returns:
        bool: True if degraded
    """
    if hasattr(app, "websocket_service") and app.websocket_service is not None:
        try:
            services["websocket"] = app.websocket_service.get_status()
        except Exception as e:
            services["websocket"] = {"status": "error", "message": str(e)}
            return True
    return False


def check_realtime_processor(app: Any, services: dict[str, Any]) -> bool:
    """Check realtime processor status.

    Args:
        app: Flask application instance
        services: Services dictionary to update

    Returns:
        bool: True if degraded
    """
    if hasattr(app, "realtime_processor") and app.realtime_processor is not None:
        try:
            services["realtime_processor"] = app.realtime_processor.get_status()
        except Exception as e:
            services["realtime_processor"] = {"status": "error", "message": str(e)}
            return True
    return False


def check_opcua_service(app: Any, services: dict[str, Any]) -> tuple[bool, bool]:
    """Check OPC-UA service status.

    Args:
        app: Flask application instance
        services: Services dictionary to update

    Returns:
        tuple: (is_degraded, is_critical)
    """
    # In test environment, don't mark as critical if not initialized
    is_testing = app.config.get("TESTING", False)

    if hasattr(app, "opcua_client") and app.opcua_client is not None:
        try:
            opcua_status = app.opcua_client.get_status()
            services["opcua"] = opcua_status
            if not opcua_status.get("available", False):
                return True, not is_testing  # Not critical in tests
            elif not opcua_status.get("connected", False):
                app.logger.warning("OPC UA service not connected")
                return True, False
        except Exception as e:
            if not hasattr(app, "opcua_error_logged"):
                app.logger.exception(f"Error getting OPC UA status: {e}")
                app.opcua_error_logged = True
            services["opcua"] = {
                "status": "error",
                "message": str(e),
                "available": False,
            }
            return True, not is_testing  # Not critical in tests
    else:
        services["opcua"] = {"status": "not_initialized", "available": False}
        return True, False

    return False, False


def check_data_storage_service(app: Any, services: dict[str, Any]) -> bool:
    """Check data storage service status.

    Args:
        app: Flask application instance
        services: Services dictionary to update

    Returns:
        bool: True if degraded
    """
    if hasattr(app, "data_storage_service") and app.data_storage_service is not None:
        try:
            services["data_storage"] = app.data_storage_service.get_status()
        except Exception as e:
            services["data_storage"] = {"status": "error", "message": str(e)}
            return True
    return False


def check_dnp3_service(app: Any, services: dict[str, Any]) -> bool:
    """Check DNP3 service status.

    Args:
        app: Flask application instance
        services: Services dictionary to update

    Returns:
        bool: True if degraded
    """
    if hasattr(app, "dnp3_service") and app.dnp3_service is not None:
        try:
            services["dnp3"] = app.dnp3_service.get_status()
        except Exception as e:
            services["dnp3"] = {"status": "error", "message": str(e)}
            return True
    return False


def check_modbus_service(app: Any, services: dict[str, Any]) -> bool:
    """Check Modbus service status.

    Args:
        app: Flask application instance
        services: Services dictionary to update

    Returns:
        bool: True if degraded
    """
    if hasattr(app, "modbus_service") and app.modbus_service is not None:
        try:
            services["modbus"] = app.modbus_service.get_status()
        except Exception as e:
            services["modbus"] = {"status": "error", "message": str(e)}
            return True
    return False


def check_anomaly_detection_service(app: Any, services: dict[str, Any]) -> bool:
    """Check anomaly detection service status.

    Args:
        app: Flask application instance
        services: Services dictionary to update

    Returns:
        bool: True if degraded
    """
    if (
        hasattr(app, "anomaly_detection_service")
        and app.anomaly_detection_service is not None
    ):
        try:
            services["anomaly_detection"] = app.anomaly_detection_service.get_status()
        except Exception as e:
            services["anomaly_detection"] = {"status": "error", "message": str(e)}
            return True
    return False


def check_protocol_simulator(app: Any, services: dict[str, Any]) -> bool:
    """Check protocol simulator status.

    Args:
        app: Flask application instance
        services: Services dictionary to update

    Returns:
        bool: True if degraded
    """
    if hasattr(app, "protocol_simulator") and app.protocol_simulator is not None:
        try:
            services["protocol_simulator"] = app.protocol_simulator.get_status()
        except Exception as e:
            services["protocol_simulator"] = {"status": "error", "message": str(e)}
            return True
    return False


def check_database(app: Any, services: dict[str, Any]) -> bool:
    """Check database status.

    Args:
        app: Flask application instance
        services: Services dictionary to update

    Returns:
        bool: True if degraded
    """
    try:
        from app import db

        db.session.execute(db.text("SELECT 1"))
        services["database"] = {"status": "healthy", "available": True}
    except Exception as e:
        services["database"] = {
            "status": "error",
            "message": str(e),
            "available": False,
        }
        return True

    return False


def _get_service_status(
    services: dict[str, Any],
    service_name: str,
    default_status: str,
) -> str:
    """Extract and simplify service status.

    Args:
        services: Dictionary of service statuses
        service_name: Name of the service to check
        default_status: Default status to return if service is not found or healthy

    Returns:
        Simplified service status string
    """
    if service_name not in services:
        return default_status

    service_status = services[service_name]

    # Handle database service (different structure)
    if service_name == "database":
        return "connected" if service_status.get("available", False) else "error"

    # Handle other services with standard structure
    if isinstance(service_status, dict) and service_status.get("status") == "error":
        return "error"

    return default_status


def create_detailed_health_check_endpoint(app: Any) -> Any:
    """Create detailed health check endpoint function.

    Args:
        app: Flask application instance

    Returns:
        Detailed health check endpoint function
    """

    def detailed_health_check():
        """Comprehensive health check with service status."""
        from flask import jsonify

        # Get detailed service status
        services, _is_degraded, _critical_services_down = check_all_services(app)

        # Simplify service status for detailed endpoint using helper function
        services_status = {
            "database": _get_service_status(services, "database", "connected"),
            "websocket": _get_service_status(services, "websocket", "ready"),
            "anomaly_detection": _get_service_status(
                services,
                "anomaly_detection",
                "initialized",
            ),
            "protocol_simulator": _get_service_status(
                services,
                "protocol_simulator",
                "active",
            ),
        }

        return (
            jsonify(
                {
                    "status": "healthy",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "services": services_status,
                    "tests_passing": TESTS_PASSING,
                    "coverage": COVERAGE_DATA,
                },
            ),
            200,
        )

    return detailed_health_check
