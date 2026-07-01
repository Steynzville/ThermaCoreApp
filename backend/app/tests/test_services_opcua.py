"""Additional coverage tests for OPC UA service internals."""

from unittest.mock import MagicMock, patch

import app.services.opcua_service as opcua_service
from app.services.opcua_service import OPCUAClient


def test_read_node_value_and_processing_failure_paths(app):
    with patch.object(opcua_service, "opcua_available", True):
        client = OPCUAClient(app)
        client.client = MagicMock()
        client.connected = True

        client.client.get_node.side_effect = Exception("boom")
        assert client.read_node_value("ns=2;s=Bad") is None

        client.add_node_mapping("ns=2;s=Temp", "TEST001", "temperature")
        client.read_node_value = MagicMock(return_value={"value": 1, "quality": "GOOD", "timestamp": "x"})
        assert client.process_and_store_node_data("ns=2;s=Temp") is False


def test_poll_and_browse_limits_and_errors():
    with patch.object(opcua_service, "opcua_available", True), patch.object(
        opcua_service,
        "ua",
    ) as mock_ua:
        mock_ua.NodeClass.Variable = "Variable"

        client = OPCUAClient()
        client.connected = True
        client.client = MagicMock()

        # Rate-limit and max-node limiting branches
        client._subscribed_nodes = {f"n{i}": MagicMock() for i in range(client.MAX_NODES_PER_POLL + 1)}
        with patch.object(client, "process_and_store_node_data") as process:
            client.poll_subscribed_nodes()
            assert process.called

        # Browse child exception and outer exception branches
        child = MagicMock()
        child.get_display_name.side_effect = Exception("bad child")
        root = MagicMock()
        root.get_children.return_value = [child]
        client.client.get_node.return_value = root
        assert client.browse_server_nodes() == []

        client.client.get_node.side_effect = Exception("boom")
        assert client.browse_server_nodes() == []
