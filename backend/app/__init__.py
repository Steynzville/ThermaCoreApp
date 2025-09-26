"""Flask application factory and initialization."""
import os
import logging

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


def _initialize_critical_service(service, service_name: str, app, logger, init_method='init_app', *args, **kwargs):
    """
    Shared helper function for initializing critical services with consistent error handling.
    
    Args:
        service: Service instance to initialize
        service_name: Human-readable service name for logging
        app: Flask application instance
        logger: Logger instance
        init_method: Method name to call for initialization (default: 'init_app')
        *args, **kwargs: Additional arguments to pass to the init method
    
    Raises:
        RuntimeError: In production if service initialization fails
    """
    from app.utils.environment import is_production_environment
    
    try:
        # Call the initialization method
        init_func = getattr(service, init_method)
        init_func(app, *args, **kwargs)
        logger.info(f"{service_name} initialized successfully")
        return True
        
    except (ValueError, RuntimeError, ConnectionError, OSError, ImportError) as e:
        # Security validation errors, connection issues, or configuration errors
        logger.error(f"{service_name} security validation failed: {e}", exc_info=True)
        
        # Use centralized environment detection error handling
        from app.utils.environment import handle_environment_detection_error
        should_continue, error_to_raise = handle_environment_detection_error(
            service_name, logger, app, e, "security validation", is_security_validation=True
        )
        
        if error_to_raise:
            raise error_to_raise
        return should_continue
        
    except Exception as e:
        logger.error(f"Failed to initialize {service_name}: {e}", exc_info=True)
        
        # Use centralized environment detection error handling
        from app.utils.environment import handle_environment_detection_error
        should_continue, error_to_raise = handle_environment_detection_error(
            service_name, logger, app, e, "initialization", is_security_validation=False
        )
        
        if error_to_raise:
            raise error_to_raise
        return should_continue


