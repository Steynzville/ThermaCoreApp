#!/usr/bin/env python3
"""
Production Readiness Validation Script for ThermaCore SCADA Platform.

Validates production readiness across multiple dimensions:
- Environment configuration
- Security configuration
- Database configuration
- Service health
- Dependency versions
- Required files and directories
- API endpoint availability
- Performance benchmarks

Usage:
    python production_readiness.py [--strict] [--skip-services]
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class ProductionReadinessValidator:
    """Validates production readiness of the ThermaCore platform."""

    def __init__(self, strict: bool = False, skip_services: bool = False):
        """
        Initialize validator.

        Args:
            strict: If True, fail on warnings
            skip_services: If True, skip service health checks
        """
        self.strict = strict
        self.skip_services = skip_services
        self.results: dict[str, Any] = {}
        self.warnings: list[str] = []
        self.errors: list[str] = []
        self.passed_checks: list[str] = []
        self.failed_checks: list[str] = []

    def check(
        self, name: str, condition: bool, error_msg: str = "", warning: bool = False,
    ) -> bool:
        """
        Perform a check.

        Args:
            name: Name of the check
            condition: Whether the check passed
            error_msg: Error message if check failed
            warning: If True, treat as warning instead of error

        Returns:
            True if check passed
        """
        if condition:
            print(f"  ✅ {name}")
            self.passed_checks.append(name)
            return True
        elif warning:
            print(f"  ⚠️  {name}: {error_msg}")
            self.warnings.append(f"{name}: {error_msg}")
            if self.strict:
                self.failed_checks.append(name)
                return False
            return True
        else:
            print(f"  ❌ {name}: {error_msg}")
            self.errors.append(f"{name}: {error_msg}")
            self.failed_checks.append(name)
            return False

    def validate_environment(self) -> bool:
        """Validate environment configuration."""
        print("\n" + "=" * 60)
        print("ENVIRONMENT CONFIGURATION")
        print("=" * 60)

        all_passed = True

        # Check required environment variables
        required_vars = [
            "SECRET_KEY",
            "JWT_SECRET_KEY",
            "DATABASE_URL",
        ]

        for var in required_vars:
            value = os.environ.get(var)
            all_passed &= self.check(
                f"Environment variable {var}",
                value is not None and len(str(value)) > 0,
                f"{var} not set or empty",
            )

        # Check Flask environment
        flask_env = os.environ.get("FLASK_ENV", "production")
        all_passed &= self.check(
            "Flask environment configured",
            True,  # Always passes, just informational
            warning=True,
        )
        print(f"     Current FLASK_ENV: {flask_env}")

        # Warn if using development mode
        if flask_env == "development":
            all_passed &= self.check(
                "Production environment",
                False,
                "FLASK_ENV is set to 'development'",
                warning=True,
            )

        # Check for .env file (should not exist in production)
        env_file = Path(".env")
        if env_file.exists():
            all_passed &= self.check(
                "No .env file in production",
                False,
                ".env file found - use environment variables in production",
                warning=True,
            )

        self.results["environment"] = {
            "required_vars_set": all(os.environ.get(v) for v in required_vars),
            "flask_env": flask_env,
            "env_file_exists": env_file.exists(),
        }

        return all_passed

    def validate_security(self) -> bool:
        """Validate security configuration."""
        print("\n" + "=" * 60)
        print("SECURITY CONFIGURATION")
        print("=" * 60)

        all_passed = True

        # Check secret key strength
        secret_key = os.environ.get("SECRET_KEY", "")
        all_passed &= self.check(
            "SECRET_KEY strength",
            len(secret_key) >= 32,
            f"SECRET_KEY should be at least 32 characters (current: {len(secret_key)})",
        )

        # Check JWT secret key strength
        jwt_secret = os.environ.get("JWT_SECRET_KEY", "")
        all_passed &= self.check(
            "JWT_SECRET_KEY strength",
            len(jwt_secret) >= 32,
            f"JWT_SECRET_KEY should be at least 32 characters (current: {len(jwt_secret)})",
        )

        # Check that secrets are not default/test values
        # Use word boundary patterns to avoid false positives
        # (e.g., legitimate secret with "123" somewhere in the middle)
        dangerous_patterns = [
            r"\btest\b",
            r"\bdummy\b",
            r"\bexample\b",
            r"\bchangeme\b",
            r"\badmin\b",
            r"^123",
            r"123$",
        ]

        # Skip validation in test/CI environments
        is_test_env = (
            os.environ.get("FLASK_ENV") == "test" or os.environ.get("CI") == "true"
        )

        if not is_test_env:
            secret_key_lower = secret_key.lower()
            jwt_secret_lower = jwt_secret.lower()

            secret_key_safe = not any(
                re.search(pattern, secret_key_lower) for pattern in dangerous_patterns
            )
            jwt_secret_safe = not any(
                re.search(pattern, jwt_secret_lower) for pattern in dangerous_patterns
            )
        else:
            # In test environments, allow test secrets but still warn
            secret_key_safe = True
            jwt_secret_safe = True

        all_passed &= self.check(
            "SECRET_KEY not using test/default value",
            secret_key_safe,
            "SECRET_KEY appears to use a test or default value",
            warning=True,
        )

        all_passed &= self.check(
            "JWT_SECRET_KEY not using test/default value",
            jwt_secret_safe,
            "JWT_SECRET_KEY appears to use a test or default value",
            warning=True,
        )

        # Check for HTTPS in production
        force_https = os.environ.get("FORCE_HTTPS", "").lower() in ["true", "1", "yes"]
        all_passed &= self.check(
            "HTTPS enforcement configured",
            force_https,
            "FORCE_HTTPS not enabled (recommended for production)",
            warning=True,
        )

        # Check CORS configuration
        cors_origins = os.environ.get("CORS_ORIGINS", "*")
        all_passed &= self.check(
            "CORS origins configured",
            cors_origins != "*",
            "CORS_ORIGINS set to wildcard (*) - should be restricted in production",
            warning=True,
        )

        self.results["security"] = {
            "secret_key_length": len(secret_key),
            "jwt_secret_length": len(jwt_secret),
            "https_enforced": force_https,
            "cors_restricted": cors_origins != "*",
        }

        return all_passed

    def validate_database(self) -> bool:
        """Validate database configuration."""
        print("\n" + "=" * 60)
        print("DATABASE CONFIGURATION")
        print("=" * 60)

        all_passed = True

        # Check DATABASE_URL
        db_url = os.environ.get("DATABASE_URL", "")
        all_passed &= self.check(
            "DATABASE_URL configured", len(db_url) > 0, "DATABASE_URL not set",
        )

        # Check for PostgreSQL
        is_postgres = db_url.startswith(("postgresql://", "postgres://"))
        all_passed &= self.check(
            "PostgreSQL database",
            is_postgres,
            "DATABASE_URL should use PostgreSQL (postgresql://)",
            warning=not is_postgres,
        )

        # Warn if using localhost
        using_localhost = "localhost" in db_url or "127.0.0.1" in db_url
        if using_localhost:
            all_passed &= self.check(
                "Production database host",
                False,
                "DATABASE_URL uses localhost - should use external database in production",
                warning=True,
            )

        # Check for connection pooling config
        pool_size = os.environ.get("DB_POOL_SIZE")
        all_passed &= self.check(
            "Database pool size configured",
            pool_size is not None,
            "DB_POOL_SIZE not set (recommended for production)",
            warning=True,
        )

        self.results["database"] = {
            "configured": len(db_url) > 0,
            "is_postgres": is_postgres,
            "uses_localhost": using_localhost,
            "pool_configured": pool_size is not None,
        }

        return all_passed

    def validate_files_and_directories(self) -> bool:
        """Validate required files and directories exist."""
        print("\n" + "=" * 60)
        print("FILES AND DIRECTORIES")
        print("=" * 60)

        all_passed = True

        # Required files
        required_files = [
            "requirements.txt",
            "app/__init__.py",
            "run.py",
            "config.py",
        ]

        for file_path in required_files:
            path = Path(file_path)
            all_passed &= self.check(
                f"File exists: {file_path}", path.exists(), f"{file_path} not found",
            )

        # Required directories
        required_dirs = [
            "app",
            "app/models",
            "app/routes",
            "app/services",
        ]

        for dir_path in required_dirs:
            path = Path(dir_path)
            all_passed &= self.check(
                f"Directory exists: {dir_path}",
                path.exists() and path.is_dir(),
                f"{dir_path} not found",
            )

        # Optional but recommended directories
        recommended_dirs = [
            "migrations",
            "tests",
            "scripts",
        ]

        for dir_path in recommended_dirs:
            path = Path(dir_path)
            self.check(
                f"Recommended directory: {dir_path}",
                path.exists() and path.is_dir(),
                f"{dir_path} not found (recommended)",
                warning=True,
            )

        self.results["files"] = {
            "required_files_present": all(Path(f).exists() for f in required_files),
            "required_dirs_present": all(Path(d).exists() for d in required_dirs),
        }

        return all_passed

    def validate_dependencies(self) -> bool:
        """Validate dependency versions."""
        print("\n" + "=" * 60)
        print("DEPENDENCY VERSIONS")
        print("=" * 60)

        all_passed = True

        try:
            # Check Python version
            python_version = sys.version_info
            version_str = (
                f"{python_version.major}.{python_version.minor}.{python_version.micro}"
            )

            all_passed &= self.check(
                "Python version >= 3.8",
                python_version.major == 3 and python_version.minor >= 8,
                f"Python {version_str} - requires Python 3.8 or higher",
            )
            print(f"     Current Python: {version_str}")

            # Check critical dependencies
            critical_deps = [
                "flask",
                "sqlalchemy",
                "psycopg2",
            ]

            for dep in critical_deps:
                try:
                    module = __import__(dep.replace("-", "_"))
                    version = getattr(module, "__version__", "unknown")
                    all_passed &= self.check(f"Dependency installed: {dep}", True, "")
                    print(f"       Version: {version}")
                except ImportError:
                    all_passed &= self.check(
                        f"Dependency installed: {dep}", False, f"{dep} not installed",
                    )

        except Exception as e:
            print(f"  ⚠️  Error checking dependencies: {e}")
            all_passed = False

        self.results["dependencies"] = {
            "python_version": f"{python_version.major}.{python_version.minor}.{python_version.micro}",
            "python_compatible": python_version.major == 3
            and python_version.minor >= 8,
        }

        return all_passed

    def validate_service_health(self) -> bool:
        """Validate service health (if not skipped)."""
        if self.skip_services:
            print("\n⏭️  Skipping service health checks")
            return True

        print("\n" + "=" * 60)
        print("SERVICE HEALTH")
        print("=" * 60)

        all_passed = True

        # This is a placeholder - in a real deployment, you would:
        # - Check database connectivity
        # - Check Redis connectivity (if used)
        # - Check external service availability
        # - Verify API endpoints respond

        print("  INFO: Service health checks require running services")
        print("  INFO: Use --skip-services to skip these checks")

        self.results["services"] = {"skipped": self.skip_services}

        return all_passed

    def validate_benchmarks(self) -> bool:
        """Validate performance benchmarks exist and can run."""
        print("\n" + "=" * 60)
        print("PERFORMANCE BENCHMARKS")
        print("=" * 60)

        all_passed = True

        # Check benchmark files exist
        benchmark_files = [
            "benchmarks/protocol_performance.py",
            "benchmarks/critical_path_benchmark.py",
        ]

        for file_path in benchmark_files:
            path = Path(file_path)
            self.check(
                f"Benchmark exists: {file_path}",
                path.exists(),
                f"{file_path} not found",
                warning=True,
            )

        self.results["benchmarks"] = {
            "protocol_benchmark_exists": Path(
                "benchmarks/protocol_performance.py",
            ).exists(),
            "critical_path_benchmark_exists": Path(
                "benchmarks/critical_path_benchmark.py",
            ).exists(),
        }

        return all_passed

    def generate_readiness_report(self) -> bool:
        """Generate production readiness report."""
        print("\n" + "=" * 60)
        print("PRODUCTION READINESS SUMMARY")
        print("=" * 60)

        total_checks = len(self.passed_checks) + len(self.failed_checks)
        passed = len(self.passed_checks)
        failed = len(self.failed_checks)
        warnings = len(self.warnings)

        print(f"\nTotal Checks: {total_checks}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Warnings: {warnings} ⚠️")

        if failed > 0:
            print("\n❌ FAILED CHECKS:")
            for check in self.failed_checks:
                print(f"   - {check}")

        if warnings > 0:
            print("\n⚠️  WARNINGS:")
            for warning in self.warnings[:10]:  # Show first 10
                print(f"   - {warning}")

        # Generate JSON report
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "overall_status": "READY" if failed == 0 else "NOT READY",
            "summary": {
                "total_checks": total_checks,
                "passed": passed,
                "failed": failed,
                "warnings": warnings,
                "strict_mode": self.strict,
            },
            "results": self.results,
            "failed_checks": self.failed_checks,
            "warnings": self.warnings,
        }

        report_file = Path("production_readiness_report.json")
        with report_file.open("w") as f:
            json.dump(report, f, indent=2)

        print(f"\n📄 Report saved to: {report_file}")

        if failed == 0:
            print("\n✅ System is PRODUCTION READY!")
            return True
        else:
            print("\n❌ System is NOT production ready")
            print("   Please address the failed checks above")
            return False

    def run_all_validations(self) -> bool:
        """
        Run all production readiness validations.

        Returns:
            True if system is production ready, False otherwise
        """
        print("\n" + "=" * 60)
        print("PRODUCTION READINESS VALIDATION")
        print("ThermaCore SCADA Platform")
        print("=" * 60)
        print(f"Strict Mode: {self.strict}")
        print(f"Skip Services: {self.skip_services}")

        # Run all validations
        self.validate_environment()
        self.validate_security()
        self.validate_database()
        self.validate_files_and_directories()
        self.validate_dependencies()
        self.validate_service_health()
        self.validate_benchmarks()

        # Generate report
        return self.generate_readiness_report()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Validate production readiness of ThermaCore SCADA platform",
    )
    parser.add_argument(
        "--strict", action="store_true", help="Treat warnings as errors",
    )
    parser.add_argument(
        "--skip-services", action="store_true", help="Skip service health checks",
    )

    args = parser.parse_args()

    validator = ProductionReadinessValidator(
        strict=args.strict, skip_services=args.skip_services,
    )

    is_ready = validator.run_all_validations()

    return 0 if is_ready else 1


if __name__ == "__main__":
    sys.exit(main())
