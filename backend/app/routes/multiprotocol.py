"""Multi-protocol management routes (normalized status in PR1)."""
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required
from datetime import datetime

from app.routes.auth import permission_required
from app.utils.error_handler import SecurityAwareErrorHandler
from app.protocols.registry import collect_protocol_status

multiprotocol_bp = Blueprint('multiprotocol', __name__)

@multiprotocol_bp.route('/protocols/status', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_protocols_status():
    """Get normalized status of all registered protocols.

    Active protocol: connected == True AND status == 'ready'.
    """
    try:
        statuses = collect_protocol_status()
        active_count = sum(1 for s in statuses if s.get('connected') and s.get('status') == 'ready')
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
            'summary': {
                'total_protocols': len(statuses),
                'active_protocols': active_count,
                'supported_protocols': [s['name'] for s in statuses]
            },
            'protocols': {s['name']: s for s in statuses}
        })
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to get protocols status")

# Retaining legacy endpoints below (unchanged) for device operations and conversions
# so that this PR focuses solely on status normalization.

@multiprotocol_bp.route('/protocols/modbus/devices', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def list_modbus_devices():
    try:
        if not hasattr(current_app, 'modbus_service'):
            return jsonify({'error': 'Modbus service not available'}), 503
        return jsonify(current_app.modbus_service.get_device_status())
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to list Modbus devices")

@multiprotocol_bp.route('/protocols/modbus/devices', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def add_modbus_device():
    try:
        if not hasattr(current_app, 'modbus_service'):
            return jsonify({'error': 'Modbus service not available'}), 503
        data = request.get_json() or {}
        for f in ['device_id', 'unit_id', 'host']:
            if f not in data:
                return jsonify({'error': f'Missing required field: {f}'}), 400
        success = current_app.modbus_service.add_device(
            device_id=data['device_id'], unit_id=data['unit_id'], host=data['host'],
            port=data.get('port', 502), device_type=data.get('device_type', 'tcp'), timeout=data.get('timeout', 5.0)
        )
        if success:
            return jsonify({'message': f"Modbus device {data['device_id']} added successfully", 'device_id': data['device_id']}), 201
        return jsonify({'error': 'Failed to add Modbus device'}), 500
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to add Modbus device")

@multiprotocol_bp.route('/protocols/modbus/devices/<device_id>/connect', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def connect_modbus_device(device_id):
    try:
        if not hasattr(current_app, 'modbus_service'):
            return jsonify({'error': 'Modbus service not available'}), 503
        if current_app.modbus_service.connect_device(device_id):
            return jsonify({'message': f'Connected to Modbus device {device_id}', 'device_id': device_id})
        return jsonify({'error': 'Failed to connect to Modbus device'}), 500
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to connect to Modbus device")

@multiprotocol_bp.route('/protocols/modbus/devices/<device_id>/data', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def read_modbus_device_data(device_id):
    try:
        if not hasattr(current_app, 'modbus_service'):
            return jsonify({'error': 'Modbus service not available'}), 503
        return jsonify(current_app.modbus_service.read_device_data(device_id))
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to read Modbus device data")

@multiprotocol_bp.route('/protocols/dnp3/devices', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def list_dnp3_devices():
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        return jsonify(current_app.dnp3_service.get_device_status())
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to list DNP3 devices")

@multiprotocol_bp.route('/protocols/dnp3/devices', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def add_dnp3_device():
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        data = request.get_json() or {}
        for f in ['device_id', 'master_address', 'outstation_address', 'host']:
            if f not in data:
                return jsonify({'error': f'Missing required field: {f}'}), 400
        success = current_app.dnp3_service.add_device(
            device_id=data['device_id'], master_address=data['master_address'], outstation_address=data['outstation_address'],
            host=data['host'], port=data.get('port', 20000), link_timeout=data.get('link_timeout', 5.0), app_timeout=data.get('app_timeout', 5.0)
        )
        if success:
            return jsonify({'message': f"DNP3 device {data['device_id']} added successfully", 'device_id': data['device_id']}), 201
        return jsonify({'error': 'Failed to add DNP3 device'}), 500
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to add DNP3 device")

@multiprotocol_bp.route('/protocols/dnp3/devices/<device_id>/connect', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def connect_dnp3_device(device_id):
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        if current_app.dnp3_service.connect_device(device_id):
            return jsonify({'message': f'Connected to DNP3 device {device_id}', 'device_id': device_id})
        return jsonify({'error': 'Failed to connect to DNP3 device'}), 500
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to connect to DNP3 device")

@multiprotocol_bp.route('/protocols/dnp3/devices/<device_id>/data', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def read_dnp3_device_data(device_id):
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        return jsonify(current_app.dnp3_service.read_device_data(device_id))
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to read DNP3 device data")

@multiprotocol_bp.route('/protocols/dnp3/devices/<device_id>/integrity-poll', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def perform_dnp3_integrity_poll(device_id):
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        if current_app.dnp3_service.perform_integrity_poll(device_id):
            return jsonify({'message': f'Integrity poll completed for DNP3 device {device_id}', 'device_id': device_id})
        return jsonify({'error': 'Failed to perform integrity poll'}), 500
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to perform DNP3 integrity poll")

@multiprotocol_bp.route('/protocols/unified/devices', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_unified_devices_status():
    try:
        unified_status = {'timestamp': datetime.utcnow().isoformat(), 'devices': {}}
        if hasattr(current_app, 'modbus_service'):
            mstat = current_app.modbus_service.get_device_status()
            for did, info in mstat.get('devices', {}).items():
                unified_status['devices'][did] = {'protocol': 'modbus', 'status': 'connected' if info.get('connected') else 'disconnected', 'details': info}
        if hasattr(current_app, 'dnp3_service'):
            dstat = current_app.dnp3_service.get_device_status()
            for did, info in dstat.get('devices', {}).items():
                unified_status['devices'][did] = {'protocol': 'dnp3', 'status': 'connected' if info.get('connected') else 'disconnected', 'details': info}
        if hasattr(current_app, 'mqtt_client'):
            mq = current_app.mqtt_client.get_status()
            unified_status['devices']['mqtt_client'] = {'protocol': 'mqtt', 'status': 'connected' if mq.get('connected') else 'disconnected', 'details': mq}
        if hasattr(current_app, 'opcua_client'):
            op = current_app.opcua_client.get_status()
            unified_status['devices']['opcua_client'] = {'protocol': 'opcua', 'status': 'connected' if op.get('connected') else 'disconnected', 'details': op}
        total = len(unified_status['devices'])
        connected = sum(1 for d in unified_status['devices'].values() if d['status'] == 'connected')
        summary = {}
        for dev in unified_status['devices'].values():
            proto = dev['protocol']
            summary.setdefault(proto, {'total': 0, 'connected': 0})
            summary[proto]['total'] += 1
            if dev['status'] == 'connected':
                summary[proto]['connected'] += 1
        unified_status['summary'] = {
            'total_devices': total,
            'connected_devices': connected,
            'connection_rate': (connected / total * 100) if total else 0,
            'protocols': summary
        }
        return jsonify(unified_status)
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to get unified devices status")

@multiprotocol_bp.route('/protocols/convert/data', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def convert_protocol_data():
    try:
        data = request.get_json() or {}
        source_protocol = data.get('source_protocol')
        target_protocol = data.get('target_protocol')
        source_data = data.get('data')
        mapping_config = data.get('mapping_config', {})
        if not all([source_protocol, target_protocol, source_data]):
            return jsonify({'error': 'Missing required fields'}), 400
        converted_data = {}
        if source_protocol == 'modbus' and target_protocol == 'dnp3':
            for k, v in source_data.items():
                if isinstance(v, dict) and 'processed_value' in v:
                    converted_data[k] = {
                        'index': v.get('address', 0), 'data_type': 'analog_input', 'value': v['processed_value'],
                        'quality': 'good', 'timestamp': v.get('timestamp')
                    }
        elif source_protocol == 'dnp3' and target_protocol == 'modbus':
            for k, v in source_data.items():
                if isinstance(v, dict) and 'value' in v:
                    converted_data[k] = {
                        'address': v.get('index', 0), 'register_type': 'holding_register', 'processed_value': v['value'],
                        'timestamp': v.get('timestamp')
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
