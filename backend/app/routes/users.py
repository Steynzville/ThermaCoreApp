"""User management routes for ThermaCore SCADA API."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_

from app import db
from app.models import User, Role
from app.utils.schemas import UserSchema, UserUpdateSchema, RoleSchema
from app.routes.auth import permission_required, role_required
from app.utils.helpers import get_current_user_id
from app.middleware.audit import audit_operation


users_bp = Blueprint('users', __name__)


@users_bp.route('/users', methods=['GET'])
@jwt_required()
@permission_required('read_users')
@audit_operation('READ', 'users')
def get_users():
    """
    Get all users with optional filtering and pagination.
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
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 100)
    role_name = request.args.get('role')
    active = request.args.get('active', type=bool)
    search = request.args.get('search', '').strip()

    # Build query
    query = User.query.join(Role)

    # Apply filters
    if role_name:
        query = query.filter(Role.name == role_name)

    if active is not None:
        query = query.filter(User.is_active == active)

    if search:
        search_filter = or_(
            User.username.ilike(f'%{search}%'),
            User.email.ilike(f'%{search}%'),
            User.first_name.ilike(f'%{search}%'),
            User.last_name.ilike(f'%{search}%')
        )
        query = query.filter(search_filter)

    # Apply pagination
    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )

    users_schema = UserSchema(many=True)

    return jsonify({
        'data': users_schema.dump(pagination.items),
        'page': page,
        'per_page': per_page,
        'total': pagination.total,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    }), 200


@users_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
@permission_required('read_users')
def get_user(user_id):
    """
    Get a specific user by ID.
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


@users_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@permission_required('write_users')
@audit_operation('UPDATE', 'user', include_request_data=True, include_response_data=True)
def update_user(user_id):
    """
    Update an existing user.
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
        return jsonify({'error': 'Invalid token format'}), 401

    schema = UserUpdateSchema()

    try:
        data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400

    # Prevent users from modifying their own role or active status
    if user_id == current_user_id:
        if 'role_id' in data:
            return jsonify({'error': 'Cannot modify your own role'}), 403
        if 'is_active' in data and not data['is_active']:
            return jsonify({'error': 'Cannot deactivate your own account'}), 403

    # Check if role exists (if role_id is being updated)
    if 'role_id' in data:
        role = Role.query.get(data['role_id'])
        if not role:
            return jsonify({'error': 'Role not found'}), 400

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
        if 'username' in str(e.orig):
            return jsonify({'error': 'Username already exists'}), 409
        elif 'email' in str(e.orig):
            return jsonify({'error': 'Email already exists'}), 409
        else:
            return jsonify({'error': 'Database constraint violation'}), 409


@users_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@permission_required('delete_users')
@audit_operation('DELETE', 'user')
def delete_user(user_id):
    """
    Delete a user (soft delete by deactivating).
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
        return jsonify({'error': 'Invalid token format'}), 401

    # Prevent users from deleting their own account
    if user_id == current_user_id:
        return jsonify({'error': 'Cannot delete your own account'}), 403

    # Soft delete by deactivating the user
    user.is_active = False
    db.session.commit()

    return '', 204


@users_bp.route('/users/<int:user_id>/activate', methods=['PATCH'])
@jwt_required()
@permission_required('write_users')
def activate_user(user_id):
    """
    Activate a deactivated user.
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


@users_bp.route('/users/<int:user_id>/deactivate', methods=['PATCH'])
@jwt_required()
@permission_required('write_users')
def deactivate_user(user_id):
    """
    Deactivate a user.
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
        return jsonify({'error': 'Invalid token format'}), 401

    # Prevent users from deactivating their own account
    if user_id == current_user_id:
        return jsonify({'error': 'Cannot deactivate your own account'}), 403

    user.is_active = False
    db.session.commit()

    # Refresh to get database-generated timestamp
    db.session.refresh(user)

    user_schema = UserSchema()
    return jsonify(user_schema.dump(user)), 200


@users_bp.route('/roles', methods=['GET'])
@jwt_required()
@permission_required('read_users')
def get_roles():
    """
    Get all available roles.
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


@users_bp.route('/users/stats', methods=['GET'])
@jwt_required()
@permission_required('read_users')
def get_users_stats():
    """
    Get summary statistics for users.
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
    admin_role = Role.query.filter(Role.name == 'admin').first()
    operator_role = Role.query.filter(Role.name == 'operator').first()
    viewer_role = Role.query.filter(Role.name == 'viewer').first()

    admin_users = User.query.filter(User.role_id == admin_role.id).count() if admin_role else 0
    operator_users = User.query.filter(User.role_id == operator_role.id).count() if operator_role else 0
    viewer_users = User.query.filter(User.role_id == viewer_role.id).count() if viewer_role else 0

    return jsonify({
        'total_users': total_users,
        'active_users': active_users,
        'inactive_users': inactive_users,
        'admin_users': admin_users,
        'operator_users': operator_users,
        'viewer_users': viewer_users
    }), 200


@users_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
@role_required('admin')
def reset_user_password(user_id):
    """
    Reset a user's password (admin only).
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

    if not data or 'new_password' not in data:
        return jsonify({'error': 'New password required'}), 400

    if len(data['new_password']) < 6:
        return jsonify({'error': 'New password must be at least 6 characters long'}), 400

    user.set_password(data['new_password'])
    db.session.commit()

    return jsonify({'message': 'Password reset successfully'}), 200