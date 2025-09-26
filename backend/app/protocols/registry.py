from __future__ import annotations
from typing import List
from flask import current_app
from .base import ProtocolStatus

# (protocol_name, attribute_on_current_app)
REGISTRY: list[tuple[str, str]] = [
    ("mqtt", "mqtt_client"),
    ("opcua", "opcua_client"),
    ("modbus", "modbus_service"),
    ("dnp3", "dnp3_service"),
    ("simulator", "protocol_simulator"),
]

def _fallback(name: str) -> ProtocolStatus:
    return ProtocolStatus(
        name=name,
        available=False,
        connected=False,
        status="not_initialized",
    )

def collect_protocol_status() -> list[dict]:
    """Collect normalized status dictionaries for all registered protocols.

    Adapters that expose get_status() returning a dict will be mapped into our normalized model.
    Unexpected errors are converted to a status=error with a STATUS_FETCH_ERROR code.
    """
    statuses: List[dict] = []
    for name, attr in REGISTRY:
        adapter = getattr(current_app, attr, None)
        if adapter and hasattr(adapter, "get_status"):
            try:
                raw = adapter.get_status()
                if isinstance(raw, dict):
                    status_obj = ProtocolStatus(
                        name=name,
                        available=raw.get("available", raw.get("connected", False)),
                        connected=raw.get("connected", False),
                        status=raw.get("status", "unknown"),
                        version=raw.get("version"),
                        metrics=raw.get("metrics"),
                        error=raw.get("error"),
                        demo=raw.get("demo", False),
                    )
                else:  # If future adapters return ProtocolStatus directly
                    status_obj = raw  # type: ignore
            except Exception as exc:  # Defensive: capture per-adapter failure
                status_obj = ProtocolStatus(
                    name=name,
                    available=False,
                    connected=False,
                    status="error",
                    error={"code": "STATUS_FETCH_ERROR", "message": str(exc)[:160]},
                )
        else:
            status_obj = _fallback(name)
        statuses.append(status_obj.to_dict())
    return statuses
