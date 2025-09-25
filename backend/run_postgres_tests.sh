#!/bin/bash
# Script to run PostgreSQL-based tests for Batch 3 requirements
# Implements direct testing of production triggers by running tests on PostgreSQL

set -e

echo "🐘 Starting PostgreSQL test environment..."

# Configuration - make port configurable
POSTGRES_TEST_PORT=${POSTGRES_TEST_PORT:-5433}
DOCKER_COMPOSE_FILE=${DOCKER_COMPOSE_FILE:-docker-compose.test.yml}

# Export port to be available for docker-compose environment substitution
export POSTGRES_TEST_PORT

echo "Using PostgreSQL test port: $POSTGRES_TEST_PORT"
echo "Using docker-compose file: $DOCKER_COMPOSE_FILE"

# Check if Docker and docker-compose are available
if ! command -v docker-compose &> /dev/null; then
    # Fallback to 'docker compose' (newer Docker installations)
    if command -v docker &> /dev/null && docker compose version &> /dev/null; then
        echo "Using 'docker compose' (Docker Compose V2)"
        COMPOSE_CMD="docker compose"
    else
        echo "❌ Neither docker-compose nor 'docker compose' is available"
        echo "Please install Docker Compose to run PostgreSQL tests"
        exit 1
    fi
else
    echo "Using 'docker-compose' (Docker Compose V1)"
    COMPOSE_CMD="docker-compose"
fi

# Start PostgreSQL test container
echo "Starting PostgreSQL test database..."
$COMPOSE_CMD -f $DOCKER_COMPOSE_FILE up -d postgres-test

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if $COMPOSE_CMD -f $DOCKER_COMPOSE_FILE exec -T postgres-test pg_isready -U thermacore_test -d thermacore_test > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 1
done

if [ $i -eq 30 ]; then
    echo "❌ PostgreSQL failed to start within 30 seconds"
    $COMPOSE_CMD -f $DOCKER_COMPOSE_FILE down
    exit 1
fi

# Set environment variables for PostgreSQL testing - use configurable port
export USE_POSTGRES_TESTS=true
export POSTGRES_TEST_URL=postgresql://thermacore_test:test_password@localhost:$POSTGRES_TEST_PORT/thermacore_test

# Run all tests with PostgreSQL backend (includes PostgreSQL-specific tests)
echo "🧪 Running all tests with PostgreSQL backend..."
python -m pytest app/tests/ -v --tb=short

# Cleanup
echo "🧹 Cleaning up..."
$COMPOSE_CMD -f $DOCKER_COMPOSE_FILE down

echo "✅ PostgreSQL tests completed!"