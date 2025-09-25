"""Test configuration for ThermaCore SCADA API tests."""
import os
import tempfile
import pytest

from app import create_app, db
from app.models import User, Role, Permission, Unit, Sensor
from config import TestingConfig


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
        db.create_all()
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
    # Create permissions
    permissions = [
        Permission(name='read_units', description='Read units'),
        Permission(name='write_units', description='Write units'),
        Permission(name='delete_units', description='Delete units'),
        Permission(name='read_users', description='Read users'),
        Permission(name='write_users', description='Write users'),
        Permission(name='delete_users', description='Delete users'),
        Permission(name='admin_panel', description='Admin panel access')
    ]
    
    for permission in permissions:
        db.session.add(permission)
    
    db.session.commit()
    
    # Create roles
    admin_role = Role(name='admin', description='Administrator')
    operator_role = Role(name='operator', description='Operator')
    viewer_role = Role(name='viewer', description='Viewer')
    
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
        install_date='2024-01-15',
        location='Test Site',
        status='online',
        health_status='optimal',
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