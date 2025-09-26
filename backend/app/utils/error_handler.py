"""Centralized error handling utilities for secure API responses."""
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Tuple, Optional
from flask import jsonify, g

logger = logging.getLogger(__name__)


class SecurityAwareErrorHandler:
    """Handles errors securely by providing generic user messages while logging details."""
    
    # Generic error messages for different error types
    GENERIC_MESSAGES = {
        'connection_error': 'Service temporarily unavailable. Please try again later.',
        'validation_error': 'Invalid request data provided.',
        'permission_error': 'Access denied. Insufficient permissions.',
        'not_found_error': 'The requested resource was not found.',
        'service_unavailable': 'Service is currently unavailable.',
        'internal_error': 'An internal server error occurred. Please try again later.',
        'database_error': 'Database operation failed. Please try again later.',
        'authentication_error': 'Authentication failed. Please check your credentials.',
        'timeout_error': 'Operation timed out. Please try again later.',
        'configuration_error': 'Service configuration error.',
    }

    @staticmethod
    def handle_service_error(error: Exception, error_type: str = 'internal_error', 
                           context: str = '', status_code: int = 500) -> Tuple[Any, int]:
        """
        Handle service errors securely with standardized error envelope.
        
        Args:
            error: The exception that occurred
            error_type: Type of error for generic message lookup
            context: Additional context for logging
            status_code: HTTP status code to return
            
        Returns:
            Tuple of (JSON response, status_code)
        """
        # Log the actual error with full details
        log_message = f"Error in {context}: {str(error)}"
        if error_type in ['internal_error', 'database_error', 'configuration_error']:
            logger.error(log_message, exc_info=True)
        else:
            logger.warning(log_message)
        
        # Return generic user-facing message in standardized envelope
        generic_message = SecurityAwareErrorHandler.GENERIC_MESSAGES.get(
            error_type, 
            SecurityAwareErrorHandler.GENERIC_MESSAGES['internal_error']
        )
        
        # Generate error code from error type
        error_code = error_type.upper().replace('_', '_')
        
        response_data = {
            'success': False,
            'error': {
                'code': error_code,
                'message': generic_message,
                'details': {'context': context} if context else {}
            },
            'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        
        return jsonify(response_data), status_code

    @staticmethod
    def handle_mqtt_error(error: Exception, context: str = 'MQTT operation') -> Tuple[Any, int]:
        """Handle MQTT-specific errors."""
        return SecurityAwareErrorHandler.handle_service_error(
            error, 'service_unavailable', f"MQTT {context}", 503
        )
    
    @staticmethod
    def handle_opcua_error(error: Exception, context: str = 'OPC UA operation') -> Tuple[Any, int]:
        """Handle OPC UA-specific errors."""
        return SecurityAwareErrorHandler.handle_service_error(
            error, 'service_unavailable', f"OPC UA {context}", 503
        )
    
    @staticmethod
    def handle_websocket_error(error: Exception, context: str = 'WebSocket operation') -> Tuple[Any, int]:
        """Handle WebSocket-specific errors."""
        return SecurityAwareErrorHandler.handle_service_error(
            error, 'service_unavailable', f"WebSocket {context}", 503
        )
    
    @staticmethod
    def handle_database_error(error: Exception, context: str = 'Database operation') -> Tuple[Any, int]:
        """Handle database-specific errors."""
        return SecurityAwareErrorHandler.handle_service_error(
            error, 'database_error', f"Database {context}", 500
        )
    
    @staticmethod
    def handle_validation_error(error: Exception, context: str = 'Validation') -> Tuple[Any, int]:
        """Handle validation errors."""
        return SecurityAwareErrorHandler.handle_service_error(
            error, 'validation_error', f"Validation {context}", 400
        )
    
    @staticmethod
    def handle_permission_error(error: Exception, context: str = 'Permission check') -> Tuple[Any, int]:
        """Handle permission errors."""
        return SecurityAwareErrorHandler.handle_service_error(
            error, 'permission_error', f"Permission {context}", 403
        )

    @staticmethod
    def handle_not_found_error(context: str = 'Resource') -> Tuple[Any, int]:
        """Handle resource not found cases with standardized envelope."""
        logger.warning(f"{context} not found")
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND_ERROR',
                'message': SecurityAwareErrorHandler.GENERIC_MESSAGES['not_found_error'],
                'details': {'resource_type': context}
            },
            'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }), 404

    @staticmethod
    def handle_service_unavailable(service_name: str) -> Tuple[Any, int]:
        """Handle service unavailable cases with standardized envelope."""
        logger.warning(f"{service_name} service not available")
        return jsonify({
            'success': False,
            'error': {
                'code': 'SERVICE_UNAVAILABLE',
                'message': SecurityAwareErrorHandler.GENERIC_MESSAGES['service_unavailable'],
                'details': {'service_name': service_name}
            },
            'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }), 503

    @staticmethod
    def create_success_response(data: Any, message: str = None, status_code: int = 200) -> Tuple[Any, int]:
        """Create standardized success response envelope."""
        response_data = {
            'success': True,
            'data': data,
            'request_id': getattr(g, 'request_id', str(uuid.uuid4())),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        
        if message:
            response_data['message'] = message
            
        return jsonify(response_data), status_code