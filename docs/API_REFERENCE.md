# ThermaCore Integrated SCADA: API Reference Manual
## Complete Backend API Specification, Endpoints, and Request/Response Payloads

This reference details the REST and WebSocket API endpoints used by the ThermaCore SCADA platform to monitor and manage our Modular Power & Water Generators.

---

## 1. Global API Standards

* **Base URL**: `/api/v1` (or relative path in development)
* **Response Format**: `application/json` exclusively
* **Session Transport**: Access tokens are supplied via the `Authorization: Bearer <JWT>` header. Refresh tokens are read/written securely using HTTP-Only SameSite Cookies.

### Common Error Codes & Mapping
The API uses standardized HTTP status codes paired with detailed error JSON envelopes:
```json
{
  "success": false,
  "error_code": "TC-XYZ",
  "message": "Specific error description text."
}
```

---

## 2. Authentication Services (`/auth`)

### 2.1 Authenticate Operator (Login)
* **HTTP Verb**: `POST`
* **Path**: `/api/v1/auth/login`
* **Request Payload**:
  ```json
  {
    "email": "operator@thermacore.com",
    "password": "SecurePassword123"
  }
  ```
* **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "access_token": "eyJhbGciOi...",
    "user": {
      "id": 12,
      "email": "operator@thermacore.com",
      "role": "Operator",
      "is_approved": true
    }
  }
  ```
* **Error Profiles**:
  * `401 Unauthorized` (`TC-101`): Invalid email or password.
  * `403 Forbidden` (`TC-103`): User account exists but has not been elevated/approved by an Admin yet.

### 2.2 Refresh Session
* **HTTP Verb**: `POST`
* **Path**: `/api/v1/auth/refresh`
* **Headers**: Expects the `refresh_token` secure cookie to be sent in the request header.
* **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "access_token": "new_eyJhbGciOi..."
  }
  ```

### 2.3 Sign Out (Logout)
* **HTTP Verb**: `POST`
* **Path**: `/api/v1/auth/logout`
* **Response Payload (`200 OK`)**: Clears the `refresh_token` secure cookie and revokes the session on the backend.

---

## 3. Modular Generator Asset Services (`/units`)

### 3.1 Fetch Fleet Units
* **HTTP Verb**: `GET`
* **Path**: `/api/v1/units`
* **Parameters**: `status` (optional), `search` (optional)
* **Response Payload (`200 OK`)**:
  ```json
  [
    {
      "id": "TC-101",
      "serial_number": "SN-THERMA-00192",
      "location": "Sydney Grid Hub A",
      "status": "Online",
      "thermo_stats": {
        "efficiency_cop": 4.12,
        "thermal_output_mw": 1.84,
        "water_output_l_hr": 2400.00
      }
    }
  ]
  ```

### 3.2 Dispatch Remote Command to Edge Device
* **HTTP Verb**: `POST`
* **Path**: `/api/v1/units/{id}/control`
* **Headers**: `Authorization: Bearer <JWT>` (Requires Operator or Admin role clearance)
* **Request Payload**:
  ```json
  {
    "command": "EMERGENCY_SHUTDOWN",
    "parameter": "immediate",
    "signature": "sha256_cryptographic_signed_seal"
  }
  ```
* **Response Payload (`202 Accepted`)**:
  ```json
  {
    "success": true,
    "command_id": "CMD-00918-X",
    "status": "Dispatched",
    "timestamp": "2026-06-26T13:42:00Z"
  }
  ```

---

## 4. Time-Series Telemetry & Readings (`/sensors`)

### 4.1 Retrieve Sensor Readings History
* **HTTP Verb**: `GET`
* **Path**: `/api/v1/sensors/{unit_id}/readings`
* **Parameters**: `timeframe` (`24h`, `7d`, `30d`), `metric` (`temp`, `pressure`, `flow_rate`)
* **Response Payload (`200 OK`)**:
  ```json
  {
    "unit_id": "TC-101",
    "metric": "temp",
    "timeframe": "24h",
    "datapoints": [
      { "timestamp": "2026-06-26T12:00:00Z", "val": 82.4 },
      { "timestamp": "2026-06-26T12:05:00Z", "val": 82.9 }
    ]
  }
  ```

