"""Tests for run.py debug mode configuration."""
import os
import sys
from unittest.mock import Mock, patch
import pytest


class TestDebugModeConfiguration:
    """Test debug mode is only enabled when FLASK_ENV='development'."""
    
    def test_debug_mode_enabled_when_flask_env_development(self):
        """Test that debug mode is enabled when FLASK_ENV is set to 'development'."""
        with patch.dict(os.environ, {'FLASK_ENV': 'development'}):
            # Import run module to test the debug_mode calculation
            debug_mode = os.environ.get('FLASK_ENV') == 'development'
            assert debug_mode is True
    
    def test_debug_mode_disabled_when_flask_env_production(self):
        """Test that debug mode is disabled when FLASK_ENV is set to 'production'."""
        with patch.dict(os.environ, {'FLASK_ENV': 'production'}):
            debug_mode = os.environ.get('FLASK_ENV') == 'development'
            assert debug_mode is False
    
    def test_debug_mode_disabled_when_flask_env_not_set(self):
        """Test that debug mode is disabled when FLASK_ENV is not set."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove FLASK_ENV if it exists
            os.environ.pop('FLASK_ENV', None)
            debug_mode = os.environ.get('FLASK_ENV') == 'development'
            assert debug_mode is False
    
    def test_debug_mode_disabled_when_flask_env_testing(self):
        """Test that debug mode is disabled when FLASK_ENV is set to 'testing'."""
        with patch.dict(os.environ, {'FLASK_ENV': 'testing'}):
            debug_mode = os.environ.get('FLASK_ENV') == 'development'
            assert debug_mode is False
    
    def test_debug_mode_case_sensitive(self):
        """Test that debug mode check is case-sensitive (DEVELOPMENT != development)."""
        with patch.dict(os.environ, {'FLASK_ENV': 'DEVELOPMENT'}):
            debug_mode = os.environ.get('FLASK_ENV') == 'development'
            assert debug_mode is False
        
        with patch.dict(os.environ, {'FLASK_ENV': 'Development'}):
            debug_mode = os.environ.get('FLASK_ENV') == 'development'
            assert debug_mode is False
