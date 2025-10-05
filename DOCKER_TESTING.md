# Docker Infrastructure Testing Instructions

This document provides comprehensive testing instructions for the ThermaCoreApp Docker infrastructure.

## Prerequisites for Testing

- Docker Engine 20.10.0 or higher
- Docker Compose 1.29.0 or higher
- At least 4GB of available RAM
- Ports 80, 5000, and 5432 available

## Test Plan

### Phase 1: Build Validation

#### Test 1.1: Backend Docker Build
```bash
cd ThermaCoreApp/backend
docker build -t thermacore-backend-test .
```

**Expected Result:**
- Build completes successfully without errors
- All Python dependencies install correctly
- Final image is created

**Success Criteria:**
- Exit code 0
- Image tagged as `thermacore-backend-test`
- No error messages in build log

#### Test 1.2: Frontend Docker Build
```bash
cd ThermaCoreApp
docker build -f src/Dockerfile -t thermacore-frontend-test .
```

**Expected Result:**
- Multi-stage build completes successfully
- pnpm install works correctly
- Vite build produces dist folder
- Nginx stage completes

**Success Criteria:**
- Exit code 0
- Image tagged as `thermacore-frontend-test`
- Build output shows successful compilation

#### Test 1.3: Docker Compose Validation
```bash
cd ThermaCoreApp
docker-compose config
```

**Expected Result:**
- Configuration is valid YAML
- All environment variables are properly referenced
- Service dependencies are correctly defined

**Success Criteria:**
- Valid YAML output
- No syntax errors
- All services listed (db, backend, frontend)

### Phase 2: Service Startup

#### Test 2.1: Database Service
```bash
docker-compose up -d db
docker-compose ps db
docker-compose logs db
```

**Expected Result:**
- Database container starts successfully
- TimescaleDB extension loads
- Health check passes
- Ready to accept connections

**Success Criteria:**
- Container status: Up (healthy)
- Logs show: "database system is ready to accept connections"
- TimescaleDB extension loaded
- Port 5432 accessible

**Validation Commands:**
```bash
# Check database is accepting connections
docker-compose exec db pg_isready -U postgres -d thermacore_db

# Verify TimescaleDB extension
docker-compose exec db psql -U postgres -d thermacore_db -c "SELECT extname, extversion FROM pg_extension WHERE extname='timescaledb';"
```

#### Test 2.2: Backend Service
```bash
docker-compose up -d backend
docker-compose ps backend
docker-compose logs backend
```

**Expected Result:**
- Backend container starts successfully
- Connects to database
- Gunicorn starts with 4 workers
- Flask application initializes

**Success Criteria:**
- Container status: Up
- Gunicorn running on 0.0.0.0:5000
- No database connection errors
- No Python errors in logs

**Validation Commands:**
```bash
# Check backend health
curl -f http://localhost:5000/api/v1/health || echo "Health check failed"

# Check Gunicorn processes
docker-compose exec backend ps aux | grep gunicorn

# Verify database connection
docker-compose exec backend python -c "from app import create_app, db; app = create_app(); app.app_context().push(); print('DB connection:', db.engine.url)"
```

#### Test 2.3: Frontend Service
```bash
docker-compose up -d frontend
docker-compose ps frontend
docker-compose logs frontend
```

**Expected Result:**
- Frontend container starts successfully
- Nginx serves static files
- Configuration is loaded correctly

**Success Criteria:**
- Container status: Up
- Nginx running on port 80
- Static files accessible

**Validation Commands:**
```bash
# Check frontend loads
curl -I http://localhost/ | head -n 1

# Verify Nginx is running
docker-compose exec frontend ps aux | grep nginx
```

### Phase 3: Full Stack Integration

#### Test 3.1: Complete Stack Startup
```bash
docker-compose down -v
docker-compose up -d
docker-compose ps
```

**Expected Result:**
- All services start in correct order (db → backend → frontend)
- All health checks pass
- No errors in logs

**Success Criteria:**
- 3 containers running (db, backend, frontend)
- All containers show "Up" status
- Database shows "healthy" status

#### Test 3.2: Database Schema Initialization
```bash
# Check if tables exist
docker-compose exec db psql -U postgres -d thermacore_db -c "\dt"

# Check for seed data
docker-compose exec db psql -U postgres -d thermacore_db -c "SELECT COUNT(*) FROM roles;"
docker-compose exec db psql -U postgres -d thermacore_db -c "SELECT COUNT(*) FROM permissions;"
```

**Expected Result:**
- All required tables exist
- Seed data is loaded
- TimescaleDB hypertable created for sensor_readings

