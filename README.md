# ThermaCoreApp

> **Industrial SCADA Monitoring & Control System**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Node 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)

Real-time SCADA (Supervisory Control and Data Acquisition) system for monitoring and controlling renewable energy thermal systems. Built with Flask (Python) backend and React frontend.

---

## 🚀 Quick Start

### For New Developers

```bash
# Clone repository
git clone https://github.com/ThermaCoreRenewableTechnologies/ThermaCoreApp.git
cd ThermaCoreApp

# Start with Docker (recommended)
docker-compose up --build

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:5000
# Default login: admin / admin123
```

**👉 [Complete Setup Guide](docs/DEVELOPMENT/SETUP_GUIDE.md)**

### For Production Deployment

Deploying to Render.com + Netlify:

```bash
# 1. Fork/clone repository
# 2. Connect to Render.com (detects render.yaml)
# 3. Connect frontend to Netlify (detects netlify.toml)
# 4. Configure environment variables
# 5. Deploy!
```

**👉 [Deployment Guide](docs/DEVELOPMENT/DEPLOYMENT.md)**

---

## 📚 Documentation

### Essential Documentation

| Document | Description |
|----------|-------------|
| **[Setup Guide](docs/DEVELOPMENT/SETUP_GUIDE.md)** | Complete development environment setup |
| **[Architecture](docs/DEVELOPMENT/ARCHITECTURE.md)** | System design and technical architecture |
| **[API Reference](docs/DEVELOPMENT/API_REFERENCE.md)** | Complete REST API documentation |
| **[Deployment Guide](docs/DEVELOPMENT/DEPLOYMENT.md)** | Production deployment instructions |

### Feature Documentation

| Document | Description |
|----------|-------------|
| **[User Management](docs/FEATURES/USER_MANAGEMENT.md)** | User accounts, roles, and permissions |
| **[Authentication](docs/FEATURES/AUTHENTICATION.md)** | Login, security, and session management |
| **[WebSockets & SCADA](docs/FEATURES/WEB_SOCKETS.md)** | Real-time monitoring and industrial protocols |
| **[Admin Panel](docs/FEATURES/ADMIN_PANEL.md)** | System administration guide |

### Operations Documentation

| Document | Description |
|----------|-------------|
| **[Troubleshooting](docs/OPERATIONS/TROUBLESHOOTING.md)** | Common issues and solutions |
| **[Migration Guide](docs/OPERATIONS/MIGRATION_GUIDE.md)** | Database schema changes |
| **[Testing Guide](docs/OPERATIONS/TESTING.md)** | Running and writing tests |

### Archive

| Document | Description |
|----------|-------------|
| **[Development History](docs/ARCHIVE/DEVELOPMENT_HISTORY.md)** | Project history and legacy information |

---

## ✨ Features

### 🔐 Security & Access Control
- **JWT Authentication** - Token-based authentication with refresh rotation
- **Role-Based Access Control** - Admin, Operator, and Viewer roles
- **Granular Permissions** - Fine-grained resource access control
- **Audit Logging** - Complete tracking of user actions
- **Multi-Tenancy** - Company-based user segregation

### 📊 Real-Time Monitoring
- **WebSocket Communication** - Live data streaming
- **MQTT Integration** - IoT sensor data ingestion
- **Multi-Protocol Support** - OPC UA, Modbus, DNP3
- **Live Dashboards** - Real-time visualization
- **Anomaly Detection** - Automated alert system

### 👥 User Management
- **User Registration** - Self-service with admin approval
- **Profile Management** - Complete user profiles
- **Batch Operations** - Bulk user management
- **Company Tracking** - Multi-tenant organization

### ⚙️ System Administration
- **Admin Panel** - Comprehensive system management
- **Health Monitoring** - System status dashboard
- **Configuration Management** - Centralized settings
- **Database Maintenance** - Automated backup and optimization

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Layer                               │
│                   (React SPA - Browser)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS / WebSocket
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Application Layer                            │
│              Flask Backend API (Python 3.9+)                    │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │   REST API   │  │  WebSockets  │  │  Services    │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │ MQTT Broker │  │  Industrial │
│  Database   │  │  (Real-time)│  │  Protocols  │
└─────────────┘  └─────────────┘  └─────────────┘
```

**[View Detailed Architecture →](docs/DEVELOPMENT/ARCHITECTURE.md)**

---

## 🛠️ Technology Stack

### Backend
- **Framework**: Flask 2.3+
- **Database**: PostgreSQL 13+ (TimescaleDB compatible)
- **ORM**: SQLAlchemy
- **Auth**: Flask-JWT-Extended
- **WebSockets**: Flask-SocketIO
- **Protocols**: paho-mqtt, opcua, pymodbus, dnp3

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite 4+
- **Language**: JavaScript (ES6+)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State**: React Context API
- **HTTP Client**: Axios

### DevOps
- **Deployment**: Render.com (Backend), Netlify (Frontend)
- **CI/CD**: GitHub Actions
- **Containerization**: Docker & Docker Compose
- **Testing**: pytest (Backend), Vitest (Frontend)

---

## 📖 API Overview

### Authentication
```bash
# Login
POST /api/v1/auth/login
Content-Type: application/json
{
  "username": "admin",
  "password": "admin123"
}

