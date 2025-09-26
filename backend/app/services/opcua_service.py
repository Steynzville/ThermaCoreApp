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
from app.utils.environment import is_production_environment

logger = logging.getLogger(__name__)


class OPCUAClient:
    """OPC UA client for connecting to industrial automation systems."""
    
    # Define valid security policies and their strength levels
    VALID_SECURITY_POLICIES = {
        'None': 'insecure',
        'Basic128Rsa15': 'weak', 
        'Basic256': 'weak',
        'Basic256Sha256': 'strong',
        'Aes256_Sha256_RsaPss': 'strong'
    }
    
    def __init__(self, app=None, data_storage_service=None):
        """Initialize OPC UA client.
        
        Args:
            app: Flask application instance
            data_storage_service: DataStorageService instance for dependency injection
        """
        self.client = None
        self.connected = False
        self._app = app
        self._data_storage_service = data_storage_service
        self._subscribed_nodes: Dict[str, Node] = {}
        self._node_mappings: Dict[str, Dict[str, str]] = {}  # Map node IDs to unit/sensor info
        
        if not opcua_available:
            logger.warning("OPC UA library not available")
        
        if app and opcua_available:
            self.init_app(app, data_storage_service)
    
    def _validate_security_policy(self, policy: str, require_strong: bool = False) -> bool:
        """
        Validate OPC UA security policy.
        
        Args:
            policy: Security policy string to validate
            require_strong: If True, require strong security policies
            
        Returns:
            True if policy is valid and meets strength requirements
            
        Raises:
            ValueError: If policy is invalid or too weak when strong policy required
        """
        if policy not in self.VALID_SECURITY_POLICIES:
            raise ValueError(f"Invalid OPC UA security policy: {policy}. "
                           f"Must be one of: {list(self.VALID_SECURITY_POLICIES.keys())}")
        
        policy_strength = self.VALID_SECURITY_POLICIES[policy]
        
        if require_strong and policy_strength != 'strong':
            raise ValueError(f"OPC UA security policy '{policy}' is too weak for production. "
                           f"Must use strong policies: Basic256Sha256 or Aes256_Sha256_RsaPss")
        
        return True
    
    def _load_trust_certificate(self, is_prod: bool):
        """Load and validate trust certificate.
        
        Args:
            is_prod: Whether running in production environment
            
        Raises:
            ValueError: If certificate loading fails
        """
        if not self.trust_cert_file:
            if is_prod:
                logger.error("OPC UA server certificate trust not configured - this is required for production security")
                raise ValueError("OPC UA server certificate trust must be configured in production environment")
            return
        
        import os
        from cryptography import x509
        from cryptography.hazmat.backends import default_backend
        
        if not os.path.exists(self.trust_cert_file):
            # Sanitize path in error messages for security
            sanitized_path = "***" if is_prod else self.trust_cert_file
            logger.error(f"OPC UA trust certificate file not found: {sanitized_path}")
            raise ValueError(f"OPC UA trust certificate file does not exist")
        
        try:
            # Load and validate the certificate
            with open(self.trust_cert_file, 'rb') as cert_file:
                cert_data = cert_file.read()
            
            # Try to parse as PEM first, then DER
            try:
                certificate = x509.load_pem_x509_certificate(cert_data, default_backend())
            except ValueError:
                try:
                    certificate = x509.load_der_x509_certificate(cert_data, default_backend())
                except ValueError as e:
                    # Certificate format errors are always security issues - always raise
                    logger.error(f"Invalid certificate format detected", exc_info=True)
                    raise ValueError(f"Invalid certificate format: {e}")
            
            # Validate certificate is not expired (always a security issue)
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            
            # Use the newer UTC-aware properties if available, fall back to older ones
            try:
                not_valid_after_utc = certificate.not_valid_after_utc
                not_valid_before_utc = certificate.not_valid_before_utc
            except AttributeError:
                # Fallback for older cryptography versions - handle naive UTC datetimes correctly
                try:
                    # For older cryptography versions, dates are naive and assumed to be UTC
                    # Use fromisoformat with explicit UTC timezone for proper handling
                    not_valid_after_utc = datetime.fromisoformat(
                        certificate.not_valid_after.isoformat() + '+00:00'
                    )
                    not_valid_before_utc = datetime.fromisoformat(
                        certificate.not_valid_before.isoformat() + '+00:00'
                    )
                except (ValueError, AttributeError):
                    # Final fallback if fromisoformat fails - assume naive UTC
                    not_valid_after_utc = certificate.not_valid_after.replace(tzinfo=timezone.utc)
                    not_valid_before_utc = certificate.not_valid_before.replace(tzinfo=timezone.utc)
            
            if not_valid_after_utc < now:
                logger.error(f"Certificate validation failed: expired certificate detected", exc_info=True)
                raise ValueError(f"Server certificate has expired: {not_valid_after_utc}")
            if not_valid_before_utc > now:
                logger.error(f"Certificate validation failed: certificate not yet valid", exc_info=True)
                raise ValueError(f"Server certificate is not yet valid: {not_valid_before_utc}")
            
            # Actually load the certificate into the OPC UA client's trust store
            try:
                self.client.load_server_certificate(self.trust_cert_file)
                # Sanitize path in logs for security
                sanitized_path = "***" if is_prod else self.trust_cert_file
                logger.info(f"OPC UA server certificate loaded and trusted from: {sanitized_path}")
            except Exception as e:
                # If the opcua library doesn't support this method, fall back to manual trust store management
                logger.warning(f"Could not load server certificate via opcua library: {e}")
                sanitized_path = "***" if is_prod else self.trust_cert_file
                logger.info(f"OPC UA server certificate validated and configured for trust from: {sanitized_path}")
            
        except (OSError, IOError) as e:
            # File I/O errors - log with sanitized path and handle based on environment
            logger.error(f"Failed to read OPC UA trust certificate file", exc_info=True)
            if is_prod:
                raise ValueError(f"Cannot read OPC UA trust certificate file")
            else:
                # Only allow file I/O issues in development with clear message
                logger.warning(f"OPC UA trust certificate file I/O error (development): {e}")
                raise ValueError(f"Certificate file I/O error: {e}")
        
        except ValueError:
            # Certificate validation errors (format, expiry, etc.) - always re-raise as-is
            # These are security issues that should be fixed regardless of environment
            raise
        
        except Exception as e:
            # Other unexpected errors during certificate loading
            logger.error(f"Unexpected error during OPC UA trust certificate loading", exc_info=True)
            if is_prod:
                raise ValueError(f"Failed to load OPC UA trust certificate in production: {e}")
            else:
                # Only allow connection/loading issues in development  
                logger.warning(f"OPC UA trust certificate loading failed (development): {e}")
                raise ValueError(f"Certificate loading failed: {e}")
    
    def init_app(self, app, data_storage_service=None):
        """Initialize OPC UA client with Flask app configuration."""
        if not opcua_available:
            logger.warning("OPC UA library not available - skipping initialization")
            return
            
        self._app = app
        self._data_storage_service = data_storage_service
        
        # OPC UA configuration
        self.server_url = app.config.get('OPCUA_SERVER_URL', 'opc.tcp://localhost:4840')
        self.username = app.config.get('OPCUA_USERNAME')
        self.password = app.config.get('OPCUA_PASSWORD')
        self.security_policy = app.config.get('OPCUA_SECURITY_POLICY', 'None')
        self.security_mode = app.config.get('OPCUA_SECURITY_MODE', 'None')
        self.timeout = app.config.get('OPCUA_TIMEOUT', 30)
        self.cert_file = app.config.get('OPCUA_CERT_FILE')
        self.private_key_file = app.config.get('OPCUA_PRIVATE_KEY_FILE')
        self.trust_cert_file = app.config.get('OPCUA_TRUST_CERT_FILE')
        
        # Initialize client
        try:
            self.client = Client(self.server_url)
            
            # Configure authentication
            if self.username:
                self.client.set_user(self.username)
            if self.password:
                self.client.set_password(self.password)
                
            # Warn about insecure configurations in production and enforce strict policies
            try:
                is_prod = is_production_environment(app)
            except ValueError as e:
                # Environment detection failed - this indicates a dangerous configuration
                logger.error(f"Environment detection failed: {e}", exc_info=True)
                raise ValueError(f"OPC UA service cannot initialize due to environment configuration error: {e}") from e
            if is_prod:
                if not self.username or not self.password:
                    logger.error("OPC UA authentication not configured - this is not allowed in production")
                    raise ValueError("OPC UA authentication must be configured in production environment")
                
                if self.security_policy == 'None' or self.security_mode == 'None':
                    logger.error("OPC UA security policy/mode set to None - this is not allowed in production")
                    raise ValueError("OPC UA security must be configured in production environment")
            
            # Configure security policy and certificates if provided
            if self.security_policy != 'None' and self.security_mode != 'None':
                try:
                    # Validate security policy first (fails immediately for invalid policies)
                    self._validate_security_policy(self.security_policy, require_strong=is_prod)
                    
                    # Set security policy with proper certificate validation
                    try:
                        # For OPC UA library, we need to use separate method calls instead of security string
                        # when we have separate policy and mode values
                        
                        # If certificates are provided, construct proper security string format:
                        # Policy,Mode,certificate,private_key[,server_private_key]
                        if self.cert_file and self.private_key_file:
                            security_string = f"{self.security_policy},{self.security_mode},{self.cert_file},{self.private_key_file}"
                            if not security_string or security_string.count(',') < 3:
                                raise ValueError(f"Invalid security string format: '{security_string}'. Expected format: 'Policy,Mode,cert,key'")
                            
                            # Use the complete security string with certificates
                            self.client.set_security_string(security_string)
                        else:
                            # Without client certificates, most OPC UA security policies cannot be used
                            # However, some servers may support anonymous authentication with certain policies
                            # or username/password authentication without client certificates
                            
                            # Check if this is a policy that can work without client certificates
                            policies_that_may_work_without_certs = ['None']  # Only None is guaranteed to work
                            
                            if self.security_policy in policies_that_may_work_without_certs:
                                # For 'None' policy, we don't need to set security at all
                                logger.info(f"Using OPC UA security policy '{self.security_policy}' without client certificates")
                            else:
                                # For other policies, warn and attempt graceful fallback
                                logger.warning(f"OPC UA security policy '{self.security_policy}' typically requires client certificates")
                                
                                if is_prod:
                                    # In production, require certificates for non-None policies
                                    raise ValueError(f"OPC UA security policy '{self.security_policy}' requires client certificates in production. "
                                                   f"Please configure OPCUA_CERT_FILE and OPCUA_PRIVATE_KEY_FILE.")
                                else:
                                    # In development, allow fallback to None security if the specific policy fails
                                    logger.warning(f"Development environment: falling back to no security due to missing client certificates")
                                    self.security_policy = 'None'
                                    self.security_mode = 'None'
                        
                        # Trust certificate loading (separate from client certificates)
                        self._load_trust_certificate(is_prod)
                            
                        # Single clear security status message per environment
                        cert_info = ""
                        if self.cert_file and self.private_key_file:
                            # Sanitize certificate paths in log messages for security
                            sanitized_cert_path = "***" if is_prod else self.cert_file
                            cert_info = f" (client cert: {sanitized_cert_path})"
                        trust_info = ""
                        if self.trust_cert_file:
                            # Sanitize certificate paths in log messages for security
                            sanitized_trust_path = "***" if is_prod else self.trust_cert_file
                            trust_info = f" (trusted server cert: {sanitized_trust_path})"
                            
                        if is_prod:
                            logger.info(f"OPC UA security enabled for production: {self.security_policy}, {self.security_mode}{cert_info}{trust_info}")
                        else:
                            logger.info(f"OPC UA security configured for development: {self.security_policy}, {self.security_mode}{cert_info}{trust_info}")
                        
                    except Exception as cert_error:
                        # Handle certificate-specific errors separately from general security errors
                        logger.error(f"Failed to load OPC UA certificates: {cert_error}")
                        raise cert_error
                        
                except Exception as security_error:
                    logger.error(f"Failed to configure OPC UA security: {security_error}")
                    # Always fail fast for security configuration errors (not just production)
                    raise security_error
                    
            elif is_prod:
                logger.error("OPC UA security policy and mode set to None - this is not allowed in production")
                raise ValueError("OPC UA security must be configured in production environment")
            else:
                # Even in development with no security, we can still validate trust certificates if provided
                if self.trust_cert_file:
                    self._load_trust_certificate(is_prod)
                logger.info("OPC UA security disabled for development environment")
            
            logger.info(f"OPC UA client initialized for server: {self.server_url}")
        except Exception as e:
            logger.error(f"Failed to initialize OPC UA client: {e}", exc_info=True)
            raise
    
    def connect(self) -> bool:
        """Connect to OPC UA server.
        
        Returns:
            True if connection successful
            
        Raises:
            ConnectionError: When connection fails
        """
        if not opcua_available or not self.client:
            error_msg = "OPC UA client not available"
            logger.error(error_msg)
            raise ConnectionError(error_msg)
        
        try:
            logger.info(f"Connecting to OPC UA server: {self.server_url}")
            self.client.connect()
            self.connected = True
            logger.info("Connected to OPC UA server successfully")
            return True
        except Exception as e:
            self.connected = False
            error_msg = f"Failed to connect to OPC UA server: {e}"
            logger.error(error_msg)
            raise ConnectionError(error_msg) from e
    
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
        """Read node data and process it through the centralized data storage system.
        
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
        
        # Prepare data for centralized storage
        processed_data = {
            'unit_id': mapping['unit_id'],
            'sensor_type': mapping['sensor_type'],
            'value': value_data['value'],
            'quality': value_data['quality'],
            'timestamp': value_data['timestamp']
        }
        
        # Store using the dedicated data storage service with app context
        if not self._data_storage_service:
            logger.error("Data storage service not available - check service initialization. Dependency injection required.")
            return False
        
        try:
            with self._app.app_context():
                success = self._data_storage_service.store_sensor_data(processed_data)
                
                if success:
                    # Also trigger real-time processing
                    try:
                        from app.services.realtime_processor import realtime_processor
                        realtime_processor.process_sensor_data(
                            processed_data['unit_id'],
                            processed_data['sensor_type'],
                            processed_data
                        )
                    except ImportError:
                        logger.warning("Real-time processor not available")
                
                    logger.debug(f"Successfully processed and stored OPC UA data: {processed_data['unit_id']}/{processed_data['sensor_type']}")
                else:
                    logger.error(f"Failed to store OPC UA data: {processed_data['unit_id']}/{processed_data['sensor_type']}")
                    
                return success
            
        except Exception as e:
            logger.error(f"Failed to process OPC UA data: {e}", exc_info=True)
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