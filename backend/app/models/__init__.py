"""Database models for ThermaCore SCADA system."""
from datetime import datetime, timezone
from enum import Enum as PyEnum

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, DateTime, Enum, Float, Integer, String, Text, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from werkzeug.security import check_password_hash, generate_password_hash

from app import db


def utc_now():
    """Get current UTC time as timezone-aware datetime.
    
    This function enforces timezone-aware datetimes at the application level
    by always returning UTC datetime objects. This approach works with both
    PostgreSQL and SQLite, unlike using DateTime(timezone=True) which only
    works with PostgreSQL.
    
    For production PostgreSQL deployments, consider adding database triggers
    to automatically update timestamp fields and enforce timezone constraints.
    """
    return datetime.now(timezone.utc)


# Association table for many-to-many relationship between roles and permissions
role_permissions = Table(
    'role_permissions',
    db.Model.metadata,
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)
)


class RoleEnum(PyEnum):
    """Role enumeration."""
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"


class PermissionEnum(PyEnum):
    """Permission enumeration."""
    READ_UNITS = "read_units"
    WRITE_UNITS = "write_units"
    DELETE_UNITS = "delete_units"
    READ_USERS = "read_users"
    WRITE_USERS = "write_users"
    DELETE_USERS = "delete_users"
    ADMIN_PANEL = "admin_panel"


class UnitStatusEnum(PyEnum):
    """Unit status enumeration."""
    ONLINE = "online"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"
    ERROR = "error"


class HealthStatusEnum(PyEnum):
    """Health status enumeration."""
    OPTIMAL = "optimal"
    WARNING = "warning"
    CRITICAL = "critical"


class Permission(db.Model):
    """Permission model."""
    __tablename__ = 'permissions'
    
    id = Column(Integer, primary_key=True)
    name = Column(Enum(PermissionEnum), unique=True, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, default=utc_now)  # timezone-aware via utc_now() function
    
    def __repr__(self):
        return f'<Permission {self.name}>'


class Role(db.Model):
    """Role model."""
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True)
    name = Column(Enum(RoleEnum), unique=True, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, default=utc_now)  # timezone-aware via utc_now() function
    
    # Relationships
    permissions = relationship('Permission', secondary=role_permissions, backref='roles')
    users = relationship('User', back_populates='role')
    
    def __repr__(self):
        return f'<Role {self.name}>'
    
    def has_permission(self, permission):
        """Check if role has a specific permission."""
        return any(p.name.value == permission for p in self.permissions)


class User(db.Model):
    """User model."""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(128))
    first_name = Column(String(100))
    last_name = Column(String(100))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)  # timezone-aware via utc_now() function
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)  # timezone-aware via utc_now() function
    last_login = Column(DateTime)  # timezone-aware set via application logic
    
    # Foreign Keys
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    
    # Relationships
    role = relationship('Role', back_populates='users')
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def set_password(self, password):
        """Set password hash."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password against hash."""
        return check_password_hash(self.password_hash, password)
    
    def has_permission(self, permission):
        """Check if user has a specific permission."""
        return self.role and self.role.has_permission(permission)


class Unit(db.Model):
    """Unit model representing ThermaCore units."""
    __tablename__ = 'units'
    
    id = Column(String(50), primary_key=True)  # TC001, TC002, etc.
    name = Column(String(200), nullable=False)
    serial_number = Column(String(100), unique=True, nullable=False)
    install_date = Column(DateTime, nullable=False)  # timezone-aware set via application logic
    last_maintenance = Column(DateTime)  # timezone-aware set via application logic
    location = Column(String(200))
    status = Column(Enum(UnitStatusEnum), default=UnitStatusEnum.OFFLINE)
    health_status = Column(Enum(HealthStatusEnum), default=HealthStatusEnum.OPTIMAL)
    water_generation = Column(Boolean, default=False)
    has_alert = Column(Boolean, default=False)
    has_alarm = Column(Boolean, default=False)
    
    # Client information
    client_name = Column(String(200))
    client_contact = Column(String(200))
    client_email = Column(String(120))
    client_phone = Column(String(50))
    
    # Current readings (latest values for quick access)
    temp_outside = Column(Float)
    temp_in = Column(Float)
    temp_out = Column(Float)
    humidity = Column(Float)
    pressure = Column(Float)
    water_level = Column(Float)
    battery_level = Column(Float)
    current_power = Column(Float, default=0.0)
    parasitic_load = Column(Float, default=0.0)
    user_load = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=utc_now)  # timezone-aware via utc_now() function
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)  # timezone-aware via utc_now() function
    
    # Relationships
    sensors = relationship('Sensor', back_populates='unit', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Unit {self.id}: {self.name}>'


class Sensor(db.Model):
    """Sensor model for unit sensors."""
    __tablename__ = 'sensors'
    
    id = Column(Integer, primary_key=True)
    unit_id = Column(String(50), ForeignKey('units.id'), nullable=False)
    name = Column(String(100), nullable=False)
    sensor_type = Column(String(50), nullable=False)  # temperature, humidity, pressure, etc.
    unit_of_measurement = Column(String(20))  # °C, %, Pa, etc.
    min_value = Column(Float)
    max_value = Column(Float)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=utc_now)  # timezone-aware via utc_now() function
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)  # timezone-aware via utc_now() function
    
    # Relationships
    unit = relationship('Unit', back_populates='sensors')
    readings = relationship('SensorReading', back_populates='sensor', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Sensor {self.name} ({self.sensor_type}) for Unit {self.unit_id}>'


class SensorReading(db.Model):
    """Sensor reading model for time-series data."""
    __tablename__ = 'sensor_readings'
    
    id = Column(Integer, primary_key=True)
    sensor_id = Column(Integer, ForeignKey('sensors.id'), nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)  # timezone-aware via utc_now() function
    value = Column(Float, nullable=False)
    quality = Column(String(20), default='GOOD')  # GOOD, BAD, UNCERTAIN
    
    # Relationships
    sensor = relationship('Sensor', back_populates='readings')
    
    def __repr__(self):
        return f'<SensorReading {self.sensor_id} at {self.timestamp}: {self.value}>'