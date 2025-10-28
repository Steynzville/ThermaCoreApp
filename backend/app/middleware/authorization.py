"""Authorization middleware for ThermaCore SCADA API.

This module provides decorators for checking user permissions and roles.
It separates authorization (what users can do) from authentication (who they are).
"""

from functools import wraps

from flask import current_app, request
from flask_jwt_extended import verify_jwt_in_request

from app.middleware.audit import audit_permission_check
from app.models import User
from app.utils.error_handler import SecurityAwareErrorHandler
from app.utils.helpers import get_current_user_id

def _ensure_user_has_role(user):
    """Ensure user has a valid role assigned.

    This is a defensive check to handle edge cases where users might not have
    roles properly assigned. In a properly configured system, all users should
    have roles.

    Args:
        user: User object to check

    Returns:
        bool: True if user has a valid role, False otherwise

    """
    if not user.role or user.role_id is None:
        current_app.logger.error(
            f"User {user.username} (ID: {user.id}) has no role assigned",
            extra={
                "event": "missing_role",
                "username": user.username,
                "user_id": user.id,
            },
        )
        return False
    return True

def permission_required(permission):
    """Decorator to check if user has required permission.

    This decorator verifies that the authenticated user has the specified
    permission before allowing access to the decorated endpoint.

    Args:
        permission: Permission string or PermissionEnum value required

    Returns:
        Decorator function

    Example:
        @permission_required("read_users")
        def get_users():
            pass

    """

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Verify JWT token is present and valid
            verify_jwt_in_request()

            # Extract user ID from token
            user_id, success = get_current_user_id()
            if not success or user_id is None:
                # Audit failed permission check
                audit_permission_check(
                    permission=permission,
                    granted=False,
                    details={"reason": "Invalid token format"},
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception("Invalid token format"),
                    "authentication_error",
                    "Token validation",
                    401,
                )

            # Retrieve user from database
            user = User.query.get(user_id)

            if not user or not user.is_active:
                # Audit failed permission check - user not found/inactive
                audit_permission_check(
                    permission=permission,
                    granted=False,
                    user_id=user_id,
                    username=user.username if user else None,
                    details={"reason": "User not found or inactive"},
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception("User not found or inactive"),
                    "authentication_error",
                    "User validation",
                    401,
                )

            # Bypass permission checks for emergency_admin user
            # This allows the emergency admin to perform any action when active
            # Validation: Ensure permissions field is properly configured before bypass
            if user.username == "emergency_admin" and user.is_active:
                # Validate that emergency_admin has permissions configured
                # This prevents security issues if user exists but isn't properly set up
                if not user.permissions:
                    current_app.logger.warning(
                        f"Emergency admin bypass denied: {user.username} has no permissions configured",
                        extra={
                            "event": "emergency_admin_bypass_denied",
                            "username": user.username,
                            "reason": "missing_permissions",
                        },
                    )
                    # Continue to normal permission check instead of bypassing
                else:
                    current_app.logger.info(
                        f"Emergency admin bypass: Granting {permission} permission to {user.username}",
                        extra={
                            "event": "emergency_admin_bypass",
                            "username": user.username,
                            "permission": permission,
                        },
                    )
                    # Audit successful permission check with bypass note
                    audit_permission_check(
                        permission=permission,
                        granted=True,
                        user_id=user.id,
                        username=user.username,
                        resource=request.endpoint if request else None,
                        details={
                            "bypass": "emergency_admin",
                            "user_role": user.role.name.value if user.role else "N/A",
                        },
                    )
                    return f(*args, **kwargs)

            # Ensure user has a valid role
            if not _ensure_user_has_role(user):
                audit_permission_check(
                    permission=permission,
                    granted=False,
                    user_id=user.id,
                    username=user.username,
                    details={"reason": "User has no role assigned"},
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception("User role not configured"),
                    "configuration_error",
                    "Role validation",
                    500,
                )

            # Check if user has the required permission
            if not user.has_permission(permission):
                # Audit denied permission
                audit_permission_check(
                    permission=permission,
                    granted=False,
                    user_id=user.id,
                    username=user.username,
                    resource=request.endpoint if request else None,
                    details={
                        "reason": "Insufficient permissions",
                        "user_role": user.role.name.value,
                    },
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception("Insufficient permissions"),
                    "permission_error",
                    f"Permission check: {permission}",
                    403,
                )

            # Audit successful permission check
            audit_permission_check(
                permission=permission,
                granted=True,
                user_id=user.id,
                username=user.username,
                resource=request.endpoint if request else None,
                details={"user_role": user.role.name.value},
            )

            return f(*args, **kwargs)

        return decorated_function

    return decorator

