"""Tests for logging configuration module."""

import logging
import tempfile

from app.logging_config import (
    configure_logging,
    create_logger,
    log_exception_with_context,
)


class TestLoggingConfig:
    """Test logging configuration functions."""

    def test_configure_logging_default(self):
        """Test logging configuration with defaults."""
        configure_logging()
        # Just verify it doesn't raise an error
        logger = logging.getLogger()
        assert logger is not None

    def test_configure_logging_custom_level(self):
        """Test logging configuration with custom level."""
        configure_logging(level="DEBUG")
        # Just verify it doesn't raise an error
        logger = logging.getLogger()
        assert logger is not None

    def test_configure_logging_with_file(self):
        """Test logging configuration with file output."""
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".log") as f:
            log_file = f.name

        configure_logging(level="INFO", log_file=log_file)
        test_logger = logging.getLogger("test_file_logging")
        test_logger.info("Test message for file")

        # Verify function completes without error
        assert log_file is not None

    def test_configure_logging_custom_format(self):
        """Test logging configuration with custom format."""
        custom_format = "%(levelname)s - %(message)s"
        configure_logging(level="INFO", log_format=custom_format)
        # Just verify it doesn't raise an error
        logger = logging.getLogger()
        assert logger is not None

    def test_create_logger_default(self):
        """Test logger creation with defaults."""
        logger = create_logger("test_module")
        assert logger.name == "test_module"
        assert logger.level == logging.INFO

    def test_create_logger_custom_level(self):
        """Test logger creation with custom level."""
        logger = create_logger("test_module", level="WARNING")
        assert logger.name == "test_module"
        assert logger.level == logging.WARNING

    def test_log_exception_with_context(self, caplog):
        """Test exception logging with context."""
        logger = logging.getLogger("test_exception")
        exception = ValueError("Test error")
        context = {"user_id": 123, "operation": "test"}

        with caplog.at_level(logging.ERROR):
            log_exception_with_context(
                logger,
                exception,
                context=context,
                level="ERROR",
            )

        assert "Test error" in caplog.text
        assert "user_id=123" in caplog.text
        assert "operation=test" in caplog.text

    def test_log_exception_without_context(self, caplog):
        """Test exception logging without context."""
        logger = logging.getLogger("test_exception")
        exception = RuntimeError("Another error")

        with caplog.at_level(logging.ERROR):
            log_exception_with_context(logger, exception)

        assert "Another error" in caplog.text

    def test_log_exception_warning_level(self, caplog):
        """Test exception logging at warning level."""
        logger = logging.getLogger("test_exception")
        exception = ValueError("Warning test")

        with caplog.at_level(logging.WARNING):
            log_exception_with_context(logger, exception, level="WARNING")

        assert "Warning test" in caplog.text
        assert len(caplog.records) > 0
        assert caplog.records[0].levelname == "WARNING"

    def test_log_exception_with_multiple_context_items(self, caplog):
        """Test exception logging with multiple context items."""
        logger = logging.getLogger("test_exception")
        exception = ValueError("Complex error")
        context = {
            "user_id": 456,
            "ip_address": "192.168.1.1",
            "endpoint": "/api/test",
            "method": "POST",
        }

        with caplog.at_level(logging.ERROR):
            log_exception_with_context(logger, exception, context=context)

        assert "Complex error" in caplog.text
        assert "user_id=456" in caplog.text
        assert "ip_address=192.168.1.1" in caplog.text
