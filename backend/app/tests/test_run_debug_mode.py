"""Tests for run.py debug mode configuration."""
import os
import pytest
from unittest.mock import patch

from app import create_app


class TestDebugModeConfiguration:
    """Test that app.debug is correctly set based on FLASK_ENV."""
    
    def test_debug_enabled_with_development_config(self):
        """Test that app.debug is True when using DevelopmentConfig."""
        with patch.dict(os.environ, {'FLASK_ENV': 'development', 'FLASK_DEBUG': '1'}, clear=True):
            app = create_app('development')
            assert app.debug is True, "DevelopmentConfig should set app.debug=True"
            assert app.config['DEBUG'] is True, "DevelopmentConfig should set DEBUG=True"
    
    def test_debug_disabled_with_production_config(self):
        """Test that app.debug is False when using ProductionConfig."""
        with patch.dict(os.environ, {'FLASK_ENV': 'production'}, clear=True):
            app = create_app('production')
            assert app.debug is False, "ProductionConfig should set app.debug=False"
            assert app.config['DEBUG'] is False, "ProductionConfig should set DEBUG=False"
    
    def test_debug_disabled_with_testing_config(self):
        """Test that app.debug is False when using TestingConfig."""
        with patch.dict(os.environ, {'FLASK_ENV': 'testing', 'TESTING': '1'}, clear=True):
            app = create_app('testing')
            assert app.debug is False, "TestingConfig should set app.debug=False"
            assert app.config['DEBUG'] is False, "TestingConfig should set DEBUG=False"
            assert app.config['TESTING'] is True, "TestingConfig should set TESTING=True"
    
    def test_flask_env_development_sets_debug(self):
        """Test that FLASK_ENV=development results in debug mode."""
        # Note: create_app requires FLASK_DEBUG=1 when FLASK_ENV=development (see line 120 of __init__.py)
        with patch.dict(os.environ, {'FLASK_ENV': 'development', 'FLASK_DEBUG': '1'}, clear=True):
            app = create_app()  # Should default to using FLASK_ENV
            # The actual config loaded depends on create_app logic
            # If FLASK_ENV=development and FLASK_DEBUG=1, it loads DevelopmentConfig
            assert app.config['DEBUG'] is True
    
    def test_flask_env_production_sets_no_debug(self):
        """Test that FLASK_ENV=production results in no debug mode."""
        with patch.dict(os.environ, {'FLASK_ENV': 'production'}, clear=True):
            app = create_app()  # Should use FLASK_ENV
            assert app.config['DEBUG'] is False
