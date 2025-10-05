#!/usr/bin/env python3
"""
Demonstration script showing that ProductionConfig validation 
now occurs in __init__ instead of at import time.

This script demonstrates the key improvement:
- BEFORE: Importing config.py would fail if MQTT/OPC UA env vars weren't set
- AFTER: Importing config.py succeeds; validation only happens when instantiating ProductionConfig
"""

import os
import sys

# Mock dotenv for this demo
sys.modules['dotenv'] = type(sys)('dotenv')
sys.modules['dotenv'].load_dotenv = lambda: None

# Set minimal required base config env vars
os.environ['SECRET_KEY'] = 'demo-secret'
os.environ['DATABASE_URL'] = 'sqlite:///demo.db'
os.environ['JWT_SECRET_KEY'] = 'demo-jwt-secret'

print("=" * 70)
print("ProductionConfig Validation Refactoring Demonstration")
print("=" * 70)

print("\n1. BEFORE: Import would fail without production env vars")
print("-" * 70)
print("   If we tried to import config.py without MQTT/OPC UA env vars,")
print("   we would get a ValueError at import time.")
print("   This made testing and development difficult.")

print("\n2. AFTER: Import succeeds, validation deferred to instantiation")
print("-" * 70)

# Clear production-specific env vars to simulate non-production environment
for key in ['MQTT_CA_CERTS', 'MQTT_CERT_FILE', 'MQTT_KEY_FILE', 
            'OPCUA_CERT_FILE', 'OPCUA_PRIVATE_KEY_FILE', 'OPCUA_TRUST_CERT_FILE']:
    os.environ.pop(key, None)

print("   Importing config module without production env vars...")
from config import ProductionConfig, DevelopmentConfig, TestingConfig
print("   ✓ SUCCESS! Import works even without production certificates")

print("\n3. Validation still enforced when ProductionConfig is instantiated")
print("-" * 70)

print("\n   a) Attempting to instantiate without MQTT certs...")
try:
    prod_config = ProductionConfig()
    print("      ✗ FAILED: Should have raised ValueError")
except ValueError as e:
    print(f"      ✓ SUCCESS: Raised ValueError as expected")
    print(f"         Message: {str(e)[:60]}...")

print("\n   b) Setting MQTT certs but not OPC UA certs...")
os.environ['MQTT_CA_CERTS'] = '/demo/ca'
os.environ['MQTT_CERT_FILE'] = '/demo/cert'
os.environ['MQTT_KEY_FILE'] = '/demo/key'

try:
    prod_config = ProductionConfig()
    print("      ✗ FAILED: Should have raised ValueError")
except ValueError as e:
    print(f"      ✓ SUCCESS: Raised ValueError as expected")
    print(f"         Message: {str(e)[:60]}...")

print("\n   c) Setting all required certificates...")
os.environ['OPCUA_CERT_FILE'] = '/demo/opcua/cert'
os.environ['OPCUA_PRIVATE_KEY_FILE'] = '/demo/opcua/key'
os.environ['OPCUA_TRUST_CERT_FILE'] = '/demo/opcua/trust'

try:
    prod_config = ProductionConfig()
    print("      ✓ SUCCESS: ProductionConfig instantiated with all certs")
    print(f"         - MQTT_USE_TLS: {prod_config.MQTT_USE_TLS}")
    print(f"         - OPCUA_SECURITY_POLICY: {prod_config.OPCUA_SECURITY_POLICY}")
    print(f"         - OPCUA_SECURITY_MODE: {prod_config.OPCUA_SECURITY_MODE}")
except Exception as e:
    print(f"      ✗ FAILED: {e}")

print("\n4. Other config classes work as before")
print("-" * 70)
print("   DevelopmentConfig and TestingConfig are unchanged and work normally")
print(f"   - DevelopmentConfig.DEBUG: {DevelopmentConfig.DEBUG}")
print(f"   - TestingConfig.TESTING: {TestingConfig.TESTING}")

print("\n" + "=" * 70)
print("Summary")
print("=" * 70)
print("✓ ProductionConfig can be imported without production env vars")
print("✓ Validation still occurs when ProductionConfig is instantiated")
print("✓ Clear error messages when required env vars are missing")
print("✓ No impact on DevelopmentConfig or TestingConfig")
print("✓ Enables easier testing and development workflows")
print("=" * 70)
