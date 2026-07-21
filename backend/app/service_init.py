"""Service initialization helpers for create_app refactoring."""

import logging
from typing import Any

from app.refactor_helpers import safe_service_init
from app.utils.environment import is_production_environment
from app.utils.service_manager import should_skip_external_services

try:
    from app.services.protocol_gateway_simulator import ProtocolGatewaySimulator
except Exception:  # pragma: no cover - optional service dependency
    ProtocolGatewaySimulator = None


def initialize_all_services(app: Any, logger: logging.Logger) -> None:
    """Initialize all SCADA services.

    Args:
        app: Flask application instance
        logger: Logger instance
    """
    if app.config.get("TESTING", False):
        return

    try:
        # Import services - inside function to avoid circular imports
        from app.services.anomaly_detection import anomaly_detection_service
        from app.services.data_storage_service import data_storage_service
        from app.services.dnp3_service import dnp3_service  # noqa: PLC0415
        from app.services.modbus_service import modbus_service  # noqa: PLC0415
        from app.services.mqtt_service import mqtt_client  # noqa: PLC0415
        from app.services.opcua_service import opcua_client  # noqa: PLC0415
        from app.services.realtime_processor import realtime_processor  # noqa: PLC0415
        from app.services.secure_opcua_client import secure_opcua_client
        from app.services.websocket_service import websocket_service  # noqa: PLC0415

        skip_external = should_skip_external_services()

        if skip_external:
            logger.info(
                "SKIP_EXTERNAL_SERVICES is set to 'true' - external services (MQTT, OPC-UA) will not be initialized",
            )

        # Initialize critical services
        _initialize_critical_services(
            app,
            logger,
            data_storage_service,
            mqtt_client,
            skip_external,
        )

        # Initialize OPC-UA clients
        _initialize_opcua_clients(
            app,
            logger,
            secure_opcua_client,
            opcua_client,
            data_storage_service,
            skip_external,
        )

        # Initialize non-critical services
        _initialize_optional_services(
            app,
            logger,
            dnp3_service,
            modbus_service,
            realtime_processor,
            websocket_service,
            anomaly_detection_service,
            data_storage_service,
        )

        # Initialize protocol simulator (not critical)
        try:
            protocol_simulator = ProtocolGatewaySimulator(
                mqtt_broker_host=app.config.get("MQTT_BROKER_HOST", "localhost"),
                mqtt_broker_port=app.config.get("MQTT_BROKER_PORT", 1883),
            )
            logger.info("Protocol simulator initialized successfully")
        except Exception:
            logger.exception("Protocol simulator initialization failed")
            protocol_simulator = None

        # Store references in app for easy access
        app.mqtt_client = None if skip_external else mqtt_client
        app.websocket_service = websocket_service
        app.realtime_processor = realtime_processor
        app.protocol_simulator = protocol_simulator
        app.data_storage_service = data_storage_service
        app.anomaly_detection_service = anomaly_detection_service
        app.modbus_service = modbus_service
        app.dnp3_service = dnp3_service

        logger.info("SCADA services initialization completed")

    except RuntimeError:
        # Re-raise runtime errors (security validation failures)
        raise
    except ImportError as e:
        logging.getLogger(__name__).warning(f"SCADA services not available: {e}")
    except Exception as e:
        logger.exception(
            f"Unexpected error during SCADA services initialization: {e}",
        )
        if is_production_environment(app):
            raise RuntimeError(
                f"Critical initialization error in production: {e}",
            ) from e


def _initialize_critical_services(
    app: Any,
    logger: logging.Logger,
    data_storage_service: Any,
    mqtt_client: Any,
    skip_external: bool,
) -> None:
    """Initialize critical services required for app to function.

    Args:
        app: Flask application instance
        logger: Logger instance
        data_storage_service: Data storage service instance
        mqtt_client: MQTT client instance
        skip_external: Whether to skip external services
    """
    # Data storage is always required
    safe_service_init(
        data_storage_service,
        "Data storage service",
        app,
        logger,
        "init_app",
        required=True,
    )

    # MQTT client - required by default, but can be configured as optional
    if skip_external:
        logger.info("Skipping MQTT client initialization (external services disabled)")
    else:
        mqtt_required = app.config.get("SERVICE_MQTT_REQUIRED")
        safe_service_init(
            mqtt_client,
            "MQTT client",
            app,
            logger,
            "init_app",
            required=mqtt_required,
        )


