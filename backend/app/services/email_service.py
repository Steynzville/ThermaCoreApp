# backend/app/services/email_service.py
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

logger = logging.getLogger(__name__)


def send_password_reset_email(email, token):
    """Send a password reset email to the user.

    Args:
        email: Recipient email address
        token: Password reset token

    Returns:
        tuple: (success: bool, error: str | None)
    """
    try:
        # Get configuration from app config
        smtp_host = current_app.config.get('EMAIL_HOST')
        smtp_port = current_app.config.get('EMAIL_PORT')
        smtp_user = current_app.config.get('EMAIL_USER')
        smtp_password = current_app.config.get('EMAIL_PASSWORD')
        from_email = current_app.config.get('EMAIL_FROM', smtp_user)
        frontend_url = current_app.config.get('FRONTEND_URL')

        # Validate required config
        if not all([smtp_host, smtp_port, smtp_user, smtp_password, frontend_url]):
            logger.error("Email configuration incomplete. Please check EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, and FRONTEND_URL")
            return False, "Email configuration incomplete"

        # Build reset link
        reset_link = f"{frontend_url}/reset-password?token={token}"

        # Create message
        subject = "Password Reset Request - ThermaCore"
        body = f"""
Hello,

You requested a password reset for your ThermaCore account.

Click the link below to reset your password:

{reset_link}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
ThermaCore Team
"""

        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            if current_app.config.get('EMAIL_USE_TLS', True):
                server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        logger.info(f"Password reset email sent to {email}")
        return True, None

    except Exception as e:
        logger.error(f"Failed to send password reset email to {email}: {e}")
        return False, str(e)
