#!/usr/bin/env bash
set -e
echo "🧩 Phase 4: Fix Type/Attribute Errors"

pytest -q --tb=short | grep -E "TypeError|AttributeError" > type_errors.log || true
awk -F: '{print $1}' type_errors.log | sort | uniq > suspected_files.txt
git add type_errors.log suspected_files.txt
git commit -m "Phase 4: Collected type/attribute error traces" || echo "No changes"
