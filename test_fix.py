import os
import sys
sys.path.insert(0, 'backend')

# Set required env vars for ProductionConfig
os.environ['SECRET_KEY'] = 'test'
os.environ['JWT_SECRET_KEY'] = 'test'
os.environ['DATABASE_URL'] = 'test'
os.environ['MQTT_CA_CERTS'] = 'test'
os.environ['MQTT_CERT_FILE'] = 'test'
os.environ['MQTT_KEY_FILE'] = 'test'
os.environ['OPCUA_CERT_FILE'] = 'test'
os.environ['OPCUA_PRIVATE_KEY_FILE'] = 'test'
os.environ['OPCUA_TRUST_CERT_FILE'] = 'test'

from config import ProductionConfig

# Test with no CORS environment variables set
try:
    config = ProductionConfig()
    print("✓ SUCCESS: ProductionConfig instantiated without errors")
    print("  CORS_ORIGINS:", config.CORS_ORIGINS)
    print("  WEBSOCKET_CORS_ORIGINS:", config.WEBSOCKET_CORS_ORIGINS)
except Exception as e:
    print("✗ FAILED:", str(e))
    sys.exit(1)