def role_required(*roles):
    """Decorator to check if user has required role.

    This decorator verifies that the authenticated user has one of the
    specified roles before allowing access to the decorated endpoint.

    Args:
        *roles: One or more role names (strings) that are allowed

    Returns:
        Decorator function

    Example:
        @role_required("admin", "operator")
        def admin_function():
            pass

    """

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Verify JWT token is present and valid
            verify_jwt_in_request()

            # Extract user ID from token
            user_id, success = get_current_user_id()
            if not success or user_id is None:
                # Audit failed role check
                audit_permission_check(
                    permission=f"role:{','.join(roles)}",
                    granted=False,
                    details={"reason": "Invalid token format"},
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception("Invalid token format"),
                    "authentication_error",
                    "Token validation",
                    401,
                )

            # Retrieve user from database
            user = User.query.get(user_id)

            if not user or not user.is_active:
                # Audit failed role check - user not found/inactive
                audit_permission_check(
                    permission=f"role:{','.join(roles)}",
                    granted=False,
                    user_id=user_id,
                    username=user.username if user else None,
                    details={"reason": "User not found or inactive"},
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception("User not found or inactive"),
                    "authentication_error",
                    "User validation",
                    401,
                )

            # Bypass role checks for emergency_admin user
            # This allows the emergency admin to access any role-restricted endpoint
            # Validation: Ensure permissions field is properly configured before bypass
            if user.username == "emergency_admin" and user.is_active:
                # Validate that emergency_admin has permissions configured
                # This prevents security issues if user exists but isn't properly set up
                if not user.permissions:
                    current_app.logger.warning(
                        f"Emergency admin role bypass denied: {user.username} has no permissions configured",
                        extra={
                            "event": "emergency_admin_role_bypass_denied",
                            "username": user.username,
                            "reason": "missing_permissions",
                        },
                    )
                    # Continue to normal role check instead of bypassing
                else:
                    current_app.logger.info(
                        f"Emergency admin bypass: Granting role access to {user.username}",
                        extra={
                            "event": "emergency_admin_role_bypass",
                            "username": user.username,
                            "required_roles": list(roles),
                        },
                    )
                    # Audit successful role check with bypass note
                    audit_permission_check(
                        permission=f"role:{','.join(roles)}",
                        granted=True,
                        user_id=user.id,
                        username=user.username,
                        resource=request.endpoint if request else None,
                        details={
                            "bypass": "emergency_admin",
                            "user_role": user.role.name.value if user.role else "N/A",
                        },
                    )
                    return f(*args, **kwargs)

            # Ensure user has a valid role
            if not _ensure_user_has_role(user):
                audit_permission_check(
                    permission=f"role:{','.join(roles)}",
                    granted=False,
                    user_id=user.id,
                    username=user.username,
                    details={"reason": "User has no role assigned"},
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception("User role not configured"),
                    "configuration_error",
                    "Role validation",
                    500,
                )

            # Check if user has one of the required roles
            if user.role.name.value not in roles:
                # Audit denied role check
                audit_permission_check(
                    permission=f"role:{','.join(roles)}",
                    granted=False,
                    user_id=user.id,
                    username=user.username,
                    resource=request.endpoint if request else None,
                    details={
                        "reason": "Insufficient role permissions",
                        "user_role": user.role.name.value,
                        "required_roles": list(roles),
                    },
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception("Insufficient role permissions"),
                    "permission_error",
                    f"Role check: {roles}",
                    403,
                )

            # Audit successful role check
            audit_permission_check(
                permission=f"role:{','.join(roles)}",
                granted=True,
                user_id=user.id,
                username=user.username,
                resource=request.endpoint if request else None,
                details={"user_role": user.role.name.value},
            )

            return f(*args, **kwargs)

        return decorated_function

    return decorator
