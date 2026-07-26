"""Tenant context middleware for multi-tenancy support.

This middleware provides:
1. Automatic tenant context extraction from request
2. Tenant-aware query filtering (System Admin, Client Admin, Operator/Viewer)
3. Admin bypass for cross-tenant access
4. Tenant validation and security
"""

import logging
from functools import wraps

from flask import g, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from sqlalchemy import inspect

from app.models import Tenant, User

logger = logging.getLogger(__name__)


def get_current_tenant_id():
    """Get the current tenant ID from request context.

    Returns:
        int or None: Current tenant ID, None if not set or admin user
    """
    if hasattr(g, "tenant_id"):
        return g.tenant_id

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
    """Check if current user is a system admin with cross-tenant access.

    Returns:
        bool: True if user is system admin, False otherwise
    """
    if hasattr(g, "is_cross_tenant_admin"):
        return g.is_cross_tenant_admin

    return False


def is_client_admin():
    """Check if current user is a Client Admin.

    Returns:
        bool: True if user is client_admin, False otherwise
    """
    return getattr(g, "is_client_admin", False)


def get_current_client_id():
    """Get current client ID for Client Admin users.

    Returns:
        int or None: Client ID if client_admin user
    """
    return getattr(g, "client_id", None)


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

        role_name = user.role.name.value if user.role else None
        is_admin = role_name == "admin"
        is_client = role_name == "client_admin"

        g.is_client_admin = is_client
        g.client_id = user.client_id

        if is_admin:
            # System admins can access all tenants by default
            g.is_cross_tenant_admin = True
            g.tenant_id = None
            logger.debug(f"System admin user {user_id} granted cross-tenant access")
        elif is_client:
            # Client admins are scoped to their client_id
            g.is_cross_tenant_admin = False
            g.tenant_id = user.tenant_id
            logger.debug(
                f"Client admin user {user_id} restricted to client_id {user.client_id}",
            )
        else:
            # Non-admin users are restricted to their tenant
            g.is_cross_tenant_admin = False
            g.tenant_id = user.tenant_id
            logger.debug(f"User {user_id} restricted to tenant {user.tenant_id}")

    except Exception:
        logger.exception("Error setting up tenant context")


def tenant_filter(query, model):
    """Apply tenant filtering to a SQLAlchemy query based on role scoping.

    Args:
        query: SQLAlchemy query object
        model: SQLAlchemy model class

    Returns:
        Filtered query object
    """
    # 1. System Admin (cross-tenant access)
    if is_admin_with_cross_tenant_access():
        tenant_id = request.args.get("tenant_id", type=int)
        if tenant_id and hasattr(inspect(model).columns, "tenant_id"):
            logger.debug(f"Admin filtering by tenant_id: {tenant_id}")
            return query.filter(model.tenant_id == tenant_id)
        return query

    # 2. Client Admin (scoped by client_id across multiple tenants)
    if is_client_admin():
        client_id = get_current_client_id()
        if client_id is not None:
            if model == Tenant:
                return query.filter(Tenant.client_id == client_id)

            mapper = inspect(model)
            if hasattr(mapper.columns, "client_id") and model == User:
                return query.filter(User.client_id == client_id)

            # For models with tenant_id (e.g. Unit, User if client_id not directly set)
            if hasattr(mapper.columns, "tenant_id"):
                client_tenant_ids = [
                    t.id for t in Tenant.query.filter_by(client_id=client_id).all()
                ]
                tenant_id = request.args.get("tenant_id", type=int)
                if tenant_id and tenant_id in client_tenant_ids:
                    return query.filter(model.tenant_id == tenant_id)
                if client_tenant_ids:
                    return query.filter(model.tenant_id.in_(client_tenant_ids))
                return query.filter(model.tenant_id == -1)

        return query.filter(model.tenant_id == -1)

    # 3. Regular users (Operator / Viewer) restricted to single tenant
    tenant_id = get_current_tenant_id()
    mapper = inspect(model)
    if not hasattr(mapper.columns, "tenant_id"):
        logger.debug(f"Model {model.__name__} doesn't have tenant_id, skipping filter")
        return query

    if tenant_id is not None:
        logger.debug(f"Filtering query by tenant_id: {tenant_id}")
        return query.filter(model.tenant_id == tenant_id)

    logger.warning("No tenant_id found for non-admin user, returning empty results")
    return query.filter(model.tenant_id == -1)


def tenant_required(f):
    """Decorator to ensure tenant context is set for the request."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
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
    if is_admin_with_cross_tenant_access():
        return True

    if is_client_admin():
        client_id = get_current_client_id()
        if client_id is None:
            return False
        tenant = Tenant.query.get(tenant_id)
        return tenant is not None and tenant.client_id == client_id

    current_tenant = get_current_tenant_id()
    return current_tenant == tenant_id


def get_tenant_from_request():
    """Get tenant ID from request parameters.

    Returns:
        int or None: Tenant ID from request, or current user's tenant
    """
    tenant_id = request.args.get("tenant_id", type=int)

    if tenant_id:
        if not validate_tenant_access(tenant_id):
            return None
        return tenant_id

    return get_current_tenant_id()


def ensure_tenant_isolation(obj):
    """Ensure an object belongs to the current tenant or client scope.

    Args:
        obj: SQLAlchemy model instance

    Returns:
        bool: True if object belongs to current tenant/client scope or user is admin

    Raises:
        ValueError: If object access is denied
    """
    if is_admin_with_cross_tenant_access():
        return True

    if is_client_admin():
        client_id = get_current_client_id()
        if hasattr(obj, "client_id") and obj.client_id == client_id:
            return True
        if hasattr(obj, "tenant_id"):
            tenant = Tenant.query.get(obj.tenant_id)
            if tenant and tenant.client_id == client_id:
                return True
        raise ValueError("Access denied: Object does not belong to client scope")

    if not hasattr(obj, "tenant_id"):
        return True

    current_tenant = get_current_tenant_id()
    if obj.tenant_id != current_tenant:
        raise ValueError(
            f"Access denied: Object belongs to tenant {obj.tenant_id}, "
            f"but current user is in tenant {current_tenant}",
        )

    return True


def set_tenant_for_new_object(obj):
    """Set tenant ID for a new object being created."""
    if not hasattr(obj, "tenant_id"):
        return

    if obj.tenant_id is not None:
        if not validate_tenant_access(obj.tenant_id):
            raise ValueError(
                f"Access denied: Cannot create object in tenant {obj.tenant_id}",
            )
        return

    tenant_id = get_current_tenant_id()
    if tenant_id is not None:
        obj.tenant_id = tenant_id
        logger.debug(f"Set tenant_id {tenant_id} for new {obj.__class__.__name__}")
