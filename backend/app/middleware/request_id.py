"""Request ID tracking middleware for ThermaCore SCADA API."""
import uuid
import logging
from functools import wraps
from typing import Optional, Callable

from flask import request, g, has_request_context
from app.utils.secure_logger import SecureLogger


logger = SecureLogger.get_secure_logger(__name__)


class RequestIDManager:
    """Manages request ID generation and tracking across the application."""

    REQUEST_ID_HEADER = 'X-Request-ID'

    @staticmethod
    def generate_request_id() -> str:
        """Generate a new UUID4 request ID."""
        return str(uuid.uuid4())

    @staticmethod
    def extract_request_id() -> Optional[str]:
        """Extract request ID from headers or generate new one."""
        if not has_request_context():
            return None

        # Check if client provided request ID
        client_request_id = request.headers.get(RequestIDManager.REQUEST_ID_HEADER)

        if client_request_id:
            # Validate client-provided request ID (must be valid UUID4 format)
            try:
                # This will raise ValueError if not a valid UUID
                parsed_uuid = uuid.UUID(client_request_id)
                # Strictly validate that it's a UUID4 (version 4)
                if parsed_uuid.version == 4:
                    # Return canonical UUID string representation
                    return str(parsed_uuid)
                else:
                    # Reject non-UUID4 versions to prevent injection attacks
                    logger.warning("Invalid request ID: not UUID4")
            except ValueError:
                # Invalid UUID format - don't log the actual value to prevent XSS
                logger.warning("Invalid request ID format from client: malformed UUID")

        # Generate new request ID
        return RequestIDManager.generate_request_id()

    @staticmethod
    def set_request_id(request_id: Optional[str] = None) -> str:
        """Set request ID in Flask's g object and return it."""
        if not has_request_context():
            return request_id or RequestIDManager.generate_request_id()

        if not request_id:
            request_id = RequestIDManager.extract_request_id()

        g.request_id = request_id
        return request_id

    @staticmethod
    def get_request_id() -> Optional[str]:
        """Get current request ID from Flask's g object."""
        if not has_request_context():
            return None
        return getattr(g, 'request_id', None)

    @staticmethod
    def ensure_request_id() -> str:
        """Ensure request ID exists, generate if needed."""
        if not has_request_context():
            return RequestIDManager.generate_request_id()

        request_id = RequestIDManager.get_request_id()
        if not request_id:
            request_id = RequestIDManager.set_request_id()
        return request_id


class RequestIDFilter(logging.Filter):
    """Logging filter to include request ID in log records."""

    def filter(self, record):
        """Add request ID to log record."""
        request_id = RequestIDManager.get_request_id()
        record.request_id = request_id or 'no-request-context'

        # Also add it to the extra data for structured logging
        if not hasattr(record, 'extra'):
            record.extra = {}
        record.extra['correlation_id'] = record.request_id

        return True


def init_request_id_logging(app):
    """Initialize request ID logging for the application."""
    # Add request ID filter to all loggers
    request_id_filter = RequestIDFilter()

    # Add to root logger
    logging.getLogger().addFilter(request_id_filter)

    # Add to Flask's logger
    app.logger.addFilter(request_id_filter)

    # Update logging format to include request ID for structured logging
    if not app.config.get('TESTING'):
        for handler in app.logger.handlers:
            if hasattr(handler, 'setFormatter'):
                # Enhanced formatter with correlation ID and structured format
                formatter = logging.Formatter(
                    '[%(asctime)s] [%(request_id)s] %(levelname)s in %(module)s: %(message)s'
                )
                handler.setFormatter(formatter)

        # Configure structured logging for production
        # Always add structured logging handler (not conditional on LOG_LEVEL)
        import sys

        # Get log level configuration
        log_level_str = app.config.get('LOG_LEVEL', 'INFO').upper()
        log_level = getattr(logging, log_level_str)

        # Check if a StreamHandler for stdout already exists
        root_logger = logging.getLogger()
        has_stdout_handler = any(
            isinstance(h, logging.StreamHandler) and 
            getattr(h, 'stream', None) is sys.stdout
            for h in root_logger.handlers
        )

        if not has_stdout_handler:
            stream_handler = logging.StreamHandler(sys.stdout)
            stream_handler.setLevel(log_level)
            stream_handler.addFilter(request_id_filter)
            stream_handler.setFormatter(logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s'
            ))
            root_logger.addHandler(stream_handler)
            root_logger.setLevel(log_level)


def request_id_required(f: Callable) -> Callable:
    """Decorator to ensure request has a request ID."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Ensure request ID exists
        RequestIDManager.ensure_request_id()
        return f(*args, **kwargs)
    return decorated_function


def track_request_id(f: Callable) -> Callable:
    """
    Decorator to track request ID and add it to response headers.
    Use this on route handlers that need request ID tracking.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Set up request ID
        request_id = RequestIDManager.ensure_request_id()

        # Log request start with structured logging
        logger.info(f"Request started: {request.method} {request.path}", extra={
            'request_id': request_id,
            'method': request.method,
            'path': request.path,
            'remote_addr': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', 'Unknown')
        })

        try:
            # Execute the wrapped function
            response = f(*args, **kwargs)

            # Add request ID to response headers
            if hasattr(response, 'headers'):
                response.headers[RequestIDManager.REQUEST_ID_HEADER] = request_id
            elif isinstance(response, tuple) and len(response) >= 2:
                # Handle tuple responses (response, status_code) or (response, status_code, headers)
                if len(response) == 3 and isinstance(response[2], dict):
                    response[2][RequestIDManager.REQUEST_ID_HEADER] = request_id
                else:
                    # Convert to tuple with headers
                    headers = {RequestIDManager.REQUEST_ID_HEADER: request_id}
                    response = (response[0], response[1], headers)

            logger.info("Request completed successfully", extra={
                'request_id': request_id,
                'method': request.method,
                'path': request.path,
                'status': 'success'
            })
            return response

        except Exception as e:
            # Log request failure (global error handler will log detailed exception info)
            logger.info("Request failed", extra={
                'request_id': request_id,
                'method': request.method,
                'path': request.path,
                'error_type': e.__class__.__name__,
                'status': 'error'
            })

            # Re-raise all exceptions to be handled by Flask's global error handlers
            # This ensures a single point of exception handling in register_error_handlers
            raise

    return decorated_function


# Middleware for automatic request ID handling
def request_id_middleware():
    """Flask before_request handler to set up request IDs."""
    RequestIDManager.set_request_id()


def setup_request_id_middleware(app):
    """Set up request ID middleware for the Flask app."""

    @app.before_request
    def before_request():
        """Set up request ID for each request."""
        request_id_middleware()

    @app.after_request 
    def after_request(response):
        """Add request ID to response headers."""
        request_id = RequestIDManager.get_request_id()
        if request_id:
            response.headers[RequestIDManager.REQUEST_ID_HEADER] = request_id
        return response

    # Initialize logging
    init_request_id_logging(app)

    return app