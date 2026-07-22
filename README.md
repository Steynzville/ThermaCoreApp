# ThermaCore SCADA Platform

> **Industrial Multi-Tenant SCADA Monitoring & Control System for Renewable Energy Assets**

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](<docs/Copyright (c) 2026 ThermaCore Renewable Technologies Pty Ltd.md>)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Node.js 18-24](https://img.shields.io/badge/Node.js-18--24-green.svg)](https://nodejs.org/)
[![React 19](https://img.shields.io/badge/React-19.1-cyan.svg)](https://react.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4.1-blueviolet.svg)](https://tailwindcss.com/)
[![PostgreSQL / TimescaleDB](https://img.shields.io/badge/PostgreSQL-13%2B_--_TimescaleDB-blue.svg)](https://www.postgresql.org/)
[![Tests Passing](https://img.shields.io/badge/Tests-5%2C504_Passing-brightgreen.svg)](#-automated-testing--quality-gates)

ThermaCore SCADA is an enterprise-grade, web-native supervisory control and data acquisition system engineered for monitoring, controlling, and optimizing modular thermal energy and water generation units. Built with a high-performance Python (Flask) backend and a React 19 single-page application frontend.

---

## 🚀 Quick Start

### Environment Configuration (.env)

Before launching, copy the template and configure environment variables:

```bash
cp .env.example .env
```

Key environment configuration variables:

```env
# Backend Database & Security
DATABASE_URL=postgresql://postgres:password@localhost:5432/thermacore_db
JWT_SECRET_KEY=your-secure-jwt-secret-key
SECRET_KEY=your-flask-secret-key
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:80

# Frontend API Connections
VITE_API_BASE_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

### Local Development Setup

#### Option A: Docker Compose (Recommended)

Run the full stack (Frontend, Backend API, and TimescaleDB) using Docker Compose:

```bash
# 1. Clone repository
git clone https://github.com/ThermaCoreRenewableTechnologies/ThermaCoreApp.git
cd ThermaCoreApp

# 2. Launch container stack
docker-compose up --build
```

- **Frontend App**: `http://localhost:80` (or `http://localhost:3000` / `http://localhost:5173` when running Vite dev server)
- **Backend REST API**: `http://localhost:5000`
- **PostgreSQL / TimescaleDB**: `localhost:5432`

#### Option B: Native Host Environment

```bash
# Backend Setup
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python server.py

# Frontend Setup (in a separate terminal)
pnpm install
pnpm run dev
```

### 🔐 Authentication & Access Workflow

- **Self-Registration**: New users register via the application signup portal. Self-registered users are assigned read-only **Viewer** privileges pending Administrator review.
- **Admin Approval & Elevation**: Administrators review pending accounts in the User Management interface to assign **Operator** or **Admin** privileges.
- **Admin Landing Page & Multi-Tenant Context (`/admin`)**: Upon logging in, administrative users land on the dedicated Admin Landing Page at `/admin`. Admins must select an active tenant context before accessing tenant-scoped operational data.
- **Header Tenant Switcher**: Administrators can switch tenant contexts dynamically from any view using the global Tenant Switcher dropdown in the Dashboard header.

---

## 📚 Repository Documentation

All comprehensive engineering, operational, and strategic documentation files are located in the `/docs` directory:

| Document | Description |
|---|---|
| **[Developer Onboarding](docs/DEVELOPER_ONBOARDING.md)** | Local environment setup, coding guidelines, Biome linting, and workflow |
| **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** | Step-by-step production orchestration (Render, Netlify, Neon Serverless DB) |
| **[API Reference](docs/API_REFERENCE.md)** | Complete REST API endpoints, schemas, authentication, and WebSocket specs |
| **[Operator Manual](docs/OPERATOR_MANUAL.md)** | Field operator operational manual, alarm acknowledgment, and unit controls |
| **[Troubleshooting](docs/TROUBLESHOOTING.md)** | Diagnostic flows, common error codes, and resolution procedures |
| **[Security Incident Response](docs/SECURITY_INCIDENT_RESPONSE.md)** | Zero-trust protocol, incident triage phases, and threat isolation |
| **[Backup & Recovery](docs/BACKUP_RECOVERY.md)** | Backup strategies, multi-tenant isolation, and disaster recovery schedule |
| **[Changelog](docs/CHANGELOG.md)** | Release notes, security updates, and version history |
| **[FAQ](docs/FAQ.md)** | Frequently asked questions regarding architecture, security, and setup |
| **[Feature Comparison Matrix](docs/FEATURE_COMPARISON_MATRIX.md)** | Competitive analysis vs traditional SCADA software and equipment |
| **[Investor Deck](docs/INVESTOR_DECK.md)** | Detailed commercial pitch deck, technology capabilities, and market strategy |
| **[Investor Summary](docs/INVESTOR_SUMMARY.md)** | Executive briefing, ROI metrics, and dual revenue model overview |
| **[Sales Demo Script](docs/SALES_DEMO_SCRIPT.md)** | Guided step-by-step product demonstration script for enterprise clients |

---

## ✨ System Architecture & Multi-Tenancy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Presentation Tier                                │
│          React 19 SPA (Tailwind CSS 4, Radix UI, Framer Motion)             │
│        Routes Protected via ProtectedRoute (roles: ["admin"])               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ HTTPS / WSS (JWT Session Tokens)
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            Application Tier                                 │
│                   Flask REST API & WebSocket Server                         │
│   ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────────┐   │
│   │  Auth & RBAC Mod.  │ │  Telemetry Engine  │ │  Tenant Context Mgr    │   │
│   └────────────────────┘ └────────────────────┘ └────────────────────────┘   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                │                      │                      │
                ▼                      ▼                      ▼
┌───────────────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│  Neon Serverless Postgres │ │   MQTT Broker    │ │ Industrial Gateways      │
│  (TimescaleDB Extension)  │ │ (mTLS Telemetry) │ │ (OPC-UA, Modbus-TCP)     │
└───────────────────────────┘ └──────────────────┘ └──────────────────────────┘
```

### Multi-Tenant Architecture

1. **Database Level Isolation**: All operational telemetry, user records, and generator configurations carry explicit `tenant_id` foreign key isolation.
2. **Admin Selection Portal (`/admin`)**: Administrator accounts land on `/admin` post-authentication to choose an active tenant context before viewing scoped metrics.
3. **Global Header Tenant Switcher**: Administrators can switch contexts seamlessly across tenant organizations without re-authenticating.
4. **Normalized Role Guards**: Admin routes are protected using `ProtectedRoute` configured with `roles: ["admin"]` and normalized via `getFrontendRole()`.

---

## 🛠️ Technology Stack

### Backend & Ingestion
- **Runtime & Framework**: Python 3.9+, Flask 2.3+
- **ORM & Database**: SQLAlchemy 2.0+, Flask-SQLAlchemy 3.1+
- **Database Engine**: PostgreSQL 13+ with TimescaleDB extension (Neon Serverless PostgreSQL supported)
- **Authentication**: Flask-JWT-Extended 4.6+ (short-lived access tokens + HttpOnly cookies)
- **Real-Time Communication**: Flask-SocketIO 5.3+, Redis 5.0+
- **Industrial Ingestion**: Paho MQTT, OPC-UA Client (`opcua`), PyModbus, mTLS handshakes

### Frontend & User Interface
- **Framework & Build**: React 19.1+, Vite 6.4+
- **Language & Standards**: JavaScript (ES Modules, `type: "module"`), Node.js >=18 <25
- **Styling & Components**: Tailwind CSS 4.1+, Radix UI primitives, Lucide Icons, Framer Motion 12.2+
- **Data Visualization**: Recharts, AG-Grid Community 34.2+
- **Code Quality & Formatting**: Biome 2.2+ (`npx biome check .`)

### Infrastructure & DevOps
- **Backend Hosting**: Render.com (Docker Container runtime)
- **Frontend Hosting**: Netlify (Static CDN Edge distribution with SPA rewrites)
- **Database Cloud**: Neon.tech (Serverless PostgreSQL with TimescaleDB)
- **Containerization**: Docker & Docker Compose (`docker-compose.yml`)

---

## 🧪 Automated Testing & Quality Gates

ThermaCore SCADA enforces strict automated testing quality gates to ensure production stability and zero regressions.

### Current Test Verification Stats

- **Total Automated Tests**: **5,504 passing assertions** (4,180 frontend, 1,324 backend)
- **Frontend Test Coverage (Vitest)**: **91.78% Total Coverage**
  - *Statements*: **91.78%**
  - *Branches*: **90.92%**
  - *Functions*: **91.90%**
  - *Minimum Enforcement Threshold*: **80%** (Currently Exceeded)
- **Backend Test Coverage (Pytest)**: **85.63% Total Coverage**
  - *Minimum Enforcement Threshold*: **60%** (Currently Exceeded)

### Test Execution Commands

```bash
# Run Frontend Unit & Integration Tests
pnpm test

# Run Frontend Coverage Enforcement
pnpm run test:coverage:frontend

# Run Backend Pytest Suite with Coverage
cd backend && python -m pytest --cov=app --cov-report=term

# Run Full CI Coverage Enforcement Suite
pnpm run test:ci
```

---

## 🚢 Production Deployment

For detailed production instructions, consult the **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**.

### Quick Deployment Steps

1. **Database Provisioning (Neon.tech)**:
   - Provision a PostgreSQL database instance on Neon.tech.
   - Enable TimescaleDB extension: `CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`
2. **Backend Web Service (Render.com)**:
   - Deploy as a Docker Web Service pointing to `backend/Dockerfile`.
   - Set environment variables: `DATABASE_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS`, `NODE_ENV=production`.
3. **Frontend SPA (Netlify)**:
   - Connect repository and set build command: `pnpm run build`, publish directory: `dist`.
   - Configure environment variables: `VITE_API_BASE_URL`, `VITE_WS_URL`.
   - Ensure `netlify.toml` contains rewrite rules for SPA client routing (`/* -> /index.html`).

---

## 🆘 Troubleshooting & Support

If you encounter issues during setup or operation, refer to:

- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)**: Diagnostic flowcharts, CORS fixes, database migration issues, and WebSocket troubleshooting.
- **[FAQ Document](docs/FAQ.md)**: Common questions regarding configuration, multi-tenancy, and security.

---

## ⚠️ Manufacturing & Safety Disclaimer

This software and demonstration codebase are provided for industrial monitoring and supervisory oversight. Always ensure physical fail-safe hardware overrides, thermal relief valves, and emergency cutoffs are installed on live equipment independently of web software layers.

---

## 📄 License

This repository is proprietary software owned by **ThermaCore Renewable Technologies Pty Ltd**. All rights reserved. Unauthorized copying, distribution, or modification is strictly prohibited. See [Copyright Notice](docs/Copyright%20\(c\)%202026%20ThermaCore%20Renewable%20Technologies%20Pty%20Ltd.md).
