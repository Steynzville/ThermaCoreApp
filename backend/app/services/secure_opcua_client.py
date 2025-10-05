"""Secure OPC-UA Client with enhanced security features."""
from typing import Dict, Any, Optional

from app.services.opcua_service import OPCUAClient, logger
from app.services.secure_opcua_wrapper import SecureOPCUAWrapper, secure_operation


class SecureOPCUAClient(OPCUAClient):
    """
    Enhanced OPC-UA client with comprehensive security wrapper.
    
    This client extends the base OPCUAClient with:
    - Security wrapper integration
    - Enhanced validation
    - Audit logging
    - Rate limiting
    - Secure error handling
    """
    
    def __init__(self, app=None, data_storage_service=None):
        """
        Initialize secure OPC-UA client.
        
        Args:
            app: Flask application instance
            data_storage_service: DataStorageService instance
        """
        super().__init__(app, data_storage_service)
        
        # Initialize security wrapper
        self._security_wrapper = SecureOPCUAWrapper(self)
        logger.info("Secure OPC-UA client initialized with security wrapper")
    
    @secure_operation("connect")
    def connect(self) -> bool:
        """
        Connect to OPC-UA server using secure wrapper.
        
        Returns:
            True if connection successful
            
        Raises:
            ConnectionError: When connection fails
        """
        # Use secure wrapper for connection
        return self._security_wrapper.secure_connect()
    
    @secure_operation("read_node")
    def read_node_value(self, node_id: str) -> Optional[Dict[str, Any]]:
        """
        Read node value using secure wrapper.
        
        Args:
            node_id: OPC-UA node identifier
            
        Returns:
            Dictionary with value, status, and timestamp or None if failed
        """
        # Use secure wrapper for reading
        return self._security_wrapper.secure_read_node(node_id)
    
    @secure_operation("subscribe")
    def subscribe_to_node(self, node_id: str, unit_id: str, sensor_type: str,
                         scale_factor: float = 1.0, offset: float = 0.0) -> bool:
        """
        Subscribe to OPC-UA node with validation.
        
        Args:
            node_id: OPC-UA node identifier
            unit_id: ThermaCore unit ID  
            sensor_type: Type of sensor
            scale_factor: Value scaling factor
            offset: Value offset
            
        Returns:
            True if subscription successful
        """
        # Validate node ID before subscribing
        if not self._security_wrapper.validate_node_id(node_id):
            logger.error(f"Invalid node ID for subscription: {node_id}")
            return False
        
        # Delegate to parent implementation
        return super().subscribe_to_node(node_id, unit_id, sensor_type, scale_factor, offset)
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get enhanced status including security wrapper status.
        
        Returns:
            Status dictionary with security information
        """
        # Get base status
        status = super().get_status()
        
        # Add security wrapper status
        status['security'] = self._security_wrapper.get_security_status()
        
        return status
    
    def get_security_events(self, limit: int = 10) -> list:
        """
        Get recent security events from the wrapper.
        
        Args:
            limit: Maximum number of events to return
            
        Returns:
            List of recent security events
        """
        return self._security_wrapper.get_security_events(limit)
    
    def reset_security_state(self):
        """Reset security state (for administrative purposes)."""
        self._security_wrapper.reset_connection_attempts()
        logger.info("Security state reset for OPC-UA client")


# Global secure OPC-UA client instance
secure_opcua_client = SecureOPCUAClient()
