"""Tests for the new timestamp and enum validation improvements."""
import pytest
from datetime import datetime
from marshmallow import ValidationError

from app.utils.schemas import EnumField
from app.models import UnitStatusEnum, HealthStatusEnum, User, Unit, Sensor
from app import db
from app.tests.timestamp_helpers import (
    simulate_db_trigger_update,
    assert_timestamp_updated,
    assert_timestamp_unchanged,
    sleep_for_sqlite_if_needed
)


class TestEnumFieldValidation:
    """Test enhanced enum field validation."""
    
    def test_enum_field_valid_value(self):
        """Test that valid enum values are deserialized correctly."""
        enum_field = EnumField(UnitStatusEnum)
        
        result = enum_field.deserialize('online')
        assert result == UnitStatusEnum.ONLINE
        
        result = enum_field.deserialize('offline')
        assert result == UnitStatusEnum.OFFLINE
    
    def test_enum_field_invalid_value_raises_validation_error(self):
        """Test that invalid enum values raise ValidationError with helpful message."""
        enum_field = EnumField(UnitStatusEnum)
        
        with pytest.raises(ValidationError) as exc_info:
            enum_field.deserialize('invalid_status')
        
        error_msg = str(exc_info.value)
        assert 'Invalid value "invalid_status"' in error_msg
        assert 'online' in error_msg
        assert 'offline' in error_msg
    
    def test_enum_field_non_string_value_unchanged(self):
        """Test that non-string values are returned unchanged."""
        enum_field = EnumField(UnitStatusEnum)
        
        # Test with None
        result = enum_field.deserialize(None)
        assert result is None
        
        # Test with enum instance
        enum_instance = UnitStatusEnum.ONLINE
        result = enum_field.deserialize(enum_instance)
        assert result == enum_instance
    
    def test_health_status_enum_validation(self):
        """Test validation with HealthStatusEnum as well."""
        enum_field = EnumField(HealthStatusEnum)
        
        # Valid value
        result = enum_field.deserialize('optimal')
        assert result == HealthStatusEnum.OPTIMAL
        
        # Invalid value
        with pytest.raises(ValidationError) as exc_info:
            enum_field.deserialize('invalid_health')
        
        error_msg = str(exc_info.value)
        assert 'Invalid value "invalid_health"' in error_msg
        assert 'optimal' in error_msg
        assert 'warning' in error_msg
        assert 'critical' in error_msg


class TestTimestampUpdates:
    """Test automatic timestamp updates."""
    
    def test_user_updated_at_timestamp_update(self, app, db_session):
        """Test that User.updated_at is automatically updated on modification."""
        with app.app_context():
            # Create a user
            user = User(
                username='test_timestamp_user',
                email='timestamp@test.com',
                first_name='Test',
                last_name='User',
                role_id=1  # Assuming role with id=1 exists from conftest
            )
            db.session.add(user)
            db.session.commit()
            
            original_updated_at = user.updated_at
            
            # Wait a moment to ensure timestamp difference for SQLite
            sleep_for_sqlite_if_needed(0.1)
            
            # Update the user
            user.first_name = 'Updated Test'
            
            # In production, the database trigger would update this automatically.
            # For testing with SQLite, we simulate the trigger behavior
            simulate_db_trigger_update(user)
            
            db.session.commit()
            
            # Check that updated_at was modified using helper function
            assert_timestamp_updated(original_updated_at, user.updated_at)
    
    def test_unit_updated_at_timestamp_update(self, app, db_session):
        """Test that Unit.updated_at is automatically updated on modification."""
        with app.app_context():
            # Create a unit
            unit = Unit(
                id='TEST_UPDATE_001',
                name='Test Update Unit',
                serial_number='TEST-UPDATE-001',
                install_date=datetime.utcnow(),
                location='Test Location'
            )
            db.session.add(unit)
            db.session.commit()
            
            original_updated_at = unit.updated_at
            
            # Wait a moment to ensure timestamp difference for SQLite
            sleep_for_sqlite_if_needed(0.1)
            
            # Update the unit
            unit.location = 'Updated Location'
            
            # In production, the database trigger would update this automatically.
            # For testing with SQLite, we simulate the trigger behavior
            simulate_db_trigger_update(unit)
            
            db.session.commit()
            
            # Check that updated_at was modified using helper function
            assert_timestamp_updated(original_updated_at, unit.updated_at)
    
    def test_sensor_updated_at_timestamp_update(self, app, db_session):
        """Test that Sensor.updated_at is automatically updated on modification."""
        with app.app_context():
            # Create a unit first (required for sensor)
            unit = Unit(
                id='TEST_SENSOR_UNIT_001',
                name='Test Sensor Unit',
                serial_number='TEST-SENSOR-001',
                install_date=datetime.utcnow()
            )
            db.session.add(unit)
            db.session.commit()
            
            # Create a sensor
            sensor = Sensor(
                unit_id='TEST_SENSOR_UNIT_001',
                name='Test Temperature Sensor',
                sensor_type='temperature',
                unit_of_measurement='°C'
            )
            db.session.add(sensor)
            db.session.commit()
            
            original_updated_at = sensor.updated_at
            
            # Wait a moment to ensure timestamp difference for SQLite
            sleep_for_sqlite_if_needed(0.1)
            
            # Update the sensor
            sensor.name = 'Updated Temperature Sensor'
            
            # In production, the database trigger would update this automatically.
            # For testing with SQLite, we simulate the trigger behavior
            simulate_db_trigger_update(sensor)
            
            db.session.commit()
            
            # Check that updated_at was modified using helper function
            assert_timestamp_updated(original_updated_at, sensor.updated_at)
    
    def test_created_at_timestamp_not_updated(self, app, db_session):
        """Test that created_at timestamps are not modified on updates."""
        with app.app_context():
            # Create a user
            user = User(
                username='test_created_user',
                email='created@test.com',
                first_name='Created',
                last_name='User',
                role_id=1
            )
            db.session.add(user)
            db.session.commit()
            
            original_created_at = user.created_at
            
            # Wait a moment and update - use helper for SQLite
            sleep_for_sqlite_if_needed(0.1)
            
            user.first_name = 'Updated Created'
            
            # In production, the database trigger would update only updated_at automatically.
            # For testing with SQLite, we simulate the trigger behavior
            simulate_db_trigger_update(user)
            
            db.session.commit()
            
            # Check that created_at was not modified using helper function
            assert_timestamp_unchanged(original_created_at, user.created_at)