"""Environment detection utilities for robust deployment checks."""
import os
from flask import current_app


def is_testing_environment(app=None) -> bool:
    """
    Check if running in testing environment.
    
    Args:
        app: Flask application instance (optional)
    
    Returns:
        True if running in testing environment
    """
    # Check environment variable first
    testing_env = os.environ.get('TESTING', 'false').lower()
    if testing_env in ('true', '1'):
        return True
    
    # Check app configuration
    if app and app.config.get('TESTING', False):
        return True
    
    # Try current_app
    try:
        if current_app and current_app.config.get('TESTING', False):
            return True
    except RuntimeError:
        pass
    
    return False


def is_production_environment(app=None) -> bool:
    """
    Robust production environment detection.
    
    Checks multiple sources in order of priority:
    1. TESTING environment check (testing is never production)
    2. FLASK_ENV environment variable
    3. APP_ENV environment variable  
    4. DEBUG config setting (False = production)
    5. Flask app.config FLASK_ENV setting
    
    Args:
        app: Flask application instance (optional, uses current_app if available)
    
    Returns:
        True if running in production environment
    """
    # First priority: Check if we're in testing environment (testing is never production)
    if is_testing_environment(app):
        return False
        
    # Check environment variables first (most reliable)
    flask_env = os.environ.get('FLASK_ENV', '').lower()
    if flask_env:
        return flask_env == 'production'
    
    app_env = os.environ.get('APP_ENV', '').lower()
    if app_env:
        return app_env == 'production'
    
    # Check app configuration if app is available
    if app:
        # Check DEBUG setting (False typically means production)
        if not app.config.get('DEBUG', True):
            return True
        
        # Check app's FLASK_ENV config
        app_flask_env = app.config.get('FLASK_ENV', '').lower()
        if app_flask_env:
            return app_flask_env == 'production'
        
        # If DEBUG is True and no explicit environment, assume development
        if app.config.get('DEBUG', True):
            return False
    
    # Try current_app if no app provided
    try:
        if current_app and hasattr(current_app, 'config'):
            if not current_app.config.get('DEBUG', True):
                return True
                
            app_flask_env = current_app.config.get('FLASK_ENV', '').lower()
            if app_flask_env:
                return app_flask_env == 'production'
            
            # If DEBUG is True and no explicit environment, assume development
            if current_app.config.get('DEBUG', True):
                return False
    except RuntimeError:
        # No application context available
        pass
    
    # Default to production for safety if environment is unclear
    # NOTE: This fallback behavior ensures that if environment detection is ambiguous,
    # the system defaults to production mode for security. Developers should set 
    # explicit environment variables (FLASK_ENV=development, DEBUG=1) for local runs.
    return True


def is_development_environment(app=None) -> bool:
    """
    Check if running in development environment.
    
    Development environment is determined as:
    - NOT testing environment AND NOT production environment
    
    Args:
        app: Flask application instance (optional)
    
    Returns:
        True if running in development environment
    """
    # Testing environment is never development
    if is_testing_environment(app):
        return False
        
    # Development is the opposite of production, but only if not testing
    return not is_production_environment(app)