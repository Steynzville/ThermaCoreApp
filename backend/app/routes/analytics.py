"""Advanced analytics routes for Phase 3 SCADA integration."""
from flask import Blueprint, jsonify, request, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_
from typing import Dict, List, Any

from app.models import Unit, Sensor, SensorReading, db, utc_now  # Use timezone-aware datetime
from app.routes.auth import permission_required
from app.utils.error_handler import SecurityAwareErrorHandler
from app.middleware.validation import use_args
from app.utils.schemas import (
    TrendsQuerySchema,
    PerformanceQuerySchema,
    AlertPatternsQuerySchema
)

# Create analytics blueprint
analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/analytics/dashboard/summary', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_dashboard_summary():
    """Get comprehensive dashboard summary with analytics.
    
    ---
    tags:
      - Analytics
    security:
      - JWT: []
    responses:
      200:
        description: Dashboard summary with analytics
        schema:
          type: object
          properties:
            overview:
              type: object
            trends:
              type: object
            performance:
              type: object
    """
    try:
        # Get time ranges
        now = utc_now()
        last_24h = now - timedelta(hours=24)
        last_week = now - timedelta(days=7)
        last_month = now - timedelta(days=30)
        
        # Overview metrics
        total_units = db.session.query(func.count(Unit.id)).scalar()
        active_units = db.session.query(func.count(Unit.id)).filter(
            Unit.status == 'online'
        ).scalar()
        total_sensors = db.session.query(func.count(Sensor.id)).scalar()
        
        # Recent readings count
        recent_readings = db.session.query(func.count(SensorReading.id)).filter(
            SensorReading.timestamp >= last_24h
        ).scalar()
        
        # Trend analysis
        current_week_readings = db.session.query(func.count(SensorReading.id)).filter(
            SensorReading.timestamp >= last_week
        ).scalar()
        
        previous_week_readings = db.session.query(func.count(SensorReading.id)).filter(
            and_(
                SensorReading.timestamp >= (last_week - timedelta(days=7)),
                SensorReading.timestamp < last_week
            )
        ).scalar()
        
        # Performance metrics
        avg_temperature = db.session.query(func.avg(SensorReading.value)).filter(
            and_(
                SensorReading.timestamp >= last_24h,
                Sensor.sensor_type == 'temperature'
            )
        ).join(Sensor).scalar() or 0
        
        max_temperature = db.session.query(func.max(SensorReading.value)).filter(
            and_(
                SensorReading.timestamp >= last_24h,
                Sensor.sensor_type == 'temperature'
            )
        ).join(Sensor).scalar() or 0
        
        summary = {
            'overview': {
                'total_units': total_units,
                'active_units': active_units,
                'total_sensors': total_sensors,
                'recent_readings': recent_readings,
                'uptime_percentage': (active_units / total_units * 100) if total_units > 0 else 0
            },
            'trends': {
                'current_week_readings': current_week_readings,
                'previous_week_readings': previous_week_readings,
                'trend_percentage': (
                    (current_week_readings - previous_week_readings) / previous_week_readings * 100
                    if previous_week_readings > 0 else 0
                )
            },
            'performance': {
                'avg_temperature_24h': round(float(avg_temperature), 2),
                'max_temperature_24h': round(float(max_temperature), 2),
                'data_quality_score': min(100, (recent_readings / (active_units * 24)) * 100) if active_units > 0 else 0
            }
        }
        
        return jsonify(summary)
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to generate dashboard summary"
        )


@analytics_bp.route('/analytics/trends/<unit_id>', methods=['GET'])
@jwt_required()
@permission_required('read_units')
@use_args(TrendsQuerySchema, location='query')
def get_unit_trends(args, unit_id):
    """Get trend analysis for a specific unit.
    
    Query parameters are validated using TrendsQuerySchema.
    
    ---
    tags:
      - Analytics
    security:
      - JWT: []
    parameters:
      - name: unit_id
        in: path
        required: true
        type: string
      - name: days
        in: query
        type: integer
        default: 7
      - name: sensor_type
        in: query
        type: string
    responses:
      200:
        description: Unit trend analysis
      404:
        description: Unit not found
    """
    try:
        # Validate unit exists
        unit = Unit.query.get(unit_id)
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404
        
        # Extract validated parameters
        days = args.get('days', 7)
        sensor_type = args.get('sensor_type')
        
        # Calculate time range
        now = utc_now()
        start_time = now - timedelta(days=days)
        
        # Build query
        query = db.session.query(
            SensorReading.timestamp,
            SensorReading.value,
            Sensor.sensor_type,
            Sensor.name
        ).join(Sensor).filter(
            and_(
                Sensor.unit_id == unit_id,
                SensorReading.timestamp >= start_time
            )
        )
        
        if sensor_type:
            query = query.filter(Sensor.sensor_type == sensor_type)
            
        readings = query.order_by(SensorReading.timestamp).all()
        
        # Group by sensor type
        trends = {}
        for reading in readings:
            sensor_key = reading.sensor_type
            if sensor_key not in trends:
                trends[sensor_key] = {
                    'name': reading.name,
                    'type': reading.sensor_type,
                    'data': []
                }
            
            trends[sensor_key]['data'].append({
                'timestamp': reading.timestamp.isoformat(),
                'value': float(reading.value)
            })
        
        # Calculate statistics for each sensor type
        for sensor_key in trends:
            values = [d['value'] for d in trends[sensor_key]['data']]
            if values:
                trends[sensor_key]['statistics'] = {
                    'min': min(values),
                    'max': max(values),
                    'avg': sum(values) / len(values),
                    'count': len(values)
                }
        
        return jsonify({
            'unit_id': unit_id,
            'period_days': days,
            'trends': trends
        })
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to get unit trends"
        )


