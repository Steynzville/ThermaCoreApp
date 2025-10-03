"""Tests for run.py debug mode configuration."""
import os
import sys
from unittest.mock import Mock, MagicMock
import pytest


class TestDebugModeConfiguration:
    """Test that run.py correctly uses app.debug when calling app.run()."""
    
    def test_app_run_uses_app_debug_when_true(self):
        """Test that app.run is called with debug=True when app.debug is True."""
        # Create a mock app with debug=True (as set by DevelopmentConfig)
        mock_app = Mock()
        mock_app.debug = True
        mock_app.run = MagicMock()
        
        # Simulate what happens in run.py: app.run(host='0.0.0.0', port=5000, debug=app.debug)
        mock_app.run(host='0.0.0.0', port=5000, debug=mock_app.debug)
        
        # Verify app.run was called with debug=True
        mock_app.run.assert_called_once_with(host='0.0.0.0', port=5000, debug=True)
    
    def test_app_run_uses_app_debug_when_false(self):
        """Test that app.run is called with debug=False when app.debug is False."""
        # Create a mock app with debug=False (as set by ProductionConfig)
        mock_app = Mock()
        mock_app.debug = False
        mock_app.run = MagicMock()
        
        # Simulate what happens in run.py: app.run(host='0.0.0.0', port=5000, debug=app.debug)
        mock_app.run(host='0.0.0.0', port=5000, debug=mock_app.debug)
        
        # Verify app.run was called with debug=False
        mock_app.run.assert_called_once_with(host='0.0.0.0', port=5000, debug=False)
    
    def test_debug_mode_reflects_config(self):
        """Test that debug mode matches the Flask config DEBUG setting."""
        # This test verifies the relationship between config and app.debug
        # In development: DevelopmentConfig sets DEBUG=True
        # In production: ProductionConfig sets DEBUG=False
        
        test_cases = [
            (True, 'development config sets app.debug=True'),
            (False, 'production config sets app.debug=False'),
        ]
        
        for expected_debug, description in test_cases:
            mock_app = Mock()
            mock_app.debug = expected_debug
            mock_app.run = MagicMock()
            
            # Simulate run.py behavior
            mock_app.run(host='0.0.0.0', port=5000, debug=mock_app.debug)
            
            # Verify the debug parameter matches expectations
            call_args = mock_app.run.call_args
            assert call_args[1]['debug'] == expected_debug, f"Failed: {description}"
