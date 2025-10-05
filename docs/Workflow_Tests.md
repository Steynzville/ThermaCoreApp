# Workflow Test Documentation

## Purpose

This document describes the workflow tests added to verify that the CI/CD pipeline is configured correctly and runs as expected.

## Test Files

### Backend: `backend/app/tests/test_workflow.py`

Tests the GitHub Actions workflow configuration from the backend perspective:

- **test_workflow_file_exists**: Verifies that the `.github/workflows/checks.yml` file exists
- **test_workflow_file_has_content**: Checks that the workflow file has valid content with jobs defined
- **test_workflow_has_required_jobs**: Ensures the workflow contains the required jobs (`build-and-test` and `python-quality-and-security`)
- **test_python_environment**: Validates that Python version meets minimum requirements
- **test_backend_structure**: Checks that the backend directory structure is correct

### Frontend: `src/tests/workflow.test.js`

Tests the GitHub Actions workflow configuration from the frontend perspective:

- **Workflow Configuration**: Validates the workflow file exists and has proper content
- **Frontend Test Step**: Ensures the workflow includes the "Run Frontend Tests" step
- **Project Structure**: Verifies that essential frontend files (package.json, vite.config.js) exist and are properly configured

## Running the Tests

### Backend Tests

```bash
cd backend
pytest app/tests/test_workflow.py -v
```

### Frontend Tests

```bash
pnpm test workflow.test.js
```

## Workflow Verification

These tests are designed to run as part of the CI/CD pipeline defined in `.github/workflows/checks.yml`. When a pull request is created or updated, these tests will automatically run to verify that:

1. The workflow configuration is valid
2. All required jobs are present
3. The project structure is correct
4. The environment is properly configured

## Success Criteria

All tests should pass, indicating that:
- The GitHub Actions workflow is properly configured
- The CI/CD pipeline can execute successfully
- Both backend and frontend test infrastructure is in place
