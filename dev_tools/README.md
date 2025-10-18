# Development Tools & Diagnostic Scripts

This directory contains development tools, diagnostic scripts, and historical documentation that are not needed for production deployment but are useful for development and troubleshooting.

## Directory Structure

### `diagnostic_scripts/`
Contains diagnostic, demonstration, and troubleshooting scripts used during development:

#### Diagnostic Scripts
- **`diagnose_auth_issue.py`** - Comprehensive authentication diagnostics
- **`diagnose_api_endpoints.py`** - API endpoint testing and diagnostics

#### Demonstration Scripts
- **`demonstrate_improvements.py`** - Demonstration of logging and exception handling improvements
- **`demo_config_refactoring.py`** - Configuration refactoring demonstrations
- **`demo_service_manager.py`** - Service manager demonstrations
- **`pr2_demo.py`** - PR2 feature demonstrations

#### Validation & Testing Scripts
- **`validate_conftest_improvements.py`** - Test configuration validation
- **`validate_dnp3_optimization.py`** - DNP3 optimization validation
- **`validate_phase2_fix.py`** - Phase 2 fix validation
- **`validate_pr2.py`** - PR2 validation
- **`verify_changes.py`** - General change verification
- **`test_*.py`** - Standalone test scripts for various components
- **`run_complete_tests.py`** - Complete test suite runner

These scripts can be run manually for troubleshooting but are not part of the production application.

### `documentation/`
Contains historical development and debugging documentation:

- **DEBUG-related documentation** - Debugging guides and troubleshooting steps from development
- **CONFTEST improvements** - Test configuration documentation

## Usage

### Running Diagnostic Scripts

From the backend directory:

```bash
cd backend
python ../dev_tools/diagnostic_scripts/diagnose_auth_issue.py
python ../dev_tools/diagnostic_scripts/diagnose_api_endpoints.py [base_url] [username] [password]
```

### Documentation

The documentation in this directory is kept for historical reference and may contain outdated information. Refer to the main project documentation for current information.

## Note

These files are excluded from production deployment and are maintained solely for development purposes.
