"""Authentication routes for ThermaCore SCADA API."""

import logging
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from webargs.flaskparser import use_args

from app import db
from app.exceptions import ValidationException
from app.middleware.audit import AuditEventType, AuditLogger
from app.middleware.authorization import permission_required
from app.middleware.rate_limit import auth_rate_limit, standard_rate_limit
from app.middleware.request_id import track_request_id
from app.models import Role, User
from app.utils.company_identifier import CompanyIdentifier
from app.utils.error_handler import SecurityAwareErrorHandler
from app.utils.helpers import get_current_user_id, get_role_permissions
from app.utils.schemas import (
    ForgotPasswordSchema,
    LoginSchema,
    PasswordChangeSchema,
    PasswordResetSchema,
    TokenSchema,
    UserCreateSchema,
    UserSchema,
    UserSelfRegisterSchema,
)

auth_bp = Blueprint("auth", __name__)


# ============================================================
# TEST ROUTE - To verify auth blueprint is working
# ============================================================
@auth_bp.route("/auth/ping", methods=["GET"])
def ping():
    """Simple ping endpoint to verify auth blueprint is working."""
    return jsonify({"status": "ok", "message": "Auth blueprint is alive!"}), 200


@auth_bp.route("/auth/register", methods=["POST"])
@track_request_id
@standard_rate_limit
@jwt_required()
@permission_required("write_users")
@use_args(UserCreateSchema, location="json")
def register(data):
    """Register a new user.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: user_data
        schema:
          $ref: '#/definitions/UserCreateSchema'
    responses:
      201:
        description: User created successfully
        schema:
          $ref: '#/definitions/UserSchema'
      400:
        description: Validation error
      409:
        description: User already exists
      429:
        description: Rate limit exceeded
    security:
      - JWT: []
    """
    # Check if role exists
    role = Role.query.get(data["role_id"])
    if not role:
        return SecurityAwareErrorHandler.handle_service_error(
            Exception("Role not found"),
            "validation_error",
            "Role validation",
            400,
        )

    # Get permissions for this role
    role_permissions = get_role_permissions(role.name.value)

    # Generate company identifier if company is provided
    company_identifier = None
    if data.get("company"):
        company_identifier = CompanyIdentifier.generate(
            data["company"],
            data["email"],
        )

    # Create new user
    user = User(
        username=data["username"],
        email=data["email"],
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        phone_number=data.get("phone_number"),
        company=data.get("company"),
        company_identifier=company_identifier,
        department=data.get("department"),
        position=data.get("position"),
        role_id=data["role_id"],
        permissions=role_permissions,  # Set permissions based on role
    )
    user.set_password(data["password"])

    try:
        db.session.add(user)
        db.session.commit()

        # Refresh to get database-generated timestamp
        db.session.refresh(user)

        user_schema = UserSchema()
        return SecurityAwareErrorHandler.create_success_response(
            user_schema.dump(user),
            "User created successfully",
            201,
        )

    except IntegrityError as e:
        db.session.rollback()
        if "username" in str(e.orig):
            error_msg = "Username already exists"
        elif "email" in str(e.orig):
            error_msg = "Email already exists"
        else:
            error_msg = "Database constraint violation"

        return SecurityAwareErrorHandler.handle_service_error(
            e,
            "validation_error",
            f"User creation: {error_msg}",
            409,
        )


