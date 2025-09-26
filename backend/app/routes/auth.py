"""Authentication routes for ThermaCore SCADA API."""
from datetime import datetime, timezone
from functools import wraps

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, 
    get_jwt_identity, get_jwt, verify_jwt_in_request
)
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import User, Role
from app.utils.schemas import LoginSchema, UserCreateSchema, UserSchema, TokenSchema
from app.utils.helpers import get_current_user_id
from app.utils.error_handler import SecurityAwareErrorHandler
from app.middleware.validation import validate_schema
from app.middleware.rate_limit import auth_rate_limit, standard_rate_limit
from app.middleware.request_id import track_request_id
from app.middleware.audit import (
    audit_login_success, audit_login_failure, audit_permission_check,
    AuditLogger, AuditEventType
)


auth_bp = Blueprint('auth', __name__)


def permission_required(permission):
    """Decorator to check if user has required permission."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            user_id, success = get_current_user_id()
            if not success or user_id is None:
                # Audit failed permission check
                audit_permission_check(
                    permission=permission,
                    granted=False,
                    details={'reason': 'Invalid token format'}
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception('Invalid token format'), 'authentication_error', 'Token validation', 401
                )
                
            user = User.query.get(user_id)
            
            if not user or not user.is_active:
                # Audit failed permission check - user not found/inactive
                audit_permission_check(
                    permission=permission,
                    granted=False,
                    user_id=user_id,
                    username=user.username if user else None,
                    details={'reason': 'User not found or inactive'}
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception('User not found or inactive'), 'authentication_error', 'User validation', 403
                )
                
            if not user.has_permission(permission):
                # Audit denied permission
                audit_permission_check(
                    permission=permission,
                    granted=False,
                    user_id=user.id,
                    username=user.username,
                    resource=request.endpoint if request else None,
                    details={'reason': 'Insufficient permissions', 'user_role': user.role.name.value}
                )
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception('Insufficient permissions'), 'permission_error', f'Permission check: {permission}', 403
                )
            
            # Audit successful permission check
            audit_permission_check(
                permission=permission,
                granted=True,
                user_id=user.id,
                username=user.username,
                resource=request.endpoint if request else None,
                details={'user_role': user.role.name.value}
            )
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def role_required(*roles):
    """Decorator to check if user has required role."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            user_id, success = get_current_user_id()
            if not success or user_id is None:
                return jsonify({'error': 'Invalid token format'}), 401
                
            user = User.query.get(user_id)
            
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 403
                
            if user.role.name.value not in roles:
                return jsonify({'error': 'Insufficient role permissions'}), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator


@auth_bp.route('/auth/register', methods=['POST'])
@track_request_id
@standard_rate_limit
@jwt_required()
@permission_required('write_users')
@validate_schema(UserCreateSchema)
def register():
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
    from flask import g
    data = g.validated_data
    
    # Check if role exists
    role = Role.query.get(data['role_id'])
    if not role:
        return SecurityAwareErrorHandler.handle_service_error(
            Exception('Role not found'), 'validation_error', 'Role validation', 400
        )
    
    # Create new user
    user = User(
        username=data['username'],
        email=data['email'],
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        role_id=data['role_id']
    )
    user.set_password(data['password'])
    
    try:
        db.session.add(user)
        db.session.commit()
        
        # Refresh to get database-generated timestamp
        db.session.refresh(user)
        
        user_schema = UserSchema()
        return SecurityAwareErrorHandler.create_success_response(
            user_schema.dump(user), 'User created successfully', 201
        )
        
    except IntegrityError as e:
        db.session.rollback()
        if 'username' in str(e.orig):
            error_msg = 'Username already exists'
        elif 'email' in str(e.orig):
            error_msg = 'Email already exists' 
        else:
            error_msg = 'Database constraint violation'
            
        return SecurityAwareErrorHandler.handle_service_error(
            e, 'validation_error', f'User creation: {error_msg}', 409
        )


@auth_bp.route('/auth/login', methods=['POST'])
@track_request_id
@auth_rate_limit
@validate_schema(LoginSchema)
def login():
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
    from flask import g
    data = g.validated_data
    
    user = User.query.filter_by(username=data['username']).first()
    
    if user and user.check_password(data['password']) and user.is_active:
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()
        
        # Refresh to get database-generated timestamp
        db.session.refresh(user)
        
        # Create tokens with string identity (JWT requirement)
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        # Audit successful login
        audit_login_success(
            username=user.username,
            details={
                'user_id': user.id,
                'role': user.role.name.value,
                'last_login': user.last_login.isoformat()
            }
        )
        
        token_schema = TokenSchema()
        user_schema = UserSchema()
        
        response_data = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': current_app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds(),
            'user': user_schema.dump(user)
        }
        
        return SecurityAwareErrorHandler.create_success_response(
            token_schema.dump(response_data), 'Login successful', 200
        )
    
    # Audit failed login
    username = data.get('username', 'unknown')
    failure_reason = 'invalid_credentials'
    if user and not user.is_active:
        failure_reason = 'inactive_user'
    elif not user:
        failure_reason = 'user_not_found'
    elif not user.check_password(data['password']):
        failure_reason = 'incorrect_password'
    
    audit_login_failure(
        username=username,
        reason=failure_reason,
        details={'attempted_username': username}
    )
    
    return SecurityAwareErrorHandler.handle_service_error(
        Exception('Invalid credentials'), 'authentication_error', 'Login attempt', 401
    )


@auth_bp.route('/auth/refresh', methods=['POST'])
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
    user_id, success = get_current_user_id()
    if not success or user_id is None:
        return jsonify({'error': 'Invalid token format'}), 401
        
    user = User.query.get(user_id)
    
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 401
    
    access_token = create_access_token(identity=str(user.id))
    
    # Audit token refresh
    AuditLogger.log_authentication_event(
        AuditEventType.TOKEN_REFRESH,
        username=user.username,
        outcome="success",
        details={'user_id': user.id, 'role': user.role.name.value}
    )
    
    return jsonify({
        'access_token': access_token,
        'expires_in': current_app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds()
    }), 200


@auth_bp.route('/auth/me', methods=['GET'])
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
        return jsonify({'error': 'Invalid token format'}), 401
        
    user = User.query.get(user_id)
    
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 401
    
    user_schema = UserSchema()
    return jsonify(user_schema.dump(user)), 200


@auth_bp.route('/auth/logout', methods=['POST'])
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
    return jsonify({'message': 'Logout successful'}), 200


@auth_bp.route('/auth/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """
    Change user password.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: password_data
        schema:
          type: object
          required:
            - current_password
            - new_password
          properties:
            current_password:
              type: string
            new_password:
              type: string
              minLength: 6
    responses:
      200:
        description: Password changed successfully
      400:
        description: Validation error
      401:
        description: Invalid current password
    security:
      - JWT: []
    """
    data = request.json
    
    if not data or 'current_password' not in data or 'new_password' not in data:
        return jsonify({'error': 'Current password and new password required'}), 400
    
    if len(data['new_password']) < 6:
        return jsonify({'error': 'New password must be at least 6 characters long'}), 400
    
    user_id, success = get_current_user_id()
    if not success or user_id is None:
        return jsonify({'error': 'Invalid token format'}), 401
        
    user = User.query.get(user_id)
    
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 401
    
    if not user.check_password(data['current_password']):
        return jsonify({'error': 'Invalid current password'}), 401
    
    user.set_password(data['new_password'])
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'}), 200