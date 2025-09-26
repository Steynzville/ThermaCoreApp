"""Flask application configuration."""
import os
from datetime import timedelta

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Base configuration class."""
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://postgres:password@localhost:5432/thermacore_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,
        'pool_recycle': -1,
        'pool_pre_ping': True
    }
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-change-in-production'
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
    MQTT_USE_TLS = True  # Force TLS in production
    
    # Enforce OPC UA security in production
    # Override to use at least Basic256Sha256 if not explicitly configured
    if not os.environ.get('OPCUA_SECURITY_POLICY') or os.environ.get('OPCUA_SECURITY_POLICY') == 'None':
        OPCUA_SECURITY_POLICY = 'Basic256Sha256'
    if not os.environ.get('OPCUA_SECURITY_MODE') or os.environ.get('OPCUA_SECURITY_MODE') == 'None':
        OPCUA_SECURITY_MODE = 'SignAndEncrypt'


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