#!/usr/bin/env bash
set -e
echo "🔧 Phase 5: CI/CD Optimization"

cd backend

# Install pytest-xdist for parallel testing
echo "Installing pytest-xdist for parallel test execution..."
if ! pip show pytest-xdist > /dev/null 2>&1; then
    pip install pytest-xdist
    echo "✓ Installed pytest-xdist"
else
    echo "✓ pytest-xdist already installed"
fi

# Install ruff for fast linting
echo "Installing ruff for fast linting..."
if ! pip show ruff > /dev/null 2>&1; then
    pip install ruff
    echo "✓ Installed ruff"
else
    echo "✓ ruff already installed"
fi

# Update requirements.txt with new dependencies
echo "Updating requirements.txt..."
if ! grep -q "pytest-xdist" requirements.txt; then
    echo "" >> requirements.txt
    echo "# CI/CD optimization dependencies" >> requirements.txt
    echo "pytest-xdist==3.6.1" >> requirements.txt
    echo "✓ Added pytest-xdist to requirements.txt"
fi

if ! grep -q "ruff" requirements.txt; then
    echo "ruff==0.8.4" >> requirements.txt
    echo "✓ Added ruff to requirements.txt"
fi

# Run parallel tests
echo ""
echo "Running parallel tests with pytest-xdist..."
PARALLEL_OUTPUT=$(mktemp)

# Run tests in parallel using all available CPU cores
pytest app/tests/ -n auto -v --tb=short 2>&1 | tee "$PARALLEL_OUTPUT" || true

# Extract summary
TESTS_PASSED=$(grep -o "[0-9]* passed" "$PARALLEL_OUTPUT" | head -1 || echo "0 passed")
TESTS_FAILED=$(grep -o "[0-9]* failed" "$PARALLEL_OUTPUT" | head -1 || echo "0 failed")

echo ""
echo "Parallel test results: $TESTS_PASSED, $TESTS_FAILED"

rm -f "$PARALLEL_OUTPUT"

# Run ruff linting
echo ""
echo "Running ruff linter..."

# Create ruff configuration if it doesn't exist
if [ ! -f ruff.toml ]; then
    cat > ruff.toml <<'EOF'
# Ruff configuration for ThermaCore
line-length = 100
target-version = "py310"

[lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade
]

ignore = [
    "E501",  # line too long (handled by formatter)
    "B008",  # do not perform function calls in argument defaults
    "C901",  # too complex
]

[lint.per-file-ignores]
"__init__.py" = ["F401"]  # unused imports in __init__.py
"app/tests/*" = ["F401", "F811"]  # allow test fixtures

[format]
quote-style = "double"
indent-style = "space"
EOF
    echo "✓ Created ruff.toml configuration"
fi

# Run ruff check
echo "Checking code with ruff..."
ruff check app/ --fix --exit-zero 2>&1 | head -20

echo "✓ Ruff linting complete (auto-fixes applied)"

# Run ruff format
echo "Formatting code with ruff..."
ruff format app/ --check --diff 2>&1 | head -20 || true

echo "✓ Ruff format check complete"

# Commit CI optimization changes
cd ..
git add backend/requirements.txt backend/ruff.toml 2>/dev/null || true

echo ""
echo "✅ Phase 5 Complete: CI/CD optimization applied"
echo "   - pytest-xdist installed for parallel testing"
echo "   - ruff installed for fast linting"
echo "   - Parallel tests executed: $TESTS_PASSED, $TESTS_FAILED"
echo "   - Code linted and auto-fixed with ruff"
