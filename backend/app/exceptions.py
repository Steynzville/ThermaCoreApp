"""Domain-specific exceptions for ThermaCore SCADA system.

This module provides a comprehensive set of domain exceptions that align with the
application's business logic and error handling patterns. These exceptions integrate
with the SecurityAwareErrorHandler to provide secure, user-friendly error responses
while maintaining detailed logging for debugging.

The exception hierarchy is designed to support:
- Protocol-specific errors (MQTT, OPC UA, Modbus, DNP3)
- Unit and sensor management errors
- Authentication and authorization errors
- Data validation and integrity errors
- Service availability and communication errors
"""

from typing import Optional, Dict, Any


class ThermaCoreException(Exception):
    """Base exception for all ThermaCore domain exceptions.
    
    This base class provides common functionality for all domain exceptions,
    including error categorization and context information.
    
    Attributes:
        error_type: Maps to SecurityAwareErrorHandler.GENERIC_MESSAGES keys
        status_code: HTTP status code for the error response
        context: Additional context information for logging
        details: Detailed error information for debugging (not exposed to users)
    """
    
    def __init__(
        self, 
        message: str,
        error_type: str = 'internal_error',
        status_code: int = 500,
        context: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.error_type = error_type
        self.status_code = status_code
        self.context = context or self.__class__.__name__
        self.details = details or {}


# Authentication and Authorization Exceptions

class AuthenticationException(ThermaCoreException):
    """Base class for authentication-related exceptions."""
    
    def __init__(self, message: str = "Authentication failed", **kwargs):
        super().__init__(
            message, 
            error_type='authentication_error',
            status_code=401,
            **kwargs
        )


class InvalidCredentialsException(AuthenticationException):
    """Raised when user provides invalid credentials."""
    
    def __init__(self, username: Optional[str] = None, **kwargs):
        message = f"Invalid credentials for user: {username}" if username else "Invalid credentials"
        super().__init__(message, **kwargs)


class TokenExpiredException(AuthenticationException):
    """Raised when JWT token has expired."""
    
    def __init__(self, **kwargs):
        super().__init__("Authentication token has expired", **kwargs)


class AuthorizationException(ThermaCoreException):
    """Base class for authorization-related exceptions."""
    
    def __init__(self, message: str = "Access denied", **kwargs):
        super().__init__(
            message,
            error_type='permission_error',
            status_code=403,
            **kwargs
        )


class InsufficientPermissionsException(AuthorizationException):
    """Raised when user lacks required permissions."""
    
    def __init__(self, required_permission: str, **kwargs):
        message = f"Insufficient permissions. Required: {required_permission}"
        kwargs['details'] = kwargs.get('details', {})
        kwargs['details'].update({'required_permission': required_permission})
        super().__init__(message, **kwargs)


# Resource Management Exceptions

class ResourceException(ThermaCoreException):
    """Base class for resource-related exceptions."""
    pass


class ResourceNotFoundException(ResourceException):
    """Raised when a requested resource is not found."""
    
    def __init__(self, resource_type: str, resource_id: Optional[str] = None, **kwargs):
        if resource_id:
            message = f"{resource_type} with ID '{resource_id}' not found"
        else:
            message = f"{resource_type} not found"
        
        super().__init__(
            message,
            error_type='not_found_error',
            status_code=404,
            **kwargs
        )
        # Set details after calling super to avoid parameter conflict
        self.details.update({'resource_type': resource_type, 'resource_id': resource_id})


class UnitNotFoundException(ResourceNotFoundException):
    """Raised when a unit is not found."""
    
    def __init__(self, unit_id: str, **kwargs):
        super().__init__('Unit', unit_id, **kwargs)


class SensorNotFoundException(ResourceNotFoundException):
    """Raised when a sensor is not found."""
    
    def __init__(self, sensor_id: str, **kwargs):
        super().__init__('Sensor', sensor_id, **kwargs)


class UserNotFoundException(ResourceNotFoundException):
    """Raised when a user is not found."""
    
    def __init__(self, username: str, **kwargs):
        super().__init__('User', username, **kwargs)


# Data Validation Exceptions

class ValidationException(ThermaCoreException):
    """Base class for data validation exceptions."""
    
    def __init__(self, message: str, field: Optional[str] = None, **kwargs):
        super().__init__(
            message,
            error_type='validation_error',
            status_code=400,
            **kwargs
        )
        if field:
            self.details.update({'field': field})


class InvalidDataException(ValidationException):
    """Raised when provided data fails validation."""
    
    def __init__(self, field: str, value: Any = None, reason: Optional[str] = None, **kwargs):
        if reason:
            message = f"Invalid value for '{field}': {reason}"
        else:
            message = f"Invalid value for '{field}'"
        
        super().__init__(
            message,
            field=field,
            **kwargs
        )
        self.details.update({'field': field, 'value': str(value), 'reason': reason})


class SensorReadingValidationException(ValidationException):
    """Raised when sensor reading data is invalid."""
    
    def __init__(self, sensor_id: str, value: float, reason: str, **kwargs):
        message = f"Invalid sensor reading for sensor {sensor_id}: {reason}"
        super().__init__(
            message,
            **kwargs
        )
        self.details.update({
            'sensor_id': sensor_id,
            'value': value,
            'reason': reason
        })


# Protocol Communication Exceptions

class ProtocolException(ThermaCoreException):
    """Base class for protocol communication exceptions."""
    
    def __init__(self, protocol: str, message: str, **kwargs):
        super().__init__(
            message,
            error_type='connection_error',
            status_code=503,
            context=f"{protocol} Protocol",
            **kwargs
        )
        self.details.update({'protocol': protocol})


class MQTTException(ProtocolException):
    """Raised for MQTT protocol errors."""
    
    def __init__(self, message: str, **kwargs):
        super().__init__('MQTT', message, **kwargs)


class MQTTConnectionException(MQTTException):
    """Raised when MQTT connection fails."""
    
    def __init__(self, broker_host: str, broker_port: int, **kwargs):
        message = f"Failed to connect to MQTT broker at {broker_host}:{broker_port}"
        kwargs['details'] = kwargs.get('details', {})
        kwargs['details'].update({
            'broker_host': broker_host, 
            'broker_port': broker_port
        })
        super().__init__(message, **kwargs)


class OPCUAException(ProtocolException):
    """Raised for OPC UA protocol errors."""
    
    def __init__(self, message: str, **kwargs):
        super().__init__('OPC UA', message, **kwargs)


class OPCUAConnectionException(OPCUAException):
    """Raised when OPC UA connection fails."""
    
    def __init__(self, server_url: str, **kwargs):
        message = f"Failed to connect to OPC UA server at {server_url}"
        kwargs['details'] = kwargs.get('details', {})
        kwargs['details'].update({'server_url': server_url})
        super().__init__(message, **kwargs)


class ModbusException(ProtocolException):
    """Raised for Modbus protocol errors."""
    
    def __init__(self, message: str, **kwargs):
        super().__init__('Modbus', message, **kwargs)


class DNP3Exception(ProtocolException):
    """Raised for DNP3 protocol errors."""
    
    def __init__(self, message: str, **kwargs):
        super().__init__('DNP3', message, **kwargs)


# Service Availability Exceptions

class ServiceException(ThermaCoreException):
    """Base class for service availability exceptions."""
    
    def __init__(self, service_name: str, message: str, **kwargs):
        super().__init__(
            message,
            error_type='service_unavailable',
            status_code=503,
            context=f"{service_name} Service",
            **kwargs
        )
        self.details.update({'service_name': service_name})


class ServiceUnavailableException(ServiceException):
    """Raised when a required service is unavailable."""
    
    def __init__(self, service_name: str, **kwargs):
        message = f"{service_name} service is currently unavailable"
        super().__init__(service_name, message, **kwargs)


class DatabaseException(ThermaCoreException):
    """Base class for database-related exceptions."""
    
    def __init__(self, message: str, **kwargs):
        super().__init__(
            message,
            error_type='database_error',
            status_code=500,
            **kwargs
        )


class DatabaseConnectionException(DatabaseException):
    """Raised when database connection fails."""
    
    def __init__(self, **kwargs):
        super().__init__("Database connection failed", **kwargs)


class DatabaseIntegrityException(DatabaseException):
    """Raised when database integrity constraints are violated."""
    
    def __init__(self, constraint: str, **kwargs):
        message = f"Database integrity constraint violated: {constraint}"
        super().__init__(
            message,
            **kwargs
        )
        self.details.update({'constraint': constraint})


# Configuration and System Exceptions

class ConfigurationException(ThermaCoreException):
    """Raised for configuration-related errors."""
    
    def __init__(self, message: str, config_key: Optional[str] = None, **kwargs):
        super().__init__(
            message,
            error_type='configuration_error',
            status_code=500,
            **kwargs
        )
        if config_key:
            self.details.update({'config_key': config_key})


class MissingConfigurationException(ConfigurationException):
    """Raised when required configuration is missing."""
    
    def __init__(self, config_key: str, **kwargs):
        message = f"Missing required configuration: {config_key}"
        super().__init__(message, config_key=config_key, **kwargs)


class TimeoutException(ThermaCoreException):
    """Raised when an operation times out."""
    
    def __init__(self, operation: str, timeout_seconds: float, **kwargs):
        message = f"Operation '{operation}' timed out after {timeout_seconds} seconds"
        super().__init__(
            message,
            error_type='timeout_error',
            status_code=504,
            **kwargs
        )
        self.details.update({'operation': operation, 'timeout_seconds': timeout_seconds})


# Unit and Sensor Specific Exceptions

class UnitException(ThermaCoreException):
    """Base class for unit-related exceptions."""
    
    def __init__(self, unit_id: str, message: str, **kwargs):
        super().__init__(
            message,
            **kwargs
        )
        self.details.update({'unit_id': unit_id})


class UnitOfflineException(UnitException):
    """Raised when attempting to interact with an offline unit."""
    
    def __init__(self, unit_id: str, **kwargs):
        message = f"Unit {unit_id} is currently offline"
        super().__init__(
            unit_id,
            message,
            error_type='service_unavailable',
            status_code=503,
            **kwargs
        )


class UnitMaintenanceException(UnitException):
    """Raised when attempting to interact with a unit in maintenance mode."""
    
    def __init__(self, unit_id: str, **kwargs):
        message = f"Unit {unit_id} is currently in maintenance mode"
        super().__init__(
            unit_id,
            message,
            error_type='service_unavailable',
            status_code=503,
            **kwargs
        )


class SensorException(ThermaCoreException):
    """Base class for sensor-related exceptions."""
    
    def __init__(self, sensor_id: str, message: str, **kwargs):
        super().__init__(
            message,
            **kwargs
        )
        self.details.update({'sensor_id': sensor_id})


class SensorInactiveException(SensorException):
    """Raised when attempting to read from an inactive sensor."""
    
    def __init__(self, sensor_id: str, **kwargs):
        message = f"Sensor {sensor_id} is currently inactive"
        super().__init__(
            sensor_id,
            message,
            error_type='service_unavailable',
            status_code=503,
            **kwargs
        )


class SensorOutOfRangeException(SensorException):
    """Raised when sensor reading is outside acceptable range."""
    
    def __init__(self, sensor_id: str, value: float, min_value: float, max_value: float, **kwargs):
        message = (f"Sensor {sensor_id} reading {value} is outside acceptable range "
                  f"[{min_value}, {max_value}]")
        super().__init__(
            sensor_id,
            message,
            error_type='validation_error',
            status_code=400,
            **kwargs
        )
        self.details.update({
            'sensor_id': sensor_id,
            'value': value,
            'min_value': min_value,
            'max_value': max_value
        })