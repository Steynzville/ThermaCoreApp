"""Client isolation middleware for multi-tenancy support.

This module provides helper functions to filter database queries by client_id
based on the current user's client association. Admin users (client_id=NULL)
can access all data across clients.
"""

from flask_jwt_extended import verify_jwt_in_request
from sqlalchemy.orm import Query

from app.models import User
from app.utils.helpers import get_current_user_id


def get_current_user() -> User:
    """Get the current authenticated user from JWT token.
    
    Returns:
        User object if authenticated, None otherwise
        
    Raises:
        None - returns None on any errors
    """
    try:
        verify_jwt_in_request()
        user_id, success = get_current_user_id()
        if not success or user_id is None:
            return None
        
        user = User.query.get(user_id)
        return user
    except Exception:
        return None


def apply_client_filter(query: Query, model_class) -> Query:
    """Apply client isolation filter to a SQLAlchemy query.
    
    This function filters queries to only return data for the current user's client.
    Admin users (client_id=NULL) bypass this filter and see all data.
    
    Args:
        query: SQLAlchemy query object to filter
        model_class: The model class being queried (must have client_id attribute)
        
    Returns:
        Filtered query object
        
    Example:
        query = Unit.query
        query = apply_client_filter(query, Unit)
        units = query.all()  # Returns only units for current user's client
    """
    # Get current user
    user = get_current_user()
    
    # If no user or user has no client_id (admin), return unfiltered query
    if not user or user.client_id is None:
        return query
    
    # Check if model has client_id attribute
    if not hasattr(model_class, 'client_id'):
        return query
    
    # Apply client filter
    return query.filter(model_class.client_id == user.client_id)


def check_client_access(client_id: int) -> bool:
    """Check if current user has access to a specific client's data.
    
    Admin users (client_id=NULL) have access to all clients.
    Non-admin users only have access to their own client.
    
    Args:
        client_id: The client ID to check access for
        
    Returns:
        True if user has access, False otherwise
    """
    user = get_current_user()
    
    # No user means no access
    if not user:
        return False
    
    # Admin users (client_id=NULL) have access to all
    if user.client_id is None:
        return True
    
    # Non-admin users can only access their own client
    return user.client_id == client_id
