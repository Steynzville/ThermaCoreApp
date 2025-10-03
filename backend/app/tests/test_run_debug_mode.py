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
            app = create_app()
            assert app.debug is True, "DevelopmentConfig should set app.debug=True"
            assert app.config['DEBUG'] is True, "DevelopmentConfig should set DEBUG=True"
    
    def test_debug_disabled_with_production_config(self):
        """Test that app.debug is False when using ProductionConfig."""
        with patch.dict(os.environ, {'FLASK_ENV': 'production', 'FLASK_DEBUG': '0'}, clear=True):
            app = create_app()
            assert app.debug is False, "ProductionConfig should set app.debug=False"
            assert app.config['DEBUG'] is False, "ProductionConfig should set DEBUG=False"
    
    def test_debug_disabled_with_testing_config(self):
        """Test that app.debug is False when using TestingConfig."""
        with patch.dict(os.environ, {'FLASK_ENV': 'testing', 'TESTING': '1'}, clear=True):
            app = create_app()
            assert app.debug is False, "TestingConfig should set app.debug=False"
            assert app.config['DEBUG'] is False, "TestingConfig should set DEBUG=False"
            assert app.config['TESTING'] is True, "TestingConfig should set TESTING=True"
    
    def test_flask_env_development_without_debug_flag(self):
        """Test that FLASK_ENV=development alone falls back to production config."""
        # Per line 120-122 of __init__.py, FLASK_ENV=development without FLASK_DEBUG
        # falls back to production config for security
        with patch.dict(os.environ, {'FLASK_ENV': 'development'}, clear=True):
            app = create_app()  # Should fall back to production
            assert app.config['DEBUG'] is False, "Should use production config without FLASK_DEBUG"
    
    def test_flask_env_development_with_debug_flag(self):
        """Test that FLASK_ENV=development with FLASK_DEBUG=1 enables debug mode."""
        # Both FLASK_ENV=development and FLASK_DEBUG=1 are required for DevelopmentConfig
        with patch.dict(os.environ, {'FLASK_ENV': 'development', 'FLASK_DEBUG': '1'}, clear=True):
            app = create_app()  # Should use DevelopmentConfig
            assert app.config['DEBUG'] is True, "Should use DevelopmentConfig with both flags"
    
    def test_flask_env_production_sets_no_debug(self):
        """Test that FLASK_ENV=production results in no debug mode."""
        with patch.dict(os.environ, {'FLASK_ENV': 'production', 'FLASK_DEBUG': '0'}, clear=True):
            app = create_app()  # Should use FLASK_ENV
            assert app.config['DEBUG'] is False