---

## 5. Alarm and Incident Services (`/alarms`)

### 5.1 Acknowledge Active Alarm
* **HTTP Verb**: `POST`
* **Path**: `/api/v1/alarms/{id}/acknowledge`
* **Request Payload**:
  ```json
  {
    "operator_notes": "Identified low pressure drift, valve retightened locally."
  }
  ```
* **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "alarm_id": 1422,
    "status": "Acknowledged",
    "acknowledged_by": "operator@thermacore.com",
    "timestamp": "2026-06-26T13:45:00Z"
  }
  ```

---

## 6. System Diagnostics and Health (`/health`)

### 6.1 Basic Live Ping
* **HTTP Verb**: `GET`
* **Path**: `/api/health`
* **Response Payload (`200 OK`)**:
  ```json
  {
    "status": "ok"
  }
  ```

### 6.2 Detailed Infrastructure Audit Health
* **HTTP Verb**: `GET`
* **Path**: `/api/v1/health/detailed`
* **Response Payload (`200 OK`)**:
  ```json
  {
    "status": "Healthy",
    "services": {
      "database": "Connected",
      "mqtt_broker": "Reachable (TLS v1.3)",
      "opc_ua_gateway": "Connected",
      "disk_usage": "18.4%"
    }
  }
  ```

---

## 7. WebSocket / Socket.io Events Reference

The ThermaCore SCADA platform leverages bidirectional, event-driven communication via Socket.io for low-latency telemetry and alert propagation.

### 7.1 Client-to-Server Events

#### `join_room`
* **Purpose**: Subscribes the client connection to a specific generator unit room or fleet group to receive targeted updates.
* **Payload Structure**:
  ```json
  {
    "room": "unit_TC-101"
  }
  ```

#### `leave_room`
* **Purpose**: Unsubscribes the client from receiving real-time broadcasts for a specific unit, reducing client-side message parsing overhead.
* **Payload Structure**:
  ```json
  {
    "room": "unit_TC-101"
  }
  ```

---

### 7.2 Server-to-Client Events

#### `connection_confirmed`
* **Broadcast Target**: Emitted directly to the newly connected client socket upon a successful handshake.
* **Payload Structure**:
  ```json
  {
    "success": true,
    "session_id": "sid_9824u10928hjfkhs",
    "message": "Authenticated Socket.io connection established successfully."
  }
  ```

#### `sensor_data`
* **Broadcast Target**: Broadcasts in real-time to any rooms matching the unit's subscription ID (e.g., `unit_TC-101`).
* **Payload Structure**:
  ```json
  {
    "unit_id": "TC-101",
    "timestamp": "2026-06-26T14:05:00Z",
    "readings": {
      "temperature_hot": 82.4,
      "temperature_cold": 24.1,
      "mass_flow_rate": 12.8,
      "pressure_psi": 45.2,
      "water_flow_l_hr": 2400.00
    }
  }
  ```

#### `unit_status`
* **Broadcast Target**: Broadcasts to the general `fleet_dashboard` room whenever a generator transitions operational states.
* **Payload Structure**:
  ```json
  {
    "unit_id": "TC-101",
    "status": "Online",
    "previous_status": "Maintenance",
    "timestamp": "2026-06-26T14:05:02Z"
  }
  ```

#### `system_alert`
* **Broadcast Target**: Broadcasts globally to all connected active operator and administrator sessions.
* **Payload Structure**:
  ```json
  {
    "alert_id": 9812,
    "unit_id": "TC-101",
    "severity": "Critical",
    "message": "High-pressure safety threshold breached (45.2 PSI limit exceeded)",
    "timestamp": "2026-06-26T14:05:05Z"
  }
  ```