def create_app(config_name=None):
    """Create Flask application using the application factory pattern."""
    app = Flask(__name__)
    
    # Load configuration with better environment selection
    # Check for TESTING environment first - this takes priority over everything
    if os.environ.get('TESTING', 'false').lower() in ('true', '1'):
        config_name = 'testing'
    elif config_name is None:
        # Use FLASK_ENV, APP_ENV, or default to production
        config_name = os.environ.get('FLASK_ENV', os.environ.get('APP_ENV', 'production'))
        
        # Only use development if explicitly running in development AND FLASK_DEBUG is true/'1'
        if config_name == 'development':
            flask_debug = os.environ.get('FLASK_DEBUG', 'false').lower()
            if flask_debug not in ('true', '1'):
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
            logger = logging.getLogger(__name__)
            logger.warning(f"Swagger initialization failed: {e}")
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
        from app.routes.scada import scada_bp
        from app.routes.analytics import analytics_bp
        from app.routes.historical import historical_bp
        from app.routes.multiprotocol import multiprotocol_bp
        
        app.register_blueprint(auth_bp, url_prefix=app.config['API_PREFIX'])
        app.register_blueprint(units_bp, url_prefix=app.config['API_PREFIX'])
        app.register_blueprint(users_bp, url_prefix=app.config['API_PREFIX'])
        app.register_blueprint(scada_bp, url_prefix=app.config['API_PREFIX'])
        app.register_blueprint(analytics_bp, url_prefix=app.config['API_PREFIX'])
        app.register_blueprint(historical_bp, url_prefix=app.config['API_PREFIX'])
        app.register_blueprint(multiprotocol_bp, url_prefix=app.config['API_PREFIX'])
    except ImportError:
        pass  # Routes may not be importable without full dependencies
    
    # Initialize SCADA services (Phase 2, 3 & 4)
    if not app.config.get('TESTING', False):
        try:
            from app.services.mqtt_service import mqtt_client
            from app.services.websocket_service import websocket_service
            from app.services.realtime_processor import realtime_processor
            from app.services.opcua_service import opcua_client
            from app.services.protocol_gateway_simulator import ProtocolGatewaySimulator
            from app.services.data_storage_service import data_storage_service
            # Phase 3 services
            from app.services.anomaly_detection import anomaly_detection_service
            # Phase 4 services
            from app.services.modbus_service import modbus_service
            from app.services.dnp3_service import dnp3_service
            
            # Initialize services with app context and handle security validation errors
            logger = logging.getLogger(__name__)
            
            # Initialize critical services using shared helper
            _initialize_critical_service(
                data_storage_service, "Data storage service", app, logger, 'init_app'
            )
            
            _initialize_critical_service(
                mqtt_client, "MQTT client", app, logger, 
                'init_app', data_storage_service
            )
            
            _initialize_critical_service(
                opcua_client, "OPC UA client", app, logger,
                'init_app', data_storage_service  
            )
            
            # Initialize non-critical services (failures won't stop the app)
            try:
                websocket_service.init_app(app)
                logger.info("WebSocket service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize WebSocket service: {e}", exc_info=True)
                logger.warning(f"WebSocket service initialization failed: {e}")
            
            try:
                realtime_processor.init_app(app)
                logger.info("Real-time processor initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize real-time processor: {e}", exc_info=True)
                logger.warning(f"Real-time processor initialization failed: {e}")
            
            # Initialize Phase 3 services
            try:
                anomaly_detection_service.init_app(app)
                logger.info("Anomaly detection service initialized successfully")
            except Exception as e:
                logger.warning(f"Anomaly detection service initialization failed: {e}")
            
            # Initialize Phase 4 services
            try:
                modbus_service.init_app(app)
                logger.info("Modbus service initialized successfully")
            except Exception as e:
                logger.warning(f"Modbus service initialization failed: {e}")
                
            try:
                dnp3_service.init_app(app)
                logger.info("DNP3 service initialized successfully")
            except Exception as e:
                logger.warning(f"DNP3 service initialization failed: {e}")
            
            # Initialize protocol simulator (not critical)
            try:
                protocol_simulator = ProtocolGatewaySimulator(
                    mqtt_broker_host=app.config.get('MQTT_BROKER_HOST', 'localhost'),
                    mqtt_broker_port=app.config.get('MQTT_BROKER_PORT', 1883)
                )
                logger.info("Protocol simulator initialized successfully")
            except Exception as e:
                logger.warning(f"Protocol simulator initialization failed: {e}")
                protocol_simulator = None
            
            # Store references in app for easy access
            app.mqtt_client = mqtt_client
            app.websocket_service = websocket_service
            app.realtime_processor = realtime_processor
            app.opcua_client = opcua_client
            app.protocol_simulator = protocol_simulator
            app.data_storage_service = data_storage_service
            # Phase 3 & 4 services
            app.anomaly_detection_service = anomaly_detection_service
            app.modbus_service = modbus_service
            app.dnp3_service = dnp3_service
            
            logger.info("SCADA services initialization completed")
            
        except RuntimeError:
            # Re-raise runtime errors (security validation failures)
            raise
        except ImportError as e:
            logging.getLogger(__name__).warning(f"SCADA services not available: {e}")
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Unexpected error during SCADA services initialization: {e}", exc_info=True)
            from app.utils.environment import is_production_environment
            if is_production_environment(app):
                raise RuntimeError(f"Critical initialization error in production: {e}") from e
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        """Health check endpoint."""
        status = {'status': 'healthy', 'version': '1.0.0'}
        
        # Add SCADA services status if available
        if hasattr(app, 'mqtt_client'):
            status['mqtt'] = app.mqtt_client.get_status()
        if hasattr(app, 'websocket_service'):
            status['websocket'] = app.websocket_service.get_status()
        if hasattr(app, 'realtime_processor'):
            status['realtime_processor'] = app.realtime_processor.get_status()
        if hasattr(app, 'opcua_client'):
            status['opcua'] = app.opcua_client.get_status()
        if hasattr(app, 'protocol_simulator'):
            status['protocol_simulator'] = app.protocol_simulator.get_status()
        if hasattr(app, 'data_storage_service'):
            status['data_storage'] = app.data_storage_service.get_status()
        # Phase 3 & 4 services
        if hasattr(app, 'anomaly_detection_service'):
            status['anomaly_detection'] = app.anomaly_detection_service.get_status()
        if hasattr(app, 'modbus_service'):
            status['modbus'] = app.modbus_service.get_device_status()
        if hasattr(app, 'dnp3_service'):
            status['dnp3'] = app.dnp3_service.get_device_status()
            
        return status
    
    return app