#!/bin/bash
# Enterprise Validation Script for ThermaCore SCADA Platform
# Runs all enterprise validation checks and generates comprehensive report

set -e  # Exit on error

echo "============================================================"
echo "THERMACORE ENTERPRISE VALIDATION SUITE"
echo "============================================================"
echo ""
echo "Running comprehensive enterprise validation checks..."
echo ""

# Change to backend directory
cd "$(dirname "$0")/.."

# Track overall status
VALIDATION_PASSED=true

# 1. Production Readiness Check
echo "============================================================"
echo "1. PRODUCTION READINESS VALIDATION"
echo "============================================================"
echo ""

if python scripts/production_readiness.py --skip-services; then
    echo "✅ Production readiness check PASSED"
else
    echo "❌ Production readiness check FAILED"
    VALIDATION_PASSED=false
fi
echo ""

# 2. Protocol Performance Benchmarks
echo "============================================================"
echo "2. PROTOCOL PERFORMANCE BENCHMARKS"
echo "============================================================"
echo ""

if python benchmarks/protocol_performance.py; then
    echo "✅ Protocol performance benchmarks PASSED"
else
    echo "❌ Protocol performance benchmarks FAILED"
    VALIDATION_PASSED=false
fi
echo ""

# 3. Critical Path Benchmarks
echo "============================================================"
echo "3. CRITICAL PATH BENCHMARKS"
echo "============================================================"
echo ""

if python benchmarks/critical_path_benchmark.py; then
    echo "✅ Critical path benchmarks PASSED"
else
    echo "❌ Critical path benchmarks FAILED"
    VALIDATION_PASSED=false
fi
echo ""

# 4. Static Analysis Suite
echo "============================================================"
echo "4. STATIC ANALYSIS SUITE"
echo "============================================================"
echo ""

if python scripts/static_analysis_suite.py; then
    echo "✅ Static analysis PASSED"
else
    echo "⚠️  Static analysis completed with warnings"
    # Don't fail on static analysis warnings unless in strict mode
fi
echo ""

# Generate summary report
echo "============================================================"
echo "VALIDATION SUMMARY"
echo "============================================================"
echo ""

if [ "$VALIDATION_PASSED" = true ]; then
    echo "✅ ALL ENTERPRISE VALIDATIONS PASSED"
    echo ""
    echo "The system is ready for enterprise deployment."
else
    echo "❌ SOME VALIDATIONS FAILED"
    echo ""
    echo "Please review the failures above and address them before deployment."
fi

echo ""
echo "Generated Reports:"
echo "  📄 production_readiness_report.json"
echo "  📄 protocol_performance_results.json"
echo "  📄 critical_path_results.json"
echo "  📄 analysis_reports/analysis_summary.json (if available)"
echo ""

echo "For detailed information, see:"
echo "  📖 docs/OPERATIONS/ENTERPRISE_READINESS_REPORT.md"
echo ""

# Exit with appropriate code
if [ "$VALIDATION_PASSED" = true ]; then
    exit 0
else
    exit 1
fi
