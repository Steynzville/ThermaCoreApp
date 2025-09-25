"""Data serializers and validation schemas for ThermaCore SCADA API."""
from datetime import datetime
from marshmallow import Schema, fields, validate, ValidationError, post_load
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.models import User, Role, Permission, Unit, Sensor, SensorReading, PermissionEnum, RoleEnum, UnitStatusEnum, HealthStatusEnum


class EnumField(fields.Field):
    """Custom field for handling enum serialization."""
    
    def __init__(self, enum_class, *args, **kwargs):
        self.enum_class = enum_class
        super().__init__(*args, **kwargs)
    
    def serialize(self, attr, obj, accessor=None):
        """Serialize enum to its value."""
        value = getattr(obj, attr, None)
        if value is None:
            return None
        # If it's already a string, return it
        if isinstance(value, str):
            return value
        # If it's an enum, return its value
        return value.value if hasattr(value, 'value') else str(value)
    
    def deserialize(self, value, attr=None, data=None, **kwargs):
        """Deserialize string value to enum."""
        if isinstance(value, str):
            return self.enum_class(value)
        return value


# Base schemas with common fields
class TimestampSchema(Schema):
    """Base schema with timestamp fields."""
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


# Permission schemas
class PermissionSchema(Schema):
    """Permission serialization schema."""
    id = fields.Int(dump_only=True)
    name = EnumField(PermissionEnum, dump_only=True)
    description = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


# Role schemas
class RoleSchema(Schema):
    """Role serialization schema."""
    id = fields.Int(dump_only=True)
    name = EnumField(RoleEnum, dump_only=True)
    description = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    permissions = fields.Nested(PermissionSchema, many=True, dump_only=True)


# User schemas
class UserSchema(SQLAlchemyAutoSchema):
    """User serialization schema."""
    class Meta:
        model = User
        load_instance = True
        exclude = ('password_hash',)
        
    email = fields.Email(required=True)
    username = fields.Str(required=True, validate=validate.Length(min=3, max=80))
    password = fields.Str(load_only=True, validate=validate.Length(min=6))
    role = fields.Nested(RoleSchema, dump_only=True)
    
    @post_load
    def make_user(self, data, **kwargs):
        """Process loaded data."""
        if 'password' in data:
            password = data.pop('password')
            user = User(**data)
            user.set_password(password)
            return user
        return User(**data)


class UserCreateSchema(Schema):
    """Schema for user creation."""
    username = fields.Str(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6))
    first_name = fields.Str(validate=validate.Length(max=100))
    last_name = fields.Str(validate=validate.Length(max=100))
    role_id = fields.Int(required=True)


class UserUpdateSchema(Schema):
    """Schema for user updates."""
    username = fields.Str(validate=validate.Length(min=3, max=80))
    email = fields.Email()
    first_name = fields.Str(validate=validate.Length(max=100))
    last_name = fields.Str(validate=validate.Length(max=100))
    role_id = fields.Int()
    is_active = fields.Bool()


class LoginSchema(Schema):
    """Schema for user login."""
    username = fields.Str(required=True)
    password = fields.Str(required=True)


# Unit schemas
class UnitSchema(SQLAlchemyAutoSchema):
    """Unit serialization schema."""
    class Meta:
        model = Unit
        load_instance = True
        include_relationships = True
        
    id = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    serial_number = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    install_date = fields.DateTime(required=True)
    status = EnumField(UnitStatusEnum)
    health_status = EnumField(HealthStatusEnum)
    
    # Validation for numeric fields
    temp_outside = fields.Float(validate=validate.Range(min=-50.0, max=70.0))
    temp_in = fields.Float(validate=validate.Range(min=-20.0, max=60.0))
    temp_out = fields.Float(validate=validate.Range(min=-20.0, max=30.0))
    humidity = fields.Float(validate=validate.Range(min=0.0, max=100.0))
    pressure = fields.Float(validate=validate.Range(min=800.0, max=1200.0))
    water_level = fields.Float(validate=validate.Range(min=0.0, max=2000.0))
    battery_level = fields.Float(validate=validate.Range(min=0.0, max=100.0))
    current_power = fields.Float(validate=validate.Range(min=0.0))
    parasitic_load = fields.Float(validate=validate.Range(min=0.0))
    user_load = fields.Float(validate=validate.Range(min=0.0))
    
    sensors = fields.Nested('SensorSchema', many=True, dump_only=True, exclude=('unit',))


