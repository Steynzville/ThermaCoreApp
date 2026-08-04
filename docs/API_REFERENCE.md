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

* **HTTP Verb**: POST
* **Path**: `/api/v1/auth/login`
* **Request Payload**:
  ```json
  {
    "email": "operator@thermacore.com",
    "password": "SecurePassword123"
  }
  ```
* **Response Payload (200 OK)**:
  ```json
  {
    "success": true,
    "access_token": "eyJhbGciOi...",
    "user": {
      "id": 12,
      "email": "operator@thermacore.com",
      "role": "operator",
      "client_id": 1,
      "is_approved": true
    }
  }
  ```
* **Supported Roles**: `admin` (System Admin), `client_admin` (Client Admin scoped by `client_id`), `operator`, `viewer`.
* **Error Profiles**:
  * `401 Unauthorized` (TC-101): Invalid email or password.
  * `403 Forbidden` (TC-103): User account exists but has not been elevated/approved by an Admin yet.

### 2.2 Refresh Session

* **HTTP Verb**: POST
* **Path**: `/api/v1/auth/refresh`
* **Headers**: Expects the `refresh_token` secure cookie to be sent in the request header.
* **Response Payload (200 OK)**:
  ```json
  {
    "success": true,
    "access_token": "new_eyJhbGciOi..."
  }
  ```

### 2.3 Sign Out (Logout)

* **HTTP Verb**: POST
* **Path**: `/api/v1/auth/logout`
* **Response Payload (200 OK)**: Clears the `refresh_token` secure cookie and revokes the session on the backend.

---

## 3. Modular Generator Asset Services (`/units`)

### 3.1 Fetch Fleet Units

* **HTTP Verb**: GET
* **Path**: `/api/v1/units`
* **Parameters**: `status` (optional), `search` (optional)
* **Response Payload (200 OK)**:
  ```json
  [
    {
      "id": "TC-101",
      "serial_number": "SN-THERMA-00192",
      "location": "Sydney Grid Hub A",
      "status": "Online",
      "ambientTemp": 25.4,
      "ambientHumidity": 62.0,
      "tempIn": 45.0,
      "tempOutChill": 18.5,
      "tempOutHot": 85.2,
      "awgWaterLevel": 78.5,
      "batteryVoltage": 25.4,
      "differentialPressure": 5.2,
      "flowRateOutChill": 42.5,
      "flowRateOutHot": 38.0,
      "powerSetpoint": 90,
      "thermo_stats": {
        "efficiency_cop": 4.12,
        "thermal_output_mw": 1.84,
        "water_output_l_hr": 2400.00
      }
    }
  ]
  ```

### 3.2 Dispatch Remote Command to Edge Device

* **HTTP Verb**: POST
* **Path**: `/api/v1/units/{id}/control`
* **Headers**: `Authorization: Bearer <JWT>` (Requires Operator or Admin role clearance)
* **Request Payload**:
  ```json
  {
    "command": "SET_POWER_SETPOINT",
    "parameter": 90,
    "signature": "sha256_cryptographic_signed_seal"
  }
  ```
* **Response Payload (202 Accepted)**:
  ```json
  {
    "success": true,
    "command_id": "CMD-00918-X",
    "status": "Dispatched",
    "timestamp": "2026-06-26T13:42:00Z"
  }
  ```

### 3.3 Unit Data Model & Metric Schema

The platform normalizes telemetry and state variables for all generator nodes using the unified Unit Data Model below:

| Field | Type | Unit / Range | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Unique Identifier | Unique unit ID (e.g., `"TC-101"`) |
| `ambientTemp` | Number | °C (°F converted) | Ambient environmental temperature |
| `ambientHumidity` | Number | % | Relative ambient humidity |
| `tempIn` | Number | °C | System coolant inlet temperature |
| `tempOutChill` | Number | °C | Chilled loop output temperature (*"Temp Out - Chill"*) |
| `tempOutHot` | Number | °C | Hot loop output temperature (*"Temp Out - Hot"*) |
| `awgWaterLevel` | Number | % (0–100%) | Atmospheric water generation tank storage level (*"AWG Water Level"*) |
| `batteryVoltage` | Number | V (DC) | DC system battery storage voltage |
| `differentialPressure` | Number | bar | Differential pressure across heat exchange loops (*"Differential Pressure"*) |
| `flowRateOutChill` | Number | L/min | Output flow rate for chilled loop (*"Flow Rate Out - Chill"*) |
| `flowRateOutHot` | Number | L/min | Output flow rate for hot loop (*"Flow Rate Out - Hot"*) |
| `powerSetpoint` | Number | % (0–100%) | Power production target setpoint (*"Power Production Setpoint"*) |

#### Safety Alarm Rules & Thresholds

| Alarm Type | Trigger Condition | Severity | System Response |
| :--- | :--- | :--- | :--- |
| **NH3 Leak Detected** | `differentialPressure < 4.0 bar` | Critical (Red) | High-priority safety alert indicating toxic ammonia coolant leak; system isolation required. |
| **High Differential Pressure** | `differentialPressure > 6.0 bar` | Critical (Red) | Automated safety shutdown initiated to prevent pipe or compressor damage. |
| **Low Battery Voltage** | `batteryVoltage < 23.0 V` | Warning (Yellow) | Alert dispatched to prevent battery deep discharge and maintain telemetry gateway backup. |
| **High Battery Voltage** | `batteryVoltage > 27.0 V` | Warning (Yellow) | Overcharge alert dispatched to prevent battery thermal stress. |

---

## 4. Tenant Management Services (`/tenants`)

### 4.1 Fetch Available Tenants

