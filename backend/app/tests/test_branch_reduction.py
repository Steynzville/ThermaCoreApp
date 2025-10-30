"""Tests for branch reduction utilities."""

import pytest

from app.branch_reduction import (
    BranchReducer,
    create_status_checker,
    create_validator_chain,
)


class TestBranchReducer:
    """Test BranchReducer utility class."""

    def test_lookup_pattern_success(self):
        """Test lookup pattern with matching key."""

        def handler1():
            return "result1"

        def handler2():
            return "result2"

        lookup = {"key1": handler1, "key2": handler2}

        result = BranchReducer.lookup_pattern("key1", lookup)

        assert result == "result1"

    def test_lookup_pattern_with_default(self):
        """Test lookup pattern with default handler."""

        def default_handler():
            return "default"

        lookup = {"key1": lambda: "result1"}

        result = BranchReducer.lookup_pattern("unknown", lookup, default=default_handler)

        assert result == "default"

    def test_lookup_pattern_no_handler_raises(self):
        """Test lookup pattern raises when no handler found."""
        lookup = {"key1": lambda: "result1"}

        with pytest.raises(KeyError, match="No handler found"):
            BranchReducer.lookup_pattern("unknown", lookup)

    def test_lookup_pattern_with_args(self):
        """Test lookup pattern with arguments."""

        def handler(x, y):
            return x + y

        lookup = {"add": handler}

        result = BranchReducer.lookup_pattern("add", lookup, None, 5, 3)

        assert result == 8

    def test_lookup_pattern_with_kwargs(self):
        """Test lookup pattern with keyword arguments."""

        def handler(name, age=0):
            return f"{name}-{age}"

        lookup = {"format": handler}

        result = BranchReducer.lookup_pattern("format", lookup, None, name="John", age=30)

        assert result == "John-30"

    def test_guard_clause_pattern_first_match(self):
        """Test guard clause pattern returns first match."""
        conditions = [
            (lambda: False, "first"),
            (lambda: True, "second"),
            (lambda: True, "third"),
        ]

        result = BranchReducer.guard_clause_pattern(conditions)

        assert result == "second"

    def test_guard_clause_pattern_no_match(self):
        """Test guard clause pattern with no match returns default."""
        conditions = [
            (lambda: False, "first"),
            (lambda: False, "second"),
        ]

        result = BranchReducer.guard_clause_pattern(conditions, default="default")

        assert result == "default"

    def test_guard_clause_pattern_callable_result(self):
        """Test guard clause pattern with callable result."""

        def get_result():
            return "computed"

        conditions = [(lambda: True, get_result)]

        result = BranchReducer.guard_clause_pattern(conditions)

        assert result == "computed"

    def test_guard_clause_pattern_non_callable_result(self):
        """Test guard clause pattern with non-callable result."""
        conditions = [(lambda: True, "direct_value")]

        result = BranchReducer.guard_clause_pattern(conditions)

        assert result == "direct_value"

    def test_chain_of_responsibility_stop_on_first(self):
        """Test chain of responsibility stops on first success."""

        def handler1(data):
            return None

        def handler2(data):
            return "result2"

        def handler3(data):
            return "result3"

        results = BranchReducer.chain_of_responsibility(
            [handler1, handler2, handler3], "data", stop_on_first=True,
        )

        assert len(results) == 1
        assert results[0] == "result2"

    def test_chain_of_responsibility_all_handlers(self):
        """Test chain of responsibility executes all handlers."""

        def handler1(data):
            return "result1"

        def handler2(data):
            return "result2"

        results = BranchReducer.chain_of_responsibility(
            [handler1, handler2], "data", stop_on_first=False,
        )

        assert len(results) == 2
        assert results == ["result1", "result2"]

    def test_chain_of_responsibility_with_exceptions(self):
        """Test chain of responsibility continues on exceptions."""

        def handler1(data):
            raise ValueError("Error")

        def handler2(data):
            return "result2"

        results = BranchReducer.chain_of_responsibility([handler1, handler2], "data")

        assert len(results) == 1
        assert results[0] == "result2"


class TestCreateStatusChecker:
    """Test create_status_checker function."""

    def test_create_status_checker_all_healthy(self):
        """Test status checker with all services healthy."""

        def check_service1():
            return "healthy", None

        def check_service2():
            return "healthy", None

        checks = {"service1": check_service1, "service2": check_service2}

        checker = create_status_checker(checks)
        results = checker()

        assert results["service1"]["status"] == "healthy"
        assert results["service1"]["error"] is None
        assert results["service2"]["status"] == "healthy"

    def test_create_status_checker_with_errors(self):
        """Test status checker with service errors."""

        def check_service1():
            return "unhealthy", "Connection failed"

        def check_service2():
            return "healthy", None

        checks = {"service1": check_service1, "service2": check_service2}

        checker = create_status_checker(checks)
        results = checker()

        assert results["service1"]["status"] == "unhealthy"
        assert results["service1"]["error"] == "Connection failed"
        assert results["service2"]["status"] == "healthy"

    def test_create_status_checker_with_exceptions(self):
        """Test status checker handles exceptions."""

        def check_service1():
            raise RuntimeError("Service crashed")

        checks = {"service1": check_service1}

        checker = create_status_checker(checks)
        results = checker()

        assert results["service1"]["status"] == "unavailable"
        assert "Service crashed" in results["service1"]["error"]


class TestCreateValidatorChain:
    """Test create_validator_chain function."""

    def test_create_validator_chain_all_valid(self):
        """Test validator chain with all validators passing."""

        def validator1(data):
            return True, None

        def validator2(data):
            return True, None

        validators = [("validator1", validator1), ("validator2", validator2)]

        validate_all = create_validator_chain(validators)
        is_valid, errors = validate_all({"data": "test"})

        assert is_valid is True
        assert errors == []

    def test_create_validator_chain_with_errors(self):
        """Test validator chain with validation errors."""

        def validator1(data):
            return False, "Error 1"

        def validator2(data):
            return False, "Error 2"

        validators = [("validator1", validator1), ("validator2", validator2)]

        validate_all = create_validator_chain(validators)
        is_valid, errors = validate_all({"data": "test"})

        assert is_valid is False
        assert len(errors) == 2
        assert "validator1: Error 1" in errors
        assert "validator2: Error 2" in errors

    def test_create_validator_chain_partial_errors(self):
        """Test validator chain with some validators failing."""

        def validator1(data):
            return True, None

        def validator2(data):
            return False, "Error 2"

        validators = [("validator1", validator1), ("validator2", validator2)]

        validate_all = create_validator_chain(validators)
        is_valid, errors = validate_all({"data": "test"})

        assert is_valid is False
        assert len(errors) == 1
        assert "validator2: Error 2" in errors

    def test_create_validator_chain_empty(self):
        """Test validator chain with no validators."""
        validators = []

        validate_all = create_validator_chain(validators)
        is_valid, errors = validate_all({"data": "test"})

        assert is_valid is True
        assert errors == []
