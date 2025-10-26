"""Utilities for grouping function parameters.

This module provides patterns for reducing the number of function arguments
(PLR0913) by grouping related parameters into data classes and configuration
objects.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class AuditEventParams:
    """Parameters for audit event logging.

    This groups related audit logging parameters to reduce function signature
    complexity and make it easier to add new fields without breaking the API.
    """

    event_type: str
    user_id: int | None = None
    username: str | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    action: str | None = None
    details: dict[str, Any] | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    success: bool = True
    error_message: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for backwards compatibility.

        Returns:
            Dictionary representation of the parameters
        """
        return {
            "event_type": self.event_type,
            "user_id": self.user_id,
            "username": self.username,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "action": self.action,
            "details": self.details,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "success": self.success,
            "error_message": self.error_message,
        }


@dataclass
class ServiceInitConfig:
    """Configuration for service initialization.

    Groups service initialization parameters to simplify service setup.
    """

    app: Any
    required: bool = False
    timeout: int = 30
    retry_count: int = 3
    config_overrides: dict[str, Any] = field(default_factory=dict)

    def get_config(self, key: str, default: Any = None) -> Any:
        """Get configuration value with override support.

        Args:
            key: Configuration key
            default: Default value if not found

        Returns:
            Configuration value
        """
        return self.config_overrides.get(key, default)


@dataclass
class DataProcessingParams:
    """Parameters for data processing operations.

    Groups data processing parameters for cleaner function signatures.
    """

    data_type: str
    scale_factor: float = 1.0
    offset: float = 0.0
    validation_enabled: bool = True
    transformation_fn: Any | None = None
    error_handler: Any | None = None

    def apply_transform(self, value: float) -> float:
        """Apply scale and offset transformation.

        Args:
            value: Raw value to transform

        Returns:
            Transformed value
        """
        return (value * self.scale_factor) + self.offset


@dataclass
class CertificateLoadConfig:
    """Configuration for certificate loading operations.

    Groups certificate-related parameters to simplify security functions.
    """

    is_production: bool
    cert_path: str | None = None
    key_path: str | None = None
    trust_path: str | None = None
    validate_dates: bool = True
    require_trust: bool = True

    def get_cert_paths(self) -> dict[str, str | None]:
        """Get all certificate paths as a dictionary.

        Returns:
            Dictionary of certificate paths
        """
        return {
            "cert": self.cert_path,
            "key": self.key_path,
            "trust": self.trust_path,
        }


class ParameterBuilder:
    """Builder pattern for constructing parameter objects.

    Provides a fluent interface for building complex parameter objects
    without exposing constructor complexity.
    """

    def __init__(self, param_class: type):
        """Initialize builder with parameter class.

        Args:
            param_class: The dataclass to build
        """
        self.param_class = param_class
        self.params: dict[str, Any] = {}

    def set(self, key: str, value: Any) -> "ParameterBuilder":
        """Set a parameter value.

        Args:
            key: Parameter name
            value: Parameter value

        Returns:
            Self for method chaining
        """
        self.params[key] = value
        return self

    def set_if(self, condition: bool, key: str, value: Any) -> "ParameterBuilder":
        """Conditionally set a parameter value.

        Args:
            condition: Whether to set the parameter
            key: Parameter name
            value: Parameter value

        Returns:
            Self for method chaining
        """
        if condition:
            self.params[key] = value
        return self

    def build(self) -> Any:
        """Build the parameter object.

        Returns:
            Instance of the parameter class
        """
        return self.param_class(**self.params)


def group_related_params(
    params: dict[str, Any],
    groups: dict[str, list[str]],
) -> dict[str, dict[str, Any]]:
    """Group related parameters from a flat dictionary.

    Args:
        params: Flat dictionary of parameters
        groups: Dictionary mapping group names to parameter lists

    Returns:
        Dictionary of grouped parameters
    """
    grouped = {}
    for group_name, param_names in groups.items():
        grouped[group_name] = {
            name: params.get(name) for name in param_names if name in params
        }
    return grouped
