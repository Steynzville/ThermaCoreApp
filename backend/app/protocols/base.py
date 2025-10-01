from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Literal

# Import utilities and types
from app.utils.status_utils import (
    AvailabilityLevel, utc_now, is_heartbeat_stale, get_time_since_last_heartbeat,
    is_recovering, compute_health_score, compute_availability_level, record_error
)

# PR1a: Enhanced status types and availability semantics
StatusType = Literal["not_initialized", "initializing", "ready", "error", "degraded", "unknown", "reconnecting"]

@dataclass
class ProtocolStatus:
    """Normalized status representation for any protocol adapter.
    
    PR1a enhancements:
    - Refined availability inference logic with proper status cascading
    - Enhanced heartbeat timeout detection
    - Better error context and recovery tracking
    - Connection quality metrics and health scoring

    Fields:
      name: protocol short name (mqtt, opcua, modbus, dnp3, simulator)
      available: underlying client/service has been initialized & not in fatal error
      connected: active session/connection established (MQTT connected, Modbus device(s) connected, etc.)
      status: lifecycle state with enhanced reconnecting support
      last_heartbeat: last successful heartbeat / poll / message timestamp
      error: optional structured error {code, message, context}
      version: adapter/client version string if available
      metrics: optional dict of adapter metrics (counts, latencies, etc.)
      demo: True if this protocol instance is running in mock/demo mode
      heartbeat_timeout_seconds: timeout threshold for heartbeat staleness (PR1a)
      retry_count: number of connection retry attempts (PR1a)
      last_error_time: timestamp of last error occurrence (PR1a)
      availability_level: enhanced availability state (PR1a)
    """
    name: str
    available: bool
    connected: bool
    status: StatusType
    last_heartbeat: Optional[datetime] = None
    error: Optional[Dict[str, Any]] = None
    version: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    demo: bool = False
    # PR1a enhancements
    heartbeat_timeout_seconds: int = 300  # 5 minutes default timeout
    retry_count: int = 0
    last_error_time: Optional[datetime] = None
    availability_level: Optional[AvailabilityLevel] = None

    def to_dict(self) -> dict:
        """Convert ProtocolStatus to dictionary with enhanced PR1a fields."""
        data = asdict(self)
        if self.last_heartbeat:
            data["last_heartbeat"] = self.last_heartbeat.isoformat()
        if self.last_error_time:
            data["last_error_time"] = self.last_error_time.isoformat()
        if self.availability_level:
            data["availability_level"] = self.availability_level.name.lower()
        
        # PR1a: Add computed fields for enhanced availability semantics using status_utils
        data["is_heartbeat_stale"] = is_heartbeat_stale(self.last_heartbeat, self.heartbeat_timeout_seconds)
        data["time_since_last_heartbeat"] = get_time_since_last_heartbeat(self.last_heartbeat)
        data["is_recovering"] = is_recovering(self.retry_count, self.status)
        data["health_score"] = compute_health_score(
            self.available, self.connected, self.status, self.last_heartbeat,
            self.heartbeat_timeout_seconds, self.error, self.retry_count
        )
        
        return data
    
    def is_heartbeat_stale(self) -> bool:
        """PR1a: Check if heartbeat is stale based on timeout threshold."""
        return is_heartbeat_stale(self.last_heartbeat, self.heartbeat_timeout_seconds)
    
    def get_time_since_last_heartbeat(self) -> Optional[float]:
        """PR1a: Get time in seconds since last heartbeat."""
        return get_time_since_last_heartbeat(self.last_heartbeat)
    
    def is_recovering(self) -> bool:
        """PR1a: Check if protocol is in recovery state (has retry attempts)."""
        return is_recovering(self.retry_count, self.status)
    
    def compute_health_score(self) -> float:
        """PR1a: Compute health score (0-100) based on current state."""
        return compute_health_score(
            self.available, self.connected, self.status, self.last_heartbeat,
            self.heartbeat_timeout_seconds, self.error, self.retry_count
        )
    
    def compute_availability_level(self) -> AvailabilityLevel:
        """PR1a: Refined availability inference logic."""
        return compute_availability_level(
            self.available, self.connected, self.status, self.last_heartbeat,
            self.heartbeat_timeout_seconds, self.error, self.retry_count
        )
    
    def update_availability_level(self) -> None:
        """PR1a: Update the availability level based on current state."""
        self.availability_level = self.compute_availability_level()
    
    def record_error(self, error_code: str, error_message: str = None, context: Dict[str, Any] = None) -> None:
        """PR1a: Record an error with enhanced context and timestamp."""
        now = utc_now()
        self.error = record_error(error_code, error_message, context, timestamp=now)
        self.last_error_time = now
        self.status = "error"
        self.update_availability_level()
    
    def clear_error(self) -> None:
        """PR1a: Clear error state when recovering."""
        self.error = None
        if self.status == "error":
            self.status = "ready" if self.connected else "initializing"
        self.update_availability_level()
    
    def increment_retry_count(self) -> None:
        """PR1a: Increment retry count for connection attempts."""
        self.retry_count += 1
        self.status = "reconnecting"
        self.update_availability_level()
    
    def reset_retry_count(self) -> None:
        """PR1a: Reset retry count on successful connection."""
        self.retry_count = 0
        self.update_availability_level()
