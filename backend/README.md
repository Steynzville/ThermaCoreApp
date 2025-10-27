# ThermaCore SCADA API Backend

> **Last Reviewed**: October 2024  
> **Status**: Current and Accurate

A comprehensive REST API backend for the ThermaCore SCADA system, built with Flask, SQLAlchemy, and TimescaleDB for time-series data management.

## 🚀 Features

- **RESTful API** with comprehensive CRUD operations
- **JWT-based authentication** with role-based access control (RBAC)
- **TimescaleDB integration** for efficient time-series sensor data
- **Comprehensive validation** using Marshmallow schemas
- **OpenAPI/Swagger documentation** with interactive interface
- **Performance testing suite** with Locust
- **Complete test coverage** with unit and integration tests
- **Database migrations** with setup and seed scripts

## 📋 Phase 1 Implementation Status

✅ **Completed Tasks:**

1. **TimescaleDB Setup & Schema Design**
   - PostgreSQL + TimescaleDB database schema
   - Time-series optimized sensor readings table
   - Complete data model supporting all application needs

2. **Database Migration Scripts**
   - Initial schema setup (`001_initial_schema.sql`)
   - Seed data with default users, roles, permissions (`002_seed_data.sql`)
   - CLI commands for database initialization

3. **Flask Backend Project**
   - Modern Flask application structure
   - Configuration management for different environments
   - Database connection with connection pooling

4. **API Routes for Units**
   - Complete CRUD operations for units
   - Advanced filtering and pagination
   - Unit status management
   - Sensor management per unit
   - Time-series sensor readings retrieval

5. **Data Models & Serializers**
   - SQLAlchemy models for all entities
   - Marshmallow schemas for validation/serialization
   - Proper relationships and constraints

6. **JWT Authentication & Authorization**
   - User registration/login with JWT tokens
   - Role-based access control (Admin, Operator, Viewer)
   - Permission-based endpoint protection
   - Secure password hashing with bcrypt

7. **Comprehensive Testing**
   - Unit tests for authentication flows
   - Integration tests for API endpoints
   - Permission-based access testing
   - Database consistency testing

8. **OpenAPI/Swagger Documentation**
   - Auto-generated API documentation
   - Interactive Swagger UI
   - Complete endpoint specifications

9. **Performance Testing**
   - Locust-based performance test suite
   - Multiple test scenarios (read-heavy, CRUD, sensor data)
   - Automated performance reporting

## 🏗️ Architecture

```
backend/
├── app/                    # Application package
│   ├── models/            # SQLAlchemy data models
│   ├── routes/            # API route blueprints
│   │   ├── auth.py        # Authentication routes
│   │   ├── units.py       # Units management routes
│   │   └── users.py       # User management routes
│   ├── utils/             # Utility functions and schemas
│   │   ├── schemas.py     # Marshmallow validation schemas
│   │   └── helpers.py     # Helper functions
│   └── tests/             # Test suite
├── migrations/            # Database migration scripts
├── scripts/               # Utility scripts
├── docs/                  # Generated documentation
└── config.py             # Configuration management
```

## 🛠️ Installation & Setup

### Prerequisites

- Python 3.9+
- PostgreSQL 13+ with TimescaleDB extension
- pip or pipenv for dependency management

### 1. Clone and Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb thermacore_db

# Install TimescaleDB extension
psql thermacore_db -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Copy environment configuration
cp .env.example .env

# Edit .env with your Neon database credentials
# Example Neon connection string (replace placeholders):
# postgres://[user]:[password]@[neon-hostname].neon.tech/[dbname]?sslmode=require
# DATABASE_URL=postgresql://[YOUR_DB_USER]:[YOUR_DB_PASSWORD]@[your-endpoint].ap-southeast-2.aws.neon.tech/thermacore_db?sslmode=require
```

### 3. Initialize Database

```bash
# Initialize database with schema and seed data
flask init-db

# Or create custom admin user
flask create-admin
```

### 4. Run Development Server

```bash
python run.py
```

The API will be available at `http://localhost:5000`

## 🔐 Authentication & Authorization

### Roles & Permissions

| Role | Permissions | Description |
|------|-------------|-------------|
| **Admin** | All permissions | Full system access |
| **Operator** | read_units, write_units, read_users | Operational access |
| **Viewer** | read_units, read_users | Read-only access |

### Default Users

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| `admin` | `admin123` | Admin | System administrator |

### API Authentication

```bash
# Login to get JWT token
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Use token in subsequent requests
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/v1/units
```

