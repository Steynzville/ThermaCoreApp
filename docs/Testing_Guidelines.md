# Testing Guidelines

Comprehensive testing is essential for ensuring the reliability, stability, and correctness of the ThermaCoreApp. This document outlines the testing strategy, tools, and best practices for both the Python Flask backend and the React frontend.

## 1. General Testing Principles

*   **Test Early, Test Often**: Integrate testing into the development cycle from the beginning.
*   **Automated Testing**: Prioritize automated tests (unit, integration, end-to-end) to catch regressions quickly.
*   **Clear Test Cases**: Each test case should have a clear purpose, test a single piece of functionality, and be easily understandable.
*   **Maintainable Tests**: Tests should be easy to write, read, and maintain. Avoid brittle tests that break with minor code changes.
*   **Code Coverage**: Aim for high code coverage, but prioritize testing critical paths and complex logic over simply reaching a percentage.

## 2. Python Backend Testing

### 2.1. Tools and Frameworks

*   **Pytest**: The primary testing framework for the Python backend.
*   **SQLAlchemy**: Used for database interactions, tests should ideally use an in-memory SQLite database or a dedicated test PostgreSQL database.
*   **`flask.testing.FlaskClient`**: For making requests to the Flask application in tests.

### 2.2. Test Types

#### 2.2.1. Unit Tests

*   **Purpose**: To test individual functions, methods, or small components in isolation.
*   **Location**: `backend/app/tests/` directory, with files named `test_*.py`.
*   **Best Practices**:
    *   Mock external dependencies (e.g., MQTT client, OPC UA client, external APIs) to ensure tests are fast and isolated.
    *   Test edge cases, error conditions, and expected behavior.
    *   Example: `test_auth.py` for authentication logic, `test_models.py` for model methods.

#### 2.2.2. Integration Tests

*   **Purpose**: To test the interaction between multiple components or modules (e.g., a route interacting with a service and the database).
*   **Location**: `backend/app/tests/` directory.
*   **Best Practices**:
    *   Use a dedicated test database (e.g., `thermacore_test_db` as configured in `config.py`) that is reset before each test run.
    *   Test API endpoints to ensure they return correct responses and handle various inputs.
    *   Example: `test_units_api.py` for unit-related API interactions.

#### 2.2.3. Performance Tests

*   **Purpose**: To measure the performance characteristics of the application under various loads.
*   **Location**: `backend/scripts/performance_tests.py`.
*   **Execution**: Can be run via `backend/scripts/run_performance_tests.sh`.
*   **Best Practices**:
    *   Define clear performance metrics (e.g., response time, throughput, resource utilization).
    *   Run tests in an environment that closely mimics production.
    *   Analyze results to identify bottlenecks and areas for optimization.

### 2.3. Running Backend Tests

*   **All tests**: `pytest /home/ubuntu/ThermaCoreApp/backend/app/tests`
*   **Specific test file**: `pytest /home/ubuntu/ThermaCoreApp/backend/app/tests/test_auth.py`
*   **With PostgreSQL**: Set `USE_POSTGRES_TESTS=true` environment variable before running tests.

## 3. React Frontend Testing

### 3.1. Tools and Frameworks

*   **Vitest**: A fast unit test framework powered by Vite.
*   **React Testing Library**: For testing React components in a way that resembles how users interact with them.
*   **JSDOM**: A JavaScript implementation of the DOM and HTML standards, used by Vitest for browser environment simulation.

### 3.2. Test Types

#### 3.2.1. Unit Tests

*   **Purpose**: To test individual React components, hooks, or utility functions in isolation.
*   **Location**: `src/tests/` directory, with files named `*.test.jsx` or `*.test.js`.
*   **Best Practices**:
    *   Focus on testing the component's output given certain props or state.
    *   Mock API calls and external dependencies using tools like `msw` (Mock Service Worker) or simple jest mocks.
    *   Test user interactions (clicks, input changes) and ensure the UI updates correctly.
    *   Example: `App.test.jsx`, `Spinner.test.jsx`.

#### 3.2.2. Integration Tests

*   **Purpose**: To test the interaction between multiple React components or a component and its context/services.
*   **Location**: `src/tests/` directory.
*   **Best Practices**:
    *   Render components that rely on context providers or services.
    *   Verify data flow and state changes across interconnected components.
    *   Example: `ProtectedRoute.test.jsx` for testing routing and authentication integration.

### 3.3. Running Frontend Tests

*   **All tests**: `pnpm test`
*   **Watch mode**: `pnpm test --watch`

## 4. Continuous Integration (CI)

*   Integrate automated tests into the CI/CD pipeline to ensure that all code changes are tested before deployment.
*   The `build` script (`vite build && node scripts/check-security.js --build`) includes a security check, which should be part of the CI process.

## 5. Security Testing

*   **Static Application Security Testing (SAST)**: Tools like `scripts/check-security.js` can be used to identify potential vulnerabilities in the codebase.
*   **Dynamic Application Security Testing (DAST)**: Consider using tools to test the running application for vulnerabilities.
*   **Penetration Testing**: Periodically conduct manual penetration tests to uncover complex vulnerabilities.
