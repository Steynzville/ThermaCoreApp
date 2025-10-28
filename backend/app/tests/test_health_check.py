"""Tests for health check endpoint."""

from datetime import datetime
from unittest.mock import Mock

class TestHealthCheckEndpoint:
    """Test health check endpoint with various scenarios."""

    def test_health_check_basic(self, client):
        """Test basic health check endpoint."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.get_json()

        assert "status" in data
        assert data["status"] == "healthy"
        assert "service" in data
        assert data["service"] == "ThermaCore SCADA Backend"
        assert "version" in data
        assert data["version"] == "2.9.0"
        assert "timestamp" in data
        assert "coverage" in data
        assert data["coverage"]["frontend"] == "61.12%"
        assert data["coverage"]["backend"] == "63.12%"

    def test_health_check_timestamp_format(self, client):
        """Test that timestamp is in ISO format."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.get_json()

        # Verify timestamp can be parsed
        assert "timestamp" in data
        # Should not raise exception
        datetime.fromisoformat(data["timestamp"])

class TestDetailedHealthCheckEndpoint:
    """Test detailed health check endpoint with various scenarios."""

    def test_detailed_health_check_basic(self, client):
        """Test basic detailed health check endpoint."""
        response = client.get("/health/detailed")

        assert response.status_code == 200
        data = response.get_json()

        assert "status" in data
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "services" in data
        assert "tests_passing" in data
        assert data["tests_passing"] == 2317
        assert "coverage" in data
        assert data["coverage"]["frontend"] == "61.12%"
        assert data["coverage"]["backend"] == "63.12%"

    def test_detailed_health_check_services(self, client):
        """Test that detailed health check includes service status."""
        response = client.get("/health/detailed")

        assert response.status_code == 200
        data = response.get_json()

        assert "services" in data
        services = data["services"]

        # Check that key services are reported
        assert "database" in services
        assert "websocket" in services
        assert "anomaly_detection" in services
        assert "protocol_simulator" in services

    def test_health_check_with_none_opcua_client(self, app, client):
        """Test detailed health check when opcua_client is None."""
        with app.app_context():
            # Set opcua_client to None to simulate initialization failure
            app.opcua_client = None

            response = client.get("/health/detailed")

            assert response.status_code == 200
            data = response.get_json()

            # Should not crash and should still return healthy
            assert data["status"] == "healthy"
            assert "services" in data

    def test_health_check_with_working_opcua_client(self, app, client):
        """Test detailed health check when opcua_client is working."""
        with app.app_context():
            # Mock a working OPC UA client
            mock_client = Mock()
            mock_client.get_status.return_value = {
                "available": True,
                "connected": True,
                "server_url": "opc.tcp://localhost:4840",
            }
            app.opcua_client = mock_client

            response = client.get("/health/detailed")

            assert response.status_code == 200
            data = response.get_json()

            # Should include service status
            assert "services" in data

    def test_health_check_with_exception_in_get_status(self, app, client):
        """Test detailed health check when get_status() raises an exception."""
        with app.app_context():
            # Mock a client that raises an exception
            mock_client = Mock()
            mock_client.get_status.side_effect = Exception("Connection failed")
            app.opcua_client = mock_client

            response = client.get("/health/detailed")

            # Should not crash
            assert response.status_code == 200
            data = response.get_json()

            # Should still report healthy (degraded services don't affect overall status)
            assert data["status"] == "healthy"
            assert "services" in data

    def test_health_check_all_services_none(self, app, client):
        """Test detailed health check when all services are None."""
        with app.app_context():
            # Set all services to None
            app.mqtt_client = None
            app.websocket_service = None
            app.realtime_processor = None
            app.opcua_client = None
            app.protocol_simulator = None
            app.data_storage_service = None

            response = client.get("/health/detailed")

            # Should not crash
            assert response.status_code == 200
            data = response.get_json()

            # Should still report healthy
            assert data["status"] == "healthy"

    def test_health_check_mixed_services(self, app, client):
        """Test detailed health check with some working and some failing services."""
        with app.app_context():
            # Mock working OPC UA client
            working_client = Mock()
            working_client.get_status.return_value = {
                "available": True,
                "connected": True,
            }
            app.opcua_client = working_client

            # Mock failing MQTT client
            failing_client = Mock()
            failing_client.get_status.side_effect = Exception("MQTT connection error")
            app.mqtt_client = failing_client

            response = client.get("/health/detailed")

            assert response.status_code == 200
            data = response.get_json()

            # Should still report healthy
            assert data["status"] == "healthy"
            assert "services" in data

    def test_detailed_health_check_timestamp_format(self, client):
        """Test that timestamp is in ISO format."""
        response = client.get("/health/detailed")

        assert response.status_code == 200
        data = response.get_json()

        # Verify timestamp can be parsed
        assert "timestamp" in data
        # Should not raise exception
        datetime.fromisoformat(data["timestamp"])
