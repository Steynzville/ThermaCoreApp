# Example Debug Output from Enhanced _init_database()

## Overview
This document shows example output from the enhanced `_init_database()` function in `backend/app/tests/conftest.py`.

## Successful SQLite Initialization

When running tests with SQLite (default), you'll see output like this:

```
======================================================================
Database Initialization - Debug Output
======================================================================
Database Type: SQLite
Database URI: sqlite:////tmp/tmpxyz12345.db

Using SQLAlchemy create_all() for SQLite schema initialization...
SQLAlchemy models to create: ['permissions', 'role_permissions', 'roles', 'sensor_readings', 'sensors', 'units', 'users']
✓ SQLite tables created successfully

Tables created (7):
  ✓ permissions (3 columns)
    - id (INTEGER)
    - name (VARCHAR(50))
    - created_at (DATETIME)
  ✓ role_permissions (2 columns)
    - role_id (INTEGER)
    - permission_id (INTEGER)
  ✓ roles (4 columns)
    - id (INTEGER)
    - name (VARCHAR(50))
    - description (VARCHAR(255))
    - created_at (DATETIME)
  ✓ sensor_readings (5 columns)
    - id (INTEGER)
    - sensor_id (INTEGER)
    - timestamp (DATETIME)
    - value (FLOAT)
    - quality (VARCHAR(20))
  ✓ sensors (10 columns)
    - id (INTEGER)
    - unit_id (VARCHAR(50))
    - name (VARCHAR(100))
    - sensor_type (VARCHAR(50))
    - unit_of_measurement (VARCHAR(20))
    - min_value (FLOAT)
    - max_value (FLOAT)
    - is_active (BOOLEAN)
    - created_at (DATETIME)
    - updated_at (DATETIME)
  ✓ units (23 columns)
    - id (VARCHAR(50))
    - name (VARCHAR(200))
    - serial_number (VARCHAR(100))
    - install_date (DATETIME)
    - last_maintenance (DATETIME)
    - location (VARCHAR(200))
    - status (VARCHAR(50))
    - health_status (VARCHAR(50))
    - water_generation (BOOLEAN)
    - has_alert (BOOLEAN)
    - has_alarm (BOOLEAN)
    - client_name (VARCHAR(200))
    - client_contact (VARCHAR(200))
    - client_email (VARCHAR(120))
    - client_phone (VARCHAR(50))
    - temp_outside (FLOAT)
    - temp_in (FLOAT)
    - temp_out (FLOAT)
    - humidity (FLOAT)
    - pressure (FLOAT)
    - water_level (FLOAT)
    - battery_level (FLOAT)
    - current_power (FLOAT)
  ✓ users (11 columns)
    - id (INTEGER)
    - username (VARCHAR(80))
    - email (VARCHAR(120))
    - password_hash (VARCHAR(128))
    - first_name (VARCHAR(100))
    - last_name (VARCHAR(100))
    - is_active (BOOLEAN)
    - created_at (DATETIME)
    - updated_at (DATETIME)
    - last_login (DATETIME)
    - role_id (INTEGER)

✓ All expected tables verified
======================================================================

```

## Successful PostgreSQL Initialization

When running tests with PostgreSQL (`USE_POSTGRES_TESTS=true`):

```
======================================================================
Database Initialization - Debug Output
======================================================================
Database Type: PostgreSQL
Database URI: postgresql://postgres:***@localhost:5432/thermacore_test_db

Using PostgreSQL migration script for schema initialization...
Schema file path: /path/to/backend/migrations/001_initial_schema.sql
Schema SQL loaded (45238 characters)
✓ PostgreSQL schema executed successfully

Tables created (7):
  ✓ permissions (4 columns)
    - id (INTEGER)
    - name (VARCHAR(50))
    - description (VARCHAR(255))
    - created_at (TIMESTAMP WITH TIME ZONE)
  ✓ role_permissions (2 columns)
    - role_id (INTEGER)
    - permission_id (INTEGER)
  ...

✓ All expected tables verified
======================================================================
```

## Error Case: Missing Schema File (PostgreSQL)

```
======================================================================
Database Initialization - Debug Output
======================================================================
Database Type: PostgreSQL
Database URI: postgresql://postgres:***@localhost:5432/thermacore_test_db

Using PostgreSQL migration script for schema initialization...
Schema file path: /path/to/backend/migrations/001_initial_schema.sql

======================================================================
✗ ERROR: Database initialization failed!
======================================================================
Error type: FileNotFoundError
Error message: Schema file not found: /path/to/backend/migrations/001_initial_schema.sql
Database type: PostgreSQL
Database URI: postgresql://postgres:***@localhost:5432/thermacore_test_db
Existing tables at time of error: []
======================================================================
```

## Error Case: Missing Tables

If some tables fail to create for any reason:

```
======================================================================
Database Initialization - Debug Output
======================================================================
Database Type: SQLite
Database URI: sqlite:////tmp/tmpxyz12345.db

Using SQLAlchemy create_all() for SQLite schema initialization...
SQLAlchemy models to create: ['permissions', 'roles', 'users']
✓ SQLite tables created successfully

Tables created (3):
  ✓ permissions (3 columns)
    - id (INTEGER)
    - name (VARCHAR(50))
    - created_at (DATETIME)
  ✓ roles (4 columns)
    - id (INTEGER)
    - name (VARCHAR(50))
    - description (VARCHAR(255))
    - created_at (DATETIME)
  ✓ users (11 columns)
    ...

✗ ERROR: Missing expected tables: ['role_permissions', 'units', 'sensors', 'sensor_readings']
Available tables: ['permissions', 'roles', 'users']

======================================================================
✗ ERROR: Database initialization failed!
======================================================================
Error type: RuntimeError
Error message: Database initialization incomplete - missing tables: ['role_permissions', 'units', 'sensors', 'sensor_readings']
Database type: SQLite
Database URI: sqlite:////tmp/tmpxyz12345.db
Existing tables at time of error: ['permissions', 'roles', 'users']
======================================================================
```

## Benefits of Debug Output

### Before Enhancement
```
FAILED app/tests/test_auth.py::test_login - sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such table: users
```

### After Enhancement
```
======================================================================
✗ ERROR: Database initialization failed!
======================================================================
Error type: OperationalError
Error message: (sqlite3.OperationalError) no such table: users
Database type: SQLite
Database URI: sqlite:////tmp/tmpxyz12345.db
Existing tables at time of error: ['permissions', 'roles']
======================================================================

FAILED app/tests/test_auth.py::test_login - RuntimeError: Database initialization incomplete - missing tables: ['users', ...]
```

Now developers can immediately see:
1. Which database system is being used
2. What tables were successfully created
3. What tables are missing
4. The column structure of each table
5. The exact error type and message

This makes debugging database initialization issues much faster and easier!
