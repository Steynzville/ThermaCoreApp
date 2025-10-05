"""Tests for timestamp consistency and registration field validation."""
import json
from datetime import datetime
from app.models import User, Unit, Sensor
from app.tests.timestamp_helpers import simulate_db_trigger_update, assert_timestamp_updated


class TestTimestampConsistency:
    """Test timestamp handling consistency across environments."""
    
    def test_user_registration_sets_all_expected_fields(self, client, db_session):
        """Test registration endpoint properly sets first_name, last_name, and timestamps."""
        # Get auth token
        response = client.post('/api/v1/auth/login', 
            json={'username': 'admin', 'password': 'admin123'},
            headers={'Content-Type': 'application/json'}
        )
        token = json.loads(response.data)['access_token']
        
        # Get admin role for new user
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        # Register new user with all fields
        user_data = {
            'username': 'testuser',
            'email': 'testuser@test.com',
            'password': 'password123',
            'first_name': 'Test',
            'last_name': 'User',
            'role_id': admin_role.id
        }
        
        response = client.post('/api/v1/auth/register',
            json=user_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Verify all fields are set in response
        assert data['username'] == 'testuser'
        assert data['email'] == 'testuser@test.com'
        assert data['first_name'] == 'Test'
        assert data['last_name'] == 'User'
        assert 'created_at' in data
        assert 'updated_at' in data
        
        # Verify user exists in database with all fields set
        created_user = User.query.filter_by(username='testuser').first()
        assert created_user is not None
        assert created_user.first_name == 'Test'
        assert created_user.last_name == 'User'
        assert created_user.created_at is not None
        assert created_user.updated_at is not None
        # Both timestamps should be very close (within 1 second) initially
        time_diff = abs((created_user.updated_at - created_user.created_at).total_seconds())
        assert time_diff < 1.0, f"Created and updated timestamps should be close, diff: {time_diff} seconds"
    
    def test_user_registration_without_optional_fields(self, client, db_session):
        """Test registration works correctly when optional fields are not provided."""
        # Get auth token
        response = client.post('/api/v1/auth/login', 
            json={'username': 'admin', 'password': 'admin123'},
            headers={'Content-Type': 'application/json'}
        )
        token = json.loads(response.data)['access_token']
        
        # Get admin role for new user
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        # Register new user without optional fields
        user_data = {
            'username': 'testuser2',
            'email': 'testuser2@test.com',
            'password': 'password123',
            'role_id': admin_role.id
        }
        
        response = client.post('/api/v1/auth/register',
            json=user_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        
        # Optional fields should be None in response
        assert data['first_name'] is None
        assert data['last_name'] is None
        assert 'created_at' in data
        assert 'updated_at' in data
        
        # Verify in database
        created_user = User.query.filter_by(username='testuser2').first()
        assert created_user is not None
        assert created_user.first_name is None
        assert created_user.last_name is None
        assert created_user.created_at is not None
        assert created_user.updated_at is not None

    def test_timestamp_updates_with_simulated_triggers(self, client, db_session):
        """Test that updated_at timestamps work correctly in SQLite test environment."""
        # Create a test user
        from app.models import Role, RoleEnum
        admin_role = Role.query.filter_by(name=RoleEnum.ADMIN).first()
        
        user = User(
            username='timestamp_test_user',
            email='timestamp@test.com',
            first_name='Timestamp',
            last_name='Test',
            role_id=admin_role.id
        )
        user.set_password('password123')
        
        db_session.add(user)
        db_session.commit()
        
        # Store original timestamp
        original_updated_at = user.updated_at
        
        # Simulate an update (in SQLite test environment, we need to manually trigger the update)
        user.first_name = 'UpdatedTimestamp'
        simulate_db_trigger_update(user)  # Simulate what PostgreSQL trigger would do
        db_session.commit()
        
        # Verify timestamp was updated
        db_session.refresh(user)
        assert_timestamp_updated(original_updated_at, user.updated_at)

    def test_unit_timestamp_updates_with_simulated_triggers(self, client, db_session):
        """Test Unit model timestamp updates in SQLite test environment."""
        from app.models import UnitStatusEnum, HealthStatusEnum
        
        # Create a test unit
        unit = Unit(
            id='TIMESTAMP_TEST',
            name='Timestamp Test Unit',
            serial_number='TIMESTAMP-2024-001',
            install_date=datetime(2024, 1, 15),
            status=UnitStatusEnum.ONLINE,
            health_status=HealthStatusEnum.OPTIMAL
        )
        
        db_session.add(unit)
        db_session.commit()
        
        # Store original timestamp
        original_updated_at = unit.updated_at
        
        # Simulate an update
        unit.name = 'Updated Timestamp Test Unit'
        simulate_db_trigger_update(unit)  # Simulate what PostgreSQL trigger would do
        db_session.commit()
        
        # Verify timestamp was updated
        db_session.refresh(unit)
        assert_timestamp_updated(original_updated_at, unit.updated_at)

    def test_sensor_timestamp_updates_with_simulated_triggers(self, client, db_session):
        """Test Sensor model timestamp updates in SQLite test environment."""
        # Get existing test unit
        test_unit = Unit.query.filter_by(id='TEST001').first()
        assert test_unit is not None
        
        # Create a test sensor
        sensor = Sensor(
            unit_id=test_unit.id,
            name='Timestamp Test Sensor',
            sensor_type='temperature',
            unit_of_measurement='°C',
            min_value=-10.0,
            max_value=50.0
        )
        
        db_session.add(sensor)
        db_session.commit()
        
        # Store original timestamp
        original_updated_at = sensor.updated_at
        
        # Simulate an update
        sensor.name = 'Updated Timestamp Test Sensor'
        simulate_db_trigger_update(sensor)  # Simulate what PostgreSQL trigger would do
        db_session.commit()
        
        # Verify timestamp was updated
        db_session.refresh(sensor)
        assert_timestamp_updated(original_updated_at, sensor.updated_at)

    def test_models_have_no_onupdate_parameters(self):
        """Verify that models don't have onupdate parameters, relying on DB triggers."""
        from app.models import User, Unit, Sensor
        
        # Check User model
        user_updated_at_column = User.__table__.columns['updated_at']
        assert user_updated_at_column.onupdate is None, "User.updated_at should not have onupdate parameter"
        
        # Check Unit model
        unit_updated_at_column = Unit.__table__.columns['updated_at']
        assert unit_updated_at_column.onupdate is None, "Unit.updated_at should not have onupdate parameter"
        
        # Check Sensor model
        sensor_updated_at_column = Sensor.__table__.columns['updated_at']
        assert sensor_updated_at_column.onupdate is None, "Sensor.updated_at should not have onupdate parameter"