class UnitCreateSchema(Schema):
    """Schema for unit creation."""
    id = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    serial_number = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    install_date = fields.DateTime(required=True)
    location = fields.Str(validate=validate.Length(max=200))
    client_name = fields.Str(validate=validate.Length(max=200))
    client_contact = fields.Str(validate=validate.Length(max=200))
    client_email = fields.Email()
    client_phone = fields.Str(validate=validate.Length(max=50))


class UnitUpdateSchema(Schema):
    """Schema for unit updates."""
    name = fields.Str(validate=validate.Length(min=1, max=200))
    location = fields.Str(validate=validate.Length(max=200))
    status = EnumField(UnitStatusEnum)
    health_status = EnumField(HealthStatusEnum)
    water_generation = fields.Bool()
    has_alert = fields.Bool()
    has_alarm = fields.Bool()
    last_maintenance = fields.DateTime()
    
    # Client information
    client_name = fields.Str(validate=validate.Length(max=200))
    client_contact = fields.Str(validate=validate.Length(max=200))
    client_email = fields.Email()
    client_phone = fields.Str(validate=validate.Length(max=50))
    
    # Current readings
    temp_outside = fields.Float(validate=validate.Range(min=-50.0, max=70.0))
    temp_in = fields.Float(validate=validate.Range(min=-20.0, max=60.0))
    temp_out = fields.Float(validate=validate.Range(min=-20.0, max=30.0))
    humidity = fields.Float(validate=validate.Range(min=0.0, max=100.0))
    pressure = fields.Float(validate=validate.Range(min=800.0, max=1200.0))
    water_level = fields.Float(validate=validate.Range(min=0.0, max=2000.0))
    battery_level = fields.Float(validate=validate.Range(min=0.0, max=100.0))
    current_power = fields.Float(validate=validate.Range(min=0.0))
    parasitic_load = fields.Float(validate=validate.Range(min=0.0))
    user_load = fields.Float(validate=validate.Range(min=0.0))


# Sensor schemas
class SensorSchema(SQLAlchemyAutoSchema):
    """Sensor serialization schema."""
    class Meta:
        model = Sensor
        load_instance = True
        
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    sensor_type = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    unit_of_measurement = fields.Str(validate=validate.Length(max=20))
    unit = fields.Nested(UnitSchema, dump_only=True, exclude=('sensors',))


class SensorCreateSchema(Schema):
    """Schema for sensor creation."""
    unit_id = fields.Str(required=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    sensor_type = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    unit_of_measurement = fields.Str(validate=validate.Length(max=20))
    min_value = fields.Float()
    max_value = fields.Float()


# Sensor reading schemas
class SensorReadingSchema(SQLAlchemyAutoSchema):
    """Sensor reading serialization schema."""
    class Meta:
        model = SensorReading
        load_instance = True
        
    timestamp = fields.DateTime(dump_default=datetime.utcnow)
    value = fields.Float(required=True)
    quality = fields.Str(validate=validate.OneOf(['GOOD', 'BAD', 'UNCERTAIN']))
    sensor = fields.Nested(SensorSchema, dump_only=True)


class SensorReadingCreateSchema(Schema):
    """Schema for sensor reading creation."""
    sensor_id = fields.Int(required=True)
    value = fields.Float(required=True)
    timestamp = fields.DateTime(missing=datetime.utcnow)
    quality = fields.Str(missing='GOOD', validate=validate.OneOf(['GOOD', 'BAD', 'UNCERTAIN']))


# Response schemas
class PaginatedResponseSchema(Schema):
    """Schema for paginated responses."""
    data = fields.List(fields.Raw())
    page = fields.Int()
    per_page = fields.Int()
    total = fields.Int()
    pages = fields.Int()
    has_next = fields.Bool()
    has_prev = fields.Bool()


class ErrorSchema(Schema):
    """Schema for error responses."""
    error = fields.Str()
    message = fields.Str()
    details = fields.Dict(missing=None)


# Authentication response schemas
class TokenSchema(Schema):
    """Schema for authentication token response."""
    access_token = fields.Str()
    refresh_token = fields.Str()
    expires_in = fields.Int()
    user = fields.Nested(UserSchema, exclude=('password_hash',))