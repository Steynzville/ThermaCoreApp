"""Centralized error handling utilities for secure API responses."""
import uuid
from datetime import datetime
from typing import Any, Tuple, Optional
from flask import jsonify, g
from app.utils.secure_logger import SecureLogger
from app.utils.input_validator import InputValidator

logger = SecureLogger.get_secure_logger(__name__)


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
    def handle_thermacore_exception(exception) -> Tuple[Any, int]:
        """
        Handle ThermaCoreException instances with proper error mapping.

        Args:
            exception: ThermaCoreException instance

        Returns:
            Tuple of (JSON response, status_code)
        """
        # Import here to avoid circular imports
        from app.exceptions import ThermaCoreException

        if not isinstance(exception, ThermaCoreException):
            # Fallback for non-domain exceptions
            return SecurityAwareErrorHandler.handle_service_error(
                exception, 'internal_error', 'Unknown error', 500
            )

        # Get correlation ID from request context
        request_id = getattr(g, 'request_id', str(uuid.uuid4()))

        # Log the exception with correlation ID and full context
        log_message = (
            f"Domain exception [{request_id}] {exception.__class__.__name__} in {exception.context}: {str(exception)}"
        )

        # Enhanced logging with structured context including error class for debugging
        log_extra = {
            'request_id': request_id,
            'error_type': exception.error_type,
            'error_class': exception.__class__.__name__,
            'context': exception.context,
            'details': exception.details,
            'status_code': exception.status_code
        }

        # Log with appropriate level based on error type
        if exception.error_type in ['internal_error', 'database_error', 'configuration_error']:
            logger.error(log_message, exc_info=True, extra=log_extra)
        else:
            logger.warning(log_message, extra=log_extra)

        # Get generic user-facing message
        generic_message = SecurityAwareErrorHandler.GENERIC_MESSAGES.get(
            exception.error_type,
            SecurityAwareErrorHandler.GENERIC_MESSAGES['internal_error']
        )

        # Generate error code from error type
        error_code = exception.error_type.upper()

        # Create response envelope with correlation ID
        response_data = {
            'success': False,
            'error': {
                'code': error_code,
                'message': generic_message,
                'details': {
                    'context': exception.context,
                    'correlation_id': request_id
                }
            },
            'request_id': request_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }

        return jsonify(response_data), exception.status_code

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
        # Get correlation ID from request context
        request_id = getattr(g, 'request_id', str(uuid.uuid4()))

        # Log the actual error with full details and correlation ID
        # Include error class name for better debugging
        log_message = f"Service error [{request_id}] {error.__class__.__name__} in {context}: {str(error)}"

        # Enhanced logging with structured context
        log_extra = {
            'request_id': request_id,
            'error_type': error_type,
            'context': context,
            'status_code': status_code,
            'error_class': error.__class__.__name__
        }

        if error_type in ['internal_error', 'database_error', 'configuration_error']:
            logger.error(log_message, exc_info=True, extra=log_extra)
        else:
            logger.warning(log_message, extra=log_extra)

        # Return generic user-facing message in standardized envelope
        generic_message = SecurityAwareErrorHandler.GENERIC_MESSAGES.get(
            error_type, 
            SecurityAwareErrorHandler.GENERIC_MESSAGES['internal_error']
        )

        # Generate error code from error type
        error_code = error_type.upper()

        response_data = {
            'success': False,
            'error': {
                'code': error_code,
                'message': generic_message,
                'details': {
                    'context': context,
                    'correlation_id': request_id
                } if context else {'correlation_id': request_id}
            },
            'request_id': request_id,
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
    def handle_input_validation_error(field_name: str, error_message: str, 
                                      context: str = 'Input validation') -> Tuple[Any, int]:
        """Handle input validation errors with sanitized field information.

        This prevents information leakage about system internals while providing
        useful feedback about validation failures.

        Args:
            field_name: Name of the field that failed validation
            error_message: Validation error message (will be sanitized)
            context: Context for logging

        Returns:
            Tuple of (JSON response, status_code)
        """
        # Get or create correlation ID from request context
        if not hasattr(g, 'request_id'):
            g.request_id = str(uuid.uuid4())
        request_id = g.request_id

        # Sanitize field name and error message for logging
        safe_field = InputValidator.sanitize_for_logging(field_name)
        safe_message = InputValidator.sanitize_for_logging(error_message)

        # Log the actual validation error with details
        log_message = f"Input validation failed [{request_id}] in {context}: field={safe_field}, error={safe_message}"
        logger.warning(log_message, extra={
            'request_id': request_id,
            'error_type': 'input_validation_error',
            'context': context,
            'field': safe_field
        })

        # Return generic user-facing message without exposing internal details
        response_data = {
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Invalid input provided. Please check your request and try again.',
                'details': {
                    'correlation_id': request_id
                }
            },
            'request_id': request_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }

        return jsonify(response_data), 400

    @staticmethod
    def validate_and_handle_input(value: Any, context: str = 'input') -> Tuple[bool, Optional[Tuple[Any, int]]]:
        """Validate input and return error response if validation fails.

        This is a convenience method that combines validation and error handling.

        Args:
            value: Input value to validate
            context: Context description for error messages

        Returns:
            Tuple of (is_valid, error_response)
            - is_valid: True if input is valid
            - error_response: Error response tuple if invalid, None if valid
        """
        is_valid, error_msg = InputValidator.validate_input(value, context)

        if not is_valid:
            return False, SecurityAwareErrorHandler.handle_input_validation_error(
                context, error_msg, 'Security validation'
            )

        return True, None

    @staticmethod
    def handle_permission_error(error: Exception, context: str = 'Permission check') -> Tuple[Any, int]:
        """Handle permission errors."""
        return SecurityAwareErrorHandler.handle_service_error(
            error, 'permission_error', f"Permission {context}", 403
        )

    @staticmethod
    def handle_value_error(error: ValueError, context: str = 'Request parameter validation', 
                          user_message: str = 'Invalid request parameter.') -> Tuple[Any, int]:
        """Handle ValueError exceptions with centralized logging and generic responses.

        This centralizes ValueError handling to ensure:
        - Sensitive error details are never exposed to clients
        - All errors are properly logged with context
        - Consistent error response format across all endpoints

        Args:
            error: The ValueError that occurred
            context: Context for logging (e.g., endpoint name)
            user_message: Generic user-facing message (default: 'Invalid request parameter.')

        Returns:
            Tuple of (JSON response, status_code)
        """
        # Get or create correlation ID from request context
        if not hasattr(g, 'request_id'):
            g.request_id = str(uuid.uuid4())
        request_id = g.request_id

        # Log the actual error with full details server-side
        log_message = f"ValueError [{request_id}] in {context}: {str(error)}"
        logger.error(log_message, exc_info=True, extra={
            'request_id': request_id,
            'error_type': 'value_error',
            'context': context,
            'error_class': 'ValueError'
        })

        # Return generic user-facing message in standardized envelope
        response_data = {
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': user_message,
                'details': {
                    'context': context,
                    'correlation_id': request_id
                }
            },
            'request_id': request_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }

        return jsonify(response_data), 400

    @staticmethod
    def handle_not_found_error(context: str = 'Resource') -> Tuple[Any, int]:
        """Handle resource not found cases with standardized envelope."""
        request_id = getattr(g, 'request_id', str(uuid.uuid4()))
        logger.warning(f"{context} not found [{request_id}]", extra={
            'request_id': request_id,
            'error_type': 'not_found_error',
            'context': context
        })
        return jsonify({
            'success': False,
            'error': {
                'code': 'NOT_FOUND_ERROR',
                'message': SecurityAwareErrorHandler.GENERIC_MESSAGES['not_found_error'],
                'details': {
                    'resource_type': context,
                    'correlation_id': request_id
                }
            },
            'request_id': request_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }), 404

    @staticmethod
    def handle_service_unavailable(service_name: str) -> Tuple[Any, int]:
        """Handle service unavailable cases with standardized envelope."""
        request_id = getattr(g, 'request_id', str(uuid.uuid4()))
        logger.warning(f"{service_name} service not available [{request_id}]", extra={
            'request_id': request_id,
            'error_type': 'service_unavailable',
            'service_name': service_name
        })
        return jsonify({
            'success': False,
            'error': {
                'code': 'SERVICE_UNAVAILABLE',
                'message': SecurityAwareErrorHandler.GENERIC_MESSAGES['service_unavailable'],
                'details': {
                    'service_name': service_name,
                    'correlation_id': request_id
                }
            },
            'request_id': request_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }), 503

    @staticmethod
    def create_success_response(data: Any, message: str = None, status_code: int = 200) -> Tuple[Any, int]:
        """Create standardized success response envelope."""
        request_id = getattr(g, 'request_id', str(uuid.uuid4()))
        response_data = {
            'success': True,
            'data': data,
            'request_id': request_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }

        if message:
            response_data['message'] = message

        return jsonify(response_data), status_code

    @staticmethod
    def register_error_handlers(app):
        """Register Flask error handlers to ensure all exceptions include correlation IDs."""

        @app.errorhandler(Exception)
        def handle_exception(e):
            """Global exception handler for all uncaught exceptions."""
            # Import domain exception to check type
            from app.exceptions import ThermaCoreException

            if isinstance(e, ThermaCoreException):
                # Handle domain exceptions with proper correlation
                return SecurityAwareErrorHandler.handle_thermacore_exception(e)
            else:
                # Handle generic exceptions
                return SecurityAwareErrorHandler.handle_service_error(
                    e, 'internal_error', 'Unhandled exception', 500
                )

        @app.errorhandler(404)
        def handle_404(e):
            """Handle 404 errors with correlation ID."""
            return SecurityAwareErrorHandler.handle_not_found_error("Page or resource")

        @app.errorhandler(500)
        def handle_500(e):
            """Handle 500 errors with correlation ID."""
            return SecurityAwareErrorHandler.handle_service_error(
                e, 'internal_error', 'Internal server error', 500
            )

        @app.errorhandler(503)
        def handle_503(e):
            """Handle 503 errors with correlation ID."""
            return SecurityAwareErrorHandler.handle_service_error(
                e, 'service_unavailable', 'Service unavailable', 503
            )