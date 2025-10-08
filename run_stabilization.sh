#!/usr/bin/env bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║        ThermaCore Stabilization Suite Runner                ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Function to print phase header
print_phase_header() {
    local phase_num=$1
    local phase_name=$2
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Phase $phase_num: $phase_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Function to print phase result
print_phase_result() {
    local phase_num=$1
    local status=$2
    if [ "$status" -eq 0 ]; then
        echo "✅ Phase $phase_num completed successfully"
    else
        echo "❌ Phase $phase_num failed with exit code $status"
        return $status
    fi
}

# Track overall status
overall_status=0

# Phase 1: Runtime & Environment Stabilization
print_phase_header 1 "Runtime & Environment Stabilization"
./phase1_runtime.sh
phase1_status=$?
print_phase_result 1 $phase1_status
[ $phase1_status -ne 0 ] && overall_status=1

# Phase 2: Database Infrastructure Stabilization
print_phase_header 2 "Database Infrastructure Stabilization"
./phase2_database.sh
phase2_status=$?
print_phase_result 2 $phase2_status
[ $phase2_status -ne 0 ] && overall_status=1

# Phase 3: Assertion Error Detection
print_phase_header 3 "Assertion Error Detection"
./phase3_assertions.sh
phase3_status=$?
print_phase_result 3 $phase3_status
[ $phase3_status -ne 0 ] && overall_status=1

# Phase 4: Type Error Detection
print_phase_header 4 "Type Error Detection"
./phase4_types.sh
phase4_status=$?
print_phase_result 4 $phase4_status
[ $phase4_status -ne 0 ] && overall_status=1

# Phase 5: CI/CD Optimization
print_phase_header 5 "CI/CD Optimization"
./phase5_ci.sh
phase5_status=$?
print_phase_result 5 $phase5_status
[ $phase5_status -ne 0 ] && overall_status=1

# Final summary
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║                   Stabilization Summary                      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Phase 1 (Runtime):          $([ $phase1_status -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Phase 2 (Database):         $([ $phase2_status -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Phase 3 (Assertions):       $([ $phase3_status -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Phase 4 (Type Errors):      $([ $phase4_status -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "Phase 5 (CI/CD):            $([ $phase5_status -eq 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
echo ""

if [ $overall_status -eq 0 ]; then
    echo "🎉 All stabilization phases completed successfully!"
    echo ""
    echo "Generated artifacts:"
    echo "  - .env.test"
    echo "  - backend/app/utils/db_retry.py"
    echo "  - backend/assertion_errors.log"
    echo "  - backend/type_errors.log"
    echo "  - backend/suspected_files.txt"
    echo "  - backend/ruff.toml"
    echo ""
    echo "Review the logs for any issues found during testing."
else
    echo "⚠️  Some stabilization phases encountered issues."
    echo "Please review the output above for details."
fi

echo ""
exit $overall_status
