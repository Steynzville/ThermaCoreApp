-- Seed data for initial setup of ThermaCore SCADA system

-- Insert default permissions
INSERT INTO permissions (name, description) VALUES 
    ('read_units', 'Read access to units and their data'),
    ('write_units', 'Create and update units'),
    ('delete_units', 'Delete units'),
    ('read_users', 'Read access to user information'),
    ('write_users', 'Create and update users'),
    ('delete_users', 'Delete users'),
    ('admin_panel', 'Access to administration panel'),
    ('remote_control', 'Remote control access to units (power, water production, auto settings, live video)')
ON CONFLICT (name) DO NOTHING;

-- Insert default roles
INSERT INTO roles (name, description) VALUES 
    ('admin', 'Full system access with all permissions'),
    ('operator', 'Operational access to units with limited user management'),
    ('viewer', 'Read-only access to system data')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Admin role gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Operator role gets unit management, read user permissions, and remote control
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'operator' AND p.name IN ('read_units', 'write_units', 'read_users', 'remote_control')
ON CONFLICT DO NOTHING;

-- Viewer role gets read permissions and remote control access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer' AND p.name IN ('read_units', 'read_users', 'remote_control')
ON CONFLICT DO NOTHING;

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, first_name, last_name, role_id)
SELECT 
    'admin',
    'admin@thermacore.com',
    'scrypt:32768:8:1$VQ8cTJN1lCQtQCkO$46c0bc14c05c2e7e3b7a0e8b0c9e8f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
    'System',
    'Administrator',
    r.id
FROM roles r
WHERE r.name = 'admin'
ON CONFLICT (username) DO NOTHING;

-- Insert sample ThermaCore units based on existing frontend data
INSERT INTO units (
    id, name, serial_number, install_date, last_maintenance, location, 
    status, health_status, water_generation, has_alert, has_alarm,
    client_name, client_contact, client_email, client_phone,
    temp_outside, temp_in, temp_out, humidity, pressure, water_level, 
    battery_level, current_power, parasitic_load, user_load
) VALUES 
    ('TC001', 'ThermaCore Unit 001', 'TC001-2024-001', '2024-01-15', '2024-08-20', 'Site Alpha',
     'offline', 'optimal', TRUE, TRUE, FALSE,
     'Alpha Industries Ltd', 'John Smith', 'john.smith@alphaindustries.com', '+1-555-0101',
     31.4, 30.3, 4.3, 63.4, 1040.3, 364.0, 50.3, 0.0, 0.0, 0.0),
     
    ('TC002', 'ThermaCore Unit 002', 'TC002-2024-002', '2024-01-16', '2024-09-15', 'Site Beta',
     'online', 'warning', TRUE, FALSE, FALSE,
     'Beta Corp', 'Jane Doe', 'jane.doe@betacorp.com', '+1-555-0102',
     28.7, 27.8, 5.2, 58.9, 1015.2, 289.5, 68.7, 3.2, 0.1, 2.8),
     
    ('TC003', 'ThermaCore Unit 003', 'TC003-2024-003', '2024-02-01', '2024-10-01', 'Site Gamma',
     'online', 'optimal', FALSE, FALSE, FALSE,
     'Gamma Solutions', 'Bob Wilson', 'bob.wilson@gammasolutions.com', '+1-555-0103',
     25.1, 24.3, 3.8, 71.2, 998.7, 456.8, 82.1, 5.7, 0.2, 4.9)
ON CONFLICT (id) DO NOTHING;

-- Insert sample sensors for each unit
INSERT INTO sensors (unit_id, name, sensor_type, unit_of_measurement, min_value, max_value) VALUES 
    ('TC001', 'Outside Temperature', 'temperature', '°C', -40.0, 60.0),
    ('TC001', 'Inside Temperature', 'temperature', '°C', 0.0, 50.0),
    ('TC001', 'Output Temperature', 'temperature', '°C', -10.0, 20.0),
    ('TC001', 'Humidity Sensor', 'humidity', '%', 0.0, 100.0),
    ('TC001', 'Pressure Sensor', 'pressure', 'Pa', 900.0, 1100.0),
    ('TC001', 'Water Level Sensor', 'level', 'L', 0.0, 1000.0),
    ('TC001', 'Battery Level Sensor', 'level', '%', 0.0, 100.0),
    
    ('TC002', 'Outside Temperature', 'temperature', '°C', -40.0, 60.0),
    ('TC002', 'Inside Temperature', 'temperature', '°C', 0.0, 50.0),
    ('TC002', 'Output Temperature', 'temperature', '°C', -10.0, 20.0),
    ('TC002', 'Humidity Sensor', 'humidity', '%', 0.0, 100.0),
    ('TC002', 'Pressure Sensor', 'pressure', 'Pa', 900.0, 1100.0),
    ('TC002', 'Water Level Sensor', 'level', 'L', 0.0, 1000.0),
    ('TC002', 'Battery Level Sensor', 'level', '%', 0.0, 100.0),
    
    ('TC003', 'Outside Temperature', 'temperature', '°C', -40.0, 60.0),
    ('TC003', 'Inside Temperature', 'temperature', '°C', 0.0, 50.0),
    ('TC003', 'Output Temperature', 'temperature', '°C', -10.0, 20.0),
    ('TC003', 'Humidity Sensor', 'humidity', '%', 0.0, 100.0),
    ('TC003', 'Pressure Sensor', 'pressure', 'Pa', 900.0, 1100.0),
    ('TC003', 'Water Level Sensor', 'level', 'L', 0.0, 1000.0),
    ('TC003', 'Battery Level Sensor', 'level', '%', 0.0, 100.0);

-- Insert sample sensor readings (recent data points for testing)
INSERT INTO sensor_readings (sensor_id, timestamp, value, quality)
SELECT 
    s.id,
    NOW() - (random() * interval '24 hours'),
    CASE 
        WHEN s.sensor_type = 'temperature' AND s.name LIKE '%Outside%' THEN 20.0 + (random() * 20.0)
        WHEN s.sensor_type = 'temperature' AND s.name LIKE '%Inside%' THEN 18.0 + (random() * 15.0)
        WHEN s.sensor_type = 'temperature' AND s.name LIKE '%Output%' THEN 0.0 + (random() * 10.0)
        WHEN s.sensor_type = 'humidity' THEN 40.0 + (random() * 40.0)
        WHEN s.sensor_type = 'pressure' THEN 950.0 + (random() * 100.0)
        WHEN s.sensor_type = 'level' AND s.name LIKE '%Water%' THEN 100.0 + (random() * 500.0)
        WHEN s.sensor_type = 'level' AND s.name LIKE '%Battery%' THEN 20.0 + (random() * 60.0)
        ELSE random() * 100.0
    END,
    'GOOD'
FROM sensors s
WHERE s.is_active = TRUE;