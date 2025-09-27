#!/bin/bash

# Performance Testing Documentation and Scripts for ThermaCore SCADA API
# This script provides automated performance testing setup and execution

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}ThermaCore SCADA API Performance Testing Suite${NC}"
echo "=============================================="

# Check if locust is installed
if ! command -v locust &> /dev/null; then
    echo -e "${YELLOW}Locust is not installed. Installing...${NC}"
    pip install locust
fi

# Check if API is running
API_URL=${1:-"http://localhost:5000"}
echo -e "${BLUE}Checking if API is running at ${API_URL}...${NC}"

if curl -s "${API_URL}/health" > /dev/null; then
    echo -e "${GREEN}✓ API is running${NC}"
else
    echo -e "${RED}✗ API is not running at ${API_URL}${NC}"
    echo "Please start the API server first: python run.py"
    exit 1
fi

# Create results directory
RESULTS_DIR="performance_results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}Performance test results will be saved to: ${RESULTS_DIR}${NC}"

# Function to run a performance test
run_performance_test() {
    local test_name=$1
    local user_class=$2
    local users=$3
    local spawn_rate=$4
    local duration=$5
    
    echo -e "${YELLOW}Running ${test_name}...${NC}"
    echo "Users: $users, Spawn Rate: $spawn_rate/sec, Duration: ${duration}s"
    
    locust -f scripts/performance_tests.py \
           --host="$API_URL" \
           --users="$users" \
           --spawn-rate="$spawn_rate" \
           --run-time="${duration}s" \
           --headless \
           --csv="$RESULTS_DIR/${test_name}" \
           --html="$RESULTS_DIR/${test_name}.html" \
           $user_class
    
    echo -e "${GREEN}✓ ${test_name} completed${NC}"
}

# Performance Test Suite
echo -e "${BLUE}Starting Performance Test Suite...${NC}"

# Test 1: Basic Read Operations (Light Load)
run_performance_test "basic_read_light" "ThermaCoreSCADAUser" 10 2 60

# Test 2: Basic Read Operations (Medium Load)
run_performance_test "basic_read_medium" "ThermaCoreSCADAUser" 50 5 120

# Test 3: CRUD Operations (Light Load)
run_performance_test "crud_light" "ThermaCoreCRUDUser" 5 1 60

# Test 4: CRUD Operations (Medium Load)
run_performance_test "crud_medium" "ThermaCoreCRUDUser" 20 2 120

# Test 5: Sensor Data Operations (High Frequency)
run_performance_test "sensor_data_high_freq" "ThermaCoreSensorDataUser" 30 5 60

# Test 6: DNP3 Performance Test (Light Load)
run_performance_test "dnp3_performance_light" "ThermaCoreDNP3PerformanceUser" 5 1 120

# Test 7: DNP3 Performance Test (Medium Load)
run_performance_test "dnp3_performance_medium" "ThermaCoreDNP3PerformanceUser" 15 3 180

# Test 8: DNP3 Optimization Features Test
run_performance_test "dnp3_optimization" "ThermaCoreDNP3OptimizationUser" 8 2 240

# Test 9: Mixed Load Test
echo -e "${YELLOW}Running Mixed Load Test...${NC}"
locust -f scripts/performance_tests.py \
       --host="$API_URL" \
       --users=100 \
       --spawn-rate=10 \
       --run-time=300s \
       --headless \
       --csv="$RESULTS_DIR/mixed_load" \
       --html="$RESULTS_DIR/mixed_load.html"

echo -e "${GREEN}✓ Mixed Load Test completed${NC}"

# Generate Performance Report
echo -e "${BLUE}Generating Performance Report...${NC}"

cat > "$RESULTS_DIR/performance_report.md" << EOF
# ThermaCore SCADA API Performance Test Report

**Test Date:** $(date)  
**API URL:** $API_URL  
**Test Duration:** Various (60s - 300s)

## Test Results Summary

### Test Scenarios

1. **Basic Read Operations (Light Load)**
   - Users: 10, Spawn Rate: 2/sec, Duration: 60s
   - Primary endpoints: GET /api/v1/units, GET /api/v1/units/{id}

2. **Basic Read Operations (Medium Load)**
   - Users: 50, Spawn Rate: 5/sec, Duration: 120s
   - Tests scalability of read operations

3. **CRUD Operations (Light Load)**
   - Users: 5, Spawn Rate: 1/sec, Duration: 60s
   - Tests create, read, update, delete operations

4. **CRUD Operations (Medium Load)**
   - Users: 20, Spawn Rate: 2/sec, Duration: 120s
   - Higher load CRUD testing

5. **Sensor Data Operations (High Frequency)**
   - Users: 30, Spawn Rate: 5/sec, Duration: 60s
   - Time-series data heavy operations

6. **Mixed Load Test**
   - Users: 100, Spawn Rate: 10/sec, Duration: 300s
   - Combined workload simulation

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| 95th Percentile Response Time | < 1000ms | Check CSV results |
| Average Response Time | < 500ms | Check CSV results |
| Throughput | > 100 req/sec | Check CSV results |
| Error Rate | < 1% | Check CSV results |

## Files Generated

- \`basic_read_light_stats.csv\` - Basic read operations (light load) statistics
- \`basic_read_medium_stats.csv\` - Basic read operations (medium load) statistics
- \`crud_light_stats.csv\` - CRUD operations (light load) statistics
- \`crud_medium_stats.csv\` - CRUD operations (medium load) statistics
- \`sensor_data_high_freq_stats.csv\` - Sensor data operations statistics
- \`mixed_load_stats.csv\` - Mixed load test statistics
- \`*.html\` files - Visual reports for each test

## Analysis Instructions

1. Open HTML files for visual performance dashboards
2. Check CSV files for detailed metrics:
   - Response times (average, min, max, 95th percentile)
   - Request rates (requests per second)
   - Error rates
   - Request counts by endpoint

## Recommendations

- Monitor database query performance during high load
- Consider implementing caching for frequently accessed endpoints
- Optimize TimescaleDB queries for sensor readings
- Set up monitoring and alerting for response times > 1000ms

## Database Performance Queries

Use these SQL queries to monitor database performance:

\`\`\`sql
-- Check query performance
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Check connection usage
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
\`\`\`
EOF

echo -e "${GREEN}✓ Performance report generated: ${RESULTS_DIR}/performance_report.md${NC}"

# Display summary
echo -e "${BLUE}Performance Testing Complete!${NC}"
echo "=============================================="
echo -e "Results directory: ${GREEN}$RESULTS_DIR${NC}"
echo -e "Report file: ${GREEN}$RESULTS_DIR/performance_report.md${NC}"
echo ""
echo "Next steps:"
echo "1. Review HTML reports for visual analysis"
echo "2. Check CSV files for detailed metrics"
echo "3. Compare results against performance targets"
echo "4. Monitor database performance during peak load"

# Optional: Open the first HTML report
if command -v xdg-open &> /dev/null; then
    echo ""
    echo -e "${YELLOW}Opening first performance report...${NC}"
    xdg-open "$RESULTS_DIR/basic_read_light.html" 2>/dev/null &
elif command -v open &> /dev/null; then
    echo ""
    echo -e "${YELLOW}Opening first performance report...${NC}"
    open "$RESULTS_DIR/basic_read_light.html" 2>/dev/null &
fi