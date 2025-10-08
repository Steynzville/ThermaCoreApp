"""SCADA integration routes for real-time data management."""
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required
from datetime import datetime, timezone, timedelta

from app.routes.auth import permission_required
from app.utils.error_handler import SecurityAwareErrorHandler

# Create SCADA blueprint
scada_bp = Blueprint('scada', __name__)


@scada_bp.route('/scada/status', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_scada_status():
    """Get status of all SCADA services.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    responses:
      200:
        description: SCADA services status
        schema:
          type: object
          properties:
            mqtt:
              type: object
            websocket:
              type: object
            realtime_processor:
              type: object
    """
    status = {}

    if hasattr(current_app, 'mqtt_client'):
        status['mqtt'] = current_app.mqtt_client.get_status()

    if hasattr(current_app, 'websocket_service'):
        status['websocket'] = current_app.websocket_service.get_status()

    if hasattr(current_app, 'realtime_processor'):
        status['realtime_processor'] = current_app.realtime_processor.get_status()

    return jsonify(status)


@scada_bp.route('/scada/mqtt/connect', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def mqtt_connect():
    """Connect to MQTT broker.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    responses:
      200:
        description: MQTT connection successful
      500:
        description: Connection failed
    """
    try:
        if hasattr(current_app, 'mqtt_client'):
            current_app.mqtt_client.connect()
            return jsonify({'status': 'connected'})
        else:
            return SecurityAwareErrorHandler.handle_service_unavailable('MQTT client')
    except Exception as e:
        return SecurityAwareErrorHandler.handle_mqtt_error(e, 'connection')


@scada_bp.route('/scada/mqtt/disconnect', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def mqtt_disconnect():
    """Disconnect from MQTT broker.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    responses:
      200:
        description: MQTT disconnection successful
    """
    try:
        if hasattr(current_app, 'mqtt_client'):
            current_app.mqtt_client.disconnect()
            return jsonify({'status': 'disconnected'})
        else:
            return SecurityAwareErrorHandler.handle_service_unavailable('MQTT client')
    except Exception as e:
        return SecurityAwareErrorHandler.handle_mqtt_error(e, 'disconnection')


@scada_bp.route('/scada/mqtt/subscribe', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def mqtt_subscribe():
    """Subscribe to additional MQTT topic.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            topic:
              type: string
              description: MQTT topic to subscribe to
            qos:
              type: integer
              description: Quality of Service level (0-2)
              default: 0
    responses:
      200:
        description: Subscription successful
      400:
        description: Invalid request data
      500:
        description: Subscription failed
    """
    try:
        data = request.get_json()
        if not data or 'topic' not in data:
            return SecurityAwareErrorHandler.handle_validation_error(
                ValueError("Topic is required"), 'MQTT subscription'
            )

        topic = data['topic']
        qos = data.get('qos', 0)

        if hasattr(current_app, 'mqtt_client'):
            current_app.mqtt_client.subscribe_topic(topic, qos)
            return jsonify({'status': 'subscribed', 'topic': topic})
        else:
            return SecurityAwareErrorHandler.handle_service_unavailable('MQTT client')

    except Exception as e:
        return SecurityAwareErrorHandler.handle_mqtt_error(e, 'subscription')


@scada_bp.route('/scada/mqtt/publish', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def mqtt_publish():
    """Publish message to MQTT topic.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            topic:
              type: string
              description: MQTT topic to publish to
            payload:
              type: string
              description: Message payload
            qos:
              type: integer
              description: Quality of Service level (0-2)
              default: 0
    responses:
      200:
        description: Message published successfully
      400:
        description: Invalid request data
      500:
        description: Publish failed
    """
    try:
        data = request.get_json()
        if not data or 'topic' not in data or 'payload' not in data:
            return SecurityAwareErrorHandler.handle_validation_error(
                ValueError("Topic and payload are required"), 'MQTT publish'
            )

        topic = data['topic']
        payload = data['payload']
        qos = data.get('qos', 0)

        if hasattr(current_app, 'mqtt_client'):
            success = current_app.mqtt_client.publish_message(topic, payload, qos)
            if success:
                return jsonify({'status': 'published', 'topic': topic})
            else:
                return SecurityAwareErrorHandler.handle_mqtt_error(
                    Exception("Publish failed"), 'message publishing'
                )
        else:
            return SecurityAwareErrorHandler.handle_service_unavailable('MQTT client')

    except Exception as e:
        return SecurityAwareErrorHandler.handle_mqtt_error(e, 'message publishing')


@scada_bp.route('/scada/alerts/rules', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_alert_rules():
    """Get all configured alert rules.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    responses:
      200:
        description: List of alert rules
        schema:
          type: array
          items:
            type: object
    """
    if hasattr(current_app, 'realtime_processor'):
        rules = current_app.realtime_processor.get_alert_rules()
        return jsonify(rules)
    else:
        return SecurityAwareErrorHandler.handle_service_unavailable('Real-time processor')


@scada_bp.route('/scada/alerts/rules', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def add_alert_rule():
    """Add new alert rule.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            sensor_type:
              type: string
              description: Type of sensor to monitor
            condition:
              type: string
              enum: ['greater_than', 'less_than', 'equals']
              description: Condition to check
            threshold:
              type: number
              description: Threshold value
            severity:
              type: string
              enum: ['info', 'warning', 'critical']
              default: warning
            message:
              type: string
              description: Custom alert message template
    responses:
      201:
        description: Alert rule added successfully
      400:
        description: Invalid request data
      500:
        description: Failed to add rule
    """
    try:
        data = request.get_json()
        required_fields = ['sensor_type', 'condition', 'threshold']

        if not data or not all(field in data for field in required_fields):
            return SecurityAwareErrorHandler.handle_validation_error(
                ValueError("Missing required fields"), 'Alert rule creation'
            )

        if hasattr(current_app, 'realtime_processor'):
            current_app.realtime_processor.add_alert_rule(
                sensor_type=data['sensor_type'],
                condition=data['condition'],
                threshold=float(data['threshold']),
                severity=data.get('severity', 'warning'),
                message=data.get('message')
            )
            return jsonify({'status': 'rule_added'}), 201
        else:
            return SecurityAwareErrorHandler.handle_service_unavailable('Real-time processor')

    except ValueError as e:
        return SecurityAwareErrorHandler.handle_validation_error(e, 'Alert rule threshold parsing')
    except Exception as e:
        return SecurityAwareErrorHandler.handle_service_error(e, 'internal_error', 'Alert rule creation', 500)


@scada_bp.route('/scada/websocket/clients', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_websocket_clients():
    """Get information about connected WebSocket clients.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    responses:
      200:
        description: Connected WebSocket clients information
        schema:
          type: object
    """
    if hasattr(current_app, 'websocket_service'):
        clients = current_app.websocket_service.get_connected_clients()
        return jsonify(clients)
    else:
        return SecurityAwareErrorHandler.handle_service_unavailable('WebSocket service')


@scada_bp.route('/scada/opcua/connect', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def opcua_connect():
    """Connect to OPC UA server.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    responses:
      200:
        description: OPC UA connection successful
      500:
        description: Connection failed
    """
    if not hasattr(current_app, 'opcua_client'):
        return SecurityAwareErrorHandler.handle_service_unavailable('OPC UA client')

    try:
        current_app.opcua_client.connect()  # Now raises ConnectionError on failure
        return jsonify({'status': 'connected'})
    except ConnectionError as e:
        return SecurityAwareErrorHandler.handle_opcua_error(e, 'server connection')
    except Exception as e:
        return SecurityAwareErrorHandler.handle_opcua_error(e, 'server connection')


@scada_bp.route('/scada/opcua/disconnect', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def opcua_disconnect():
    """Disconnect from OPC UA server.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    responses:
      200:
        description: OPC UA disconnection successful
    """
    if hasattr(current_app, 'opcua_client'):
        current_app.opcua_client.disconnect()
        return jsonify({'status': 'disconnected'})
    else:
        return SecurityAwareErrorHandler.handle_service_unavailable('OPC UA client')


@scada_bp.route('/scada/opcua/browse', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def opcua_browse():
    """Browse OPC UA server nodes.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    parameters:
      - name: root_node
        in: query
        type: string
        description: Root node ID to start browsing from
        default: i=85
    responses:
      200:
        description: List of OPC UA nodes
        schema:
          type: array
          items:
            type: object
      500:
        description: Browse failed
    """
    if not hasattr(current_app, 'opcua_client'):
        return SecurityAwareErrorHandler.handle_service_unavailable('OPC UA client')

    try:
        root_node = request.args.get('root_node', 'i=85')
        nodes = current_app.opcua_client.browse_server_nodes(root_node)
        return jsonify(nodes)
    except Exception as e:
        return SecurityAwareErrorHandler.handle_opcua_error(e, 'server browsing')


@scada_bp.route('/scada/opcua/subscribe', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def opcua_subscribe():
    """Subscribe to OPC UA node.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            node_id:
              type: string
              description: OPC UA node identifier
            unit_id:
              type: string
              description: ThermaCore unit ID
            sensor_type:
              type: string
              description: Sensor type
            scale_factor:
              type: number
              description: Value scaling factor
              default: 1.0
            offset:
              type: number
              description: Value offset
              default: 0.0
    responses:
      200:
        description: Subscription successful
      400:
        description: Invalid request data
      500:
        description: Subscription failed
    """
    try:
        data = request.get_json()
        required_fields = ['node_id', 'unit_id', 'sensor_type']

        if not data or not all(field in data for field in required_fields):
            return SecurityAwareErrorHandler.handle_validation_error(
                ValueError("Missing required fields"), 'OPC UA subscription'
            )

        if not hasattr(current_app, 'opcua_client'):
            return SecurityAwareErrorHandler.handle_service_unavailable('OPC UA client')

        success = current_app.opcua_client.subscribe_to_node(
            node_id=data['node_id'],
            unit_id=data['unit_id'],
            sensor_type=data['sensor_type'],
            scale_factor=data.get('scale_factor', 1.0),
            offset=data.get('offset', 0.0)
        )

        if success:
            return jsonify({'status': 'subscribed', 'node_id': data['node_id']})
        else:
            return SecurityAwareErrorHandler.handle_opcua_error(
                Exception("Subscription failed"), 'node subscription'
            )

    except Exception as e:
        return SecurityAwareErrorHandler.handle_opcua_error(e, 'node subscription')


@scada_bp.route('/scada/opcua/read', methods=['POST'])
@jwt_required()
@permission_required('read_units')
def opcua_read_node():
    """Read value from OPC UA node.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            node_id:
              type: string
              description: OPC UA node identifier
    responses:
      200:
        description: Node value read successfully
        schema:
          type: object
      400:
        description: Invalid request data
      500:
        description: Read failed
    """
    try:
        data = request.get_json()
        if not data or 'node_id' not in data:
            return SecurityAwareErrorHandler.handle_validation_error(
                ValueError("node_id is required"), 'OPC UA node reading'
            )

        if not hasattr(current_app, 'opcua_client'):
            return SecurityAwareErrorHandler.handle_service_unavailable('OPC UA client')

        result = current_app.opcua_client.read_node_value(data['node_id'])
        if result:
            return jsonify(result)
        else:
            return SecurityAwareErrorHandler.handle_opcua_error(
                Exception("Read failed"), 'node value reading'
            )

    except Exception as e:
        return SecurityAwareErrorHandler.handle_opcua_error(e, 'node value reading')


@scada_bp.route('/scada/opcua/poll', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def opcua_poll():
    """Poll all subscribed OPC UA nodes.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    responses:
      200:
        description: Polling completed
      500:
        description: Polling failed
    """
    if not hasattr(current_app, 'opcua_client'):
        return SecurityAwareErrorHandler.handle_service_unavailable('OPC UA client')

    try:
        current_app.opcua_client.poll_subscribed_nodes()
        return jsonify({'status': 'poll_completed'})
    except Exception as e:
        return SecurityAwareErrorHandler.handle_opcua_error(e, 'node polling')


# Protocol Gateway Simulator Routes

@scada_bp.route('/scada/simulator/status', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_simulator_status():
    """Get protocol gateway simulator status.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    responses:
      200:
        description: Simulator status
        schema:
          type: object
    """
    if hasattr(current_app, 'protocol_simulator'):
        status = current_app.protocol_simulator.get_status()
        return jsonify(status)
    else:
        return SecurityAwareErrorHandler.handle_service_unavailable('Protocol simulator')


@scada_bp.route('/scada/simulator/start', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def start_simulator():
    """Start the protocol gateway simulator.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    responses:
      200:
        description: Simulator started successfully
      500:
        description: Failed to start simulator
    """
    if not hasattr(current_app, 'protocol_simulator'):
        return SecurityAwareErrorHandler.handle_service_unavailable('Protocol simulator')

    try:
        # Connect to MQTT first if not connected
        if not current_app.protocol_simulator.connected:
            if not current_app.protocol_simulator.connect_mqtt():
                return SecurityAwareErrorHandler.handle_service_error(
                    Exception("MQTT connection failed"), 'connection_error', 'Simulator MQTT connection', 500
                )

        success = current_app.protocol_simulator.start_simulation()
        if success:
            return jsonify({'status': 'started'})
        else:
            return SecurityAwareErrorHandler.handle_service_error(
                Exception("Start failed"), 'service_unavailable', 'Simulator start', 500
            )
    except Exception as e:
        return SecurityAwareErrorHandler.handle_service_error(e, 'internal_error', 'Simulator start', 500)


@scada_bp.route('/scada/simulator/stop', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def stop_simulator():
    """Stop the protocol gateway simulator.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    responses:
      200:
        description: Simulator stopped successfully
    """
    if hasattr(current_app, 'protocol_simulator'):
        current_app.protocol_simulator.stop_simulation()
        return jsonify({'status': 'stopped'})
    else:
        return SecurityAwareErrorHandler.handle_service_unavailable('Protocol simulator')


@scada_bp.route('/scada/simulator/inject', methods=['POST'])
@jwt_required()
@permission_required('admin_panel')
def inject_test_scenario():
    """Inject test scenario into the simulator.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            scenario_type:
              type: string
              enum: ['high_temperature', 'sensor_failure', 'unit_offline']
              description: Type of scenario to inject
            unit_id:
              type: string
              description: Specific unit ID (optional)
    responses:
      200:
        description: Scenario injected successfully
      400:
        description: Invalid request data
      500:
        description: Injection failed
    """
    try:
        data = request.get_json()
        if not data or 'scenario_type' not in data:
            return SecurityAwareErrorHandler.handle_validation_error(
                ValueError("scenario_type is required"), 'Scenario injection'
            )

        valid_scenarios = ['high_temperature', 'sensor_failure', 'unit_offline']
        if data['scenario_type'] not in valid_scenarios:
            return SecurityAwareErrorHandler.handle_validation_error(
                ValueError(f"Invalid scenario type. Must be one of: {valid_scenarios}"), 
                'Scenario type validation'
            )

        if not hasattr(current_app, 'protocol_simulator'):
            return SecurityAwareErrorHandler.handle_service_unavailable('Protocol simulator')

        current_app.protocol_simulator.inject_test_scenario(
            scenario_type=data['scenario_type'],
            unit_id=data.get('unit_id')
        )

        return jsonify({'status': 'scenario_injected', 'scenario_type': data['scenario_type']})

    except Exception as e:
        return SecurityAwareErrorHandler.handle_service_error(e, 'internal_error', 'Scenario injection', 500)


# Device Status Monitoring Routes

@scada_bp.route('/scada/devices/status', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_all_devices_status():
    """Get status of all monitored devices.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    responses:
      200:
        description: All devices status
        schema:
          type: object
          properties:
            devices:
              type: array
              items:
                type: object
            total_devices:
              type: integer
            online_devices:
              type: integer
            offline_devices:
              type: integer
    """

    devices_status = []

    # Get device status from Modbus service
    if hasattr(current_app, 'modbus_service'):
        modbus_devices = current_app.modbus_service.get_device_status()
        devices_status.extend(modbus_devices.get('devices', {}).values())

    # Get device status from DNP3 service
    if hasattr(current_app, 'dnp3_service'):
        dnp3_devices = current_app.dnp3_service.get_device_status()
        devices_status.extend(dnp3_devices.get('devices', {}).values())

    # Calculate summary statistics
    total_devices = len(devices_status)
    online_devices = sum(1 for device in devices_status if device.get('connected', False))
    offline_devices = total_devices - online_devices

    return jsonify({
        'devices': devices_status,
        'total_devices': total_devices,
        'online_devices': online_devices,
        'offline_devices': offline_devices,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })


@scada_bp.route('/scada/devices/<device_id>/status', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_device_status(device_id):
    """Get status of a specific device.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    parameters:
      - name: device_id
        in: path
        type: string
        required: true
        description: Device identifier
    responses:
      200:
        description: Device status
        schema:
          type: object
      404:
        description: Device not found
    """
    # Try to find device in Modbus service first
    if hasattr(current_app, 'modbus_service'):
        modbus_status = current_app.modbus_service.get_device_status(device_id)
        if modbus_status and modbus_status.get('devices', {}).get(device_id):
            return jsonify(modbus_status['devices'][device_id])

    # Try DNP3 service
    if hasattr(current_app, 'dnp3_service'):
        dnp3_status = current_app.dnp3_service.get_device_status(device_id)
        if dnp3_status and dnp3_status.get('devices', {}).get(device_id):
            return jsonify(dnp3_status['devices'][device_id])

    return SecurityAwareErrorHandler.handle_not_found('Device', device_id)


@scada_bp.route('/scada/devices/status/history', methods=['GET'])
@jwt_required()
@permission_required('read_units')
def get_device_status_history():
    """Get device status change history.

    ---
    tags:
      - SCADA
    security:
      - JWT: []
    parameters:
      - name: device_id
        in: query
        type: string
        description: Filter by specific device ID
      - name: limit
        in: query
        type: integer
        default: 50
        description: Maximum number of records to return
    responses:
      200:
        description: Device status history
        schema:
          type: object
          properties:
            history:
              type: array
              items:
                type: object
            total_records:
              type: integer
    """
    device_id = request.args.get('device_id')
    limit = min(int(request.args.get('limit', 50)), 1000)  # Cap at 1000

    # For now, return mock data - in a real implementation, this would come from a database
    mock_history = [
        {
            'device_id': device_id or 'TC001',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'status_change': 'online -> offline',
            'event': 'Connection Lost',
            'severity': 'critical'
        },
        {
            'device_id': device_id or 'TC001',
            'timestamp': (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat(),
            'status_change': 'offline -> online',
            'event': 'Connection Restored',
            'severity': 'info'
        }
    ]

    filtered_history = mock_history
    if device_id:
        filtered_history = [h for h in mock_history if h['device_id'] == device_id]

    return jsonify({
        'history': filtered_history[:limit],
        'total_records': len(filtered_history),
        'device_id': device_id,
        'limit': limit
    })