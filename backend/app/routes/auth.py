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


auth_bp = Blueprint('auth', __name__)


def permission_required(permission):
    """Decorator to check if user has required permission."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            user_id = int(get_jwt_identity())  # Convert JWT identity string back to int
            user = User.query.get(user_id)
            
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 403
                
            if not user.has_permission(permission):
                return jsonify({'error': 'Insufficient permissions'}), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def role_required(*roles):
    """Decorator to check if user has required role."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            user_id = int(get_jwt_identity())  # Convert JWT identity string back to int
            user = User.query.get(user_id)
            
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 403
                
            if user.role.name.value not in roles:
                return jsonify({'error': 'Insufficient role permissions'}), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator


@auth_bp.route('/auth/register', methods=['POST'])
@jwt_required()
@permission_required('write_users')
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
    security:
      - JWT: []
    """
    schema = UserCreateSchema()
    
    try:
        data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Check if role exists
    role = Role.query.get(data['role_id'])
    if not role:
        return jsonify({'error': 'Role not found'}), 400
    
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
        return jsonify(user_schema.dump(user)), 201
        
    except IntegrityError as e:
        db.session.rollback()
        if 'username' in str(e.orig):
            return jsonify({'error': 'Username already exists'}), 409
        elif 'email' in str(e.orig):
            return jsonify({'error': 'Email already exists'}), 409
        else:
            return jsonify({'error': 'Database constraint violation'}), 409


@auth_bp.route('/auth/login', methods=['POST'])
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
    """
    schema = LoginSchema()
    
    try:
        data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
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
        
        token_schema = TokenSchema()
        user_schema = UserSchema()
        
        response_data = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': current_app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds(),
            'user': user_schema.dump(user)
        }
        
        return jsonify(token_schema.dump(response_data)), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401


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
    user_id = int(get_jwt_identity())  # Convert JWT identity string back to int
    user = User.query.get(user_id)
    
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 401
    
    access_token = create_access_token(identity=str(user.id))
    
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
    user_id = int(get_jwt_identity())  # Convert JWT identity string back to int
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
    
    user_id = int(get_jwt_identity())  # Convert JWT identity string back to int
    user = User.query.get(user_id)
    
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 401
    
    if not user.check_password(data['current_password']):
        return jsonify({'error': 'Invalid current password'}), 401
    
    user.set_password(data['new_password'])
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'}), 200