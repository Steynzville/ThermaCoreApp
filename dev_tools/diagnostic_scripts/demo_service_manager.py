#!/usr/bin/env python
"""
Demo script showing the Service Management Framework in action.

This script demonstrates:
1. How services are classified as REQUIRED vs OPTIONAL
2. How optional services fail gracefully
3. How service status can be monitored
4. How the framework prevents production crashes
"""

import os
import sys
from unittest.mock import Mock

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils.service_manager import ServiceManager, ServiceType


def print_header(text):
    """Print a formatted header."""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80 + "\n")


def demo_service_classification():
    """Demo 1: Service Classification"""
    print_header("DEMO 1: Service Classification")

    manager = ServiceManager()

    # Register different types of services
    manager.register_service("database", ServiceType.REQUIRED, enabled=True)
    manager.register_service("mqtt", ServiceType.REQUIRED, enabled=True)
    manager.register_service("opcua", ServiceType.OPTIONAL, enabled=True)
    manager.register_service("modbus", ServiceType.OPTIONAL, enabled=False)

    print("Registered Services:")
    print("-" * 80)
    for name, status in manager.get_all_services_status().items():
        print(
            f"  • {name:15} - Type: {status['type']:8} | Enabled: {status['enabled']} | Status: {status['status']}"
        )

    print("\nService Classification:")
    print("-" * 80)
    print("  REQUIRED services: Must be available or app won't start (in production)")
    print("  OPTIONAL services: Can fail gracefully without crashing the app")


def demo_graceful_degradation():
    """Demo 2: Graceful Degradation for Optional Services"""
    print_header("DEMO 2: Graceful Degradation")

    manager = ServiceManager()
    manager.register_service("opcua", ServiceType.OPTIONAL, enabled=True)
    manager.register_service("mqtt", ServiceType.REQUIRED, enabled=True)

    # Simulate OPC-UA failure
    print("Simulating OPC-UA connection failure...")
    manager.set_service_error("opcua", Exception("Certificate validation failed"))

    # Simulate MQTT success
    print("Simulating MQTT successful initialization...")
    manager.set_service_instance("mqtt", Mock())

    # Check overall health
    health = manager.get_overall_health()
    print(f"\n✓ Overall Health: {health.upper()}")
    print("\nService Status:")
    print("-" * 80)

    for name, status in manager.get_all_services_status().items():
        symbol = "✓" if status["status"] == "healthy" else "✗"
        print(
            f"  {symbol} {name:10} - {status['status']:15} | Available: {status['available']}"
        )
        if status["error"]:
            print(f"     └─ Error: {status['error']}")

    print("\nResult:")
    print("-" * 80)
    print("  ✓ Application continues running despite OPC-UA failure")
    print("  ✓ MQTT continues to collect data")
    print("  ✓ System marked as 'degraded' but operational")


def demo_production_safety():
    """Demo 3: Production Safety with Required Services"""
    print_header("DEMO 3: Production Safety")

    manager = ServiceManager()
    manager.register_service("critical_service", ServiceType.REQUIRED, enabled=True)

    print("Scenario 1: Required service fails in production")
    print("-" * 80)

    should_raise = manager.should_raise_error("critical_service", is_production=True)
    print(f"  Should app crash? {should_raise}")
    print("  → YES - This prevents silent failures of critical services\n")

    print("Scenario 2: Optional service fails in production")
    print("-" * 80)
    manager.register_service("optional_service", ServiceType.OPTIONAL, enabled=True)
    should_raise = manager.should_raise_error("optional_service", is_production=True)
    print(f"  Should app crash? {should_raise}")
    print("  → NO - Application continues with degraded functionality\n")