**Success Criteria:**
- Tables: users, roles, permissions, role_permissions, units, sensors, sensor_readings, etc.
- At least 3 roles (admin, operator, viewer)
- At least 10 permissions
- sensor_readings is a hypertable

**Validation Commands:**
```bash
# Verify hypertable
docker-compose exec db psql -U postgres -d thermacore_db -c "SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name='sensor_readings';"
```

#### Test 3.3: API Endpoints
```bash
# Test health endpoint
curl http://localhost:5000/api/v1/health

# Test authentication endpoint
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**Expected Result:**
- Health endpoint returns 200 OK
- Login endpoint returns JWT token
- API documentation accessible

**Success Criteria:**
- Health check returns `{"status": "healthy"}`
- Login returns access_token
- API docs available at http://localhost:5000/apidocs

#### Test 3.4: Frontend-Backend Integration
```bash
# Test frontend loads
curl http://localhost/

# Check if frontend can reach backend (via browser network tab or proxy)
curl -I http://localhost/
```

**Expected Result:**
- Frontend HTML loads correctly
- JavaScript bundle loads
- Frontend can communicate with backend

**Success Criteria:**
- HTTP 200 response
- HTML contains React app root div
- No CORS errors in browser console

### Phase 4: Environment Configuration

#### Test 4.1: Environment Variables
```bash
# Create test .env file
cat > .env << EOF
DB_NAME=test_db
DB_USER=test_user
DB_PASSWORD=test_password
SECRET_KEY=test-secret-key-$(openssl rand -hex 16)
JWT_SECRET_KEY=test-jwt-key-$(openssl rand -hex 16)
EOF

# Restart with new config
docker-compose down -v
docker-compose up -d db

# Verify environment variables are applied
docker-compose exec db psql -U test_user -d test_db -c "SELECT current_database();"
```

**Expected Result:**
- Database created with custom name
- Custom user has access
- Backend uses environment variables

**Success Criteria:**
- Database name matches DB_NAME
- User can connect
- No default credentials used

#### Test 4.2: Volume Persistence
```bash
# Create test data
docker-compose exec db psql -U postgres -d thermacore_db -c "INSERT INTO units (name, description, status) VALUES ('Test Unit', 'Test Description', 'active') RETURNING id;"

# Restart containers
docker-compose restart

# Check data persists
docker-compose exec db psql -U postgres -d thermacore_db -c "SELECT * FROM units WHERE name='Test Unit';"
```

**Expected Result:**
- Data persists after container restart
- Volume maintains database state

**Success Criteria:**
- Test data exists after restart
- No data loss

### Phase 5: Error Handling & Recovery

#### Test 5.1: Database Connection Failure
```bash
# Stop database
docker-compose stop db

# Check backend response
docker-compose logs backend --tail 20

# Restart database
docker-compose start db

# Verify recovery
docker-compose logs backend --tail 10
```

**Expected Result:**
- Backend handles database disconnect gracefully
- Reconnects when database comes back online

**Success Criteria:**
- No crashes
- Connection pool recovers
- Application continues working

#### Test 5.2: Container Resource Limits
```bash
# Check container resource usage
docker stats --no-stream

# Monitor during load
docker stats
```

**Expected Result:**
- Containers stay within reasonable resource limits
- No memory leaks
- CPU usage is appropriate

#### Test 5.3: Log Output
```bash
# Check all logs for errors
docker-compose logs | grep -i error
docker-compose logs | grep -i warning
```

**Expected Result:**
- No critical errors
- Only expected warnings
- Structured log format

### Phase 6: Security Validation

#### Test 6.1: Default Credentials
```bash
# Verify .env is not committed
git ls-files .env

# Check .dockerignore excludes sensitive files
grep -E "\.env|password|secret" .dockerignore backend/.dockerignore
```

**Expected Result:**
- .env file not in version control
- Sensitive files excluded from Docker builds

#### Test 6.2: Network Isolation
```bash
# Check network configuration
docker network ls
docker network inspect thermacore_default
```

**Expected Result:**
- Services on isolated network
- Only exposed ports are accessible from host

#### Test 6.3: File Permissions
```bash
# Check certificate directory
docker-compose exec backend ls -la /app/certs
```

**Expected Result:**
- Mounted volumes have correct permissions
- Certificates are read-only

### Phase 7: Cleanup & Maintenance

#### Test 7.1: Clean Shutdown
```bash
docker-compose down
docker-compose ps
```

**Expected Result:**
- All containers stop cleanly
- No running containers remain

#### Test 7.2: Volume Cleanup
```bash
docker-compose down -v
docker volume ls | grep thermacore
```

**Expected Result:**
- Volumes removed when specified
- No orphaned volumes

#### Test 7.3: Image Cleanup
```bash
docker-compose down --rmi all
docker images | grep thermacore
```

**Expected Result:**
- Images removed when specified
- Clean state achieved

## Automated Testing Script

Save this as `test-docker-infrastructure.sh`:

```bash
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

