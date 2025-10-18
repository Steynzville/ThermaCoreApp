# API Documentation

> **Last Reviewed**: October 2024  
> **Status**: Current and Accurate

The ThermaCoreApp backend exposes a RESTful API for managing users, units, sensor data, and analytics. This document provides an overview of the available endpoints, their functionalities, and expected request/response formats.

## 1. Base URL

The base URL for all API endpoints is `http://localhost:5000` in a development environment.

## 2. Authentication

All protected endpoints require a JSON Web Token (JWT) in the `Authorization` header, prefixed with `Bearer`.

`Authorization: Bearer <your_access_token>`

### `POST /auth/login`

Authenticates a user and returns access and refresh tokens.

*   **Request Body**:

    ```json
    {
        "username": "string",
        "password": "string"
    }
    ```

*   **Response (200 OK)**:

    ```json
    {
        "access_token": "string",
        "refresh_token": "string",
        "expires_in": "integer" (seconds)
    }
    ```

### `POST /auth/refresh`

Refreshes an expired access token using a refresh token.

*   **Request Body**: None (refresh token is in `Authorization` header).
*   **Response (200 OK)**:

    ```json
    {
        "access_token": "string",
        "expires_in": "integer" (seconds)
    }
    ```

### `GET /auth/me`

Retrieves information about the currently authenticated user.

*   **Response (200 OK)**:

    ```json
    {
        "id": "integer",
        "username": "string",
        "email": "string",
        "first_name": "string",
        "last_name": "string",
        "is_active": "boolean",
        "role": {
            "id": "integer",
            "name": "string" (e.g., "admin", "operator", "viewer")
        }
    }
    ```

### `POST /auth/logout`

Logs out the user (client-side token invalidation).

*   **Response (200 OK)**:

    ```json
    {
        "message": "Logout successful"
    }
    ```

### `POST /auth/change-password`

Changes the authenticated user's password.

*   **Request Body**:

    ```json
    {
        "current_password": "string",
        "new_password": "string"
    }
    ```

*   **Response (200 OK)**:

    ```json
    {
        "message": "Password changed successfully"
    }
    ```

## 3. User Management (Requires `admin` role)

### `GET /users`

Retrieves a list of all users.

*   **Response (200 OK)**:

    ```json
    [
        { "id": 1, "username": "admin", "email": "admin@example.com", ... },
        // ... other users
    ]
    ```

### `GET /users/<int:user_id>`

Retrieves details for a specific user.

*   **Response (200 OK)**:

    ```json
    {
        "id": "integer",
        "username": "string",
        "email": "string",
        "first_name": "string",
        "last_name": "string",
        "is_active": "boolean",
        "role": {
            "id": "integer",
            "name": "string"
        }
    }
    ```

### `POST /users`

Creates a new user.

*   **Request Body**:

    ```json
    {
        "username": "string",
        "email": "string",
        "password": "string",
        "first_name": "string",
        "last_name": "string",
        "role_id": "integer"
    }
    ```

*   **Response (201 Created)**:

    ```json
    {
        "message": "User created successfully",
        "user": { ... user details ... }
    }
    ```

### `PUT /users/<int:user_id>`

Updates an existing user.

*   **Request Body**:

    ```json
    {
        "username": "string" (optional),
        "email": "string" (optional),
        "first_name": "string" (optional),
        "last_name": "string" (optional),
        "is_active": "boolean" (optional),
        "role_id": "integer" (optional)
    }
    ```

*   **Response (200 OK)**:

    ```json
    {
        "message": "User updated successfully",
        "user": { ... updated user details ... }
    }
    ```

### `DELETE /users/<int:user_id>`

Deletes a user.

*   **Response (200 OK)**:

    ```json
    {
        "message": "User deleted successfully"
    }
    ```

## 4. Unit Management

### `GET /units`

Retrieves a list of all units.

*   **Query Parameters**:
    *   `status`: Filter by unit status (e.g., `online`, `offline`).
    *   `health_status`: Filter by health status (e.g., `optimal`, `warning`).
    *   `location`: Filter by location.
*   **Response (200 OK)**:

    ```json
    [
        { "id": "TC001", "name": "Unit Alpha", "status": "online", ... },
        // ... other units
    ]
    ```

### `GET /units/<string:unit_id>`

Retrieves details for a specific unit.

*   **Response (200 OK)**:

    ```json
    {
        "id": "string",
        "name": "string",
        "serial_number": "string",
        "install_date": "datetime",
        "last_maintenance": "datetime",
        "location": "string",
        "status": "string" (e.g., "online", "offline"),
        "health_status": "string" (e.g., "optimal", "warning"),
        "water_generation": "boolean",
        "has_alert": "boolean",
        "has_alarm": "boolean",
        "client_name": "string",
        "client_contact": "string",
        "client_email": "string",
        "client_phone": "string",
        "temp_outside": "float",
        "temp_in": "float",
        "temp_out": "float",
        "humidity": "float",
        "pressure": "float",
        "water_level": "float",
        "battery_level": "float",
        "current_power": "float",
        "parasitic_load": "float",
        "user_load": "float",
        "created_at": "datetime",
        "updated_at": "datetime"
    }
    ```

