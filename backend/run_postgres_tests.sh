#!/bin/bash
# Script to run PostgreSQL-based tests for Batch 3 requirements
# Implements direct testing of production triggers by running tests on PostgreSQL

set -e

echo "🐘 Starting PostgreSQL test environment..."

# Check if Docker and docker-compose are available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is required but not installed"
    exit 1
fi

# Start PostgreSQL test container
echo "Starting PostgreSQL test database..."
docker-compose -f docker-compose.test.yml up -d postgres-test

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker-compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U thermacore_test -d thermacore_test > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 1
done

if [ $i -eq 30 ]; then
    echo "❌ PostgreSQL failed to start within 30 seconds"
    docker-compose -f docker-compose.test.yml down
    exit 1
fi

# Set environment variables for PostgreSQL testing
export USE_POSTGRES_TESTS=true
export POSTGRES_TEST_URL=postgresql://thermacore_test:test_password@localhost:5433/thermacore_test

# Run PostgreSQL-specific tests
echo "🧪 Running PostgreSQL timestamp tests..."
python -m pytest app/tests/test_postgres_timestamps.py -v

# Run all tests with PostgreSQL
echo "🧪 Running all tests with PostgreSQL backend..."
python -m pytest app/tests/ -v --tb=short

# Cleanup
echo "🧹 Cleaning up..."
docker-compose -f docker-compose.test.yml down

echo "✅ PostgreSQL tests completed!"