"""Unit management routes for ThermaCore SCADA API."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_

from app import db
from app.models import Unit, User, Sensor, SensorReading
from app.utils.schemas import (
    UnitSchema, UnitCreateSchema, UnitUpdateSchema,
    SensorSchema, SensorCreateSchema, SensorReadingSchema,
    PaginatedResponseSchema
)
from app.routes.auth import permission_required
from app.middleware.audit import audit_operation


units_bp = Blueprint('units', __name__)


@units_bp.route('/units', methods=['GET'])
@jwt_required()
@permission_required('read_units')
@audit_operation('READ', 'units')
def get_units():
    """
    Get all units with optional filtering and pagination.
    ---
    tags:
      - Units
    parameters:
      - in: query
        name: page
        type: integer
        default: 1
      - in: query
        name: per_page
        type: integer
        default: 50
      - in: query
        name: status
        type: string
        enum: [online, offline, maintenance, error]
      - in: query
        name: health_status
        type: string
        enum: [optimal, warning, critical]
      - in: query
        name: search
        type: string
      - in: query
        name: location
        type: string
    responses:
      200:
        description: List of units
        schema:
          $ref: '#/definitions/PaginatedResponseSchema'
      400:
        description: Invalid parameters
    security:
      - JWT: []
    """
    # Parse query parameters
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 100)
    status = request.args.get('status')
    health_status = request.args.get('health_status')
    search = request.args.get('search', '').strip()
    location = request.args.get('location')
    
    # Build query
    query = Unit.query
    
    # Apply filters
    if status:
        query = query.filter(Unit.status == status)
    
    if health_status:
        query = query.filter(Unit.health_status == health_status)
        
    if location:
        query = query.filter(Unit.location.ilike(f'%{location}%'))
    
    if search:
        search_filter = or_(
            Unit.name.ilike(f'%{search}%'),
            Unit.id.ilike(f'%{search}%'),
            Unit.serial_number.ilike(f'%{search}%'),
            Unit.client_name.ilike(f'%{search}%')
        )
        query = query.filter(search_filter)
    
    # Apply pagination
    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )
    
    units_schema = UnitSchema(many=True)
    
    return jsonify({
        'data': units_schema.dump(pagination.items),
        'page': page,
        'per_page': per_page,
        'total': pagination.total,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    }), 200


@units_bp.route('/units/<string:unit_id>', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_unit(unit_id):
    """
    Get a specific unit by ID.
    ---
    tags:
      - Units
    parameters:
      - in: path
        name: unit_id
        type: string
        required: true
    responses:
      200:
        description: Unit details
        schema:
          $ref: '#/definitions/UnitSchema'
      404:
        description: Unit not found
    security:
      - JWT: []
    """
    unit = Unit.query.get_or_404(unit_id)
    unit_schema = UnitSchema()
    return jsonify(unit_schema.dump(unit)), 200


@units_bp.route('/units', methods=['POST'])
@jwt_required()
@permission_required('write_units')
@audit_operation('CREATE', 'unit', include_request_data=True, include_response_data=True)
def create_unit():
    """
    Create a new unit.
    ---
    tags:
      - Units
    parameters:
      - in: body
        name: unit_data
        schema:
          $ref: '#/definitions/UnitCreateSchema'
    responses:
      201:
        description: Unit created successfully
        schema:
          $ref: '#/definitions/UnitSchema'
      400:
        description: Validation error
      409:
        description: Unit ID or serial number already exists
    security:
      - JWT: []
    """
    schema = UnitCreateSchema()
    
    try:
        data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Check if unit ID already exists
    existing_unit = Unit.query.get(data['id'])
    if existing_unit:
        return jsonify({'error': 'Unit ID already exists'}), 409
    
    # Create new unit
    unit = Unit(**data)
    
    try:
        db.session.add(unit)
        db.session.commit()
        
        # Refresh to get database-generated timestamp
        db.session.refresh(unit)
        
        unit_schema = UnitSchema()
        return jsonify(unit_schema.dump(unit)), 201
        
    except IntegrityError as e:
        db.session.rollback()
        if 'serial_number' in str(e.orig):
            return jsonify({'error': 'Serial number already exists'}), 409
        else:
            return jsonify({'error': 'Database constraint violation'}), 409


@units_bp.route('/units/<string:unit_id>', methods=['PUT'])
@jwt_required()
@permission_required('write_units')
@audit_operation('UPDATE', 'unit', include_request_data=True, include_response_data=True)
def update_unit(unit_id):
    """
    Update an existing unit.
    ---
    tags:
      - Units
    parameters:
      - in: path
        name: unit_id
        type: string
        required: true
      - in: body
        name: unit_data
        schema:
          $ref: '#/definitions/UnitUpdateSchema'
    responses:
      200:
        description: Unit updated successfully
        schema:
          $ref: '#/definitions/UnitSchema'
      400:
        description: Validation error
      404:
        description: Unit not found
    security:
      - JWT: []
    """
    unit = Unit.query.get_or_404(unit_id)
    schema = UnitUpdateSchema()
    
    try:
        data = schema.load(request.json)
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    # Update unit attributes
    for key, value in data.items():
        if hasattr(unit, key):
            setattr(unit, key, value)
    
    try:
        db.session.commit()
        
        # Refresh to get database-generated timestamp
        db.session.refresh(unit)
        
        unit_schema = UnitSchema()
        return jsonify(unit_schema.dump(unit)), 200
        
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({'error': 'Database constraint violation'}), 409


@units_bp.route('/units/<string:unit_id>', methods=['DELETE'])
@jwt_required()
@permission_required('delete_units')
@audit_operation('DELETE', 'unit')
def delete_unit(unit_id):
    """
    Delete a unit.
    ---
    tags:
      - Units
    parameters:
      - in: path
        name: unit_id
        type: string
        required: true
    responses:
      204:
        description: Unit deleted successfully
      404:
        description: Unit not found
    security:
      - JWT: []
    """
    unit = Unit.query.get_or_404(unit_id)
    
    db.session.delete(unit)
    db.session.commit()
    
    return '', 204


@units_bp.route('/units/<string:unit_id>/sensors', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_unit_sensors(unit_id):
    """
    Get all sensors for a specific unit.
    ---
    tags:
      - Units
      - Sensors
    parameters:
      - in: path
        name: unit_id
        type: string
        required: true
    responses:
      200:
        description: List of sensors
        schema:
          type: array
          items:
            $ref: '#/definitions/SensorSchema'
      404:
        description: Unit not found
    security:
      - JWT: []
    """
    unit = Unit.query.get_or_404(unit_id)
    sensors_schema = SensorSchema(many=True)
    return jsonify(sensors_schema.dump(unit.sensors)), 200


@units_bp.route('/units/<string:unit_id>/sensors', methods=['POST'])
@jwt_required()
@permission_required('write_units')
def create_unit_sensor(unit_id):
    """
    Create a new sensor for a unit.
    ---
    tags:
      - Units
      - Sensors
    parameters:
      - in: path
        name: unit_id
        type: string
        required: true
      - in: body
        name: sensor_data
        schema:
          $ref: '#/definitions/SensorCreateSchema'
    responses:
      201:
        description: Sensor created successfully
        schema:
          $ref: '#/definitions/SensorSchema'
      400:
        description: Validation error
      404:
        description: Unit not found
    security:
      - JWT: []
    """
    unit = Unit.query.get_or_404(unit_id)
    schema = SensorCreateSchema()
    
    try:
        data = schema.load(request.json)
        data['unit_id'] = unit_id  # Override unit_id with path parameter
    except ValidationError as err:
        return jsonify({'error': 'Validation error', 'details': err.messages}), 400
    
    sensor = Sensor(**data)
    
    db.session.add(sensor)
    db.session.commit()
    
    # Refresh to get database-generated timestamp
    db.session.refresh(sensor)
    
    sensor_schema = SensorSchema()
    return jsonify(sensor_schema.dump(sensor)), 201


@units_bp.route('/units/<string:unit_id>/readings', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_unit_readings(unit_id):
    """
    Get latest sensor readings for a unit.
    ---
    tags:
      - Units
      - Sensors
    parameters:
      - in: path
        name: unit_id
        type: string
        required: true
      - in: query
        name: hours
        type: integer
        default: 24
        description: Number of hours to look back
      - in: query
        name: sensor_type
        type: string
        description: Filter by sensor type
    responses:
      200:
        description: List of sensor readings
        schema:
          type: array
          items:
            $ref: '#/definitions/SensorReadingSchema'
      404:
        description: Unit not found
    security:
      - JWT: []
    """
    unit = Unit.query.get_or_404(unit_id)
    hours_back = request.args.get('hours', 24, type=int)
    sensor_type = request.args.get('sensor_type')
    
    # Calculate start time in Python for better portability and security
    # Use timezone-aware UTC datetimes for consistency
    from datetime import datetime, timedelta, timezone
    start_time = datetime.now(timezone.utc) - timedelta(hours=hours_back)
    
    # Build query for sensor readings with parameterized timestamp
    query = db.session.query(SensorReading).join(Sensor).filter(
        Sensor.unit_id == unit_id,
        SensorReading.timestamp >= start_time
    )
    
    if sensor_type:
        query = query.filter(Sensor.sensor_type == sensor_type)
    
    readings = query.order_by(SensorReading.timestamp.desc()).limit(1000).all()
    
    readings_schema = SensorReadingSchema(many=True)
    return jsonify(readings_schema.dump(readings)), 200


@units_bp.route('/units/<string:unit_id>/status', methods=['PATCH'])
@jwt_required()
@permission_required('write_units')
def update_unit_status(unit_id):
    """
    Update unit status and health status.
    ---
    tags:
      - Units
    parameters:
      - in: path
        name: unit_id
        type: string
        required: true
      - in: body
        name: status_data
        schema:
          type: object
          properties:
            status:
              type: string
              enum: [online, offline, maintenance, error]
            health_status:
              type: string
              enum: [optimal, warning, critical]
            has_alert:
              type: boolean
            has_alarm:
              type: boolean
    responses:
      200:
        description: Unit status updated
        schema:
          $ref: '#/definitions/UnitSchema'
      400:
        description: Validation error
      404:
        description: Unit not found
    security:
      - JWT: []
    """
    unit = Unit.query.get_or_404(unit_id)
    data = request.json or {}
    
    # Validate status values
    valid_statuses = ['online', 'offline', 'maintenance', 'error']
    valid_health_statuses = ['optimal', 'warning', 'critical']
    
    if 'status' in data and data['status'] not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400
    
    if 'health_status' in data and data['health_status'] not in valid_health_statuses:
        return jsonify({'error': f'Invalid health_status. Must be one of: {valid_health_statuses}'}), 400
    
    # Update fields
    for field in ['status', 'health_status', 'has_alert', 'has_alarm']:
        if field in data:
            setattr(unit, field, data[field])
    
    db.session.commit()
    
    # Refresh to get database-generated timestamp
    db.session.refresh(unit)
    
    unit_schema = UnitSchema()
    return jsonify(unit_schema.dump(unit)), 200


@units_bp.route('/units/stats', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_units_stats():
    """
    Get summary statistics for all units.
    ---
    tags:
      - Units
    responses:
      200:
        description: Unit statistics
        schema:
          type: object
          properties:
            total_units:
              type: integer
            online_units:
              type: integer
            offline_units:
              type: integer
            maintenance_units:
              type: integer
            error_units:
              type: integer
            critical_health:
              type: integer
            warning_health:
              type: integer
            optimal_health:
              type: integer
            units_with_alerts:
              type: integer
            units_with_alarms:
              type: integer
    security:
      - JWT: []
    """
    # Use single query with conditional aggregation for better performance
    # Make boolean comparisons explicit and portable across databases
    result = db.session.query(
        db.func.count().label('total_units'),
        db.func.sum(db.case((Unit.status == 'online', 1), else_=0)).label('online_units'),
        db.func.sum(db.case((Unit.status == 'offline', 1), else_=0)).label('offline_units'),
        db.func.sum(db.case((Unit.status == 'maintenance', 1), else_=0)).label('maintenance_units'),
        db.func.sum(db.case((Unit.status == 'error', 1), else_=0)).label('error_units'),
        db.func.sum(db.case((Unit.health_status == 'critical', 1), else_=0)).label('critical_health'),
        db.func.sum(db.case((Unit.health_status == 'warning', 1), else_=0)).label('warning_health'),
        db.func.sum(db.case((Unit.health_status == 'optimal', 1), else_=0)).label('optimal_health'),
        # Explicit boolean comparison for better PostgreSQL compatibility
        db.func.sum(db.case((Unit.has_alert.is_(True), 1), else_=0)).label('units_with_alerts'),
        db.func.sum(db.case((Unit.has_alarm.is_(True), 1), else_=0)).label('units_with_alarms')
    ).first()
    
    return jsonify({
        'total_units': result.total_units or 0,
        'online_units': result.online_units or 0,
        'offline_units': result.offline_units or 0,
        'maintenance_units': result.maintenance_units or 0,
        'error_units': result.error_units or 0,
        'critical_health': result.critical_health or 0,
        'warning_health': result.warning_health or 0,
        'optimal_health': result.optimal_health or 0,
        'units_with_alerts': result.units_with_alerts or 0,
        'units_with_alarms': result.units_with_alarms or 0
    }), 200