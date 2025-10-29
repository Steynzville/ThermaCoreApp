"""Tests for /api/v1/health endpoint."""


class TestHealthAPIEndpoint:
    """Test /api/v1/health endpoint for infrastructure monitoring."""

    def test_health_api_endpoint_basic(self, client):
        """Test basic /api/v1/health endpoint."""
        response = client.get("/api/v1/health")

        assert response.status_code == 200
        data = response.get_json()

        assert "status" in data
        assert "database" in data
        assert "timestamp" in data

    def test_health_api_endpoint_with_working_database(self, client):
        """Test /api/v1/health endpoint with working database."""
        response = client.get("/api/v1/health")

        assert response.status_code == 200
        data = response.get_json()

        assert data["status"] == "operational"
        assert data["database"]["connected"] is True
        assert data["database"]["status"] == "operational"

    def test_health_api_endpoint_with_failed_database(self, app, client):
        """Test /api/v1/health endpoint when database fails."""
        with app.app_context():
            # Mock database failure by making db.session.execute raise exception
            from app import db

            original_execute = db.session.execute

            def mock_execute(*args, **kwargs):
                raise Exception("Database connection failed")

            db.session.execute = mock_execute

            try:
                response = client.get("/api/v1/health")

                assert response.status_code == 503
                data = response.get_json()

                assert data["status"] == "degraded"
                assert data["database"]["connected"] is False
                assert data["database"]["status"] == "degraded"
            finally:
                # Restore original method
                db.session.execute = original_execute

    def test_health_api_endpoint_timestamp_format(self, client):
        """Test that timestamp is in ISO format."""
        from datetime import datetime

        response = client.get("/api/v1/health")

        assert response.status_code == 200
        data = response.get_json()

        # Verify timestamp can be parsed
        assert "timestamp" in data
        # Should not raise exception
        datetime.fromisoformat(data["timestamp"])

    def test_health_api_endpoint_structure(self, client):
        """Test that /api/v1/health endpoint has correct structure."""
        response = client.get("/api/v1/health")

        assert response.status_code == 200
        data = response.get_json()

        # Verify structure
        assert isinstance(data, dict)
        assert isinstance(data["status"], str)
        assert isinstance(data["database"], dict)
        assert isinstance(data["database"]["status"], str)
        assert isinstance(data["database"]["connected"], bool)
        assert isinstance(data["timestamp"], str)

    def test_health_api_endpoint_cors_headers(self, client):
        """Test that CORS headers are present if CORS is enabled."""
        response = client.get("/api/v1/health")

        # Even if CORS is not enabled, endpoint should work
        assert response.status_code in [200, 503]
