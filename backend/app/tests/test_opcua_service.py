"""Tests for OPC UA service."""

from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, mock_open, patch

import pytest

# Since opcua library might not be installed, we will mock the imports
# and test the logic of OPCUAClient class.
# Mock the import of opcua if it doesn't exist
from app.services import opcua_service
from app.services.opcua_service import OPCUAClient


@pytest.fixture
def mock_crypto():
    """Mock cryptography module classes."""
    with (
        patch("cryptography.x509.load_pem_x509_certificate") as mock_pem,
        patch("cryptography.x509.load_der_x509_certificate") as mock_der,
    ):
        certificate_mock = MagicMock()
        mock_pem.return_value = certificate_mock
        mock_der.return_value = certificate_mock

        # Configure standard non-expired certificate
        certificate_mock.not_valid_after_utc = datetime.now(timezone.utc) + timedelta(
            days=365,
        )
        certificate_mock.not_valid_before_utc = datetime.now(timezone.utc) - timedelta(
            days=5,
        )

        yield mock_pem, mock_der, certificate_mock


def test_validate_security_policy():
    """Test validating OPC UA security policy requirements."""
    client = OPCUAClient()

    # Valid policy
    assert client._validate_security_policy("None") is True
    assert (
        client._validate_security_policy("Basic256Sha256", require_strong=True) is True
    )

    # Invalid policy
    with pytest.raises(ValueError, match="Invalid OPC UA security policy"):
        client._validate_security_policy("SuperSecurePolicy")

    # Policy too weak for production
    with pytest.raises(ValueError, match="is too weak for production"):
        client._validate_security_policy("Basic128Rsa15", require_strong=True)


