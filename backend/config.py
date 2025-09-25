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


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """Testing configuration."""
    DEBUG = True
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'  # Use in-memory SQLite for testing
    SQLALCHEMY_ENGINE_OPTIONS = {}  # SQLite doesn't support pool settings


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}