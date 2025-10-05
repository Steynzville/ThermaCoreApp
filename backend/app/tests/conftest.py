"""Test configuration for ThermaCore SCADA API tests."""
import os
import tempfile
import pytest
from sqlalchemy import text

from app import create_app, db
from app.models import User, Role, Permission, Unit, Sensor
from config import TestingConfig


def _init_database():
    """Initialize database with schema."""
    # Check if we're using PostgreSQL for tests
    use_postgres = os.environ.get('USE_POSTGRES_TESTS', 'false').lower() == 'true'
    
    if use_postgres:
        # Use PostgreSQL migration script for PostgreSQL tests
        schema_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
            'migrations', 
            '001_initial_schema.sql'
        )
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        db.session.execute(text(schema_sql))
        db.session.commit()
    else:
        # For SQLite tests, use SQLAlchemy's create_all() which properly handles
        # enum types and other SQLAlchemy-specific features
        db.create_all()


@pytest.fixture(scope='session')
def app():
    """Create application for the tests."""
    # Create a temporary file for the test database
    db_fd, db_path = tempfile.mkstemp()
    
    # Override database URL for testing
    TestingConfig.SQLALCHEMY_DATABASE_URI = f'sqlite:///{db_path}'
    
    app = create_app('testing')
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.app_context():
        _init_database()
        _create_test_data()
        yield app
        
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture(scope='function')
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture(scope='function')
def db_session(app):
    """Create database session for tests."""
    with app.app_context():
        yield db.session
        db.session.rollback()


def _create_test_data():
    """Create test data for tests."""
    from app.models import PermissionEnum, RoleEnum, UnitStatusEnum, HealthStatusEnum
    from datetime import datetime
    
    # Create permissions
    permissions = [
        Permission(name=PermissionEnum.READ_UNITS, description='Read units'),
        Permission(name=PermissionEnum.WRITE_UNITS, description='Write units'),
        Permission(name=PermissionEnum.DELETE_UNITS, description='Delete units'),
        Permission(name=PermissionEnum.READ_USERS, description='Read users'),
        Permission(name=PermissionEnum.WRITE_USERS, description='Write users'),
        Permission(name=PermissionEnum.DELETE_USERS, description='Delete users'),
        Permission(name=PermissionEnum.ADMIN_PANEL, description='Admin panel access')
    ]
    
    for permission in permissions:
        db.session.add(permission)
    
    db.session.commit()
    
    # Create roles
    admin_role = Role(name=RoleEnum.ADMIN, description='Administrator')
    operator_role = Role(name=RoleEnum.OPERATOR, description='Operator')
    viewer_role = Role(name=RoleEnum.VIEWER, description='Viewer')
    
    # Assign permissions to roles
    admin_role.permissions = permissions
    operator_role.permissions = permissions[:3] + permissions[3:4]  # units + read users
    viewer_role.permissions = permissions[0:1] + permissions[3:4]   # read only
    
    db.session.add(admin_role)
    db.session.add(operator_role)
    db.session.add(viewer_role)
    db.session.commit()
    
    # Create test users
    admin_user = User(
        username='admin',
        email='admin@test.com',
        first_name='Admin',
        last_name='User',
        role_id=admin_role.id,
        is_active=True
    )
    admin_user.set_password('admin123')
    
    operator_user = User(
        username='operator',
        email='operator@test.com',
        first_name='Operator',
        last_name='User',
        role_id=operator_role.id,
        is_active=True
    )
    operator_user.set_password('operator123')
    
    viewer_user = User(
        username='viewer',
        email='viewer@test.com',
        first_name='Viewer',
        last_name='User',
        role_id=viewer_role.id,
        is_active=True
    )
    viewer_user.set_password('viewer123')
    
    db.session.add(admin_user)
    db.session.add(operator_user)
    db.session.add(viewer_user)
    db.session.commit()
    
    # Create test units
    test_unit = Unit(
        id='TEST001',
        name='Test Unit 001',
        serial_number='TEST001-2024-001',
        install_date=datetime(2024, 1, 15),
        location='Test Site',
        status=UnitStatusEnum.ONLINE,
        health_status=HealthStatusEnum.OPTIMAL,
        water_generation=True,
        client_name='Test Client',
        client_email='client@test.com',
        temp_outside=25.0,
        humidity=60.0,
        battery_level=80.0
    )
    
    db.session.add(test_unit)
    db.session.commit()
    
    # Create test sensor
    test_sensor = Sensor(
        unit_id='TEST001',
        name='Test Temperature Sensor',
        sensor_type='temperature',
        unit_of_measurement='°C',
        min_value=-10.0,
        max_value=50.0
    )
    
    db.session.add(test_sensor)
    db.session.commit()