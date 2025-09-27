# Database Schema Information

The ThermaCoreApp utilizes a PostgreSQL database to store all application data. The schema is defined using SQLAlchemy ORM in `backend/app/models/__init__.py`. This document outlines the key tables, their columns, relationships, and enumerations.

## 1. Enumerations

Several enumerations are used to standardize values across the database.

### `RoleEnum`

Represents the different user roles within the system.

| Value      | Description                               |
| :--------- | :---------------------------------------- |
| `ADMIN`    | Full administrative access.               |
| `OPERATOR` | Can manage units and perform operations.  |
| `VIEWER`   | Read-only access to monitoring data.      |

### `PermissionEnum`

Defines granular permissions that can be assigned to roles.

| Value              | Description                               |
| :----------------- | :---------------------------------------- |
| `READ_UNITS`       | View unit information.                    |
| `WRITE_UNITS`      | Create or update unit information.        |
| `DELETE_UNITS`     | Delete units.                             |
| `READ_USERS`       | View user information.                    |
| `WRITE_USERS`      | Create or update user information.        |
| `DELETE_USERS`     | Delete users.                             |
| `ADMIN_PANEL`      | Access the administrative panel.          |
| `REMOTE_CONTROL`   | Send remote commands to units.            |

### `UnitStatusEnum`

Indicates the operational status of a ThermaCore unit.

| Value         | Description                               |
| :------------ | :---------------------------------------- |
| `ONLINE`      | Unit is actively connected and operating. |
| `OFFLINE`     | Unit is not connected.                    |
| `MAINTENANCE` | Unit is undergoing maintenance.           |
| `ERROR`       | Unit is experiencing an error.            |

### `HealthStatusEnum`

Reflects the overall health assessment of a ThermaCore unit.

| Value        | Description                               |
| :----------- | :---------------------------------------- |
| `OPTIMAL`    | Unit is functioning perfectly.            |
| `WARNING`    | Minor issues detected, requires attention.|
| `CRITICAL`   | Major issues detected, immediate action required. |

## 2. Tables

### `permissions` Table

Stores definitions of system permissions.

| Column      | Type               | Constraints                  | Description                         |
| :---------- | :----------------- | :--------------------------- | :---------------------------------- |
| `id`        | `Integer`          | `PRIMARY KEY`                | Unique identifier for the permission. |
| `name`      | `Enum(PermissionEnum)` | `UNIQUE`, `NOT NULL`         | The name of the permission (e.g., `read_units`). |
| `description` | `String(255)`      |                              | A brief description of the permission. |
| `created_at`  | `DateTime`         | `DEFAULT utc_now()`          | Timestamp when the permission was created. |

### `roles` Table

Stores definitions of user roles.

| Column      | Type             | Constraints                  | Description                         |
| :---------- | :--------------- | :--------------------------- | :---------------------------------- |
| `id`        | `Integer`        | `PRIMARY KEY`                | Unique identifier for the role.     |
| `name`      | `Enum(RoleEnum)` | `UNIQUE`, `NOT NULL`         | The name of the role (e.g., `admin`). |
| `description` | `String(255)`    |                              | A brief description of the role.    |
| `created_at`  | `DateTime`       | `DEFAULT utc_now()`          | Timestamp when the role was created. |

### `role_permissions` Table (Association Table)

Links roles to permissions in a many-to-many relationship.

| Column          | Type      | Constraints                                  | Description                         |
| :-------------- | :-------- | :------------------------------------------- | :---------------------------------- |
| `role_id`       | `Integer` | `PRIMARY KEY`, `FOREIGN KEY (roles.id)`      | Foreign key to the `roles` table.   |
| `permission_id` | `Integer` | `PRIMARY KEY`, `FOREIGN KEY (permissions.id)` | Foreign key to the `permissions` table. |

### `users` Table

Stores user account information.

| Column        | Type            | Constraints                          | Description                         |
| :------------ | :-------------- | :----------------------------------- | :---------------------------------- |
| `id`          | `Integer`       | `PRIMARY KEY`                        | Unique identifier for the user.     |
| `username`    | `String(80)`    | `UNIQUE`, `NOT NULL`, `INDEX`        | User's unique username.             |
| `email`       | `String(120)`   | `UNIQUE`, `NOT NULL`, `INDEX`        | User's unique email address.        |
| `password_hash` | `String(128)`   |                              | Hashed password for security.       |
| `first_name`  | `String(100)`   |                              | User's first name.                  |
| `last_name`   | `String(100)`   |                              | User's last name.                   |
| `is_active`   | `Boolean`       | `DEFAULT TRUE`, `NOT NULL`           | Indicates if the user account is active. |
| `created_at`  | `DateTime`      | `DEFAULT utc_now()`                  | Timestamp when the user was created. |
| `updated_at`  | `DateTime`      | `DEFAULT utc_now()`                  | Last update timestamp for the user. |
| `last_login`  | `DateTime`      |                              | Timestamp of the user's last login. |
| `role_id`     | `Integer`       | `FOREIGN KEY (roles.id)`, `NOT NULL` | Foreign key to the `roles` table, indicating user's role. |

### `units` Table

Stores information about ThermaCore units.

