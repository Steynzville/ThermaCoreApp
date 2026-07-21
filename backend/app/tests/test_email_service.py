"""Tests for app.services.email_service."""

from unittest.mock import MagicMock, patch

import pytest

from app.services import email_service


@pytest.fixture
def app_context(app):
    """Flask app context with default config for email tests."""
    app.config["SENDGRID_API_KEY"] = "test-api-key"
    app.config["EMAIL_FROM"] = "from@example.com"
    app.config["FRONTEND_URL"] = "https://example.com"
    with app.app_context():
        yield app


class TestSendPasswordResetEmail:
    """Test suite for send_password_reset_email function."""

    def test_sendgrid_not_available(self, app_context):
        """Test returns error when SendGrid library is not available."""
        with patch.object(email_service, "SENDGRID_AVAILABLE", False):
            success, error = email_service.send_password_reset_email(
                "user@example.com",
                "tok123",
            )

        assert success is False
        assert "SendGrid library not installed" in error

    def test_missing_api_key(self, app_context):
        """Test returns error when SENDGRID_API_KEY is not configured."""
        app_context.config["SENDGRID_API_KEY"] = None

        with patch.object(email_service, "SENDGRID_AVAILABLE", True):
            success, error = email_service.send_password_reset_email(
                "user@example.com",
                "tok123",
            )

        assert success is False
        assert "SENDGRID_API_KEY not configured" in error

    def test_missing_from_email(self, app_context):
        """Test returns error when EMAIL_FROM is not configured."""
        app_context.config["EMAIL_FROM"] = None

        with patch.object(email_service, "SENDGRID_AVAILABLE", True):
            success, error = email_service.send_password_reset_email(
                "user@example.com",
                "tok123",
            )

        assert success is False
        assert "EMAIL_FROM not configured" in error

    def test_missing_frontend_url(self, app_context):
        """Test returns error when FRONTEND_URL is not configured."""
        app_context.config["FRONTEND_URL"] = None

        with patch.object(email_service, "SENDGRID_AVAILABLE", True):
            success, error = email_service.send_password_reset_email(
                "user@example.com",
                "tok123",
            )

        assert success is False
        assert "FRONTEND_URL not configured" in error

    def test_successful_send(self, app_context):
        """Test successful email send with valid configuration."""
        mock_response = MagicMock(status_code=202)
        mock_sg_instance = MagicMock()
        mock_sg_instance.send.return_value = mock_response

        with (
            patch.object(email_service, "SENDGRID_AVAILABLE", True),
            patch.object(
                email_service,
                "SendGridAPIClient",
                return_value=mock_sg_instance,
            ) as mock_client,
            patch.object(email_service, "Mail") as mock_mail,
        ):
            success, error = email_service.send_password_reset_email(
                "user@example.com",
                "tok123",
            )

        assert success is True
        assert error is None
        mock_client.assert_called_once_with("test-api-key")
        mock_mail.assert_called_once()
        mock_sg_instance.send.assert_called_once()

    def test_sendgrid_non_success_status(self, app_context):
        """Test handles non-success status codes from SendGrid."""
        mock_response = MagicMock(status_code=400, body=b"Bad Request")
        mock_sg_instance = MagicMock()
        mock_sg_instance.send.return_value = mock_response

        with (
            patch.object(email_service, "SENDGRID_AVAILABLE", True),
            patch.object(
                email_service,
                "SendGridAPIClient",
                return_value=mock_sg_instance,
            ),
            patch.object(email_service, "Mail"),
        ):
            success, error = email_service.send_password_reset_email(
                "user@example.com",
                "tok123",
            )

        assert success is False
        assert "400" in error

    def test_send_raises_exception(self, app_context):
        """Test handles exceptions during email send."""
        mock_sg_instance = MagicMock()
        mock_sg_instance.send.side_effect = Exception("connection failed")

        with (
            patch.object(email_service, "SENDGRID_AVAILABLE", True),
            patch.object(
                email_service,
                "SendGridAPIClient",
                return_value=mock_sg_instance,
            ),
            patch.object(email_service, "Mail"),
        ):
            success, error = email_service.send_password_reset_email(
                "user@example.com",
                "tok123",
            )

        assert success is False
        assert error == "connection failed"

    def test_reset_link_uses_frontend_url_and_token(self, app_context):
        """Test that reset link includes frontend URL and token."""
        mock_response = MagicMock(status_code=200)
        mock_sg_instance = MagicMock()
        mock_sg_instance.send.return_value = mock_response

        with (
            patch.object(email_service, "SENDGRID_AVAILABLE", True),
            patch.object(
                email_service,
                "SendGridAPIClient",
                return_value=mock_sg_instance,
            ),
            patch.object(email_service, "Mail") as mock_mail,
        ):
            email_service.send_password_reset_email("user@example.com", "abc-token")

        # Get the call arguments - Mail is called with positional args and kwargs
        call_args = mock_mail.call_args
        kwargs = call_args.kwargs if call_args.kwargs else {}

        # The html_content is passed as a kwarg
        html_content = kwargs.get("html_content", "")
        assert "abc-token" in html_content
        assert (
            "https://example.com/reset-password?token=abc-token"
            in html_content
        )
