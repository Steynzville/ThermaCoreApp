"""Flask application configuration."""

import os
from datetime import timedelta
from typing import ClassVar

from dotenv import load_dotenv
from sqlalchemy.pool import StaticPool

# Load environment variables from .env file
load_dotenv()


class Config:
    """Base configuration class."""

    # Flask Configuration
    SECRET_KEY = os.environ.get("SECRET_KEY")

    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS: ClassVar[dict[str, int | bool]] = {
        "pool_size": 20,
        "pool_recycle": -1,
        "pool_pre_ping": True,
    }

    # ============================================================
    # EMAIL CONFIGURATION
    # ============================================================
    EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 587))
    EMAIL_USER = os.environ.get("EMAIL_USER")
    EMAIL_PASSWORD = os.environ.get("EMAIL_PASSWORD")
    EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True").lower() == "true"
    EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "False").lower() == "true"
    EMAIL_FROM = os.environ.get("EMAIL_FROM")
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://thermacoreapp.netlify.app")
    SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        hours=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", "1")),
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # API Configuration
    API_VERSION = os.environ.get("API_VERSION", "v1")
    API_PREFIX = os.environ.get("API_PREFIX", "/api/v1")

    # CORS Configuration - will be re-read in ProductionConfig for production validation
    CORS_ORIGINS = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,https://thermacoreapp.netlify.app",
    ).split(",")

    # Pagination
    DEFAULT_PAGE_SIZE = 50
    MAX_PAGE_SIZE = 100

    # Rate Limiting - PR2 Implementation
    REDIS_URL = os.environ.get("REDIS_URL")  # Optional Redis for rate limiting
    RATE_LIMIT_ENABLED = os.environ.get("RATE_LIMIT_ENABLED", "true").lower() == "true"
    DEFAULT_RATE_LIMIT = int(
        os.environ.get("DEFAULT_RATE_LIMIT", "100"),
    )  # requests per minute
    AUTH_RATE_LIMIT = int(
        os.environ.get("AUTH_RATE_LIMIT", "10"),
    )  # auth requests per minute

    # Request validation - PR2 Implementation
    MAX_REQUEST_SIZE = int(
        os.environ.get("MAX_REQUEST_SIZE", str(1024 * 1024)),
    )  # 1MB default
    VALIDATE_JSON_REQUESTS = (
        os.environ.get("VALIDATE_JSON_REQUESTS", "true").lower() == "true"
    )

    # Logging Configuration
    LOG_LEVEL = os.environ.get(
        "LOG_LEVEL",
        "INFO",
    )  # Default to INFO for production-like behavior

    @staticmethod
    def _read_mqtt_config():
        """Read MQTT configuration from environment variables.

        Helper method to centralize MQTT configuration reading and avoid duplication.
        Used by both class-level initialization and ProductionConfig.__init__().

        Returns:
            dict: Dictionary containing MQTT configuration values

        """
        return {
            "MQTT_BROKER_HOST": os.environ.get("MQTT_BROKER_HOST", "localhost"),
            "MQTT_BROKER_PORT": int(os.environ.get("MQTT_BROKER_PORT", "1883")),
            "MQTT_USERNAME": os.environ.get("MQTT_USERNAME"),
            "MQTT_PASSWORD": os.environ.get("MQTT_PASSWORD"),
        }

    # MQTT Configuration with security enforcement
    MQTT_BROKER_HOST = os.environ.get("MQTT_BROKER_HOST", "localhost")
    MQTT_BROKER_PORT = int(os.environ.get("MQTT_BROKER_PORT", "1883"))
    MQTT_USERNAME = os.environ.get("MQTT_USERNAME")
    MQTT_PASSWORD = os.environ.get("MQTT_PASSWORD")
    MQTT_CLIENT_ID = os.environ.get("MQTT_CLIENT_ID", "thermacore_backend")
    MQTT_KEEPALIVE = int(os.environ.get("MQTT_KEEPALIVE", "60"))
    MQTT_USE_TLS = os.environ.get("MQTT_USE_TLS", "false").lower() == "true"
    MQTT_CA_CERTS = os.environ.get("MQTT_CA_CERTS")  # Path to CA certificate file
    MQTT_CERT_FILE = os.environ.get("MQTT_CERT_FILE")  # Path to client certificate file
    MQTT_KEY_FILE = os.environ.get("MQTT_KEY_FILE")  # Path to client private key file
    MQTT_SCADA_TOPICS: ClassVar[list[str]] = [
        "scada/+/temperature",
        "scada/+/pressure",
        "scada/+/flow_rate",
        "scada/+/power",
        "scada/+/status",
    ]

    # WebSocket Configuration with restricted CORS for production
    # Default to localhost for development, but restrict in production
    _default_websocket_origins = "http://localhost:3000,http://localhost:5173"
    WEBSOCKET_CORS_ORIGINS = os.environ.get(
        "WEBSOCKET_CORS_ORIGINS",
        _default_websocket_origins,
    ).split(",")
    WEBSOCKET_PING_TIMEOUT = int(os.environ.get("WEBSOCKET_PING_TIMEOUT", "60"))
    WEBSOCKET_PING_INTERVAL = int(os.environ.get("WEBSOCKET_PING_INTERVAL", "25"))

    # OPC UA Configuration with enhanced security
    OPCUA_SERVER_URL = os.environ.get("OPCUA_SERVER_URL", "opc.tcp://localhost:4840")
    OPCUA_USERNAME = os.environ.get("OPCUA_USERNAME")
    OPCUA_PASSWORD = os.environ.get("OPCUA_PASSWORD")
    OPCUA_SECURITY_POLICY = os.environ.get("OPCUA_SECURITY_POLICY", "Basic256Sha256")
    OPCUA_SECURITY_MODE = os.environ.get("OPCUA_SECURITY_MODE", "SignAndEncrypt")
    OPCUA_TIMEOUT = int(os.environ.get("OPCUA_TIMEOUT", "30"))
    OPCUA_CERT_FILE = os.environ.get("OPCUA_CERT_FILE")  # Path to client certificate
    OPCUA_PRIVATE_KEY_FILE = os.environ.get(
        "OPCUA_PRIVATE_KEY_FILE",
    )  # Path to private key
    OPCUA_TRUST_CERT_FILE = os.environ.get(
        "OPCUA_TRUST_CERT_FILE",
    )  # Path to server certificate to trust

    # Security policy fallback behavior (only affects development environment)
    OPCUA_ALLOW_INSECURE_FALLBACK = (
        os.environ.get("OPCUA_ALLOW_INSECURE_FALLBACK", "false").lower() == "true"
    )

    # Service Management Configuration
    # Control which services are enabled and required
    # Format: SERVICE_{SERVICE_NAME}_ENABLED and SERVICE_{SERVICE_NAME}_REQUIRED

    # OPC-UA Service Configuration
    SERVICE_OPCUA_ENABLED = (
        os.environ.get("SERVICE_OPCUA_ENABLED", "true").lower() == "true"
    )
    SERVICE_OPCUA_REQUIRED = (
        os.environ.get("SERVICE_OPCUA_REQUIRED", "true").lower() == "true"
    )

    # MQTT Service Configuration
    SERVICE_MQTT_ENABLED = (
        os.environ.get("SERVICE_MQTT_ENABLED", "true").lower() == "true"
    )
    SERVICE_MQTT_REQUIRED = (
        os.environ.get("SERVICE_MQTT_REQUIRED", "true").lower() == "true"
    )

    # Modbus Configuration
    # Control whether sensitive Modbus data (register addresses, values) should be logged
    # Disabled by default for security; enable for debugging purposes only
    MODBUS_LOG_SENSITIVE_DATA = (
        os.environ.get("MODBUS_LOG_SENSITIVE_DATA", "false").lower() == "true"
    )


