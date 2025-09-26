from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Literal
from enum import Enum

# PR1a: Enhanced status types and availability semantics
StatusType = Literal["not_initialized", "initializing", "ready", "error", "degraded", "unknown", "reconnecting"]

class AvailabilityLevel(Enum):
    """PR1a: Enhanced availability levels for more granular status reporting."""
    UNAVAILABLE = 0      # Service not initialized or in fatal error
    DEGRADED = 1         # Service partially available with reduced functionality  
    AVAILABLE = 2        # Service initialized but not connected
    FULLY_AVAILABLE = 3  # Service initialized and connected with healthy heartbeat

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
        
        # PR1a: Add computed fields for enhanced availability semantics
        data["is_heartbeat_stale"] = self.is_heartbeat_stale()
        data["time_since_last_heartbeat"] = self.get_time_since_last_heartbeat()
        data["is_recovering"] = self.is_recovering()
        data["health_score"] = self.compute_health_score()
        
        return data
    
    def is_heartbeat_stale(self) -> bool:
        """PR1a: Check if heartbeat is stale based on timeout threshold."""
        if not self.last_heartbeat:
            return True
        
        time_diff = datetime.utcnow() - self.last_heartbeat
        return time_diff.total_seconds() > self.heartbeat_timeout_seconds
    
    def get_time_since_last_heartbeat(self) -> Optional[float]:
        """PR1a: Get time in seconds since last heartbeat."""
        if not self.last_heartbeat:
            return None
        
        time_diff = datetime.utcnow() - self.last_heartbeat
        return time_diff.total_seconds()
    
    def is_recovering(self) -> bool:
        """PR1a: Check if protocol is in recovery state (has retry attempts)."""
        return self.retry_count > 0 and self.status in ["reconnecting", "initializing"]
    
    def compute_health_score(self) -> float:
        """PR1a: Compute health score (0-100) based on current state."""
        if not self.available:
            return 0.0
        
        score = 30.0  # Base score for being available
        
        if self.connected:
            score += 40.0  # Additional score for connection
            
        if self.status == "ready":
            score += 20.0  # Additional score for ready status
            
        if not self.is_heartbeat_stale():
            score += 10.0  # Additional score for fresh heartbeat
            
        # Deduct points for errors and retries
        if self.error:
            score -= 15.0
        if self.retry_count > 0:
            score -= min(self.retry_count * 2, 10.0)
            
        return max(0.0, min(100.0, score))
    
    def compute_availability_level(self) -> AvailabilityLevel:
        """PR1a: Refined availability inference logic."""
        # Priority order: availability -> connection -> status -> heartbeat
        if not self.available:
            return AvailabilityLevel.UNAVAILABLE
        
        # Check for error states first
        if self.status == "error" or (self.error and not self.is_recovering()):
            return AvailabilityLevel.DEGRADED
        
        # Full availability requires connection + ready status + fresh heartbeat
        if self.connected and self.status == "ready" and not self.is_heartbeat_stale():
            return AvailabilityLevel.FULLY_AVAILABLE
        
        # Available but not fully functional
        if self.connected or self.status in ["ready", "degraded"]:
            # Degraded if heartbeat is stale or status is degraded
            if self.is_heartbeat_stale() or self.status == "degraded":
                return AvailabilityLevel.DEGRADED
            return AvailabilityLevel.AVAILABLE
        
        # Initializing or reconnecting states
        if self.status in ["initializing", "reconnecting"]:
            return AvailabilityLevel.DEGRADED
        
        # Fallback: available but not connected
        return AvailabilityLevel.AVAILABLE if self.available else AvailabilityLevel.UNAVAILABLE
    
    def update_availability_level(self) -> None:
        """PR1a: Update the availability level based on current state."""
        self.availability_level = self.compute_availability_level()
    
    def record_error(self, error_code: str, error_message: str = None, context: Dict[str, Any] = None) -> None:
        """PR1a: Record an error with enhanced context and timestamp."""
        self.error = {
            "code": error_code,
            "message": error_message,
            "context": context or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        self.last_error_time = datetime.utcnow()
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