## 📊 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `GET /api/v1/auth/me` - Get current user info
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/register` - Register new user (admin only)

### Units Management
- `GET /api/v1/units` - List units with filtering/pagination
- `GET /api/v1/units/{id}` - Get specific unit
- `POST /api/v1/units` - Create new unit
- `PUT /api/v1/units/{id}` - Update unit
- `DELETE /api/v1/units/{id}` - Delete unit
- `PATCH /api/v1/units/{id}/status` - Update unit status
- `GET /api/v1/units/stats` - Get unit statistics

### Sensors & Readings
- `GET /api/v1/units/{id}/sensors` - Get unit sensors
- `POST /api/v1/units/{id}/sensors` - Create sensor for unit
- `GET /api/v1/units/{id}/readings` - Get sensor readings with time filters

### User Management
- `GET /api/v1/users` - List users
- `GET /api/v1/users/{id}` - Get specific user
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user (soft delete)
- `GET /api/v1/roles` - Get available roles

### System
- `GET /health` - Health check endpoint

## 🔧 Diagnostic Tools

### API Endpoint Diagnostics

For debugging login and dashboard issues, use the provided diagnostic scripts:

#### Python Diagnostic Script (Recommended)

```bash
python backend/diagnose_api_endpoints.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD
```

**Features:**
- ✅ Tests health, login, and dashboard endpoints
- ✅ Automatically extracts and uses JWT tokens
- ✅ Color-coded output with detailed analysis
- ✅ Actionable recommendations for fixing issues

#### Bash Diagnostic Script

```bash
./scripts/diagnose-api-endpoints.sh https://thermacoreapp.onrender.com admin YOUR_PASSWORD
```

**Features:**
- ✅ Pure curl-based testing (no Python required)
- ✅ Automatic token extraction
- ✅ JSON pretty-printing

#### Simple Login Test

```bash
python backend/test_login_endpoint.py https://thermacoreapp.onrender.com admin YOUR_PASSWORD
```

### When to Use Diagnostic Tools

Run these scripts when experiencing:
- Blank page after login
- Spinner appearing then disappearing
- Authentication failures
- Dashboard access issues

### What the Diagnostics Test

1. **Health Endpoint** - Verifies backend is running
2. **Login Endpoint** - Tests authentication and JWT token generation
3. **Dashboard Endpoint** - Tests authenticated access to dashboard data

### Comprehensive Documentation

For detailed debugging guidance, see:
- `API_DIAGNOSTICS_GUIDE.md` - Complete diagnostic guide
- `QUICK_API_TEST_COMMANDS.md` - Quick curl command reference
- `AUTHENTICATION_500_ERROR_FIX.md` - Known authentication issues

## 🔍 API Usage Examples

### Get Units with Filtering

```bash
# Get online units with pagination
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/v1/units?status=online&page=1&per_page=10"

# Search units
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/v1/units?search=ThermaCore"

# Filter by health status
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/v1/units?health_status=critical"
```

### Create New Unit

```bash
curl -X POST http://localhost:5000/api/v1/units \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TC999",
    "name": "Test Unit 999",
    "serial_number": "TC999-2024-001",
    "install_date": "2024-01-15T00:00:00",
    "location": "Test Site",
    "client_name": "Test Client",
    "client_email": "test@client.com"
  }'
```

### Get Sensor Readings

```bash
# Get last 24 hours of readings
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/v1/units/TC001/readings?hours=24"

# Get temperature readings only
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/v1/units/TC001/readings?sensor_type=temperature&hours=6"
```

## 🧪 Testing

### Run Unit Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest app/tests/test_auth.py -v
```

### Run Performance Tests

```bash
# Install Locust for performance testing
pip install locust

# Run automated performance test suite
./scripts/run_performance_tests.sh

# Or run individual test scenarios
locust -f scripts/performance_tests.py --host=http://localhost:5000 ThermaCoreSCADAUser
```

## 📖 Documentation

### Generate API Documentation

```bash
# Generate OpenAPI spec and HTML docs
python scripts/generate_docs.py

# Serve documentation
cd docs && python -m http.server 8080
# Visit http://localhost:8080
```

### View Interactive API Docs

When the server is running, visit:
- Swagger UI: `http://localhost:5000/apidocs/`
- Health Check: `http://localhost:5000/health`

## ⚡ Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| 95th percentile response time | < 1000ms | For all endpoints |
| Average response time | < 500ms | Standard operations |
| Throughput | > 100 req/sec | Concurrent operations |
| Error rate | < 1% | Under normal load |
| Database query time | < 100ms | Simple read operations |

## 🏗️ Database Schema

### Core Tables

- **users**: System users with authentication
- **roles**: User roles (admin, operator, viewer)  
- **permissions**: Granular permissions
- **role_permissions**: Role-permission mapping
- **units**: ThermaCore unit devices
- **sensors**: Sensors attached to units
- **sensor_readings**: Time-series sensor data (TimescaleDB hypertable)

### Key Features

