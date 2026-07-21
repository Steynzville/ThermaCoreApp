"""Tenant context middleware for multi-tenancy support.

This middleware provides:
1. Automatic tenant context extraction from request
2. Tenant-aware query filtering
3. Admin bypass for cross-tenant access
4. Tenant validation and security
"""

import logging
from functools import wraps

from flask import g, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from sqlalchemy import inspect

from app.models import User

logger = logging.getLogger(__name__)


def get_current_tenant_id():
    """Get the current tenant ID from request context.

    Returns:
        int or None: Current tenant ID, None if not set or admin user
    """
    # Check if tenant_id is already set in request context
    if hasattr(g, "tenant_id"):
        return g.tenant_id

    # Check if this is an admin with cross-tenant access
    if hasattr(g, "is_cross_tenant_admin") and g.is_cross_tenant_admin:
        return None

    return None


def set_current_tenant(tenant_id):
    """Set the current tenant ID in request context.

    Args:
        tenant_id: Tenant ID to set (can be None for cross-tenant access)
    """
    g.tenant_id = tenant_id


def is_admin_with_cross_tenant_access():
    """Check if current user is an admin with cross-tenant access.

    Returns:
        bool: True if user is admin, False otherwise
    """
    if hasattr(g, "is_cross_tenant_admin"):
        return g.is_cross_tenant_admin

    return False


def setup_tenant_context():
    """Setup tenant context for the current request.

    This should be called early in the request lifecycle to establish
    the tenant context based on the authenticated user.
    """
    try:
        # Skip tenant context for auth endpoints
        if request.endpoint and "auth." in request.endpoint:
            return

        # Verify JWT and get user identity
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()

        if not user_id:
            return

        # Get user from database
        user = User.query.get(user_id)
        if not user:
            return

        # Check if user is admin
        is_admin = user.role and user.role.name.value == "admin"

        if is_admin:
            # Admins can access all tenants by default
            g.is_cross_tenant_admin = True
            g.tenant_id = None  # None means access to all tenants
            logger.debug(f"Admin user {user_id} granted cross-tenant access")
        else:
            # Non-admin users are restricted to their tenant
            g.is_cross_tenant_admin = False
            g.tenant_id = user.tenant_id
            logger.debug(f"User {user_id} restricted to tenant {user.tenant_id}")

    except Exception as e:
        logger.exception("Error setting up tenant context")
        # Don't fail the request, just log the error


def tenant_filter(query, model):
    """Apply tenant filtering to a SQLAlchemy query.

    Args:
        query: SQLAlchemy query object
        model: SQLAlchemy model class

    Returns:
        Filtered query object
    """
    # Skip filtering for admin users with cross-tenant access
    if is_admin_with_cross_tenant_access():
        # Check if explicit tenant filter is requested in query params
        tenant_id = request.args.get("tenant_id", type=int)
        if tenant_id:
            logger.debug(f"Admin filtering by tenant_id: {tenant_id}")
            return query.filter(model.tenant_id == tenant_id)
        return query

    # Get current tenant ID
    tenant_id = get_current_tenant_id()

    # Check if model has tenant_id column
    mapper = inspect(model)
    if not hasattr(mapper.columns, "tenant_id"):
        # Model doesn't support tenancy, return unfiltered query
        logger.debug(f"Model {model.__name__} doesn't have tenant_id, skipping filter")
        return query

    # Apply tenant filter
    if tenant_id is not None:
        logger.debug(f"Filtering query by tenant_id: {tenant_id}")
        return query.filter(model.tenant_id == tenant_id)

    # If no tenant_id and not admin, show nothing (safety measure)
    logger.warning("No tenant_id found for non-admin user, returning empty results")
    return query.filter(model.tenant_id == -1)  # Non-existent tenant


def tenant_required(f):
    """Decorator to ensure tenant context is set for the request.

    This decorator should be applied to routes that require tenant context.
    It will automatically set up the tenant context if not already set.
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Setup tenant context if not already done
        if not hasattr(g, "tenant_id"):
            setup_tenant_context()

        return f(*args, **kwargs)

    return decorated_function


def validate_tenant_access(tenant_id):
    """Validate that the current user can access the specified tenant.

    Args:
        tenant_id: Tenant ID to validate access for

    Returns:
        bool: True if access is allowed, False otherwise
    """
    # Admin users can access any tenant
    if is_admin_with_cross_tenant_access():
        return True

    # Non-admin users can only access their own tenant
    current_tenant = get_current_tenant_id()
    return current_tenant == tenant_id


def get_tenant_from_request():
    """Get tenant ID from request parameters.

    This is useful for admin endpoints that allow specifying a tenant.

    Returns:
        int or None: Tenant ID from request, or current user's tenant
    """
    # Check if tenant_id is provided in request
    tenant_id = request.args.get("tenant_id", type=int)

    if tenant_id:
        # Validate access to this tenant
        if not validate_tenant_access(tenant_id):
            return None
        return tenant_id

    # Return current tenant
    return get_current_tenant_id()


def ensure_tenant_isolation(obj):
    """Ensure an object belongs to the current tenant.

    Args:
        obj: SQLAlchemy model instance

    Returns:
        bool: True if object belongs to current tenant or user is admin

    Raises:
        ValueError: If object doesn't belong to current tenant
    """
    # Admin users can access any tenant
    if is_admin_with_cross_tenant_access():
        return True

    # Check if object has tenant_id attribute
    if not hasattr(obj, "tenant_id"):
        return True  # Object doesn't support tenancy

    # Get current tenant
    current_tenant = get_current_tenant_id()

    # Validate tenant match
    if obj.tenant_id != current_tenant:
        raise ValueError(
            f"Access denied: Object belongs to tenant {obj.tenant_id}, "
            f"but current user is in tenant {current_tenant}",
        )

    return True


def set_tenant_for_new_object(obj):
    """Set tenant ID for a new object being created.

    Args:
        obj: SQLAlchemy model instance
    """
    # Skip if object doesn't support tenancy
    if not hasattr(obj, "tenant_id"):
        return

    # Skip if tenant_id is already set
    if obj.tenant_id is not None:
        # Validate that the tenant_id is allowed
        if not validate_tenant_access(obj.tenant_id):
            raise ValueError(
                f"Access denied: Cannot create object in tenant {obj.tenant_id}",
            )
        return

    # Set tenant_id from current context
    tenant_id = get_current_tenant_id()
    if tenant_id is not None:
        obj.tenant_id = tenant_id
        logger.debug(f"Set tenant_id {tenant_id} for new {obj.__class__.__name__}")