@auth_bp.route("/auth/self-register", methods=["POST"])
@track_request_id
@standard_rate_limit
@use_args(UserSelfRegisterSchema, location="json")
def self_register(data):
    """Public self-registration endpoint for new users.
    Creates users in 'pending' status awaiting admin approval.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: user_data
        schema:
          $ref: '#/definitions/UserSelfRegisterSchema'
    responses:
      201:
        description: Registration request submitted successfully
      400:
        description: Validation error
      409:
        description: User already exists
      429:
        description: Rate limit exceeded
    """
    # Self-registered users always get viewer role
    viewer_role = Role.query.filter_by(name="viewer").first()
    if not viewer_role:
        return SecurityAwareErrorHandler.handle_service_error(
            Exception("Viewer role not found"),
            "configuration_error",
            "System configuration",
            500,
        )

    # Generate company identifier if company is provided
    company_identifier = None
    if data.get("company"):
        company_identifier = CompanyIdentifier.generate(
            data["company"],
            data["email"],
        )

    # Create new user in pending status
    user = User(
        username=data["username"],
        email=data["email"],
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        phone_number=data.get("phone_number"),
        company=data.get("company"),
        company_identifier=company_identifier,
        department=data.get("department"),
        position=data.get("position"),
        role_id=viewer_role.id,
        registration_status="pending",  # Self-registered users start as pending
        permissions=None,  # No permissions until approved
    )
    user.set_password(data["password"])

    try:
        db.session.add(user)
        db.session.commit()

        # Refresh to get database-generated timestamp
        db.session.refresh(user)

        return SecurityAwareErrorHandler.create_success_response(
            {
                "message": "Registration request submitted successfully. Your account is pending admin approval.",
                "username": user.username,
                "email": user.email,
                "registration_status": "pending",
            },
            "Registration request submitted successfully",
            201,
        )

    except IntegrityError as e:
        db.session.rollback()
        if "username" in str(e.orig):
            error_msg = "Username already exists"
        elif "email" in str(e.orig):
            error_msg = "Email already exists"
        else:
            error_msg = "Database constraint violation"

        return SecurityAwareErrorHandler.handle_service_error(
            e,
            "validation_error",
            f"User registration: {error_msg}",
            409,
        )


@auth_bp.route("/auth/login", methods=["POST"])
@track_request_id
@auth_rate_limit
@use_args(LoginSchema, location="json")
def login(data):
    """Authenticate user and return JWT tokens.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: credentials
        schema:
          $ref: '#/definitions/LoginSchema'
    responses:
      200:
        description: Login successful
        schema:
          $ref: '#/definitions/TokenSchema'
      400:
        description: Validation error
      401:
        description: Invalid credentials
      429:
        description: Rate limit exceeded
    """
    from app.routes.auth_helpers import (  # noqa: PLC0415 - Avoid circular import between auth modules
        audit_successful_login,
        check_user_can_login,
        create_jwt_tokens,
        fetch_user,
        handle_invalid_credentials,
        log_login_attempt,
        update_last_login,
        validate_login_credentials,
        validate_user_role,
    )

    try:
        # Log authentication attempt
        log_login_attempt(data.get("username", "UNKNOWN"))

        # Validate required fields
        error = validate_login_credentials(data)
        if error:
            return error

        # Fetch user from database
        user, error = fetch_user(data["username"])
        if error:
            return error

        # Verify password and user status
        if not user or not user.check_password(data["password"]):
            return handle_invalid_credentials(data.get("username", "unknown"))

        # Check if user can login (active and approved)
        error = check_user_can_login(user)
        if error:
            return error

        # Validate user has proper role
        error = validate_user_role(user)
        if error:
            return error

        # Update last login timestamp
        update_last_login(user)

        # Get keep_me_signed_in parameter (defaults to False)
        keep_me_signed_in = data.get("keep_me_signed_in", False)

        # Create JWT tokens with appropriate expiry
        access_token, refresh_token, error = create_jwt_tokens(user, keep_me_signed_in)
        if error:
            return error

        # Audit successful login
        audit_successful_login(user)

        # Build and serialize response
        try:
            # Pre-validate configuration
            if "JWT_ACCESS_TOKEN_EXPIRES" not in current_app.config:
                current_app.logger.error("JWT_ACCESS_TOKEN_EXPIRES not configured")
                raise ValidationException("JWT configuration incomplete")

            token_schema = TokenSchema()

            # Calculate expires_in based on keep_me_signed_in
            if keep_me_signed_in:
                expires_in_seconds = timedelta(days=30).total_seconds()
            else:
                expires_in_seconds = timedelta(hours=24).total_seconds()

            response_data = {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_in": expires_in_seconds,
                "user": user,
            }

            serialized_data = token_schema.dump(response_data)

            # Validate serialized data
            if not serialized_data.get("access_token") or not serialized_data.get(
                "user",
            ):
                raise ValidationException("Serialization produced incomplete data")

            current_app.logger.info(
                f"Login successful for user {user.username}",
                extra={
                    "event": "login_success",
                    "username": user.username,
                    "user_id": user.id,
                    "role": user.role.name.value,
                },
            )

            return SecurityAwareErrorHandler.create_success_response(
                serialized_data,
                "Login successful",
                200,
            )
        except (ValueError, ValidationException) as val_error:
            current_app.logger.exception(
                "Validation error during serialization",
                extra={
                    "event": "serialization_validation_error",
                    "username": user.username,
                },
            )
            return SecurityAwareErrorHandler.handle_service_error(
                val_error,
                "configuration_error",
                "Response validation failed",
                500,
            )
        except Exception as serialization_error:
            current_app.logger.exception(
                "Error serializing login response",
                extra={
                    "event": "serialization_failed",
                    "username": user.username,
                    "error_type": type(serialization_error).__name__,
                },
            )
            return SecurityAwareErrorHandler.handle_service_error(
                serialization_error,
                "internal_error",
                "Response serialization failed",
                500,
            )

    except Exception as e:
        # Catch-all for any unexpected errors
        current_app.logger.exception(
            "Unexpected error in login endpoint",
            extra={
                "event": "login_unexpected_error",
                "username": data.get("username", "UNKNOWN") if data else "NO_DATA",
                "error_type": type(e).__name__,
                "error_message": str(e),
                "ip_address": request.remote_addr,
                "user_agent": request.headers.get("User-Agent", "UNKNOWN"),
            },
        )

        # Ensure database session is clean after error
        try:
            db.session.rollback()
        except Exception:
            current_app.logger.exception(
                "Failed to rollback session after unexpected error",
            )

        return SecurityAwareErrorHandler.handle_service_error(
            e,
            "internal_error",
            "Login processing",
            500,
        )


