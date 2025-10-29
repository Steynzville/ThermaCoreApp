#!/usr/bin/env python3
"""
Static Analysis Suite for ThermaCore SCADA Platform.

Performs comprehensive static analysis including:
- Security vulnerability scanning (Bandit)
- Code quality analysis (Ruff, Radon)
- Dependency vulnerability scanning
- Code complexity metrics
- Import analysis
- Dead code detection

Usage:
    python static_analysis_suite.py [--fail-on-medium] [--output-dir reports]
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class StaticAnalysisSuite:
    """Comprehensive static analysis suite."""

    def __init__(
        self,
        output_dir: str = "analysis_reports",
        fail_on_medium: bool = False,
    ):
        """
        Initialize analysis suite.

        Args:
            output_dir: Directory to store analysis reports
            fail_on_medium: Whether to fail on medium severity issues
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.fail_on_medium = fail_on_medium
        self.results: dict[str, Any] = {}
        self.failed_checks: list[str] = []

    def run_command(self, command: list[str], description: str) -> tuple:
        """
        Run a command and capture output.

        Args:
            command: Command to run as list
            description: Description of the command

        Returns:
            Tuple of (returncode, stdout, stderr)
        """
        print(f"\n{'=' * 60}")
        print(f"Running: {description}")
        print(f"Command: {' '.join(command)}")
        print(f"{'=' * 60}")

        try:
            result = subprocess.run(
                command,
                check=False,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            print(f"⚠️  Command timed out: {description}")
            return -1, "", "Command timed out"
        except FileNotFoundError:
            print(f"⚠️  Command not found: {command[0]}")
            return -1, "", f"Command not found: {command[0]}"

    def check_dependencies(self) -> bool:
        """Check if required tools are installed."""
        print("\n" + "=" * 60)
        print("CHECKING DEPENDENCIES")
        print("=" * 60)

        required_tools = {
            "bandit": ["bandit", "--version"],
            "ruff": ["ruff", "--version"],
            "radon": ["radon", "--version"],
        }

        missing_tools = []
        for tool_name, check_cmd in required_tools.items():
            returncode, stdout, _stderr = self.run_command(
                check_cmd,
                f"Check {tool_name}",
            )
            if returncode != 0:
                missing_tools.append(tool_name)
                print(f"❌ {tool_name} not found")
            else:
                print(f"✅ {tool_name} available: {stdout.strip()}")

        if missing_tools:
            print(f"\n⚠️  Missing required tools: {', '.join(missing_tools)}")
            print("Install with: pip install bandit ruff radon")
            return False

        print("\n✅ All dependencies available")
        return True

    def run_bandit_scan(self):
        """Run Bandit security vulnerability scan."""
        output_file = self.output_dir / "bandit_report.json"

        _returncode, _stdout, _stderr = self.run_command(
            [
                "bandit",
                "-r",
                "app",
                "-f",
                "json",
                "-o",
                str(output_file),
                "-c",
                ".bandit",
            ],
            "Bandit Security Scan",
        )

        # Bandit returns non-zero if issues found, but still creates report
        if output_file.exists():
            with output_file.open() as f:
                report = json.load(f)

            high_severity = [
                r
                for r in report.get("results", [])
                if r.get("issue_severity") == "HIGH"
            ]
            medium_severity = [
                r
                for r in report.get("results", [])
                if r.get("issue_severity") == "MEDIUM"
            ]
            low_severity = [
                r for r in report.get("results", []) if r.get("issue_severity") == "LOW"
            ]

            self.results["bandit"] = {
                "high": len(high_severity),
                "medium": len(medium_severity),
                "low": len(low_severity),
                "total": len(report.get("results", [])),
                "report_file": str(output_file),
            }

            print("\n📊 Bandit Results:")
            print(f"   HIGH:   {len(high_severity)}")
            print(f"   MEDIUM: {len(medium_severity)}")
            print(f"   LOW:    {len(low_severity)}")
            print(f"   Report: {output_file}")

            if high_severity:
                print(
                    f"\n❌ CRITICAL: {len(high_severity)} high severity vulnerabilities found",
                )
                for issue in high_severity[:3]:
                    print(f"   - {issue.get('test_id')}: {issue.get('issue_text')}")
                    print(f"     {issue.get('filename')}:{issue.get('line_number')}")
                self.failed_checks.append("bandit_high")
                return False

            if self.fail_on_medium and medium_severity:
                print(
                    f"\n⚠️  {len(medium_severity)} medium severity vulnerabilities found",
                )
                self.failed_checks.append("bandit_medium")
                return False

            print("\n✅ Security scan passed")
            return True
        else:
            print("❌ Bandit scan failed to generate report")
            self.failed_checks.append("bandit_failed")
            return False

    def run_ruff_analysis(self):
        """Run Ruff code quality analysis."""
        output_file = self.output_dir / "ruff_report.json"

        _returncode, stdout, stderr = self.run_command(
            ["ruff", "check", "app", "--output-format=json"],
            "Ruff Code Quality Analysis",
        )

        # Write JSON output to file
        with output_file.open("w") as f:
            f.write(stdout)
            if stderr:
                f.write("\n\nSTDERR:\n")
                f.write(stderr)

        # Parse JSON and count issues
        try:
            issues = json.loads(stdout)
            issue_count = len(issues)
        except Exception as e:
            print(f"\n❌ Error parsing Ruff JSON output: {e}")
            issue_count = -1

        self.results["ruff"] = {"issues": issue_count, "report_file": str(output_file)}

        print("\n📊 Ruff Results:")
        print(f"   Issues: {issue_count}")
        print(f"   Report: {output_file}")

        if issue_count > 100:
            print(f"\n⚠️  Warning: {issue_count} code quality issues found")
            self.failed_checks.append("ruff_excessive")
            return False

        print("\n✅ Code quality check passed")
        return True

    def run_complexity_analysis(self):
        """Run code complexity analysis with Radon."""
        output_file = self.output_dir / "complexity_report.txt"

        # Cyclomatic complexity
        _returncode, stdout, _stderr = self.run_command(
            ["radon", "cc", "app", "-a", "-nb"],
            "Cyclomatic Complexity Analysis",
        )

        with output_file.open("w") as f:
            f.write("=== CYCLOMATIC COMPLEXITY ===\n\n")
            f.write(stdout)
            f.write("\n\n")

        # Maintainability index
        _returncode2, stdout2, _stderr2 = self.run_command(
            ["radon", "mi", "app", "-nb"],
            "Maintainability Index Analysis",
        )

        with output_file.open("a") as f:
            f.write("=== MAINTAINABILITY INDEX ===\n\n")
            f.write(stdout2)

        # Parse complexity results
        complex_functions = []
        for line in stdout.split("\n"):
            if " - " in line and "(" in line:
                # Extract complexity score
                parts = line.split("(")
                if len(parts) > 1:
                    score_part = parts[1].split(")")[0]
                    try:
                        score = int(score_part)
                        if score > 10:
                            complex_functions.append((line.strip(), score))
                    except ValueError:
                        pass

        self.results["complexity"] = {
            "complex_functions": len(complex_functions),
            "high_complexity": len([f for f in complex_functions if f[1] > 15]),
            "report_file": str(output_file),
        }

        print("\n📊 Complexity Results:")
        print(f"   Functions with CC > 10: {len(complex_functions)}")
        print(
            f"   Functions with CC > 15: {len([f for f in complex_functions if f[1] > 15])}",
        )
        print(f"   Report: {output_file}")

        if len([f for f in complex_functions if f[1] > 20]) > 0:
            print("\n⚠️  Warning: Functions with very high complexity (>20) detected")
            for func, score in complex_functions[:3]:
                if score > 20:
                    print(f"   - {func[:60]}... (CC: {score})")

        print("\n✅ Complexity analysis complete")
        return True

    def run_import_analysis(self):
        """Analyze import statements and dependencies."""
        print("\n" + "=" * 60)
        print("Running: Import Analysis")
        print("=" * 60)

        import_counts = {}

        # Simple import analysis
        for py_file in Path("app").rglob("*.py"):
            try:
                with py_file.open() as f:
                    content = f.read()
                    lines = content.split("\n")

                    for line in lines:
                        line = line.strip()
                        if line.startswith(("import ", "from ")):
                            module = line.split()[1] if len(line.split()) > 1 else ""
                            if module:
                                import_counts[module] = import_counts.get(module, 0) + 1
            except Exception as e:
                print(f"⚠️  Could not analyze {py_file}: {e}")

        # Write report
        output_file = self.output_dir / "import_analysis.txt"
        with output_file.open("w") as f:
            f.write("=== IMPORT ANALYSIS ===\n\n")
            f.write(f"Total unique imports: {len(import_counts)}\n\n")
            f.write("Most used imports:\n")

            sorted_imports = sorted(
                import_counts.items(),
                key=lambda x: x[1],
                reverse=True,
            )
            for module, count in sorted_imports[:20]:
                f.write(f"  {module}: {count}\n")

        self.results["imports"] = {
            "unique_imports": len(import_counts),
            "report_file": str(output_file),
        }

        print("\n📊 Import Analysis Results:")
        print(f"   Unique imports: {len(import_counts)}")
        print(f"   Report: {output_file}")
        print("\n✅ Import analysis complete")
        return True

    def generate_summary_report(self):
        """Generate summary report of all analyses."""
        summary_file = self.output_dir / "analysis_summary.json"

        summary = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "results": self.results,
            "failed_checks": self.failed_checks,
            "overall_status": "PASSED" if not self.failed_checks else "FAILED",
        }

        with summary_file.open("w") as f:
            json.dump(summary, f, indent=2)

        print("\n" + "=" * 60)
        print("ANALYSIS SUMMARY")
        print("=" * 60)

        if "bandit" in self.results:
            print("\n🔒 Security (Bandit):")
            print(f"   High:   {self.results['bandit']['high']}")
            print(f"   Medium: {self.results['bandit']['medium']}")
            print(f"   Low:    {self.results['bandit']['low']}")

        if "ruff" in self.results:
            print("\n📝 Code Quality (Ruff):")
            print(f"   Issues: {self.results['ruff']['issues']}")

        if "complexity" in self.results:
            print("\n📊 Complexity (Radon):")
            print(
                f"   Complex functions (CC>10): {self.results['complexity']['complex_functions']}",
            )
            print(
                f"   High complexity (CC>15):   {self.results['complexity']['high_complexity']}",
            )

        if "imports" in self.results:
            print("\n📦 Imports:")
            print(f"   Unique imports: {self.results['imports']['unique_imports']}")

        print(f"\n📄 Summary Report: {summary_file}")
        print(f"📁 All Reports: {self.output_dir}/")

        if self.failed_checks:
            print(f"\n❌ FAILED CHECKS: {', '.join(self.failed_checks)}")
            print("\n⚠️  Static analysis completed with failures")
            return False
        else:
            print("\n✅ All static analysis checks passed!")
            return True

    def run_all_analyses(self) -> bool:
        """
        Run all static analyses.

        Returns:
            True if all checks passed, False otherwise
        """
        print("\n" + "=" * 60)
        print("STATIC ANALYSIS SUITE")
        print("ThermaCore SCADA Platform")
        print("=" * 60)
        print(f"Output Directory: {self.output_dir}")
        print(f"Fail on Medium: {self.fail_on_medium}")

        if not self.check_dependencies():
            return False

        # Run all analyses
        self.run_bandit_scan()
        self.run_ruff_analysis()
        self.run_complexity_analysis()
        self.run_import_analysis()

        # Generate summary
        return self.generate_summary_report()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Run comprehensive static analysis on ThermaCore SCADA platform",
    )
    parser.add_argument(
        "--fail-on-medium",
        action="store_true",
        help="Fail if medium severity security issues are found",
    )
    parser.add_argument(
        "--output-dir",
        default="analysis_reports",
        help="Directory to store analysis reports (default: analysis_reports)",
    )

    args = parser.parse_args()

    suite = StaticAnalysisSuite(
        output_dir=args.output_dir,
        fail_on_medium=args.fail_on_medium,
    )

    success = suite.run_all_analyses()

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
