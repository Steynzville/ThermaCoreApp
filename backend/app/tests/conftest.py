"""Test configuration for ThermaCore SCADA API tests."""

import importlib
import logging
import os
import traceback

import pytest
from sqlalchemy import event, inspect, text

from app import create_app, db
from app.models import Permission, Role, Sensor, SensorReading, Unit, User  # noqa: F401

logger = logging.getLogger(__name__)


def _init_database():
    """Initialize database with schema."""
    # Check if we're using PostgreSQL for tests
    use_postgres = os.environ.get("USE_POSTGRES_TESTS", "false").lower() == "true"

    logger.info(f"\n{'=' * 70}")
    logger.info("Database Initialization - Debug Output")
    logger.info(f"{'=' * 70}")
    logger.info(f"Database Type: {'PostgreSQL' if use_postgres else 'SQLite'}")
    logger.info(f"Database URI: {db.engine.url}")

    try:
        if use_postgres:
            migrations_dir = os.path.join(
                os.path.dirname(__file__),
                "../../migrations",
            )

            # Apply migrations in dependency order
            # SKIP 002_seed_data.sql - _create_test_data() handles seeding
            # SKIP 007_add_user_profile_fields.sql - 008 is a superset
            sql_migration_files = [
                "001_initial_schema.sql",
                "003_update_rbac_security.sql",
                "004_fix_null_roles.sql",
                "005_add_password_reset_fields.sql",
                "006_add_emergency_admin_permissions.sql",  # Postgres version (has DO $$)
                "008_add_user_profile_fields_comprehensive.sql",
                "009_add_user_approval_columns.sql",
            ]

            for fname in sql_migration_files:
                path = os.path.join(migrations_dir, fname)
                if not os.path.exists(path):
                    logger.warning(f"Migration file not found: {path}, skipping")
                    continue
                with open(path) as f:
                    sql = f.read()
                logger.info(f"Applying migration: {fname}")
                db.session.execute(text(sql))

            # Apply multi-tenancy DDL manually (add_multi_tenancy.py uses SQLite syntax)
            logger.info("Applying multi-tenancy DDL...")
            db.session.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS tenants (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL UNIQUE,
                        slug VARCHAR(100) NOT NULL UNIQUE,
                        description TEXT,
                        contact_name VARCHAR(200),
                        contact_email VARCHAR(120),
                        contact_phone VARCHAR(50),
                        address_line1 VARCHAR(255),
                        address_line2 VARCHAR(255),
                        city VARCHAR(100),
                        state VARCHAR(100),
                        postal_code VARCHAR(20),
                        country VARCHAR(100),
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        max_users INTEGER,
                        max_units INTEGER,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """,
                ),
            )
            db.session.execute(
                text("CREATE INDEX IF NOT EXISTS idx_tenants_name ON tenants(name)"),
            )
            db.session.execute(
                text("CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)"),
            )
            db.session.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active)",
                ),
            )
            db.session.execute(
                text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id "
                    "INTEGER REFERENCES tenants(id)",
                ),
            )
            db.session.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)",
                ),
            )
            db.session.execute(
                text(
                    "ALTER TABLE units ADD COLUMN IF NOT EXISTS tenant_id "
                    "INTEGER REFERENCES tenants(id)",
                ),
            )
            db.session.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_units_tenant_id ON units(tenant_id)",
                ),
            )

            db.session.commit()
            logger.info("✓ PostgreSQL schema and migrations applied successfully")

        else:
            # For SQLite tests, use SQLAlchemy's create_all() which properly handles
            # enum types and other SQLAlchemy-specific features
            logger.info(
                "Using SQLAlchemy create_all() for SQLite schema initialization...",
            )
            logger.info(
                f"SQLAlchemy models to create: {list(db.Model.metadata.tables.keys())}",
            )

            # Drop all tables first to ensure clean state
            logger.info("Dropping existing tables (if any) to ensure clean state...")
            db.drop_all()
            logger.info("✓ Existing tables dropped")

            # Create all tables
            db.create_all()
            logger.info("✓ SQLite tables created successfully")

        # Verify tables were created
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        logger.info(f"\nTables created ({len(tables)}):")
        for table in sorted(tables):
            columns = inspector.get_columns(table)
            logger.info(f"  ✓ {table} ({len(columns)} columns)")
            for col in columns:
                logger.info(f"    - {col['name']} ({col['type']})")

        # Verify expected tables exist
        expected_tables = [
            "users",
            "roles",
            "permissions",
            "role_permissions",
            "units",
            "sensors",
            "sensor_readings",
            "tenants",
        ]
        missing_tables = [t for t in expected_tables if t not in tables]

        if missing_tables:
            logger.info(f"\n✗ ERROR: Missing expected tables: {missing_tables}")
            logger.info(f"Available tables: {tables}")
            raise RuntimeError(
                f"Database initialization incomplete - missing tables: {missing_tables}",
            )

        logger.info("\n✓ All expected tables verified")
        logger.info(f"{'=' * 70}\n")

    except Exception as e:
        # Rollback any failed transaction so debug queries can run
        try:
            db.session.rollback()
        except Exception:
            pass

        logger.info(f"\n{'=' * 70}")
        logger.info("✗ ERROR: Database initialization failed!")
        logger.info(f"{'=' * 70}")
        logger.info(f"Error type: {type(e).__name__}")
        logger.info(f"Error message: {e!s}")
        logger.info(f"Database type: {'PostgreSQL' if use_postgres else 'SQLite'}")
        logger.info(f"Database URI: {db.engine.url}")

        # Print full traceback for debugging
        logger.info("\nFull traceback:")
        logger.info(traceback.format_exc())

        # Try to get current table state for debugging
        try:
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            logger.info(f"\nExisting tables at time of error: {existing_tables}")
        except Exception as inspect_error:
            logger.info(f"Could not inspect database: {inspect_error}")

        logger.info(f"{'=' * 70}\n")

        # Re-raise the exception to fail the test setup
        raise


# SQLAlchemy event listener to restart savepoint after nested transaction ends
# This must be registered before any sessions are created
@event.listens_for(db.session, "after_transaction_end")
def restart_savepoint(session, transaction):
    """Restart savepoint after a nested transaction ends to maintain isolation.

    This is the standard SQLAlchemy recipe for test isolation with nested transactions.
    When a nested transaction (SAVEPOINT) is committed or rolled back, this listener
    automatically begins a new savepoint, ensuring isolation is maintained across
    multiple commits within a single test.
    """
    if transaction.nested and not transaction._parent.nested:
        session.begin_nested()


@pytest.fixture(scope="session")
def app():
    """Create application for the tests."""
    app = create_app("testing")
    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = False

    # Disable rate limiting for tests
    app.config["RATE_LIMIT_ENABLED"] = False

    # Set permissive CORS for tests
    app.config["CORS_ORIGINS"] = ["*"]
    app.config["WEBSOCKET_CORS_ORIGINS"] = ["*"]

    with app.app_context():
        _init_database()
        _create_test_data()
        yield app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def db_session(app):
    """Create database session for tests with proper transaction isolation.

    This fixture uses nested transactions (SAVEPOINT) to ensure that all database
    operations within a test are isolated and rolled back after the test completes.
    The event listener restarts the savepoint after each nested transaction ends,
    ensuring isolation is maintained across multiple commits within a single test.

    Note: This relies on TestingConfig using SQLite with StaticPool so all sessions
    share the same connection and SAVEPOINTs work across session boundaries.
    """
    with app.app_context():
        # Start a nested transaction (SAVEPOINT)
        db.session.begin_nested()
        yield db.session
        # Rollback the entire transaction to clean up
        try:
            if db.session.is_active:
                db.session.rollback()
        except Exception:
            # If rollback fails (e.g., savepoint doesn't exist), close the session
            db.session.close()


@pytest.fixture
def reset_service_manager():
    """Reset service_manager state before and after test."""
    from app.utils.service_manager import service_manager

    # Save current state
    saved_services = {}
    for name in list(service_manager._services.keys()):
        service = service_manager._services[name]
        saved_services[name] = {
            "enabled": service.enabled,
            "required": service.required,
        }
        if hasattr(service, "instance"):
            saved_services[name]["instance"] = service.instance
        if hasattr(service, "error"):
            saved_services[name]["error"] = service.error
        if hasattr(service, "status"):
            saved_services[name]["status"] = service.status

    yield

    # Clear all services
    service_manager._services.clear()

    # Restore saved state
    for name, data in saved_services.items():
        service_manager.register_service(
            name,
            ServiceType.REQUIRED if data.get("required") else ServiceType.OPTIONAL,
            enabled=data.get("enabled", True),
        )
        if data.get("instance"):
            service_manager.set_service_instance(name, data["instance"])
        if data.get("error"):
            service_manager.set_service_error(name, data["error"])


@pytest.fixture
def isolated_config():
    """Isolate config module reloads to prevent cross-test pollution."""
    import config

    # Store original environment values that config uses
    original_env = {
        key: os.environ.get(key)
        for key in [
            "FLASK_ENV",
            "APP_ENV",
            "PRODUCTION",
            "CI",
            "SECRET_KEY",
            "DATABASE_URL",
            "JWT_SECRET_KEY",
            "MQTT_CA_CERTS",
            "MQTT_CERT_FILE",
            "MQTT_KEY_FILE",
            "OPCUA_CERT_FILE",
            "OPCUA_PRIVATE_KEY_FILE",
            "OPCUA_TRUST_CERT_FILE",
            "SERVICE_OPCUA_ENABLED",
            "SERVICE_OPCUA_REQUIRED",
            "SERVICE_MQTT_ENABLED",
            "SERVICE_MQTT_REQUIRED",
        ]
    }

    # Store original config class references

    yield

    # Restore original environment
    for key, value in original_env.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value

    # Reload config to restore original state
    importlib.reload(config)


def _create_test_data():
    """Create test data for tests."""
    from datetime import datetime, timezone

    from app.models import HealthStatusEnum, PermissionEnum, RoleEnum, UnitStatusEnum

    # Create permissions
    permissions = [
        Permission(name=PermissionEnum.READ_UNITS, description="Read units"),
        Permission(name=PermissionEnum.WRITE_UNITS, description="Write units"),
        Permission(name=PermissionEnum.DELETE_UNITS, description="Delete units"),
        Permission(name=PermissionEnum.READ_USERS, description="Read users"),
        Permission(name=PermissionEnum.WRITE_USERS, description="Write users"),
        Permission(name=PermissionEnum.DELETE_USERS, description="Delete users"),
        Permission(name=PermissionEnum.ADMIN_PANEL, description="Admin panel access"),
        Permission(
            name=PermissionEnum.REMOTE_CONTROL,
            description="Remote control access",
        ),
    ]

    for permission in permissions:
        db.session.add(permission)

    db.session.commit()

    # Create roles
    admin_role = Role(name=RoleEnum.ADMIN, description="Administrator")
    operator_role = Role(name=RoleEnum.OPERATOR, description="Operator")
    viewer_role = Role(name=RoleEnum.VIEWER, description="Viewer")

    # Assign permissions to roles
    admin_role.permissions = permissions  # All permissions - ThermaCore staff only
    operator_role.permissions = (
        permissions[0:1] + permissions[3:4] + permissions[7:8]
    )  # read units + read users + remote control
    viewer_role.permissions = permissions[0:1] + permissions[3:4]  # read only

    db.session.add(admin_role)
    db.session.add(operator_role)
    db.session.add(viewer_role)
    db.session.commit()

    # Create test users
    admin_user = User(
        username="admin",
        email="admin@test.com",
        first_name="Admin",
        last_name="User",
        role_id=admin_role.id,
        is_active=True,
        tenant_id=None,  # Explicitly set to None for cross-tenant access
    )
    admin_user.set_password("admin123")

    operator_user = User(
        username="operator",
        email="operator@test.com",
        first_name="Operator",
        last_name="User",
        role_id=operator_role.id,
        is_active=True,
        tenant_id=None,  # Explicitly set to None for cross-tenant access
    )
    operator_user.set_password("operator123")

    viewer_user = User(
        username="viewer",
        email="viewer@test.com",
        first_name="Viewer",
        last_name="User",
        role_id=viewer_role.id,
        is_active=True,
        tenant_id=None,  # Explicitly set to None for cross-tenant access
    )
    viewer_user.set_password("viewer123")

    db.session.add(admin_user)
    db.session.add(operator_user)
    db.session.add(viewer_user)
    db.session.commit()

    # Create test units
    test_unit = Unit(
        id="TEST001",
        name="Test Unit 001",
        serial_number="TEST001-2024-001",
        install_date=datetime(2024, 1, 15, tzinfo=timezone.utc),
        location="Test Site",
        status=UnitStatusEnum.ONLINE,
        health_status=HealthStatusEnum.OPTIMAL,
        water_generation=True,
        client_name="Test Client",
        client_email="client@test.com",
        temp_outside=25.0,
        humidity=60.0,
        battery_level=80.0,
        tenant_id=None,  # Explicitly set to None for cross-tenant access
    )

    db.session.add(test_unit)
    db.session.commit()

    # Create test sensor
    test_sensor = Sensor(
        unit_id="TEST001",
        name="Test Temperature Sensor",
        sensor_type="temperature",
        unit_of_measurement="°C",
        min_value=-10.0,
        max_value=50.0,
    )

    db.session.add(test_sensor)
    db.session.commit()


@pytest.fixture
def admin_user():
    """Return admin user credentials for testing."""
    return {
        "username": "admin",
        "email": "admin@test.com",
        "password": "admin123",
    }


@pytest.fixture
def admin_token(app, db_session):
    """Create an admin JWT token for testing using db_session."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        admin_user = db_session.query(User).filter_by(username="admin").first()
        if not admin_user:
            raise ValueError("Admin user not found in test database")

        # Create access token with user ID as identity
        token = create_access_token(
            identity=str(admin_user.id),
            additional_claims={
                "role": admin_user.role.name.value,
                "permissions": admin_user.permissions or [],
            },
        )
        return token


@pytest.fixture
def viewer_token(app, db_session):
    """Create a viewer JWT token for testing using db_session."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        viewer_user = db_session.query(User).filter_by(username="viewer").first()
        if not viewer_user:
            raise ValueError("Viewer user not found in test database")

        # Create access token with user ID as identity
        token = create_access_token(
            identity=str(viewer_user.id),
            additional_claims={
                "role": viewer_user.role.name.value,
                "permissions": viewer_user.permissions or [],
            },
        )
        return token


# ---- Tenant test fixtures ----


@pytest.fixture
def auth_headers(admin_token):
    """Admin JWT headers (has admin_panel permission)."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def non_admin_headers(viewer_token):
    """Viewer JWT headers (lacks admin_panel permission)."""
    return {"Authorization": f"Bearer {viewer_token}"}


@pytest.fixture
def seed_tenant(db_session):
    """Create a test tenant with unique slug per test."""
    import uuid

    from app.models import Tenant

    suffix = uuid.uuid4().hex[:8]
    tenant = Tenant(
        name=f"Acme Corp {suffix}",
        slug=f"acme-corp-{suffix}",
        is_active=True,
    )
    db_session.add(tenant)
    db_session.commit()
    return tenant


@pytest.fixture
def seed_inactive_tenant(db_session):
    """Create an inactive test tenant with unique slug per test."""
    import uuid

    from app.models import Tenant

    suffix = uuid.uuid4().hex[:8]
    tenant = Tenant(
        name=f"Old Co {suffix}",
        slug=f"old-co-{suffix}",
        is_active=False,
    )
    db_session.add(tenant)
    db_session.commit()
    return tenant


@pytest.fixture
def seed_user(db_session, seed_tenant):
    """Create a test user associated with seed_tenant, unique per test."""
    import uuid

    from app.models import Role, RoleEnum, User

    suffix = uuid.uuid4().hex[:8]
    role = Role.query.filter_by(name=RoleEnum.VIEWER).first()
    if not role:
        role = Role.query.first()

    user = User(
        username=f"tenant_user_{suffix}",
        email=f"tenant_user_{suffix}@test.com",
        first_name="Tenant",
        last_name="User",
        role_id=role.id,
        tenant_id=seed_tenant.id,
        is_active=True,
    )
    user.set_password("password123")
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def seed_unit(db_session, seed_tenant):
    """Create a test unit associated with seed_tenant, unique id per test."""
    import uuid
    from datetime import datetime, timezone

    from app.models import HealthStatusEnum, Unit, UnitStatusEnum

    suffix = uuid.uuid4().hex[:8].upper()
    unit = Unit(
        id=f"TENANTUNIT_{suffix}",
        name=f"Tenant Test Unit {suffix}",
        serial_number=f"TENANTUNIT-{suffix}-2024",
        install_date=datetime(2024, 1, 1, tzinfo=timezone.utc),
        location="Tenant Site",
        status=UnitStatusEnum.ONLINE,
        health_status=HealthStatusEnum.OPTIMAL,
        tenant_id=seed_tenant.id,
    )
    db_session.add(unit)
    db_session.commit()
    return unit


@pytest.fixture
def tenant_scoped_headers(db_session, seed_tenant):
    """JWT for a user scoped to seed_tenant specifically."""
    from flask_jwt_extended import create_access_token

    from app.models import Role, RoleEnum, User

    # Look for a user specifically tied to this seed_tenant
    user = db_session.query(User).filter_by(tenant_id=seed_tenant.id).first()
    if not user:
        role = db_session.query(Role).filter_by(name=RoleEnum.VIEWER).first()
        if not role:
            role = db_session.query(Role).first()
        # Create a user scoped to this specific tenant
        user = User(
            username=f"tenant_scoped_{seed_tenant.id}",
            email=f"tenant_scoped_{seed_tenant.id}@test.com",
            first_name="Tenant",
            last_name="Scoped",
            role_id=role.id,
            tenant_id=seed_tenant.id,
            is_active=True,
        )
        user.set_password("password123")
        db_session.add(user)
        db_session.commit()

    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role.name.value if user.role else "viewer",
            "permissions": user.permissions or [],
        },
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def no_tenant_headers(db_session):
    """JWT for a non-admin user with no tenant assigned."""
    # Create a unique user per test to avoid sharing state
    import time

    from flask_jwt_extended import create_access_token

    from app.models import Role, RoleEnum, User

    unique_suffix = int(time.time() * 1000000)

    role = db_session.query(Role).filter_by(name=RoleEnum.VIEWER).first()
    if not role:
        role = db_session.query(Role).first()

    user = User(
        username=f"no_tenant_user_{unique_suffix}",
        email=f"no_tenant_{unique_suffix}@test.com",
        first_name="No",
        last_name="Tenant",
        role_id=role.id,
        tenant_id=None,
        is_active=True,
    )
    user.set_password("password123")
    db_session.add(user)
    db_session.commit()

    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role.name.value if user.role else "viewer",
            "permissions": user.permissions or [],
        },
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_no_tenant_headers(admin_token):
    """Admin JWT with cross-tenant access (no specific tenant_id)."""
    # This fixture deliberately uses the admin token which has tenant_id=None
    # Explicitly set to make the intent clear, even though it's the same as auth_headers
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def test_data(db_session):
    """Create test data within a transaction that rolls back after test."""
    from datetime import datetime, timezone

    from app.models import HealthStatusEnum, UnitStatusEnum

    # Create test unit
    unit = Unit(
        id="TEST001",
        name="Test Unit 001",
        serial_number="TEST001-2024-001",
        install_date=datetime(2024, 1, 15, tzinfo=timezone.utc),
        location="Test Site",
        status=UnitStatusEnum.ONLINE,
        health_status=HealthStatusEnum.OPTIMAL,
        water_generation=True,
    )
    db_session.add(unit)
    db_session.flush()

    # Create test sensor
    sensor = Sensor(
        unit_id="TEST001",
        name="Test Temperature Sensor",
        sensor_type="temperature",
        unit_of_measurement="°C",
        min_value=-10.0,
        max_value=50.0,
    )
    db_session.add(sensor)
    db_session.flush()

    return {"unit": unit, "sensor": sensor}
