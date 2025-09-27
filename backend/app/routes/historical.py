"""Historical data analysis routes for Phase 3 SCADA integration."""
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_, desc, asc
from typing import Dict, List, Any
import json

from app.models import Unit, Sensor, SensorReading, db, utc_now  # Use timezone-aware datetime
from app.routes.auth import permission_required
from app.utils.error_handler import SecurityAwareErrorHandler

# Create historical data blueprint
historical_bp = Blueprint('historical', __name__)


@historical_bp.route('/historical/data/<unit_id>', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_historical_data(unit_id):
    """Get historical data for a unit with flexible time ranges and aggregation.
    
    ---
    tags:
      - Historical Data
    security:
      - JWT: []
    parameters:
      - name: unit_id
        in: path
        required: true
        type: string
      - name: start_date
        in: query
        type: string
        format: date-time
        description: Start date (ISO format)
      - name: end_date
        in: query
        type: string
        format: date-time
        description: End date (ISO format)
      - name: sensor_types
        in: query
        type: string
        description: Comma-separated list of sensor types
      - name: aggregation
        in: query
        type: string
        enum: [raw, hourly, daily, weekly]
        default: raw
      - name: limit
        in: query
        type: integer
        default: 1000
    responses:
      200:
        description: Historical data with optional aggregation
      400:
        description: Invalid parameters
      404:
        description: Unit not found
    """
    try:
        # Validate unit exists
        unit = Unit.query.get(unit_id)
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404
        
        # Parse parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        sensor_types = request.args.get('sensor_types')
        aggregation = request.args.get('aggregation', 'raw')
        limit = int(request.args.get('limit', 1000))
        
        # Set default time range if not provided
        if not end_date:
            end_time = utc_now()
        else:
            end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
        if not start_date:
            start_time = end_time - timedelta(days=7)  # Default to last 7 days
        else:
            start_time = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        # Build base query
        query = db.session.query(
            SensorReading.timestamp,
            SensorReading.value,
            Sensor.sensor_type,
            Sensor.name,
            Sensor.unit
        ).join(Sensor).filter(
            and_(
                Sensor.unit_id == unit_id,
                SensorReading.timestamp >= start_time,
                SensorReading.timestamp <= end_time
            )
        )
        
        # Filter by sensor types if specified
        if sensor_types:
            sensor_type_list = [s.strip() for s in sensor_types.split(',')]
            query = query.filter(Sensor.sensor_type.in_(sensor_type_list))
        
        # Apply aggregation
        if aggregation == 'raw':
            readings = query.order_by(SensorReading.timestamp.desc()).limit(limit).all()
            data = []
            for reading in readings:
                data.append({
                    'timestamp': reading.timestamp.isoformat(),
                    'value': float(reading.value),
                    'sensor_type': reading.sensor_type,
                    'sensor_name': reading.name,
                    'unit': reading.unit
                })
        else:
            # Aggregated data (with database dialect compatibility)
            from sqlalchemy.sql import sqltypes
            
            # Check database dialect for compatibility
            dialect_name = db.engine.dialect.name
            
            if dialect_name == 'postgresql':
                # PostgreSQL-specific date_trunc function
                if aggregation == 'hourly':
                    time_format = func.date_trunc('hour', SensorReading.timestamp)
                elif aggregation == 'daily':
                    time_format = func.date_trunc('day', SensorReading.timestamp)
                elif aggregation == 'weekly':
                    time_format = func.date_trunc('week', SensorReading.timestamp)
                else:
                    return jsonify({'error': 'Invalid aggregation type'}), 400
            elif dialect_name == 'sqlite':
                # SQLite-compatible date/time functions
                if aggregation == 'hourly':
                    time_format = func.datetime(func.strftime('%Y-%m-%d %H:00:00', SensorReading.timestamp))
                elif aggregation == 'daily':
                    time_format = func.date(SensorReading.timestamp)
                elif aggregation == 'weekly':
                    # SQLite doesn't have native week truncation, use custom logic
                    time_format = func.date(SensorReading.timestamp, 'weekday 0', '-7 days')
                else:
                    return jsonify({'error': 'Invalid aggregation type'}), 400
            else:
                # Generic SQL approach (may not work for all databases)
                if aggregation == 'hourly':
                    time_format = func.date_format(SensorReading.timestamp, '%Y-%m-%d %H:00:00')
                elif aggregation == 'daily':
                    time_format = func.date(SensorReading.timestamp)
                elif aggregation == 'weekly':
                    time_format = func.date(SensorReading.timestamp)  # Fallback to daily
                else:
                    return jsonify({'error': 'Invalid aggregation type'}), 400
            
            aggregated_data = db.session.query(
                time_format.label('time_bucket'),
                Sensor.sensor_type,
                Sensor.name,
                func.avg(SensorReading.value).label('avg_value'),
                func.min(SensorReading.value).label('min_value'),
                func.max(SensorReading.value).label('max_value'),
                func.count(SensorReading.value).label('count')
            ).join(Sensor).filter(
                and_(
                    Sensor.unit_id == unit_id,
                    SensorReading.timestamp >= start_time,
                    SensorReading.timestamp <= end_time
                )
            )
            
            if sensor_types:
                sensor_type_list = [s.strip() for s in sensor_types.split(',')]
                aggregated_data = aggregated_data.filter(Sensor.sensor_type.in_(sensor_type_list))
            
            aggregated_data = aggregated_data.group_by(
                time_format, Sensor.sensor_type, Sensor.name
            ).order_by(time_format.desc()).limit(limit).all()
            
            data = []
            for reading in aggregated_data:
                data.append({
                    'timestamp': reading.time_bucket.isoformat(),
                    'sensor_type': reading.sensor_type,
                    'sensor_name': reading.name,
                    'avg_value': round(float(reading.avg_value), 2),
                    'min_value': round(float(reading.min_value), 2),
                    'max_value': round(float(reading.max_value), 2),
                    'sample_count': reading.count
                })
        
        return jsonify({
            'unit_id': unit_id,
            'unit_name': unit.name,
            'start_date': start_time.isoformat(),
            'end_date': end_time.isoformat(),
            'aggregation': aggregation,
            'total_records': len(data),
            'sensor_types_filter': sensor_types,
            'data': data
        })
        
    except ValueError as e:
        return jsonify({'error': f'Invalid parameter: {str(e)}'}), 400
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to get historical data"
        )


