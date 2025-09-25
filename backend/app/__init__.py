"""Flask application factory and initialization."""
import os

# Import Flask and core extensions
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

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
    swagger = Swagger()
else:
    swagger = None


def create_app(config_name=None):
    """Create Flask application using the application factory pattern."""
    app = Flask(__name__)
    
    # Load configuration
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    from config import config
    app.config.from_object(config[config_name])
    
    # Initialize core extensions
    db.init_app(app)
    
    # Initialize optional extensions
    if migrate:
        migrate.init_app(app, db)
    
    if jwt:
        jwt.init_app(app)
    
    # Configure CORS if available
    if cors_available:
        CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # Initialize Swagger if available
    if swagger:
        swagger_config = {
            "swagger": "2.0",
            "info": {
                "title": "ThermaCore SCADA API",
                "description": "API for ThermaCore SCADA system integration",
                "version": "1.0.0"
            },
            "basePath": app.config['API_PREFIX'],
            "schemes": ["http", "https"]
        }
        swagger.init_app(app, config=swagger_config)
    
    # Import models to ensure they are registered (only if db is configured)
    try:
        from app.models import User, Role, Permission, Unit, Sensor, SensorReading
    except ImportError:
        pass  # Models may not be importable without full dependencies
    
    # Register blueprints (only if available)
    try:
        from app.routes.auth import auth_bp
        from app.routes.units import units_bp
        from app.routes.users import users_bp
        
        app.register_blueprint(auth_bp, url_prefix=app.config['API_PREFIX'])
        app.register_blueprint(units_bp, url_prefix=app.config['API_PREFIX'])
        app.register_blueprint(users_bp, url_prefix=app.config['API_PREFIX'])
    except ImportError:
        pass  # Routes may not be importable without full dependencies
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        """Health check endpoint."""
        return {'status': 'healthy', 'version': '1.0.0'}
    
    return app