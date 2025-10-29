"""Helper functions for refactoring complex functions.

This module provides utilities to help break down overly complex functions
into smaller, more manageable pieces. It addresses C901 complexity violations
by extracting common patterns into reusable components.
"""

import logging
from typing import Any


def safe_service_init(
    service: Any,
    service_name: str,
    app: Any,
    logger: logging.Logger,
    init_method: str = "init_app",
    required: bool = False,
    **kwargs: Any,
) -> bool:
    """Initialize a service with comprehensive error handling.

    Args:
        service: The service instance to initialize
        service_name: Human-readable name for logging
        app: Flask application instance
        logger: Logger instance for reporting
        init_method: Name of the initialization method (default: "init_app")
        required: Whether failure should raise an exception
        **kwargs: Additional arguments to pass to the init method

    Returns:
        bool: True if initialization succeeded, False otherwise

    Raises:
        RuntimeError: If initialization fails and service is required
    """
    try:
        init_fn = getattr(service, init_method)
        init_fn(app, **kwargs)
        logger.info(f"{service_name} initialized successfully")
        return True
    except Exception as e:
        logger.exception(
            f"Failed to initialize {service_name}: {e}",
        )
        if required:
            raise RuntimeError(
                f"Required service {service_name} failed to initialize: {e}",
            ) from e
        return False


def safe_blueprint_register(
    app: Any,
    module_path: str,
    blueprint_name: str,
    route_name: str,
    logger: logging.Logger,
    url_prefix: str | None = None,
) -> tuple[bool, bool]:
    """Register a Flask blueprint with error handling.

    Args:
        app: Flask application instance
        module_path: Import path for the module (e.g., 'app.routes.auth')
        blueprint_name: Name of the blueprint variable (e.g., 'auth_bp')
        route_name: Display name for logging (e.g., 'auth')
        logger: Logger instance for reporting
        url_prefix: Optional URL prefix override

    Returns:
        tuple: (success: bool, is_import_error: bool)
    """
    try:
        # Dynamic import of the blueprint
        module = __import__(module_path, fromlist=[blueprint_name])
        blueprint = getattr(module, blueprint_name)

        # Register with URL prefix
        prefix = (
            url_prefix
            if url_prefix is not None
            else app.config.get("API_PREFIX", "/api/v1")
        )
        app.register_blueprint(blueprint, url_prefix=prefix)
        logger.info(f"Registered {route_name} routes")
        return True, False
    except ImportError as e:
        logger.exception(f"Failed to import {route_name} routes: {e}")
        return False, True
    except Exception as e:
        logger.exception(f"Failed to register {route_name} routes: {e}")
        return False, False


def setup_logging_sanitization(app: Any) -> None:
    """Set up log sanitization filters across all handlers.

    Args:
        app: Flask application instance
    """
    from app.utils.logging_filter import SanitizingFilter

    root_logger = logging.getLogger()

    # Add filter to existing handlers at app initialization
    for handler in root_logger.handlers:
        # Check for duplicates to prevent redundant processing on re-initialization
        if not any(isinstance(f, SanitizingFilter) for f in handler.filters):
            handler.addFilter(SanitizingFilter())

    # Also add to app.logger handlers in case they're not in root logger
    for handler in app.logger.handlers:
        if not any(isinstance(f, SanitizingFilter) for f in handler.filters):
            handler.addFilter(SanitizingFilter())


def configure_debug_mode(app: Any, config_name: str) -> None:
    """Configure Flask debug mode based on environment.

    Args:
        app: Flask application instance
        config_name: Configuration name (production/development/testing)
    """
    # SECURITY: Explicitly enforce debug mode based solely on config_name
    # This overrides any environment variables such as FLASK_DEBUG.
    # Production will never have debug enabled, regardless of environment variables.
    if config_name == "production":
        app.debug = False
    elif config_name in ("development", "testing"):
        # Development and testing configs should have debug enabled
        app.debug = True


def setup_logging_level(app: Any, logger: logging.Logger) -> None:
    """Configure logging levels from app configuration.

    Args:
        app: Flask application instance
        logger: Logger instance to configure
    """
    log_level_str = app.config.get("LOG_LEVEL", "INFO")
    log_level = getattr(logging, log_level_str.upper(), logging.INFO)
    logging.basicConfig(level=log_level, force=True)
    logger.setLevel(log_level)
    # Also set root logger level to ensure it propagates
    logging.getLogger().setLevel(log_level)
