"""OPC UA client service for industrial data acquisition."""
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timezone

try:
    from opcua import Client, ua
    from opcua.common.node import Node
    opcua_available = True
except ImportError:
    opcua_available = False
    Client = None
    ua = None
    Node = None

from flask import current_app

logger = logging.getLogger(__name__)


class OPCUAClient:
    """OPC UA client for connecting to industrial automation systems."""
    
    def __init__(self, app=None):
        """Initialize OPC UA client.
        
        Args:
            app: Flask application instance
        """
        self.client = None
        self.connected = False
        self._app = app
        self._subscribed_nodes: Dict[str, Node] = {}
        self._node_mappings: Dict[str, Dict[str, str]] = {}  # Map node IDs to unit/sensor info
        
        if not opcua_available:
            logger.warning("OPC UA library not available")
        
        if app and opcua_available:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize OPC UA client with Flask app configuration."""
        if not opcua_available:
            logger.warning("OPC UA library not available - skipping initialization")
            return
            
        self._app = app
        
        # OPC UA configuration
        self.server_url = app.config.get('OPCUA_SERVER_URL', 'opc.tcp://localhost:4840')
        self.username = app.config.get('OPCUA_USERNAME')
        self.password = app.config.get('OPCUA_PASSWORD')
        self.security_policy = app.config.get('OPCUA_SECURITY_POLICY', 'None')
        self.security_mode = app.config.get('OPCUA_SECURITY_MODE', 'None')
        self.timeout = app.config.get('OPCUA_TIMEOUT', 30)
        
        # Initialize client
        try:
            self.client = Client(self.server_url)
            self.client.set_user(self.username) if self.username else None
            self.client.set_password(self.password) if self.password else None
            logger.info(f"OPC UA client initialized for server: {self.server_url}")
        except Exception as e:
            logger.error(f"Failed to initialize OPC UA client: {e}")
    
    def connect(self) -> bool:
        """Connect to OPC UA server.
        
        Returns:
            True if connection successful, False otherwise
        """
        if not opcua_available or not self.client:
            logger.error("OPC UA client not available")
            return False
        
        try:
            logger.info(f"Connecting to OPC UA server: {self.server_url}")
            self.client.connect()
            self.connected = True
            logger.info("Connected to OPC UA server successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to OPC UA server: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Disconnect from OPC UA server."""
        if self.client and self.connected:
            try:
                logger.info("Disconnecting from OPC UA server")
                self.client.disconnect()
                self.connected = False
            except Exception as e:
                logger.error(f"Error disconnecting from OPC UA server: {e}")
    
    def add_node_mapping(self, node_id: str, unit_id: str, sensor_type: str, 
                        scale_factor: float = 1.0, offset: float = 0.0):
        """Add mapping between OPC UA node and ThermaCore unit/sensor.
        
        Args:
            node_id: OPC UA node identifier
            unit_id: ThermaCore unit ID
            sensor_type: Type of sensor
            scale_factor: Value scaling factor
            offset: Value offset
        """
        self._node_mappings[node_id] = {
            'unit_id': unit_id,
            'sensor_type': sensor_type,
            'scale_factor': scale_factor,
            'offset': offset
        }
        logger.info(f"Added node mapping: {node_id} -> {unit_id}/{sensor_type}")
    
    def subscribe_to_node(self, node_id: str, unit_id: str, sensor_type: str,
                         scale_factor: float = 1.0, offset: float = 0.0) -> bool:
        """Subscribe to OPC UA node for data changes.
        
        Args:
            node_id: OPC UA node identifier
            unit_id: ThermaCore unit ID  
            sensor_type: Type of sensor
            scale_factor: Value scaling factor
            offset: Value offset
            
        Returns:
            True if subscription successful
        """
        if not self.connected or not opcua_available:
            logger.error("Not connected to OPC UA server")
            return False
        
        try:
            # Get node reference
            node = self.client.get_node(node_id)
            
            # Add to subscribed nodes
            self._subscribed_nodes[node_id] = node
            self.add_node_mapping(node_id, unit_id, sensor_type, scale_factor, offset)
            
            logger.info(f"Subscribed to OPC UA node: {node_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe to node {node_id}: {e}")
            return False
    
    def read_node_value(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Read current value from OPC UA node.
        
        Args:
            node_id: OPC UA node identifier
            
        Returns:
            Dictionary with value, status, and timestamp or None if failed
        """
        if not self.connected or not opcua_available:
            logger.error("Not connected to OPC UA server")
            return None
        
        try:
            node = self.client.get_node(node_id)
            data_value = node.get_data_value()
            
            # Extract value and status
            raw_value = data_value.Value.Value
            status_code = data_value.StatusCode
            timestamp = data_value.SourceTimestamp or datetime.now(timezone.utc)
            
            # Apply scaling if node mapping exists
            if node_id in self._node_mappings:
                mapping = self._node_mappings[node_id]
                scaled_value = (raw_value * mapping['scale_factor']) + mapping['offset']
            else:
                scaled_value = raw_value
            
            # Determine quality based on status code
            quality = 'GOOD' if status_code.is_good() else 'BAD'
            
            return {
                'value': scaled_value,
                'raw_value': raw_value,
                'quality': quality,
                'timestamp': timestamp,
                'status_code': str(status_code)
            }
            
        except Exception as e:
            logger.error(f"Failed to read node {node_id}: {e}")
            return None
    
    def read_all_subscribed_nodes(self) -> Dict[str, Dict[str, Any]]:
        """Read values from all subscribed nodes.
        
        Returns:
            Dictionary mapping node IDs to their current values
        """
        results = {}
        
        for node_id in self._subscribed_nodes.keys():
            value_data = self.read_node_value(node_id)
            if value_data:
                results[node_id] = value_data
        
        return results
    
    def process_and_store_node_data(self, node_id: str) -> bool:
        """Read node data and process it through the real-time system.
        
        Args:
            node_id: OPC UA node identifier
            
        Returns:
            True if processing successful
        """
        if node_id not in self._node_mappings:
            logger.error(f"No mapping found for node {node_id}")
            return False
        
        # Read node value
        value_data = self.read_node_value(node_id)
        if not value_data:
            return False
        
        # Get mapping info
        mapping = self._node_mappings[node_id]
        
        # Prepare data for real-time processor
        processed_data = {
            'unit_id': mapping['unit_id'],
            'sensor_type': mapping['sensor_type'],
            'value': value_data['value'],
            'quality': value_data['quality'],
            'timestamp': value_data['timestamp']
        }
        
        # Store in database and process for real-time streaming
        try:
            from app.services.mqtt_service import mqtt_client
            # Use the same storage mechanism as MQTT client
            with self._app.app_context():
                mqtt_client._store_sensor_data(processed_data)
            
            logger.debug(f"Processed OPC UA data: {processed_data}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to process OPC UA data: {e}")
            return False
    
    def poll_subscribed_nodes(self):
        """Poll all subscribed nodes and process their data."""
        if not self.connected:
            logger.warning("Not connected to OPC UA server - skipping poll")
            return
        
        for node_id in list(self._subscribed_nodes.keys()):
            try:
                self.process_and_store_node_data(node_id)
            except Exception as e:
                logger.error(f"Error polling node {node_id}: {e}")
    
    def browse_server_nodes(self, root_node_id: str = "i=85") -> List[Dict[str, Any]]:
        """Browse OPC UA server nodes starting from root.
        
        Args:
            root_node_id: Starting node ID for browsing
            
        Returns:
            List of node information dictionaries
        """
        if not self.connected or not opcua_available:
            logger.error("Not connected to OPC UA server")
            return []
        
        try:
            root_node = self.client.get_node(root_node_id)
            nodes = []
            
            # Browse children nodes
            for child in root_node.get_children():
                try:
                    node_info = {
                        'node_id': str(child.nodeid),
                        'display_name': str(child.get_display_name().Text),
                        'node_class': str(child.get_node_class()),
                        'data_type': None,
                        'value': None
                    }
                    
                    # Try to get data type and value for variable nodes
                    if child.get_node_class() == ua.NodeClass.Variable:
                        try:
                            node_info['data_type'] = str(child.get_data_type_as_variant_type())
                            node_info['value'] = child.get_value()
                        except:
                            pass
                    
                    nodes.append(node_info)
                    
                except Exception as e:
                    logger.warning(f"Error reading node info: {e}")
                    continue
            
            return nodes
            
        except Exception as e:
            logger.error(f"Failed to browse server nodes: {e}")
            return []
    
    def get_status(self) -> Dict[str, Any]:
        """Get OPC UA client status.
        
        Returns:
            Status dictionary
        """
        return {
            'available': opcua_available,
            'connected': self.connected,
            'server_url': self.server_url if opcua_available else None,
            'subscribed_nodes': len(self._subscribed_nodes),
            'node_mappings': len(self._node_mappings),
            'mappings': self._node_mappings.copy() if opcua_available else {}
        }


# Global OPC UA client instance
opcua_client = OPCUAClient()