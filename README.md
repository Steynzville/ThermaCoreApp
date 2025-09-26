# ThermaCore SCADA Integration Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org/)
[![Build Status](https://github.com/Steynzville/ThermaCoreApp/workflows/CI/badge.svg)](https://github.com/Steynzville/ThermaCoreApp/actions)

> A comprehensive SCADA (Supervisory Control and Data Acquisition) platform for industrial monitoring and control, featuring real-time data processing, multi-protocol support, and advanced analytics.

## 🚀 Features

- **Modern Web Interface**: React 19 + TypeScript frontend with responsive design
- **Robust Backend**: Flask REST API with TimescaleDB for time-series data
- **Real-time Communication**: WebSocket support for live data streaming
- **Multi-protocol Support**: MQTT, OPC UA, and Modbus integration
- **Role-based Security**: JWT authentication with granular permissions
- **Time-series Analytics**: Advanced data visualization and reporting
- **Industrial Standards**: Compliant with SCADA industry best practices

## 📋 Quick Start

### Prerequisites

- **Node.js** 16+ and pnpm
- **Python** 3.9+ with pip
- **PostgreSQL** 13+ with TimescaleDB extension
- **Git** for version control

### 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Steynzville/ThermaCoreApp.git
   cd ThermaCoreApp
   ```

2. **Setup Frontend**
   ```bash
   pnpm install
   pnpm dev
   ```

3. **Setup Backend** (in a new terminal)
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python run.py
   ```

4. **Initialize Database**
   ```bash
   cd backend
   flask init-db
   ```

5. **Open the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - API Docs: http://localhost:5000/apidocs/

## 📚 Documentation

- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Backend Documentation](backend/README.md)** - API reference and backend setup
- **[Security Policy](SECURITY.md)** - Security guidelines and vulnerability reporting
- **[Changelog](CHANGELOG.md)** - Version history and release notes

## 🏗️ Architecture

```
ThermaCore/
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── services/      # API and data services
│   │   └── utils/         # Helper functions
├── backend/               # Flask API server
│   ├── app/
│   │   ├── models/        # Database models
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── tests/         # Test suite
└── docs/                  # Additional documentation
```

## 🧪 Testing

### Frontend Tests
```bash
pnpm test              # Run test suite
pnpm test:coverage     # Run with coverage
pnpm lint              # Code linting
pnpm format            # Code formatting
```

### Backend Tests
```bash
cd backend
pytest                 # Run all tests
pytest --cov=app      # Run with coverage
```

## 🚀 Deployment

### Development
Both frontend and backend include hot-reload for development:
```bash
pnpm dev              # Frontend dev server
cd backend && python run.py  # Backend dev server
```

### Production
See individual component documentation:
- [Frontend Build](docs/deployment.md#frontend)
- [Backend Deployment](backend/README.md#deployment)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/Steynzville/ThermaCoreApp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Steynzville/ThermaCoreApp/discussions)
- **Security**: See [SECURITY.md](SECURITY.md) for vulnerability reporting

## 🔗 Related Projects

- [ThermaCore Hardware](https://github.com/Steynzville/ThermaCore-Hardware) - Hardware interface specifications
- [SCADA Protocols](https://github.com/Steynzville/SCADA-Protocols) - Protocol implementation libraries

---

<p align="center">
  <strong>Built with ❤️ for industrial automation</strong><br>
  <sub>© 2024 ThermaCore Systems. All rights reserved.</sub>
</p>