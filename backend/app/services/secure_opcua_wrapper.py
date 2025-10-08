"""Secure OPC-UA Wrapper for enhanced security features."""
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timezone
from functools import wraps

try:
    from opcua import Client, ua
    from opcua.common.node import Node
    opcua_available = True
except ImportError:
    opcua_available = False
    Client = None
    ua = None
    Node = None

from app.utils.secure_logger import SecureLogger

logger = SecureLogger.get_secure_logger(__name__)


class SecureOPCUAWrapper:
    """
    Secure wrapper for OPC-UA operations with enhanced security features.

    This wrapper provides:
    - Input validation and sanitization
    - Security policy enforcement
    - Audit logging of security-relevant operations
    - Rate limiting for connection attempts
    - Secure error handling without information leakage
    """

    def __init__(self, client_instance=None):
        """
        Initialize secure OPC-UA wrapper.

        Args:
            client_instance: Optional OPC-UA client instance to wrap
        """
        self._client = client_instance
        self._connection_attempts = 0
        self._max_connection_attempts = 3
        self._security_events = []

        if not opcua_available:
            logger.warning("OPC-UA library not available - wrapper initialized in limited mode")

    def set_client(self, client_instance):
        """
        Set the OPC-UA client instance to wrap.

        Args:
            client_instance: OPC-UA client instance
        """
        self._client = client_instance
        logger.info("OPC-UA client instance set in secure wrapper")

    def validate_node_id(self, node_id: str) -> bool:
        """
        Validate OPC-UA node ID format.

        Args:
            node_id: Node identifier to validate

        Returns:
            True if valid, False otherwise
        """
        if not node_id or not isinstance(node_id, str):
            logger.warning("Invalid node ID: must be a non-empty string")
            return False

        # Basic validation - OPC-UA node IDs should match certain patterns
        # Format: ns=<namespace>;i=<identifier> or similar
        if len(node_id) > 256:  # Reasonable max length
            logger.warning("Node ID exceeds maximum length")
            return False

        return True

    def sanitize_node_id(self, node_id: str) -> str:
        """
        Sanitize node ID for safe logging.

        Args:
            node_id: Node identifier

        Returns:
            Sanitized node ID safe for logging
        """
        if not node_id:
            return "***INVALID***"

        # Remove any potentially sensitive parts while keeping structure
        # For production, only show the pattern, not the actual ID
        if self._should_sanitize_for_production():
            return self._sanitize_node_id_for_production(node_id)

        return node_id

    def _should_sanitize_for_production(self) -> bool:
        """
        Determine if node ID should be sanitized for production environment.
        """
        try:
            from app.utils.environment import is_production_environment
            if self._client and hasattr(self._client, '_app'):
                return is_production_environment(self._client._app)
        except Exception:
            pass
        return False

    def _sanitize_node_id_for_production(self, node_id: str) -> str:
        """
        Aggressively sanitize node ID for production environment.
        """
        parts = node_id.split(';')
        if len(parts) > 0:
            return f"ns=***;{parts[-1][:10]}..."
        return "***SANITIZED***"

    def log_security_event(self, event_type: str, details: Dict[str, Any]):
        """
        Log security-relevant events.

        Args:
            event_type: Type of security event
            details: Event details
        """
        event = {
            'timestamp': datetime.now(timezone.utc),
            'event_type': event_type,
            'details': details
        }
        self._security_events.append(event)

        # Keep only last 100 events
        if len(self._security_events) > 100:
            self._security_events = self._security_events[-100:]

        logger.info(f"OPC-UA security event: {event_type}", extra={'event_details': details})

    def secure_connect(self, max_retries: int = 3) -> bool:
        """
        Securely connect to OPC-UA server with rate limiting.

        Args:
            max_retries: Maximum connection retry attempts

        Returns:
            True if connection successful

        Raises:
            ConnectionError: If connection fails or rate limit exceeded
        """
        if not self._client:
            logger.error("No OPC-UA client instance available")
            raise ConnectionError("OPC-UA client not initialized")

        # Check rate limiting
        if self._connection_attempts >= self._max_connection_attempts:
            self.log_security_event('connection_rate_limit_exceeded', {
                'attempts': self._connection_attempts
            })
            raise ConnectionError("Maximum connection attempts exceeded - possible security issue")

        try:
            self._connection_attempts += 1

            # Delegate to the actual client
            if hasattr(self._client, 'connect'):
                result = self._client.connect()

                if result:
                    self._connection_attempts = 0  # Reset on success
                    self.log_security_event('connection_established', {
                        'success': True
                    })

                return result
            else:
                logger.error("Client does not have connect method")
                return False

        except Exception as e:
            self.log_security_event('connection_failed', {
                'error': str(e),
                'attempt': self._connection_attempts
            })
            raise

    def secure_read_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        """
        Securely read node value with validation.

        Args:
            node_id: Node identifier

        Returns:
            Node value data or None if failed
        """
        if not self.validate_node_id(node_id):
            self.log_security_event('invalid_node_access', {
                'node_id': self.sanitize_node_id(node_id)
            })
            return None

        try:
            if hasattr(self._client, 'read_node_value'):
                result = self._client.read_node_value(node_id)

                if result:
                    self.log_security_event('node_read_success', {
                        'node_id': self.sanitize_node_id(node_id),
                        'quality': result.get('quality', 'UNKNOWN')
                    })

                return result
            else:
                logger.error("Client does not have read_node_value method")
                return None

        except Exception as e:
            self.log_security_event('node_read_failed', {
                'node_id': self.sanitize_node_id(node_id),
                'error': str(e)
            })
            logger.error(f"Failed to read node securely: {e}")
            return None

    def get_security_status(self) -> Dict[str, Any]:
        """
        Get security status and metrics.

        Returns:
            Security status information
        """
        return {
            'wrapper_enabled': True,
            'opcua_available': opcua_available,
            'connection_attempts': self._connection_attempts,
            'max_connection_attempts': self._max_connection_attempts,
            'recent_security_events': len(self._security_events),
            'client_attached': self._client is not None
        }

    def get_security_events(self, limit: int = 10) -> list:
        """
        Get recent security events.

        Args:
            limit: Maximum number of events to return

        Returns:
            List of recent security events
        """
        return self._security_events[-limit:]

    def reset_connection_attempts(self):
        """Reset connection attempt counter (for testing/admin purposes)."""
        self._connection_attempts = 0
        logger.info("Connection attempts counter reset")


def secure_operation(operation_name: str):
    """
    Decorator for securing OPC-UA operations with logging.

    Args:
        operation_name: Name of the operation for logging

    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            logger.debug(f"Starting secured OPC-UA operation: {operation_name}")

            try:
                result = func(self, *args, **kwargs)
                logger.debug(f"Completed secured OPC-UA operation: {operation_name}")
                return result

            except Exception as e:
                logger.error(f"Secured OPC-UA operation failed: {operation_name} - {e}", exc_info=True)
                raise

        return wrapper
    return decorator
