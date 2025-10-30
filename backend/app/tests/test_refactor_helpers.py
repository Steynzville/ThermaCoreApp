"""Tests for refactor helper functions."""

import logging
from unittest.mock import MagicMock, Mock, patch

import pytest

from app.refactor_helpers import (
    configure_debug_mode,
    safe_blueprint_register,
    safe_service_init,
    setup_logging_level,
    setup_logging_sanitization,
)


class TestSafeServiceInit:
    """Test safe_service_init function."""

    def test_safe_service_init_success(self):
        """Test successful service initialization."""
        service = Mock()
        service.init_app = Mock()
        logger = Mock(spec=logging.Logger)
        app = Mock()

        result = safe_service_init(service, "TestService", app, logger)

        assert result is True
        service.init_app.assert_called_once_with(app)
        logger.info.assert_called()

    def test_safe_service_init_with_kwargs(self):
        """Test service initialization with additional kwargs."""
        service = Mock()
        service.init_app = Mock()
        logger = Mock(spec=logging.Logger)
        app = Mock()

        result = safe_service_init(
            service, "TestService", app, logger, timeout=30, retry=True
        )

        assert result is True
        service.init_app.assert_called_once_with(app, timeout=30, retry=True)

    def test_safe_service_init_custom_method(self):
        """Test service initialization with custom method."""
        service = Mock()
        service.initialize = Mock()
        logger = Mock(spec=logging.Logger)
        app = Mock()

        result = safe_service_init(
            service, "TestService", app, logger, init_method="initialize"
        )

        assert result is True
        service.initialize.assert_called_once_with(app)

    def test_safe_service_init_failure_not_required(self):
        """Test service initialization failure when not required."""
        service = Mock()
        service.init_app = Mock(side_effect=Exception("Init failed"))
        logger = Mock(spec=logging.Logger)
        app = Mock()

        result = safe_service_init(service, "TestService", app, logger, required=False)

        assert result is False
        logger.exception.assert_called()

    def test_safe_service_init_failure_required(self):
        """Test service initialization failure when required raises exception."""
        service = Mock()
        service.init_app = Mock(side_effect=Exception("Init failed"))
        logger = Mock(spec=logging.Logger)
        app = Mock()

        with pytest.raises(RuntimeError, match="Required service"):
            safe_service_init(service, "TestService", app, logger, required=True)


class TestSafeBlueprintRegister:
    """Test safe_blueprint_register function."""

    def test_safe_blueprint_register_success(self):
        """Test successful blueprint registration."""
        app = Mock()
        app.config = {"API_PREFIX": "/api/v1"}
        logger = Mock(spec=logging.Logger)

        with patch("builtins.__import__") as mock_import:
            mock_module = Mock()
            mock_blueprint = Mock()
            mock_module.test_bp = mock_blueprint
            mock_import.return_value = mock_module

            success, is_import_error = safe_blueprint_register(
                app, "app.routes.test", "test_bp", "test", logger
            )

            assert success is True
            assert is_import_error is False
            app.register_blueprint.assert_called_once()

    def test_safe_blueprint_register_with_url_prefix(self):
        """Test blueprint registration with custom URL prefix."""
        app = Mock()
        app.config = {"API_PREFIX": "/api/v1"}
        logger = Mock(spec=logging.Logger)

        with patch("builtins.__import__") as mock_import:
            mock_module = Mock()
            mock_blueprint = Mock()
            mock_module.test_bp = mock_blueprint
            mock_import.return_value = mock_module

            success, is_import_error = safe_blueprint_register(
                app, "app.routes.test", "test_bp", "test", logger, url_prefix="/custom"
            )

            assert success is True
            app.register_blueprint.assert_called_with(mock_blueprint, url_prefix="/custom")

    def test_safe_blueprint_register_import_error(self):
        """Test blueprint registration with import error."""
        app = Mock()
        logger = Mock(spec=logging.Logger)

        with patch("builtins.__import__", side_effect=ImportError("Module not found")):
            success, is_import_error = safe_blueprint_register(
                app, "app.routes.missing", "test_bp", "test", logger
            )

            assert success is False
            assert is_import_error is True
            logger.exception.assert_called()

    def test_safe_blueprint_register_general_error(self):
        """Test blueprint registration with general error."""
        app = Mock()
        app.register_blueprint = Mock(side_effect=Exception("Register failed"))
        logger = Mock(spec=logging.Logger)

        with patch("builtins.__import__") as mock_import:
            mock_module = Mock()
            mock_blueprint = Mock()
            mock_module.test_bp = mock_blueprint
            mock_import.return_value = mock_module

            success, is_import_error = safe_blueprint_register(
                app, "app.routes.test", "test_bp", "test", logger
            )

            assert success is False
            assert is_import_error is False


