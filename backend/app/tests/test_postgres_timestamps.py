"""PostgreSQL-specific timestamp tests with database trigger validation.

These tests run only when USE_POSTGRES_TESTS environment variable is set to true.
They validate that database triggers properly update timestamps without relying
on SQLite simulation helpers.

To run these tests:
    export USE_POSTGRES_TESTS=true
    export POSTGRES_TEST_URL=postgresql://user:pass@localhost:5432/test_db
    python -m pytest app/tests/test_postgres_timestamps.py
"""
import os
import pytest
from datetime import datetime

from app.models import User, Unit, Sensor
from app import db
from app.tests.timestamp_helpers import (
    is_using_postgres_tests,
    get_postgres_test_url,
    assert_timestamp_updated,
    assert_timestamp_unchanged
)


# Skip entire module if PostgreSQL testing is not enabled
pytestmark = pytest.mark.skipif(
    not is_using_postgres_tests(),
    reason="PostgreSQL tests only run when USE_POSTGRES_TESTS=true"
)


class TestPostgreSQLTimestampTriggers:
    """Test timestamp triggers directly with PostgreSQL database."""
    
    def test_user_timestamp_trigger_direct(self, app, db_session):
        """Test User timestamp trigger updates directly in PostgreSQL."""
        with app.app_context():
            # Create a user - triggers should set created_at and updated_at
            user = User(
                username='postgres_test_user',
                email='postgres@test.com',
                first_name='PostgreSQL',
                last_name='Test',
                role_id=1
            )
            db.session.add(user)
            db.session.commit()
            
            # Verify initial timestamps are set by database
            assert user.created_at is not None
            assert user.updated_at is not None
            assert user.updated_at >= user.created_at
            
            original_created_at = user.created_at
            original_updated_at = user.updated_at
            
            # Update user - database trigger should update only updated_at
            user.first_name = 'Updated PostgreSQL'
            db.session.commit()
            
            # Refresh to get database-updated values
            db.session.refresh(user)
            
            # Verify trigger behavior
            assert_timestamp_unchanged(original_created_at, user.created_at)
            assert_timestamp_updated(original_updated_at, user.updated_at)
    
    def test_unit_timestamp_trigger_direct(self, app, db_session):
        """Test Unit timestamp trigger updates directly in PostgreSQL."""
        with app.app_context():
            # Create a unit
            unit = Unit(
                id='PG_TEST_001',
                name='PostgreSQL Test Unit',
                serial_number='PG-TEST-001',
                install_date=datetime.utcnow(),
                location='PostgreSQL Test Location'
            )
            db.session.add(unit)
            db.session.commit()
            
            original_created_at = unit.created_at
            original_updated_at = unit.updated_at
            
            # Update unit - database trigger should update only updated_at
            unit.location = 'Updated PostgreSQL Location'
            db.session.commit()
            
            # Refresh to get database-updated values
            db.session.refresh(unit)
            
            # Verify trigger behavior
            assert_timestamp_unchanged(original_created_at, unit.created_at)
            assert_timestamp_updated(original_updated_at, unit.updated_at)
    
    def test_sensor_timestamp_trigger_direct(self, app, db_session):
        """Test Sensor timestamp trigger updates directly in PostgreSQL."""
        with app.app_context():
            # First create a unit for the sensor
            unit = Unit(
                id='PG_SENSOR_UNIT_001',
                name='PostgreSQL Sensor Unit',
                serial_number='PG-SENSOR-001',
                install_date=datetime.utcnow(),
                location='PostgreSQL Sensor Location'
            )
            db.session.add(unit)
            db.session.commit()
            
            # Create a sensor
            sensor = Sensor(
                unit_id='PG_SENSOR_UNIT_001',
                name='PostgreSQL Test Sensor',
                sensor_type='temperature',
                unit_of_measurement='°C'
            )
            db.session.add(sensor)
            db.session.commit()
            
            original_created_at = sensor.created_at
            original_updated_at = sensor.updated_at
            
            # Update sensor - database trigger should update only updated_at
            sensor.name = 'Updated PostgreSQL Sensor'
            db.session.commit()
            
            # Refresh to get database-updated values
            db.session.refresh(sensor)
            
            # Verify trigger behavior
            assert_timestamp_unchanged(original_created_at, sensor.created_at)
            assert_timestamp_updated(original_updated_at, sensor.updated_at)
    
    def test_multiple_updates_maintain_order(self, app, db_session):
        """Test that multiple updates maintain timestamp ordering."""
        with app.app_context():
            # Create a user
            user = User(
                username='postgres_multi_test',
                email='multi@postgres.test',
                first_name='Multi',
                last_name='Test',
                role_id=1
            )
            db.session.add(user)
            db.session.commit()
            
            # Store initial timestamp
            first_updated_at = user.updated_at
            
            # First update
            user.first_name = 'Multi Updated 1'
            db.session.commit()
            db.session.refresh(user)
            
            second_updated_at = user.updated_at
            assert_timestamp_updated(first_updated_at, second_updated_at)
            
            # Second update
            user.first_name = 'Multi Updated 2'
            db.session.commit()
            db.session.refresh(user)
            
            third_updated_at = user.updated_at
            assert_timestamp_updated(second_updated_at, third_updated_at)
            
            # Verify ordering
            assert first_updated_at <= second_updated_at <= third_updated_at


class TestPostgreSQLConfiguration:
    """Test PostgreSQL test configuration."""
    
    def test_postgres_environment_configured(self):
        """Test that PostgreSQL environment is properly configured."""
        assert is_using_postgres_tests() is True
        
        postgres_url = get_postgres_test_url()
        assert postgres_url is not None
        assert postgres_url.startswith('postgresql://')
    
    def test_database_connection_valid(self, app, db_session):
        """Test that database connection is working."""
        with app.app_context():
            # Simple query to verify connection
            result = db.session.execute(db.text("SELECT 1 as test")).fetchone()
            assert result.test == 1
            
            # Check database type
            result = db.session.execute(db.text("SELECT version()")).fetchone()
            assert 'PostgreSQL' in result.version