* **HTTP Verb**: GET
* **Path**: `/api/v1/tenants`
* **Parameters**: `active_only` (optional, defaults to `true`)
* **Description**: Retrieves all tenants the authenticated user has access to, with role-based filtering automatically applied.

**Filtering Behavior:**

| User Role | Filtering Logic | Example Response |
| :--- | :--- | :--- |
| System Admin (`admin`) | Returns ALL tenants (cross-tenant visibility) | All tenants across all clients |
| Client Admin (`client_admin`) | Returns ONLY tenants matching the user's `client_id` | Only ACME Sydney, Melbourne, Brisbane |
| Operator/Viewer | Returns ONLY the single tenant assigned to the user's `tenant_id` | Only the facility they're assigned to |

* **Response Payload (200 OK - Client Admin Example)**:
  ```json
  {
    "success": true,
    "data": [
      { 
        "id": 1, 
        "name": "ACME Sydney", 
        "client_id": 1,
        "slug": "acme-sydney",
        "is_active": true
      },
      { 
        "id": 2, 
        "name": "ACME Melbourne", 
        "client_id": 1,
        "slug": "acme-melbourne",
        "is_active": true
      },
      { 
        "id": 3, 
        "name": "ACME Brisbane", 
        "client_id": 1,
        "slug": "acme-brisbane",
        "is_active": true
      }
    ]
  }
  ```
* **Response Payload (200 OK - System Admin Example)**:
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "name": "ACME Sydney", "client_id": 1 },
      { "id": 2, "name": "ACME Melbourne", "client_id": 1 },
      { "id": 3, "name": "ACME Brisbane", "client_id": 1 },
      { "id": 4, "name": "Alpha Industries Ltd", "client_id": 2 },
      { "id": 5, "name": "Beta Corporation", "client_id": 2 }
      // ... all tenants
    ]
  }
  ```

### 4.2 Get Current Tenant Context

* **HTTP Verb**: GET
* **Path**: `/api/v1/tenants/current`
* **Description**: Returns the currently active tenant for the authenticated user.
* **Response Payload (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "name": "ACME Sydney",
      "client_id": 1,
      "slug": "acme-sydney"
    }
  }
  ```

---

## 5. Time-Series Telemetry & Readings (`/sensors`)

### 5.1 Retrieve Sensor Readings History

* **HTTP Verb**: GET
* **Path**: `/api/v1/sensors/{unit_id}/readings`
* **Parameters**: `timeframe` (24h, 7d, 30d), `metric` (temp, pressure, flow_rate)
* **Response Payload (200 OK)**:
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

## 6. Alarm and Incident Services (`/alarms`)

### 6.1 Acknowledge Active Alarm

* **HTTP Verb**: POST
* **Path**: `/api/v1/alarms/{id}/acknowledge`
* **Request Payload**:
  ```json
  {
    "operator_notes": "Identified low pressure drift, valve retightened locally."
  }
  ```
* **Response Payload (200 OK)**:
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

## 7. System Diagnostics and Health (`/health`)

### 7.1 Basic Live Ping

* **HTTP Verb**: GET
* **Path**: `/api/health`
* **Response Payload (200 OK)**:
  ```json
  {
    "status": "ok"
  }
  ```

### 7.2 Detailed Infrastructure Audit Health

* **HTTP Verb**: GET
* **Path**: `/api/v1/health/detailed`
* **Response Payload (200 OK)**:
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

### 7.3 Protocol Gateway Management (`/api/v1/protocols`)

* **Access Control**: System Admin Only (Requires System Administrator authorization header; non-admin users receive `403 Forbidden`).
* **Endpoints**:
  * `GET /api/v1/protocols/status`: Retrieves real-time adapter connectivity and node counts across MQTT, OPC UA, Modbus TCP, and DNP3.
  * `POST /api/v1/protocols/configure`: Modifies fieldbus connection parameters, polling intervals, or security certificates.
  * `POST /api/v1/protocols/restart`: Triggers a graceful service restart for a specific protocol adapter.

---

## 8. WebSocket / Socket.io Events Reference

The ThermaCore SCADA platform leverages bidirectional, event-driven communication via Socket.io for low-latency telemetry and alert propagation.

### 8.1 Client-to-Server Events

**join_room**

* **Purpose**: Subscribes the client connection to a specific generator unit room or fleet group to receive targeted updates.
* **Payload Structure**:
  ```json
  {
    "room": "unit_TC-101"
  }
  ```

**leave_room**

* **Purpose**: Unsubscribes the client from receiving real-time broadcasts for a specific unit, reducing client-side message parsing overhead.
* **Payload Structure**:
  ```json
  {
    "room": "unit_TC-101"
  }
  ```

### 8.2 Server-to-Client Events

**connection_confirmed**

* **Broadcast Target**: Emitted directly to the newly connected client socket upon a successful handshake.
* **Payload Structure**:
  ```json
  {
    "success": true,
    "session_id": "sid_9824u10928hjfkhs",
    "message": "Authenticated Socket.io connection established successfully."
  }
  ```

**sensor_data**

* **Broadcast Target**: Broadcasts in real-time to any rooms matching the unit's subscription ID (e.g., `unit_TC-101`).
* **Payload Structure**:
  ```json
  {
    "unit_id": "TC-101",
    "timestamp": "2026-06-26T14:05:00Z",
    "readings": {
      "tempOutChill": 18.5,
      "tempOutHot": 82.4,
      "awgWaterLevel": 78.5,
      "batteryVoltage": 25.4,
      "differentialPressure": 5.2,
      "flowRateOutChill": 42.5,
      "flowRateOutHot": 38.0
    }
  }
  ```

**unit_status**

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

**system_alert**

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
