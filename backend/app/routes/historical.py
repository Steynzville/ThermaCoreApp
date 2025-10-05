"""Historical data analysis routes for Phase 3 SCADA integration."""
from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required
from datetime import timedelta
from sqlalchemy import func, and_
from webargs.flaskparser import use_args

from app.models import Unit, Sensor, SensorReading, db, utc_now  # Use timezone-aware datetime
from app.routes.auth import permission_required
from app.utils.error_handler import SecurityAwareErrorHandler
from app.utils.schemas import (
    HistoricalDataQuerySchema,
    StatisticsQuerySchema,
    ExportDataQuerySchema,
    CompareUnitsSchema
)

# Create historical data blueprint
historical_bp = Blueprint('historical', __name__)


@historical_bp.route('/historical/data/<unit_id>', methods=['GET'])
@jwt_required()
@permission_required('read_units')
@use_args(HistoricalDataQuerySchema, location='query')
def get_historical_data(args, unit_id):
    """Get historical data for a unit with flexible time ranges and aggregation.
    
    Query parameters are validated using HistoricalDataQuerySchema.
    
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
        
        # Extract validated parameters from args
        start_date = args.get('start_date')
        end_date = args.get('end_date')
        sensor_types = args.get('sensor_types')
        aggregation = args['aggregation']
        limit = args['limit']
        
        # Set default time range if not provided (dates are already datetime objects from schema)
        end_time = end_date if end_date else utc_now()
        start_time = start_date if start_date else (end_time - timedelta(days=7))
        
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
            # Aggregated data
            if aggregation == 'hourly':
                time_format = func.date_trunc('hour', SensorReading.timestamp)
            elif aggregation == 'daily':
                time_format = func.date_trunc('day', SensorReading.timestamp)
            elif aggregation == 'weekly':
                time_format = func.date_trunc('week', SensorReading.timestamp)
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
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to get historical data"
        )


@historical_bp.route('/historical/compare/units', methods=['POST'])
@jwt_required()
@permission_required('read_units')
@use_args(CompareUnitsSchema, location='json')
def compare_units_historical(args):
    """Compare historical data between multiple units.
    
    Request body is validated using CompareUnitsSchema.
    
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
        # Extract validated parameters
        unit_ids = args['unit_ids']
        sensor_type = args['sensor_type']
        aggregation = args['aggregation']
        start_date = args.get('start_date')
        end_date = args.get('end_date')
        
        # Validate units exist
        units = Unit.query.filter(Unit.id.in_(unit_ids)).all()
        if len(units) != len(unit_ids):
            return jsonify({'error': 'One or more units not found'}), 404
        
        # Parse time range (dates are already datetime objects from schema)
        end_time = end_date if end_date else utc_now()
        start_time = start_date if start_date else (end_time - timedelta(days=30))
        
        # Set aggregation format
        if aggregation == 'hourly':
            time_format = func.date_trunc('hour', SensorReading.timestamp)
        elif aggregation == 'daily':
            time_format = func.date_trunc('day', SensorReading.timestamp)
        elif aggregation == 'weekly':
            time_format = func.date_trunc('week', SensorReading.timestamp)
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
            unit_values = [
                record.avg_value for record in comparison_data 
                if record.unit_id == unit_id
            ]
            
            if unit_values:
                unit_summaries[unit_id] = {
                    'unit_name': unit_names[unit_id],
                    'overall_avg': round(sum(unit_values) / len(unit_values), 2),
                    'overall_min': round(min(unit_values), 2),
                    'overall_max': round(max(unit_values), 2),
                    'data_points': len(unit_values)
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
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to compare units historical data"
        )


@historical_bp.route('/historical/export/<unit_id>', methods=['GET'])
@jwt_required()
@permission_required('read_units')
@use_args(ExportDataQuerySchema, location='query')
def export_historical_data(args, unit_id):
    """Export historical data for a unit in various formats.
    
    Query parameters are validated using ExportDataQuerySchema.
    
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
        
        # Extract validated parameters
        export_format = args['format']
        start_date = args.get('start_date')
        end_date = args.get('end_date')
        sensor_types = args.get('sensor_types')
        
        # Set time range (dates are already datetime objects from schema)
        end_time = end_date if end_date else utc_now()
        start_time = start_date if start_date else (end_time - timedelta(days=30))
        
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
            
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to export historical data"
        )


@historical_bp.route('/historical/statistics/<unit_id>', methods=['GET'])
@jwt_required()
@permission_required('read_units')
@use_args(StatisticsQuerySchema, location='query')
def get_historical_statistics(args, unit_id):
    """Get statistical analysis of historical data for a unit.
    
    Query parameters are validated using StatisticsQuerySchema.
    
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
        
        # Extract validated parameters
        days = args['days']
        sensor_type = args.get('sensor_type')
        
        start_time = utc_now() - timedelta(days=days)
        
        # Base query
        query = db.session.query(
            Sensor.sensor_type,
            func.count(SensorReading.value).label('total_readings'),
            func.avg(SensorReading.value).label('avg_value'),
            func.min(SensorReading.value).label('min_value'),
            func.max(SensorReading.value).label('max_value'),
            func.stddev(SensorReading.value).label('std_dev')
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
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to get historical statistics"
        )