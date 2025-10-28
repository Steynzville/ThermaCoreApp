"""User management routes for ThermaCore SCADA API."""

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app import db
from app.middleware.audit import audit_operation
from app.middleware.authorization import permission_required, role_required
from app.middleware.rate_limit import rate_limit
from app.middleware.tenant import tenant_filter
from app.models import Role, User
from app.utils.helpers import get_current_user_id
from app.utils.schemas import RoleSchema, UserSchema, UserUpdateSchema

users_bp = Blueprint("users", __name__)


@users_bp.route("/users", methods=["GET"])
@jwt_required()
@permission_required("read_users")
@audit_operation("READ", "users")
def get_users():
    """Get all users with optional filtering and pagination.
    ---
    tags:
      - Users
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
        name: role
        type: string
        enum: [admin, operator, viewer]
      - in: query
        name: active
        type: boolean
      - in: query
        name: search
        type: string
      - in: query
        name: company
        type: string
    responses:
      200:
        description: List of users
        schema:
          $ref: '#/definitions/PaginatedResponseSchema'
      400:
        description: Invalid parameters
    security:
      - JWT: []
    """
    # Parse query parameters
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)
    role_name = request.args.get("role")
    active = request.args.get("active", type=bool)
    search = request.args.get("search", "").strip()
    company = request.args.get("company", "").strip()

    # Build query
    query = User.query.join(Role)

    # Apply tenant filtering
    query = tenant_filter(query, User)

    # Apply filters
    if role_name:
        query = query.filter(Role.name == role_name)

    if active is not None:
        query = query.filter(User.is_active == active)

    if company:
        query = query.filter(User.company.ilike(f"%{company}%"))

    if search:
        search_filter = or_(
            User.username.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
            User.first_name.ilike(f"%{search}%"),
            User.last_name.ilike(f"%{search}%"),
        )
        query = query.filter(search_filter)

    # Apply pagination
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    users_schema = UserSchema(many=True)

    return (
        jsonify(
            {
                "data": users_schema.dump(pagination.items),
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
                "pages": pagination.pages,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        ),
        200,
    )


@users_bp.route("/users/<int:user_id>", methods=["GET"])
@jwt_required()
@permission_required("read_users")
def get_user(user_id):
    """Get a specific user by ID.
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
    responses:
      200:
        description: User details
        schema:
          $ref: '#/definitions/UserSchema'
      404:
        description: User not found
    security:
      - JWT: []
    """
    user = User.query.get_or_404(user_id)
    user_schema = UserSchema()
    return jsonify(user_schema.dump(user)), 200


@users_bp.route("/users/<int:user_id>", methods=["PUT"])
@jwt_required()
@permission_required("write_users")
@audit_operation(
    "UPDATE",
    "user",
    include_request_data=True,
    include_response_data=True,
)
def update_user(user_id):
    """Update an existing user.
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
      - in: body
        name: user_data
        schema:
          $ref: '#/definitions/UserUpdateSchema'
    responses:
      200:
        description: User updated successfully
        schema:
          $ref: '#/definitions/UserSchema'
      400:
        description: Validation error
      403:
        description: Cannot modify own role or status
      404:
        description: User not found
      409:
        description: Username or email already exists
    security:
      - JWT: []
    """
    user = User.query.get_or_404(user_id)
    current_user_id, success = get_current_user_id()
    if not success or current_user_id is None:
        return jsonify({"error": "Invalid token format"}), 401

    schema = UserUpdateSchema()

    try:
        data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400

    # Prevent users from modifying their own role or active status
    if user_id == current_user_id:
        if "role_id" in data:
            return jsonify({"error": "Cannot modify your own role"}), 403
        if "is_active" in data and not data["is_active"]:
            return jsonify({"error": "Cannot deactivate your own account"}), 403

    # Check if role exists (if role_id is being updated)
    if "role_id" in data:
        role = Role.query.get(data["role_id"])
        if not role:
            return jsonify({"error": "Role not found"}), 400

    # Update user attributes
    for key, value in data.items():
        if hasattr(user, key):
            setattr(user, key, value)

    try:
        db.session.commit()

        # Refresh to get database-generated timestamp
        db.session.refresh(user)

        user_schema = UserSchema()
        return jsonify(user_schema.dump(user)), 200

    except IntegrityError as e:
        db.session.rollback()
        if "username" in str(e.orig):
            return jsonify({"error": "Username already exists"}), 409
        if "email" in str(e.orig):
            return jsonify({"error": "Email already exists"}), 409
        return jsonify({"error": "Database constraint violation"}), 409


@users_bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
@permission_required("delete_users")
@audit_operation("DELETE", "user")
def delete_user(user_id):
    """Delete a user (permanently removes from database).

    .. warning::
        This endpoint now performs a **hard delete** (permanent removal from the database).
        If you previously relied on soft delete semantics (e.g., marking users as inactive or deleted),
        please note that this is a breaking change. Deleted users cannot be recovered.

        If you need to retain soft delete behavior, consider updating your integration to use the
        `/users/<int:user_id>/deactivate` or similar endpoints, or implement a custom solution.

        For migration guidance, review your usage of this endpoint and ensure that permanent deletion
        is acceptable for your application.
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
    responses:
      204:
        description: User deleted successfully
      403:
        description: Cannot delete own account
      404:
        description: User not found
    security:
      - JWT: []
    """
    user = User.query.get_or_404(user_id)
    current_user_id, success = get_current_user_id()
    if not success or current_user_id is None:
        return jsonify({"error": "Invalid token format"}), 401

    # Prevent users from deleting their own account
    if user_id == current_user_id:
        return jsonify({"error": "Cannot delete your own account"}), 403

    # Hard delete - permanently remove the user from the database
    db.session.delete(user)
    db.session.commit()

    return "", 204


@users_bp.route("/users/<int:user_id>/activate", methods=["PATCH"])
@jwt_required()
@permission_required("write_users")
def activate_user(user_id):
    """Activate a deactivated user.
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
    responses:
      200:
        description: User activated successfully
        schema:
          $ref: '#/definitions/UserSchema'
      404:
        description: User not found
    security:
      - JWT: []
    """
    user = User.query.get_or_404(user_id)
    user.is_active = True
    db.session.commit()

    # Refresh to get database-generated timestamp
    db.session.refresh(user)

    user_schema = UserSchema()
    return jsonify(user_schema.dump(user)), 200


@users_bp.route("/users/<int:user_id>/deactivate", methods=["PATCH"])
@jwt_required()
@permission_required("write_users")
def deactivate_user(user_id):
    """Deactivate a user.
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
    responses:
      200:
        description: User deactivated successfully
        schema:
          $ref: '#/definitions/UserSchema'
      403:
        description: Cannot deactivate own account
      404:
        description: User not found
    security:
      - JWT: []
    """
    user = User.query.get_or_404(user_id)
    current_user_id, success = get_current_user_id()
    if not success or current_user_id is None:
        return jsonify({"error": "Invalid token format"}), 401

    # Prevent users from deactivating their own account
    if user_id == current_user_id:
        return jsonify({"error": "Cannot deactivate your own account"}), 403

    user.is_active = False
    db.session.commit()

    # Refresh to get database-generated timestamp
    db.session.refresh(user)

    user_schema = UserSchema()
    return jsonify(user_schema.dump(user)), 200


@users_bp.route("/roles", methods=["GET"])
@jwt_required()
@permission_required("read_users")
def get_roles():
    """Get all available roles.
    ---
    tags:
      - Users
      - Roles
    responses:
      200:
        description: List of roles
        schema:
          type: array
          items:
            $ref: '#/definitions/RoleSchema'
    security:
      - JWT: []
    """
    roles = Role.query.all()
    roles_schema = RoleSchema(many=True)
    return jsonify(roles_schema.dump(roles)), 200


@users_bp.route("/users/stats", methods=["GET"])
@jwt_required()
@permission_required("read_users")
def get_users_stats():
    """Get summary statistics for users.
    ---
    tags:
      - Users
    responses:
      200:
        description: User statistics
        schema:
          type: object
          properties:
            total_users:
              type: integer
            active_users:
              type: integer
            inactive_users:
              type: integer
            admin_users:
              type: integer
            operator_users:
              type: integer
            viewer_users:
              type: integer
    security:
      - JWT: []
    """
    total_users = User.query.count()
    # Use explicit boolean filters that are portable across databases
    active_users = User.query.filter(User.is_active.is_(True)).count()
    inactive_users = User.query.filter(User.is_active.is_(False)).count()

    # Role counts
    admin_role = Role.query.filter(Role.name == "admin").first()
    operator_role = Role.query.filter(Role.name == "operator").first()
    viewer_role = Role.query.filter(Role.name == "viewer").first()

    admin_users = (
        User.query.filter(User.role_id == admin_role.id).count() if admin_role else 0
    )
    operator_users = (
        User.query.filter(User.role_id == operator_role.id).count()
        if operator_role
        else 0
    )
    viewer_users = (
        User.query.filter(User.role_id == viewer_role.id).count() if viewer_role else 0
    )

    return (
        jsonify(
            {
                "total_users": total_users,
                "active_users": active_users,
                "inactive_users": inactive_users,
                "admin_users": admin_users,
                "operator_users": operator_users,
                "viewer_users": viewer_users,
            },
        ),
        200,
    )


@users_bp.route("/users/<int:user_id>/reset-password", methods=["POST"])
@jwt_required()
@role_required("admin")
@rate_limit(
    limit=10,
    window_seconds=3600,
    per="user",
)  # 10 password resets per hour per admin user
def reset_user_password(user_id):
    """Reset a user's password (admin only).
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
      - in: body
        name: password_data
        schema:
          type: object
          required:
            - new_password
          properties:
            new_password:
              type: string
              minLength: 6
    responses:
      200:
        description: Password reset successfully
      400:
        description: Validation error
      404:
        description: User not found
    security:
      - JWT: []
    """
    user = User.query.get_or_404(user_id)
    data = request.json

    if not data or "new_password" not in data:
        return jsonify({"error": "New password required"}), 400

    if len(data["new_password"]) < 6:
        return (
            jsonify(
                {"error": "New password must be at least 6 characters long"},
            ),
            400,
        )

    user.set_password(data["new_password"])
    db.session.commit()

    return jsonify({"message": "Password reset successfully"}), 200


@users_bp.route("/users/companies", methods=["GET"])
@jwt_required()
@permission_required("read_users")
def get_companies():
    """Get list of unique companies.
    ---
    tags:
      - Users
    responses:
      200:
        description: List of unique company names
        schema:
          type: object
          properties:
            companies:
              type: array
              items:
                type: string
    security:
      - JWT: []
    """
    from app.utils.user_batch_manager import UserBatchManager

    companies = UserBatchManager.get_unique_companies()
    return jsonify({"companies": companies}), 200


@users_bp.route("/users/companies/stats", methods=["GET"])
@jwt_required()
@permission_required("read_users")
def get_company_stats():
    """Get statistics about users grouped by company.
    ---
    tags:
      - Users
    responses:
      200:
        description: Company statistics
        schema:
          type: object
          properties:
            stats:
              type: array
              items:
                type: object
                properties:
                  company:
                    type: string
                  total_users:
                    type: integer
                  active_users:
                    type: integer
                  inactive_users:
                    type: integer
    security:
      - JWT: []
    """
    from app.utils.user_batch_manager import UserBatchManager

    stats = UserBatchManager.get_company_statistics()
    return jsonify({"stats": stats}), 200


@users_bp.route("/users/batch/activate", methods=["POST"])
@jwt_required()
@permission_required("write_users")
def batch_activate():
    """Activate multiple users.
    ---
    tags:
      - Users
    parameters:
      - in: body
        name: user_ids
        schema:
          type: object
          required:
            - user_ids
          properties:
            user_ids:
              type: array
              items:
                type: integer
    responses:
      200:
        description: Users activated successfully
      400:
        description: Invalid request
    security:
      - JWT: []
    """
    from app.utils.user_batch_manager import UserBatchManager

    data = request.json
    if not data or "user_ids" not in data:
        return jsonify({"error": "user_ids required"}), 400

    count = UserBatchManager.batch_activate_users(data["user_ids"])
    return jsonify({"message": f"{count} users activated successfully"}), 200


@users_bp.route("/users/batch/deactivate", methods=["POST"])
@jwt_required()
@permission_required("write_users")
def batch_deactivate():
    """Deactivate multiple users.
    ---
    tags:
      - Users
    parameters:
      - in: body
        name: user_ids
        schema:
          type: object
          required:
            - user_ids
          properties:
            user_ids:
              type: array
              items:
                type: integer
    responses:
      200:
        description: Users deactivated successfully
      400:
        description: Invalid request
    security:
      - JWT: []
    """
    from app.utils.user_batch_manager import UserBatchManager

    data = request.json
    if not data or "user_ids" not in data:
        return jsonify({"error": "user_ids required"}), 400

    count = UserBatchManager.batch_deactivate_users(data["user_ids"])
    return jsonify({"message": f"{count} users deactivated successfully"}), 200


@users_bp.route("/users/pending", methods=["GET"])
@jwt_required()
@permission_required("read_users")
@audit_operation("READ", "pending_users")
def get_pending_users():
    """Get all users with pending registration status.
    ---
    tags:
      - Users
    parameters:
      - in: query
        name: page
        type: integer
        default: 1
      - in: query
        name: per_page
        type: integer
        default: 50
    responses:
      200:
        description: List of pending users
        schema:
          $ref: '#/definitions/PaginatedResponseSchema'
      403:
        description: Insufficient permissions
    security:
      - JWT: []
    """
    # Parse query parameters
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)

    # Query for pending users
    query = User.query.filter_by(registration_status="pending").join(Role)

    # Apply pagination
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    users_schema = UserSchema(many=True)

    return (
        jsonify(
            {
                "data": users_schema.dump(pagination.items),
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
                "pages": pagination.pages,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev,
            },
        ),
        200,
    )


