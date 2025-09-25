"""SCADA integration routes for real-time data management."""
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.utils.auth_helpers import require_permission

# Create SCADA blueprint
scada_bp = Blueprint('scada', __name__)


@scada_bp.route('/scada/status', methods=['GET'])
@jwt_required()
@require_permission('read_system')
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
@require_permission('manage_system')
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
            return jsonify({'error': 'MQTT client not available'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@scada_bp.route('/scada/mqtt/disconnect', methods=['POST'])
@jwt_required()
@require_permission('manage_system')
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
            return jsonify({'error': 'MQTT client not available'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@scada_bp.route('/scada/mqtt/subscribe', methods=['POST'])
@jwt_required()
@require_permission('manage_system')
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
            return jsonify({'error': 'Topic is required'}), 400
        
        topic = data['topic']
        qos = data.get('qos', 0)
        
        if hasattr(current_app, 'mqtt_client'):
            current_app.mqtt_client.subscribe_topic(topic, qos)
            return jsonify({'status': 'subscribed', 'topic': topic})
        else:
            return jsonify({'error': 'MQTT client not available'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@scada_bp.route('/scada/mqtt/publish', methods=['POST'])
@jwt_required()
@require_permission('manage_system')
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
            return jsonify({'error': 'Topic and payload are required'}), 400
        
        topic = data['topic']
        payload = data['payload']
        qos = data.get('qos', 0)
        
        if hasattr(current_app, 'mqtt_client'):
            success = current_app.mqtt_client.publish_message(topic, payload, qos)
            if success:
                return jsonify({'status': 'published', 'topic': topic})
            else:
                return jsonify({'error': 'Failed to publish message'}), 500
        else:
            return jsonify({'error': 'MQTT client not available'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@scada_bp.route('/scada/alerts/rules', methods=['GET'])
@jwt_required()
@require_permission('read_system')
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
        return jsonify({'error': 'Real-time processor not available'}), 500


@scada_bp.route('/scada/alerts/rules', methods=['POST'])
@jwt_required()
@require_permission('manage_system')
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
            return jsonify({'error': 'Missing required fields'}), 400
        
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
            return jsonify({'error': 'Real-time processor not available'}), 500
            
    except ValueError as e:
        return jsonify({'error': 'Invalid threshold value'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@scada_bp.route('/scada/websocket/clients', methods=['GET'])
@jwt_required()
@require_permission('read_system')
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
        return jsonify({'error': 'WebSocket service not available'}), 500