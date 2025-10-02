"""Flask application configuration."""
import os
from datetime import timedelta

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Base configuration class."""
    
    # Flask Configuration
    SECRET_KEY = os.environ.get("SECRET_KEY")
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY must be set in environment variables")
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("DATABASE_URL must be set in environment variables")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,
        'pool_recycle': -1,
        'pool_pre_ping': True
    }
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY must be set in environment variables")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 1)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # API Configuration
    API_VERSION = os.environ.get('API_VERSION', 'v1')
    API_PREFIX = os.environ.get('API_PREFIX', '/api/v1')
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
    
    # Pagination
    DEFAULT_PAGE_SIZE = 50
    MAX_PAGE_SIZE = 100
    
    # Rate Limiting - PR2 Implementation
    REDIS_URL = os.environ.get('REDIS_URL')  # Optional Redis for rate limiting
    RATE_LIMIT_ENABLED = os.environ.get('RATE_LIMIT_ENABLED', 'true').lower() == 'true'
    DEFAULT_RATE_LIMIT = int(os.environ.get('DEFAULT_RATE_LIMIT', 100))  # requests per minute
    AUTH_RATE_LIMIT = int(os.environ.get('AUTH_RATE_LIMIT', 10))  # auth requests per minute
    
    # Request validation - PR2 Implementation
    MAX_REQUEST_SIZE = int(os.environ.get('MAX_REQUEST_SIZE', 1024 * 1024))  # 1MB default
    VALIDATE_JSON_REQUESTS = os.environ.get('VALIDATE_JSON_REQUESTS', 'true').lower() == 'true'
    
    # MQTT Configuration with security enforcement
    MQTT_BROKER_HOST = os.environ.get('MQTT_BROKER_HOST', 'localhost')
    MQTT_BROKER_PORT = int(os.environ.get('MQTT_BROKER_PORT', 1883))
    MQTT_USERNAME = os.environ.get('MQTT_USERNAME')
    MQTT_PASSWORD = os.environ.get('MQTT_PASSWORD')
    MQTT_CLIENT_ID = os.environ.get('MQTT_CLIENT_ID', 'thermacore_backend')
    MQTT_KEEPALIVE = int(os.environ.get('MQTT_KEEPALIVE', 60))
    MQTT_USE_TLS = os.environ.get('MQTT_USE_TLS', 'false').lower() == 'true'
    MQTT_CA_CERTS = os.environ.get('MQTT_CA_CERTS')  # Path to CA certificate file
    MQTT_CERT_FILE = os.environ.get('MQTT_CERT_FILE')  # Path to client certificate file
    MQTT_KEY_FILE = os.environ.get('MQTT_KEY_FILE')   # Path to client private key file
    MQTT_SCADA_TOPICS = [
        'scada/+/temperature',
        'scada/+/pressure', 
        'scada/+/flow_rate',
        'scada/+/power',
        'scada/+/status'
    ]
    
    # WebSocket Configuration with restricted CORS for production
    # Default to localhost for development, but restrict in production
    _default_websocket_origins = 'http://localhost:3000,http://localhost:5173'
    WEBSOCKET_CORS_ORIGINS = os.environ.get('WEBSOCKET_CORS_ORIGINS', _default_websocket_origins).split(',')
    WEBSOCKET_PING_TIMEOUT = int(os.environ.get('WEBSOCKET_PING_TIMEOUT', 60))
    WEBSOCKET_PING_INTERVAL = int(os.environ.get('WEBSOCKET_PING_INTERVAL', 25))
    
    # OPC UA Configuration with enhanced security
    OPCUA_SERVER_URL = os.environ.get('OPCUA_SERVER_URL', 'opc.tcp://localhost:4840')
    OPCUA_USERNAME = os.environ.get('OPCUA_USERNAME')
    OPCUA_PASSWORD = os.environ.get('OPCUA_PASSWORD')  
    OPCUA_SECURITY_POLICY = os.environ.get('OPCUA_SECURITY_POLICY', 'None')
    OPCUA_SECURITY_MODE = os.environ.get('OPCUA_SECURITY_MODE', 'None')
    OPCUA_TIMEOUT = int(os.environ.get('OPCUA_TIMEOUT', 30))
    OPCUA_CERT_FILE = os.environ.get('OPCUA_CERT_FILE')  # Path to client certificate
    OPCUA_PRIVATE_KEY_FILE = os.environ.get('OPCUA_PRIVATE_KEY_FILE')  # Path to private key
    OPCUA_TRUST_CERT_FILE = os.environ.get('OPCUA_TRUST_CERT_FILE')  # Path to server certificate to trust
    
    # Security policy fallback behavior (only affects development environment)
    OPCUA_ALLOW_INSECURE_FALLBACK = os.environ.get('OPCUA_ALLOW_INSECURE_FALLBACK', 'false').lower() == 'true'
    
    # Modbus Configuration
    # Control whether sensitive Modbus data (register addresses, values) should be logged
    # Disabled by default for security; enable for debugging purposes only
    MODBUS_LOG_SENSITIVE_DATA = os.environ.get('MODBUS_LOG_SENSITIVE_DATA', 'false').lower() == 'true'


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    TESTING = False
    
    # Override WebSocket CORS for production - restrict to trusted domains
    # This should be set via environment variable in production
    _prod_websocket_origins = os.environ.get('WEBSOCKET_CORS_ORIGINS')
    if not _prod_websocket_origins:
        # If not explicitly set, use a secure default (no wildcard)
        WEBSOCKET_CORS_ORIGINS = ['https://yourdomain.com']
    else:
        WEBSOCKET_CORS_ORIGINS = _prod_websocket_origins.split(',')
    
    # Enforce MQTT TLS in production if certificates are provided
    if os.environ.get("MQTT_CA_CERTS") and os.environ.get("MQTT_CERT_FILE") and os.environ.get("MQTT_KEY_FILE"):
        MQTT_USE_TLS = True
    else:
        raise ValueError("MQTT certificate paths must be set in environment variables for production")
    
    # Enforce OPC UA security in production
    # Override to use at least Basic256Sha256 if not explicitly configured
    if not os.environ.get("OPCUA_SECURITY_POLICY") or os.environ.get("OPCUA_SECURITY_POLICY") == "None":
        OPCUA_SECURITY_POLICY = "Basic256Sha256"
    if not os.environ.get("OPCUA_SECURITY_MODE") or os.environ.get("OPCUA_SECURITY_MODE") == "None":
        OPCUA_SECURITY_MODE = "SignAndEncrypt"
    
    # Ensure certificate paths are correctly set if security is enabled
    if OPCUA_SECURITY_POLICY != "None" and OPCUA_SECURITY_MODE != "None":
        if not (os.environ.get("OPCUA_CERT_FILE") and os.environ.get("OPCUA_PRIVATE_KEY_FILE") and os.environ.get("OPCUA_TRUST_CERT_FILE")):
            raise ValueError("OPC UA certificate paths must be set in environment variables when security is enabled")


class TestingConfig(Config):
    """Testing configuration."""
    DEBUG = True
    TESTING = True
    
    # Use PostgreSQL for testing to match production, with SQLite fallback
    # This can be overridden with POSTGRES_TEST_URL environment variable
    _postgres_test_url = os.environ.get('POSTGRES_TEST_URL', 
                                       'postgresql://postgres:password@localhost:5432/thermacore_test_db')
    _use_postgres_tests = os.environ.get('USE_POSTGRES_TESTS', 'false').lower() == 'true'
    
    SQLALCHEMY_DATABASE_URI = (_postgres_test_url if _use_postgres_tests 
                               else 'sqlite:///:memory:')  # SQLite fallback for environments without PostgreSQL
    
    # SQLite doesn't support pool settings, only use them for PostgreSQL
    SQLALCHEMY_ENGINE_OPTIONS = ({
        'pool_size': 5,
        'pool_pre_ping': True
    } if _use_postgres_tests else {})


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}