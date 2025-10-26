"""Tenant management routes for multi-tenancy support."""

import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import Schema, ValidationError, fields
from sqlalchemy.exc import IntegrityError

from app import db
from app.middleware.audit import audit_operation
from app.middleware.authorization import permission_required
from app.middleware.tenant import (
    get_current_tenant_id,
    is_admin_with_cross_tenant_access,
)
from app.models import Tenant, Unit, User

tenants_bp = Blueprint("tenants", __name__)
logger = logging.getLogger(__name__)


# Marshmallow schemas for request/response validation
class TenantSchema(Schema):
    """Schema for tenant serialization."""

    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    slug = fields.Str(required=True)
    description = fields.Str(allow_none=True)
    contact_name = fields.Str(allow_none=True)
    contact_email = fields.Email(allow_none=True)
    contact_phone = fields.Str(allow_none=True)
    address_line1 = fields.Str(allow_none=True)
    address_line2 = fields.Str(allow_none=True)
    city = fields.Str(allow_none=True)
    state = fields.Str(allow_none=True)
    postal_code = fields.Str(allow_none=True)
    country = fields.Str(allow_none=True)
    is_active = fields.Bool()
    max_users = fields.Int(allow_none=True)
    max_units = fields.Int(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class TenantCreateSchema(Schema):
    """Schema for tenant creation."""

    name = fields.Str(required=True)
    slug = fields.Str(required=True)
    description = fields.Str(allow_none=True)
    contact_name = fields.Str(allow_none=True)
    contact_email = fields.Email(allow_none=True)
    contact_phone = fields.Str(allow_none=True)
    address_line1 = fields.Str(allow_none=True)
    address_line2 = fields.Str(allow_none=True)
    city = fields.Str(allow_none=True)
    state = fields.Str(allow_none=True)
    postal_code = fields.Str(allow_none=True)
    country = fields.Str(allow_none=True)
    is_active = fields.Bool(load_default=True)
    max_users = fields.Int(allow_none=True)
    max_units = fields.Int(allow_none=True)


class TenantUpdateSchema(Schema):
    """Schema for tenant updates."""

    name = fields.Str()
    slug = fields.Str()
    description = fields.Str(allow_none=True)
    contact_name = fields.Str(allow_none=True)
    contact_email = fields.Email(allow_none=True)
    contact_phone = fields.Str(allow_none=True)
    address_line1 = fields.Str(allow_none=True)
    address_line2 = fields.Str(allow_none=True)
    city = fields.Str(allow_none=True)
    state = fields.Str(allow_none=True)
    postal_code = fields.Str(allow_none=True)
    country = fields.Str(allow_none=True)
    is_active = fields.Bool()
    max_users = fields.Int(allow_none=True)
    max_units = fields.Int(allow_none=True)


@tenants_bp.route("/tenants", methods=["GET"])
@jwt_required()
@permission_required("admin_panel")
@audit_operation("READ", "tenants")
def get_tenants():
    """Get all tenants (admin only).

    ---
    tags:
      - Tenants
    parameters:
      - in: query
        name: page
        type: integer
        default: 1
      - in: query
        name: per_page
        type: integer
        default: 50
      - in: query
        name: active_only
        type: boolean
        default: false
    responses:
      200:
        description: List of tenants
      403:
        description: Insufficient permissions
    security:
      - JWT: []
    """
    # Parse query parameters
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)
    active_only = request.args.get("active_only", "false").lower() == "true"

    # Build query
    query = Tenant.query

    # Filter active tenants if requested
    if active_only:
        query = query.filter(Tenant.is_active)

    # Apply pagination
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    # Serialize results
    tenant_schema = TenantSchema(many=True)

    return jsonify(
        {
            "data": tenant_schema.dump(pagination.items),
            "page": page,
            "per_page": per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        },
    )


@tenants_bp.route("/tenants/<int:tenant_id>", methods=["GET"])
@jwt_required()
@permission_required("admin_panel")
@audit_operation("READ", "tenants")
def get_tenant(tenant_id):
    """Get a specific tenant by ID (admin only).

    ---
    tags:
      - Tenants
    parameters:
      - in: path
        name: tenant_id
        type: integer
        required: true
    responses:
      200:
        description: Tenant details
      404:
        description: Tenant not found
    security:
      - JWT: []
    """
    tenant = Tenant.query.get_or_404(tenant_id)

    # Get statistics
    user_count = User.query.filter_by(tenant_id=tenant_id).count()
    unit_count = Unit.query.filter_by(tenant_id=tenant_id).count()

    # Serialize tenant
    tenant_schema = TenantSchema()
    tenant_data = tenant_schema.dump(tenant)

    # Add statistics
    tenant_data["stats"] = {
        "user_count": user_count,
        "unit_count": unit_count,
    }

    return jsonify({"data": tenant_data})


