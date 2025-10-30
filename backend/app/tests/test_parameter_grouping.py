"""Tests for parameter grouping utilities."""

from app.parameter_grouping import (
    AuditEventParams,
    CertificateLoadConfig,
    DataProcessingParams,
    ParameterBuilder,
    ServiceInitConfig,
    group_related_params,
)


class TestAuditEventParams:
    """Test AuditEventParams dataclass."""

    def test_initialization_minimal(self):
        """Test initialization with minimal parameters."""
        params = AuditEventParams(event_type="login")

        assert params.event_type == "login"
        assert params.user_id is None
        assert params.success is True

    def test_initialization_full(self):
        """Test initialization with all parameters."""
        params = AuditEventParams(
            event_type="data_access",
            user_id=123,
            username="testuser",
            resource_type="sensor",
            resource_id="sensor-1",
            action="read",
            details={"extra": "info"},
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            success=True,
            error_message=None,
        )

        assert params.event_type == "data_access"
        assert params.user_id == 123
        assert params.username == "testuser"
        assert params.resource_type == "sensor"

    def test_to_dict(self):
        """Test conversion to dictionary."""
        params = AuditEventParams(
            event_type="login",
            user_id=123,
            username="testuser",
        )

        result = params.to_dict()

        assert result["event_type"] == "login"
        assert result["user_id"] == 123
        assert result["username"] == "testuser"
        assert "success" in result


class TestServiceInitConfig:
    """Test ServiceInitConfig dataclass."""

    def test_initialization_defaults(self):
        """Test initialization with default values."""
        config = ServiceInitConfig(app="test_app")

        assert config.app == "test_app"
        assert config.required is False
        assert config.timeout == 30
        assert config.retry_count == 3

    def test_get_config_with_override(self):
        """Test getting configuration with overrides."""
        config = ServiceInitConfig(
            app="test_app",
            config_overrides={"custom_key": "custom_value"},
        )

        value = config.get_config("custom_key", "default")

        assert value == "custom_value"

    def test_get_config_default(self):
        """Test getting configuration with default value."""
        config = ServiceInitConfig(app="test_app")

        value = config.get_config("missing_key", "default_value")

        assert value == "default_value"


class TestDataProcessingParams:
    """Test DataProcessingParams dataclass."""

    def test_initialization_defaults(self):
        """Test initialization with default values."""
        params = DataProcessingParams(data_type="temperature")

        assert params.data_type == "temperature"
        assert params.scale_factor == 1.0
        assert params.offset == 0.0
        assert params.validation_enabled is True

    def test_apply_transform_no_change(self):
        """Test applying transformation with default values."""
        params = DataProcessingParams(data_type="temperature")

        result = params.apply_transform(10.0)

        assert result == 10.0

    def test_apply_transform_with_scale(self):
        """Test applying transformation with scale factor."""
        params = DataProcessingParams(data_type="temperature", scale_factor=2.0)

        result = params.apply_transform(10.0)

        assert result == 20.0

    def test_apply_transform_with_offset(self):
        """Test applying transformation with offset."""
        params = DataProcessingParams(data_type="temperature", offset=5.0)

        result = params.apply_transform(10.0)

        assert result == 15.0

    def test_apply_transform_with_scale_and_offset(self):
        """Test applying transformation with both scale and offset."""
        params = DataProcessingParams(
            data_type="temperature",
            scale_factor=2.0,
            offset=5.0,
        )

        result = params.apply_transform(10.0)

        assert result == 25.0  # (10 * 2) + 5


class TestCertificateLoadConfig:
    """Test CertificateLoadConfig dataclass."""

    def test_initialization_production(self):
        """Test initialization for production environment."""
        config = CertificateLoadConfig(
            is_production=True,
            cert_path="/path/to/cert",
            key_path="/path/to/key",
        )

        assert config.is_production is True
        assert config.cert_path == "/path/to/cert"
        assert config.validate_dates is True

    def test_get_cert_paths(self):
        """Test getting certificate paths as dictionary."""
        config = CertificateLoadConfig(
            is_production=True,
            cert_path="/path/to/cert",
            key_path="/path/to/key",
            trust_path="/path/to/trust",
        )

        paths = config.get_cert_paths()

        assert paths["cert"] == "/path/to/cert"
        assert paths["key"] == "/path/to/key"
        assert paths["trust"] == "/path/to/trust"

    def test_get_cert_paths_none_values(self):
        """Test getting certificate paths with None values."""
        config = CertificateLoadConfig(is_production=False)

        paths = config.get_cert_paths()

        assert paths["cert"] is None
        assert paths["key"] is None
        assert paths["trust"] is None


