# Protocol Status Normalization (PR1 & PR1a)

This document describes the normalized schema returned by `GET /api/v1/protocols/status` after PR1 and PR1a enhancements.

## Response Envelope
```
{
  "timestamp": "ISO-8601 UTC",
  "version": "1.1.0",                    // PR1a: API version header
  "summary": {
    "total_protocols": int,
    "active_protocols": int,             // Count where connected == true and status == "ready" and heartbeat not stale
    "supported_protocols": [string],
    "protocols_list": [string],          // PR1a: List of all registered protocol names
    "availability_summary": {            // PR1a: Enhanced availability breakdown
      "fully_available": int,
      "available": int,
      "degraded": int,
      "unavailable": int
    },
    "recovering_protocols": int,         // PR1a: Count of protocols in recovery state
    "health_score": float                // PR1a: Overall system health score (0-100)
  },
  "protocols": {
    "<protocol_name>": ProtocolStatusObject,
    ...
  }
}
```

## ProtocolStatusObject Fields
| Field | Type | Description |
|-------|------|-------------|
| name | string | Short protocol identifier (mqtt, opcua, modbus, dnp3, simulator) |
| available | boolean | Adapter initialized & not in fatal error |
| connected | boolean | Active session established |
| status | string | not_initialized, initializing, ready, error, degraded, unknown, reconnecting |
| last_heartbeat | string (ISO) or null | Last healthy heartbeat/poll timestamp |
| error | object or null | `{code, message?, context?, timestamp?}` if adapter is in error |
| version | string or null | Adapter/client version |
| metrics | object or null | Adapter metrics |
| demo | boolean | True if mock/demo mode |
| **PR1a Enhancements** | | |
| heartbeat_timeout_seconds | int | Timeout threshold for heartbeat staleness (default: 300) |
| retry_count | int | Number of connection retry attempts |
| last_error_time | string (ISO) or null | Timestamp of last error occurrence |
| availability_level | string | fully_available, available, degraded, unavailable |
| is_heartbeat_stale | boolean | Whether heartbeat is considered stale |
| time_since_last_heartbeat | float or null | Time in seconds since last heartbeat |
| is_recovering | boolean | Whether protocol is in recovery state |
| health_score | float | Individual protocol health score (0-100) |

## PR1a Availability Levels

### Fully Available
- `connected == true`
- `status == "ready"`
- `is_heartbeat_stale == false`
- No active errors

### Available
- `available == true`
- Connected or ready status
- May have stale heartbeat or minor issues

### Degraded
- `available == true`
- Has errors, stale heartbeat, or degraded status
- May be in recovery state

### Unavailable
- `available == false`
- Not initialized or in fatal error state

## Active Protocol Definition
**PR1a Enhanced**: `connected == true AND status == "ready" AND is_heartbeat_stale == false`

## Error Handling
On per-adapter failure:
```
{
  "available": false,
  "connected": false,
  "status": "error",
  "error": {
    "code": "STATUS_FETCH_ERROR",
    "message": "Error details",
    "context": {"adapter_attribute": "mqtt_client"},
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## Mock Mode (Frontend)
`VITE_MOCK_MODE=true` enables deterministic lightweight mock data; otherwise the UI uses sequential polling every 10s with exponential backoff on errors.

## PR1a Sequential Polling
- **Prevents concurrent requests**: Only one status request at a time
- **Exponential backoff**: Increases interval on consecutive errors (max 60s)
- **Page visibility detection**: Pauses polling when page is not visible
- **Enhanced error handling**: Automatic 401 handling with toast notifications

## Future Extensions
- Degraded threshold semantics
- Metrics naming conventions  
- Correlation IDs (PR2)
- Real-time WebSocket status updates