- **TimescaleDB hypertable** for efficient time-series queries
- **Foreign key constraints** for data integrity
- **Indexes** on frequently queried fields
- **Triggers** for automatic timestamp updates

## 🚀 Deployment

### Environment Variables

```bash
# Production configuration
FLASK_ENV=production
# Example Neon connection string (replace placeholders):
# postgres://[user]:[password]@[neon-hostname].neon.tech/[dbname]?sslmode=require
DATABASE_URL=postgresql://[YOUR_DB_USER]:[YOUR_DB_PASSWORD]@[your-endpoint].ap-southeast-2.aws.neon.tech/thermacore_db?sslmode=require
SECRET_KEY=your-super-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
```

### Certificate Generation for MQTT and OPC-UA

The application includes automatic certificate generation for secure MQTT and OPC-UA connections:

```bash
# Generate certificates (included in build process)
python generate_certs.py
```

This creates self-signed certificates for:
- **MQTT**: CA, client, and server trust certificates
- **OPC-UA**: Client and trust certificates

**For Render deployment**, update the build command to:
```bash
pip install pyopenssl && python backend/generate_certs.py && pip install -r backend/requirements.txt
```

See [CERTIFICATE_GENERATION_DEPLOYMENT.md](CERTIFICATE_GENERATION_DEPLOYMENT.md) for detailed deployment instructions.

### Docker Deployment (Future Enhancement)

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "run.py"]
```

## 🔧 Configuration

The application supports multiple environments through configuration classes:

- **Development**: Debug enabled, local database
- **Production**: Optimized for production deployment  
- **Testing**: Isolated test database, debug enabled

## 📝 Database Setup & Migrations

### CLI Commands

```bash
# Initialize database with schema and data
flask init-db

# Create admin user interactively
flask create-admin
```

### Manual Migrations

If needed, migrations can be applied manually:

```bash
# Run migrations in order
psql -d thermacore_db -f migrations/001_initial_schema.sql
psql -d thermacore_db -f migrations/002_seed_data.sql
psql -d thermacore_db -f migrations/003_update_rbac_security.sql
psql -d thermacore_db -f migrations/004_fix_null_roles.sql
```

## 🛡️ Security Features

- **JWT-based authentication** with configurable expiration
- **Role-based access control** with granular permissions
- **Password hashing** using bcrypt
- **Input validation** using Marshmallow schemas
- **SQL injection protection** through SQLAlchemy ORM
- **CORS configuration** for cross-origin requests

## 📊 Monitoring & Health

### Health Check Endpoints

#### Immediate Health Check (for Render deployment)

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "healthy",
  "service": "ThermaCore SCADA Backend",
  "version": "2.9.0",
  "timestamp": "2025-10-26T09:33:25.915Z",
  "coverage": {
    "frontend": "61.12%",
    "backend": "63.12%"
  }
}
```

#### Detailed Health Check (comprehensive service status)

```bash
curl http://localhost:5000/health/detailed
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-26T09:33:25.915Z",
  "services": {
    "database": "connected",
    "websocket": "ready",
    "anomaly_detection": "initialized",
    "protocol_simulator": "active"
  },
  "tests_passing": 2317,
  "coverage": {
    "frontend": "61.12%",
    "backend": "63.12%"
  }
}
```

### Performance Monitoring

Use the included performance test scripts to monitor:
- Response times under various loads
- Database query performance
- Concurrent user handling
- Error rates and failure scenarios

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check PostgreSQL is running
   pg_isready -d thermacore_db
   
   # Verify TimescaleDB extension
   psql -d thermacore_db -c "SELECT * FROM pg_extension WHERE extname='timescaledb';"
   ```

2. **Authentication Failures**
   ```bash
   # Verify JWT secret key is set
   echo $JWT_SECRET_KEY
   
   # Check user exists and is active
   psql -d thermacore_db -c "SELECT username, is_active FROM users;"
   ```

3. **Permission Denied Errors**
   ```bash
   # Check user role and permissions
   psql -d thermacore_db -c "
   SELECT u.username, r.name as role, p.name as permission 
   FROM users u 
   JOIN roles r ON u.role_id = r.id 
   JOIN role_permissions rp ON r.id = rp.role_id 
   JOIN permissions p ON rp.permission_id = p.id;"
   ```

## 🤝 Contributing

1. Follow PEP 8 style guidelines
2. Add tests for new functionality
3. Update documentation for API changes
4. Run performance tests for significant changes

## 📄 License

MIT License - see LICENSE file for details

---

## 🎯 Next Steps (Future Phases)

- **Phase 2**: Real-time data streaming with WebSockets
- **Phase 3**: Advanced analytics and reporting
- **Phase 4**: Integration with external SCADA systems
- **Phase 5**: Mobile API endpoints and push notifications

For questions or support, contact the ThermaCore API team.