"""Authentication routes for ThermaCore SCADA API."""

import logging
import secrets
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
)
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from webargs.flaskparser import use_args

from app import db
from app.models import User, Role
from app.utils.schemas import (
    LoginSchema,
    UserCreateSchema,
    UserSchema,
    TokenSchema,
    PasswordChangeSchema,
    ForgotPasswordSchema,
    PasswordResetSchema,
)
from app.utils.helpers import get_current_user_id, get_role_permissions
from app.utils.error_handler import SecurityAwareErrorHandler
from app.middleware.rate_limit import auth_rate_limit, standard_rate_limit
from app.middleware.request_id import track_request_id
from app.middleware.authorization import permission_required
from app.middleware.audit import (
    audit_login_success,
    audit_login_failure,
    AuditLogger,
    AuditEventType,
)


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth/register", methods=["POST"])
@track_request_id
@standard_rate_limit
@jwt_required()
@permission_required("write_users")
@use_args(UserCreateSchema, location="json")
def register(data):
    """
    Register a new user.
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
            Exception("Role not found"), "validation_error", "Role validation", 400
        )

    # Get permissions for this role
    role_permissions = get_role_permissions(role.name.value)

    # Create new user
    user = User(
        username=data["username"],
        email=data["email"],
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
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
            user_schema.dump(user), "User created successfully", 201
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
            e, "validation_error", f"User creation: {error_msg}", 409
        )


@auth_bp.route("/auth/login", methods=["POST"])
@track_request_id
@auth_rate_limit
@use_args(LoginSchema, location="json")
def login(data):
    """
    Authenticate user and return JWT tokens.
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

    try:
        # Log authentication attempt with context
        current_app.logger.info(
            f"Login attempt for username: {data.get('username', 'UNKNOWN')}",
            extra={
                "event": "login_attempt",
                "username": data.get("username", "UNKNOWN"),
                "ip_address": request.remote_addr,
                "user_agent": request.headers.get("User-Agent", "UNKNOWN"),
            },
        )

        # Additional validation for required fields (defense in depth)
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

        # Database query - handle connection errors with retry logic
        try:
            user = User.query.filter_by(username=data["username"]).first()
        except Exception as db_error:
            current_app.logger.error(
                f"Database error during login query: {db_error}",
                exc_info=True,
                extra={
                    "event": "database_error",
                    "operation": "user_query",
                    "username": data.get("username", "UNKNOWN"),
                },
            )
            return SecurityAwareErrorHandler.handle_service_error(
                db_error, "database_error", "Database connection failed", 500
            )

        if user and user.check_password(data["password"]) and user.is_active:
            # Verify user has a role (critical requirement with enhanced validation)
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

            # Additional validation: Verify role has required attributes
            try:
                role_name = user.role.name.value
                if not role_name:
                    raise ValueError("Role name is empty")
            except AttributeError as attr_error:
                current_app.logger.error(
                    f"User {user.username} role object is malformed: {attr_error}",
                    exc_info=True,
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
                current_app.logger.error(
                    f"Unexpected error validating role for user {user.username}: {role_error}",
                    exc_info=True,
                    extra={"event": "role_validation_error", "username": user.username},
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    role_error, "configuration_error", "Role validation", 500
                )

            # Update last login with enhanced database error handling
            try:
                user.last_login = datetime.now(timezone.utc)
                db.session.commit()

                # Refresh to get database-generated timestamp
                db.session.refresh(user)
                current_app.logger.debug(
                    f"Updated last_login for user {user.username}",
                    extra={"event": "last_login_updated", "username": user.username},
                )
            except Exception as db_error:
                current_app.logger.error(
                    f"Database error updating last login: {db_error}",
                    exc_info=True,
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
                    current_app.logger.error(
                        f"Failed to rollback after last_login error: {rollback_error}",
                        exc_info=True,
                    )
                # Continue with login even if last_login update fails

            # Create tokens with string identity (JWT requirement)
            # Include additional security claims: iat (issued at) and jti (JWT ID)
            try:
                # Pre-validate user ID and role before token generation
                if not user.id:
                    raise ValueError("User ID is None or empty")
                if not user.role or not user.role.name:
                    raise ValueError("User role or role name is None")

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
                    },
                )

                access_token = create_access_token(
                    identity=user_id_str, additional_claims=additional_claims
                )
                refresh_token = create_refresh_token(
                    identity=user_id_str,
                    additional_claims={"jti": secrets.token_urlsafe(16)},
                )

                if not access_token or not refresh_token:
                    raise ValueError("Token generation returned empty token")

            except ValueError as val_error:
                current_app.logger.error(
                    f"Validation error during token generation: {val_error}",
                    exc_info=True,
                    extra={
                        "event": "token_validation_error",
                        "username": user.username,
                    },
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    val_error, "configuration_error", "Token generation validation", 500
                )
            except Exception as token_error:
                current_app.logger.error(
                    f"Error creating JWT tokens: {token_error}",
                    exc_info=True,
                    extra={
                        "event": "token_generation_failed",
                        "username": user.username,
                        "error_type": type(token_error).__name__,
                    },
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    token_error, "internal_error", "Token generation failed", 500
                )

            # Audit successful login (non-critical, log but don't fail)
            try:
                audit_login_success(
                    username=user.username,
                    details={
                        "user_id": user.id,
                        "role": user.role.name.value,
                        "last_login": user.last_login.isoformat()
                        if user.last_login
                        else None,
                        "ip_address": request.remote_addr,
                        "user_agent": request.headers.get("User-Agent", "UNKNOWN"),
                    },
                )
            except Exception as audit_error:
                current_app.logger.warning(
                    f"Error auditing login success: {audit_error}",
                    extra={
                        "event": "audit_error",
                        "username": user.username,
                        "error_type": type(audit_error).__name__,
                    },
                )

            # Serialize response with enhanced error handling
            try:
                # Pre-validate configuration before serialization
                if "JWT_ACCESS_TOKEN_EXPIRES" not in current_app.config:
                    current_app.logger.error("JWT_ACCESS_TOKEN_EXPIRES not configured")
                    raise ValueError("JWT configuration incomplete")

                token_schema = TokenSchema()

                response_data = {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "expires_in": current_app.config[
                        "JWT_ACCESS_TOKEN_EXPIRES"
                    ].total_seconds(),
                    "user": user,  # Pass model object, not serialized dict
                }

                # Attempt serialization with validation
                serialized_data = token_schema.dump(response_data)

                # Validate serialized data has required fields
                if not serialized_data.get("access_token") or not serialized_data.get(
                    "user"
                ):
                    raise ValueError("Serialization produced incomplete data")

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
                    serialized_data, "Login successful", 200
                )
            except ValueError as val_error:
                current_app.logger.error(
                    f"Validation error during serialization: {val_error}",
                    exc_info=True,
                    extra={
                        "event": "serialization_validation_error",
                        "username": user.username,
                    },
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    val_error, "configuration_error", "Response validation failed", 500
                )
            except Exception as serialization_error:
                current_app.logger.error(
                    f"Error serializing login response: {serialization_error}",
                    exc_info=True,
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

        # Audit failed login (non-critical, log but don't fail)
        username = data.get("username", "unknown")
        failure_reason = "invalid_credentials"

        # Determine specific failure reason for better diagnostics
        if not user:
            failure_reason = "user_not_found"
        elif not user.is_active:
            failure_reason = "inactive_user"
        elif not data.get("password"):
            failure_reason = "missing_or_empty_password"
        elif not user.check_password(data.get("password")):
            failure_reason = "incorrect_password"

        current_app.logger.warning(
            f"Login failed for username: {username}, reason: {failure_reason}",
            extra={
                "event": "login_failed",
                "username": username,
                "reason": failure_reason,
                "ip_address": request.remote_addr,
                "user_agent": request.headers.get("User-Agent", "UNKNOWN"),
            },
        )

        try:
            audit_login_failure(
                username=username,
                reason=failure_reason,
                details={
                    "attempted_username": username,
                    "ip_address": request.remote_addr,
                    "user_agent": request.headers.get("User-Agent", "UNKNOWN"),
                },
            )
        except Exception as audit_error:
            current_app.logger.warning(
                f"Error auditing login failure: {audit_error}",
                extra={"event": "audit_error", "username": username},
            )

        return SecurityAwareErrorHandler.handle_service_error(
            Exception("Invalid credentials"),
            "authentication_error",
            "Login attempt",
            401,
        )

    except Exception as e:
        # Catch-all for any unexpected errors with comprehensive logging
        current_app.logger.error(
            f"Unexpected error in login endpoint: {e}",
            exc_info=True,
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
        except Exception as rollback_error:
            current_app.logger.error(
                f"Failed to rollback session after unexpected error: {rollback_error}",
                exc_info=True,
            )

        return SecurityAwareErrorHandler.handle_service_error(
            e, "internal_error", "Login processing", 500
        )


@auth_bp.route("/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """
    Refresh access token using refresh token.
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
            current_app.logger.error(
                f"Database error during refresh query: {db_error}",
                exc_info=True,
                extra={"event": "refresh_database_error", "user_id": user_id},
            )
            return SecurityAwareErrorHandler.handle_service_error(
                db_error, "database_error", "Database query failed", 500
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
                identity=str(user.id), additional_claims=additional_claims
            )

            if not access_token:
                raise ValueError("Token generation returned empty token")

        except Exception as token_error:
            current_app.logger.error(
                f"Error creating refresh token: {token_error}",
                exc_info=True,
                extra={
                    "event": "refresh_token_generation_failed",
                    "username": user.username,
                    "error_type": type(token_error).__name__,
                },
            )
            return SecurityAwareErrorHandler.handle_service_error(
                token_error, "internal_error", "Token generation failed", 500
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

        return jsonify(
            {
                "access_token": access_token,
                "expires_in": current_app.config[
                    "JWT_ACCESS_TOKEN_EXPIRES"
                ].total_seconds(),
            }
        ), 200

    except Exception as e:
        # Catch-all for unexpected errors
        current_app.logger.error(
            f"Unexpected error in refresh endpoint: {e}",
            exc_info=True,
            extra={
                "event": "refresh_unexpected_error",
                "error_type": type(e).__name__,
                "error_message": str(e),
            },
        )
        return SecurityAwareErrorHandler.handle_service_error(
            e, "internal_error", "Token refresh processing", 500
        )


@auth_bp.route("/auth/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """
    Get current authenticated user information.
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
    """
    Logout user (client-side token invalidation).
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
    """
    Change user password.
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
            {"message": "Password changed successfully"}, "Password changed successfully", 200
        )

    except Exception as e:
        current_app.logger.error(
            f"Error changing password: {e}",
            exc_info=True,
            extra={"event": "password_change_error"},
        )
        db.session.rollback()
        return SecurityAwareErrorHandler.handle_service_error(
            e, "internal_error", "Password change", 500
        )


@auth_bp.route("/auth/forgot-password", methods=["POST"])
@track_request_id
@auth_rate_limit
@use_args(ForgotPasswordSchema, location="json")
def forgot_password(data):
    """
    Request password reset token.
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
            if not all(hasattr(user, f) for f in ('reset_token', 'reset_token_expires')):
                current_app.logger.error(
                    "User model missing reset_token fields. Run database migration.",
                    extra={"event": "missing_reset_token_field"},
                )
                # Return success anyway to prevent email enumeration
                return SecurityAwareErrorHandler.create_success_response(
                    {"message": "If the email exists, a password reset link has been sent"},
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

            # In production, send email with reset link here
            # For now, we'll just log the token (DO NOT DO THIS IN PRODUCTION)
            if current_app.config.get("DEBUG"):
                current_app.logger.debug(
                    f"Password reset token for {email}: {reset_token}",
                    extra={"event": "password_reset_token_debug"},
                )

        # Always return success to prevent email enumeration
        return SecurityAwareErrorHandler.create_success_response(
            {"message": "If the email exists, a password reset link has been sent"},
            "Password reset email sent",
            200,
        )

    except Exception as e:
        current_app.logger.error(
            f"Error processing password reset request: {e}",
            exc_info=True,
            extra={"event": "password_reset_request_error"},
        )
        db.session.rollback()
        return SecurityAwareErrorHandler.handle_service_error(
            e, "internal_error", "Password reset request", 500
        )


@auth_bp.route("/auth/reset-password", methods=["POST"])
@track_request_id
@auth_rate_limit
@use_args(PasswordResetSchema, location="json")
def reset_password(data):
    """
    Reset password using token.
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
        if not hasattr(User, 'reset_token'):
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
        current_app.logger.error(
            f"Error resetting password: {e}",
            exc_info=True,
            extra={"event": "password_reset_error"},
        )
        db.session.rollback()
        return SecurityAwareErrorHandler.handle_service_error(
            e, "internal_error", "Password reset", 500
        )


@auth_bp.route("/auth/emergency-admin", methods=["POST"])
@track_request_id
def emergency_admin():
    """
    Emergency admin account creation/update endpoint.
    
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
            result = conn.execute(text(
                "SELECT id FROM roles WHERE name = 'admin' LIMIT 1"
            ))
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
            from werkzeug.security import generate_password_hash
            import json
            # Import centralized permissions constant from models
            from app.models import EMERGENCY_ADMIN_PERMISSIONS
            
            emergency_password_hash = generate_password_hash("EmergencyAdmin123!", method="pbkdf2:sha256")
            
            # Use centralized emergency admin permissions constant
            # Ensures consistency across auth endpoint, auto-migration, and permission checks
            emergency_permissions = json.dumps(EMERGENCY_ADMIN_PERMISSIONS)
            
            # Check if emergency_admin user exists
            result = conn.execute(text(
                "SELECT id FROM users WHERE username = 'emergency_admin'"
            ))
            existing_user = result.fetchone()
            
            if existing_user:
                # Update existing user - grant comprehensive permissions
                logger.info("Updating existing emergency_admin user with full permissions")
                conn.execute(text(
                    """
                    UPDATE users 
                    SET password_hash = :password_hash,
                        email = :email,
                        role_id = :role_id,
                        is_active = :is_active,
                        first_name = :first_name,
                        last_name = :last_name,
                        permissions = :permissions,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE username = :username
                    """
                ), {
                    "password_hash": emergency_password_hash,
                    "email": "emergency@thermacore.local",
                    "role_id": admin_role_id,
                    "is_active": True,
                    "first_name": "Emergency",
                    "last_name": "Admin",
                    "permissions": emergency_permissions,
                    "username": "emergency_admin"
                })
                logger.info("✓ Emergency admin user updated successfully with comprehensive permissions")
            else:
                # Create new user - grant comprehensive permissions
                logger.info("Creating new emergency_admin user with full permissions")
                conn.execute(text(
                    """
                    INSERT INTO users (username, email, password_hash, role_id, is_active, first_name, last_name, permissions, created_at, updated_at)
                    VALUES (:username, :email, :password_hash, :role_id, :is_active, :first_name, :last_name, :permissions, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """
                ), {
                    "username": "emergency_admin",
                    "email": "emergency@thermacore.local",
                    "password_hash": emergency_password_hash,
                    "role_id": admin_role_id,
                    "is_active": True,
                    "first_name": "Emergency",
                    "last_name": "Admin",
                    "permissions": emergency_permissions
                })
                logger.info("✓ Emergency admin user created successfully with comprehensive permissions")
        
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
                "note": "Use password: EmergencyAdmin123! to login. CHANGE THIS PASSWORD IMMEDIATELY after login."
            },
            "Emergency admin ready",
            200,
        )
        
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(
            f"Error in emergency admin endpoint: {e}",
            exc_info=True,
            extra={"event": "emergency_admin_error"},
        )
        return SecurityAwareErrorHandler.handle_service_error(
            e, "internal_error", "Emergency admin creation", 500
        )