### `POST /units`

Creates a new unit.

*   **Request Body**:

    ```json
    {
        "id": "string" (e.g., "TC001"),
        "name": "string",
        "serial_number": "string",
        "install_date": "string" (ISO 8601 format),
        "location": "string" (optional),
        "client_name": "string" (optional),
        "client_contact": "string" (optional),
        "client_email": "string" (optional),
        "client_phone": "string" (optional)
    }
    ```

*   **Response (201 Created)**:

    ```json
    {
        "message": "Unit created successfully",
        "unit": { ... unit details ... }
    }
    ```

### `PUT /units/<string:unit_id>`

Updates an existing unit.

*   **Request Body**: (Partial update, any field from `POST /units` body is optional)

    ```json
    {
        "name": "string" (optional),
        "location": "string" (optional),
        "status": "string" (optional, e.g., "online", "offline"),
        "health_status": "string" (optional, e.g., "optimal", "warning"),
        "water_generation": "boolean" (optional),
        "has_alert": "boolean" (optional),
        "has_alarm": "boolean" (optional),
        "client_name": "string" (optional),
        "client_contact": "string" (optional),
        "client_email": "string" (optional),
        "client_phone": "string" (optional)
    }
    ```

*   **Response (200 OK)**:

    ```json
    {
        "message": "Unit updated successfully",
        "unit": { ... updated unit details ... }
    }
    ```

### `DELETE /units/<string:unit_id>`

Deletes a unit.

*   **Response (200 OK)**:

    ```json
    {
        "message": "Unit deleted successfully"
    }
    ```

## 5. Sensor Data

### `GET /units/<string:unit_id>/sensors`

Retrieves a list of sensors for a specific unit.

*   **Response (200 OK)**:

    ```json
    [
        { "id": 1, "unit_id": "TC001", "name": "Temperature Sensor", "sensor_type": "temperature", ... },
        // ... other sensors
    ]
    ```

### `GET /units/<string:unit_id>/sensors/<int:sensor_id>/readings`

Retrieves sensor readings for a specific sensor.

*   **Query Parameters**:
    *   `start_time`: ISO 8601 datetime string (e.g., `2023-01-01T00:00:00Z`).
    *   `end_time`: ISO 8601 datetime string.
    *   `interval`: Aggregation interval (e.g., `1h`, `1d`).
*   **Response (200 OK)**:

    ```json
    [
        { "timestamp": "datetime", "value": "float", "quality": "string" },
        // ... other readings
    ]
    ```

## 6. Analytics

### `GET /analytics/dashboard-summary`

Retrieves a summary of key metrics for the dashboard.

*   **Response (200 OK)**:

    ```json
    {
        "total_units": "integer",
        "online_units": "integer",
        "offline_units": "integer",
        "units_in_maintenance": "integer",
        "units_with_errors": "integer",
        "avg_temp_in": "float",
        "avg_temp_out": "float",
        "avg_humidity": "float",
        "total_power_consumption": "float",
        "alerts_last_24h": "integer",
        "alarms_last_24h": "integer"
    }
    ```

### `GET /analytics/units-performance`

Analyzes the performance of units over a specified period.

*   **Query Parameters**:
    *   `hours`: Number of hours to consider for analysis (default: 24).
*   **Response (200 OK)**:

    ```json
    {
        "period_hours": "integer",
        "units": [
            {
                "unit_id": "string",
                "unit_name": "string",
                "status": "string",
                "reading_count": "integer",
                "avg_value": "float",
                "max_value": "float",
                "min_value": "float",
                "performance_score": "integer"
            }
        ],
        "summary": {
            "total_units": "integer",
            "avg_performance": "float",
            "best_performing": { ... unit performance details ... },
            "worst_performing": { ... unit performance details ... }
        }
    }
    ```

### `GET /analytics/alerts/patterns`

Analyzes alert patterns and frequencies.

*   **Query Parameters**:
    *   `days`: Number of days to consider for analysis (default: 30).
*   **Response (200 OK)**:

    ```json
    {
        "period_days": "integer",
        "total_potential_alerts": "integer",
        "avg_alerts_per_day": "float",
        "daily_patterns": {
            "YYYY-MM-DD": {
                "sensor_type": "count"
            }
        },
        "sensor_type_breakdown": {
            "sensor_type": "total_count"
        },
        "most_problematic_sensor": "string"
    }
    ```

## 7. Health Check

### `GET /health`

Checks the health status of the application and its integrated services.

*   **Response (200 OK)**:

    ```json
    {
        "status": "healthy",
        "version": "string",
        "mqtt": { ... mqtt service status ... },
        "websocket": { ... websocket service status ... },
        "realtime_processor": { ... realtime processor status ... },
        "opcua": { ... opcua service status ... },
        "protocol_simulator": { ... protocol simulator status ... },
        "data_storage": { ... data storage service status ... },
        "anomaly_detection": { ... anomaly detection service status ... },
        "modbus": { ... modbus service status ... },
        "dnp3": { ... dnp3 service status ... }
    }
    ```
