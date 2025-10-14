"""Tests for patch1 fixes: logging formatter and MQTT error caching."""

import logging
from unittest.mock import Mock, patch
from app.middleware.request_id import RequestAwareFormatter, RequestIDFilter


class TestRequestAwareFormatter:
    """Test RequestAwareFormatter handles missing request_id gracefully."""

    def test_formatter_with_missing_request_id(self):
        """Test that formatter handles missing request_id field."""
        formatter = RequestAwareFormatter("[%(request_id)s] %(message)s")

        # Create a log record without request_id
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Test message",
            args=(),
            exc_info=None,
        )

        # Should not raise KeyError or ValueError
        formatted = formatter.format(record)

        # Should use fallback value
        assert "no-request-context" in formatted
        assert "Test message" in formatted

    def test_formatter_with_existing_request_id(self):
        """Test that formatter works with existing request_id."""
        formatter = RequestAwareFormatter("[%(request_id)s] %(message)s")

        # Create a log record with request_id
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Test message",
            args=(),
            exc_info=None,
        )
        record.request_id = "test-request-id-123"

        formatted = formatter.format(record)

        # Should use the actual request_id
        assert "test-request-id-123" in formatted
        assert "Test message" in formatted
        assert "no-request-context" not in formatted

    def test_formatter_preserves_other_fields(self):
        """Test that formatter preserves other log record fields."""
        formatter = RequestAwareFormatter(
            "%(levelname)s - [%(request_id)s] - %(name)s - %(message)s"
        )

        record = logging.LogRecord(
            name="my.module",
            level=logging.WARNING,
            pathname="test.py",
            lineno=1,
            msg="Warning message",
            args=(),
            exc_info=None,
        )

        formatted = formatter.format(record)

        # Should include level name and module name
        assert "WARNING" in formatted
        assert "my.module" in formatted
        assert "Warning message" in formatted
        assert "no-request-context" in formatted


class TestRequestIDFilter:
    """Test RequestIDFilter adds request_id to log records."""

    def test_filter_adds_request_id(self):
        """Test that filter adds request_id to records."""
        request_filter = RequestIDFilter()

        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Test message",
            args=(),
            exc_info=None,
        )

        # Filter should add request_id
        result = request_filter.filter(record)

        assert result is True
        assert hasattr(record, "request_id")
        # Should use fallback when no request context
        assert record.request_id == "no-request-context"


class TestMQTTErrorCaching:
    """Test MQTT error logging is cached to reduce spam."""

    def test_mqtt_error_logged_once(self, app, client):
        """Test that MQTT errors are only logged once."""
        with app.app_context():
            # Mock MQTT client that raises exception
            mock_client = Mock()
            mock_client.get_status.side_effect = Exception("MQTT connection failed")
            app.mqtt_client = mock_client

            # Clear any existing error flag
            if hasattr(app, "_mqtt_error_logged"):
                delattr(app, "_mqtt_error_logged")

            # First health check should log the error
            with patch.object(app.logger, "error") as mock_error_log:
                response1 = client.get("/health")
                assert response1.status_code == 200

                # Error should be logged
                assert mock_error_log.call_count == 1

                # Second health check should NOT log the error again
                response2 = client.get("/health")
                assert response2.status_code == 200

                # Error should still only be logged once
                assert mock_error_log.call_count == 1

    def test_mqtt_error_flag_set(self, app, client):
        """Test that _mqtt_error_logged flag is set after error."""
        with app.app_context():
            # Mock MQTT client that raises exception
            mock_client = Mock()
            mock_client.get_status.side_effect = Exception("MQTT connection failed")
            app.mqtt_client = mock_client

            # Clear any existing error flag
            if hasattr(app, "_mqtt_error_logged"):
                delattr(app, "_mqtt_error_logged")

            # Flag should not exist initially
            assert not hasattr(app, "_mqtt_error_logged")

            # Make health check request
            response = client.get("/health")
            assert response.status_code == 200

            # Flag should be set after error
            assert hasattr(app, "_mqtt_error_logged")
            assert app._mqtt_error_logged is True

    def test_mqtt_success_no_error_flag(self, app, client):
        """Test that no error flag is set when MQTT works."""
        with app.app_context():
            # Mock working MQTT client
            mock_client = Mock()
            mock_client.get_status.return_value = {"available": True, "connected": True}
            app.mqtt_client = mock_client

            # Clear any existing error flag
            if hasattr(app, "_mqtt_error_logged"):
                delattr(app, "_mqtt_error_logged")

            # Make health check request
            response = client.get("/health")
            assert response.status_code == 200

            # Flag should not be set when no error occurs
            assert not hasattr(app, "_mqtt_error_logged")

    def test_mqtt_error_returns_correct_status(self, app, client):
        """Test that health check returns correct status on MQTT error."""
        with app.app_context():
            # Mock MQTT client that raises exception
            mock_client = Mock()
            mock_client.get_status.side_effect = Exception("Connection timeout")
            app.mqtt_client = mock_client

            response = client.get("/health")
            assert response.status_code == 200

            data = response.get_json()

            # Should report degraded status
            assert data["status"] == "degraded"

            # MQTT service should show error
            assert "services" in data
            assert "mqtt" in data["services"]
            assert data["services"]["mqtt"]["status"] == "error"
            assert "Connection timeout" in data["services"]["mqtt"]["message"]
            assert data["services"]["mqtt"]["available"] is False
