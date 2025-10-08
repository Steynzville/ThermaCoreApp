#!/usr/bin/env bash
set -e
echo "🔧 Phase 4: Type Error Detection"

cd backend

# Run pytest and capture type errors
echo "Running pytest to capture type errors..."

# Create temporary output files
TEMP_OUTPUT=$(mktemp)
TEMP_TRACEBACK=$(mktemp)

# Run pytest with full traceback
pytest app/tests/ -v --tb=long 2>&1 | tee "$TEMP_OUTPUT" || true

# Extract TypeError and AttributeError traces
echo "Extracting type errors..."

# Create type_errors.log
cat > type_errors.log <<'EOF'
# Type Errors Log
# Generated: $(date)
# This file contains all TypeError and AttributeError traces found during pytest execution

=== TypeError Occurrences ===

EOF

# Find TypeError occurrences
grep -B 5 -A 10 "TypeError" "$TEMP_OUTPUT" >> type_errors.log 2>/dev/null || echo "No TypeError found" >> type_errors.log

echo "" >> type_errors.log
echo "=== AttributeError Occurrences ===" >> type_errors.log
echo "" >> type_errors.log

# Find AttributeError occurrences
grep -B 5 -A 10 "AttributeError" "$TEMP_OUTPUT" >> type_errors.log 2>/dev/null || echo "No AttributeError found" >> type_errors.log

# Extract suspected files from tracebacks
echo "Extracting suspected files from error traces..."

# Create suspected_files.txt
cat > suspected_files.txt <<'EOF'
# Suspected Files with Type Issues
# Generated: $(date)
# Files mentioned in TypeError/AttributeError tracebacks

EOF

# Extract file paths from tracebacks (looking for "File " patterns)
grep "File " "$TEMP_OUTPUT" | \
    sed 's/.*File "\(.*\)", line.*/\1/' | \
    sort -u | \
    grep -v "pytest\|pluggy\|_pytest" >> suspected_files.txt 2>/dev/null || echo "No suspected files found" >> suspected_files.txt

# Count errors
TYPE_ERROR_COUNT=$(grep -c "TypeError" type_errors.log 2>/dev/null || echo "0")
ATTR_ERROR_COUNT=$(grep -c "AttributeError" type_errors.log 2>/dev/null || echo "0")
SUSPECTED_FILES_COUNT=$(wc -l < suspected_files.txt | tr -d ' ')

# Clean up temp files
rm -f "$TEMP_OUTPUT" "$TEMP_TRACEBACK"

echo "✓ Captured $TYPE_ERROR_COUNT TypeErrors"
echo "✓ Captured $ATTR_ERROR_COUNT AttributeErrors"
echo "✓ Identified $SUSPECTED_FILES_COUNT suspected files"
echo "✓ Results saved to type_errors.log and suspected_files.txt"

# Commit type error logs
cd ..
git add backend/type_errors.log backend/suspected_files.txt 2>/dev/null || true

echo "✅ Phase 4 Complete: Type errors captured"
echo "   - pytest executed with full traceback"
echo "   - type_errors.log created with $TYPE_ERROR_COUNT TypeErrors and $ATTR_ERROR_COUNT AttributeErrors"
echo "   - suspected_files.txt created with $SUSPECTED_FILES_COUNT files"
