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
    swagger = None  # Will be initialized in create_app
else:
    swagger = None


def create_app(config_name=None):
    """Create Flask application using the application factory pattern."""
    app = Flask(__name__)
    
    # Load configuration with better environment selection
    if config_name is None:
        # Default to production for docs/app generation to avoid dev-only config
        config_name = os.environ.get('FLASK_ENV', os.environ.get('APP_ENV', 'production'))
        
        # Only use development as default if explicitly running in development
        if config_name == 'development' and not os.environ.get('FLASK_DEBUG'):
            config_name = 'production'
    
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
    
    # Initialize Swagger if available and not in testing environment
    if swagger_available and not app.config.get('TESTING', False):
        swagger_template = {
            "swagger": "2.0",
            "info": {
                "title": "ThermaCore SCADA API",
                "description": "API for ThermaCore SCADA system integration and monitoring - Auto-generated from code docstrings",
                "version": "1.0.0",
                "contact": {
                    "name": "ThermaCore API Team",
                    "email": "api@thermacore.com"
                }
            },
            "basePath": app.config.get('API_PREFIX', '/api/v1'),
            "schemes": ["http", "https"],
            "securityDefinitions": {
                "JWT": {
                    "type": "apiKey",
                    "name": "Authorization",
                    "in": "header",
                    "description": "JWT Authorization header using the Bearer scheme. Example: 'Authorization: Bearer {token}'"
                }
            }
        }
        try:
            swagger = Swagger(app, template=swagger_template)
        except Exception as e:
            # Log the error but don't fail app creation if Swagger fails
            import logging
            logging.getLogger(__name__).warning(f"Swagger initialization failed: {e}")
            swagger = None
    
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