"""Utilities for reducing conditional branches in functions.

This module provides patterns and utilities to help reduce the number of
conditional branches (if/elif/else) in functions, addressing PLR0912 violations.
Common patterns include lookup tables, strategy pattern, and guard clauses.
"""

from collections.abc import Callable
from typing import Any


class BranchReducer:
    """Utility class for reducing conditional branches using various patterns."""

    @staticmethod
    def lookup_pattern(
        key: Any,
        lookup_table: dict[Any, Callable],
        default: Callable | None = None,
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        """Execute a function from a lookup table based on a key.

        This pattern replaces multiple if/elif statements with a dictionary lookup.

        Args:
            key: The key to look up in the table
            lookup_table: Dictionary mapping keys to callable functions
            default: Optional default function if key is not found
            *args: Positional arguments to pass to the function
            **kwargs: Keyword arguments to pass to the function

        Returns:
            Result of executing the selected function

        Raises:
            KeyError: If key is not found and no default is provided
        """
        handler = lookup_table.get(key, default)
        if handler is None:
            raise KeyError(f"No handler found for key: {key}")
        return handler(*args, **kwargs)

    @staticmethod
    def guard_clause_pattern(
        conditions: list[tuple[Callable[[], bool], Any]],
        default: Any = None,
    ) -> Any:
        """Execute guard clauses and return first matching result.

        This pattern uses early returns to reduce nesting and branching.

        Args:
            conditions: List of (condition_fn, result) tuples
            default: Default value if no condition matches

        Returns:
            First matching result or default
        """
        for condition, result in conditions:
            if condition():
                return result() if callable(result) else result
        return default

    @staticmethod
    def chain_of_responsibility(
        handlers: list[Callable],
        data: Any,
        stop_on_first: bool = True,
    ) -> list[Any]:
        """Execute handlers in a chain until one handles the request.

        Args:
            handlers: List of handler functions
            data: Data to pass to handlers
            stop_on_first: Stop after first successful handler

        Returns:
            List of results from handlers
        """
        results = []
        for handler in handlers:
            try:
                result = handler(data)
                if result is not None:
                    results.append(result)
                    if stop_on_first:
                        break
            except Exception:
                continue
        return results


def create_status_checker(
    status_checks: dict[str, Callable[[], tuple[str, str | None]]],
) -> Callable[[], dict[str, Any]]:
    """Create a status checker function from a dictionary of check functions.

    This helps reduce branches in health check functions by organizing
    checks into a structured format.

    Args:
        status_checks: Dictionary mapping service names to check functions
                      Each function should return (status, error_message)

    Returns:
        Function that executes all checks and returns results
    """

    def check_all_status() -> dict[str, Any]:
        results = {}
        for service_name, check_fn in status_checks.items():
            try:
                status, error = check_fn()
                results[service_name] = {
                    "status": status,
                    "error": error,
                }
            except Exception as e:
                results[service_name] = {
                    "status": "unavailable",
                    "error": str(e),
                }
        return results

    return check_all_status


def create_validator_chain(
    validators: list[tuple[str, Callable[[Any], tuple[bool, str | None]]]],
) -> Callable[[Any], tuple[bool, list[str]]]:
    """Create a validation chain from a list of validators.

    This pattern reduces branches in validation logic by organizing
    validators into a chain.

    Args:
        validators: List of (name, validator_fn) tuples
                   Each validator returns (is_valid, error_message)

    Returns:
        Function that executes all validators and returns results
    """

    def validate_all(data: Any) -> tuple[bool, list[str]]:
        errors = []
        for name, validator in validators:
            is_valid, error = validator(data)
            if not is_valid and error:
                errors.append(f"{name}: {error}")
        return len(errors) == 0, errors

    return validate_all