@auth_bp.route("/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token.
    ---
    tags:
      - Authentication
    responses:
      200:
        description: Token refreshed successfully
        schema:
          type: object
          properties:
            access_token:
              type: string
            expires_in:
              type: integer
      401:
        description: Invalid refresh token
    security:
      - JWT: []
    """
    try:
        # Get and validate user ID from token
        user_id, success = get_current_user_id()
        if not success or user_id is None:
            current_app.logger.warning(
                "Token refresh failed: Invalid token format",
                extra={"event": "refresh_invalid_token"},
            )
            return SecurityAwareErrorHandler.handle_service_error(
                Exception("Invalid token format"),
                "authentication_error",
                "Token validation",
                401,
            )

        # Query user with database error handling
        try:
            user = User.query.get(user_id)
        except Exception as db_error:
            current_app.logger.exception(
                "Database error during refresh query",
                extra={"event": "refresh_database_error", "user_id": user_id},
            )
            return SecurityAwareErrorHandler.handle_service_error(
                db_error,
                "database_error",
                "Database query failed",
                500,
            )

        # Validate user exists and is active
        if not user:
            current_app.logger.warning(
                f"Token refresh failed: User not found (ID: {user_id})",
                extra={"event": "refresh_user_not_found", "user_id": user_id},
            )
            return SecurityAwareErrorHandler.handle_service_error(
                Exception("User not found"),
                "authentication_error",
                "User validation",
                401,
            )

        if not user.is_active:
            current_app.logger.warning(
                f"Token refresh failed: User inactive (username: {user.username})",
                extra={"event": "refresh_user_inactive", "username": user.username},
            )
            return SecurityAwareErrorHandler.handle_service_error(
                Exception("User inactive"),
                "authentication_error",
                "User validation",
                401,
            )

        # Verify role is properly configured
        if not user.role or not user.role.name:
            current_app.logger.error(
                f"Token refresh failed: User {user.username} has invalid role configuration",
                extra={
                    "event": "refresh_invalid_role",
                    "username": user.username,
                    "role_id": user.role_id,
                },
            )
            return SecurityAwareErrorHandler.handle_service_error(
                Exception("User role configuration invalid"),
                "configuration_error",
                "Role validation",
                500,
            )

        # Create new access token with security claims
        try:
            additional_claims = {
                "jti": secrets.token_urlsafe(16),
                "role": user.role.name.value,
            }
            access_token = create_access_token(
                identity=str(user.id),
                additional_claims=additional_claims,
            )

            if not access_token:
                raise ValidationException("Token generation returned empty token")

        except Exception as token_error:
            current_app.logger.exception(
                "Error creating refresh token",
                extra={
                    "event": "refresh_token_generation_failed",
                    "username": user.username,
                    "error_type": type(token_error).__name__,
                },
            )
            return SecurityAwareErrorHandler.handle_service_error(
                token_error,
                "internal_error",
                "Token generation failed",
                500,
            )

        # Audit token refresh (non-critical)
        try:
            AuditLogger.log_authentication_event(
                AuditEventType.TOKEN_REFRESH,
                username=user.username,
                outcome="success",
                details={
                    "user_id": user.id,
                    "role": user.role.name.value,
                    "ip_address": request.remote_addr,
                },
            )
        except Exception as audit_error:
            current_app.logger.warning(
                f"Error auditing token refresh: {audit_error}",
                extra={"event": "refresh_audit_error", "username": user.username},
            )

        current_app.logger.info(
            f"Token refresh successful for user {user.username}",
            extra={"event": "refresh_success", "username": user.username},
        )

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Token refreshed successfully",
                    "data": {
                        "access_token": access_token,
                        "expires_in": current_app.config[
                            "JWT_ACCESS_TOKEN_EXPIRES"
                        ].total_seconds(),
                    },
                },
            ),
            200,
        )

    except Exception as e:
        # Catch-all for unexpected errors
        current_app.logger.exception(
            "Unexpected error in refresh endpoint",
            extra={
                "event": "refresh_unexpected_error",
                "error_type": type(e).__name__,
                "error_message": str(e),
            },
        )
        return SecurityAwareErrorHandler.handle_service_error(
            e,
            "internal_error",
            "Token refresh processing",
            500,
        )


@auth_bp.route("/auth/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Get current authenticated user information.
    ---
    tags:
      - Authentication
    responses:
      200:
        description: Current user information
        schema:
          $ref: '#/definitions/UserSchema'
      401:
        description: Invalid token
    security:
      - JWT: []
    """
    user_id, success = get_current_user_id()
    if not success or user_id is None:
        return SecurityAwareErrorHandler.handle_service_error(
            Exception("Invalid token format"),
            "authentication_error",
            "Token validation",
            401,
        )

    user = User.query.get(user_id)

    if not user or not user.is_active:
        return SecurityAwareErrorHandler.handle_service_error(
            Exception("User not found or inactive"),
            "authentication_error",
            "User validation",
            401,
        )

    user_schema = UserSchema()
    return jsonify(user_schema.dump(user)), 200


@auth_bp.route("/auth/logout", methods=["POST"])
@jwt_required()
def logout():
    """Logout user (client-side token invalidation).
    ---
    tags:
      - Authentication
    responses:
      200:
        description: Logout successful
    security:
      - JWT: []
    """
    # In a production environment, you would typically blacklist the token
    # For now, we rely on client-side token removal
    return jsonify({"message": "Logout successful"}), 200


@auth_bp.route("/auth/change-password", methods=["POST"])
@jwt_required()
@use_args(PasswordChangeSchema, location="json")
def change_password(data):
    """Change user password.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: password_data
        schema:
          $ref: '#/definitions/PasswordChangeSchema'
    responses:
      200:
        description: Password changed successfully
      400:
        description: Validation error
      401:
        description: Invalid current password
      422:
        description: Validation error
    security:
      - JWT: []
    """
    try:
        user_id, success = get_current_user_id()
        if not success or user_id is None:
            return SecurityAwareErrorHandler.handle_service_error(
                Exception("Invalid token format"),
                "authentication_error",
                "Token validation",
                401,
            )

        user = User.query.get(user_id)

        if not user or not user.is_active:
            return SecurityAwareErrorHandler.handle_service_error(
                Exception("User not found or inactive"),
                "authentication_error",
                "User validation",
                401,
            )

        if not user.check_password(data["current_password"]):
            return SecurityAwareErrorHandler.handle_service_error(
                Exception("Invalid current password"),
                "authentication_error",
                "Password verification",
                401,
            )

        user.set_password(data["new_password"])
        db.session.commit()

        return SecurityAwareErrorHandler.create_success_response(
            {"message": "Password changed successfully"},
            "Password changed successfully",
            200,
        )

    except Exception as e:
        current_app.logger.exception(
            f"Error changing password: {e}",
            extra={"event": "password_change_error"},
        )
        db.session.rollback()
        return SecurityAwareErrorHandler.handle_service_error(
            e,
            "internal_error",
            "Password change",
            500,
        )


@auth_bp.route("/auth/forgot-password", methods=["POST"])
@track_request_id
@auth_rate_limit
@use_args(ForgotPasswordSchema, location="json")
def forgot_password(data):
    """Request password reset token.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: email_data
        schema:
          $ref: '#/definitions/ForgotPasswordSchema'
    responses:
      200:
        description: Password reset email sent (or user not found - same response for security)
      400:
        description: Validation error
      429:
        description: Rate limit exceeded
    """
    try:
        email = data.get("email")

        current_app.logger.info(
            f"Password reset requested for email: {email}",
            extra={
                "event": "password_reset_request",
                "email": email,
                "ip_address": request.remote_addr,
            },
        )

        # Find user by email
        user = User.query.filter_by(email=email).first()

        # Always return success response to prevent email enumeration
        if user and user.is_active:
            # Generate secure token
            from datetime import timedelta

            reset_token = secrets.token_urlsafe(32)

            # Ensure user object has both reset_token fields (for backward compatibility)
            if not all(
                hasattr(user, f) for f in ("reset_token", "reset_token_expires")
            ):
                current_app.logger.error(
                    "User model missing reset_token fields. Run database migration.",
                    extra={"event": "missing_reset_token_field"},
                )
                # Return success anyway to prevent email enumeration
                return SecurityAwareErrorHandler.create_success_response(
                    {
                        "message": "If the email exists, a password reset link has been sent",
                    },
                    "Password reset email sent",
                    200,
                )

            user.reset_token = reset_token
            user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)

            db.session.commit()

            current_app.logger.info(
                f"Password reset token generated for user: {user.username}",
                extra={
                    "event": "password_reset_token_generated",
                    "user_id": user.id,
                    "username": user.username,
                },
            )

            # ============================================================
            # Send password reset email
            # ============================================================
            from app.services.email_service import send_password_reset_email

            success, error = send_password_reset_email(email, reset_token)
            if not success:
                current_app.logger.error(
                    f"Failed to send reset email to {email}: {error}",
                    extra={"event": "password_reset_email_failed"},
                )
            else:
                current_app.logger.info(
                    f"Password reset email sent to {email}",
                    extra={"event": "password_reset_email_sent"},
                )

        # Always return success to prevent email enumeration
        return SecurityAwareErrorHandler.create_success_response(
            {"message": "If the email exists, a password reset link has been sent"},
            "Password reset email sent",
            200,
        )

    except Exception as e:
        current_app.logger.exception(
            f"Error processing password reset request: {e}",
            extra={"event": "password_reset_request_error"},
        )
        db.session.rollback()
        return SecurityAwareErrorHandler.handle_service_error(
            e,
            "internal_error",
            "Password reset request",
            500,
        )


