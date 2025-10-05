#!/bin/bash
set -e

echo "=== ThermaCoreApp Docker Infrastructure Test ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_step() {
    echo -e "${YELLOW}Testing: $1${NC}"
    if eval "$2"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Change to repo directory
cd "$(dirname "$0")"

# Ensure .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    # Generate secure keys
    SECRET_KEY=$(openssl rand -hex 32)
    JWT_SECRET_KEY=$(openssl rand -hex 32)
    sed -i "s/your-secret-key-here-change-in-production/$SECRET_KEY/" .env
    sed -i "s/^JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$JWT_SECRET_KEY/" .env
    echo ".env file created with secure keys"
fi

# Test 1: Docker Compose config validation
test_step "Docker Compose configuration" "docker-compose config > /dev/null"

# Test 2: Start services
echo "Starting services..."
docker-compose up -d
sleep 15

# Test 3: Database health
test_step "Database health check" "docker-compose exec -T db pg_isready -U postgres -d thermacore_db"

# Test 4: TimescaleDB extension
test_step "TimescaleDB extension" "docker-compose exec -T db psql -U postgres -d thermacore_db -c \"SELECT extname FROM pg_extension WHERE extname='timescaledb';\" | grep -q timescaledb"

# Test 5: Backend API
sleep 5  # Give backend a bit more time to start
test_step "Backend health endpoint" "curl -f http://localhost:5000/api/v1/health"

# Test 6: Frontend
test_step "Frontend accessibility" "curl -f -I http://localhost/ 2>/dev/null | head -n 1 | grep -q 200"

# Test 7: Database tables
test_step "Database tables exist" "docker-compose exec -T db psql -U postgres -d thermacore_db -c '\dt' | grep -q users"

# Test 8: Seed data
test_step "Seed data loaded" "docker-compose exec -T db psql -U postgres -d thermacore_db -tAc 'SELECT COUNT(*) FROM roles;' | grep -qE '^[1-9][0-9]*$|^[1-9]$'"

# Test 9: Container status
test_step "All containers running" "[ $(docker-compose ps | grep -c 'Up') -eq 3 ]"

# Summary
echo "========================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo "========================="

# Cleanup
echo ""
read -p "Do you want to clean up (stop containers)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down
    echo "Cleanup complete"
fi

exit $TESTS_FAILED