@analytics_bp.route('/analytics/performance/units', methods=['GET'])
@jwt_required()
@permission_required('read_units')
@use_args(PerformanceQuerySchema, location='query')
def get_units_performance(args):
    """Get performance analysis across all units.
    
    Query parameters are validated using PerformanceQuerySchema.
    
    ---
    tags:
      - Analytics
    security:
      - JWT: []
    parameters:
      - name: hours
        in: query
        type: integer
        default: 24
    responses:
      200:
        description: Units performance analysis
    """
    try:
        # Extract validated parameter
        hours = args.get('hours', 24)
        start_time = utc_now() - timedelta(hours=hours)
        
        # Performance metrics per unit
        performance_data = db.session.query(
            Unit.id,
            Unit.name,
            Unit.status,
            func.count(SensorReading.id).label('reading_count'),
            func.avg(SensorReading.value).label('avg_value'),
            func.max(SensorReading.value).label('max_value'),
            func.min(SensorReading.value).label('min_value')
        ).outerjoin(Sensor).outerjoin(
            SensorReading,
            and_(
                SensorReading.sensor_id == Sensor.id,
                SensorReading.timestamp >= start_time
            )
        ).group_by(Unit.id, Unit.name, Unit.status).all()
        
        units_performance = []
        for unit_data in performance_data:
            performance_score = 100  # Start with perfect score
            
            # Reduce score based on inactivity
            if unit_data.reading_count == 0:
                performance_score -= 50
            elif unit_data.reading_count < hours:  # Less than 1 reading per hour
                performance_score -= 20
                
            # Status-based scoring
            if unit_data.status == 'offline':
                performance_score -= 30
            elif unit_data.status == 'maintenance':
                performance_score -= 10
                
            units_performance.append({
                'unit_id': unit_data.id,
                'unit_name': unit_data.name,
                'status': unit_data.status,
                'reading_count': unit_data.reading_count or 0,
                'avg_value': round(float(unit_data.avg_value), 2) if unit_data.avg_value else 0,
                'max_value': round(float(unit_data.max_value), 2) if unit_data.max_value else 0,
                'min_value': round(float(unit_data.min_value), 2) if unit_data.min_value else 0,
                'performance_score': max(0, performance_score)
            })
            
        # Sort by performance score descending
        units_performance.sort(key=lambda x: x['performance_score'], reverse=True)
        
        return jsonify({
            'period_hours': hours,
            'units': units_performance,
            'summary': {
                'total_units': len(units_performance),
                'avg_performance': sum(u['performance_score'] for u in units_performance) / len(units_performance) if units_performance else 0,
                'best_performing': units_performance[0] if units_performance else None,
                'worst_performing': units_performance[-1] if units_performance else None
            }
        })
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to get units performance"
        )


@analytics_bp.route('/analytics/alerts/patterns', methods=['GET'])
@jwt_required()
@permission_required('read_units')
@use_args(AlertPatternsQuerySchema, location='query')
def get_alert_patterns(args):
    """Analyze alert patterns and frequencies.
    
    Query parameters are validated using AlertPatternsQuerySchema.
    
    ---
    tags:
      - Analytics
    security:
      - JWT: []
    parameters:
      - name: days
        in: query
        type: integer
        default: 30
    responses:
      200:
        description: Alert pattern analysis
    """
    try:
        # Extract validated parameter
        days = args.get('days', 30)
        start_time = utc_now() - timedelta(days=days)
        
        # For this demo, we'll simulate alert data since we don't have an alerts table yet
        # In a real implementation, you would query actual alert records
        
        # Simulate alert patterns based on sensor readings exceeding thresholds
        critical_readings = db.session.query(
            func.count().label('count'),
            func.date(SensorReading.timestamp).label('date'),
            Sensor.sensor_type
        ).join(Sensor).filter(
            and_(
                SensorReading.timestamp >= start_time,
                or_(
                    and_(Sensor.sensor_type == 'temperature', SensorReading.value > 80),
                    and_(Sensor.sensor_type == 'pressure', SensorReading.value > 100),
                    and_(Sensor.sensor_type == 'flow', SensorReading.value < 10)
                )
            )
        ).group_by(
            func.date(SensorReading.timestamp),
            Sensor.sensor_type
        ).all()
        
        patterns = {}
        for reading in critical_readings:
            date_str = reading.date.isoformat() if reading.date else utc_now().date().isoformat()
            if date_str not in patterns:
                patterns[date_str] = {}
            patterns[date_str][reading.sensor_type] = reading.count
            
        # Calculate trends
        total_alerts = sum(
            sum(day_data.values()) for day_data in patterns.values()
        )
        
        avg_alerts_per_day = total_alerts / days if days > 0 else 0
        
        # Most problematic sensor types
        sensor_totals = {}
        for day_data in patterns.values():
            for sensor_type, count in day_data.items():
                sensor_totals[sensor_type] = sensor_totals.get(sensor_type, 0) + count
                
        return jsonify({
            'period_days': days,
            'total_potential_alerts': total_alerts,
            'avg_alerts_per_day': round(avg_alerts_per_day, 2),
            'daily_patterns': patterns,
            'sensor_type_breakdown': sensor_totals,
            'most_problematic_sensor': max(sensor_totals, key=sensor_totals.get) if sensor_totals else None
        })
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to analyze alert patterns"
        )