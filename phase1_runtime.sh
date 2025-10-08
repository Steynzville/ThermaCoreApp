#!/usr/bin/env bash
set -e
echo "🔧 Phase 1: Runtime & Environment Stabilization"

cat > .env.test <<'EOF'
# Test Environment Configuration
FLASK_ENV=testing
FLASK_DEBUG=False
SECRET_KEY=test-secret-key-not-for-production
TESTING=true

# JWT Configuration
JWT_SECRET_KEY=test-jwt-secret-key-not-for-production
JWT_ACCESS_TOKEN_EXPIRES=3600

# Database Configuration (SQLite for tests)
DATABASE_URL=sqlite:///test.db
SQLALCHEMY_DATABASE_URI=sqlite:///test.db

# API Configuration
API_VERSION=v1
API_PREFIX=/api/v1

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# MQTT Configuration (disabled for tests)
MQTT_BROKER_HOST=
MQTT_BROKER_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=thermacore_test
MQTT_KEEPALIVE=60

# WebSocket Configuration
WEBSOCKET_CORS_ORIGINS=*
WEBSOCKET_PING_TIMEOUT=60
WEBSOCKET_PING_INTERVAL=25

# OPC UA Configuration (disabled for tests)
OPCUA_SERVER_URL=
OPCUA_USERNAME=
OPCUA_PASSWORD=
OPCUA_SECURITY_POLICY=None
OPCUA_SECURITY_MODE=None
OPCUA_TIMEOUT=30

# Modbus Configuration
MODBUS_LOG_SENSITIVE_DATA=false

# Test-specific settings
USE_POSTGRES_TESTS=false
EOF

echo "✓ Created .env.test"

# Create safe_app pytest fixture if it doesn't exist
cd backend

# Check if conftest.py already has safe_app fixture
if ! grep -q "def safe_app" app/tests/conftest.py; then
    echo "Adding safe_app fixture to conftest.py..."
    
    # Backup existing conftest.py
    cp app/tests/conftest.py app/tests/conftest.py.backup
    
    # Add safe_app fixture at the end
    cat >> app/tests/conftest.py <<'EOF'


@pytest.fixture(scope='function')
def safe_app():
    """Create a safe isolated app instance for testing.
    
    This fixture creates a completely isolated Flask app instance
    with its own temporary database, useful for tests that need
    to modify app configuration or database schema.
    """
    import tempfile
    db_fd, db_path = tempfile.mkstemp()
    
    # Override database URL for this isolated test
    from config import TestingConfig
    original_db_uri = TestingConfig.SQLALCHEMY_DATABASE_URI
    TestingConfig.SQLALCHEMY_DATABASE_URI = f'sqlite:///{db_path}'
    
    test_app = create_app('testing')
    test_app.config['TESTING'] = True
    test_app.config['WTF_CSRF_ENABLED'] = False
    
    with test_app.app_context():
        _init_database()
        yield test_app
    
    # Restore original config
    TestingConfig.SQLALCHEMY_DATABASE_URI = original_db_uri
    
    # Clean up temp database
    os.close(db_fd)
    os.unlink(db_path)
EOF
    echo "✓ Added safe_app fixture to conftest.py"
else
    echo "✓ safe_app fixture already exists in conftest.py"
fi

# Commit runtime stabilization files
cd ..
git add .env.test backend/app/tests/conftest.py 2>/dev/null || true

echo "✅ Phase 1 Complete: Runtime environment stabilized"
echo "   - .env.test created"
echo "   - safe_app pytest fixture available"
