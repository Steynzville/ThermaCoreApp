"""Tests for domain-specific exceptions."""

from app.exceptions import (
    AuthenticationException,
    AuthorizationException,
    ConfigurationException,
    DatabaseConnectionException,
    DatabaseException,
    DatabaseIntegrityException,
    DNP3Exception,
    InsufficientPermissionsException,
    InvalidCredentialsException,
    InvalidDataException,
    MissingConfigurationException,
    ModbusException,
    MQTTConnectionException,
    MQTTException,
    OPCUAConnectionException,
    OPCUAException,
    ResourceNotFoundException,
    SensorException,
    SensorInactiveException,
    SensorNotFoundException,
    SensorOutOfRangeException,
    SensorReadingValidationException,
    ServiceException,
    ServiceUnavailableException,
    ThermaCoreException,
    TimeoutException,
    TokenExpiredException,
    UnitException,
    UnitMaintenanceException,
    UnitNotFoundException,
    UnitOfflineException,
    UserNotFoundException,
    ValidationException,
)


class TestThermaCoreException:
    """Test base ThermaCore exception."""

    def test_initialization(self):
        """Test basic exception initialization."""
        exc = ThermaCoreException("Test error")

        assert str(exc) == "Test error"
        assert exc.error_type == "internal_error"
        assert exc.status_code == 500

    def test_initialization_with_context(self):
        """Test exception initialization with context."""
        exc = ThermaCoreException(
            "Test error",
            error_type="custom_error",
            status_code=400,
            context="TestContext",
        )

        assert exc.error_type == "custom_error"
        assert exc.status_code == 400
        assert exc.context == "TestContext"

    def test_initialization_with_details(self):
        """Test exception initialization with details."""
        details = {"key": "value", "code": 123}
        exc = ThermaCoreException("Test error", details=details)

        assert exc.details == details


class TestAuthenticationExceptions:
    """Test authentication-related exceptions."""

    def test_authentication_exception(self):
        """Test basic authentication exception."""
        exc = AuthenticationException()

        assert "Authentication failed" in str(exc)
        assert exc.error_type == "authentication_error"
        assert exc.status_code == 401

    def test_invalid_credentials_with_username(self):
        """Test invalid credentials exception with username."""
        exc = InvalidCredentialsException(username="testuser")

        assert "testuser" in str(exc)
        assert exc.status_code == 401

    def test_invalid_credentials_without_username(self):
        """Test invalid credentials exception without username."""
        exc = InvalidCredentialsException()

        assert "Invalid credentials" in str(exc)
        assert exc.status_code == 401

    def test_token_expired(self):
        """Test token expired exception."""
        exc = TokenExpiredException()

        assert "expired" in str(exc)
        assert exc.status_code == 401


class TestAuthorizationExceptions:
    """Test authorization-related exceptions."""

    def test_authorization_exception(self):
        """Test basic authorization exception."""
        exc = AuthorizationException()

        assert "Access denied" in str(exc)
        assert exc.error_type == "permission_error"
        assert exc.status_code == 403

    def test_insufficient_permissions(self):
        """Test insufficient permissions exception."""
        exc = InsufficientPermissionsException("read_units")

        assert "read_units" in str(exc)
        assert exc.status_code == 403
        assert exc.details["required_permission"] == "read_units"


class TestResourceExceptions:
    """Test resource-related exceptions."""

    def test_resource_not_found_with_id(self):
        """Test resource not found with ID."""
        exc = ResourceNotFoundException("Unit", "unit-123")

        assert "Unit" in str(exc)
        assert "unit-123" in str(exc)
        assert exc.status_code == 404
        assert exc.details["resource_type"] == "Unit"
        assert exc.details["resource_id"] == "unit-123"

    def test_resource_not_found_without_id(self):
        """Test resource not found without ID."""
        exc = ResourceNotFoundException("Sensor")

        assert "Sensor" in str(exc)
        assert exc.status_code == 404

    def test_unit_not_found(self):
        """Test unit not found exception."""
        exc = UnitNotFoundException("unit-456")

        assert "Unit" in str(exc)
        assert "unit-456" in str(exc)
        assert exc.status_code == 404

    def test_sensor_not_found(self):
        """Test sensor not found exception."""
        exc = SensorNotFoundException("sensor-789")

        assert "Sensor" in str(exc)
        assert "sensor-789" in str(exc)
        assert exc.status_code == 404

    def test_user_not_found(self):
        """Test user not found exception."""
        exc = UserNotFoundException("john_doe")

        assert "User" in str(exc)
        assert "john_doe" in str(exc)
        assert exc.status_code == 404