class TestSetupLoggingSanitization:
    """Test setup_logging_sanitization function."""

    def test_setup_logging_sanitization(self):
        """Test setting up logging sanitization."""
        app = Mock()
        app.logger = logging.getLogger("test_app")
        app.logger.handlers = []

        # Add a test handler
        handler = logging.StreamHandler()
        app.logger.addHandler(handler)

        with patch("app.refactor_helpers.logging.getLogger") as mock_get_logger:
            root_logger = logging.getLogger()
            mock_get_logger.return_value = root_logger

            setup_logging_sanitization(app)

            # Verify filters were added
            assert len(handler.filters) > 0

    def test_setup_logging_sanitization_no_duplicates(self):
        """Test that sanitization filter is not added twice."""
        from app.utils.logging_filter import SanitizingFilter

        app = Mock()
        app.logger = logging.getLogger("test_app")
        app.logger.handlers = []

        handler = logging.StreamHandler()
        handler.addFilter(SanitizingFilter())  # Pre-add filter
        app.logger.addHandler(handler)

        initial_filter_count = len(handler.filters)

        with patch("app.refactor_helpers.logging.getLogger") as mock_get_logger:
            root_logger = logging.getLogger()
            mock_get_logger.return_value = root_logger

            setup_logging_sanitization(app)

            # Filter count should not increase
            assert len(handler.filters) == initial_filter_count


class TestConfigureDebugMode:
    """Test configure_debug_mode function."""

    def test_configure_debug_mode_production(self):
        """Test debug mode disabled for production."""
        app = Mock()

        configure_debug_mode(app, "production")

        assert app.debug is False

    def test_configure_debug_mode_development(self):
        """Test debug mode enabled for development."""
        app = Mock()

        configure_debug_mode(app, "development")

        assert app.debug is True

    def test_configure_debug_mode_testing(self):
        """Test debug mode enabled for testing."""
        app = Mock()

        configure_debug_mode(app, "testing")

        assert app.debug is True


class TestSetupLoggingLevel:
    """Test setup_logging_level function."""

    def test_setup_logging_level_info(self):
        """Test setting logging level to INFO."""
        app = Mock()
        app.config = {"LOG_LEVEL": "INFO"}
        logger = logging.getLogger("test_logger")

        with patch("logging.basicConfig") as mock_basic_config:
            setup_logging_level(app, logger)

            mock_basic_config.assert_called_once()
            assert logger.level == logging.INFO

    def test_setup_logging_level_debug(self):
        """Test setting logging level to DEBUG."""
        app = Mock()
        app.config = {"LOG_LEVEL": "DEBUG"}
        logger = logging.getLogger("test_logger")

        with patch("logging.basicConfig"):
            setup_logging_level(app, logger)

            assert logger.level == logging.DEBUG

    def test_setup_logging_level_default(self):
        """Test default logging level when not configured."""
        app = Mock()
        app.config = {}
        logger = logging.getLogger("test_logger")

        with patch("logging.basicConfig"):
            setup_logging_level(app, logger)

            assert logger.level == logging.INFO

    def test_setup_logging_level_invalid(self):
        """Test invalid logging level defaults to INFO."""
        app = Mock()
        app.config = {"LOG_LEVEL": "INVALID"}
        logger = logging.getLogger("test_logger")

        with patch("logging.basicConfig"):
            setup_logging_level(app, logger)

            assert logger.level == logging.INFO
