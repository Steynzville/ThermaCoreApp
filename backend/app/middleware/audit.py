"""Audit logging middleware for ThermaCore SCADA API.

This middleware provides comprehensive audit logging for security-critical operations
including authentication, authorization, and data modification events.
"""
import json
import logging
from datetime import datetime, timezone
from enum import Enum
from functools import wraps
from typing import Optional, Dict, Any

from flask import request, g, has_request_context, current_app
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from sqlalchemy.exc import SQLAlchemyError

from app import db
from app.models import User
from app.middleware.request_id import RequestIDManager


logger = logging.getLogger(__name__)


# Sensitive fields that should be redacted in audit logs
SENSITIVE_FIELDS = {
    'password', 'token', 'api_key', 'secret', 'jwt', 'refresh_token',
    'access_token', 'authorization', 'secret_key', 'private_key',
    'client_secret', 'api_secret', 'auth_token', 'session_token',
    'csrf_token', 'x-api-key', 'x-auth-token'
}


def redact_sensitive_data(data, sensitive_keys=None):
    """Recursively redact sensitive information from data structures.
    
    Args:
        data: Data structure to redact (dict, list, or primitive)
        sensitive_keys: Set of keys to redact (defaults to SENSITIVE_FIELDS)
    
    Returns:
        Redacted copy of the data
    """
    if sensitive_keys is None:
        sensitive_keys = SENSITIVE_FIELDS
    
    if isinstance(data, dict):
        redacted = {}
        for key, value in data.items():
            # Check if key should be redacted (case-insensitive)
            if key.lower() in sensitive_keys:
                redacted[key] = '[REDACTED]'
            else:
                redacted[key] = redact_sensitive_data(value, sensitive_keys)
        return redacted
    elif isinstance(data, list):
        return [redact_sensitive_data(item, sensitive_keys) for item in data]
    else:
        return data


class AuditEventType(Enum):
    """Audit event types for different operations."""
    # Authentication events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    TOKEN_REFRESH = "token_refresh"
    
    # Authorization events  
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_DENIED = "permission_denied"
    ROLE_CHECK = "role_check"
    
    # Data modification events
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    
    # System events
    API_ACCESS = "api_access"
    CONFIGURATION_CHANGE = "configuration_change"
    SYSTEM_ERROR = "system_error"


