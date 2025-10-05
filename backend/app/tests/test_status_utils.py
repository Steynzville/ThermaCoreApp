"""Tests for status_utils.py - Business logic for protocol status calculations."""

import pytest
from datetime import datetime, timezone, timedelta
from app.utils.status_utils import (
    AvailabilityLevel,
    utc_now,
    is_heartbeat_stale,
    get_time_since_last_heartbeat,
    is_recovering,
    compute_health_score,
    compute_availability_level,
    record_error
)


class TestStatusUtilities:
    """Test the status utility functions."""
    
    def test_utc_now_returns_timezone_aware(self):
        """Test that utc_now returns timezone-aware datetime."""
        result = utc_now()
        assert result.tzinfo is not None
        assert result.tzinfo == timezone.utc
    
    def test_is_heartbeat_stale_no_heartbeat(self):
        """Test heartbeat staleness with no heartbeat."""
        assert is_heartbeat_stale(None) is True
        assert is_heartbeat_stale(None, 60) is True
    
    def test_is_heartbeat_stale_fresh_heartbeat(self):
        """Test heartbeat staleness with fresh heartbeat."""
        now = utc_now()
        recent = now - timedelta(seconds=30)
        assert is_heartbeat_stale(recent, 300) is False
        assert is_heartbeat_stale(recent, 60) is False
    
    def test_is_heartbeat_stale_stale_heartbeat(self):
        """Test heartbeat staleness with stale heartbeat."""
        now = utc_now()
        old = now - timedelta(seconds=400)
        assert is_heartbeat_stale(old, 300) is True
        assert is_heartbeat_stale(old, 500) is False
    
    def test_get_time_since_last_heartbeat_none(self):
        """Test time since heartbeat with None."""
        assert get_time_since_last_heartbeat(None) is None
    
    def test_get_time_since_last_heartbeat_valid(self):
        """Test time since heartbeat with valid timestamp."""
        now = utc_now()
        past = now - timedelta(seconds=123.5)
        result = get_time_since_last_heartbeat(past)
        # Allow some tolerance for execution time
        assert 123.0 <= result <= 124.0
    
    def test_is_recovering_true_cases(self):
        """Test recovery state detection - true cases."""
        assert is_recovering(1, "reconnecting") is True
        assert is_recovering(2, "initializing") is True
        assert is_recovering(5, "reconnecting") is True
    
    def test_is_recovering_false_cases(self):
        """Test recovery state detection - false cases."""
        assert is_recovering(0, "reconnecting") is False
        assert is_recovering(1, "ready") is False
        assert is_recovering(0, "ready") is False
        assert is_recovering(1, "error") is False
    
    def test_compute_health_score_not_available(self):
        """Test health score when not available."""
        score = compute_health_score(
            available=False, connected=False, status="error", 
            last_heartbeat=None, heartbeat_timeout_seconds=300,
            error=None, retry_count=0
        )
        assert score == 0.0
    
    def test_compute_health_score_available_only(self):
        """Test health score when available but not connected."""
        score = compute_health_score(
            available=True, connected=False, status="initializing", 
            last_heartbeat=None, heartbeat_timeout_seconds=300,
            error=None, retry_count=0
        )
        assert score == 30.0
    
    def test_compute_health_score_fully_functional(self):
        """Test health score when fully functional."""
        now = utc_now()
        recent = now - timedelta(seconds=30)
        score = compute_health_score(
            available=True, connected=True, status="ready", 
            last_heartbeat=recent, heartbeat_timeout_seconds=300,
            error=None, retry_count=0
        )
        # 30 (available) + 40 (connected) + 20 (ready) + 10 (fresh heartbeat)
        assert score == 100.0
    
    def test_compute_health_score_with_errors(self):
        """Test health score with errors and retries."""
        now = utc_now()
        recent = now - timedelta(seconds=30)
        score = compute_health_score(
            available=True, connected=True, status="ready", 
            last_heartbeat=recent, heartbeat_timeout_seconds=300,
            error={"code": "SOME_ERROR"}, retry_count=2
        )
        # 100 (perfect) - 15 (error) - 4 (2 retries * 2) = 81
        assert score == 81.0
    
    def test_compute_availability_level_unavailable(self):
        """Test availability level when unavailable."""
        level = compute_availability_level(
            available=False, connected=False, status="not_initialized",
            last_heartbeat=None, heartbeat_timeout_seconds=300,
            error=None, retry_count=0
        )
        assert level == AvailabilityLevel.UNAVAILABLE
    
    def test_compute_availability_level_fully_available(self):
        """Test availability level when fully available."""
        now = utc_now()
        recent = now - timedelta(seconds=30)
        level = compute_availability_level(
            available=True, connected=True, status="ready",
            last_heartbeat=recent, heartbeat_timeout_seconds=300,
            error=None, retry_count=0
        )
        assert level == AvailabilityLevel.FULLY_AVAILABLE
    
    def test_compute_availability_level_degraded_stale_heartbeat(self):
        """Test availability level with stale heartbeat."""
        now = utc_now()
        old = now - timedelta(seconds=400)
        level = compute_availability_level(
            available=True, connected=True, status="ready",
            last_heartbeat=old, heartbeat_timeout_seconds=300,
            error=None, retry_count=0
        )
        assert level == AvailabilityLevel.DEGRADED
    
    def test_compute_availability_level_error_state(self):
        """Test availability level in error state."""
        level = compute_availability_level(
            available=True, connected=False, status="error",
            last_heartbeat=None, heartbeat_timeout_seconds=300,
            error={"code": "CONNECTION_ERROR"}, retry_count=0
        )
        assert level == AvailabilityLevel.DEGRADED
    
    def test_record_error_structure(self):
        """Test error record creation."""
        error = record_error("TEST_ERROR", "Test message", {"key": "value"})
        
        assert error["code"] == "TEST_ERROR"
        assert error["message"] == "Test message"
        assert error["context"]["key"] == "value"
        assert "timestamp" in error
        # Verify timestamp is ISO format
        datetime.fromisoformat(error["timestamp"].replace('Z', '+00:00'))
    
    def test_record_error_minimal(self):
        """Test error record with minimal parameters."""
        error = record_error("MINIMAL_ERROR")
        
        assert error["code"] == "MINIMAL_ERROR"
        assert error["message"] is None
        assert error["context"] == {}
        assert "timestamp" in error


if __name__ == "__main__":
    pytest.main([__file__])