"""Multi-protocol management routes (normalized status in PR1a)."""
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging

from app.routes.auth import permission_required
from app.utils.error_handler import SecurityAwareErrorHandler
from app.protocols.registry import collect_protocol_status, get_protocols_list
from app.models import utc_now  # Use centralized timezone-aware datetime function

# PR1a: Enhanced logging for protocol status monitoring
logger = logging.getLogger(__name__)

# PR1a: API version for /protocols/status endpoint
PROTOCOLS_API_VERSION = "1.1.0"

multiprotocol_bp = Blueprint('multiprotocol', __name__)

@multiprotocol_bp.route('/protocols/status', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_protocols_status():
    """Get normalized status of all registered protocols with PR1a enhancements.
    
    PR1a improvements:
    - Enhanced availability semantics with degraded state detection
    - Improved heartbeat staleness tracking
    - Better error context and recovery status
    - Token-based request tracking for audit purposes
    - Version header in response
    - Protocols list field in summary
    
    Active protocol: connected == True AND status == 'ready' AND heartbeat not stale.
    
    Returns:
        JSON response with protocol status information including:
        - timestamp: ISO-8601 UTC timestamp
        - version: API version
        - summary: Protocol summary with availability breakdown
        - protocols: Individual protocol status objects
    """
    try:
        # PR1a: Track request for audit purposes
        user_identity = get_jwt_identity()
        logger.info(f"Protocol status requested by user: {user_identity}")
        
        statuses = collect_protocol_status()
        
        # PR1a: Enhanced active protocol counting with heartbeat staleness check
        active_count = sum(1 for s in statuses 
                          if s.get('connected') and s.get('status') == 'ready' and not s.get('is_heartbeat_stale', True))
        
        # PR1a: Count protocols by availability level
        availability_summary = {
            'fully_available': sum(1 for s in statuses if s.get('availability_level') == 'fully_available'),
            'available': sum(1 for s in statuses if s.get('availability_level') == 'available'),
            'degraded': sum(1 for s in statuses if s.get('availability_level') == 'degraded'),
            'unavailable': sum(1 for s in statuses if s.get('availability_level') == 'unavailable')
        }
        
        # PR1a: Count protocols in recovery state
        recovering_count = sum(1 for s in statuses if s.get('is_recovering', False))
        
        # PR1a: Calculate overall health score
        if statuses:
            health_scores = [s.get('health_score', 0) for s in statuses]
            overall_health_score = sum(health_scores) / len(health_scores)
        else:
            overall_health_score = 0.0
        
        response_data = {
            'timestamp': utc_now().isoformat(),
            'version': PROTOCOLS_API_VERSION,  # PR1a: Version header
            'summary': {
                'total_protocols': len(statuses),
                'active_protocols': active_count,
                'supported_protocols': [s['name'] for s in statuses],
                'protocols_list': get_protocols_list(),  # PR1a: Protocols list field
                # PR1a: Enhanced summary fields
                'availability_summary': availability_summary,
                'recovering_protocols': recovering_count,
                'health_score': round(overall_health_score, 1)
            },
            'protocols': {s['name']: s for s in statuses}
        }
        
        # PR1a: Log status summary for monitoring
        logger.debug(f"Protocol status summary - Active: {active_count}/{len(statuses)}, "
                    f"Health Score: {response_data['summary']['health_score']}%")
        
        return jsonify(response_data)
        
    except Exception as e:
        # PR1a: Enhanced error logging with user context
        logger.error(f"Failed to get protocols status for user {get_jwt_identity()}: {str(e)}")
        return SecurityAwareErrorHandler.handle_error(e, "Failed to get protocols status")

# Retaining legacy endpoints below (unchanged) for device operations and conversions
# so that this PR focuses solely on status normalization.

@multiprotocol_bp.route('/protocols/modbus/devices', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def list_modbus_devices():
    """List all Modbus devices and their status.
    
    Returns:
        200: Device status information
        503: Modbus service not available
        
    Example response:
        {
            "devices": {
                "device_001": {
                    "connected": true,
                    "last_poll": "2024-01-01T12:00:00Z",
                    "registers": 24
                }
            }
        }
    """
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
    """Add a new Modbus TCP device to the system.
    
    Request Body:
        device_id (str): Unique device identifier
        unit_id (int): Modbus unit/slave ID
        host (str): Device IP address or hostname
        port (int, optional): TCP port (default: 502)
        device_type (str, optional): Device type (default: 'tcp')
        timeout (float, optional): Connection timeout (default: 5.0)
        
    Returns:
        201: Device added successfully
        400: Missing required fields
        503: Modbus service not available
        
    Example request:
        {
            "device_id": "pump_001",
            "unit_id": 1,
            "host": "192.168.1.100",
            "port": 502
        }
    """
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
        unified_status = {'timestamp': utc_now().isoformat(), 'devices': {}}
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
            'conversion_timestamp': utc_now().isoformat(),
            'converted_data': converted_data,
            'mapping_applied': bool(mapping_config)
        })
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to convert protocol data")


