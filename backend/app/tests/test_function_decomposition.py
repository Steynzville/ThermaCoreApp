"""Tests for function decomposition utilities."""

from app.function_decomposition import (
    FunctionDecomposer,
    StepExecutor,
    extract_section,
    organize_into_phases,
)


class TestFunctionDecomposer:
    """Test FunctionDecomposer utility class."""

    def test_extract_initialization(self):
        """Test extraction of initialization logic."""
        config = {"initialized": False}

        def init1(cfg):
            cfg["step1"] = True

        def init2(cfg):
            cfg["step2"] = True

        FunctionDecomposer.extract_initialization(config, [init1, init2])

        assert config["step1"] is True
        assert config["step2"] is True

    def test_extract_registration_success(self):
        """Test registration pattern with successful registrations."""
        registry = {}

        def register_fn(reg, name, item):
            reg[name] = item
            return True

        items = [("item1", "value1"), ("item2", "value2")]
        successful, failed = FunctionDecomposer.extract_registration(
            registry,
            items,
            register_fn,
        )

        assert successful == 2
        assert failed == 0
        assert registry["item1"] == "value1"

    def test_extract_registration_with_failures(self):
        """Test registration pattern with some failures."""
        registry = {}

        def register_fn(reg, name, item):
            if name == "fail":
                return False
            reg[name] = item
            return True

        items = [("item1", "value1"), ("fail", "value2"), ("item3", "value3")]
        successful, failed = FunctionDecomposer.extract_registration(
            registry,
            items,
            register_fn,
        )

        assert successful == 2
        assert failed == 1

    def test_extract_validation_no_errors(self):
        """Test validation extraction with valid data."""
        data = {"value": 10}

        def validator1(d):
            return None if d.get("value", 0) > 0 else "Value must be positive"

        def validator2(d):
            return None if d.get("value", 0) < 100 else "Value too large"

        errors = FunctionDecomposer.extract_validation(data, [validator1, validator2])

        assert errors == []

    def test_extract_validation_with_errors(self):
        """Test validation extraction with invalid data."""
        data = {"value": -5}

        def validator1(d):
            return None if d.get("value", 0) > 0 else "Value must be positive"

        def validator2(d):
            return None if "name" in d else "Name is required"

        errors = FunctionDecomposer.extract_validation(data, [validator1, validator2])

        assert len(errors) == 2
        assert "Value must be positive" in errors
        assert "Name is required" in errors

    def test_extract_cleanup_success(self):
        """Test cleanup pattern with successful cleanup."""
        resources = [{"closed": False}, {"closed": False}]

        def cleanup_fn(resource):
            resource["closed"] = True

        errors = FunctionDecomposer.extract_cleanup(resources, cleanup_fn)

        assert errors == []
        assert all(r["closed"] for r in resources)

    def test_extract_cleanup_with_errors(self):
        """Test cleanup pattern with some failures."""

        def cleanup_fn(resource):
            if resource == "fail":
                raise ValueError("Cleanup failed")

        resources = ["ok", "fail", "ok"]
        errors = FunctionDecomposer.extract_cleanup(resources, cleanup_fn)

        assert len(errors) == 1
        assert "Cleanup failed" in errors[0]


class TestStepExecutor:
    """Test StepExecutor class."""

    def test_initialization(self):
        """Test StepExecutor initialization."""
        executor = StepExecutor("test")

        assert executor.name == "test"
        assert executor.steps == []
        assert executor.results == {}

    def test_add_step_returns_self(self):
        """Test that add_step returns self for chaining."""
        executor = StepExecutor()
        result = executor.add_step("step1", lambda: True)

        assert result is executor

    def test_execute_success(self):
        """Test executing steps successfully."""
        executor = StepExecutor()
        executor.add_step("step1", lambda: "result1")
        executor.add_step("step2", lambda: "result2")

        results = executor.execute()

        assert results["step1"]["success"] is True
        assert results["step1"]["result"] == "result1"
        assert results["step2"]["success"] is True
        assert results["step2"]["result"] == "result2"

    def test_execute_with_error(self):
        """Test executing steps with an error."""
        executor = StepExecutor()
        executor.add_step("step1", lambda: "result1")
        executor.add_step("step2", lambda: 1 / 0)  # Division by zero
        executor.add_step("step3", lambda: "result3")

        results = executor.execute(stop_on_error=False)

        assert results["step1"]["success"] is True
        assert results["step2"]["success"] is False
        assert "error" in results["step2"]
        assert results["step3"]["success"] is True

    def test_execute_stop_on_error(self):
        """Test executing steps with stop_on_error."""
        executor = StepExecutor()
        executor.add_step("step1", lambda: "result1")
        executor.add_step("step2", lambda: 1 / 0)
        executor.add_step("step3", lambda: "result3")

        results = executor.execute(stop_on_error=True)

        assert results["step1"]["success"] is True
        assert results["step2"]["success"] is False
        assert "step3" not in results

    def test_get_result(self):
        """Test getting result of a specific step."""
        executor = StepExecutor()
        executor.add_step("step1", lambda: "result1")
        executor.execute()

        result = executor.get_result("step1")

        assert result == "result1"

    def test_get_result_nonexistent(self):
        """Test getting result of non-existent step."""
        executor = StepExecutor()
        result = executor.get_result("nonexistent")

        assert result is None


class TestOrganizeIntoPhases:
    """Test organize_into_phases function."""

    def test_organize_phases_success(self):
        """Test organizing functions into phases."""
        phases = [
            ("phase1", [lambda: "result1", lambda: "result2"]),
            ("phase2", [lambda: "result3"]),
        ]

        results = organize_into_phases(phases)

        assert "phase1" in results
        assert "phase2" in results
        assert results["phase1"] == ["result1", "result2"]
        assert results["phase2"] == ["result3"]

    def test_organize_phases_with_errors(self):
        """Test organizing phases with errors."""
        phases = [
            ("phase1", [lambda: "result1", lambda: 1 / 0]),
        ]

        results = organize_into_phases(phases)

        assert results["phase1"][0] == "result1"
        assert "error" in results["phase1"][1]


class TestExtractSection:
    """Test extract_section function."""

    def test_extract_section_all_phases(self):
        """Test extracting section with all phases."""
        result = extract_section(
            "test_section",
            setup_fn=lambda: "setup_done",
            main_fn=lambda: "main_done",
            cleanup_fn=lambda: None,
        )

        assert result["name"] == "test_section"
        assert result["success"] is True
        assert result["setup"] == "setup_done"
        assert result["main"] == "main_done"

    def test_extract_section_only_main(self):
        """Test extracting section with only main phase."""
        result = extract_section("test_section", main_fn=lambda: "main_result")

        assert result["name"] == "test_section"
        assert result["success"] is True
        assert result["main"] == "main_result"

    def test_extract_section_with_error(self):
        """Test extracting section with error."""
        result = extract_section(
            "test_section",
            setup_fn=lambda: "setup_done",
            main_fn=lambda: 1 / 0,
        )

        assert result["name"] == "test_section"
        assert result["success"] is False
        assert "error" in result

    def test_extract_section_no_functions(self):
        """Test extracting section with no functions."""
        result = extract_section("test_section")

        assert result["name"] == "test_section"
        assert result["success"] is True
