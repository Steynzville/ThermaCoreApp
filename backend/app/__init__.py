"""Flask application factory and initialization."""

import logging
import os
from datetime import datetime

# Import Flask and core extensions
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

from app.exceptions import ConfigurationError

# Try to import optional extensions, but don't fail if they're not installed
try:
    from flask_cors import CORS

    cors_available = True
except ImportError:
    cors_available = False

try:
    from flask_jwt_extended import JWTManager

    jwt_available = True
except ImportError:
    jwt_available = False

try:
    from flask_migrate import Migrate

    migrate_available = True
except ImportError:
    migrate_available = False

try:
    from flasgger import Swagger

    swagger_available = True
except ImportError:
    swagger_available = False

# Initialize core extensions
db = SQLAlchemy()

# Initialize optional extensions
if migrate_available:
    migrate = Migrate()
else:
    migrate = None

if jwt_available:
    jwt = JWTManager()
else:
    jwt = None

if swagger_available:
    swagger = None  # Will be initialized in create_app
else:
    swagger = None


def _setup_middleware(app):
    """Set up middleware for the application.

    Args:
        app: Flask application instance
    """
    from app.middleware import validation
    from app.middleware.audit import setup_audit_middleware
    from app.middleware.metrics import setup_metrics_middleware
    from app.middleware.request_id import setup_request_id_middleware
    from app.middleware.tenant import setup_tenant_context
    from app.refactor_helpers import setup_logging_sanitization
    from app.utils.error_handler import SecurityAwareErrorHandler

    setup_request_id_middleware(app)
    setup_metrics_middleware(app)
    setup_audit_middleware(app)

    # Set up tenant context middleware for multi-tenancy
    @app.before_request
    def setup_tenant_for_request():
        setup_tenant_context()

    # Add sanitization filter to all logger handlers
    setup_logging_sanitization(app)

    # Register error handlers
    SecurityAwareErrorHandler.register_error_handlers(app)


def _initialize_critical_service(
    service,
    service_name: str,
    app,
    logger,
    init_method="init_app",
    *args,
    required=True,
    **kwargs,
):
    """Shared helper function for initializing services with consistent error handling.

    This function now supports both required and optional services through the
    service manager framework, enabling graceful degradation.

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
    from app.utils.service_manager import get_service_config, initialize_service

    # Get service configuration (enabled/required status)
    # Extract base service name (e.g., "OPC UA client" -> "opcua")
    service_base_name = (
        service_name.lower()
        .replace("secure ", "")
        .replace(" client", "")
        .replace(" service", "")
        .replace(" ", "_")
        .replace("-", "_")
    )
    service_config = get_service_config(app, service_base_name)

    # Override required flag if configured
    if not service_config["enabled"]:
        logger.info(
            f"{service_name} is disabled via configuration, skipping initialization",
        )
        return False

    # Use configured required status if available, otherwise use parameter
    required = service_config.get("required", required)

    try:
        # Use the new service manager for initialization
        return initialize_service(
            service,
            service_name,
            app,
            logger,
            init_method,
            *args,
            required=required,
            **kwargs,
        )

    except (ValueError, RuntimeError, ConnectionError, OSError, ImportError) as e:
        # Security validation errors, connection issues, or configuration errors
        if isinstance(e, ValueError):
            logger.exception(f"{service_name} configuration error")
        else:
            logger.exception(
                f"{service_name} security validation failed",
            )

        # For backwards compatibility, also use environment detection error handling
        from app.utils.environment import handle_environment_detection_error

        should_continue, error_to_raise = handle_environment_detection_error(
            service_name,
            logger,
            app,
            e,
            "security validation",
            is_security_validation=True,
        )

        if error_to_raise:
            raise error_to_raise from e
        return should_continue

    except Exception as e:
        logger.exception(f"Failed to initialize {service_name}")

        # For backwards compatibility, also use environment detection error handling
        from app.utils.environment import handle_environment_detection_error

        should_continue, error_to_raise = handle_environment_detection_error(
            service_name,
            logger,
            app,
            e,
            "initialization",
            is_security_validation=False,
        )

        if error_to_raise:
            raise error_to_raise from e
        return should_continue


def create_app(config_name=None):
    """Create Flask application using the application factory pattern."""
    from app.config_init import (
        configure_cors,
        determine_config_name,
        initialize_core_extensions,
        load_config_object,
    )
    from app.refactor_helpers import configure_debug_mode, setup_logging_level

    # Create Flask app with static folder for React build
    app = Flask(__name__, static_folder="../dist", static_url_path="")

    # Determine configuration name from environment
    config_name = determine_config_name(config_name)

    # Load and apply configuration
    config_obj = load_config_object(config_name)
    app.config.from_object(config_obj)

    if not app.config.get("SQLALCHEMY_DATABASE_URI") and not app.config.get(
        "SQLALCHEMY_BINDS",
    ):
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {}

    # Configure debug mode based on environment
    configure_debug_mode(app, config_name)

    # Set up logging levels
    setup_logging_level(app, app.logger)

    # Initialize core extensions (db, migrate, jwt)
    initialize_core_extensions(app)

    # ============================================
    # CONFIGURE CORS - Allow Netlify
    # ============================================
    CORS(
        app,
        origins=[
            "https://thermacoreapp.netlify.app",
            "https://*.netlify.app",
            "https://thermacoreapp.onrender.com",
            "http://localhost:3000",
            "http://localhost:5173",
        ],
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        expose_headers=["Content-Type", "Authorization"],
    )

    # Set up middleware
    _setup_middleware(app)

    # Health check endpoints - registered BEFORE all other routes
    from app.health_check_helpers import (
        create_detailed_health_check_endpoint,
        create_health_check_endpoint,
    )

    app.route("/health")(create_health_check_endpoint(app))
    app.route("/health/detailed")(create_detailed_health_check_endpoint(app))

    # Register middleware blueprints
    from app.middleware.metrics import create_metrics_blueprint

    app.register_blueprint(create_metrics_blueprint())

    # Initialize Swagger documentation
    from app.config_init import initialize_swagger

    initialize_swagger(app)

    # Import models to ensure they are registered
    from app.config_init import import_models

    import_models()

    # Run auto-migrations for database schema
    from app.config_init import run_auto_migrations

    run_auto_migrations(app)

    # Register all blueprints
    from app.blueprint_registration import register_all_blueprints

    logger = logging.getLogger(__name__)
    register_all_blueprints(app, logger)

    # Initialize SCADA services (Phase 2, 3 & 4)
    from app.service_init import initialize_all_services

    initialize_all_services(app, logger)

    # ============================================
    # Serve React static files (SPA support)
    # ============================================

    @app.route("/")
    def serve_index():
        """Serve the React index.html."""
        return send_from_directory(app.static_folder, "index.html")

    @app.route("/<path:path>")
    def serve_static(path):
        """Serve static files from the React build."""
        # Skip API routes - let them be handled by the blueprints
        if path.startswith(("api/", "auth/", "health")):
            return None

        # Check if the file exists in the dist folder
        file_path = os.path.join(app.static_folder, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(app.static_folder, path)

        # For all other paths, serve index.html (SPA routing)
        return send_from_directory(app.static_folder, "index.html")

    return app
