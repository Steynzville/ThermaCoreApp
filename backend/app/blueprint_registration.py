"""Blueprint registration helpers for create_app refactoring."""

import logging
from typing import Any

from app.refactor_helpers import safe_blueprint_register
from app.routes.opcua_monitoring import init_opcua_monitoring
from app.utils.environment import is_production_environment


def register_all_blueprints(app: Any, logger: logging.Logger) -> tuple[int, int]:
    """Register all application blueprints.

    Args:
        app: Flask application instance
        logger: Logger instance for reporting

    Returns:
        tuple: (blueprints_registered, blueprints_failed)
    """
    logger.info("Starting blueprint registration...")

    blueprints_registered = 0
    blueprints_failed = 0

    # Define all blueprints to register
    blueprints = [
        ("app.routes.auth", "auth_bp", "auth"),
        ("app.routes.units", "units_bp", "units"),
        ("app.routes.users", "users_bp", "users"),
        ("app.routes.tenants", "tenants_bp", "tenants"),
        ("app.routes.scada", "scada_bp", "scada"),
        ("app.routes.analytics", "analytics_bp", "analytics"),
        ("app.routes.historical", "historical_bp", "historical"),
        ("app.routes.multiprotocol", "multiprotocol_bp", "multiprotocol"),
        ("app.routes.remote_control", "remote_control_bp", "remote_control"),
        ("app.routes.services", "services_bp", "services"),
        ("app.routes.health", "health_bp", "health"),
    ]

    # Register each blueprint
    for module_path, blueprint_name, route_name in blueprints:
        success, _ = safe_blueprint_register(
            app,
            module_path,
            blueprint_name,
            route_name,
            logger,
        )
        if success:
            blueprints_registered += 1
        else:
            blueprints_failed += 1

    # Register OPC-UA monitoring (special case - uses init function)
    if _register_opcua_monitoring(app, logger):
        blueprints_registered += 1
    else:
        blueprints_failed += 1

    # Log summary
    logger.info(
        f"Blueprint registration complete: {blueprints_registered} registered, {blueprints_failed} failed",
    )

    # Verify registration
    _verify_blueprint_registration(app, logger, blueprints_registered)

    return blueprints_registered, blueprints_failed


def _register_opcua_monitoring(app: Any, logger: logging.Logger) -> bool:
    """Register OPC-UA monitoring endpoints.

    Args:
        app: Flask application instance
        logger: Logger instance

    Returns:
        bool: True if successful
    """
    try:
        init_opcua_monitoring(app)
        logger.info("Initialized OPC-UA monitoring endpoints")
        return True
    except ImportError as e:
        logger.exception(f"Failed to import opcua_monitoring routes: {e}")
        return False
    except Exception as e:
        logger.exception(f"Failed to initialize opcua_monitoring routes: {e}")
        return False


def _verify_blueprint_registration(
    app: Any,
    logger: logging.Logger,
    blueprints_registered: int,
) -> None:
    """Verify that blueprints were registered successfully.

    Args:
        app: Flask application instance
        logger: Logger instance
        blueprints_registered: Number of successfully registered blueprints
    """
    if blueprints_registered > 0:
        route_count = len(list(app.url_map.iter_rules()))
        logger.info(f"Total routes registered: {route_count}")
        logger.debug(
            "Registered blueprints: %s",
            ", ".join(app.blueprints.keys()),
        )
    else:
        logger.error(
            "CRITICAL: No blueprints were registered! All API endpoints will return 404.",
        )
        # In production, this should be a critical error
        if is_production_environment(app):
            raise RuntimeError(
                "Failed to register any blueprints in production environment",
            )
