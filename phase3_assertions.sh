#!/usr/bin/env bash
set -e
echo "🔧 Phase 3: Assertion Error Detection"

cd backend

# Run pytest and capture assertion errors
echo "Running pytest to capture assertion errors..."

# Create a temporary pytest output file
TEMP_OUTPUT=$(mktemp)

# Run pytest with verbose output, capturing both stdout and stderr
pytest app/tests/ -v --tb=short 2>&1 | tee "$TEMP_OUTPUT" || true

# Extract assertion errors from the output
echo "Extracting assertion errors..."

# Create assertion_errors.log
cat > assertion_errors.log <<'EOF'
# Assertion Errors Log
# Generated: $(date)
# This file contains all assertion errors found during pytest execution

EOF

# Find and extract assertion errors
grep -A 10 "AssertionError" "$TEMP_OUTPUT" >> assertion_errors.log 2>/dev/null || echo "No assertion errors found" >> assertion_errors.log

# Also capture FAILED tests
echo "" >> assertion_errors.log
echo "=== FAILED Tests Summary ===" >> assertion_errors.log
grep "FAILED" "$TEMP_OUTPUT" >> assertion_errors.log 2>/dev/null || echo "No failed tests found" >> assertion_errors.log

# Count assertion errors
ASSERTION_COUNT=$(grep -c "AssertionError" assertion_errors.log 2>/dev/null || echo "0")
FAILED_COUNT=$(grep -c "FAILED" "$TEMP_OUTPUT" 2>/dev/null || echo "0")

# Clean up temp file
rm -f "$TEMP_OUTPUT"

echo "✓ Captured $ASSERTION_COUNT assertion errors"
echo "✓ Found $FAILED_COUNT failed tests"
echo "✓ Results saved to assertion_errors.log"

# Commit assertion errors log
cd ..
git add backend/assertion_errors.log 2>/dev/null || true

echo "✅ Phase 3 Complete: Assertion errors captured"
echo "   - pytest executed"
echo "   - assertion_errors.log created with $ASSERTION_COUNT assertion errors"
echo "   - $FAILED_COUNT failed tests logged"
