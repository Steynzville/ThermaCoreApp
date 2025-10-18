# Protocol Implementation Standards

> **Last Reviewed**: October 2024  
> **Status**: Current and Accurate

The ThermaCoreApp integrates with various industrial communication protocols to acquire data from and send commands to SCADA (Supervisory Control and Data Acquisition) units. This document outlines the standards and best practices for implementing and extending protocol support within the application.

## 1. Supported Protocols

The ThermaCoreApp backend currently supports or is designed to integrate with the following protocols:

*   **MQTT (Message Queuing Telemetry Transport)**: For real-time, lightweight messaging, primarily used for data ingestion from devices.
*   **OPC UA (Open Platform Communications Unified Architecture)**: A robust, secure, and platform-independent standard for industrial communication.
*   **Modbus**: A widely used serial communication protocol for connecting industrial electronic devices.
*   **DNP3 (Distributed Network Protocol 3)**: A set of communications protocols used between components in process automation systems.

## 2. General Implementation Principles

*   **Modularity**: Each protocol implementation should be encapsulated within its own service or module (`app/services/`, `app/protocols/`).
*   **Abstraction**: Use a common interface or base class (`app/protocols/base.py`) for different protocol implementations to ensure consistency and ease of integration.
*   **Configuration-Driven**: Protocol parameters (e.g., host, port, credentials, security settings) must be configurable via environment variables, managed through `config.py`.
*   **Security**: Prioritize secure communication. Implement authentication, authorization, and encryption (e.g., TLS for MQTT, specific security policies for OPC UA) where supported by the protocol.
*   **Error Handling and Resilience**: Implement robust error handling, retry mechanisms, and connection management to ensure continuous operation despite network or device issues.
*   **Logging**: Comprehensive logging should be in place for connection status, data exchange, and error events to aid in debugging and operational monitoring.
*   **Performance**: Optimize protocol interactions for efficiency, especially for high-frequency data acquisition.

## 3. MQTT Implementation Standards

### 3.1. Configuration

MQTT configuration is managed in `backend/config.py` and environment variables:

*   `MQTT_BROKER_HOST`, `MQTT_BROKER_PORT`
*   `MQTT_USERNAME`, `MQTT_PASSWORD`
*   `MQTT_USE_TLS`, `MQTT_CA_CERTS`, `MQTT_CERT_FILE`, `MQTT_KEY_FILE` (for secure connections)
*   `MQTT_SCADA_TOPICS`: A list of topics the application subscribes to (e.g., `scada/+/temperature`).

### 3.2. Service (`app/services/mqtt_service.py`)

*   Handles connection to the MQTT broker.
*   Manages subscriptions to relevant SCADA topics.
*   Processes incoming messages, validates data, and dispatches to appropriate handlers (e.g., `realtime_processor`).
*   Implements quality of service (QoS) levels as appropriate.

### 3.3. Data Format

*   MQTT messages should ideally use a standardized data format (e.g., JSON) for payload to ensure interoperability.
*   Payloads should include `unit_id`, `sensor_type`, `value`, and `timestamp`.

## 4. OPC UA Implementation Standards

### 4.1. Configuration

OPC UA configuration is managed in `backend/config.py` and environment variables:

*   `OPCUA_SERVER_URL`
*   `OPCUA_USERNAME`, `OPCUA_PASSWORD`
*   `OPCUA_SECURITY_POLICY`, `OPCUA_SECURITY_MODE` (e.g., `Basic256Sha256`, `SignAndEncrypt`)
*   `OPCUA_CERT_FILE`, `OPCUA_PRIVATE_KEY_FILE`, `OPCUA_TRUST_CERT_FILE` (for secure connections)

### 4.2. Service (`app/services/opcua_service.py`)

*   Manages connection to OPC UA servers.
*   Provides methods for browsing address space, reading/writing node values, and subscribing to data changes.
*   Ensures secure connection establishment based on configured security policies and modes.

## 5. Modbus and DNP3 Implementation Standards

### 5.1. Services (`app/services/modbus_service.py`, `app/services/dnp3_service.py`)

*   These services should encapsulate the logic for communicating with Modbus and DNP3 devices, respectively.
*   They should provide methods for reading and writing registers/points, handling different data types, and managing connection states.
*   Given the nature of these protocols, special attention should be paid to error handling, timeouts, and data integrity.

### 5.2. Protocol Simulation (`app/protocols/protocol_simulator.py`)

*   A `ProtocolGatewaySimulator` is available for development and testing purposes to simulate device behavior and data streams without requiring physical hardware.
*   This simulator should adhere to the same data formats and communication patterns as real devices to facilitate accurate testing.

## 6. Extending Protocol Support

To add support for a new industrial protocol:

1.  **Create a new service**: Develop a new Python module in `app/services/` (e.g., `app/services/new_protocol_service.py`) to encapsulate the protocol-specific logic.
2.  **Define configuration**: Add relevant configuration parameters to `config.py` and ensure they can be set via environment variables.
3.  **Integrate into `app/__init__.py`**: Initialize the new service in the `create_app` function, ensuring proper error handling during initialization.
4.  **Create API endpoints**: If necessary, add new routes in `app/routes/` to expose functionality related to the new protocol to the frontend.
5.  **Update models**: If the new protocol introduces new data types or entities, update `app/models/__init__.py` accordingly.
6.  **Implement testing**: Write unit and integration tests for the new service and any related API endpoints.
