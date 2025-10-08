"""Remote control routes for ThermaCore SCADA API."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone

from app import db
from app.models import Unit, UnitStatusEnum
from app.routes.auth import permission_required
from app.utils.error_handler import SecurityAwareErrorHandler
from app.middleware.audit import AuditLogger, AuditEventType

# Create remote control blueprint
remote_control_bp = Blueprint('remote_control', __name__)


@remote_control_bp.route('/remote-control/units/<string:unit_id>/power', methods=['POST'])
@jwt_required()
@permission_required('remote_control')
def control_unit_power(unit_id):
    """Control unit power state remotely.

    Expected JSON payload:
    {
        "power_on": true/false
    }
    """
    try:
        data = request.get_json()
        if not data or 'power_on' not in data:
            return jsonify({'error': 'power_on field required'}), 400

        power_on = data['power_on']
        if not isinstance(power_on, bool):
            return jsonify({'error': 'power_on must be boolean'}), 400

        # Get unit
        unit = Unit.query.get(unit_id)
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404

        # Update unit status
        old_status = unit.status
        unit.status = UnitStatusEnum.ONLINE if power_on else UnitStatusEnum.OFFLINE
        unit.updated_at = datetime.now(timezone.utc)

        # If powering off, disable water production
        if not power_on:
            unit.water_generation = False

        db.session.commit()

        # Audit log the control operation
        AuditLogger.log_event(
            event_type=AuditEventType.DATA_OPERATION,
            user_id=get_jwt_identity(),
            resource='unit',
            resource_id=unit_id,
            action='remote_power_control',
            outcome='success',
            details={
                'power_on': power_on,
                'old_status': old_status.value if old_status else None,
                'new_status': unit.status.value,
                'water_generation_affected': not power_on
            }
        )

        return jsonify({
            'success': True,
            'unit_id': unit_id,
            'power_on': power_on,
            'status': unit.status.value,
            'water_generation': unit.water_generation
        })

    except Exception as e:
        return SecurityAwareErrorHandler.handle_service_error(
            e, 'remote_control_error', 'Remote power control', 500
        )


@remote_control_bp.route('/remote-control/units/<string:unit_id>/water-production', methods=['POST'])
@jwt_required()
@permission_required('remote_control')
def control_water_production(unit_id):
    """Control unit water production remotely.

    Expected JSON payload:
    {
        "water_production_on": true/false
    }
    """
    try:
        data = request.get_json()
        if not data or 'water_production_on' not in data:
            return jsonify({'error': 'water_production_on field required'}), 400

        water_production_on = data['water_production_on']
        if not isinstance(water_production_on, bool):
            return jsonify({'error': 'water_production_on must be boolean'}), 400

        # Get unit
        unit = Unit.query.get(unit_id)
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404

        # Check if unit is online (can't control water production if offline)
        if unit.status != UnitStatusEnum.ONLINE and water_production_on:
            return jsonify({'error': 'Cannot enable water production on offline unit'}), 400

        # Update water generation
        old_value = unit.water_generation
        unit.water_generation = water_production_on
        unit.updated_at = datetime.now(timezone.utc)

        db.session.commit()

        # Audit log the control operation
        AuditLogger.log_event(
            event_type=AuditEventType.DATA_OPERATION,
            user_id=get_jwt_identity(),
            resource='unit',
            resource_id=unit_id,
            action='remote_water_control',
            outcome='success',
            details={
                'water_production_on': water_production_on,
                'old_value': old_value,
                'new_value': unit.water_generation,
                'unit_status': unit.status.value
            }
        )

        return jsonify({
            'success': True,
            'unit_id': unit_id,
            'water_production_on': water_production_on,
            'status': unit.status.value
        })

    except Exception as e:
        return SecurityAwareErrorHandler.handle_service_error(
            e, 'remote_control_error', 'Remote water production control', 500
        )


@remote_control_bp.route('/remote-control/units/<string:unit_id>/status', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_remote_control_status(unit_id):
    """Get current remote control status for a unit."""
    try:
        # Get unit
        unit = Unit.query.get(unit_id)
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404

        return jsonify({
            'unit_id': unit_id,
            'status': unit.status.value,
            'water_generation': unit.water_generation,
            'power_on': unit.status == UnitStatusEnum.ONLINE,
            'last_updated': unit.updated_at.isoformat() if unit.updated_at else None
        })

    except Exception as e:
        return SecurityAwareErrorHandler.handle_service_error(
            e, 'remote_control_error', 'Get remote control status', 500
        )


@remote_control_bp.route('/remote-control/permissions', methods=['GET'])
@jwt_required()
def get_remote_control_permissions():
    """Get current user's remote control permissions."""
    try:
        from app.models import User

        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'has_remote_control': user.has_permission('remote_control'),
            'role': user.role.name.value,
            'permissions': {
                'read_units': user.has_permission('read_units'),
                'write_units': user.has_permission('write_units'),
                'remote_control': user.has_permission('remote_control')
            }
        })

    except Exception as e:
        return SecurityAwareErrorHandler.handle_service_error(
            e, 'permission_check_error', 'Get remote control permissions', 500
        )