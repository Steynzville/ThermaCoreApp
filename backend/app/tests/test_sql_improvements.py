"""Test SQL query improvements for boolean aggregations."""
import pytest
from app import db
from app.models import Unit, UnitStatusEnum, HealthStatusEnum
from datetime import datetime


class TestSQLQueryImprovements:
    """Test the improved SQL query patterns."""
    
    def test_boolean_filter_explicit_syntax(self, app, db_session):
        """Test that explicit boolean filters work correctly."""
        with app.app_context():
            # Create test units with different boolean values
            unit1 = Unit(
                id='TEST_BOOL_001',
                name='Test Unit Bool 1',
                serial_number='BOOL-001',
                install_date=datetime.utcnow(),
                status=UnitStatusEnum.ONLINE,
                health_status=HealthStatusEnum.OPTIMAL,
                has_alert=True,
                has_alarm=False
            )
            
            unit2 = Unit(
                id='TEST_BOOL_002', 
                name='Test Unit Bool 2',
                serial_number='BOOL-002',
                install_date=datetime.utcnow(),
                status=UnitStatusEnum.OFFLINE,
                health_status=HealthStatusEnum.WARNING,
                has_alert=False,
                has_alarm=True
            )
            
            db.session.add(unit1)
            db.session.add(unit2)
            db.session.commit()
            
            try:
                # Test explicit boolean filter syntax
                units_with_alerts = Unit.query.filter(Unit.has_alert.is_(True)).count()
                units_with_alarms = Unit.query.filter(Unit.has_alarm.is_(True)).count()
                units_without_alerts = Unit.query.filter(Unit.has_alert.is_(False)).count()
                
                assert units_with_alerts >= 1  # At least our test unit
                assert units_with_alarms >= 1  # At least our test unit
                assert units_without_alerts >= 1  # At least our test unit
                
            finally:
                # Clean up
                db.session.delete(unit1)
                db.session.delete(unit2)
                db.session.commit()
    
    def test_case_expression_boolean_aggregation(self, app, db_session):
        """Test that CASE expressions work with explicit boolean comparisons."""
        with app.app_context():
            # Test the aggregation pattern from units stats endpoint
            result = db.session.query(
                db.func.count().label('total_units'),
                db.func.sum(db.case((Unit.has_alert.is_(True), 1), else_=0)).label('units_with_alerts'),
                db.func.sum(db.case((Unit.has_alarm.is_(True), 1), else_=0)).label('units_with_alarms')
            ).first()
            
            # These should execute without SQL errors
            assert result.total_units is not None
            assert result.units_with_alerts is not None
            assert result.units_with_alarms is not None