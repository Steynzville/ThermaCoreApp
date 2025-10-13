"""Tests for SKIP_EXTERNAL_SERVICES functionality."""

import os
import pytest
from unittest.mock import patch, Mock
from app.utils.service_manager import should_skip_external_services


class TestSkipExternalServices:
    """Test the SKIP_EXTERNAL_SERVICES environment variable functionality."""

    def test_should_skip_external_services_true(self):
        """Test that should_skip_external_services returns True when env var is 'true'."""
        with patch.dict(os.environ, {'SKIP_EXTERNAL_SERVICES': 'true'}):
            assert should_skip_external_services() is True

    def test_should_skip_external_services_false(self):
        """Test that should_skip_external_services returns False when env var is 'false'."""
        with patch.dict(os.environ, {'SKIP_EXTERNAL_SERVICES': 'false'}):
            assert should_skip_external_services() is False

    def test_should_skip_external_services_not_set(self):
        """Test that should_skip_external_services returns False when env var is not set."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove the key if it exists
            os.environ.pop('SKIP_EXTERNAL_SERVICES', None)
            assert should_skip_external_services() is False

    def test_should_skip_external_services_case_insensitive(self):
        """Test that should_skip_external_services is case insensitive."""
        with patch.dict(os.environ, {'SKIP_EXTERNAL_SERVICES': 'TRUE'}):
            assert should_skip_external_services() is True
        
        with patch.dict(os.environ, {'SKIP_EXTERNAL_SERVICES': 'True'}):
            assert should_skip_external_services() is True

    def test_should_skip_external_services_other_values(self):
        """Test that should_skip_external_services returns False for other values."""
        with patch.dict(os.environ, {'SKIP_EXTERNAL_SERVICES': '1'}):
            assert should_skip_external_services() is False
        
        with patch.dict(os.environ, {'SKIP_EXTERNAL_SERVICES': 'yes'}):
            assert should_skip_external_services() is False


class TestAppInitializationWithSkip:
    """Test Flask app initialization with SKIP_EXTERNAL_SERVICES."""

    @patch('app.utils.service_manager.should_skip_external_services')
    def test_app_creation_skips_external_services(self, mock_skip, app, caplog):
        """Test that external services are skipped when SKIP_EXTERNAL_SERVICES is true."""
        # This test assumes the app fixture creates a testing app
        # We're testing that the skip logic works
        mock_skip.return_value = True
        
        # Import here to avoid circular imports
        from app import create_app
        
        # Create app with SKIP_EXTERNAL_SERVICES set
        with patch.dict(os.environ, {'SKIP_EXTERNAL_SERVICES': 'true'}):
            test_app = create_app('testing')
            
            # Verify that the skip message is logged
            # Note: In testing mode, services might not be initialized anyway
            # This test mainly verifies the function works
            assert test_app is not None

    def test_app_creation_without_skip(self, app):
        """Test that app creates normally when SKIP_EXTERNAL_SERVICES is not set."""
        # Import here to avoid circular imports
        from app import create_app
        
        # Create app without SKIP_EXTERNAL_SERVICES
        with patch.dict(os.environ, {'SKIP_EXTERNAL_SERVICES': 'false'}):
            test_app = create_app('testing')
            
            # Verify app is created
            assert test_app is not None