class AuditSeverity(Enum):
    """Severity levels for audit events."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditLogger:
    """Centralized audit logging functionality."""
    
    @staticmethod
    def log_event(
        event_type: AuditEventType,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        resource: Optional[str] = None,
        resource_id: Optional[str] = None,
        action: Optional[str] = None,
        outcome: str = "success",
        severity: AuditSeverity = AuditSeverity.INFO,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log an audit event with comprehensive details.
        
        Args:
            event_type: Type of event being logged
            user_id: ID of the user performing the action
            username: Username of the user performing the action
            resource: Resource being accessed (e.g., 'users', 'units')
            resource_id: Specific resource identifier
            action: Specific action performed (e.g., 'create_user', 'update_unit')
            outcome: Result of the action ('success', 'failure', 'error')
            severity: Severity level of the event
            details: Additional context information
            ip_address: Client IP address
            user_agent: Client user agent
        """
        try:
            # Get request context information
            request_id = RequestIDManager.get_request_id() if has_request_context() else None
            
            if has_request_context() and request:
                ip_address = ip_address or request.remote_addr
                user_agent = user_agent or request.headers.get('User-Agent', 'Unknown')
                method = request.method
                endpoint = request.endpoint
                url = request.url
            else:
                method = endpoint = url = None
            
            # Try to get user information from JWT if not provided
            if not user_id and not username and has_request_context():
                try:
                    verify_jwt_in_request(optional=True)
                    current_user_id_str = get_jwt_identity()
                    if current_user_id_str:
                        user = User.query.get(int(current_user_id_str))
                        if user:
                            user_id = user.id
                            username = user.username
                except Exception:
                    # Don't fail audit logging due to JWT issues or int conversion
                    pass
            
            # Build audit record
            audit_record = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'request_id': request_id,
                'event_type': event_type.value,
                'severity': severity.value,
                'user_id': user_id,
                'username': username,
                'resource': resource,
                'resource_id': resource_id,
                'action': action,
                'outcome': outcome,
                'http_method': method,
                'endpoint': endpoint,
                'url': url,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'details': redact_sensitive_data(details) if details else {}
            }
            
            # Log the audit event
            audit_message = f"AUDIT: {event_type.value} - User: {username or 'Unknown'} ({user_id}) - Resource: {resource} - Action: {action} - Outcome: {outcome}"
            
            if severity == AuditSeverity.CRITICAL:
                logger.critical(audit_message, extra={'audit': audit_record})
            elif severity == AuditSeverity.ERROR:
                logger.error(audit_message, extra={'audit': audit_record})
            elif severity == AuditSeverity.WARNING:
                logger.warning(audit_message, extra={'audit': audit_record})
            else:
                logger.info(audit_message, extra={'audit': audit_record})
                
        except Exception as e:
            # Audit logging must never fail the main operation
            logger.error(f"Failed to log audit event: {e}")
    
    @staticmethod
    def log_authentication_event(
        event_type: AuditEventType,
        username: str,
        outcome: str = "success",
        details: Optional[Dict[str, Any]] = None
    ):
        """Log authentication-related events."""
        severity = AuditSeverity.WARNING if outcome != "success" else AuditSeverity.INFO
        AuditLogger.log_event(
            event_type=event_type,
            username=username,
            action=f"user_{event_type.value}",
            outcome=outcome,
            severity=severity,
            details=details
        )
    
    @staticmethod
    def log_authorization_event(
        permission: str,
        granted: bool,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        resource: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log authorization-related events."""
        event_type = AuditEventType.PERMISSION_GRANTED if granted else AuditEventType.PERMISSION_DENIED
        outcome = "success" if granted else "denied"
        severity = AuditSeverity.WARNING if not granted else AuditSeverity.INFO
        
        AuditLogger.log_event(
            event_type=event_type,
            user_id=user_id,
            username=username,
            resource=resource,
            action=f"check_permission_{permission}",
            outcome=outcome,
            severity=severity,
            details=details or {'permission': permission}
        )
    
    @staticmethod
    def log_data_event(
        operation: str,
        resource: str,
        resource_id: Optional[str] = None,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        outcome: str = "success",
        details: Optional[Dict[str, Any]] = None
    ):
        """Log data modification events."""
        event_type_map = {
            'CREATE': AuditEventType.CREATE,
            'READ': AuditEventType.READ,
            'UPDATE': AuditEventType.UPDATE,
            'DELETE': AuditEventType.DELETE
        }
        
        event_type = event_type_map.get(operation.upper(), AuditEventType.API_ACCESS)
        severity = AuditSeverity.WARNING if outcome != "success" else AuditSeverity.INFO
        
        AuditLogger.log_event(
            event_type=event_type,
            user_id=user_id,
            username=username,
            resource=resource,
            resource_id=resource_id,
            action=f"{operation.lower()}_{resource}",
            outcome=outcome,
            severity=severity,
            details=details
        )


def audit_operation(
    operation: str,
    resource: str,
    include_request_data: bool = False,
    include_response_data: bool = False
):
    """Decorator to automatically audit CRUD operations.
    
    Args:
        operation: Type of operation (CREATE, READ, UPDATE, DELETE)
        resource: Resource being operated on (e.g., 'user', 'unit')
        include_request_data: Whether to include request data in audit log
        include_response_data: Whether to include response data in audit log
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get user information before the operation
            user_id = username = None
            try:
                if has_request_context():
                    verify_jwt_in_request(optional=True)
                    current_user_id_str = get_jwt_identity()
                    if current_user_id_str:
                        user = User.query.get(int(current_user_id_str))
                        if user:
                            user_id = user.id
                            username = user.username
            except Exception:
                pass
            
            # Prepare audit details
            details = {}
            if include_request_data and has_request_context() and request:
                if request.is_json:
                    try:
                        raw_request_data = request.get_json()
                        details['request_data'] = redact_sensitive_data(raw_request_data)
                    except Exception:
                        details['request_data'] = 'Unable to parse JSON'
                raw_query_params = dict(request.args)
                details['query_params'] = redact_sensitive_data(raw_query_params)
            
            # Extract resource ID from URL path if available
            resource_id = kwargs.get('id') or kwargs.get('unit_id') or kwargs.get('user_id')
            
            try:
                # Execute the original function
                result = f(*args, **kwargs)
                
                # Add response data to audit if requested
                if include_response_data and hasattr(result, 'get_json'):
                    try:
                        response_data = result.get_json()
                        if isinstance(response_data, dict) and 'data' in response_data:
                            details['response_data'] = response_data['data']
                    except Exception:
                        pass
                
                # Log successful operation
                AuditLogger.log_data_event(
                    operation=operation,
                    resource=resource,
                    resource_id=str(resource_id) if resource_id else None,
                    user_id=user_id,
                    username=username,
                    outcome="success",
                    details=details if details else None
                )
                
                return result
                
            except Exception as e:
                # Log failed operation
                details['error'] = str(e)
                AuditLogger.log_data_event(
                    operation=operation,
                    resource=resource,
                    resource_id=str(resource_id) if resource_id else None,
                    user_id=user_id,
                    username=username,
                    outcome="failure",
                    details=details
                )
                raise
                
        return decorated_function
    return decorator


def setup_audit_middleware(app):
    """Set up audit logging middleware for the Flask app."""
    
    # Define endpoints/paths to exclude from audit logging
    EXCLUDED_ENDPOINTS = ['health', 'metrics', 'docs', 'swagger', 'swaggerui']
    EXCLUDED_PATHS = ['/health', '/metrics', '/docs', '/api/docs', '/swagger', '/swaggerui']
    
    @app.before_request
    def audit_api_access():
        """Log API access for auditing."""
        if request.endpoint and not request.endpoint.startswith('static'):
            # Use explicit path and endpoint checks for exclusion
            if (request.endpoint in EXCLUDED_ENDPOINTS or
                any(request.path.startswith(p) for p in EXCLUDED_PATHS)):
                return
                
            # Redact sensitive query parameters before logging
            redacted_query_params = redact_sensitive_data(dict(request.args))
            
            AuditLogger.log_event(
                event_type=AuditEventType.API_ACCESS,
                resource=request.endpoint,
                action=f"{request.method}_{request.endpoint}",
                details={
                    'query_params': redacted_query_params,
                    'content_type': request.content_type
                }
            )
    
    return app


# Convenience functions for common audit scenarios
def audit_login_success(username: str, details: Optional[Dict] = None):
    """Audit successful login."""
    AuditLogger.log_authentication_event(
        AuditEventType.LOGIN_SUCCESS, 
        username=username, 
        outcome="success",
        details=details
    )


def audit_login_failure(username: str, reason: str, details: Optional[Dict] = None):
    """Audit failed login."""
    audit_details = details or {}
    audit_details['failure_reason'] = reason
    AuditLogger.log_authentication_event(
        AuditEventType.LOGIN_FAILURE, 
        username=username, 
        outcome="failure",
        details=audit_details
    )


def audit_permission_check(permission: str, granted: bool, user_id: Optional[int] = None, 
                         username: Optional[str] = None, resource: Optional[str] = None,
                         details: Optional[dict] = None):
    """Audit permission check."""
    AuditLogger.log_authorization_event(
        permission=permission,
        granted=granted,
        user_id=user_id,
        username=username,
        resource=resource,
        details=details
    )