"""Utility functions for the ThermaCore SCADA API."""
from datetime import datetime, timedelta, timezone
from dateutil import parser as dateutil_parser
from functools import wraps
from typing import Dict, Any, List

from flask import request, jsonify, current_app
from sqlalchemy import and_, or_
from sqlalchemy.orm import Query

from app.models import User, SensorReading


def paginate_query(query: Query, page: int = 1, per_page: int = 50) -> Dict[str, Any]:
    """
    Paginate a SQLAlchemy query and return formatted result.
    
    Args:
        query: SQLAlchemy query object
        page: Page number (1-based)
        per_page: Number of items per page
        
    Returns:
        Dictionary with pagination metadata and results
    """
    per_page = min(per_page, current_app.config.get('MAX_PAGE_SIZE', 100))
    
    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )
    
    return {
        'data': pagination.items,
        'page': page,
        'per_page': per_page,
        'total': pagination.total,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    }


def validate_json_request():
    """Decorator to validate JSON request data."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
            
            if not request.json:
                return jsonify({'error': 'Request body must contain valid JSON'}), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def format_timestamp(dt: datetime) -> str:
    """
    Format datetime to ISO string.
    
    Args:
        dt: datetime object
        
    Returns:
        ISO formatted string
    """
    if dt:
        return dt.isoformat()
    return None


def parse_timestamp(timestamp_str: str) -> datetime:
    """
    Parse ISO timestamp string to datetime using robust dateutil parser.
    
    Args:
        timestamp_str: ISO formatted timestamp string
        
    Returns:
        datetime object (timezone-aware when possible)
    
    Raises:
        ValueError: If timestamp format is invalid
    """
    try:
        parsed_dt = dateutil_parser.isoparse(timestamp_str)
        # Ensure timezone-aware datetime - if naive, assume UTC
        if parsed_dt.tzinfo is None:
            parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
        return parsed_dt
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid timestamp format: {timestamp_str}") from e


def calculate_time_range(hours_back: int = 24) -> tuple[datetime, datetime]:
    """
    Calculate timezone-aware UTC time range for queries.
    
    Args:
        hours_back: Number of hours to go back from now
        
    Returns:
        Tuple of (start_time, end_time) both in UTC
    """
    # Use timezone-aware UTC datetime instead of deprecated utcnow()
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(hours=hours_back)
    return start_time, end_time


def build_search_filter(model, search_fields: List[str], search_term: str):
    """
    Build SQLAlchemy filter for text search across multiple fields.
    
    Args:
        model: SQLAlchemy model class
        search_fields: List of field names to search
        search_term: Search term
        
    Returns:
        SQLAlchemy filter condition
    """
    if not search_term:
        return None
    
    search_conditions = []
    for field_name in search_fields:
        field = getattr(model, field_name, None)
        if field:
            search_conditions.append(field.ilike(f'%{search_term}%'))
    
    return or_(*search_conditions) if search_conditions else None


def validate_unit_readings(readings_data: Dict[str, float]) -> List[str]:
    """
    Validate unit sensor readings data.
    
    Args:
        readings_data: Dictionary of sensor readings
        
    Returns:
        List of validation error messages
    """
    errors = []
    
    # Define valid ranges for different readings
    ranges = {
        'temp_outside': (-50.0, 70.0),
        'temp_in': (-20.0, 60.0),
        'temp_out': (-20.0, 30.0),
        'humidity': (0.0, 100.0),
        'pressure': (800.0, 1200.0),
        'water_level': (0.0, 2000.0),
        'battery_level': (0.0, 100.0),
        'current_power': (0.0, None),
        'parasitic_load': (0.0, None),
        'user_load': (0.0, None)
    }
    
    for field, value in readings_data.items():
        if field in ranges and value is not None:
            min_val, max_val = ranges[field]
            if min_val is not None and value < min_val:
                errors.append(f'{field} value {value} is below minimum {min_val}')
            if max_val is not None and value > max_val:
                errors.append(f'{field} value {value} exceeds maximum {max_val}')
    
    return errors


def get_recent_sensor_readings(unit_id: str, sensor_type: str = None, 
                             hours_back: int = 24, limit: int = 100) -> List[SensorReading]:
    """
    Get recent sensor readings for a unit.
    
    Args:
        unit_id: Unit identifier
        sensor_type: Optional sensor type filter
        hours_back: Number of hours to look back
        limit: Maximum number of readings to return
        
    Returns:
        List of SensorReading objects
    """
    from app.models import Sensor
    
    start_time, _ = calculate_time_range(hours_back)
    
    query = SensorReading.query.join(Sensor).filter(
        Sensor.unit_id == unit_id,
        SensorReading.timestamp >= start_time
    )
    
    if sensor_type:
        query = query.filter(Sensor.sensor_type == sensor_type)
    
    return query.order_by(SensorReading.timestamp.desc()).limit(limit).all()


def calculate_unit_efficiency(unit_id: str, hours_back: int = 24) -> Dict[str, float]:
    """
    Calculate basic efficiency metrics for a unit.
    
    Args:
        unit_id: Unit identifier
        hours_back: Number of hours to analyze
        
    Returns:
        Dictionary with efficiency metrics
    """
    from app.models import Unit
    
    unit = Unit.query.get(unit_id)
    if not unit:
        return {}
    
    # Get recent power readings
    power_readings = get_recent_sensor_readings(unit_id, 'power', hours_back)
    water_readings = get_recent_sensor_readings(unit_id, 'level', hours_back)
    
    metrics = {
        'uptime_percentage': 0.0,
        'average_power': 0.0,
        'water_generation_rate': 0.0,
        'efficiency_ratio': 0.0
    }
    
    if power_readings:
        # Calculate average power consumption
        total_power = sum(reading.value for reading in power_readings)
        metrics['average_power'] = total_power / len(power_readings)
        
        # Calculate uptime (readings above threshold)
        online_readings = sum(1 for reading in power_readings if reading.value > 0)
        metrics['uptime_percentage'] = (online_readings / len(power_readings)) * 100
    
    if water_readings:
        # Calculate water generation rate (simplified)
        water_values = [reading.value for reading in water_readings]
        if len(water_values) > 1:
            water_diff = max(water_values) - min(water_values)
            time_diff = hours_back
            metrics['water_generation_rate'] = water_diff / time_diff if time_diff > 0 else 0
    
    # Calculate efficiency ratio (water per power unit)
    if metrics['average_power'] > 0 and metrics['water_generation_rate'] > 0:
        metrics['efficiency_ratio'] = metrics['water_generation_rate'] / metrics['average_power']
    
    return metrics


def generate_health_score(unit_id: str) -> Dict[str, Any]:
    """
    Generate a health score for a unit based on various factors.
    
    Args:
        unit_id: Unit identifier
        
    Returns:
        Dictionary with health score and factors
    """
    from app.models import Unit
    
    unit = Unit.query.get(unit_id)
    if not unit:
        return {}
    
    score = 100
    factors = []
    
    # Check status
    if unit.status == 'offline':
        score -= 50
        factors.append('Unit is offline')
    elif unit.status == 'error':
        score -= 30
        factors.append('Unit has error status')
    elif unit.status == 'maintenance':
        score -= 10
        factors.append('Unit is under maintenance')
    
    # Check health status
    if unit.health_status == 'critical':
        score -= 40
        factors.append('Critical health status')
    elif unit.health_status == 'warning':
        score -= 20
        factors.append('Warning health status')
    
    # Check alerts and alarms
    if unit.has_alarm:
        score -= 20
        factors.append('Active alarms present')
    elif unit.has_alert:
        score -= 10
        factors.append('Active alerts present')
    
    # Check battery level
    if unit.battery_level and unit.battery_level < 20:
        score -= 15
        factors.append('Low battery level')
    elif unit.battery_level and unit.battery_level < 40:
        score -= 5
        factors.append('Medium battery level')
    
    # Check maintenance schedule
    if unit.last_maintenance:
        days_since_maintenance = (datetime.utcnow() - unit.last_maintenance).days
        if days_since_maintenance > 90:
            score -= 10
            factors.append('Overdue maintenance')
        elif days_since_maintenance > 60:
            score -= 5
            factors.append('Maintenance due soon')
    
    # Ensure score doesn't go below 0
    score = max(0, score)
    
    # Determine health level
    if score >= 80:
        health_level = 'excellent'
    elif score >= 60:
        health_level = 'good'
    elif score >= 40:
        health_level = 'fair'
    elif score >= 20:
        health_level = 'poor'
    else:
        health_level = 'critical'
    
    return {
        'score': score,
        'health_level': health_level,
        'factors': factors,
        'calculated_at': datetime.utcnow().isoformat()
    }