# DNP3 Performance Monitoring Endpoints

@multiprotocol_bp.route('/protocols/dnp3/performance/metrics', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_dnp3_performance_metrics():
    """Get detailed DNP3 performance metrics."""
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        
        metrics = current_app.dnp3_service.get_performance_metrics()
        return jsonify(metrics)
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to get DNP3 performance metrics")


@multiprotocol_bp.route('/protocols/dnp3/performance/summary', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_dnp3_performance_summary():
    """Get DNP3 performance summary."""
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        
        summary = current_app.dnp3_service.get_performance_summary()
        return jsonify(summary)
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to get DNP3 performance summary")


@multiprotocol_bp.route('/protocols/dnp3/devices/<device_id>/performance', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_dnp3_device_performance(device_id):
    """Get performance statistics for a specific DNP3 device."""
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        
        stats = current_app.dnp3_service.get_device_performance_stats(device_id)
        if 'error' in stats:
            return jsonify(stats), 404
        return jsonify(stats)
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, f"Failed to get performance stats for DNP3 device {device_id}")


@multiprotocol_bp.route('/protocols/dnp3/performance/config', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def configure_dnp3_performance():
    """Configure DNP3 performance optimization settings."""
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        
        data = request.get_json() or {}
        
        # Validate input types
        caching = data.get('enable_caching', True)
        bulk_operations = data.get('enable_bulk_operations', True)
        
        if not isinstance(caching, bool):
            return jsonify({'error': 'enable_caching must be a boolean'}), 400
        if not isinstance(bulk_operations, bool):
            return jsonify({'error': 'enable_bulk_operations must be a boolean'}), 400
        
        current_app.dnp3_service.enable_performance_optimizations(
            caching=caching, 
            bulk_operations=bulk_operations
        )
        
        return jsonify({
            'message': 'DNP3 performance configuration updated',
            'caching_enabled': caching,
            'bulk_operations_enabled': bulk_operations,
            'timestamp': utc_now().isoformat()
        })
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to configure DNP3 performance")


@multiprotocol_bp.route('/protocols/dnp3/performance/metrics', methods=['DELETE'])
@jwt_required()
@permission_required('admin_panel')
def clear_dnp3_performance_metrics():
    """Clear DNP3 performance metrics (useful for testing)."""
    try:
        if not hasattr(current_app, 'dnp3_service'):
            return jsonify({'error': 'DNP3 service not available'}), 503
        
        current_app.dnp3_service.clear_performance_metrics()
        return jsonify({
            'message': 'DNP3 performance metrics cleared',
            'timestamp': utc_now().isoformat()
        })
    except Exception as e:
        return SecurityAwareErrorHandler.handle_error(e, "Failed to clear DNP3 performance metrics")