@historical_bp.route('/historical/compare/units', methods=['POST'])
@jwt_required()
@permission_required('read_units')
def compare_units_historical():
    """Compare historical data between multiple units.
    
    ---
    tags:
      - Historical Data
    security:
      - JWT: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            unit_ids:
              type: array
              items:
                type: string
              description: List of unit IDs to compare
            start_date:
              type: string
              format: date-time
            end_date:
              type: string
              format: date-time
            sensor_type:
              type: string
              description: Sensor type to compare
            aggregation:
              type: string
              enum: [hourly, daily, weekly]
              default: daily
    responses:
      200:
        description: Comparison data for multiple units
      400:
        description: Invalid request data
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        unit_ids = data.get('unit_ids', [])
        sensor_type = data.get('sensor_type')
        aggregation = data.get('aggregation', 'daily')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if not unit_ids:
            return jsonify({'error': 'unit_ids required'}), 400
        
        if not sensor_type:
            return jsonify({'error': 'sensor_type required'}), 400
        
        # Validate units exist
        units = Unit.query.filter(Unit.id.in_(unit_ids)).all()
        if len(units) != len(unit_ids):
            return jsonify({'error': 'One or more units not found'}), 404
        
        # Parse time range
        if not end_date:
            end_time = utc_now()
        else:
            end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
        if not start_date:
            start_time = end_time - timedelta(days=30)  # Default to last 30 days
        else:
            start_time = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        # Set aggregation format (with database dialect compatibility)
        from sqlalchemy.sql import sqltypes
        from app.models import db
        
        # Check database dialect for compatibility
        dialect_name = db.engine.dialect.name
        
        if dialect_name == 'postgresql':
            # PostgreSQL-specific date_trunc function
            if aggregation == 'hourly':
                time_format = func.date_trunc('hour', SensorReading.timestamp)
            elif aggregation == 'daily':
                time_format = func.date_trunc('day', SensorReading.timestamp)
            elif aggregation == 'weekly':
                time_format = func.date_trunc('week', SensorReading.timestamp)
            else:
                return jsonify({'error': 'Invalid aggregation type'}), 400
        elif dialect_name == 'sqlite':
            # SQLite-compatible date/time functions
            if aggregation == 'hourly':
                time_format = func.datetime(func.strftime('%Y-%m-%d %H:00:00', SensorReading.timestamp))
            elif aggregation == 'daily':
                time_format = func.date(SensorReading.timestamp)
            elif aggregation == 'weekly':
                # SQLite doesn't have native week truncation, use custom logic
                time_format = func.date(SensorReading.timestamp, 'weekday 0', '-7 days')
            else:
                return jsonify({'error': 'Invalid aggregation type'}), 400
        else:
            # Generic SQL approach (may not work for all databases)
            if aggregation == 'hourly':
                time_format = func.date_format(SensorReading.timestamp, '%Y-%m-%d %H:00:00')
            elif aggregation == 'daily':
                time_format = func.date(SensorReading.timestamp)
            elif aggregation == 'weekly':
                time_format = func.date(SensorReading.timestamp)  # Fallback to daily
            else:
                return jsonify({'error': 'Invalid aggregation type'}), 400
        
        # Get comparison data
        comparison_data = db.session.query(
            time_format.label('time_bucket'),
            Sensor.unit_id,
            Unit.name.label('unit_name'),
            func.avg(SensorReading.value).label('avg_value'),
            func.min(SensorReading.value).label('min_value'),
            func.max(SensorReading.value).label('max_value'),
            func.count(SensorReading.value).label('count')
        ).join(Sensor).join(Unit).filter(
            and_(
                Sensor.unit_id.in_(unit_ids),
                Sensor.sensor_type == sensor_type,
                SensorReading.timestamp >= start_time,
                SensorReading.timestamp <= end_time
            )
        ).group_by(
            time_format, Sensor.unit_id, Unit.name
        ).order_by(time_format.asc()).all()
        
        # Organize data by time bucket
        time_series = {}
        unit_names = {unit.id: unit.name for unit in units}
        
        for record in comparison_data:
            time_key = record.time_bucket.isoformat()
            if time_key not in time_series:
                time_series[time_key] = {
                    'timestamp': time_key,
                    'units': {}
                }
            
            time_series[time_key]['units'][record.unit_id] = {
                'unit_name': record.unit_name,
                'avg_value': round(float(record.avg_value), 2),
                'min_value': round(float(record.min_value), 2),
                'max_value': round(float(record.max_value), 2),
                'sample_count': record.count
            }
        
        # Calculate summary statistics per unit
        unit_summaries = {}
        for unit_id in unit_ids:
            unit_records = [
                record for record in comparison_data 
                if record.unit_id == unit_id
            ]
            
            if unit_records:
                # Calculate weighted average based on sample count
                total_value_sum = sum(record.avg_value * record.count for record in unit_records)
                total_count = sum(record.count for record in unit_records)
                unit_avg_values = [record.avg_value for record in unit_records]
                
                unit_summaries[unit_id] = {
                    'unit_name': unit_names[unit_id],
                    'overall_avg': round(total_value_sum / total_count, 2) if total_count > 0 else 0,
                    'overall_min': round(min(unit_avg_values), 2),
                    'overall_max': round(max(unit_avg_values), 2),
                    'data_points': total_count
                }
            else:
                unit_summaries[unit_id] = {
                    'unit_name': unit_names[unit_id],
                    'overall_avg': 0,
                    'overall_min': 0,
                    'overall_max': 0,
                    'data_points': 0
                }
        
        return jsonify({
            'comparison': {
                'unit_ids': unit_ids,
                'sensor_type': sensor_type,
                'aggregation': aggregation,
                'start_date': start_time.isoformat(),
                'end_date': end_time.isoformat(),
                'time_series': list(time_series.values()),
                'unit_summaries': unit_summaries
            }
        })
        
    except ValueError as e:
        return jsonify({'error': f'Invalid parameter: {str(e)}'}), 400
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to compare units historical data"
        )


@historical_bp.route('/historical/export/<unit_id>', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def export_historical_data(unit_id):
    """Export historical data for a unit in various formats.
    
    ---
    tags:
      - Historical Data
    security:
      - JWT: []
    parameters:
      - name: unit_id
        in: path
        required: true
        type: string
      - name: format
        in: query
        type: string
        enum: [json, csv]
        default: json
      - name: start_date
        in: query
        type: string
        format: date-time
      - name: end_date
        in: query
        type: string
        format: date-time
      - name: sensor_types
        in: query
        type: string
        description: Comma-separated list of sensor types
    responses:
      200:
        description: Exported data
      400:
        description: Invalid parameters
      404:
        description: Unit not found
    """
    try:
        # Validate unit exists
        unit = Unit.query.get(unit_id)
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404
        
        # Parse parameters
        export_format = request.args.get('format', 'json')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        sensor_types = request.args.get('sensor_types')
        
        # Set time range
        if not end_date:
            end_time = utc_now()
        else:
            end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
        if not start_date:
            start_time = end_time - timedelta(days=30)  # Default to last 30 days
        else:
            start_time = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        # Build query
        query = db.session.query(
            SensorReading.timestamp,
            SensorReading.value,
            Sensor.sensor_type,
            Sensor.name,
            Sensor.unit
        ).join(Sensor).filter(
            and_(
                Sensor.unit_id == unit_id,
                SensorReading.timestamp >= start_time,
                SensorReading.timestamp <= end_time
            )
        )
        
        if sensor_types:
            sensor_type_list = [s.strip() for s in sensor_types.split(',')]
            query = query.filter(Sensor.sensor_type.in_(sensor_type_list))
        
        readings = query.order_by(SensorReading.timestamp.desc()).all()
        
        if export_format == 'csv':
            # Prepare CSV data
            csv_lines = ['timestamp,sensor_type,sensor_name,unit,value']
            
            for reading in readings:
                csv_lines.append(
                    f"{reading.timestamp.isoformat()},"
                    f"{reading.sensor_type},"
                    f"{reading.name},"
                    f"{reading.unit},"
                    f"{reading.value}"
                )
            
            csv_content = '\\n'.join(csv_lines)
            
            response = current_app.response_class(
                csv_content,
                mimetype='text/csv',
                headers={
                    'Content-Disposition': f'attachment; filename=unit_{unit_id}_historical_data.csv'
                }
            )
            return response
        
        else:  # JSON format
            data = []
            for reading in readings:
                data.append({
                    'timestamp': reading.timestamp.isoformat(),
                    'value': float(reading.value),
                    'sensor_type': reading.sensor_type,
                    'sensor_name': reading.name,
                    'unit': reading.unit
                })
            
            return jsonify({
                'unit_id': unit_id,
                'unit_name': unit.name,
                'export_format': export_format,
                'start_date': start_time.isoformat(),
                'end_date': end_time.isoformat(),
                'total_records': len(data),
                'data': data
            })
            
    except ValueError as e:
        return jsonify({'error': f'Invalid parameter: {str(e)}'}), 400
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to export historical data"
        )


@historical_bp.route('/historical/statistics/<unit_id>', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_historical_statistics(unit_id):
    """Get statistical analysis of historical data for a unit.
    
    ---
    tags:
      - Historical Data
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
        default: 30
        description: Number of days to analyze
      - name: sensor_type
        in: query
        type: string
        description: Specific sensor type to analyze
    responses:
      200:
        description: Statistical analysis of historical data
      404:
        description: Unit not found
    """
    try:
        # Validate unit exists
        unit = Unit.query.get(unit_id)
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404
        
        days = int(request.args.get('days', 30))
        sensor_type = request.args.get('sensor_type')
        
        start_time = utc_now() - timedelta(days=days)
        
        # Base query (with database dialect compatibility for stddev)
        dialect_name = db.engine.dialect.name
        
        if dialect_name == 'postgresql':
            # PostgreSQL has native stddev function
            stddev_func = func.stddev(SensorReading.value)
        elif dialect_name == 'sqlite':
            # SQLite doesn't have stddev, calculate manually or use 0
            # For simplicity, we'll calculate it in Python later or use a simpler approach
            stddev_func = func.avg(SensorReading.value * SensorReading.value) - func.avg(SensorReading.value) * func.avg(SensorReading.value)
        else:
            # Generic approach - try stddev, fallback to 0
            try:
                stddev_func = func.stddev(SensorReading.value)
            except:
                stddev_func = func.coalesce(func.stddev(SensorReading.value), 0)
        
        query = db.session.query(
            Sensor.sensor_type,
            func.count(SensorReading.value).label('total_readings'),
            func.avg(SensorReading.value).label('avg_value'),
            func.min(SensorReading.value).label('min_value'),
            func.max(SensorReading.value).label('max_value'),
            stddev_func.label('std_dev')
        ).join(Sensor).filter(
            and_(
                Sensor.unit_id == unit_id,
                SensorReading.timestamp >= start_time
            )
        )
        
        if sensor_type:
            query = query.filter(Sensor.sensor_type == sensor_type)
        
        stats = query.group_by(Sensor.sensor_type).all()
        
        statistics = {}
        for stat in stats:
            statistics[stat.sensor_type] = {
                'total_readings': stat.total_readings,
                'average': round(float(stat.avg_value), 2) if stat.avg_value else 0,
                'minimum': round(float(stat.min_value), 2) if stat.min_value else 0,
                'maximum': round(float(stat.max_value), 2) if stat.max_value else 0,
                'standard_deviation': round(float(stat.std_dev), 2) if stat.std_dev else 0,
                'range': round(float(stat.max_value - stat.min_value), 2) if stat.max_value and stat.min_value else 0
            }
        
        return jsonify({
            'unit_id': unit_id,
            'unit_name': unit.name,
            'analysis_period_days': days,
            'sensor_type_filter': sensor_type,
            'statistics': statistics,
            'total_sensor_types': len(statistics)
        })
        
    except ValueError:
        return jsonify({'error': 'Invalid days parameter'}), 400
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to get historical statistics"
        )