class TestValidationExceptions:
    """Test validation-related exceptions."""

    def test_validation_exception(self):
        """Test basic validation exception."""
        exc = ValidationException("Invalid input")

        assert "Invalid input" in str(exc)
        assert exc.error_type == "validation_error"
        assert exc.status_code == 400

    def test_validation_exception_with_field(self):
        """Test validation exception with field."""
        exc = ValidationException("Invalid input", field="email")

        assert exc.details["field"] == "email"

    def test_invalid_data_with_reason(self):
        """Test invalid data exception with reason."""
        exc = InvalidDataException("temperature", value=999, reason="Value too high")

        assert "temperature" in str(exc)
        assert "Value too high" in str(exc)
        assert exc.details["field"] == "temperature"
        assert exc.details["reason"] == "Value too high"

    def test_invalid_data_without_reason(self):
        """Test invalid data exception without reason."""
        exc = InvalidDataException("pressure", value=-1)

        assert "pressure" in str(exc)
        assert exc.details["field"] == "pressure"

    def test_sensor_reading_validation(self):
        """Test sensor reading validation exception."""
        exc = SensorReadingValidationException(
            sensor_id="sensor-1",
            value=150.5,
            reason="Value exceeds maximum threshold",
        )

        assert "sensor-1" in str(exc)
        assert exc.details["sensor_id"] == "sensor-1"
        assert exc.details["value"] == 150.5
        assert exc.details["reason"] == "Value exceeds maximum threshold"


class TestMQTTExceptions:
    """Test MQTT-related exceptions."""

    def test_mqtt_exception(self):
        """Test basic MQTT exception."""
        exc = MQTTException("Connection timeout")

        assert "Connection timeout" in str(exc)
        assert exc.status_code == 503
        assert exc.details["protocol"] == "MQTT"

    def test_mqtt_connection_exception(self):
        """Test MQTT connection exception."""
        exc = MQTTConnectionException(broker_host="localhost", broker_port=1883)

        assert "localhost" in str(exc)
        assert "1883" in str(exc)
        assert exc.details["broker_host"] == "localhost"
        assert exc.details["broker_port"] == 1883


class TestOPCUAExceptions:
    """Test OPC UA-related exceptions."""

    def test_opcua_exception(self):
        """Test basic OPC UA exception."""
        exc = OPCUAException("Invalid endpoint")

        assert "Invalid endpoint" in str(exc)
        assert exc.status_code == 503
        assert exc.details["protocol"] == "OPC UA"

    def test_opcua_connection_exception(self):
        """Test OPC UA connection exception."""
        exc = OPCUAConnectionException(server_url="opc.tcp://localhost:4840")

        assert "opc.tcp://localhost:4840" in str(exc)
        assert exc.details["server_url"] == "opc.tcp://localhost:4840"


class TestModbusExceptions:
    """Test Modbus-related exceptions."""

    def test_modbus_exception(self):
        """Test basic Modbus exception."""
        exc = ModbusException("Read timeout")

        assert "Read timeout" in str(exc)
        assert exc.status_code == 503
        assert exc.details["protocol"] == "Modbus"


class TestDNP3Exceptions:
    """Test DNP3-related exceptions."""

    def test_dnp3_exception(self):
        """Test basic DNP3 exception."""
        exc = DNP3Exception("Communication error")

        assert "Communication error" in str(exc)
        assert exc.status_code == 503
        assert exc.details["protocol"] == "DNP3"


