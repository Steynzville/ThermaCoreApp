-- SQLite-compatible database schema for ThermaCore SCADA test environment
-- This script creates tables compatible with SQLite for testing
-- Production uses PostgreSQL with 001_initial_schema.sql

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(128),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT 1 NOT NULL,
    role_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Create units table
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    install_date TIMESTAMP NOT NULL,
    last_maintenance TIMESTAMP,
    location VARCHAR(200),
    status VARCHAR(20) DEFAULT 'offline',
    health_status VARCHAR(20) DEFAULT 'optimal',
    water_generation BOOLEAN DEFAULT 0,
    has_alert BOOLEAN DEFAULT 0,
    has_alarm BOOLEAN DEFAULT 0,
    client_name VARCHAR(200),
    client_contact VARCHAR(200),
    client_email VARCHAR(120),
    client_phone VARCHAR(50),
    temp_outside FLOAT,
    temp_in FLOAT,
    temp_out FLOAT,
    humidity FLOAT,
    pressure FLOAT,
    water_level FLOAT,
    battery_level FLOAT,
    current_power FLOAT DEFAULT 0.0,
    parasitic_load FLOAT DEFAULT 0.0,
    user_load FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sensors table
CREATE TABLE IF NOT EXISTS sensors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    unit_of_measurement VARCHAR(20),
    min_value FLOAT,
    max_value FLOAT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units(id)
);

-- Create sensor_readings table
CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    value FLOAT NOT NULL,
    quality VARCHAR(20) DEFAULT 'GOOD',
    FOREIGN KEY (sensor_id) REFERENCES sensors(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_health_status ON units(health_status);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);

-- Note: SQLite doesn't support triggers in the same way as PostgreSQL
-- The updated_at columns will need to be updated manually in the application layer
-- or through SQLAlchemy's onupdate parameter (not recommended for production)
