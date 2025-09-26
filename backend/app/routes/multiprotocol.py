"""Multi-protocol management routes for Phase 4 SCADA integration."""
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from typing import Dict, List, Any

from app.routes.auth import permission_required
from app.utils.error_handler import SecurityAwareErrorHandler

# Create multi-protocol blueprint
multiprotocol_bp = Blueprint('multiprotocol', __name__)


@multiprotocol_bp.route('/protocols/status', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_protocols_status():
    """Get status of all supported protocols.
    
    ---
    tags:
      - Multi-Protocol
    security:
      - JWT: []
    responses:
      200:
        description: Status of all protocol services
    """
    try:
        protocols_status = {}
        
        # MQTT status
        if hasattr(current_app, 'mqtt_client'):
            protocols_status['mqtt'] = current_app.mqtt_client.get_status()
        else:
            protocols_status['mqtt'] = {'available': False, 'status': 'not_initialized'}
        
        # OPC UA status
        if hasattr(current_app, 'opcua_client'):
            protocols_status['opcua'] = current_app.opcua_client.get_status()
        else:
            protocols_status['opcua'] = {'available': False, 'status': 'not_initialized'}
        
        # Modbus status
        if hasattr(current_app, 'modbus_service'):
            protocols_status['modbus'] = current_app.modbus_service.get_device_status()
        else:
            protocols_status['modbus'] = {'available': False, 'status': 'not_initialized'}
        
        # DNP3 status  
        if hasattr(current_app, 'dnp3_service'):
            protocols_status['dnp3'] = current_app.dnp3_service.get_device_status()
        else:
            protocols_status['dnp3'] = {'available': False, 'status': 'not_initialized'}
        
        # Protocol simulator status
        if hasattr(current_app, 'protocol_simulator'):
            protocols_status['simulator'] = current_app.protocol_simulator.get_status()
        else:
            protocols_status['simulator'] = {'available': False, 'status': 'not_initialized'}
        
        # Calculate summary
        total_protocols = len(protocols_status)
        active_protocols = sum(1 for status in protocols_status.values() 
                             if status.get('available', False) or status.get('connected', False))
        
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
            'summary': {
                'total_protocols': total_protocols,
                'active_protocols': active_protocols,
                'supported_protocols': ['mqtt', 'opcua', 'modbus', 'dnp3']
            },
            'protocols': protocols_status
        })
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to get protocols status"
        )


@multiprotocol_bp.route('/protocols/modbus/devices', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def list_modbus_devices():
    """List all configured Modbus devices.
    
    ---
    tags:
      - Multi-Protocol
      - Modbus
    security:
      - JWT: []
    responses:
      200:
        description: List of Modbus devices
    """
    try:
        if not hasattr(current_app, 'modbus_service'):
            return jsonify({'error': 'Modbus service not available'}), 503
        
        status = current_app.modbus_service.get_device_status()
        return jsonify(status)
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to list Modbus devices"
        )


@multiprotocol_bp.route('/protocols/modbus/devices', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def add_modbus_device():
    """Add new Modbus device.
    
    ---
    tags:
      - Multi-Protocol
      - Modbus
    security:
      - JWT: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            device_id:
              type: string
            unit_id:
              type: integer
            host:
              type: string
            port:
              type: integer
              default: 502
            device_type:
              type: string
              enum: [tcp, rtu, ascii]
              default: tcp
            timeout:
              type: number
              default: 5.0
    responses:
      201:
        description: Modbus device added successfully
      400:
        description: Invalid request data
    """
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
                'message': f'Modbus device {data["device_id"]} added successfully',
                'device_id': data['device_id']
            }), 201
        else:
            return jsonify({'error': 'Failed to add Modbus device'}), 500
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to add Modbus device"
        )


