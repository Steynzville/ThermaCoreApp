from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional, Dict, Any

@dataclass
class ProtocolStatus:
    """Normalized status representation for any protocol adapter.

    Fields:
      name: protocol short name (mqtt, opcua, modbus, dnp3, simulator)
      available: underlying client/service has been initialized & not in fatal error
      connected: active session/connection established (MQTT connected, Modbus device(s) connected, etc.)
      status: lifecycle state: one of [not_initialized, initializing, ready, error, degraded, unknown]
      last_heartbeat: last successful heartbeat / poll / message timestamp
      error: optional structured error {code, message}
      version: adapter/client version string if available
      metrics: optional dict of adapter metrics (counts, latencies, etc.)
      demo: True if this protocol instance is running in mock/demo mode
    """
    name: str
    available: bool
    connected: bool
    status: str
    last_heartbeat: Optional[datetime] = None
    error: Optional[Dict[str, Any]] = None
    version: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    demo: bool = False

    def to_dict(self) -> dict:
        data = asdict(self)
        if self.last_heartbeat:
            data["last_heartbeat"] = self.last_heartbeat.isoformat()
        return data