@users_bp.route("/users/<int:user_id>/approve", methods=["POST"])
@jwt_required()
@permission_required("write_users")
@audit_operation("UPDATE", "user_approval")
def approve_user(user_id):
    """Approve a pending user registration.
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
        description: User ID to approve
    responses:
      200:
        description: User approved successfully
        schema:
          $ref: '#/definitions/UserSchema'
      404:
        description: User not found
      400:
        description: User is not in pending status
      403:
        description: Insufficient permissions
    security:
      - JWT: []
    """
    from datetime import datetime, timezone  # noqa: PLC0415 - Conditional import

    from app.utils.helpers import get_role_permissions

    # Get the user to approve
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Check if user is in pending status
    if user.registration_status != "pending":
        return (
            jsonify(
                {
                    "error": f"User is not in pending status (current status: {user.registration_status})",
                },
            ),
            400,
        )

    # Get the current admin user ID
    current_user_id, success = get_current_user_id()
    if not success or current_user_id is None:
        return jsonify({"error": "Failed to identify current user"}), 500

    # Update user status to approved
    user.registration_status = "approved"
    user.approval_date = datetime.now(timezone.utc)
    user.approved_by = current_user_id

    # Set permissions based on role
    if user.role:
        role_permissions = get_role_permissions(user.role.name.value)
        user.permissions = role_permissions

    try:
        db.session.commit()
        db.session.refresh(user)

        user_schema = UserSchema()
        return (
            jsonify(
                {
                    "message": "User approved successfully",
                    "user": user_schema.dump(user),
                },
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        # Log the error internally but don't expose stack trace to user
        current_app.logger.exception(f"Failed to approve user {user_id}: {e!s}")
        return jsonify({"error": "Failed to approve user"}), 500


@users_bp.route("/users/<int:user_id>/reject", methods=["POST"])
@jwt_required()
@permission_required("write_users")
@audit_operation("UPDATE", "user_rejection")
def reject_user(user_id):
    """Reject a pending user registration.
    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
        description: User ID to reject
      - in: body
        name: rejection_data
        schema:
          type: object
          properties:
            reason:
              type: string
              description: Reason for rejection
    responses:
      200:
        description: User rejected successfully
        schema:
          $ref: '#/definitions/UserSchema'
      404:
        description: User not found
      400:
        description: User is not in pending status
      403:
        description: Insufficient permissions
    security:
      - JWT: []
    """
    # Get the user to reject
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Check if user is in pending status
    if user.registration_status != "pending":
        return (
            jsonify(
                {
                    "error": f"User is not in pending status (current status: {user.registration_status})",
                },
            ),
            400,
        )

    # Get rejection reason from request
    data = request.json or {}
    rejection_reason = data.get("reason", "No reason provided")

    # Get the current admin user ID
    current_user_id, success = get_current_user_id()
    if not success or current_user_id is None:
        return jsonify({"error": "Failed to identify current user"}), 500

    # Update user status to rejected
    user.registration_status = "rejected"
    user.rejection_reason = rejection_reason
    user.approved_by = current_user_id  # Track who made the decision

    try:
        db.session.commit()
        db.session.refresh(user)

        user_schema = UserSchema()
        return (
            jsonify(
                {
                    "message": "User rejected successfully",
                    "user": user_schema.dump(user),
                },
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        # Log the error internally but don't expose stack trace to user
        current_app.logger.exception(f"Failed to reject user {user_id}: {e!s}")
        return jsonify({"error": "Failed to reject user"}), 500