def _initialize_opcua_clients(
    app: Any,
    logger: logging.Logger,
    secure_opcua_client: Any,
    opcua_client: Any,
    data_storage_service: Any,
    skip_external: bool,
) -> None:
    """Initialize OPC-UA clients with fallback logic.

    Args:
        app: Flask application instance
        logger: Logger instance
        secure_opcua_client: Secure OPC-UA client instance
        opcua_client: Standard OPC-UA client instance
        data_storage_service: Data storage service instance
        skip_external: Whether to skip external services
    """
    if skip_external:
        logger.info(
            "Skipping OPC-UA client initialization (external services disabled)",
        )
        app.opcua_client = None
        app.secure_opcua_client = None
        return

    opcua_required = app.config.get("SERVICE_OPCUA_REQUIRED", False)

    # Try secure client first
    try:
        safe_service_init(
            secure_opcua_client,
            "Secure OPC UA client",
            app,
            logger,
            "init_app",
            required=opcua_required,
            data_storage_service=data_storage_service,
        )
        app.secure_opcua_client = secure_opcua_client
        app.opcua_client = secure_opcua_client
        logger.info("Using secure OPC-UA client with security wrapper")
    except Exception as secure_init_error:
        logger.warning(
            f"Secure OPC-UA client initialization failed, falling back to standard client: {secure_init_error}",
        )
        # Try standard client as fallback
        try:
            safe_service_init(
                opcua_client,
                "OPC UA client",
                app,
                logger,
                "init_app",
                required=opcua_required,
                data_storage_service=data_storage_service,
            )
            app.opcua_client = opcua_client
            logger.info("Using standard OPC-UA client (fallback)")
        except Exception as standard_init_error:
            logger.exception(
                f"Standard OPC-UA client initialization failed: {standard_init_error}",
            )
            app.opcua_client = None
            if not opcua_required:
                logger.info(
                    "OPC-UA client initialization failed but service is optional, continuing without it",
                )


def _initialize_optional_services(
    app: Any,
    logger: logging.Logger,
    dnp3_service: Any,
    modbus_service: Any,
    realtime_processor: Any,
    websocket_service: Any,
    anomaly_detection_service: Any,
    data_storage_service: Any,
) -> None:
    """Initialize non-critical optional services.

    Args:
        app: Flask application instance
        logger: Logger instance
        dnp3_service: DNP3 service instance
        modbus_service: Modbus service instance
        realtime_processor: Realtime processor instance
        websocket_service: WebSocket service instance
        anomaly_detection_service: Anomaly detection service instance
        data_storage_service: Data storage service instance
    """
    # DNP3 service - does not need data_storage_service
    safe_service_init(
        dnp3_service,
        "DNP3 service",
        app,
        logger,
        "init_app",
        required=False,
    )

    # Modbus service - does not need data_storage_service
    safe_service_init(
        modbus_service,
        "Modbus service",
        app,
        logger,
        "init_app",
        required=False,
    )

    # Realtime processor - does not need data_storage_service
    safe_service_init(
        realtime_processor,
        "Realtime processor",
        app,
        logger,
        "init_app",
        required=False,
    )

    # WebSocket service
    safe_service_init(
        websocket_service,
        "WebSocket service",
        app,
        logger,
        "init_app",
        required=False,
    )

    # Anomaly detection service - does not need data_storage_service
    safe_service_init(
        anomaly_detection_service,
        "Anomaly detection service",
        app,
        logger,
        "init_app",
        required=False,
    )
