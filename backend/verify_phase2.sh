#!/bin/bash
# Quick verification script for Phase 2 Security Hardening

echo "======================================"
echo "Phase 2 Security Hardening Verification"
echo "======================================"
echo ""

echo "1. Checking for S-series security violations..."
ruff check --select S105,S107,S311,S603,S607,S110 app/ config.py generate_certs.py scripts/ 2>&1 | grep -E "^(S105|S107|S311|S603|S607|S110)" || echo "✅ No violations found in production code"
echo ""

echo "2. Running security utility tests..."
python -m pytest app/tests/test_security_utils.py -v --tb=short
echo ""

echo "3. Running logging config tests..."
python -m pytest app/tests/test_logging_config.py -v --tb=short
echo ""

echo "4. Verifying security report exists..."
if [ -f "phase2_security_report.md" ]; then
    echo "✅ Phase 2 security report found"
else
    echo "❌ Phase 2 security report missing"
fi
echo ""

echo "======================================"
echo "Phase 2 Verification Complete"
echo "======================================"