@multiprotocol_bp.route('/protocols/modbus/devices/<device_id>/connect', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def connect_modbus_device(device_id):
    """Connect to Modbus device.
    
    ---
    tags:
      - Multi-Protocol
      - Modbus
    security:
      - JWT: []
    parameters:
      - name: device_id
        in: path
        required: true
        type: string
    responses:
      200:
        description: Connected successfully
      404:
        description: Device not found
      500:
        description: Connection failed
    """
    try:
        if not hasattr(current_app, 'modbus_service'):
            return jsonify({'error': 'Modbus service not available'}), 503
        
        success = current_app.modbus_service.connect_device(device_id)
        
        if success:
            return jsonify({
                'message': f'Connected to Modbus device {device_id}',
                'device_id': device_id
            })
        else:
            return jsonify({'error': 'Failed to connect to Modbus device'}), 500
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to connect to Modbus device"
        )


@multiprotocol_bp.route('/protocols/modbus/devices/<device_id>/data', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def read_modbus_device_data(device_id):
    """Read data from Modbus device.
    
    ---
    tags:
      - Multi-Protocol
      - Modbus
    security:
      - JWT: []
    parameters:
      - name: device_id
        in: path
        required: true
        type: string
    responses:
      200:
        description: Device data readings
      404:
        description: Device not found
    """
    try:
        if not hasattr(current_app, 'modbus_service'):
            return jsonify({'error': 'Modbus service not available'}), 503
        
        data = current_app.modbus_service.read_device_data(device_id)
        return jsonify(data)
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to read Modbus device data"
        )


@multiprotocol_bp.route('/protocols/dnp3/devices', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def list_dnp3_devices():
    """List all configured DNP3 devices.
    
    ---
    tags:
      - Multi-Protocol
      - DNP3
    security:
      - JWT: []
    responses:
      200:
        description: List of DNP3 devices
    """
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        
        status = current_app.dnp3_service.get_device_status()
        return jsonify(status)
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to list DNP3 devices"
        )


@multiprotocol_bp.route('/protocols/dnp3/devices', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def add_dnp3_device():
    """Add new DNP3 device.
    
    ---
    tags:
      - Multi-Protocol
      - DNP3
    security:
      - JWT: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            device_id:
              type: string
            master_address:
              type: integer
            outstation_address:
              type: integer
            host:
              type: string
            port:
              type: integer
              default: 20000
            link_timeout:
              type: number
              default: 5.0
            app_timeout:
              type: number
              default: 5.0
    responses:
      201:
        description: DNP3 device added successfully
      400:
        description: Invalid request data
    """
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
                'message': f'DNP3 device {data["device_id"]} added successfully',
                'device_id': data['device_id']
            }), 201
        else:
            return jsonify({'error': 'Failed to add DNP3 device'}), 500
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to add DNP3 device"
        )


@multiprotocol_bp.route('/protocols/dnp3/devices/<device_id>/connect', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def connect_dnp3_device(device_id):
    """Connect to DNP3 device.
    
    ---
    tags:
      - Multi-Protocol  
      - DNP3
    security:
      - JWT: []
    parameters:
      - name: device_id
        in: path
        required: true
        type: string
    responses:
      200:
        description: Connected successfully
      404:
        description: Device not found
      500:
        description: Connection failed
    """
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        
        success = current_app.dnp3_service.connect_device(device_id)
        
        if success:
            return jsonify({
                'message': f'Connected to DNP3 device {device_id}',
                'device_id': device_id
            })
        else:
            return jsonify({'error': 'Failed to connect to DNP3 device'}), 500
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to connect to DNP3 device"
        )


@multiprotocol_bp.route('/protocols/dnp3/devices/<device_id>/data', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def read_dnp3_device_data(device_id):
    """Read data from DNP3 device.
    
    ---
    tags:
      - Multi-Protocol
      - DNP3
    security:
      - JWT: []
    parameters:
      - name: device_id
        in: path
        required: true
        type: string
    responses:
      200:
        description: Device data readings
      404:
        description: Device not found
    """
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        
        data = current_app.dnp3_service.read_device_data(device_id)
        return jsonify(data)
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to read DNP3 device data"
        )


