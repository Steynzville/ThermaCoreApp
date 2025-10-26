"""Utilities for decomposing large functions into smaller ones.

This module provides patterns and utilities to help break down functions with
too many statements (PLR0915) into smaller, focused functions with single
responsibilities.
"""

from collections.abc import Callable
from typing import Any, TypeVar

T = TypeVar("T")


class FunctionDecomposer:
    """Utility class for decomposing large functions."""

    @staticmethod
    def extract_initialization(
        config: dict[str, Any],
        initializers: list[Callable[[dict[str, Any]], None]],
    ) -> None:
        """Extract initialization logic into separate functions.

        Args:
            config: Configuration dictionary
            initializers: List of initialization functions to call
        """
        for initializer in initializers:
            initializer(config)

    @staticmethod
    def extract_registration(
        registry: Any,
        items: list[tuple[str, Any]],
        register_fn: Callable[[Any, str, Any], bool],
    ) -> tuple[int, int]:
        """Extract registration logic into a reusable pattern.

        Args:
            registry: Object to register items with
            items: List of (name, item) tuples to register
            register_fn: Function to perform registration

        Returns:
            tuple: (successful_count, failed_count)
        """
        successful = 0
        failed = 0
        for name, item in items:
            if register_fn(registry, name, item):
                successful += 1
            else:
                failed += 1
        return successful, failed

    @staticmethod
    def extract_validation(
        data: dict[str, Any],
        validators: list[Callable[[dict[str, Any]], str | None]],
    ) -> list[str]:
        """Extract validation logic into separate validator functions.

        Args:
            data: Data to validate
            validators: List of validator functions, each returns error or None

        Returns:
            List of validation errors
        """
        errors = []
        for validator in validators:
            error = validator(data)
            if error:
                errors.append(error)
        return errors

    @staticmethod
    def extract_cleanup(
        resources: list[Any],
        cleanup_fn: Callable[[Any], None],
    ) -> list[str]:
        """Extract cleanup logic into a reusable pattern.

        Args:
            resources: List of resources to clean up
            cleanup_fn: Function to clean up each resource

        Returns:
            List of cleanup errors (if any)
        """
        errors = []
        for resource in resources:
            try:
                cleanup_fn(resource)
            except Exception as e:
                errors.append(str(e))
        return errors


class StepExecutor:
    """Execute a series of steps in sequence."""

    def __init__(self, name: str = ""):
        """Initialize step executor.

        Args:
            name: Name of the execution context
        """
        self.name = name
        self.steps: list[tuple[str, Callable[[], Any]]] = []
        self.results: dict[str, Any] = {}

    def add_step(self, step_name: str, step_fn: Callable[[], Any]) -> "StepExecutor":
        """Add a step to the execution sequence.

        Args:
            step_name: Name of the step
            step_fn: Function to execute for this step

        Returns:
            Self for method chaining
        """
        self.steps.append((step_name, step_fn))
        return self

    def execute(self, stop_on_error: bool = False) -> dict[str, Any]:
        """Execute all steps in sequence.

        Args:
            stop_on_error: Whether to stop execution on first error

        Returns:
            Dictionary of step results
        """
        for step_name, step_fn in self.steps:
            try:
                result = step_fn()
                self.results[step_name] = {"success": True, "result": result}
            except Exception as e:
                self.results[step_name] = {
                    "success": False,
                    "error": str(e),
                }
                if stop_on_error:
                    break
        return self.results

    def get_result(self, step_name: str) -> Any | None:
        """Get result of a specific step.

        Args:
            step_name: Name of the step

        Returns:
            Step result or None
        """
        step_result = self.results.get(step_name, {})
        return step_result.get("result")


def organize_into_phases(
    phases: list[tuple[str, list[Callable[[], Any]]]],
) -> dict[str, list[Any]]:
    """Organize a large function into distinct phases.

    Args:
        phases: List of (phase_name, [phase_functions]) tuples

    Returns:
        Dictionary mapping phase names to results
    """
    results = {}
    for phase_name, phase_functions in phases:
        phase_results = []
        for fn in phase_functions:
            try:
                result = fn()
                phase_results.append(result)
            except Exception as e:
                phase_results.append({"error": str(e)})
        results[phase_name] = phase_results
    return results


def extract_section(
    name: str,
    setup_fn: Callable[[], Any] | None = None,
    main_fn: Callable[[], Any] | None = None,
    cleanup_fn: Callable[[], None] | None = None,
) -> dict[str, Any]:
    """Extract a section of code with setup, main, and cleanup phases.

    Args:
        name: Name of the section
        setup_fn: Optional setup function
        main_fn: Optional main function
        cleanup_fn: Optional cleanup function

    Returns:
        Dictionary with section results
    """
    result = {"name": name, "success": True}

    try:
        if setup_fn:
            result["setup"] = setup_fn()

        if main_fn:
            result["main"] = main_fn()

        if cleanup_fn:
            cleanup_fn()

    except Exception as e:
        result["success"] = False
        result["error"] = str(e)

    return result
