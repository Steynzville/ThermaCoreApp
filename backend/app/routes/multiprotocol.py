"""Multi-protocol management routes for Phase 4 SCADA integration (normalized)."""
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required
from datetime import datetime
from typing import Any

from app.routes.auth import permission_required
from app.utils.error_handler import SecurityAwareErrorHandler
from app.protocols.registry import collect_protocol_status

# Create multi-protocol blueprint
multiprotocol_bp = Blueprint('multiprotocol', __name__)


@multiprotocol_bp.route('/protocols/status', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_protocols_status():
    """Get normalized status of all registered protocols.

    Active protocol definition: connected == True AND status == 'ready'"""
    try:
        statuses = collect_protocol_status()
        active_count = sum(1 for s in statuses if s.get('connected') and s.get('status') == 'ready')
        response = {
            'timestamp': datetime.utcnow().isoformat(),
            'summary': {
                'total_protocols': len(statuses),
                'active_protocols': active_count,
                'supported_protocols': [s['name'] for s in statuses],
            },
            'protocols': {s['name']: s for s in statuses},
        }
        return jsonify(response)
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to get protocols status")


@multiprotocol_bp.route('/protocols/modbus/devices', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def list_modbus_devices():
    """List all configured Modbus devices."""
    try:
        if not hasattr(current_app, 'modbus_service'):
            return jsonify({'error': 'Modbus service not available'}), 503
        status = current_app.modbus_service.get_device_status()
        return jsonify(status)
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to list Modbus devices")


@multiprotocol_bp.route('/protocols/modbus/devices', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def add_modbus_device():
    """Add new Modbus device."""
    try:
        if not hasattr(current_app, 'modbus_service'):
            return jsonify({'error': 'Modbus service not available'}), 503
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        required_fields = ['device_id', 'unit_id', 'host']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        success = current_app.modbus_service.add_device(
            device_id=data['device_id'],
            unit_id=data['unit_id'],
            host=data['host'],
            port=data.get('port', 502),
            device_type=data.get('device_type', 'tcp'),
            timeout=data.get('timeout', 5.0)
        )
        if success:
            return jsonify({
                'message': f'Modbus device {data['device_id']} added successfully',
                'device_id': data['device_id']
            }), 201
        return jsonify({'error': 'Failed to add Modbus device'}), 500
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to add Modbus device")


@multiprotocol_bp.route('/protocols/modbus/devices/<device_id>/connect', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def connect_modbus_device(device_id):
    """Connect to Modbus device."""
    try:
        if not hasattr(current_app, 'modbus_service'):
            return jsonify({'error': 'Modbus service not available'}), 503
        success = current_app.modbus_service.connect_device(device_id)
        if success:
            return jsonify({
                'message': f'Connected to Modbus device {device_id}',
                'device_id': device_id
            })
        return jsonify({'error': 'Failed to connect to Modbus device'}), 500
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to connect to Modbus device")


@multiprotocol_bp.route('/protocols/modbus/devices/<device_id>/data', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def read_modbus_device_data(device_id):
    """Read data from Modbus device."""
    try:
        if not hasattr(current_app, 'modbus_service'):
            return jsonify({'error': 'Modbus service not available'}), 503
        data = current_app.modbus_service.read_device_data(device_id)
        return jsonify(data)
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to read Modbus device data")


@multiprotocol_bp.route('/protocols/dnp3/devices', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def list_dnp3_devices():
    """List all configured DNP3 devices."""
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        status = current_app.dnp3_service.get_device_status()
        return jsonify(status)
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to list DNP3 devices")


@multiprotocol_bp.route('/protocols/dnp3/devices', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def add_dnp3_device():
    """Add new DNP3 device."""
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        required_fields = ['device_id', 'master_address', 'outstation_address', 'host']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        success = current_app.dnp3_service.add_device(
            device_id=data['device_id'],
            master_address=data['master_address'],
            outstation_address=data['outstation_address'],
            host=data['host'],
            port=data.get('port', 20000),
            link_timeout=data.get('link_timeout', 5.0),
            app_timeout=data.get('app_timeout', 5.0)
        )
        if success:
            return jsonify({
                'message': f'DNP3 device {data['device_id']} added successfully',
                'device_id': data['device_id']
            }), 201
        return jsonify({'error': 'Failed to add DNP3 device'}), 500
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to add DNP3 device")


@multiprotocol_bp.route('/protocols/dnp3/devices/<device_id>/connect', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def connect_dnp3_device(device_id):
    """Connect to DNP3 device."""
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        success = current_app.dnp3_service.connect_device(device_id)
        if success:
            return jsonify({
                'message': f'Connected to DNP3 device {device_id}',
                'device_id': device_id
            })
        return jsonify({'error': 'Failed to connect to DNP3 device'}), 500
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to connect to DNP3 device")


@multiprotocol_bp.route('/protocols/dnp3/devices/<device_id>/data', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def read_dnp3_device_data(device_id):
    """Read data from DNP3 device."""
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        data = current_app.dnp3_service.read_device_data(device_id)
        return jsonify(data)
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to read DNP3 device data")


@multiprotocol_bp.route('/protocols/dnp3/devices/<device_id>/integrity-poll', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def perform_dnp3_integrity_poll(device_id):
    """Perform integrity poll on DNP3 device."""
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        success = current_app.dnp3_service.perform_integrity_poll(device_id)
        if success:
            return jsonify({
                'message': f'Integrity poll completed for DNP3 device {device_id}',
                'device_id': device_id
            })
        return jsonify({'error': 'Failed to perform integrity poll'}), 500
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to perform DNP3 integrity poll")


@multiprotocol_bp.route('/protocols/unified/devices', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_unified_devices_status():
    """Get unified status of devices across all protocols."""
    try:
        unified_status = {
            'timestamp': datetime.utcnow().isoformat(),
            'devices': {}
        }
        if hasattr(current_app, 'modbus_service'):
            modbus_status = current_app.modbus_service.get_device_status()
            if 'devices' in modbus_status:
                for device_id, device_info in modbus_status['devices'].items():
                    unified_status['devices'][device_id] = {
                        'protocol': 'modbus',
                        'status': 'connected' if device_info.get('connected') else 'disconnected',
                        'details': device_info
                    }
        if hasattr(current_app, 'dnp3_service'):
            dnp3_status = current_app.dnp3_service.get_device_status()
            if 'devices' in dnp3_status:
                for device_id, device_info in dnp3_status['devices'].items():
                    unified_status['devices'][device_id] = {
                        'protocol': 'dnp3',
                        'status': 'connected' if device_info.get('connected') else 'disconnected',
                        'details': device_info
                    }
        if hasattr(current_app, 'mqtt_client'):
            mqtt_status = current_app.mqtt_client.get_status()
            unified_status['devices']['mqtt_client'] = {
                'protocol': 'mqtt',
                'status': 'connected' if mqtt_status.get('connected') else 'disconnected',
                'details': mqtt_status
            }
        if hasattr(current_app, 'opcua_client'):
            opcua_status = current_app.opcua_client.get_status()
            unified_status['devices']['opcua_client'] = {
                'protocol': 'opcua',
                'status': 'connected' if opcua_status.get('connected') else 'disconnected',
                'details': opcua_status
            }
        total_devices = len(unified_status['devices'])
        connected_devices = sum(1 for device in unified_status['devices'].values() if device['status'] == 'connected')
        protocols_summary = {}
        for device in unified_status['devices'].values():
            protocol = device['protocol']
            if protocol not in protocols_summary:
                protocols_summary[protocol] = {'total': 0, 'connected': 0}
            protocols_summary[protocol]['total'] += 1
            if device['status'] == 'connected':
                protocols_summary[protocol]['connected'] += 1
        unified_status['summary'] = {
            'total_devices': total_devices,
            'connected_devices': connected_devices,
            'connection_rate': (connected_devices / total_devices * 100) if total_devices > 0 else 0,
            'protocols': protocols_summary
        }
        return jsonify(unified_status)
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to get unified devices status")


@multiprotocol_bp.route('/protocols/convert/data', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def convert_protocol_data():
    """Convert data between different protocol formats."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        source_protocol = data.get('source_protocol')
        target_protocol = data.get('target_protocol')
        source_data = data.get('data')
        mapping_config = data.get('mapping_config', {})
        if not all([source_protocol, target_protocol, source_data]):
            return jsonify({'error': 'Missing required fields'}), 400
        converted_data = {}
        if source_protocol == 'modbus' and target_protocol == 'dnp3':
            for key, value in source_data.items():
                if isinstance(value, dict) and 'processed_value' in value:
                    converted_data[key] = {
                        'index': value.get('address', 0),
                        'data_type': 'analog_input',
                        'value': value['processed_value'],
                        'quality': 'good',
                        'timestamp': value.get('timestamp')
                    }
        elif source_protocol == 'dnp3' and target_protocol == 'modbus':
            for key, value in source_data.items():
                if isinstance(value, dict) and 'value' in value:
                    converted_data[key] = {
                        'address': value.get('index', 0),
                        'register_type': 'holding_register',
                        'processed_value': value['value'],
                        'timestamp': value.get('timestamp')
                    }
        elif source_protocol == target_protocol:
            converted_data = source_data
        else:
            return jsonify({'error': f'Conversion from {source_protocol} to {target_protocol} not supported'}), 400
        return jsonify({
            'source_protocol': source_protocol,
            'target_protocol': target_protocol,
            'conversion_timestamp': datetime.utcnow().isoformat(),
            'converted_data': converted_data,
            'mapping_applied': bool(mapping_config)
        })
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to convert protocol data")