@multiprotocol_bp.route('/protocols/dnp3/devices/<device_id>/integrity-poll', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def perform_dnp3_integrity_poll(device_id):
    """Perform integrity poll on DNP3 device.
    
    ---
    tags:
      - Multi-Protocol
      - DNP3
    security:
      - JWT: []
    parameters:
      - name: device_id
        in: path
        required: true
        type: string
    responses:
      200:
        description: Integrity poll completed
      404:
        description: Device not found
      500:
        description: Poll failed
    """
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        
        success = current_app.dnp3_service.perform_integrity_poll(device_id)
        
        if success:
            return jsonify({
                'message': f'Integrity poll completed for DNP3 device {device_id}',
                'device_id': device_id
            })
        else:
            return jsonify({'error': 'Failed to perform integrity poll'}), 500
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to perform DNP3 integrity poll"
        )


@multiprotocol_bp.route('/protocols/unified/devices', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_unified_devices_status():
    """Get unified status of devices across all protocols.
    
    ---
    tags:
      - Multi-Protocol
    security:
      - JWT: []
    responses:
      200:
        description: Unified device status across all protocols
    """
    try:
        unified_status = {
            'timestamp': datetime.utcnow().isoformat(),
            'devices': {}
        }
        
        # Gather Modbus devices
        if hasattr(current_app, 'modbus_service'):
            modbus_status = current_app.modbus_service.get_device_status()
            if 'devices' in modbus_status:
                for device_id, device_info in modbus_status['devices'].items():
                    unified_status['devices'][device_id] = {
                        'protocol': 'modbus',
                        'status': 'connected' if device_info.get('connected') else 'disconnected',
                        'details': device_info
                    }
        
        # Gather DNP3 devices
        if hasattr(current_app, 'dnp3_service'):
            dnp3_status = current_app.dnp3_service.get_device_status()
            if 'devices' in dnp3_status:
                for device_id, device_info in dnp3_status['devices'].items():
                    unified_status['devices'][device_id] = {
                        'protocol': 'dnp3',
                        'status': 'connected' if device_info.get('connected') else 'disconnected',
                        'details': device_info
                    }
        
        # Add MQTT and OPC UA status (existing protocols)
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
        
        # Calculate summary
        total_devices = len(unified_status['devices'])
        connected_devices = sum(1 for device in unified_status['devices'].values() 
                              if device['status'] == 'connected')
        
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
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to get unified devices status"
        )


@multiprotocol_bp.route('/protocols/convert/data', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def convert_protocol_data():
    """Convert data between different protocol formats.
    
    ---
    tags:
      - Multi-Protocol
    security:
      - JWT: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            source_protocol:
              type: string
              enum: [modbus, dnp3, opcua, mqtt]
            target_protocol:
              type: string
              enum: [modbus, dnp3, opcua, mqtt]
            data:
              type: object
              description: Source protocol data
            mapping_config:
              type: object
              description: Mapping configuration between protocols
    responses:
      200:
        description: Converted data
      400:
        description: Invalid request or unsupported conversion
    """
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
        
        # Simple data conversion logic (expandable)
        converted_data = {}
        
        if source_protocol == 'modbus' and target_protocol == 'dnp3':
            # Convert Modbus register data to DNP3 data points
            for key, value in source_data.items():
                if isinstance(value, dict) and 'processed_value' in value:
                    converted_data[key] = {
                        'index': value.get('address', 0),
                        'data_type': 'analog_input',  # Default mapping
                        'value': value['processed_value'],
                        'quality': 'good',
                        'timestamp': value.get('timestamp')
                    }
        
        elif source_protocol == 'dnp3' and target_protocol == 'modbus':
            # Convert DNP3 data points to Modbus register format
            for key, value in source_data.items():
                if isinstance(value, dict) and 'value' in value:
                    converted_data[key] = {
                        'address': value.get('index', 0),
                        'register_type': 'holding_register',  # Default mapping
                        'processed_value': value['value'],
                        'timestamp': value.get('timestamp')
                    }
        
        elif source_protocol == target_protocol:
            # No conversion needed
            converted_data = source_data
            
        else:
            return jsonify({
                'error': f'Conversion from {source_protocol} to {target_protocol} not supported'
            }), 400
        
        return jsonify({
            'source_protocol': source_protocol,
            'target_protocol': target_protocol,
            'conversion_timestamp': datetime.utcnow().isoformat(),
            'converted_data': converted_data,
            'mapping_applied': bool(mapping_config)
        })
        
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(
            e, "Failed to convert protocol data"
        )