| Column             | Type               | Constraints                          | Description                         |
| :----------------- | :----------------- | :----------------------------------- | :---------------------------------- |
| `id`               | `String(50)`       | `PRIMARY KEY`                        | Unique identifier for the unit (e.g., `TC001`). |
| `name`             | `String(200)`      | `NOT NULL`                           | Human-readable name of the unit.    |
| `serial_number`    | `String(100)`      | `UNIQUE`, `NOT NULL`                 | Unique serial number of the unit.   |
| `install_date`     | `DateTime`         | `NOT NULL`                           | Date of unit installation.          |
| `last_maintenance` | `DateTime`         |                              | Date of the last maintenance.       |
| `location`         | `String(200)`      |                              | Physical location of the unit.      |
| `status`           | `Enum(UnitStatusEnum)` | `DEFAULT 'offline'`                  | Current operational status of the unit. |
| `health_status`    | `Enum(HealthStatusEnum)` | `DEFAULT 'optimal'`                  | Current health status of the unit.  |
| `water_generation` | `Boolean`          | `DEFAULT FALSE`                      | Indicates if the unit generates water. |
| `has_alert`        | `Boolean`          | `DEFAULT FALSE`                      | Indicates if the unit has an active alert. |
| `has_alarm`        | `Boolean`          | `DEFAULT FALSE`                      | Indicates if the unit has an active alarm. |
| `client_name`      | `String(200)`      |                              | Name of the client owning the unit. |
| `client_contact`   | `String(200)`      |                              | Client contact person.              |
| `client_email`     | `String(120)`      |                              | Client email address.               |
| `client_phone`     | `String(50)`       |                              | Client phone number.                |
| `temp_outside`     | `Float`            |                              | Latest outside temperature reading. |
| `temp_in`          | `Float`            |                              | Latest inside temperature reading.  |
| `temp_out`         | `Float`            |                              | Latest outlet temperature reading.  |
| `humidity`         | `Float`            |                              | Latest humidity reading.            |
| `pressure`         | `Float`            |                              | Latest pressure reading.            |
| `water_level`      | `Float`            |                              | Latest water level reading.         |
| `battery_level`    | `Float`            |                              | Latest battery level reading.       |
| `current_power`    | `Float`            | `DEFAULT 0.0`                        | Latest power consumption reading.   |
| `parasitic_load`   | `Float`            | `DEFAULT 0.0`                        | Latest parasitic load reading.      |
| `user_load`        | `Float`            | `DEFAULT 0.0`                        | Latest user load reading.           |
| `created_at`       | `DateTime`         | `DEFAULT utc_now()`                  | Timestamp when the unit was created. |
| `updated_at`       | `DateTime`         | `DEFAULT utc_now()`                  | Last update timestamp for the unit. |

### `sensors` Table

Stores information about sensors associated with units.

| Column              | Type          | Constraints                          | Description                         |
| :------------------ | :------------ | :----------------------------------- | :---------------------------------- |
| `id`                | `Integer`     | `PRIMARY KEY`                        | Unique identifier for the sensor.   |
| `unit_id`           | `String(50)`  | `FOREIGN KEY (units.id)`, `NOT NULL` | Foreign key to the `units` table.   |
| `name`              | `String(100)` | `NOT NULL`                           | Name of the sensor.                 |
| `sensor_type`       | `String(50)`  | `NOT NULL`                           | Type of sensor (e.g., `temperature`, `humidity`). |
| `unit_of_measurement` | `String(20)`  |                              | Unit of measurement (e.g., `°C`, `%`). |
| `min_value`         | `Float`       |                              | Minimum expected value for the sensor. |
| `max_value`         | `Float`       |                              | Maximum expected value for the sensor. |
| `is_active`         | `Boolean`     | `DEFAULT TRUE`                       | Indicates if the sensor is active.  |
| `created_at`        | `DateTime`    | `DEFAULT utc_now()`                  | Timestamp when the sensor was created. |
| `updated_at`        | `DateTime`    | `DEFAULT utc_now()`                  | Last update timestamp for the sensor. |

### `sensor_readings` Table

Stores time-series data from sensors.

| Column    | Type       | Constraints                          | Description                         |
| :-------- | :--------- | :----------------------------------- | :---------------------------------- |
| `id`      | `Integer`  | `PRIMARY KEY`                        | Unique identifier for the reading.  |
| `sensor_id` | `Integer`  | `FOREIGN KEY (sensors.id)`, `NOT NULL` | Foreign key to the `sensors` table. |
| `timestamp` | `DateTime` | `DEFAULT utc_now()`, `NOT NULL`, `INDEX` | Timestamp of the sensor reading.    |
| `value`   | `Float`    | `NOT NULL`                           | The recorded sensor value.          |
| `quality` | `String(20)` | `DEFAULT 'GOOD'`                     | Quality of the sensor reading (e.g., `GOOD`, `BAD`). |

## 3. Relationships

*   **Role to Permissions**: Many-to-many relationship via `role_permissions` association table.
*   **Role to Users**: One-to-many relationship (one role can have many users).
*   **User to Role**: Many-to-one relationship (many users belong to one role).
*   **Unit to Sensors**: One-to-many relationship (one unit can have many sensors).
*   **Sensor to Unit**: Many-to-one relationship (many sensors belong to one unit).
*   **Sensor to SensorReadings**: One-to-many relationship (one sensor can have many readings).
*   **SensorReading to Sensor**: Many-to-one relationship (many readings belong to one sensor).
