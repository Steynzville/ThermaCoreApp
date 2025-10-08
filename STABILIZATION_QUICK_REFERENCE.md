# Stabilization Scripts Quick Reference

## Quick Start

### Run All Phases
```bash
./run_stabilization.sh
```

### Run Individual Phases
```bash
./phase1_runtime.sh      # Setup test environment
./phase2_database.sh     # Add DB retry logic
./phase3_assertions.sh   # Capture assertion errors
./phase4_types.sh        # Capture type errors
./phase5_ci.sh           # Install & run CI tools
```

## What Each Phase Does

| Phase | Purpose | Time | Output Files |
|-------|---------|------|--------------|
| 1 | Runtime setup | <5s | `.env.test`, `conftest.py` |
| 2 | DB retry logic | <5s | `db_retry.py` |
| 3 | Assertion detection | ~30s | `assertion_errors.log` |
| 4 | Type error detection | ~30s | `type_errors.log`, `suspected_files.txt` |
| 5 | CI optimization | ~60s | `ruff.toml`, `requirements.txt` |

## Output Files

### Committed to Repository
- `.env.test` - Test environment configuration
- `backend/app/utils/db_retry.py` - Database retry utilities
- `backend/ruff.toml` - Ruff linter configuration
- `backend/requirements.txt` - Updated with pytest-xdist & ruff
- `backend/app/tests/conftest.py` - Added safe_app fixture

### Generated (Not Committed)
- `backend/assertion_errors.log` - Assertion error traces
- `backend/type_errors.log` - Type error traces
- `backend/suspected_files.txt` - Files with type issues

## Common Tasks

### Check for Test Failures
```bash
./phase3_assertions.sh
cat backend/assertion_errors.log
```

### Find Type Issues
```bash
./phase4_types.sh
cat backend/type_errors.log
cat backend/suspected_files.txt
```

### Run Parallel Tests
```bash
./phase5_ci.sh  # Installs pytest-xdist first
cd backend
pytest app/tests/ -n auto  # Use all CPU cores
```

### Lint & Format Code
```bash
./phase5_ci.sh  # Installs ruff first
cd backend
ruff check app/ --fix      # Auto-fix issues
ruff format app/            # Format code
```

## CI/CD Integration

### GitHub Actions
Workflow automatically runs on:
- Push to `main` or `develop`
- Pull requests
- Manual trigger

View results at: `.github/workflows/stabilization.yml`

### Artifacts
Download from GitHub Actions:
- Error logs (`assertion_errors.log`, `type_errors.log`)
- Test configuration (`.env.test`, `ruff.toml`)

## Troubleshooting

### Script Fails
```bash
# Make scripts executable
chmod +x phase*.sh run_stabilization.sh

# Check bash syntax
bash -n phase1_runtime.sh
```

### Missing Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Tests Fail
```bash
# Check test environment
cat .env.test

# Verify database
cd backend
python -c "from app import create_app, db; app = create_app('testing'); print('OK')"
```

### Ruff Not Working
```bash
# Reinstall ruff
pip install --upgrade ruff

# Check version
ruff --version
```

## Performance Tips

### Speed Up Tests
- Use `-n auto` for parallel testing (phase 5 installs this)
- Use `-k` to run specific tests: `pytest -k test_auth`
- Use `--lf` to run last failed tests only

### Reduce Log Size
```bash
# Run specific test files only
pytest app/tests/test_auth.py -v
```

### Skip Slow Tests
```bash
# Use markers (if defined)
pytest -m "not slow"
```

## Integration Examples

### Pre-commit Hook
```bash
# .git/hooks/pre-commit
#!/bin/bash
./phase5_ci.sh  # Run linting before commit
```

### Pre-push Hook
```bash
# .git/hooks/pre-push
#!/bin/bash
./run_stabilization.sh  # Run all phases before push
```

### Docker Integration
```dockerfile
# Run stabilization in Docker
RUN chmod +x run_stabilization.sh && ./run_stabilization.sh
```

## Advanced Usage

### Custom Test Environment
```bash
# Edit .env.test first
./phase1_runtime.sh
# Manually edit .env.test
cd backend && pytest app/tests/ --env-file=../.env.test
```

### Parallel Execution with Coverage
```bash
./phase5_ci.sh  # Install pytest-xdist
cd backend
pytest app/tests/ -n auto --cov=app --cov-report=html
```

### Custom Ruff Rules
```bash
# Edit backend/ruff.toml
./phase5_ci.sh  # Apply custom rules
```

## Documentation

- **Full Guide:** `STABILIZATION_SCRIPTS.md`
- **Implementation:** `STABILIZATION_IMPLEMENTATION_SUMMARY.md`
- **GitHub Actions:** `.github/workflows/stabilization.yml`

## Support

For issues or questions:
1. Check `STABILIZATION_SCRIPTS.md` troubleshooting section
2. Review error logs in `backend/`
3. Check GitHub Actions logs for CI failures
4. Open an issue in the repository

---

**Version:** 1.0  
**Last Updated:** 2024  
**Tested On:** Python 3.10, 3.11  
**Platform:** Linux, macOS, WSL