class TestParameterBuilder:
    """Test ParameterBuilder class."""

    def test_initialization(self):
        """Test builder initialization."""
        builder = ParameterBuilder(AuditEventParams)

        assert builder.param_class == AuditEventParams
        assert builder.params == {}

    def test_set_returns_self(self):
        """Test that set returns self for chaining."""
        builder = ParameterBuilder(AuditEventParams)
        result = builder.set("event_type", "login")

        assert result is builder

    def test_set_single_value(self):
        """Test setting a single parameter value."""
        builder = ParameterBuilder(AuditEventParams)
        builder.set("event_type", "login")

        assert builder.params["event_type"] == "login"

    def test_set_if_condition_true(self):
        """Test conditionally setting value when condition is true."""
        builder = ParameterBuilder(AuditEventParams)
        builder.set_if(True, "user_id", 123)

        assert builder.params["user_id"] == 123

    def test_set_if_condition_false(self):
        """Test conditionally setting value when condition is false."""
        builder = ParameterBuilder(AuditEventParams)
        builder.set_if(False, "user_id", 123)

        assert "user_id" not in builder.params

    def test_build_creates_instance(self):
        """Test building parameter object."""
        builder = ParameterBuilder(AuditEventParams)
        params = builder.set("event_type", "login").set("user_id", 123).build()

        assert isinstance(params, AuditEventParams)
        assert params.event_type == "login"
        assert params.user_id == 123

    def test_method_chaining(self):
        """Test fluent interface with method chaining."""
        builder = ParameterBuilder(DataProcessingParams)
        params = (
            builder.set("data_type", "temperature")
            .set("scale_factor", 2.0)
            .set_if(True, "offset", 5.0)
            .set_if(False, "validation_enabled", False)
            .build()
        )

        assert params.data_type == "temperature"
        assert params.scale_factor == 2.0
        assert params.offset == 5.0
        assert params.validation_enabled is True  # Default, not set by set_if


class TestGroupRelatedParams:
    """Test group_related_params function."""

    def test_group_single_group(self):
        """Test grouping parameters into a single group."""
        params = {
            "username": "testuser",
            "email": "test@example.com",
            "age": 25,
        }
        groups = {"user_info": ["username", "email"]}

        result = group_related_params(params, groups)

        assert "user_info" in result
        assert result["user_info"]["username"] == "testuser"
        assert result["user_info"]["email"] == "test@example.com"
        assert "age" not in result["user_info"]

    def test_group_multiple_groups(self):
        """Test grouping parameters into multiple groups."""
        params = {
            "username": "testuser",
            "password": "secret",
            "host": "localhost",
            "port": 5432,
        }
        groups = {
            "auth": ["username", "password"],
            "connection": ["host", "port"],
        }

        result = group_related_params(params, groups)

        assert "auth" in result
        assert "connection" in result
        assert result["auth"]["username"] == "testuser"
        assert result["connection"]["host"] == "localhost"

    def test_group_missing_params(self):
        """Test grouping when some parameters are missing."""
        params = {"username": "testuser"}
        groups = {"user_info": ["username", "email", "phone"]}

        result = group_related_params(params, groups)

        assert "user_info" in result
        assert result["user_info"]["username"] == "testuser"
        assert "email" not in result["user_info"]
        assert "phone" not in result["user_info"]

    def test_group_empty_params(self):
        """Test grouping with empty parameters."""
        params = {}
        groups = {"user_info": ["username", "email"]}

        result = group_related_params(params, groups)

        assert "user_info" in result
        assert result["user_info"] == {}
