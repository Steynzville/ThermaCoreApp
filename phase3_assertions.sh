#!/usr/bin/env bash
set -e
echo "🧪 Phase 3: Fix Assertion Mismatches"

pytest -q --tb=short | tee assertion_errors.log || true
echo "Assertion errors logged for review in assertion_errors.log"
git add assertion_errors.log
git commit -m "Phase 3: Captured assertion error logs for logic alignment" || echo "No changes"