@auth_bp.route("/auth/reset-password", methods=["POST"])
@track_request_id
@auth_rate_limit
@use_args(PasswordResetSchema, location="json")
def reset_password(data):
    """Reset password using token.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: reset_data
        schema:
          $ref: '#/definitions/PasswordResetSchema'
    responses:
      200:
        description: Password reset successfully
      400:
        description: Invalid or expired token
      429:
        description: Rate limit exceeded
    """
    try:
        token = data.get("token")
        new_password = data.get("new_password")

        current_app.logger.info(
            "Password reset attempt with token",
            extra={
                "event": "password_reset_attempt",
                "ip_address": request.remote_addr,
            },
        )

        # Defensive check for reset_token column existence
        if not hasattr(User, "reset_token"):
            return SecurityAwareErrorHandler.handle_service_error(
                Exception("Invalid or expired reset token"),
                "authentication_error",
                "Password reset",
                400,
            )
        # Find user with valid token
        user = User.query.filter_by(reset_token=token).first()

        if not user:
            current_app.logger.warning(
                "Password reset failed: Invalid token",
                extra={"event": "password_reset_invalid_token"},
            )
            return SecurityAwareErrorHandler.handle_service_error(
                Exception("Invalid or expired reset token"),
                "authentication_error",
                "Password reset",
                400,
            )

        # Check if token is expired
        # Handle timezone comparison - ensure both datetimes are timezone-aware
        current_time = datetime.now(timezone.utc)

        # If reset_token_expires is naive (no timezone), make it timezone-aware (UTC)
        token_expires = user.reset_token_expires
        if token_expires and token_expires.tzinfo is None:
            token_expires = token_expires.replace(tzinfo=timezone.utc)

        if not token_expires or token_expires < current_time:
            current_app.logger.warning(
                f"Password reset failed: Expired token for user {user.username}",
                extra={
                    "event": "password_reset_expired_token",
                    "username": user.username,
                },
            )
            # Clear expired token
            user.reset_token = None
            user.reset_token_expires = None
            db.session.commit()

            return SecurityAwareErrorHandler.handle_service_error(
                Exception("Invalid or expired reset token"),
                "authentication_error",
                "Password reset",
                400,
            )

        # Reset password
        user.set_password(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()

        current_app.logger.info(
            f"Password reset successful for user: {user.username}",
            extra={
                "event": "password_reset_success",
                "user_id": user.id,
                "username": user.username,
            },
        )

        return SecurityAwareErrorHandler.create_success_response(
            {"message": "Password reset successfully"},
            "Password reset successfully",
            200,
        )

    except Exception as e:
        current_app.logger.exception(
            f"Error resetting password: {e}",
            extra={"event": "password_reset_error"},
        )
        db.session.rollback()
        return SecurityAwareErrorHandler.handle_service_error(
            e,
            "internal_error",
            "Password reset",
            500,
        )


@auth_bp.route("/auth/emergency-admin", methods=["POST"])
@track_request_id
def emergency_admin():
    """Emergency admin account creation/update endpoint.

    This endpoint uses raw SQL to create or update an emergency admin account,
    avoiding ORM issues if password reset columns are missing. It's designed
    to work on Render free plan without shell access.

    Creates/updates user: emergency_admin / EmergencyAdmin123!

    ---
    tags:
      - Authentication
    responses:
      200:
        description: Emergency admin account created/updated successfully
      500:
        description: Server error
    """
    try:
        logger = logging.getLogger(__name__)
        logger.info(
            "Emergency admin endpoint called",
            extra={
                "event": "emergency_admin_request",
                "ip_address": request.remote_addr,
            },
        )

        # Use raw SQL to avoid ORM column issues
        # First, check if emergency admin user exists
        with db.engine.begin() as conn:
            # Get the admin role ID (typically 1, but let's query it to be safe)
            result = conn.execute(
                text(
                    "SELECT id FROM roles WHERE name = 'admin' LIMIT 1",
                ),
            )
            admin_role = result.fetchone()

            if not admin_role:
                logger.error("Admin role not found in database")
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception("Admin role not configured"),
                    "configuration_error",
                    "Emergency admin setup",
                    500,
                )

            admin_role_id = admin_role[0]

            # Create password hash for EmergencyAdmin123!
            import json  # noqa: PLC0415 - Standard library, conditional usage

            from werkzeug.security import generate_password_hash

            # Import centralized permissions constant from models
            from app.models import EMERGENCY_ADMIN_PERMISSIONS

            emergency_password_hash = generate_password_hash(
                "EmergencyAdmin123!",
                method="pbkdf2:sha256",
            )

            # Use centralized emergency admin permissions constant
            # Ensures consistency across auth endpoint, auto-migration, and permission checks
            emergency_permissions = json.dumps(EMERGENCY_ADMIN_PERMISSIONS)

            # Check if emergency_admin user exists
            result = conn.execute(
                text(
                    "SELECT id FROM users WHERE username = 'emergency_admin'",
                ),
            )
            existing_user = result.fetchone()

            if existing_user:
                # Update existing user - grant comprehensive permissions
                logger.info(
                    "Updating existing emergency_admin user with full permissions",
                )
                conn.execute(
                    text(
                        """
                    UPDATE users
                    SET password_hash = :password_hash,
                        email = :email,
                        role_id = :role_id,
                        is_active = :is_active,
                        first_name = :first_name,
                        last_name = :last_name,
                        permissions = :permissions,
                        registration_status = :registration_status,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE username = :username
                    """,
                    ),
                    {
                        "password_hash": emergency_password_hash,
                        "email": "emergency@thermacore.local",
                        "role_id": admin_role_id,
                        "is_active": True,
                        "first_name": "Emergency",
                        "last_name": "Admin",
                        "permissions": emergency_permissions,
                        "registration_status": "approved",
                        "username": "emergency_admin",
                    },
                )
                logger.info(
                    "✓ Emergency admin user updated successfully with comprehensive permissions",
                )
            else:
                # Create new user - grant comprehensive permissions
                logger.info("Creating new emergency_admin user with full permissions")
                conn.execute(
                    text(
                        """
                    INSERT INTO users (username, email, password_hash, role_id, is_active, first_name, last_name, permissions, registration_status, created_at, updated_at)
                    VALUES (:username, :email, :password_hash, :role_id, :is_active, :first_name, :last_name, :permissions, :registration_status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """,
                    ),
                    {
                        "username": "emergency_admin",
                        "email": "emergency@thermacore.local",
                        "password_hash": emergency_password_hash,
                        "role_id": admin_role_id,
                        "is_active": True,
                        "first_name": "Emergency",
                        "last_name": "Admin",
                        "permissions": emergency_permissions,
                        "registration_status": "approved",
                    },
                )
                logger.info(
                    "✓ Emergency admin user created successfully with comprehensive permissions",
                )

        logger.info(
            "Emergency admin account ready",
            extra={
                "event": "emergency_admin_success",
                "username": "emergency_admin",
            },
        )

        return SecurityAwareErrorHandler.create_success_response(
            {
                "message": "Emergency admin account created/updated successfully",
                "username": "emergency_admin",
                "note": "Use password: EmergencyAdmin123! to login. CHANGE THIS PASSWORD IMMEDIATELY after login.",
            },
            "Emergency admin ready",
            200,
        )

    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.exception(
            f"Error in emergency admin endpoint: {e}",
            extra={"event": "emergency_admin_error"},
        )
        return SecurityAwareErrorHandler.handle_service_error(
            e,
            "internal_error",
            "Emergency admin creation",
            500,
        )


# ============================================================
# DEBUG: Print statements to confirm module loads
# ============================================================
