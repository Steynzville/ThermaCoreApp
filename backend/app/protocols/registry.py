from __future__ import annotations
from typing import List, Set
from flask import current_app
from .base import ProtocolStatus
from app.models import utc_now  # Use centralized timezone-aware datetime function
import logging

logger = logging.getLogger(__name__)

# (protocol_name, attribute_on_current_app)
REGISTRY: list[tuple[str, str]] = [
    ("mqtt", "mqtt_client"),
    ("opcua", "opcua_client"),
    ("modbus", "modbus_service"),
    ("dnp3", "dnp3_service"),
    ("simulator", "protocol_simulator"),
]

def validate_registry() -> None:
    """PR1a: Validate registry for duplicate protocol names."""
    protocol_names: Set[str] = set()
    duplicates: List[str] = []
    
    for name, attr in REGISTRY:
        if name in protocol_names:
            duplicates.append(name)
        else:
            protocol_names.add(name)
    
    if duplicates:
        raise ValueError(f"Duplicate protocol names found in registry: {duplicates}")

# PR1a: Validate registry at module import time
validate_registry()

def _fallback(name: str) -> ProtocolStatus:
    return ProtocolStatus(
        name=name,
        available=False,
        connected=False,
        status="not_initialized",
    )

def collect_protocol_status() -> list[dict]:
    """Collect normalized status dictionaries for all registered protocols.
    
    PR1a enhancements:
    - Enhanced error handling with detailed context
    - Automatic availability level computation
    - Support for heartbeat timeout detection
    - Better retry and recovery tracking
    - Duplicate protocol name detection

    Adapters that expose get_status() returning a dict will be mapped into our normalized model.
    Unexpected errors are converted to a status=error with a STATUS_FETCH_ERROR code.
    """
    statuses: List[dict] = []
    processed_names: Set[str] = set()  # PR1a: Track processed names
    
    for name, attr in REGISTRY:
        # PR1a: Guard against duplicate protocol names during collection
        if name in processed_names:
            logger.warning(f"Duplicate protocol name '{name}' encountered during collection")
            continue
        processed_names.add(name)
        
        adapter = getattr(current_app, attr, None)
        if adapter and hasattr(adapter, "get_status"):
            try:
                raw = adapter.get_status()
                if isinstance(raw, dict):
                    # PR1a: Parse heartbeat timestamp if provided
                    last_heartbeat = None
                    if raw.get("last_heartbeat"):
                        try:
                            if isinstance(raw["last_heartbeat"], str):
                                last_heartbeat = datetime.fromisoformat(raw["last_heartbeat"].replace('Z', '+00:00'))
                            elif isinstance(raw["last_heartbeat"], datetime):
                                last_heartbeat = raw["last_heartbeat"]
                        except (ValueError, TypeError):
                            # Invalid heartbeat format, ignore
                            logger.warning(f"Invalid heartbeat format for protocol '{name}': {raw.get('last_heartbeat')}")
                    
                    status_obj = ProtocolStatus(
                        name=name,
                        available=raw.get("available", raw.get("connected", False)),
                        connected=raw.get("connected", False),
                        status=raw.get("status", "unknown"),
                        last_heartbeat=last_heartbeat,
                        version=raw.get("version"),
                        metrics=raw.get("metrics"),
                        error=raw.get("error"),
                        demo=raw.get("demo", False),
                        # PR1a: Enhanced fields
                        heartbeat_timeout_seconds=raw.get("heartbeat_timeout_seconds", 300),
                        retry_count=raw.get("retry_count", 0),
                    )
                    
                    # PR1a: Parse last_error_time if provided
                    if raw.get("last_error_time"):
                        try:
                            if isinstance(raw["last_error_time"], str):
                                status_obj.last_error_time = datetime.fromisoformat(raw["last_error_time"].replace('Z', '+00:00'))
                            elif isinstance(raw["last_error_time"], datetime):
                                status_obj.last_error_time = raw["last_error_time"]
                        except (ValueError, TypeError):
                            logger.warning(f"Invalid last_error_time format for protocol '{name}': {raw.get('last_error_time')}")
                    
                    # PR1a: Update availability level based on current state
                    status_obj.update_availability_level()
                    
                else:  # If future adapters return ProtocolStatus directly
                    status_obj = raw  # type: ignore
                    if hasattr(status_obj, 'update_availability_level'):
                        status_obj.update_availability_level()
                        
            except Exception as exc:  # Defensive: capture per-adapter failure
                logger.error(f"Failed to get status for protocol '{name}': {str(exc)}")
                status_obj = ProtocolStatus(
                    name=name,
                    available=False,
                    connected=False,
                    status="error",
                )
                # PR1a: Use enhanced error recording
                status_obj.record_error(
                    error_code="STATUS_FETCH_ERROR",
                    error_message=str(exc)[:160],
                    context={"adapter_attribute": attr}
                )
        else:
            status_obj = _fallback(name)
        
        statuses.append(status_obj.to_dict())
    return statuses

def get_protocols_list() -> List[str]:
    """PR1a: Get list of supported protocol names."""
    return [name for name, _ in REGISTRY]