class TestServiceExceptions:
    """Test service-related exceptions."""

    def test_service_exception(self):
        """Test basic service exception."""
        exc = ServiceException("MQTT", "Service down")

        assert "Service down" in str(exc)
        assert exc.status_code == 503
        assert exc.details["service_name"] == "MQTT"

    def test_service_unavailable(self):
        """Test service unavailable exception."""
        exc = ServiceUnavailableException("Database")

        assert "Database" in str(exc)
        assert "unavailable" in str(exc)
        assert exc.status_code == 503


class TestDatabaseExceptions:
    """Test database-related exceptions."""

    def test_database_exception(self):
        """Test basic database exception."""
        exc = DatabaseException("Query failed")

        assert "Query failed" in str(exc)
        assert exc.error_type == "database_error"
        assert exc.status_code == 500

    def test_database_connection_exception(self):
        """Test database connection exception."""
        exc = DatabaseConnectionException()

        assert "connection failed" in str(exc).lower()
        assert exc.status_code == 500

    def test_database_integrity_exception(self):
        """Test database integrity exception."""
        exc = DatabaseIntegrityException("unique_constraint_violation")

        assert "unique_constraint_violation" in str(exc)
        assert exc.details["constraint"] == "unique_constraint_violation"


class TestConfigurationExceptions:
    """Test configuration-related exceptions."""

    def test_configuration_exception(self):
        """Test basic configuration exception."""
        exc = ConfigurationException("Invalid config", config_key="api_key")

        assert "Invalid config" in str(exc)
        assert exc.error_type == "configuration_error"
        assert exc.details["config_key"] == "api_key"

    def test_missing_configuration_exception(self):
        """Test missing configuration exception."""
        exc = MissingConfigurationException("SECRET_KEY")

        assert "SECRET_KEY" in str(exc)
        assert "Missing" in str(exc)
        assert exc.details["config_key"] == "SECRET_KEY"


class TestTimeoutException:
    """Test timeout exception."""

    def test_timeout_exception(self):
        """Test timeout exception."""
        exc = TimeoutException("database_query", 30.0)

        assert "database_query" in str(exc)
        assert "30" in str(exc)
        assert exc.error_type == "timeout_error"
        assert exc.status_code == 504
        assert exc.details["operation"] == "database_query"
        assert exc.details["timeout_seconds"] == 30.0


class TestUnitExceptions:
    """Test unit-related exceptions."""

    def test_unit_exception(self):
        """Test basic unit exception."""
        exc = UnitException("unit-123", "Unit error")

        assert "Unit error" in str(exc)
        assert exc.details["unit_id"] == "unit-123"

    def test_unit_offline_exception(self):
        """Test unit offline exception."""
        exc = UnitOfflineException("unit-123")

        assert "unit-123" in str(exc)
        assert "offline" in str(exc).lower()
        assert exc.status_code == 503

    def test_unit_maintenance_exception(self):
        """Test unit maintenance exception."""
        exc = UnitMaintenanceException("unit-456")

        assert "unit-456" in str(exc)
        assert "maintenance" in str(exc).lower()
        assert exc.status_code == 503


class TestSensorExceptions:
    """Test sensor-related exceptions."""

    def test_sensor_exception(self):
        """Test basic sensor exception."""
        exc = SensorException("sensor-789", "Sensor error")

        assert "Sensor error" in str(exc)
        assert exc.details["sensor_id"] == "sensor-789"

    def test_sensor_inactive_exception(self):
        """Test sensor inactive exception."""
        exc = SensorInactiveException("sensor-789")

        assert "sensor-789" in str(exc)
        assert "inactive" in str(exc).lower()
        assert exc.status_code == 503

    def test_sensor_out_of_range_exception(self):
        """Test sensor out of range exception."""
        exc = SensorOutOfRangeException("sensor-101", 150.5, 0, 100)

        assert "sensor-101" in str(exc)
        assert "150.5" in str(exc)
        assert exc.details["value"] == 150.5
        assert exc.details["min_value"] == 0
        assert exc.details["max_value"] == 100
