"""Configuration initialization helpers for create_app refactoring."""

import logging
import os
from typing import Any

from config import config


def determine_config_name(config_name: str | None = None) -> str:
    """Determine configuration name from environment.

    Args:
        config_name: Explicit configuration name if provided

    Returns:
        Configuration name to use
    """
    # Check for TESTING environment first - this takes priority over everything
    if os.environ.get("TESTING", "false").lower() in ("true", "1"):
        return "testing"

    if config_name is None:
        # Use FLASK_ENV, APP_ENV, or default to production
        config_name = os.environ.get(
            "FLASK_ENV",
            os.environ.get("APP_ENV", "production"),
        )

        # Only use development if explicitly running in development AND FLASK_DEBUG is true/'1'
        if config_name == "development":
            flask_debug = os.environ.get("FLASK_DEBUG", "false").lower()
            if flask_debug not in ("true", "1"):
                config_name = "production"

    return config_name


def load_config_object(config_name: str) -> Any:
    """Load and instantiate configuration object.

    Args:
        config_name: Configuration name

    Returns:
        Configuration object instance
    """
    # Special handling for ProductionConfig - instantiate it to trigger validation
    config_obj = config[config_name]
    if config_name == "production":
        # Instantiate ProductionConfig to run __init__ validation
        config_obj = config_obj()

    return config_obj


def initialize_core_extensions(app: Any) -> None:
    """Initialize core Flask extensions.

    Args:
        app: Flask application instance
    """
    from app import (  # noqa: PLC0415 - Avoid circular import with app/__init__.py
        db,
        jwt,
        migrate,
    )

    db.init_app(app)

    # Initialize optional extensions
    if migrate:
        migrate.init_app(app, db)

    if jwt:
        jwt.init_app(app)


def configure_cors(app: Any) -> None:
    """Configure CORS if available.

    Args:
        app: Flask application instance
    """
    try:
        from flask_cors import CORS  # noqa: PLC0415 - Optional dependency

        CORS(
            app,
            origins=app.config["CORS_ORIGINS"],
            supports_credentials=True,
            allow_headers=["Content-Type", "Authorization"],
            methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        )
    except ImportError:
        pass


def initialize_swagger(app: Any) -> None:
    """Initialize Swagger documentation if available and not in testing.

    Args:
        app: Flask application instance
    """
    try:
        from flasgger import Swagger  # noqa: PLC0415 - Optional dependency

        if app.config.get("TESTING", False):
            return

        swagger_template = {
            "swagger": "2.0",
            "info": {
                "title": "ThermaCore SCADA API",
                "description": "API for ThermaCore SCADA system integration and monitoring - Auto-generated from code docstrings",
                "version": "1.0.0",
                "contact": {
                    "name": "ThermaCore API Team",
                    "email": "api@thermacore.com",
                },
            },
            "basePath": app.config.get("API_PREFIX", "/api/v1"),
            "schemes": ["http", "https"],
            "securityDefinitions": {
                "JWT": {
                    "type": "apiKey",
                    "name": "Authorization",
                    "in": "header",
                    "description": "JWT Authorization header using the Bearer scheme. Example: 'Authorization: Bearer {token}'",
                },
            },
        }
        try:
            Swagger(app, template=swagger_template)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.exception(f"Swagger initialization failed: {e}")
    except ImportError:
        pass


def import_models() -> None:
    """Import models to ensure they are registered.

    This is intentional to ensure SQLAlchemy models are loaded.
    """
    try:
        from app.models import (  # noqa: PLC0415, F401 - Intentional lazy loading for SQLAlchemy
            Permission,
            Role,
            Sensor,
            SensorReading,
            Unit,
            User,
        )
    except ImportError:
        pass  # Models may not be importable without full dependencies


def run_auto_migrations(app: Any) -> None:
    """Run database auto-migrations if not in testing mode.

    Args:
        app: Flask application instance
    """
    if app.config.get("TESTING", False):
        return

    try:
        from app.utils.auto_migration import (
            run_auto_migrations as run_migrations,
        )

        migration_logger = logging.getLogger(__name__)
        migration_logger.info("Running auto-migrations for database schema...")
        run_migrations(app)
    except Exception as e:
        migration_logger = logging.getLogger(__name__)
        migration_logger.exception(f"Auto-migration failed (non-critical): {e}")