# Test 1: Docker Compose config validation
test_step "Docker Compose configuration" "docker-compose config > /dev/null"

# Test 2: Start services
echo "Starting services..."
docker-compose up -d
sleep 10

# Test 3: Database health
test_step "Database health check" "docker-compose exec -T db pg_isready -U postgres -d thermacore_db"

# Test 4: TimescaleDB extension
test_step "TimescaleDB extension" "docker-compose exec -T db psql -U postgres -d thermacore_db -c \"SELECT extname FROM pg_extension WHERE extname='timescaledb';\" | grep -q timescaledb"

# Test 5: Backend API
test_step "Backend health endpoint" "curl -f http://localhost:5000/api/v1/health"

# Test 6: Frontend
test_step "Frontend accessibility" "curl -f -I http://localhost/ | head -n 1 | grep -q 200"

# Test 7: Database tables
test_step "Database tables exist" "docker-compose exec -T db psql -U postgres -d thermacore_db -c '\dt' | grep -q users"

# Test 8: Seed data
test_step "Seed data loaded" "docker-compose exec -T db psql -U postgres -d thermacore_db -c 'SELECT COUNT(*) FROM roles;' | grep -q -E '[1-9]'"

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
```

## Manual Validation Checklist

Use this checklist to manually verify the Docker infrastructure:

- [ ] All Docker files exist (docker-compose.yml, Dockerfiles, .dockerignore)
- [ ] .env.example file exists with all required variables
- [ ] docker-compose config validates successfully
- [ ] Backend Dockerfile builds without errors
- [ ] Frontend Dockerfile builds without errors
- [ ] Database container starts and becomes healthy
- [ ] Backend container starts and connects to database
- [ ] Frontend container starts and serves content
- [ ] Database schema is initialized automatically
- [ ] TimescaleDB extension is enabled
- [ ] Seed data is loaded correctly
- [ ] Health endpoint returns 200 OK
- [ ] Login endpoint returns JWT token
- [ ] Frontend loads in browser
- [ ] Frontend can communicate with backend
- [ ] No CORS errors in browser console
- [ ] Logs show no critical errors
- [ ] Data persists after container restart
- [ ] Environment variables are properly applied
- [ ] Sensitive files are excluded from Docker builds
- [ ] .env file is not committed to git
- [ ] Documentation is clear and accurate
- [ ] Clean shutdown works correctly

## Continuous Integration Testing

For CI/CD pipelines, add this to your GitHub Actions workflow:

```yaml
name: Docker Infrastructure Tests

on: [push, pull_request]

jobs:
  docker-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Create .env file
      run: |
        cat > .env << EOF
        SECRET_KEY=$(openssl rand -hex 32)
        JWT_SECRET_KEY=$(openssl rand -hex 32)
        DB_PASSWORD=$(openssl rand -hex 16)
        EOF
    
    - name: Build and start services
      run: docker-compose up -d
    
    - name: Wait for services
      run: sleep 30
    
    - name: Test database
      run: docker-compose exec -T db pg_isready -U postgres -d thermacore_db
    
    - name: Test backend
      run: curl -f http://localhost:5000/api/v1/health
    
    - name: Test frontend
      run: curl -f http://localhost/
    
    - name: View logs on failure
      if: failure()
      run: docker-compose logs
    
    - name: Cleanup
      if: always()
      run: docker-compose down -v
```

## Troubleshooting Failed Tests

### Database Fails to Start
- Check Docker logs: `docker-compose logs db`
- Verify port 5432 is not in use: `lsof -i :5432`
- Check volume permissions: `docker volume inspect thermacore_pgdata`

### Backend Fails to Connect
- Verify database is healthy: `docker-compose ps db`
- Check environment variables: `docker-compose config`
- Review backend logs: `docker-compose logs backend`

### Frontend Build Fails
- Check Node.js version in Dockerfile
- Verify pnpm-lock.yaml exists
- Review build logs: `docker-compose logs frontend`

### Tests Timeout
- Increase wait time in test scripts
- Check system resources: `docker stats`
- Verify network connectivity: `docker network ls`
