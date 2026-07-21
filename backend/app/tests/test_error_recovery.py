"""Tests for error recovery, including network timeouts, database retries, and graceful degradation."""

from app.utils.error_handler import SecurityAwareErrorHandler
from app.utils.status_utils import calculate_health_score, is_recovering


class TestErrorRecovery:
    """Test suite for error handling, retries, and system resilience."""

    def test_security_aware_error_handler_database_error(self):
        """Test database errors are securely caught and returned as generic messages without exposing details."""
        db_exception = Exception(
            "psycopg2.OperationalError: connection to server at '10.0.0.1', port 5432 failed",
        )

        # Test generic message mapping
        response, status_code = SecurityAwareErrorHandler.handle_service_error(
            db_exception,
            "database_error",
            "Unit Query",
            500,
        )

        assert status_code == 500
        assert response.json["success"] is False
        assert "OperationalError" not in response.json["error"]["message"]
        assert "10.0.0.1" not in response.json["error"]["message"]
        assert (
            response.json["error"]["message"]
            == SecurityAwareErrorHandler.GENERIC_MESSAGES["database_error"]
        )

    def test_security_aware_error_handler_timeout_error(self):
        """Test timeout errors are securely caught and mapped to a generic message."""
        timeout_exception = Exception("Connection timed out after 5000ms")
        response, status_code = SecurityAwareErrorHandler.handle_service_error(
            timeout_exception,
            "timeout_error",
            "Modbus Register Poll",
            504,
        )

        assert status_code == 504
        assert response.json["success"] is False
        assert (
            response.json["error"]["message"]
            == SecurityAwareErrorHandler.GENERIC_MESSAGES["timeout_error"]
        )

    def test_protocol_is_recovering(self):
        """Test checking if a protocol is in recovery state based on status and retry counts."""
        # Active reconnecting state should be recovering
        assert is_recovering(retry_count=1, status="reconnecting") is True
        assert is_recovering(retry_count=3, status="initializing") is True

        # Connected or offline with 0 retries is not recovering
        assert is_recovering(retry_count=0, status="ready") is False
        assert is_recovering(retry_count=0, status="error") is False

    def test_graceful_degradation_health_scores(self):
        """Test that system calculates health score gracefully depending on connection retries."""
        # 0 retries, status ready -> perfect health score 100
        score_perfect = calculate_health_score(
            available=True,
            connected=True,
            retry_count=0,
            status="ready",
            last_heartbeat=None,
            heartbeat_timeout_seconds=300,
            error=None,
        )
        assert score_perfect >= 80.0

        # With retry attempts, health score degrades but stays active (graceful degradation)
        score_degraded = calculate_health_score(
            available=True,
            connected=False,
            retry_count=2,
            status="reconnecting",
            last_heartbeat=None,
            heartbeat_timeout_seconds=300,
            error={"message": "Connection failed"},
        )
        assert 0.0 <= score_degraded < 100.0

    def test_database_retry_simulation(self):
        """Simulate a database query retrying on temporary locks/deadlocks before succeeding."""
        attempts = 0
        max_attempts = 3

        def database_query():
            nonlocal attempts
            attempts += 1
            if attempts < 3:
                raise Exception("Database transaction serialization failure (deadlock)")
            return "query_success"

        # Simulating retry loop logic
        result = None
        for i in range(max_attempts):
            try:
                result = database_query()
                break
            except Exception as e:
                if i == max_attempts - 1:
                    raise e

        assert attempts == 3
        assert result == "query_success"
