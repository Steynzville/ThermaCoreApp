# Stabilization Scripts

This directory contains automated stabilization scripts for the ThermaCore application. These scripts help identify and fix runtime, database, assertion, type, and CI/CD issues.

## Scripts Overview

### Phase 1: Runtime & Environment Stabilization (`phase1_runtime.sh`)
Sets up a test environment and creates necessary test fixtures.

**Actions:**
- Creates `.env.test` with proper test environment configuration
- Adds `safe_app` pytest fixture to conftest.py for isolated test instances
- Commits runtime stabilization files

**Usage:**
```bash
./phase1_runtime.sh
```

### Phase 2: Database Infrastructure Stabilization (`phase2_database.sh`)
Ensures database connectivity and health monitoring are properly configured.

**Actions:**
- Verifies DB healthcheck configuration in docker-compose.yml
- Adds database connection retry logic to `app/utils/db_retry.py`
- Commits database infrastructure changes

**Usage:**
```bash
./phase2_database.sh
```

### Phase 3: Assertion Error Detection (`phase3_assertions.sh`)
Runs pytest and captures assertion errors for analysis.

**Actions:**
- Executes pytest test suite
- Captures assertion errors to `assertion_errors.log`
- Logs failed tests summary
- Commits assertion error logs

**Usage:**
```bash
./phase3_assertions.sh
```

**Output Files:**
- `backend/assertion_errors.log` - Contains all assertion errors and failed test summaries

### Phase 4: Type Error Detection (`phase4_types.sh`)
Identifies type-related errors (TypeError, AttributeError) in the codebase.

**Actions:**
- Runs pytest with full traceback
- Captures TypeError and AttributeError traces to `type_errors.log`
- Extracts suspected files to `suspected_files.txt`
- Commits type error logs

**Usage:**
```bash
./phase4_types.sh
```

**Output Files:**
- `backend/type_errors.log` - Contains TypeError and AttributeError traces
- `backend/suspected_files.txt` - List of files mentioned in error tracebacks

### Phase 5: CI/CD Optimization (`phase5_ci.sh`)
Optimizes testing and linting for CI/CD pipelines.

**Actions:**
- Installs `pytest-xdist` for parallel test execution
- Installs `ruff` for fast linting and formatting
- Runs parallel tests using all CPU cores
- Applies automatic lint fixes
- Updates requirements.txt
- Commits CI optimization changes

**Usage:**
```bash
./phase5_ci.sh
```

**Output Files:**
- `backend/requirements.txt` - Updated with pytest-xdist and ruff
- `backend/ruff.toml` - Ruff configuration file

## Running All Phases Sequentially

You can run all phases in order using:

```bash
./phase1_runtime.sh && \
./phase2_database.sh && \
./phase3_assertions.sh && \
./phase4_types.sh && \
./phase5_ci.sh
```

Or create a master script:

```bash
#!/usr/bin/env bash
set -e

echo "🚀 Running all stabilization phases..."
./phase1_runtime.sh
./phase2_database.sh
./phase3_assertions.sh
./phase4_types.sh
./phase5_ci.sh
echo "✅ All stabilization phases complete!"
```

## CI/CD Integration

### GitHub Actions Example

Add this to `.github/workflows/stabilization.yml`:

```yaml
name: Stabilization Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  stabilization:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
    
    - name: Phase 1 - Runtime Stabilization
      run: ./phase1_runtime.sh
    
    - name: Phase 2 - Database Stabilization
      run: ./phase2_database.sh
    
    - name: Phase 3 - Assertion Detection
      run: ./phase3_assertions.sh
    
    - name: Phase 4 - Type Error Detection
      run: ./phase4_types.sh
    
    - name: Phase 5 - CI Optimization
      run: ./phase5_ci.sh
    
    - name: Upload Error Logs
      if: failure()
      uses: actions/upload-artifact@v3
      with:
        name: error-logs
        path: |
          backend/assertion_errors.log
          backend/type_errors.log
          backend/suspected_files.txt
```

## Manual Execution

For manual testing and debugging:

1. **Run individual phases** to isolate issues:
   ```bash
   ./phase3_assertions.sh  # Just check assertion errors
   ```

2. **Review generated logs** after each phase:
   ```bash
   cat backend/assertion_errors.log
   cat backend/type_errors.log
   cat backend/suspected_files.txt
   ```

3. **Fix issues** identified in the logs and re-run the relevant phase

## Prerequisites

- Python 3.10 or higher
- pip package manager
- Git
- Backend dependencies installed (`pip install -r backend/requirements.txt`)

## Output and Artifacts

Each phase creates specific output files that are committed to the repository:

| Phase | Output Files | Purpose |
|-------|-------------|---------|
| Phase 1 | `.env.test`, `backend/app/tests/conftest.py` | Test environment configuration |
| Phase 2 | `backend/app/utils/db_retry.py` | Database retry logic |
| Phase 3 | `backend/assertion_errors.log` | Assertion error tracking |
| Phase 4 | `backend/type_errors.log`, `backend/suspected_files.txt` | Type error analysis |
| Phase 5 | `backend/requirements.txt`, `backend/ruff.toml` | CI/CD optimization |

## Troubleshooting

### Phase 1 Issues
- **Error:** "safe_app fixture already exists"
  - **Solution:** This is normal if running multiple times. The script handles this gracefully.

### Phase 2 Issues
- **Error:** Database connection failures
  - **Solution:** Ensure Docker containers are running: `docker-compose up -d db`

### Phase 3 & 4 Issues
- **Error:** No tests found
  - **Solution:** Ensure you're in the repository root and `backend/app/tests/` exists

### Phase 5 Issues
- **Error:** pip install failures
  - **Solution:** Ensure you have write permissions and internet connectivity

## Contributing

When modifying these scripts:
1. Test each script individually
2. Test the full sequence
3. Update this README with any new features or changes
4. Ensure scripts remain idempotent (can be run multiple times safely)

## License

Part of the ThermaCore SCADA application.
