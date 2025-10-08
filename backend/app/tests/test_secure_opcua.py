"""Tests for secure OPC-UA wrapper and client."""
import pytest
from unittest.mock import Mock, patch

from app.services.secure_opcua_wrapper import SecureOPCUAWrapper, secure_operation
from app.services.secure_opcua_client import SecureOPCUAClient


class TestSecureOPCUAWrapper:
    """Test secure OPC-UA wrapper functionality."""

    def test_initialization(self):
        """Test wrapper initialization."""
        wrapper = SecureOPCUAWrapper()

        assert wrapper._client is None
        assert wrapper._connection_attempts == 0
        assert wrapper._max_connection_attempts == 3
        assert isinstance(wrapper._security_events, list)

    def test_set_client(self):
        """Test setting client instance."""
        wrapper = SecureOPCUAWrapper()
        mock_client = Mock()

        wrapper.set_client(mock_client)

        assert wrapper._client == mock_client

    def test_validate_node_id_valid(self):
        """Test node ID validation with valid input."""
        wrapper = SecureOPCUAWrapper()

        assert wrapper.validate_node_id("ns=2;i=123") is True
        assert wrapper.validate_node_id("i=85") is True

    def test_validate_node_id_invalid(self):
        """Test node ID validation with invalid input."""
        wrapper = SecureOPCUAWrapper()

        assert wrapper.validate_node_id("") is False
        assert wrapper.validate_node_id(None) is False
        assert wrapper.validate_node_id(123) is False
        assert wrapper.validate_node_id("a" * 300) is False  # Too long

    def test_sanitize_node_id(self):
        """Test node ID sanitization."""
        wrapper = SecureOPCUAWrapper()

        result = wrapper.sanitize_node_id("ns=2;i=123")
        assert result is not None
        assert isinstance(result, str)

        # Test with empty node ID
        result = wrapper.sanitize_node_id("")
        assert result == "***INVALID***"

    def test_log_security_event(self):
        """Test security event logging."""
        wrapper = SecureOPCUAWrapper()

        wrapper.log_security_event('test_event', {'key': 'value'})

        assert len(wrapper._security_events) == 1
        event = wrapper._security_events[0]
        assert event['event_type'] == 'test_event'
        assert event['details'] == {'key': 'value'}
        assert 'timestamp' in event

    def test_log_security_event_limit(self):
        """Test security event log size limit."""
        wrapper = SecureOPCUAWrapper()

        # Add more than 100 events
        for i in range(150):
            wrapper.log_security_event(f'event_{i}', {})

        # Should only keep last 100
        assert len(wrapper._security_events) == 100

    def test_secure_connect_no_client(self):
        """Test secure connect without client."""
        wrapper = SecureOPCUAWrapper()

        with pytest.raises(ConnectionError, match="OPC-UA client not initialized"):
            wrapper.secure_connect()

    def test_secure_connect_success(self):
        """Test successful secure connection."""
        wrapper = SecureOPCUAWrapper()
        mock_client = Mock()
        mock_client.connect.return_value = True
        wrapper.set_client(mock_client)

        result = wrapper.secure_connect()

        assert result is True
        assert wrapper._connection_attempts == 0  # Reset on success
        mock_client.connect.assert_called_once()

    def test_secure_connect_rate_limit(self):
        """Test connection rate limiting."""
        wrapper = SecureOPCUAWrapper()
        mock_client = Mock()
        mock_client.connect.side_effect = ConnectionError("Failed")
        wrapper.set_client(mock_client)

        # Attempt connections up to the limit
        for _ in range(3):
            try:
                wrapper.secure_connect()
            except ConnectionError:
                pass

        # Next attempt should hit rate limit
        with pytest.raises(ConnectionError, match="Maximum connection attempts exceeded"):
            wrapper.secure_connect()

    def test_secure_read_node_invalid_id(self):
        """Test secure read with invalid node ID."""
        wrapper = SecureOPCUAWrapper()
        mock_client = Mock()
        wrapper.set_client(mock_client)

        result = wrapper.secure_read_node("")

        assert result is None

    def test_secure_read_node_success(self):
        """Test successful secure node read."""
        wrapper = SecureOPCUAWrapper()
        mock_client = Mock()
        mock_client.read_node_value.return_value = {
            'value': 123.45,
            'quality': 'GOOD'
        }
        wrapper.set_client(mock_client)

        result = wrapper.secure_read_node("ns=2;i=123")

        assert result is not None
        assert result['value'] == 123.45
        assert result['quality'] == 'GOOD'

    def test_get_security_status(self):
        """Test getting security status."""
        wrapper = SecureOPCUAWrapper()

        status = wrapper.get_security_status()

        assert 'wrapper_enabled' in status
        assert status['wrapper_enabled'] is True
        assert 'opcua_available' in status
        assert 'connection_attempts' in status
        assert 'max_connection_attempts' in status

    def test_get_security_events(self):
        """Test getting security events."""
        wrapper = SecureOPCUAWrapper()

        # Add some events
        for i in range(5):
            wrapper.log_security_event(f'event_{i}', {})

        events = wrapper.get_security_events(limit=3)

        assert len(events) == 3

    def test_reset_connection_attempts(self):
        """Test resetting connection attempts."""
        wrapper = SecureOPCUAWrapper()
        wrapper._connection_attempts = 5

        wrapper.reset_connection_attempts()

        assert wrapper._connection_attempts == 0