class DevelopmentConfig(Config):
    """Development configuration."""

    DEBUG = True
    TESTING = False
    LOG_LEVEL = "DEBUG"  # More verbose logging for development

    def __init__(self):
        """Initialize development configuration."""
        super().__init__()
        # Validate that critical environment variables are set for development
        if os.environ.get("SECRET_KEY") is None:
            import warnings  # noqa: PLC0415 - Conditional import

            warnings.warn(
                "SECRET_KEY not set in environment, using default (not secure for production)",
                stacklevel=2,
            )
        if os.environ.get("DATABASE_URL") is None:
            import warnings  # noqa: PLC0415 - Conditional import

            warnings.warn(
                "DATABASE_URL not set in environment, using default SQLite database",
                stacklevel=2,
            )
        if os.environ.get("JWT_SECRET_KEY") is None:
            import warnings  # noqa: PLC0415 - Conditional import

            warnings.warn(
                "JWT_SECRET_KEY not set in environment, using default (not secure for production)",
                stacklevel=2,
            )


class ProductionConfig(Config):
    """Production configuration."""

    DEBUG = False
    TESTING = False
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")  # INFO or WARNING for production

    def __init__(self):
        """Initialize production configuration with environment variable validation."""
        # Call parent init
        super().__init__()

        # Validate critical environment variables are set for production
        self.SECRET_KEY = os.environ.get("SECRET_KEY")
        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY must be set in environment variables")

        self.JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
        if not self.JWT_SECRET_KEY:
            raise ValueError("JWT_SECRET_KEY must be set in environment variables")

        self.SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
        if not self.SQLALCHEMY_DATABASE_URI:
            raise ValueError("DATABASE_URL must be set in environment variables")

        # --------------------------------------------------------------
        # Basic production hygiene — always enforced for ProductionConfig,
        # regardless of whether this is a "true" production deployment.
        # --------------------------------------------------------------

        # Enforce MQTT TLS certificates
        if (
            os.environ.get("MQTT_CA_CERTS")
            and os.environ.get("MQTT_CERT_FILE")
            and os.environ.get("MQTT_KEY_FILE")
        ):
            self.MQTT_USE_TLS = True
        else:
            raise ValueError(
                "MQTT certificate paths must be set in environment variables for production",
            )

        # Re-read MQTT configuration from environment
        mqtt_config = self._read_mqtt_config()
        self.MQTT_BROKER_HOST = mqtt_config["MQTT_BROKER_HOST"]
        self.MQTT_BROKER_PORT = mqtt_config["MQTT_BROKER_PORT"]
        self.MQTT_USERNAME = mqtt_config["MQTT_USERNAME"]
        self.MQTT_PASSWORD = mqtt_config["MQTT_PASSWORD"]

        # OPC UA security defaults
        if (
            not os.environ.get("OPCUA_SECURITY_POLICY")
            or os.environ.get("OPCUA_SECURITY_POLICY") == "None"
        ):
            self.OPCUA_SECURITY_POLICY = "Basic256Sha256"
        else:
            self.OPCUA_SECURITY_POLICY = os.environ.get("OPCUA_SECURITY_POLICY")

        if (
            not os.environ.get("OPCUA_SECURITY_MODE")
            or os.environ.get("OPCUA_SECURITY_MODE") == "None"
        ):
            self.OPCUA_SECURITY_MODE = "SignAndEncrypt"
        else:
            self.OPCUA_SECURITY_MODE = os.environ.get("OPCUA_SECURITY_MODE")

        # Ensure certificate paths are correctly set if security is enabled
        if self.OPCUA_SECURITY_POLICY != "None" and self.OPCUA_SECURITY_MODE != "None":
            if not (
                os.environ.get("OPCUA_CERT_FILE")
                and os.environ.get("OPCUA_PRIVATE_KEY_FILE")
                and os.environ.get("OPCUA_TRUST_CERT_FILE")
            ):
                raise ValueError(
                    "OPC UA certificate paths must be set in environment variables when security is enabled",
                )

        # WebSocket CORS origins — secure default, or from env
        _prod_websocket_origins = os.environ.get("WEBSOCKET_CORS_ORIGINS")
        if not _prod_websocket_origins:
            self.WEBSOCKET_CORS_ORIGINS = [
                "https://thermacoreapp.com",
                "https://app.thermacoreapp.com",
                "https://monitoring.thermacoreapp.com",
            ]
        else:
            self.WEBSOCKET_CORS_ORIGINS = [
                origin.strip()
                for origin in _prod_websocket_origins.split(",")
                if origin.strip()
            ]

        # MQTT remains required in production
        self.SERVICE_MQTT_ENABLED = (
            os.environ.get("SERVICE_MQTT_ENABLED", "true").lower() == "true"
        )
        self.SERVICE_MQTT_REQUIRED = (
            os.environ.get("SERVICE_MQTT_REQUIRED", "true").lower() == "true"
        )

        # --------------------------------------------------------------
        # Service management flags that behave differently in true production
        # --------------------------------------------------------------
        if self._is_true_production():
            # In production, OPC-UA is optional by default (can be overridden)
            self.SERVICE_OPCUA_ENABLED = (
                os.environ.get("SERVICE_OPCUA_ENABLED", "true").lower() == "true"
            )
            self.SERVICE_OPCUA_REQUIRED = (
                os.environ.get("SERVICE_OPCUA_REQUIRED", "false").lower() == "true"
            )
        else:
            # In non-production, keep the base Config defaults
            # (SERVICE_OPCUA_REQUIRED remains True for testing environments)
            pass

        # --------------------------------------------------------------
        # Stricter content validation (no wildcards, HTTPS-only) — only
        # enforced in true production deployments, so config can still
        # be exercised in CI without fully production-shaped values.
        # --------------------------------------------------------------
        if self._is_true_production():
            # Validate WebSocket CORS origins - no wildcards, HTTPS only
            if "*" in self.WEBSOCKET_CORS_ORIGINS:
                raise ValueError(
                    "Wildcard CORS origins ('*') are not allowed in production",
                )
            for origin in self.WEBSOCKET_CORS_ORIGINS:
                if not origin.startswith("https://"):
                    raise ValueError(
                        f"Production CORS origins must use HTTPS. Invalid origin: {origin}",
                    )

            # Re-read and validate regular CORS origins from environment
            cors_origins_env = os.environ.get("CORS_ORIGINS")
            if cors_origins_env:
                cors_origins = [
                    origin.strip()
                    for origin in cors_origins_env.split(",")
                    if origin.strip()
                ]
            else:
                cors_origins = [
                    "https://thermacoreapp.com",
                    "https://app.thermacoreapp.com",
                ]

            # Validate no wildcard in production
            if "*" in cors_origins:
                raise ValueError(
                    "Wildcard CORS origins ('*') are not allowed in production",
                )

            # Validate all origins use HTTPS in production
            for origin in cors_origins:
                if not origin.startswith("https://"):
                    raise ValueError(
                        f"Production CORS origins must use HTTPS. Invalid origin: {origin}",
                    )

            self.CORS_ORIGINS = cors_origins

    def _is_true_production(self):
        """Detect if this is ACTUAL production deployment.
        (not just testing production configuration)

        Returns False in CI/test environments to allow configuration testing.
        Returns True only in real production deployments.
        """
        # In CI or tests, allow more permissive config for testing
        if os.environ.get("CI") or os.environ.get("PYTEST_CURRENT_TEST"):
            return False

        # In testing mode, allow configuration testing
        if self.TESTING:
            return False

        # Only true production if environment indicators agree
        flask_env = os.environ.get("FLASK_ENV")
        app_env = os.environ.get("APP_ENV")

        # Require explicit production environment settings
        return flask_env == "production" and app_env == "production"


