"""Environment detection utilities for robust deployment checks."""
import os
from flask import current_app
from typing import Optional, Dict, Any


def _get_environment_from_config(config: Dict[str, Any]) -> Optional[str]:
    """Extract environment information from config object.
    
    Args:
        config: Flask config or dict-like object
        
    Returns:
        Environment name if explicitly set, None otherwise
    """
    return config.get('FLASK_ENV', '').lower()


def _is_debug_enabled(config: Dict[str, Any]) -> bool:
    """Check if DEBUG is enabled in config.
    
    Args:
        config: Flask config or dict-like object
        
    Returns:
        True if DEBUG is enabled
    """
    return config.get('DEBUG', False)


def _get_effective_app_config(app=None) -> Optional[Dict[str, Any]]:
    """Get the effective application configuration.
    
    Args:
        app: Flask application instance (optional)
        
    Returns:
        Config dict or None if no app available
    """
    if app and hasattr(app, 'config'):
        return app.config
    
    try:
        if current_app and hasattr(current_app, 'config'):
            return current_app.config
    except RuntimeError:
        pass
    
    return None


def _check_environment_mismatch(flask_env: str, app_env: str, debug_enabled: bool) -> bool:
    """Check for dangerous environment mismatches that could indicate staging misclassified as development.
    
    Args:
        flask_env: FLASK_ENV value
        app_env: APP_ENV value  
        debug_enabled: Whether DEBUG is enabled
        
    Returns:
        True if there's a dangerous mismatch (e.g., production env with DEBUG=True)
    """
    # Check for production environment variables with DEBUG=True
    production_envs = ('production', 'prod', 'staging', 'stage')
    
    if debug_enabled and (flask_env in production_envs or app_env in production_envs):
        return True
    
    return False


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
    
    # Check app configuration using helper
    config = _get_effective_app_config(app)
    if config and config.get('TESTING', False):
        return True
    
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
        
    Raises:
        ValueError: If dangerous environment mismatches are detected
    """
    # First priority: Check if we're in testing environment (testing is never production)
    if is_testing_environment(app):
        return False
        
    # Check environment variables first (most reliable)
    flask_env = os.environ.get('FLASK_ENV', '').lower()
    app_env = os.environ.get('APP_ENV', '').lower()
    
    if flask_env:
        is_prod_env = flask_env == 'production'
    elif app_env:
        is_prod_env = app_env == 'production'
    else:
        is_prod_env = None
    
    # Get app config for further checks
    config = _get_effective_app_config(app)
    debug_enabled = _is_debug_enabled(config) if config else False
    
    # Check for dangerous mismatches before proceeding
    if _check_environment_mismatch(flask_env, app_env, debug_enabled):
        raise ValueError(
            f"Dangerous environment mismatch detected: "
            f"FLASK_ENV='{flask_env}', APP_ENV='{app_env}', DEBUG={debug_enabled}. "
            f"Production/staging environments should not have DEBUG=True"
        )
    
    # If explicit environment is set, use it
    if is_prod_env is not None:
        return is_prod_env
    
    # Check app configuration if no explicit environment variables
    if config:
        # Check DEBUG setting (False typically means production)
        if not debug_enabled:
            return True
        
        # Check app's FLASK_ENV config
        app_flask_env = _get_environment_from_config(config)
        if app_flask_env:
            return app_flask_env == 'production'
        
        # If DEBUG is True and no explicit environment, assume development
        if debug_enabled:
            return False
    
    # Default to production for safety if environment is unclear
    # NOTE: This fallback behavior ensures that if environment detection is ambiguous,
    # the system defaults to production mode for security. Developers should set 
    # explicit environment variables (FLASK_ENV=development, DEBUG=1) for local runs.
    return True


def is_development_environment(app=None) -> bool:
    """
    Check if running in development environment.
    
    Development environment is determined by explicit indicators:
    - FLASK_ENV=development OR APP_ENV=development
    - DEBUG=True (if no explicit production indicators)
    - NOT testing environment
    
    Args:
        app: Flask application instance (optional)
    
    Returns:
        True if running in development environment
        
    Raises:
        ValueError: If dangerous environment mismatches are detected
    """
    # Testing environment is never development
    if is_testing_environment(app):
        return False
        
    # Check for explicit development environment variables
    flask_env = os.environ.get('FLASK_ENV', '').lower()
    app_env = os.environ.get('APP_ENV', '').lower()
    
    if flask_env == 'development' or app_env == 'development':
        return True
    
    # Get app config for further checks
    config = _get_effective_app_config(app)
    debug_enabled = _is_debug_enabled(config) if config else False
    
    # Check for dangerous mismatches
    if _check_environment_mismatch(flask_env, app_env, debug_enabled):
        raise ValueError(
            f"Dangerous environment mismatch detected: "
            f"FLASK_ENV='{flask_env}', APP_ENV='{app_env}', DEBUG={debug_enabled}. "
            f"Production/staging environments should not have DEBUG=True"
        )
    
    # Check app configuration for development indicators
    if config:
        app_flask_env = _get_environment_from_config(config)
        if app_flask_env == 'development':
            return True
            
        # DEBUG=True can indicate development if no explicit production env
        if debug_enabled:
            # But only if no production environment variables are set
            production_envs = ('production', 'prod', 'staging', 'stage')
            if not flask_env and not app_env and not app_flask_env:
                return True
            elif flask_env not in production_envs and app_env not in production_envs and app_flask_env not in production_envs:
                return True
    
    return False