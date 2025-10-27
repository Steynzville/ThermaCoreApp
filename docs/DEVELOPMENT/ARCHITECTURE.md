# ThermaCoreApp Architecture

> **Last Updated**: October 2024  
> **Status**: Current and Verified  
> **Database**: Migrated to Neon PostgreSQL (Sydney region)

ThermaCoreApp is a full-stack industrial SCADA (Supervisory Control and Data Acquisition) application designed for monitoring and managing renewable energy thermal systems. This document provides a comprehensive overview of the system architecture, design patterns, and technical implementation.

**Architecture Diagram**: See [detailed production architecture diagram](../images/architecture-neon.txt) showing the complete infrastructure with Neon database integration.

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Data Flow and Communication](#data-flow-and-communication)
5. [Security Architecture](#security-architecture)
6. [Database Design](#database-design)
7. [Protocol Integration](#protocol-integration)
8. [Scalability and Performance](#scalability-and-performance)

---

## High-Level Architecture

ThermaCoreApp follows a modern client-server architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Layer                              │
│                    (Web Browser Client)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS/WSS
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Frontend Layer                               │
│              React SPA (Vite + TypeScript)                      │
│                    Hosted on Netlify                            │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │  Dashboard   │  │  Analytics   │  │  Admin Panel │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ REST API / WebSockets
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Backend Layer                                │
│                 Flask API (Python 3.9+)                         │
│                    Hosted on Render                             │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │   Routes     │  │   Services   │  │  Middleware  │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
└────────┬───────────────────┬───────────────────┬────────────────┘
         │                   │                   │
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │  MQTT Broker    │  │  Industrial     │
│   (Neon - AU)   │  │  (Real-time)    │  │  Protocols      │
│  Sydney Region  │  │                 │  │  OPC UA/Modbus  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Key Components

- **Frontend**: React SPA providing user interface (Netlify)
- **Backend**: Flask REST API handling business logic (Render)
- **Database**: PostgreSQL on Neon (Sydney region) for persistent storage
- **Message Broker**: MQTT for real-time data ingestion
- **Industrial Protocols**: OPC UA, Modbus, DNP3 integration

---

## Backend Architecture

### Application Structure

```
backend/
├── app/
│   ├── __init__.py          # Application factory
│   ├── config.py            # Configuration management
│   ├── models/              # Database models (SQLAlchemy)
│   │   ├── user.py
│   │   ├── unit.py
│   │   ├── sensor.py
│   │   └── role.py
│   ├── routes/              # API endpoints (Blueprints)
│   │   ├── auth.py          # Authentication
│   │   ├── units.py         # Unit management
│   │   ├── analytics.py     # Analytics
│   │   └── scada.py         # SCADA operations
│   ├── services/            # Business logic
│   │   ├── mqtt_service.py
│   │   ├── opcua_service.py
│   │   ├── websocket_service.py
│   │   ├── anomaly_detection_service.py
│   │   ├── modbus_service.py
│   │   └── dnp3_service.py
│   ├── middleware/          # Cross-cutting concerns
│   │   ├── auth_middleware.py
│   │   ├── rate_limit.py
│   │   ├── audit_log.py
│   │   └── validation.py
│   └── utils/               # Helper functions
├── migrations/              # Database migrations
├── tests/                   # Test suite
└── run.py                   # Application entry point
```

### Application Factory Pattern

The Flask application is created using the **Application Factory** pattern (`app/__init__.py`):

```python
def create_app(config_name='default'):
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app)
    socketio.init_app(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(units_bp, url_prefix='/api/v1/units')
    
    # Initialize services
    mqtt_service.init_app(app)
    opcua_service.init_app(app)
    
    return app
```

**Benefits:**
- Multiple configurations (dev, test, prod)
- Easier testing with dependency injection
- Clean separation of initialization logic

### Configuration Management

Environment-specific settings in `config.py`:

```python
class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')

class DevelopmentConfig(Config):
    DEBUG = True
    # For local development, use local PostgreSQL or Neon
    # Example Neon connection string (replace placeholders):
    # postgres://[user]:[password]@[your-endpoint].ap-southeast-2.aws.neon.tech/[dbname]?sslmode=require
    SQLALCHEMY_DATABASE_URI = 'postgresql://localhost/thermacore_dev'
    
class ProductionConfig(Config):
    DEBUG = False
    # Production uses Neon PostgreSQL (Sydney region)
    # Example Neon connection string (replace placeholders):
    # postgres://[user]:[password]@[your-endpoint].ap-southeast-2.aws.neon.tech/[dbname]?sslmode=require
    # TLS enforcement
    MQTT_TLS_ENABLED = True
    OPCUA_SECURITY_POLICY = 'Basic256Sha256'
```

### RESTful API Design

**Endpoint Structure:**
```
/api/v1/
  ├── /auth              # Authentication endpoints
  │   ├── POST /login
  │   ├── POST /register
  │   └── POST /refresh
  ├── /users             # User management
  ├── /units             # Industrial units
  ├── /sensors           # Sensor management
  ├── /analytics         # Data analytics
  └── /scada             # SCADA operations
```

**Authentication Flow:**
1. User sends credentials to `/auth/login`
2. Backend validates and returns JWT tokens (access + refresh)
3. Client includes JWT in `Authorization: Bearer <token>` header
4. Backend validates JWT and checks permissions
5. Response returned or 401/403 error

### Service Layer

Services encapsulate business logic and external integrations:

**MQTT Service** (`mqtt_service.py`):
```python
class MQTTService:
    def __init__(self):
        self.client = mqtt.Client()
        
    def subscribe_to_sensors(self, unit_id):
        topics = [
            f'scada/{unit_id}/temperature',
            f'scada/{unit_id}/pressure',
            f'scada/{unit_id}/flow_rate'
        ]
        for topic in topics:
            self.client.subscribe(topic)
            
    def on_message(self, client, userdata, msg):
        # Process incoming sensor data
        data = json.loads(msg.payload)
        self.store_sensor_reading(data)
        self.notify_websocket_clients(data)
```

**WebSocket Service** (`websocket_service.py`):
- Real-time data push to connected clients
- Room-based broadcasting for multi-tenancy
- Connection management and heartbeat

---

## Frontend Architecture

### Technology Stack

- **Framework**: React 18+
- **Build Tool**: Vite
- **Language**: TypeScript/JavaScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: React Context API
- **Routing**: React Router v6
- **HTTP Client**: Axios (via `apiFetch` wrapper)

### Component Structure

```
src/
├── components/           # Reusable components
│   ├── ui/              # Base UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   └── Input.jsx
│   ├── dashboard/       # Dashboard-specific
│   ├── forms/           # Form components
│   └── layout/          # Layout components
├── pages/               # Page components (routes)
│   ├── Dashboard.jsx
│   ├── LoginPage.jsx
│   ├── UnitDetails.jsx
│   └── AdminPanel.jsx
├── context/             # Global state
│   ├── AuthContext.jsx
│   ├── ThemeContext.jsx
│   └── UnitContext.jsx
├── services/            # API integration
│   ├── authService.js
│   ├── unitService.js
│   └── analyticsService.js
├── hooks/               # Custom hooks
│   ├── useAuth.js
│   ├── useWebSocket.js
│   └── useRemoteControl.js
└── utils/               # Helper functions
    ├── apiFetch.js
    ├── dateUtils.js
    └── validators.js
```

### State Management Strategy

**Global State (Context API):**

```javascript
// AuthContext - User authentication state
const AuthContext = createContext({
  user: null,
  token: null,
  login: () => {},
  logout: () => {}
});

// ThemeContext - UI theme preferences
// SidebarContext - Sidebar state
// UnitContext - Selected unit data
```

**Local State (useState/useReducer):**
- Component-specific UI state
- Form data
- Temporary selections

### Routing Configuration

```javascript
// src/config/routes.js
const routes = [
  { path: '/', element: <Dashboard />, protected: true },
  { path: '/login', element: <LoginPage />, protected: false },
  { path: '/units/:id', element: <UnitDetails />, protected: true },
  { path: '/admin', element: <AdminPanel />, protected: true, role: 'admin' }
];
```

**Protected Route Implementation:**
```javascript
function ProtectedRoute({ children, role }) {
  const { user, token } = useAuth();
  
  if (!token) return <Navigate to="/login" />;
  if (role && !user.roles.includes(role)) return <Forbidden />;
  
  return children;
}
```

---

## Data Flow and Communication

### REST API Communication

**Request Flow:**
```
Component → Service → API Fetch → Backend → Database
                                         ↓
Component ← Service ← JSON Response ← Backend
```

**Example:**
```javascript
// Frontend service
export const getUnits = async () => {
  const response = await apiFetch('/api/v1/units');
  return response.data;
};

// Component usage
const { data: units, loading } = useQuery('units', getUnits);
```

### WebSocket Communication

**Real-time Data Flow:**
```
Industrial Device → MQTT → Backend Service → WebSocket → Frontend
```

**Frontend WebSocket Hook:**
```javascript
function useWebSocket(topic) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const socket = io(WS_URL);
    socket.on(topic, (message) => setData(message));
    return () => socket.disconnect();
  }, [topic]);
  
  return data;
}
```

### MQTT Data Ingestion

**Backend MQTT Handler:**
```python
@mqtt_service.on_message('scada/+/temperature')
def handle_temperature(client, userdata, msg):
    unit_id = msg.topic.split('/')[1]
    temperature = json.loads(msg.payload)
    
    # Store in database
    sensor_reading = SensorReading(
        unit_id=unit_id,
        sensor_type='temperature',
        value=temperature['value'],
        timestamp=datetime.utcnow()
    )
    db.session.add(sensor_reading)
    db.session.commit()
    
    # Broadcast via WebSocket
    socketio.emit(f'unit_{unit_id}_update', {
        'type': 'temperature',
        'value': temperature['value']
    }, room=f'unit_{unit_id}')
```

---

## Security Architecture

### Authentication & Authorization

**Multi-Layer Security:**

1. **JWT Authentication**
   - Access token (short-lived, 15 min)
   - Refresh token (long-lived, 7 days)
   - Token rotation on refresh

2. **Role-Based Access Control (RBAC)**
   ```python
   class RoleEnum(str, Enum):
       ADMIN = "admin"
       OPERATOR = "operator"
       VIEWER = "viewer"
   
   @jwt_required()
   @permission_required('write_units')
   def update_unit():
       # Only users with 'write_units' permission
   ```

3. **Permission System**
   - Granular permissions per resource
   - Role-permission mapping
   - Dynamic permission checks

### Security Features

- **Password Security**: bcrypt hashing with salt
- **CORS Protection**: Configured allowed origins
- **Rate Limiting**: API endpoint throttling
- **Input Validation**: Marshmallow schemas
- **SQL Injection Prevention**: SQLAlchemy ORM
- **XSS Protection**: Content Security Policy headers
- **Audit Logging**: All authentication events logged

---

## Database Design

### Entity-Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌──────────────┐
│    User     │       │    Role     │       │  Permission  │
├─────────────┤       ├─────────────┤       ├──────────────┤
│ id          │───┐   │ id          │───┐   │ id           │
│ username    │   │   │ name        │   │   │ name         │
│ email       │   └──→│ description │   └──→│ description  │
│ role_id     │       └─────────────┘       └──────────────┘
└─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐       ┌─────────────┐
│    Unit     │       │   Sensor    │
├─────────────┤       ├─────────────┤
│ id          │───┐   │ id          │
│ name        │   │   │ unit_id     │
│ location    │   └──→│ type        │
│ status      │   1:N │ status      │
└─────────────┘       └─────────────┘
                             │
                             │ 1:N
                             ▼
                      ┌─────────────────┐
                      │ SensorReading   │
                      ├─────────────────┤
                      │ id              │
                      │ sensor_id       │
                      │ value           │
                      │ timestamp       │
                      └─────────────────┘
```

### Key Tables

**users**: User accounts and profiles
**roles**: User roles (admin, operator, viewer)
**permissions**: Granular permissions
**units**: Industrial units/equipment
**sensors**: Sensors attached to units
**sensor_readings**: Time-series sensor data

---

## Protocol Integration

### Supported Industrial Protocols

1. **MQTT** - Real-time data streaming
2. **OPC UA** - Industrial automation standard
3. **Modbus** - Legacy industrial protocol
4. **DNP3** - Power system automation

Each protocol has a dedicated service for connection management, data parsing, and error handling.

---

## Scalability and Performance

### Backend Optimization

- **Connection Pooling**: Database connection reuse
- **Caching**: Redis for frequently accessed data
- **Async Processing**: Celery for background tasks
- **Load Balancing**: Horizontal scaling support

### Frontend Optimization

- **Code Splitting**: Route-based lazy loading
- **Bundle Optimization**: Vite tree-shaking
- **Asset Optimization**: Image compression, CDN
- **Virtual Scrolling**: Large data table rendering

---

**For More Information:**
- [API Reference](API_REFERENCE.md)
- [Setup Guide](SETUP_GUIDE.md)
- [Deployment Guide](DEPLOYMENT.md)

*Last Updated: October 2024*
