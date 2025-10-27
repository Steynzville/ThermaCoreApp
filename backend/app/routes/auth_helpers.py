"""Helper functions for auth route refactoring."""

import secrets
from datetime import datetime, timezone
from typing import Any

from flask import current_app, request
from flask_jwt_extended import create_access_token, create_refresh_token

from app import db
from app.exceptions import ValidationException
from app.models import User
from app.utils.error_handler import SecurityAwareErrorHandler


def validate_login_credentials(data: dict[str, Any]) -> tuple[Any, int] | None:
    """Validate login credentials presence.

    Args:
        data: Login data dictionary

    Returns:
        Error response tuple or None if valid
    """
    if not data.get("username") or not data.get("password"):
        current_app.logger.warning(
            "Login attempt with missing credentials",
            extra={"username": data.get("username", "UNKNOWN")},
        )
        return SecurityAwareErrorHandler.handle_service_error(
            Exception("Missing username or password"),
            "validation_error",
            "Credential validation",
            400,
        )
    return None


def fetch_user(username: str) -> tuple[Any | None, tuple[Any, int] | None]:
    """Fetch user from database with error handling.

    Args:
        username: Username to look up

    Returns:
        Tuple of (user, error_response)
    """
    try:
        user = User.query.filter_by(username=username).first()
        return user, None
    except Exception as db_error:
        current_app.logger.exception(
            f"Database error during login query: {db_error}",
            extra={
                "event": "database_error",
                "operation": "user_query",
                "username": username,
            },
        )
        return None, SecurityAwareErrorHandler.handle_service_error(
            db_error,
            "database_error",
            "Database connection failed",
            500,
        )


def check_user_can_login(user: Any) -> tuple[Any, int] | None:
    """Check if user is allowed to login.

    Args:
        user: User object

    Returns:
        Error response tuple or None if user can login
    """
    if not user.can_login():
        # Log different messages based on the reason for denial
        if not user.is_active:
            current_app.logger.warning(
                f"Login attempt for inactive user: {user.username}",
                extra={
                    "event": "login_failed",
                    "username": user.username,
                    "reason": "inactive_account",
                },
            )
            from app.middleware.audit import (  # noqa: PLC0415
                audit_login_failure,
            )

            audit_login_failure(user.username, "inactive_account")
            return SecurityAwareErrorHandler.handle_service_error(
                Exception("Account is inactive"),
                "authentication_error",
                "Account status",
                401,
            )
        if user.registration_status != "approved":
            current_app.logger.warning(
                f"Login attempt for unapproved user: {user.username} (status: {user.registration_status})",
                extra={
                    "event": "login_failed",
                    "username": user.username,
                    "reason": "pending_approval",
                    "registration_status": user.registration_status,
                },
            )
            from app.middleware.audit import (  # noqa: PLC0415
                audit_login_failure,
            )

            audit_login_failure(user.username, "pending_approval")
            return SecurityAwareErrorHandler.handle_service_error(
                Exception("Account is pending approval"),
                "authentication_error",
                "Account approval",
                401,
            )
    return None


def validate_user_role(user: Any) -> tuple[Any, int] | None:
    """Validate that user has a properly configured role.

    Args:
        user: User object

    Returns:
        Error response tuple or None if role is valid
    """
    # Verify user has a role
    if not user.role or user.role_id is None:
        current_app.logger.error(
            f"User {user.username} has no role assigned (role_id: {user.role_id})",
            extra={
                "event": "missing_role",
                "username": user.username,
                "user_id": user.id,
                "role_id": user.role_id,
            },
        )
        return SecurityAwareErrorHandler.handle_service_error(
            Exception("User role not configured"),
            "configuration_error",
            "User configuration",
            500,
        )

    # Validate role has required attributes
    try:
        role_name = user.role.name.value
        if not role_name:
            raise ValidationException("Role name is empty")
    except AttributeError as attr_error:
        current_app.logger.exception(
            f"User {user.username} role object is malformed: {attr_error}",
            extra={
                "event": "malformed_role",
                "username": user.username,
                "user_id": user.id,
                "role_id": user.role_id,
            },
        )
        return SecurityAwareErrorHandler.handle_service_error(
            Exception("User role configuration is invalid"),
            "configuration_error",
            "Role validation",
            500,
        )
    except Exception as role_error:
        current_app.logger.exception(
            f"Unexpected error validating role for user {user.username}: {role_error}",
            extra={"event": "role_validation_error", "username": user.username},
        )
        return SecurityAwareErrorHandler.handle_service_error(
            role_error,
            "configuration_error",
            "Role validation",
            500,
        )
    return None