# Response
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {...}
}
```

### Resource Access
```bash
# List Units
GET /api/v1/units
Authorization: Bearer <access_token>

# Get Real-Time Sensor Data
GET /api/v1/sensors/1/readings?interval=5m
Authorization: Bearer <access_token>
```

**[Full API Documentation →](docs/DEVELOPMENT/API_REFERENCE.md)**

---

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend
pytest --cov=app

# Frontend tests
pnpm test --coverage

# E2E tests
pnpm test:e2e
```

### Test Coverage Standards

This project enforces minimum test coverage thresholds to ensure code quality:

- **Frontend**: Minimum 60% line coverage
- **Backend**: Minimum 60% line coverage

#### Running Coverage Tests Locally

```bash
# Run frontend tests with coverage threshold enforcement
pnpm run test:coverage:frontend

# Run backend tests with coverage threshold enforcement
pnpm run test:coverage:backend

# Run both frontend and backend coverage tests
pnpm run test:coverage:ci

# CI test command (runs all coverage tests)
pnpm run test:ci
```

Coverage tests will fail if the code does not meet the minimum thresholds, ensuring that new code is adequately tested before merging.

**[Testing Guide →](docs/OPERATIONS/TESTING.md)**

---

## 🚢 Deployment

### Quick Deploy to Render + Netlify

1. **Backend (Render.com)**
   - Connect GitHub repository
   - Render auto-detects `render.yaml`
   - Set environment variables
   - Deploy!

2. **Frontend (Netlify)**
   - Connect GitHub repository
   - Netlify auto-detects `netlify.toml`
   - Configure environment variables
   - Deploy!

**[Complete Deployment Guide →](docs/DEVELOPMENT/DEPLOYMENT.md)**

### Environment Variables

**Backend (.env)**:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
CORS_ORIGINS=https://your-frontend.netlify.app
```

**Frontend (.env)**:
```env
VITE_API_BASE_URL=https://your-backend.onrender.com
VITE_WS_URL=wss://your-backend.onrender.com
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow existing code style
- Update documentation
- Run linters before committing

---

## 🆘 Getting Help

### Troubleshooting

Check the **[Troubleshooting Guide](docs/OPERATIONS/TROUBLESHOOTING.md)** for common issues:

- Authentication problems
- Database connection issues
- WebSocket connection failures
- Deployment issues

### Support Channels

1. 📖 **Documentation**: Check the `/docs` directory
2. 🐛 **Issues**: [GitHub Issues](https://github.com/ThermaCoreRenewableTechnologies/ThermaCoreApp/issues)
3. 💬 **Discussions**: [GitHub Discussions](https://github.com/ThermaCoreRenewableTechnologies/ThermaCoreApp/discussions)

---

## 📋 Project Status

- ✅ **Production Ready**: Core functionality stable
- ✅ **Actively Maintained**: Regular updates and improvements
- ✅ **Well Documented**: Comprehensive documentation
- ✅ **Tested**: 90% test coverage

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **ThermaCore Renewable Technologies** - Project sponsor
- **Flask & React Communities** - Excellent frameworks and support
- **Contributors** - Thank you to all who have contributed!

---

## 📞 Contact

**ThermaCore Renewable Technologies**  
Email: info@thermacore.com  
Website: https://thermacore.com

---

<div align="center">

**Built with ❤️ for renewable energy monitoring**

[Setup Guide](docs/DEVELOPMENT/SETUP_GUIDE.md) • 
[API Docs](docs/DEVELOPMENT/API_REFERENCE.md) • 
[Deployment](docs/DEVELOPMENT/DEPLOYMENT.md) • 
[Troubleshooting](docs/OPERATIONS/TROUBLESHOOTING.md)

</div>
