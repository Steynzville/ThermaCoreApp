"""Protocol status utilities - Business logic decoupled from ProtocolStatus data class.

This module contains business logic functions for protocol status calculations,
moved out of the ProtocolStatus data class to follow separation of concerns.
The ProtocolStatus class should remain focused on data representation while
this module handles the business logic computations.

Functions moved from ProtocolStatus class:
- is_heartbeat_stale()
- get_time_since_last_heartbeat()
- is_recovering()
- compute_health_score()
- compute_availability_level()
- update_availability_level()
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from enum import Enum

# Import AvailabilityLevel from the protocol base module
# Note: This creates a circular import risk, but since we only need the enum
# and not the ProtocolStatus class, it should be manageable


class AvailabilityLevel(Enum):
    """Enhanced availability levels for more granular status reporting."""
    UNAVAILABLE = 0      # Service not initialized or in fatal error
    DEGRADED = 1         # Service partially available with reduced functionality  
    AVAILABLE = 2        # Service initialized but not connected
    FULLY_AVAILABLE = 3  # Service initialized and connected with healthy heartbeat


def utc_now() -> datetime:
    """Get current UTC time as timezone-aware datetime.

    This function ensures all datetime operations in status utils use
    timezone-aware UTC datetimes consistently with the rest of the application.
    """
    return datetime.now(timezone.utc)


def is_heartbeat_stale(last_heartbeat: Optional[datetime], heartbeat_timeout_seconds: int = 300) -> bool:
    """Check if heartbeat is stale based on timeout threshold.

    Args:
        last_heartbeat: The last heartbeat timestamp (can be None)
        heartbeat_timeout_seconds: Timeout threshold in seconds (default: 300/5 minutes)

    Returns:
        bool: True if heartbeat is stale, False if fresh
    """
    if not last_heartbeat:
        return True

    time_diff = utc_now() - last_heartbeat
    return time_diff.total_seconds() > heartbeat_timeout_seconds


def get_time_since_last_heartbeat(last_heartbeat: Optional[datetime]) -> Optional[float]:
    """Get time in seconds since last heartbeat.

    Args:
        last_heartbeat: The last heartbeat timestamp (can be None)

    Returns:
        Optional[float]: Time in seconds since last heartbeat, None if no heartbeat
    """
    if not last_heartbeat:
        return None

    time_diff = utc_now() - last_heartbeat
    return time_diff.total_seconds()


def is_recovering(retry_count: int, status: str) -> bool:
    """Check if protocol is in recovery state (has retry attempts).

    Args:
        retry_count: Number of retry attempts
        status: Current protocol status

    Returns:
        bool: True if protocol is in recovery state
    """
    return retry_count > 0 and status in ["reconnecting", "initializing"]


def compute_health_score(
    available: bool,
    connected: bool, 
    status: str,
    last_heartbeat: Optional[datetime],
    heartbeat_timeout_seconds: int,
    error: Optional[Dict[str, Any]],
    retry_count: int
) -> float:
    """Compute health score (0-100) based on current state.

    Args:
        available: Whether protocol is available
        connected: Whether protocol is connected
        status: Current protocol status
        last_heartbeat: Last heartbeat timestamp
        heartbeat_timeout_seconds: Heartbeat timeout threshold
        error: Current error information
        retry_count: Number of retry attempts

    Returns:
        float: Health score between 0.0 and 100.0
    """
    if not available:
        return 0.0

    score = 30.0  # Base score for being available

    if connected:
        score += 40.0  # Additional score for connection

    if status == "ready":
        score += 20.0  # Additional score for ready status

    if not is_heartbeat_stale(last_heartbeat, heartbeat_timeout_seconds):
        score += 10.0  # Additional score for fresh heartbeat

    # Deduct points for errors and retries
    if error:
        score -= 15.0
    if retry_count > 0:
        score -= min(retry_count * 2, 10.0)

    return max(0.0, min(100.0, score))


def compute_availability_level(
    available: bool,
    connected: bool,
    status: str,
    last_heartbeat: Optional[datetime],
    heartbeat_timeout_seconds: int,
    error: Optional[Dict[str, Any]],
    retry_count: int
) -> AvailabilityLevel:
    """Refined availability inference logic.

    Args:
        available: Whether protocol is available
        connected: Whether protocol is connected  
        status: Current protocol status
        last_heartbeat: Last heartbeat timestamp
        heartbeat_timeout_seconds: Heartbeat timeout threshold
        error: Current error information
        retry_count: Number of retry attempts

    Returns:
        AvailabilityLevel: Computed availability level
    """
    # Priority order: availability -> connection -> status -> heartbeat
    if not available:
        return AvailabilityLevel.UNAVAILABLE

    # Check for error states first
    if status == "error" or (error and not is_recovering(retry_count, status)):
        return AvailabilityLevel.DEGRADED

    # Full availability requires connection + ready status + fresh heartbeat
    if connected and status == "ready" and not is_heartbeat_stale(last_heartbeat, heartbeat_timeout_seconds):
        return AvailabilityLevel.FULLY_AVAILABLE

    # Available but not fully functional
    if connected or status in ["ready", "degraded"]:
        # Degraded if heartbeat is stale or status is degraded
        if is_heartbeat_stale(last_heartbeat, heartbeat_timeout_seconds) or status == "degraded":
            return AvailabilityLevel.DEGRADED
        return AvailabilityLevel.AVAILABLE

    # Initializing or reconnecting states
    if status in ["initializing", "reconnecting"]:
        return AvailabilityLevel.DEGRADED

    # Fallback: available but not connected
    return AvailabilityLevel.AVAILABLE if available else AvailabilityLevel.UNAVAILABLE


def record_error(error_code: str, error_message: str = None, context: Dict[str, Any] = None) -> Dict[str, Any]:
    """Create an error record with enhanced context and timestamp.

    Args:
        error_code: Error code identifier
        error_message: Human-readable error message
        context: Additional error context information

    Returns:
        Dict[str, Any]: Error record dictionary
    """
    return {
        "code": error_code,
        "message": error_message,
        "context": context or {},
        "timestamp": utc_now().isoformat()
    }