def update_last_login(user: Any) -> None:
    """Update user's last login timestamp.

    Args:
        user: User object
    """
    try:
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()
        db.session.refresh(user)
        current_app.logger.debug(
            f"Updated last_login for user {user.username}",
            extra={"event": "last_login_updated", "username": user.username},
        )
    except Exception as db_error:
        current_app.logger.exception(
            f"Database error updating last login: {db_error}",
            extra={
                "event": "last_login_update_failed",
                "username": user.username,
                "error_type": type(db_error).__name__,
            },
        )
        # Rollback the session to prevent inconsistent state
        try:
            db.session.rollback()
        except Exception as rollback_error:
            current_app.logger.exception(
                f"Failed to rollback after last_login error: {rollback_error}",
            )
        # Continue with login even if last_login update fails


def create_jwt_tokens(
    user: Any,
    keep_me_signed_in: bool = False,
) -> tuple[str | None, str | None, tuple[Any, int] | None]:
    """Create JWT access and refresh tokens for user.

    Args:
        user: User object
        keep_me_signed_in: If True, set token expiry to 30 days, else 24 hours

    Returns:
        Tuple of (access_token, refresh_token, error_response)
    """
    try:
        # Pre-validate user ID and role before token generation
        if not user.id:
            raise ValidationException("User ID is None or empty")
        if not user.role or not user.role.name:
            raise ValidationException("User role or role name is None")

        user_id_str = str(user.id)
        role_value = user.role.name.value

        additional_claims = {
            "jti": secrets.token_urlsafe(16),
            "role": role_value,
        }

        current_app.logger.debug(
            f"Creating tokens for user {user.username}",
            extra={
                "event": "token_generation",
                "username": user.username,
                "user_id": user_id_str,
                "role": role_value,
                "keep_me_signed_in": keep_me_signed_in,
            },
        )

        # Set expiry based on keep_me_signed_in
        # 30 days if keep_me_signed_in is True, 24 hours otherwise
        from datetime import timedelta
        
        if keep_me_signed_in:
            expires_delta = timedelta(days=30)
        else:
            expires_delta = timedelta(hours=24)

        access_token = create_access_token(
            identity=user_id_str,
            additional_claims=additional_claims,
            expires_delta=expires_delta,
        )
        refresh_token = create_refresh_token(
            identity=user_id_str,
            additional_claims={"jti": secrets.token_urlsafe(16)},
        )

        if not access_token or not refresh_token:
            raise ValidationException("Token generation returned empty token")

        return access_token, refresh_token, None

    except (ValueError, ValidationException, AttributeError) as error:
        current_app.logger.exception(
            f"Error during token generation: {error}",
            extra={
                "event": "token_generation_failed",
                "username": user.username,
                "error_type": type(error).__name__,
            },
        )
        return (
            None,
            None,
            SecurityAwareErrorHandler.handle_service_error(
                error,
                "token_generation_error",
                "Token generation",
                500,
            ),
        )
    except Exception as error:
        current_app.logger.exception(
            f"Unexpected error during token generation: {error}",
            extra={
                "event": "token_generation_failed",
                "username": user.username,
            },
        )
        return (
            None,
            None,
            SecurityAwareErrorHandler.handle_service_error(
                error,
                "token_generation_error",
                "Token generation",
                500,
            ),
        )


def audit_successful_login(user: Any) -> None:
    """Audit successful login event.

    Args:
        user: User object
    """
    try:
        from app.middleware.audit import (  # noqa: PLC0415 - Avoid circular import
            AuditEventType,
            AuditLogger,
        )

        AuditLogger.log_event(
            event_type=AuditEventType.LOGIN_SUCCESS,
            user_id=user.id,
            username=user.username,
            action="login",
            details={"login_method": "password"},
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
            outcome="success",
        )
    except Exception as audit_error:
        current_app.logger.exception(
            f"Failed to audit successful login: {audit_error}",
            extra={"event": "audit_failure", "username": user.username},
        )


def build_login_response(
    user: Any, access_token: str, refresh_token: str
) -> dict[str, Any]:
    """Build successful login response.

    Args:
        user: User object
        access_token: JWT access token
        refresh_token: JWT refresh token

    Returns:
        Response dictionary
    """
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.name.value,
            "company_id": user.company_id,
        },
    }


def log_login_attempt(username: str) -> None:
    """Log login attempt with context.

    Args:
        username: Username being used for login
    """
    current_app.logger.info(
        f"Login attempt for username: {username}",
        extra={
            "event": "login_attempt",
            "username": username,
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", "UNKNOWN"),
        },
    )


def handle_invalid_credentials(username: str) -> tuple[Any, int]:
    """Handle invalid login credentials.

    Args:
        username: Username that failed login

    Returns:
        Error response tuple
    """
    current_app.logger.warning(
        f"Invalid credentials for username: {username}",
        extra={
            "event": "login_failed",
            "username": username,
            "reason": "invalid_credentials",
        },
    )
    from app.middleware.audit import (  # noqa: PLC0415
        audit_login_failure,
    )

    audit_login_failure(username, "invalid_credentials")
    return SecurityAwareErrorHandler.handle_service_error(
        Exception("Invalid credentials"),
        "authentication_error",
        "Credential validation",
        401,
    )
