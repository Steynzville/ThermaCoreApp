import logging

from flask import current_app

# Try to import sendgrid
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail

    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
    logging.getLogger(__name__).warning(
        "SendGrid not installed. Run: pip install sendgrid",
    )

logger = logging.getLogger(__name__)


def send_password_reset_email(email, token):
    """Send a password reset email using SendGrid API."""
    # Log minimal info - email is PII, token is sensitive
    logger.info("Password reset email requested")

    if not SENDGRID_AVAILABLE:
        logger.error("SendGrid library not installed. Run: pip install sendgrid")
        return False, "SendGrid library not installed"

    try:
        api_key = current_app.config.get("SENDGRID_API_KEY")
        from_email = current_app.config.get("EMAIL_FROM")
        frontend_url = current_app.config.get("FRONTEND_URL")

        if not api_key:
            logger.error("SENDGRID_API_KEY not configured")
            return False, "SENDGRID_API_KEY not configured"

        if not from_email:
            logger.error("EMAIL_FROM not configured")
            return False, "EMAIL_FROM not configured"

        if not frontend_url:
            logger.error("FRONTEND_URL not configured")
            return False, "FRONTEND_URL not configured"

        reset_link = f"{frontend_url}/reset-password?token={token}"
        logger.info("Reset link generated")

        message = Mail(
            from_email=from_email,
            to_emails=email,
            subject="Password Reset Request - ThermaCore",
            html_content=f"""
            <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>Hello,</p>
                <p>You requested a password reset for your ThermaCore account.</p>
                <p>Click the link below to reset your password:</p>
                <p><a href="{reset_link}">{reset_link}</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <br>
                <p>Best regards,<br>ThermaCore Team</p>
            </body>
            </html>
            """,
        )

        sg = SendGridAPIClient(api_key)
        response = sg.send(message)

        if response.status_code in [200, 202]:
            logger.info("Password reset email sent successfully")
            return True, None
        else:
            logger.error(
                "SendGrid error: %s - %s",
                response.status_code,
                response.body,
            )
            return False, f"SendGrid error: {response.status_code}"

    except Exception as e:
        logger.exception("Failed to send password reset email")
        return False, str(e)