def demo_health_monitoring():
    """Demo 4: Health Monitoring"""
    print_header("DEMO 4: Health Monitoring")

    manager = ServiceManager()

    # Setup various service states
    manager.register_service("db", ServiceType.REQUIRED, enabled=True)
    manager.register_service("auth", ServiceType.REQUIRED, enabled=True)
    manager.register_service("mqtt", ServiceType.REQUIRED, enabled=True)
    manager.register_service("opcua", ServiceType.OPTIONAL, enabled=True)
    manager.register_service("modbus", ServiceType.OPTIONAL, enabled=True)

    # Set various states
    manager.set_service_instance("db", Mock())
    manager.set_service_instance("auth", Mock())
    manager.set_service_instance("mqtt", Mock())
    manager.set_service_error("opcua", Exception("Connection timeout"))
    manager.set_service_error("modbus", Exception("Device not found"))

    print("Health Status Dashboard:")
    print("-" * 80)

    overall = manager.get_overall_health()
    health_emoji = {"healthy": "🟢", "degraded": "🟡", "critical": "🔴"}

    print(f"\n{health_emoji.get(overall, '⚪')} Overall Health: {overall.upper()}\n")

    # Group by type
    required = []
    optional = []

    for name, status in manager.get_all_services_status().items():
        if status["type"] == "required":
            required.append((name, status))
        else:
            optional.append((name, status))

    print("Required Services:")
    for name, status in required:
        symbol = "✓" if status["status"] == "healthy" else "✗"
        print(f"  {symbol} {name:15} - {status['status']}")

    print("\nOptional Services:")
    for name, status in optional:
        symbol = "✓" if status["status"] == "healthy" else "✗"
        print(f"  {symbol} {name:15} - {status['status']}")
        if status["error"]:
            print(f"     └─ {status['error']}")

    print("\n" + "-" * 80)
    print("✓ All required services operational")
    print("⚠ Some optional services degraded")
    print("→ System operational but with reduced capabilities")


def demo_configuration():
    """Demo 5: Configuration-Driven Setup"""
    print_header("DEMO 5: Configuration-Driven Setup")

    print("Environment Variables Control Service Behavior:\n")

    configs = [
        (
            "Development",
            {
                "SERVICE_OPCUA_ENABLED": "true",
                "SERVICE_OPCUA_REQUIRED": "true",
                "SERVICE_MQTT_ENABLED": "true",
                "SERVICE_MQTT_REQUIRED": "true",
            },
        ),
        (
            "Production",
            {
                "SERVICE_OPCUA_ENABLED": "true",
                "SERVICE_OPCUA_REQUIRED": "false",  # Optional in production!
                "SERVICE_MQTT_ENABLED": "true",
                "SERVICE_MQTT_REQUIRED": "true",
            },
        ),
        (
            "Minimal Deployment",
            {
                "SERVICE_OPCUA_ENABLED": "false",  # Disabled
                "SERVICE_OPCUA_REQUIRED": "false",
                "SERVICE_MQTT_ENABLED": "true",
                "SERVICE_MQTT_REQUIRED": "true",
            },
        ),
    ]

    for env_name, config in configs:
        print(f"{env_name} Configuration:")
        print("-" * 40)
        for key, value in config.items():
            service = (
                key.replace("SERVICE_", "")
                .replace("_ENABLED", "")
                .replace("_REQUIRED", "")
            )
            if "_ENABLED" in key:
                print(f"  {service:10} Enabled:  {value}")
            elif "_REQUIRED" in key:
                print(f"  {service:10} Required: {value}")
        print()


def main():
    """Run all demos."""
    print("\n" + "╔" + "=" * 78 + "╗")
    print("║" + " " * 20 + "SERVICE MANAGEMENT FRAMEWORK DEMO" + " " * 25 + "║")
    print("╚" + "=" * 78 + "╝")

    demo_service_classification()
    demo_graceful_degradation()
    demo_production_safety()
    demo_health_monitoring()
    demo_configuration()

    print_header("KEY BENEFITS")
    print("""
  ✅ NO MORE CRASHES from optional services like OPC-UA
  ✅ CLEAR VISIBILITY into service health via API endpoints
  ✅ GRACEFUL DEGRADATION when external services fail
  ✅ CONFIGURATION-DRIVEN service management
  ✅ PRODUCTION-SAFE defaults (OPC-UA optional, MQTT required)
  ✅ BACKWARDS COMPATIBLE with existing code
  ✅ EASY DEBUGGING with comprehensive status reporting
    """)

    print("\nAPI Endpoints:")
    print("-" * 80)
    print("  GET /health                      - Overall application health")
    print("  GET /api/v1/services/status      - Detailed service status")
    print()


if __name__ == "__main__":
    main()