def test_normalize_certificate_datetime():
    """Test normalizing various datetime formats to UTC aware."""
    client = OPCUAClient()

    # None input
    with pytest.raises(ValueError, match="cannot be None"):
        client._normalize_certificate_datetime(None)

    # Already timezone-aware datetime
    dt_aware = datetime(2026, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    assert client._normalize_certificate_datetime(dt_aware) == dt_aware

    # Naive datetime
    dt_naive = datetime(2026, 6, 1, 12, 0, 0)  # noqa: DTZ001
    assert client._normalize_certificate_datetime(dt_naive) == datetime(
        2026,
        6,
        1,
        12,
        0,
        0,
        tzinfo=timezone.utc,
    )

    # Valid string
    assert (
        client._normalize_certificate_datetime("2026-06-01T12:00:00+00:00") == dt_aware
    )

    # Naive string
    assert client._normalize_certificate_datetime("2026-06-01 12:00:00") == dt_aware

    # Invalid string format
    with pytest.raises(ValueError, match="Invalid certificate datetime format"):
        client._normalize_certificate_datetime("not-a-datetime")

    # Unsupported type
    with pytest.raises(ValueError, match="Unsupported certificate datetime type"):
        client._normalize_certificate_datetime(12345)


def test_load_trust_certificate_file_not_found(mock_crypto):
    """Test loading certificate when path is missing or invalid."""
    client = OPCUAClient()
    client.trust_cert_file = "non_existent_file.crt"
    client.client = MagicMock()

    # Development environment error out
    with patch("os.path.exists", return_value=False):
        with pytest.raises(ValueError, match="trust certificate file does not exist"):
            client._load_trust_certificate(is_prod=False)

    # Production environment error out
    with patch("os.path.exists", return_value=False):
        with pytest.raises(ValueError, match="trust certificate file does not exist"):
            client._load_trust_certificate(is_prod=True)


def test_load_trust_certificate_expired(mock_crypto):
    """Test loading expired certificate throws ValueError."""
    _mock_pem, _mock_der, cert_mock = mock_crypto
    # Setup expired certificate dates
    cert_mock.not_valid_after_utc = datetime.now(timezone.utc) - timedelta(days=1)
    cert_mock.not_valid_before_utc = datetime.now(timezone.utc) - timedelta(days=5)

    client = OPCUAClient()
    client.trust_cert_file = "expired.pem"
    client.client = MagicMock()

    with (
        patch("os.path.exists", return_value=True),
        patch("builtins.open", mock_open(read_data=b"mock-data")),
    ):
        with pytest.raises(ValueError, match="certificate has expired"):
            client._load_trust_certificate(is_prod=False)


def test_load_trust_certificate_not_yet_valid(mock_crypto):
    """Test loading not yet valid certificate throws ValueError."""
    _mock_pem, _mock_der, cert_mock = mock_crypto
    # Setup not yet valid dates
    cert_mock.not_valid_after_utc = datetime.now(timezone.utc) + timedelta(days=5)
    cert_mock.not_valid_before_utc = datetime.now(timezone.utc) + timedelta(days=1)

    client = OPCUAClient()
    client.trust_cert_file = "not_valid_yet.pem"
    client.client = MagicMock()

    with (
        patch("os.path.exists", return_value=True),
        patch("builtins.open", mock_open(read_data=b"mock-data")),
    ):
        with pytest.raises(ValueError, match="is not yet valid"):
            client._load_trust_certificate(is_prod=False)


def test_load_trust_certificate_success(mock_crypto):
    """Test loading valid trust certificate."""
    _mock_pem, _mock_der, _cert_mock = mock_crypto
    client = OPCUAClient()
    client.trust_cert_file = "valid.pem"
    client.client = MagicMock()

    with (
        patch("os.path.exists", return_value=True),
        patch("builtins.open", mock_open(read_data=b"mock-data")),
    ):
        # Load successfully (returns None, triggers client load_server_certificate)
        client._load_trust_certificate(is_prod=False)
        assert client.client.load_server_certificate.called


def test_init_app_scenarios(app):
    """Test OPCUAClient initialization with app configurations in different environments."""
    # Force opcua_available = True for testing
    with (
        patch.object(opcua_service, "opcua_available", True),
        patch.object(opcua_service, "Client"),
    ):
        client = OPCUAClient()

        # Case 1: Insecure configuration in production (should fail or log error & skip)
        app.config["ENV"] = "production"
        app.config["OPCUA_SERVER_URL"] = "opc.tcp://prod-host:4840"
        app.config["OPCUA_USERNAME"] = ""  # No auth in production
        app.config["OPCUA_SECURITY_POLICY"] = "None"

        client.init_app(app)
        assert client.connected is False

        # Case 2: Development configuration with allow_fallback=True
        app.config["ENV"] = "development"
        app.config["OPCUA_USERNAME"] = "operator"
        app.config["OPCUA_PASSWORD"] = "secret"
        app.config["OPCUA_SECURITY_POLICY"] = "Basic256Sha256"
        app.config["OPCUA_SECURITY_MODE"] = "SignAndEncrypt"
        app.config["OPCUA_CERT_FILE"] = ""  # missing certs
        app.config["OPCUA_ALLOW_INSECURE_FALLBACK"] = True

        client.init_app(app)
        # Should fallback to None/None
        assert client.security_policy == "None"
        assert client.security_mode == "None"


def test_connect_and_disconnect():
    """Test connect and disconnect state changes."""
    with patch.object(opcua_service, "opcua_available", True):
        client = OPCUAClient()
        client.client = MagicMock()

        # Connect success
        assert client.connect() is True
        assert client.connected is True

        # Connect failure
        client.client.connect.side_effect = Exception("Connection Refused")
        with pytest.raises(ConnectionError):
            client.connect()
        assert client.connected is False

        # Disconnect
        client.connected = True
        client.disconnect()
        assert client.connected is False
        assert client.client.disconnect.called


def test_add_node_mapping_validations():
    """Test add_node_mapping parameter validations."""
    client = OPCUAClient()

    # Success mapping
    client.add_node_mapping("ns=2;s=Temp", "UNIT001", "temperature")
    assert "ns=2;s=Temp" in client._node_mappings

    # Invalid node_id
    with pytest.raises(ValueError, match="node_id must be a non-empty string"):
        client.add_node_mapping(None, "UNIT001", "temperature")

    # Invalid unit_id
    with pytest.raises(ValueError, match="unit_id must be a non-empty string"):
        client.add_node_mapping("ns=2;s=Temp", "", "temperature")


def test_subscribe_to_node():
    """Test subscribe_to_node handling."""
    with patch.object(opcua_service, "opcua_available", True):
        client = OPCUAClient()
        client.client = MagicMock()

        # When disconnected
        client.connected = False
        assert (
            client.subscribe_to_node("ns=2;s=Temp", "UNIT001", "temperature") is False
        )

        # When connected
        client.connected = True
        node_mock = MagicMock()
        client.client.get_node.return_value = node_mock

        assert client.subscribe_to_node("ns=2;s=Temp", "UNIT001", "temperature") is True
        assert "ns=2;s=Temp" in client._subscribed_nodes


def test_read_node_value():
    """Test reading node value with size validations and scaling."""
    with patch.object(opcua_service, "opcua_available", True):
        client = OPCUAClient()
        client.client = MagicMock()
        client.connected = True

        # Mock node get_data_value
        node_mock = MagicMock()
        client.client.get_node.return_value = node_mock

        data_value_mock = MagicMock()
        data_value_mock.Value.Value = 20.0
        data_value_mock.StatusCode.is_good.return_value = True
        data_value_mock.SourceTimestamp = datetime.now(timezone.utc)
        node_mock.get_data_value.return_value = data_value_mock

        # Read normal node without scaling
        res = client.read_node_value("ns=2;s=Temp")
        assert res["value"] == 20.0
        assert res["quality"] == "GOOD"

        # Read with scaling
        client.add_node_mapping(
            "ns=2;s=Temp",
            "UNIT001",
            "temperature",
            scale_factor=2.0,
            offset=5.0,
        )
        res_scaled = client.read_node_value("ns=2;s=Temp")
        assert res_scaled["value"] == 45.0  # (20 * 2.0) + 5.0

        # Read value exceeding maximum data size (DoS mitigation)
        large_data_value = MagicMock()
        large_data_value.Value.Value = "x" * (client.MAX_DATA_SIZE + 100)
        large_data_value.StatusCode.is_good.return_value = True
        node_mock.get_data_value.return_value = large_data_value

        assert client.read_node_value("ns=2;s=Temp") is None


def test_process_and_store_node_data(app):
    """Test processing and storing read node data with dependencies."""
    with patch.object(opcua_service, "opcua_available", True):
        storage_service_mock = MagicMock()
        storage_service_mock.store_sensor_data.return_value = True

        client = OPCUAClient(app, storage_service_mock)
        client.client = MagicMock()
        client.connected = True

        # Mapping node ID
        node_id = "ns=2;s=Temp"
        client.add_node_mapping(node_id, "UNIT001", "temperature")

        # Mock node read
        node_mock = MagicMock()
        client.client.get_node.return_value = node_mock
        data_value_mock = MagicMock()
        data_value_mock.Value.Value = 25.0
        data_value_mock.StatusCode.is_good.return_value = True
        data_value_mock.SourceTimestamp = datetime.now(timezone.utc)
        node_mock.get_data_value.return_value = data_value_mock

        # Process and store data success
        assert client.process_and_store_node_data(node_id) is True
        assert storage_service_mock.store_sensor_data.called


def test_poll_subscribed_nodes_rate_limiting():
    """Test rate limiting of polling nodes."""
    with patch.object(opcua_service, "opcua_available", True):
        client = OPCUAClient()
        client.connected = True
        client._subscribed_nodes = {"ns=2;s=Temp": MagicMock()}

        with patch.object(client, "process_and_store_node_data") as mock_process:
            # First poll allowed
            client.poll_subscribed_nodes()
            assert mock_process.called

            # Second poll immediately blocked by rate limiting
            mock_process.reset_mock()
            client.poll_subscribed_nodes()
            assert not mock_process.called


def test_browse_server_nodes():
    """Test browsing nodes on server."""
    with (
        patch.object(opcua_service, "opcua_available", True),
        patch.object(opcua_service, "ua") as mock_ua,
    ):
        mock_ua.NodeClass.Variable = "Variable"
        client = OPCUAClient()
        client.connected = True
        client.client = MagicMock()

        root_node_mock = MagicMock()
        client.client.get_node.return_value = root_node_mock

        child_mock = MagicMock()
        child_mock.nodeid = "ns=2;s=Var"
        child_mock.get_display_name().Text = "Temp"
        child_mock.get_node_class.return_value = "Variable"
        child_mock.get_data_type_as_variant_type.return_value = "Float"
        child_mock.get_value.return_value = 23.5

        root_node_mock.get_children.return_value = [child_mock]

        nodes = client.browse_server_nodes()
        assert len(nodes) == 1
        assert nodes[0]["display_name"] == "Temp"
        assert nodes[0]["value"] == 23.5


def test_get_status():
    """Test getting OPC UA service status."""
    with patch.object(opcua_service, "opcua_available", True):
        client = OPCUAClient()
        client.connected = True
        client.server_url = "opc.tcp://localhost:4840"
        client._subscribed_nodes = {"ns=2;i=10": MagicMock()}

        status = client.get_status()
        assert status["available"] is True
        assert status["connected"] is True
        assert status["subscribed_nodes"] == 1