class TestingConfig(Config):
    """Testing configuration."""

    DEBUG = True
    TESTING = True
    LOG_LEVEL = "DEBUG"  # Enable DEBUG logging for tests to capture all log messages

    # Override with safe defaults for testing
    SECRET_KEY = "test-secret-key-not-for-production"
    JWT_SECRET_KEY = "test-jwt-secret-not-for-production"

    # Use PostgreSQL for testing to match production, with SQLite fallback
    # This can be overridden with POSTGRES_TEST_URL environment variable
    _postgres_test_url = os.environ.get(
        "POSTGRES_TEST_URL",
        "postgresql://postgres:password@localhost:5432/thermacore_test_db",
    )
    _use_postgres_tests = (
        os.environ.get("USE_POSTGRES_TESTS", "false").lower() == "true"
    )

    # For SQLite in-memory, use StaticPool so all sessions share the same connection
    # This is critical for SAVEPOINT-based test isolation to work across session boundaries
    if _use_postgres_tests:
        SQLALCHEMY_DATABASE_URI = _postgres_test_url
        SQLALCHEMY_ENGINE_OPTIONS = {
            "pool_size": 5,
            "pool_pre_ping": True,
        }
    else:
        SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
        # StaticPool ensures all sessions share the same connection
        # check_same_thread=False is required for SQLite multi-threading
        SQLALCHEMY_ENGINE_OPTIONS = {
            "poolclass": StaticPool,  # Use actual class, not string
            "connect_args": {"check_same_thread": False},
        }

    # Disable rate limiting in tests
    RATE_LIMIT_ENABLED = False

    # Disable TLS enforcement in tests
    MQTT_USE_TLS = False
    OPCUA_SECURITY_POLICY = "None"
    OPCUA_SECURITY_MODE = "None"

    # Permissive CORS for tests
    CORS_ORIGINS: ClassVar[list[str]] = ["*"]
    WEBSOCKET_CORS_ORIGINS: ClassVar[list[str]] = ["*"]

    # Disable validation for tests
    VALIDATE_JSON_REQUESTS = True  # Keep enabled but with test-friendly behavior


# Configuration dictionary
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,  # All values are config classes; instantiation happens in create_app as needed
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
