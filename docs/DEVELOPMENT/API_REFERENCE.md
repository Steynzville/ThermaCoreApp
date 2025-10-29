# ThermaCoreApp API Reference

> **Last Updated**: October 2024  
> **API Version**: v1  
> **Status**: Current and Verified

Complete reference documentation for the ThermaCoreApp REST API.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Users & Roles](#users--roles)
4. [Units Management](#units-management)
5. [Sensors & Readings](#sensors--readings)
6. [Analytics](#analytics)
7. [SCADA Operations](#scada-operations)
8. [Admin Operations](#admin-operations)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

---

## Overview

### Base URL

**Development**: `http://localhost:5000/api/v1`  
**Production**: `https://your-domain.com/api/v1`

### Request Format

All API requests should include:
- **Content-Type**: `application/json`
- **Authorization**: `Bearer <access_token>` (for protected endpoints)

### Response Format

All responses are in JSON format:

```json
{
  "data": { ... },        // Success response data
  "message": "string",    // Optional message
  "error": "string"       // Error message (if applicable)
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

---

## Authentication

### Login

Authenticate a user and receive JWT tokens.

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 900,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@thermacore.com",
    "role": {
      "id": 1,
      "name": "admin"
    }
  }
}
```

### Refresh Token

Refresh an expired access token.

**Endpoint**: `POST /auth/refresh`

**Headers**:
```
Authorization: Bearer <refresh_token>
```

**Response (200)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 900
}
```

### Get Current User

Retrieve authenticated user information.

**Endpoint**: `GET /auth/me`  
**Auth**: Required

**Response (200)**:
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@thermacore.com",
  "first_name": "System",
  "last_name": "Administrator",
  "phone_number": "+1234567890",
  "company": "ThermaCore",
  "department": "Engineering",
  "position": "Admin",
  "is_active": true,
  "role": {
    "id": 1,
    "name": "admin",
    "permissions": ["read_all", "write_all", "admin_panel"]
  },
  "last_login": "2024-10-23T10:30:00Z"
}
```

### Logout

Invalidate current session (client-side token removal).

**Endpoint**: `POST /auth/logout`  
**Auth**: Required

**Response (200)**:
```json
{
  "message": "Logout successful"
}
```

### Change Password

Change the authenticated user's password.

**Endpoint**: `POST /auth/change-password`  
**Auth**: Required

**Request Body**:
```json
{
  "current_password": "oldpass123",
  "new_password": "newpass123"
}
```

**Response (200)**:
```json
{
  "message": "Password changed successfully"
}
```

### Reset Password Request

Request a password reset link.

**Endpoint**: `POST /auth/password-reset-request`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response (200)**:
```json
{
  "message": "Password reset email sent"
}
```

---

## Users & Roles

### List Users

Get all users with optional filtering.

**Endpoint**: `GET /users`  
**Auth**: Required  
**Permission**: `read_users`

**Query Parameters**:
- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 20, max: 100)
- `role` (string): Filter by role name
- `company` (string): Filter by company
- `is_active` (boolean): Filter by active status
- `search` (string): Search by username/email

**Example**: `GET /users?page=1&per_page=20&role=operator&is_active=true`

**Response (200)**:
```json
{
  "users": [
    {
      "id": 2,
      "username": "operator1",
      "email": "operator@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "company": "ABB Group",
      "is_active": true,
      "role": {
        "id": 2,
        "name": "operator"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "pages": 3
  }
}
```

### Get User by ID

Retrieve a specific user.

**Endpoint**: `GET /users/{id}`  
**Auth**: Required  
**Permission**: `read_users`

**Response (200)**:
```json
{
  "id": 2,
  "username": "operator1",
  "email": "operator@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890",
  "company": "ABB Group",
  "company_identifier": "ABBGROUP-A1B2C3D4",
  "department": "Operations",
  "position": "Senior Operator",
  "is_active": true,
  "role_id": 2,
  "created_at": "2024-01-15T10:00:00Z",
  "last_login": "2024-10-23T09:15:00Z"
}
```

### Create User

Create a new user account.

**Endpoint**: `POST /users`  
**Auth**: Required  
**Permission**: `write_users`

**Request Body**:
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "first_name": "Jane",
  "last_name": "Smith",
  "phone_number": "+1987654321",
  "company": "MineCor Ltd",
  "department": "Engineering",
  "position": "Engineer",
  "role_id": 2
}
```

**Response (201)**:
```json
{
  "id": 15,
  "username": "newuser",
  "email": "newuser@example.com",
  "company_identifier": "MINECORLTD-X9Y8Z7W6",
  "message": "User created successfully"
}
```

### Update User

Update an existing user.

**Endpoint**: `PUT /users/{id}`  
**Auth**: Required  
**Permission**: `write_users`

**Request Body** (partial update supported):
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "phone_number": "+1555123456",
  "position": "Lead Engineer"
}
```

**Response (200)**:
```json
{
  "id": 15,
  "message": "User updated successfully"
}
```

### Delete User

Deactivate or delete a user.

**Endpoint**: `DELETE /users/{id}`  
**Auth**: Required  
**Permission**: `delete_users`

**Response (204)**: No content

### Batch Operations

Bulk activate/deactivate users.

**Endpoint**: `POST /users/batch/activate`  
**Auth**: Required  
**Permission**: `write_users`

**Request Body**:
```json
{
  "user_ids": [5, 6, 7, 8]
}
```

**Response (200)**:
```json
{
  "activated": 4,
  "failed": []
}
```

### Get Company Statistics

Retrieve user statistics by company.

**Endpoint**: `GET /users/companies/stats`  
**Auth**: Required  
**Permission**: `read_users`

**Response (200)**:
```json
{
  "companies": [
    {
      "company": "ABB Group",
      "total_users": 25,
      "active_users": 23,
      "inactive_users": 2
    },
    {
      "company": "MineCor Ltd",
      "total_users": 15,
      "active_users": 15,
      "inactive_users": 0
    }
  ]
}
```

### List Roles

Get all available roles.

**Endpoint**: `GET /roles`  
**Auth**: Required

**Response (200)**:
```json
{
  "roles": [
    {
      "id": 1,
      "name": "admin",
      "description": "Full system access",
      "permissions": ["read_all", "write_all", "admin_panel"]
    },
    {
      "id": 2,
      "name": "operator",
      "description": "Operational access",
      "permissions": ["read_units", "write_units", "read_sensors"]
    },
    {
      "id": 3,
      "name": "viewer",
      "description": "Read-only access",
      "permissions": ["read_units", "read_sensors"]
    }
  ]
}
```

---

## Units Management

### List Units

Get all industrial units.

**Endpoint**: `GET /units`  
**Auth**: Required  
**Permission**: `read_units`

**Query Parameters**:
- `status` (string): Filter by status (active, inactive, maintenance)
- `location` (string): Filter by location
- `page` (int): Page number
- `per_page` (int): Items per page

**Response (200)**:
```json
{
  "units": [
    {
      "id": 1,
      "name": "Thermal Unit A1",
      "location": "Plant North",
      "status": "active",
      "temperature": 65.5,
      "pressure": 2.3,
      "flow_rate": 150.0,
      "last_update": "2024-10-23T10:45:00Z"
    }
  ],
  "pagination": { ... }
}
```

### Get Unit Details

Retrieve detailed information about a unit.

**Endpoint**: `GET /units/{id}`  
**Auth**: Required  
**Permission**: `read_units`

**Response (200)**:
```json
{
  "id": 1,
  "name": "Thermal Unit A1",
  "location": "Plant North",
  "status": "active",
  "protocol": "opcua",
  "connection_string": "opc.tcp://10.0.1.50:4840",
  "sensors": [
    {
      "id": 1,
      "type": "temperature",
      "current_value": 65.5,
      "unit": "°C",
      "status": "active"
    },
    {
      "id": 2,
      "type": "pressure",
      "current_value": 2.3,
      "unit": "bar",
      "status": "active"
    }
  ],
  "metadata": {
    "manufacturer": "ABB",
    "model": "TCS-500",
    "installation_date": "2023-05-15"
  }
}
```

### Create Unit

Add a new industrial unit.

**Endpoint**: `POST /units`  
**Auth**: Required  
**Permission**: `write_units`

**Request Body**:
```json
{
  "name": "Thermal Unit B2",
  "location": "Plant South",
  "protocol": "modbus",
  "connection_string": "192.168.1.100:502",
  "metadata": {
    "manufacturer": "Schneider Electric",
    "model": "TM221CE24R"
  }
}
```

**Response (201)**:
```json
{
  "id": 12,
  "message": "Unit created successfully"
}
```

### Update Unit

Modify unit configuration.

**Endpoint**: `PUT /units/{id}`  
**Auth**: Required  
**Permission**: `write_units`

**Request Body**:
```json
{
  "status": "maintenance",
  "location": "Plant North - Bay 3"
}
```

**Response (200)**:
```json
{
  "id": 1,
  "message": "Unit updated successfully"
}
```

### Delete Unit

Remove a unit from the system.

**Endpoint**: `DELETE /units/{id}`  
**Auth**: Required  
**Permission**: `delete_units`

**Response (204)**: No content

### Control Unit

Send control commands to a unit.

**Endpoint**: `POST /units/{id}/control`  
**Auth**: Required  
**Permission**: `control_units`

**Request Body**:
```json
{
  "command": "set_setpoint",
  "parameters": {
    "setpoint_type": "temperature",
    "value": 70.0
  }
}
```

**Response (200)**:
```json
{
  "status": "success",
  "message": "Command executed successfully",
  "new_setpoint": 70.0
}
```

---

## Sensors & Readings

### Get Sensor Data

Retrieve sensor readings for a specific sensor.

**Endpoint**: `GET /sensors/{id}/readings`  
**Auth**: Required  
**Permission**: `read_sensors`

**Query Parameters**:
- `start_time` (ISO8601): Start of time range
- `end_time` (ISO8601): End of time range
- `interval` (string): Aggregation interval (1m, 5m, 1h, 1d)
- `limit` (int): Maximum readings to return

**Example**: `GET /sensors/1/readings?start_time=2024-10-23T00:00:00Z&end_time=2024-10-23T12:00:00Z&interval=5m`

**Response (200)**:
```json
{
  "sensor_id": 1,
  "sensor_type": "temperature",
  "unit": "°C",
  "readings": [
    {
      "timestamp": "2024-10-23T10:00:00Z",
      "value": 65.2,
      "quality": "good"
    },
    {
      "timestamp": "2024-10-23T10:05:00Z",
      "value": 65.5,
      "quality": "good"
    }
  ],
  "statistics": {
    "min": 64.8,
    "max": 66.2,
    "avg": 65.4,
    "stddev": 0.3
  }
}
```

### Get Latest Reading

Get the most recent reading from a sensor.

**Endpoint**: `GET /sensors/{id}/latest`  
**Auth**: Required  
**Permission**: `read_sensors`

**Response (200)**:
```json
{
  "sensor_id": 1,
  "value": 65.5,
  "timestamp": "2024-10-23T10:45:23Z",
  "quality": "good"
}
```

---

## Analytics

### Get Dashboard Summary

Retrieve summary statistics for the dashboard.

**Endpoint**: `GET /analytics/dashboard`  
**Auth**: Required  
**Permission**: `read_analytics`

**Response (200)**:
```json
{
  "total_units": 25,
  "active_units": 23,
  "alerts_active": 3,
  "average_temperature": 66.2,
  "average_pressure": 2.4,
  "system_efficiency": 94.5,
  "last_updated": "2024-10-23T10:45:00Z"
}
```

### Get Anomaly Detections

Retrieve detected anomalies.

**Endpoint**: `GET /analytics/anomalies`  
**Auth**: Required  
**Permission**: `read_analytics`

**Query Parameters**:
- `start_time` (ISO8601): Start time
- `end_time` (ISO8601): End time
- `severity` (string): Filter by severity (low, medium, high, critical)
- `unit_id` (int): Filter by unit

**Response (200)**:
```json
{
  "anomalies": [
    {
      "id": 15,
      "unit_id": 3,
      "sensor_type": "temperature",
      "severity": "high",
      "detected_at": "2024-10-23T09:30:00Z",
      "description": "Temperature spike detected",
      "value": 85.2,
      "expected_range": [60, 70],
      "status": "investigating"
    }
  ]
}
```

---

## SCADA Operations

### Get Real-Time Status

Get current status of all SCADA systems.

**Endpoint**: `GET /scada/status`  
**Auth**: Required  
**Permission**: `read_scada`

**Response (200)**:
```json
{
  "mqtt_connected": true,
  "opcua_connected": true,
  "modbus_connected": true,
  "dnp3_connected": false,
  "active_connections": 15,
  "last_message": "2024-10-23T10:45:30Z"
}
```

### Subscribe to Updates

Subscribe to real-time WebSocket updates.

**WebSocket**: `ws://localhost:5000/socket.io`

**Events**:
- `unit_update` - Unit status change
- `sensor_reading` - New sensor data
- `alert` - New alert/alarm
- `anomaly_detected` - Anomaly detection

**Example (JavaScript)**:
```javascript
const socket = io('ws://localhost:5000');

socket.on('connect', () => {
  socket.emit('join_room', 'unit_1');
});

socket.on('sensor_reading', (data) => {
  console.log('New reading:', data);
});
```

---

## Admin Operations

### System Health

Check system health status.

**Endpoint**: `GET /admin/health`  
**Auth**: Required  
**Permission**: `admin_panel`

**Response (200)**:
```json
{
  "status": "healthy",
  "database": "connected",
  "mqtt": "connected",
  "opcua": "connected",
  "memory_usage": "45%",
  "cpu_usage": "23%",
  "uptime": "15d 6h 23m"
}
```

### Infrastructure Health

Check infrastructure health status for monitoring (public endpoint).

**Endpoint**: `GET /api/v1/health`  
**Auth**: Not Required

**Response (200 - Operational)**:
```json
{
  "status": "operational",
  "database": {
    "status": "operational",
    "connected": true
  },
  "timestamp": "2024-10-29T00:30:00.000000+00:00"
}
```

**Response (503 - Degraded)**:
```json
{
  "status": "degraded",
  "database": {
    "status": "degraded",
    "connected": false
  },
  "timestamp": "2024-10-29T00:30:00.000000+00:00"
}
```

### Audit Logs

Retrieve audit logs.

**Endpoint**: `GET /admin/audit-logs`  
**Auth**: Required  
**Permission**: `admin_panel`

**Query Parameters**:
- `user_id` (int): Filter by user
- `action` (string): Filter by action type
- `start_time` (ISO8601): Start time
- `end_time` (ISO8601): End time

**Response (200)**:
```json
{
  "logs": [
    {
      "id": 1523,
      "user_id": 2,
      "username": "operator1",
      "action": "login",
      "ip_address": "192.168.1.105",
      "timestamp": "2024-10-23T10:30:15Z",
      "details": {
        "user_agent": "Mozilla/5.0...",
        "success": true
      }
    }
  ],
  "pagination": { ... }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "specific error details"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Login credentials are incorrect |
| `TOKEN_EXPIRED` | JWT token has expired |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permission |
| `VALIDATION_ERROR` | Input validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `DUPLICATE_ENTRY` | Resource already exists |
| `DATABASE_ERROR` | Database operation failed |

---

## Rate Limiting

API rate limits are enforced per user:

- **Standard users**: 100 requests/minute
- **Operators**: 500 requests/minute  
- **Admins**: 1000 requests/minute

**Rate limit headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698067200
```

When rate limit is exceeded:
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 45
}
```

---

**For More Information:**
- [Setup Guide](SETUP_GUIDE.md)
- [Architecture](ARCHITECTURE.md)
- [Troubleshooting](../OPERATIONS/TROUBLESHOOTING.md)

*Last Updated: October 2024*
