"""OPC-UA monitoring and security endpoints."""
from flask import Blueprint, jsonify, current_app
from datetime import datetime, timezone

from app.utils.secure_logger import SecureLogger

logger = SecureLogger.get_secure_logger(__name__)

opcua_monitoring = Blueprint('opcua_monitoring', __name__, url_prefix='/api/opcua')


@opcua_monitoring.route('/security/status', methods=['GET'])
def get_opcua_security_status():
    """
    Get comprehensive OPC-UA security status.

    Returns:
        JSON response with security status information
    """
    try:
        status = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'opcua': {}
        }

        # Check if secure OPC-UA client is available
        if hasattr(current_app, 'secure_opcua_client'):
            client = current_app.secure_opcua_client
            status['opcua'] = client.get_status()

            # Add security-specific information
            if hasattr(client, 'get_security_events'):
                status['recent_security_events'] = client.get_security_events(limit=5)

        # Check if standard OPC-UA client is available
        elif hasattr(current_app, 'opcua_client'):
            client = current_app.opcua_client
            status['opcua'] = client.get_status()
            status['note'] = 'Using standard OPC-UA client (not secure wrapper)'
        else:
            status['opcua'] = {
                'available': False,
                'message': 'OPC-UA client not initialized'
            }

        logger.info("OPC-UA security status requested")
        return jsonify(status), 200

    except Exception as e:
        logger.error(f"Error retrieving OPC-UA security status: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to retrieve security status',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500


@opcua_monitoring.route('/security/events', methods=['GET'])
def get_opcua_security_events():
    """
    Get recent OPC-UA security events.

    Returns:
        JSON response with recent security events
    """
    try:
        raw_events = []

        # Check if secure OPC-UA client is available
        if hasattr(current_app, 'secure_opcua_client'):
            client = current_app.secure_opcua_client

            if hasattr(client, 'get_security_events'):
                raw_events = client.get_security_events(limit=20)

        # Create copies of events and convert datetime objects to ISO format strings
        events = []
        for event in raw_events:
            event_copy = event.copy()
            if 'timestamp' in event_copy and hasattr(event_copy['timestamp'], 'isoformat'):
                event_copy['timestamp'] = event_copy['timestamp'].isoformat()
            events.append(event_copy)

        logger.info(f"Retrieved {len(events)} OPC-UA security events")

        return jsonify({
            'events': events,
            'count': len(events),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error retrieving OPC-UA security events: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to retrieve security events',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500


@opcua_monitoring.route('/connection/status', methods=['GET'])
def get_opcua_connection_status():
    """
    Get OPC-UA connection status.

    Returns:
        JSON response with connection status
    """
    try:
        # Check if secure OPC-UA client is available
        if hasattr(current_app, 'secure_opcua_client'):
            client = current_app.secure_opcua_client
        elif hasattr(current_app, 'opcua_client'):
            client = current_app.opcua_client
        else:
            return jsonify({
                'connected': False,
                'available': False,
                'message': 'OPC-UA client not initialized',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 200

        status = client.get_status()

        return jsonify({
            'connected': status.get('connected', False),
            'available': status.get('available', False),
            'server_url': status.get('server_url'),
            'subscribed_nodes': status.get('subscribed_nodes', 0),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error retrieving OPC-UA connection status: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to retrieve connection status',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500


@opcua_monitoring.route('/nodes', methods=['GET'])
def get_opcua_nodes():
    """
    Get list of subscribed OPC-UA nodes.

    Returns:
        JSON response with node information
    """
    try:
        # Check if secure OPC-UA client is available
        if hasattr(current_app, 'secure_opcua_client'):
            client = current_app.secure_opcua_client
        elif hasattr(current_app, 'opcua_client'):
            client = current_app.opcua_client
        else:
            return jsonify({
                'nodes': [],
                'count': 0,
                'message': 'OPC-UA client not initialized',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }), 200

        status = client.get_status()
        mappings = status.get('mappings', {})

        # Format node information
        nodes = []
        for node_id, mapping in mappings.items():
            nodes.append({
                'node_id': node_id,
                'unit_id': mapping.get('unit_id'),
                'sensor_type': mapping.get('sensor_type'),
                'scale_factor': mapping.get('scale_factor', 1.0),
                'offset': mapping.get('offset', 0.0)
            })

        return jsonify({
            'nodes': nodes,
            'count': len(nodes),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error retrieving OPC-UA nodes: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to retrieve nodes',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500


def init_opcua_monitoring(app):
    """
    Initialize OPC-UA monitoring blueprint.

    Args:
        app: Flask application instance
    """
    app.register_blueprint(opcua_monitoring)
    logger.info("OPC-UA monitoring endpoints initialized")