class TestSecureOperationDecorator:
    """Test secure operation decorator."""

    def test_secure_operation_decorator(self):
        """Test that decorator logs operations."""

        class TestClass:
            @secure_operation("test_op")
            def test_method(self):
                return "success"

        obj = TestClass()
        result = obj.test_method()

        assert result == "success"

    def test_secure_operation_decorator_with_exception(self):
        """Test decorator with exception."""

        class TestClass:
            @secure_operation("test_op")
            def test_method(self):
                raise ValueError("Test error")

        obj = TestClass()

        with pytest.raises(ValueError, match="Test error"):
            obj.test_method()


class TestSecureOPCUAClient:
    """Test secure OPC-UA client."""

    @pytest.fixture
    def mock_app(self):
        """Create mock Flask app."""
        app = Mock()
        app.config = {
            'OPCUA_SERVER_URL': 'opc.tcp://localhost:4840',
            'OPCUA_USERNAME': None,
            'OPCUA_PASSWORD': None,
            'OPCUA_SECURITY_POLICY': 'None',
            'OPCUA_SECURITY_MODE': 'None',
            'OPCUA_TIMEOUT': 30,
            'OPCUA_CERT_FILE': None,
            'OPCUA_PRIVATE_KEY_FILE': None,
            'OPCUA_TRUST_CERT_FILE': None,
            'OPCUA_ALLOW_INSECURE_FALLBACK': False,
        }
        return app

    def test_initialization(self, mock_app):
        """Test secure client initialization."""
        with patch('app.services.secure_opcua_client.opcua_available', False):
            client = SecureOPCUAClient()

            assert hasattr(client, '_security_wrapper')
            assert isinstance(client._security_wrapper, SecureOPCUAWrapper)

    def test_get_status_includes_security(self, mock_app):
        """Test that status includes security information."""
        with patch('app.services.secure_opcua_client.opcua_available', False):
            client = SecureOPCUAClient()

            status = client.get_status()

            assert 'security' in status
            assert isinstance(status['security'], dict)

    def test_get_security_events(self, mock_app):
        """Test getting security events."""
        with patch('app.services.secure_opcua_client.opcua_available', False):
            client = SecureOPCUAClient()

            # Add some events
            client._security_wrapper.log_security_event('test', {})

            events = client.get_security_events(limit=10)

            assert isinstance(events, list)
            assert len(events) > 0

    def test_reset_security_state(self, mock_app):
        """Test resetting security state."""
        with patch('app.services.secure_opcua_client.opcua_available', False):
            client = SecureOPCUAClient()
            client._security_wrapper._connection_attempts = 5

            client.reset_security_state()

            assert client._security_wrapper._connection_attempts == 0

    def test_subscribe_to_node_validates_node_id(self, mock_app):
        """Test that subscribe validates node ID."""
        with patch('app.services.secure_opcua_client.opcua_available', False):
            client = SecureOPCUAClient()
            client.connected = True

            # Test with invalid node ID
            result = client.subscribe_to_node("", "unit1", "temperature")

            assert result is False


class TestIntegration:
    """Integration tests for secure OPC-UA components."""

    def test_wrapper_and_client_integration(self):
        """Test wrapper and client work together."""
        with patch('app.services.secure_opcua_client.opcua_available', False):
            client = SecureOPCUAClient()

            # Verify wrapper is properly initialized
            assert client._security_wrapper is not None
            assert client._security_wrapper._client == client

            # Verify status includes both client and security info
            status = client.get_status()
            assert 'available' in status
            assert 'security' in status
