# WebSockets & Real-Time SCADA

> **Last Updated**: October 2024  
> **Status**: Production-Ready

Guide to real-time data communication, WebSocket integration, and SCADA operations in ThermaCoreApp.

## Table of Contents

1. [Overview](#overview)
2. [WebSocket Architecture](#websocket-architecture)
3. [Industrial Protocol Integration](#industrial-protocol-integration)
4. [Real-Time Data Flow](#real-time-data-flow)
5. [Client Implementation](#client-implementation)
6. [SCADA Operations](#scada-operations)
7. [Troubleshooting](#troubleshooting)

---

## Overview

ThermaCoreApp provides real-time monitoring and control of industrial systems through:

- **WebSocket Communication** - Bidirectional real-time data streaming
- **MQTT Integration** - IoT device data ingestion
- **OPC UA Protocol** - Industrial automation standard
- **Modbus Support** - Legacy industrial equipment
- **DNP3 Protocol** - Power system automation
- **Live Dashboards** - Real-time visualization

### Architecture

```
Industrial Devices          Backend Services          Frontend Clients
─────────────────          ─────────────────          ────────────────

┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│ MQTT Sensors │──MQTT────→│ MQTT Service │           │   Browser    │
└──────────────┘           └──────┬───────┘           │  Dashboard   │
                                   │                   └──────▲───────┘
┌──────────────┐           ┌──────▼───────┐                   │
│ OPC UA       │──OPC UA──→│ OPC UA Svc   │                   │
│ Devices      │           └──────┬───────┘           WebSocket
└──────────────┘                   │                           │
                           ┌───────▼────────┐                  │
┌──────────────┐           │  Data Storage  │                  │
│ Modbus RTU   │──Modbus──→│   & Processing │                  │
└──────────────┘           └───────┬────────┘                  │
                                   │                           │
┌──────────────┐           ┌───────▼────────┐                  │
│ DNP3         │──DNP3────→│   WebSocket    │──────────────────┘
│ Equipment    │           │    Service     │
└──────────────┘           └────────────────┘
```

---

## WebSocket Architecture

### Connection Lifecycle

```
Client                          Server
──────                          ──────

1. Connect
   io.connect(WS_URL) ────────→ Accept connection
                     ←────────── Connection established
                                 Assign socket ID

2. Authenticate
   emit('auth', {token}) ──────→ Verify JWT token
                         ←──────  emit('authenticated')

3. Join Rooms
   emit('join_room', 'unit_1')─→ Add to room 'unit_1'
                              ←── emit('joined', 'unit_1')

4. Receive Updates
                         ←──────  emit('sensor_reading', data)
                         ←──────  emit('unit_status', data)
                         ←──────  emit('alert', data)

5. Send Commands
   emit('control', cmd) ────────→ Validate & execute
                        ←──────── emit('command_ack', result)

6. Disconnect
   disconnect() ────────────────→ Remove from rooms
                                  Clean up resources
```

### Event Types

#### Server → Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `connected` | Connection established | `{socket_id, timestamp}` |
| `sensor_reading` | New sensor data | `{unit_id, sensor_type, value, timestamp}` |
| `unit_status` | Unit status change | `{unit_id, status, reason}` |
| `alert` | System alert/alarm | `{severity, message, unit_id}` |
| `anomaly_detected` | Anomaly detection | `{unit_id, sensor, expected, actual}` |

#### Client → Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `auth` | Authentication | `{token}` |
| `join_room` | Join room for updates | `{room_name}` |
| `leave_room` | Leave room | `{room_name}` |
| `control_command` | Send control command | `{unit_id, command, params}` |
| `subscribe_sensor` | Subscribe to sensor | `{sensor_id}` |

---

## Industrial Protocol Integration

### 1. MQTT Integration

**Configuration**:
```python
# Backend configuration
MQTT_BROKER_HOST = "broker.example.com"
MQTT_BROKER_PORT = 8883
MQTT_USE_TLS = True
MQTT_USERNAME = "thermacore"
MQTT_PASSWORD = "secure_password"
```

**Topic Structure**:
```
scada/{unit_id}/{sensor_type}
```

**Examples**:
- `scada/unit_001/temperature`
- `scada/unit_001/pressure`
- `scada/unit_001/flow_rate`

**Message Format** (JSON):
```json
{
  "value": 65.5,
  "unit": "°C",
  "timestamp": "2024-10-23T10:45:30Z",
  "quality": "good"
}
```

**Python Implementation**:
```python
from app.services.mqtt_service import MQTTService

mqtt = MQTTService()

@mqtt.on_message('scada/+/temperature')
def handle_temperature(client, userdata, msg):
    topic_parts = msg.topic.split('/')
    unit_id = topic_parts[1]
    data = json.loads(msg.payload)
    
    # Store in database
    store_sensor_reading(
        unit_id=unit_id,
        sensor_type='temperature',
        value=data['value'],
        timestamp=data['timestamp']
    )
    
    # Broadcast via WebSocket
    socketio.emit(f'unit_{unit_id}_update', {
        'type': 'temperature',
        'value': data['value'],
        'timestamp': data['timestamp']
    }, room=f'unit_{unit_id}')
```

### 2. OPC UA Integration

**Configuration**:
```python
OPCUA_SERVER_URL = "opc.tcp://192.168.1.50:4840"
OPCUA_SECURITY_POLICY = "Basic256Sha256"
OPCUA_CERTIFICATE_PATH = "/path/to/cert.pem"
OPCUA_PRIVATE_KEY_PATH = "/path/to/key.pem"
```

**Usage**:
```python
from app.services.opcua_service import OPCUAService

opcua = OPCUAService()

# Read value
value = opcua.read_node("ns=2;i=1001")

# Write value
opcua.write_node("ns=2;i=1002", 75.0)

# Subscribe to changes
opcua.subscribe_node("ns=2;i=1001", callback=on_value_change)
```

### 3. Modbus Integration

**Configuration**:
```python
MODBUS_HOST = "192.168.1.100"
MODBUS_PORT = 502
MODBUS_UNIT_ID = 1
```

**Usage**:
```python
from app.services.modbus_service import ModbusService

modbus = ModbusService()

# Read holding registers
registers = modbus.read_holding_registers(
    address=0,
    count=10,
    unit=1
)

# Write register
modbus.write_register(
    address=0,
    value=100,
    unit=1
)
```

### 4. DNP3 Integration

**Configuration**:
```python
DNP3_MASTER_ADDRESS = "192.168.1.200"
DNP3_MASTER_PORT = 20000
DNP3_OUTSTATION_ADDRESS = 10
```

**Usage**:
```python
from app.services.dnp3_service import DNP3Service

dnp3 = DNP3Service()

# Read analog input
value = dnp3.read_analog_input(index=0)

# Control relay
dnp3.control_relay_output(index=0, state=True)
```

---

## Real-Time Data Flow

### Data Pipeline

```
1. Data Acquisition
   ┌────────────────────────────────┐
   │ Industrial Device              │
   │ - Sensor reads: 65.5°C         │
   │ - Publishes to MQTT            │
   └────────┬───────────────────────┘
            │
            ▼
2. MQTT Broker
   ┌────────────────────────────────┐
   │ Topic: scada/unit_001/temp     │
   │ Payload: {"value": 65.5, ...}  │
   └────────┬───────────────────────┘
            │
            ▼
3. Backend Service
   ┌────────────────────────────────┐
   │ MQTT Subscriber                │
   │ - Receives message             │
   │ - Validates data               │
   │ - Stores in PostgreSQL         │
   │ - Checks anomaly rules         │
   └────────┬───────────────────────┘
            │
            ▼
4. WebSocket Broadcast
   ┌────────────────────────────────┐
   │ WebSocket Service              │
   │ - Emits to room 'unit_001'     │
   │ - All subscribed clients       │
   │   receive update               │
   └────────┬───────────────────────┘
            │
            ▼
5. Frontend Update
   ┌────────────────────────────────┐
   │ React Component                │
   │ - Receives WebSocket event     │
   │ - Updates state                │
   │ - Re-renders chart/gauge       │
   └────────────────────────────────┘
```

---

## Client Implementation

### React WebSocket Hook

```javascript
// hooks/useWebSocket.js
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useWebSocket(url, auth = true) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Create socket connection
    const newSocket = io(url, {
      auth: auth ? {
        token: sessionStorage.getItem('access_token')
      } : undefined
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [url, auth]);

  return { socket, connected };
}
```

### Subscribe to Unit Updates

```javascript
// components/UnitMonitor.jsx
import { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

function UnitMonitor({ unitId }) {
  const { socket, connected } = useWebSocket(WS_URL);
  const [temperature, setTemperature] = useState(null);
  const [pressure, setPressure] = useState(null);

  useEffect(() => {
    if (!socket || !connected) return;

    // Join unit room
    socket.emit('join_room', `unit_${unitId}`);

    // Subscribe to sensor readings
    socket.on('sensor_reading', (data) => {
      if (data.sensor_type === 'temperature') {
        setTemperature(data.value);
      } else if (data.sensor_type === 'pressure') {
        setPressure(data.value);
      }
    });

    // Subscribe to alerts
    socket.on('alert', (data) => {
      if (data.unit_id === unitId) {
        showNotification(data.message, data.severity);
      }
    });

    // Cleanup
    return () => {
      socket.emit('leave_room', `unit_${unitId}`);
      socket.off('sensor_reading');
      socket.off('alert');
    };
  }, [socket, connected, unitId]);

  return (
    <div>
      <h2>Unit {unitId} Monitor</h2>
      <div>Temperature: {temperature}°C</div>
      <div>Pressure: {pressure} bar</div>
      <div>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
    </div>
  );
}
```

### Send Control Commands

```javascript
function UnitControl({ unitId }) {
  const { socket } = useWebSocket(WS_URL);

  const setSetpoint = async (type, value) => {
    if (!socket) return;

    socket.emit('control_command', {
      unit_id: unitId,
      command: 'set_setpoint',
      parameters: {
        setpoint_type: type,
        value: value
      }
    });

    // Listen for acknowledgment
    socket.once('command_ack', (response) => {
      if (response.success) {
        console.log('Command executed successfully');
      } else {
        console.error('Command failed:', response.error);
      }
    });
  };

  return (
    <div>
      <button onClick={() => setSetpoint('temperature', 70)}>
        Set Temperature to 70°C
      </button>
    </div>
  );
}
```

---

## SCADA Operations

### Dashboard Real-Time Updates

```javascript
// components/ScadaDashboard.jsx
function ScadaDashboard() {
  const { socket, connected } = useWebSocket(WS_URL);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    if (!socket || !connected) return;

    // Subscribe to all units
    socket.emit('join_room', 'dashboard');

    // Receive unit status updates
    socket.on('unit_status', (data) => {
      setUnits(prevUnits => 
        prevUnits.map(unit => 
          unit.id === data.unit_id 
            ? { ...unit, status: data.status }
            : unit
        )
      );
    });

    // Receive sensor updates
    socket.on('sensor_reading', (data) => {
      // Update corresponding unit's sensor values
      setUnits(prevUnits =>
        prevUnits.map(unit =>
          unit.id === data.unit_id
            ? {
                ...unit,
                sensors: {
                  ...unit.sensors,
                  [data.sensor_type]: data.value
                }
              }
            : unit
        )
      );
    });

    return () => {
      socket.off('unit_status');
      socket.off('sensor_reading');
    };
  }, [socket, connected]);

  return (
    <div className="scada-dashboard">
      <h1>SCADA Dashboard</h1>
      <div className="connection-status">
        {connected ? '🟢 Live' : '🔴 Offline'}
      </div>
      <div className="units-grid">
        {units.map(unit => (
          <UnitCard key={unit.id} unit={unit} />
        ))}
      </div>
    </div>
  );
}
```

### Alarm Management

```javascript
function AlarmMonitor() {
  const { socket } = useWebSocket(WS_URL);
  const [alarms, setAlarms] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('alert', (alarm) => {
      setAlarms(prev => [alarm, ...prev]);
      
      // Play sound for critical alarms
      if (alarm.severity === 'critical') {
        playAlarmSound();
      }
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('SCADA Alert', {
          body: alarm.message,
          icon: '/alarm-icon.png'
        });
      }
    });

    return () => socket.off('alert');
  }, [socket]);

  const acknowledgeAlarm = (alarmId) => {
    socket.emit('acknowledge_alarm', { alarm_id: alarmId });
    setAlarms(prev => prev.filter(a => a.id !== alarmId));
  };

  return (
    <div className="alarm-monitor">
      <h2>Active Alarms ({alarms.length})</h2>
      {alarms.map(alarm => (
        <div key={alarm.id} className={`alarm severity-${alarm.severity}`}>
          <span>{alarm.message}</span>
          <button onClick={() => acknowledgeAlarm(alarm.id)}>
            Acknowledge
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## Troubleshooting

### Connection Issues

**Problem**: WebSocket fails to connect

**Solutions**:
```javascript
// Check WebSocket URL uses correct protocol
// Development: ws://localhost:5000
// Production: wss://api.yourdomain.com

// Enable debug logging
const socket = io(WS_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
});
```

### Authentication Errors

**Problem**: "Authentication failed" on WebSocket

**Solution**:
```javascript
// Ensure token is valid and not expired
const token = sessionStorage.getItem('access_token');

const socket = io(WS_URL, {
  auth: { token }
});

// Handle authentication errors
socket.on('error', (error) => {
  if (error.type === 'authentication') {
    // Refresh token and reconnect
    refreshToken().then(newToken => {
      socket.auth.token = newToken;
      socket.connect();
    });
  }
});
```

### Missing Updates

**Problem**: Not receiving real-time updates

**Checklist**:
```javascript
// 1. Verify connection
console.log('Connected:', socket.connected);

// 2. Check room membership
socket.emit('join_room', 'unit_1');

// 3. Verify event listeners
socket.on('sensor_reading', (data) => {
  console.log('Received:', data);
});

// 4. Check backend logs for MQTT issues
// Backend: tail -f logs/mqtt_service.log
```

---

**Related Documentation:**
- [Architecture](../DEVELOPMENT/ARCHITECTURE.md)
- [API Reference](../DEVELOPMENT/API_REFERENCE.md)
- [Troubleshooting](../OPERATIONS/TROUBLESHOOTING.md)

*Last Updated: October 2024*