@tenants_bp.route("/tenants", methods=["POST"])
@jwt_required()
@permission_required("admin_panel")
@audit_operation("CREATE", "tenants")
def create_tenant():
    """Create a new tenant (admin only).

    ---
    tags:
      - Tenants
    parameters:
      - in: body
        name: tenant_data
        schema:
          $ref: '#/definitions/TenantCreateSchema'
    responses:
      201:
        description: Tenant created successfully
      400:
        description: Validation error
      409:
        description: Tenant already exists
    security:
      - JWT: []
    """
    # Validate request data
    schema = TenantCreateSchema()
    try:
        data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400

    # Create new tenant
    tenant = Tenant(**data)

    try:
        db.session.add(tenant)
        db.session.commit()

        # Serialize and return
        tenant_schema = TenantSchema()
        return jsonify({"data": tenant_schema.dump(tenant)}), 201

    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Failed to create tenant: {e}")
        return jsonify(
            {"error": "Tenant with this name or slug already exists"},
        ), 409


@tenants_bp.route("/tenants/<int:tenant_id>", methods=["PUT", "PATCH"])
@jwt_required()
@permission_required("admin_panel")
@audit_operation("UPDATE", "tenants")
def update_tenant(tenant_id):
    """Update a tenant (admin only).

    ---
    tags:
      - Tenants
    parameters:
      - in: path
        name: tenant_id
        type: integer
        required: true
      - in: body
        name: tenant_data
        schema:
          $ref: '#/definitions/TenantUpdateSchema'
    responses:
      200:
        description: Tenant updated successfully
      400:
        description: Validation error
      404:
        description: Tenant not found
    security:
      - JWT: []
    """
    tenant = Tenant.query.get_or_404(tenant_id)

    # Validate request data
    schema = TenantUpdateSchema()
    try:
        data = schema.load(request.json, partial=True)
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400

    # Update tenant fields
    for key, value in data.items():
        setattr(tenant, key, value)

    tenant.updated_at = datetime.now(timezone.utc)

    try:
        db.session.commit()

        # Serialize and return
        tenant_schema = TenantSchema()
        return jsonify({"data": tenant_schema.dump(tenant)})

    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Failed to update tenant: {e}")
        return jsonify(
            {"error": "Tenant with this name or slug already exists"},
        ), 409


@tenants_bp.route("/tenants/<int:tenant_id>", methods=["DELETE"])
@jwt_required()
@permission_required("admin_panel")
@audit_operation("DELETE", "tenants")
def delete_tenant(tenant_id):
    """Delete a tenant (admin only).

    Note: This will fail if there are users or units associated with the tenant.
    Consider deactivating instead of deleting.

    ---
    tags:
      - Tenants
    parameters:
      - in: path
        name: tenant_id
        type: integer
        required: true
    responses:
      204:
        description: Tenant deleted successfully
      404:
        description: Tenant not found
      409:
        description: Cannot delete tenant with associated data
    security:
      - JWT: []
    """
    tenant = Tenant.query.get_or_404(tenant_id)

    # Check for associated users
    user_count = User.query.filter_by(tenant_id=tenant_id).count()
    if user_count > 0:
        return jsonify(
            {
                "error": f"Cannot delete tenant with {user_count} associated users. "
                "Deactivate the tenant instead or reassign users first.",
            },
        ), 409

    # Check for associated units
    unit_count = Unit.query.filter_by(tenant_id=tenant_id).count()
    if unit_count > 0:
        return jsonify(
            {
                "error": f"Cannot delete tenant with {unit_count} associated units. "
                "Deactivate the tenant instead or reassign units first.",
            },
        ), 409

    try:
        db.session.delete(tenant)
        db.session.commit()
        return "", 204

    except Exception as e:
        db.session.rollback()
        logger.exception(f"Failed to delete tenant: {e}")
        return jsonify({"error": "Failed to delete tenant"}), 500


@tenants_bp.route("/tenants/current", methods=["GET"])
@jwt_required()
def get_current_tenant():
    """Get the current user's tenant information.

    ---
    tags:
      - Tenants
    responses:
      200:
        description: Current tenant information
      404:
        description: User not associated with a tenant
    security:
      - JWT: []
    """
    tenant_id = get_current_tenant_id()

    # Admin users without a specific tenant
    if tenant_id is None and is_admin_with_cross_tenant_access():
        return jsonify(
            {
                "data": None,
                "message": "Admin user with cross-tenant access",
            },
        )

    if tenant_id is None:
        return jsonify({"error": "User not associated with a tenant"}), 404

    tenant = Tenant.query.get_or_404(tenant_id)

    # Serialize and return
    tenant_schema = TenantSchema()
    return jsonify({"data": tenant_schema.dump(tenant)})


@tenants_bp.route("/tenants/switch", methods=["POST"])
@jwt_required()
@permission_required("admin_panel")
def switch_tenant():
    """Switch to a different tenant context (admin only).

    This allows admins to temporarily operate in the context of a specific tenant.

    ---
    tags:
      - Tenants
    parameters:
      - in: body
        name: tenant_data
        schema:
          type: object
          properties:
            tenant_id:
              type: integer
              description: Tenant ID to switch to (null for cross-tenant access)
    responses:
      200:
        description: Tenant context switched
      400:
        description: Invalid tenant ID
      403:
        description: Insufficient permissions
    security:
      - JWT: []
    """
    # This endpoint is for future enhancement - currently tenant context
    # is managed per-request based on query parameters
    return jsonify(
        {
            "message": "Tenant switching is managed through query parameters. "
            "Use ?tenant_id=<id> in your requests to filter by tenant.",
        },
    )
