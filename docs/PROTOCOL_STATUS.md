# Protocol Status Normalization (PR1)

This document describes the normalized schema returned by `GET /api/v1/protocols/status` after PR1.

## Response Envelope
```
{
  "timestamp": "ISO-8601 UTC",
  "summary": {
    "total_protocols": int,
    "active_protocols": int,          // Count where connected == true and status == "ready"
    "supported_protocols": [string]
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
| status | string | not_initialized, initializing, ready, error, degraded, unknown |
| last_heartbeat | string (ISO) or null | Last healthy heartbeat/poll timestamp |
| error | object or null | `{code, message?}` if adapter is in error |
| version | string or null | Adapter/client version |
| metrics | object or null | Adapter metrics |
| demo | boolean | True if mock/demo mode |

### Active Protocol Definition
connected == true AND status == "ready".

### Error Handling
On per-adapter failure:
```
{
  "available": false,
  "connected": false,
  "status": "error",
  "error": {"code": "STATUS_FETCH_ERROR"}
}
```

### Mock Mode (Frontend)
`VITE_MOCK_MODE=true` enables deterministic lightweight mock data; otherwise the UI polls every 10s.

### Future Extensions
- Degraded threshold semantics
- Metrics naming conventions
- Correlation IDs (PR2)
