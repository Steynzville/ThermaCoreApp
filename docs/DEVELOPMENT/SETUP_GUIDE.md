# ThermaCoreApp Development Setup Guide

> **Last Updated**: October 2024  
> **Status**: Current and Verified

This comprehensive guide covers everything you need to set up your development environment for ThermaCoreApp, including both traditional setup and Docker-based deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Quick Start with Docker](#quick-start-with-docker)
4. [Traditional Development Setup](#traditional-development-setup)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Running the Application](#running-the-application)
8. [Verification](#verification)
9. [Common Issues](#common-issues)

---

## Prerequisites

### Required Software

- **Python 3.9+**: For the backend Flask API
- **Node.js 18+**: For the frontend React application
- **pnpm**: Fast package manager for JavaScript
  ```bash
  npm install -g pnpm
  ```
- **Git**: For version control
- **Docker & Docker Compose** (Optional but recommended): For containerized deployment
  - Docker Engine 20.10.0 or higher
  - Docker Compose 1.29.0 or higher

### System Requirements

- **RAM**: At least 4GB available
- **Disk Space**: At least 10GB available
- **OS**: Linux, macOS, or Windows (with WSL2 for Docker)

---

## Project Structure

```
ThermaCoreApp/
├── backend/              # Flask API, models, routes, services
│   ├── app/             # Application code
│   ├── migrations/      # Database migrations
│   ├── tests/           # Backend tests
│   └── requirements.txt # Python dependencies
├── src/                 # React frontend application
│   ├── components/      # React components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   └── styles/          # CSS/styling
├── docs/                # Documentation
├── docker-compose.yml   # Docker orchestration
└── package.json         # Frontend dependencies
```

---

## Quick Start with Docker

### Step 1: Clone the Repository

```bash
git clone https://github.com/ThermaCoreRenewableTechnologies/ThermaCoreApp.git
cd ThermaCoreApp
```

### Step 2: Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

**Edit `.env` with secure values:**

```env
# Security Keys (Generate unique values!)
SECRET_KEY=your-super-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# Database
DB_PASSWORD=secure-database-password

# Application
FLASK_ENV=development
DEBUG=True
```

**Generate secure keys:**

```bash
# Linux/Mac
openssl rand -hex 32

# Or using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### Step 3: Build and Start Services

```bash
docker-compose up --build -d
```

This starts:
- PostgreSQL database (port 5432)
- Flask backend API (port 5000)
- React frontend dev server (port 5173)

### Step 4: Initialize Database

```bash
docker-compose exec backend flask init-db
```

### Step 5: Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Docs**: http://localhost:5000/api/v1/docs

**Default credentials:**
- Username: `admin`
- Password: `admin123`

---

## Traditional Development Setup

### Backend Setup

#### 1. Navigate to Backend Directory

```bash
cd backend
```

#### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

#### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 4. Configure Environment

Create `backend/.env`:

```env
FLASK_ENV=development
SQLALCHEMY_DATABASE_URI=postgresql://postgres:password@localhost:5432/thermacore_db
JWT_SECRET_KEY=super-secret-jwt-key
SECRET_KEY=super-secret-key
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
OPCUA_SERVER_URL=opc.tcp://localhost:4840
```

#### 5. Set Up Database

**Option A: Using Docker (Recommended)**

```bash
# From project root
docker-compose up -d db
```

**Option B: Local PostgreSQL**

Install PostgreSQL and create database:

```sql
CREATE DATABASE thermacore_db;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE thermacore_db TO postgres;
```

#### 6. Initialize Database

```bash
flask init-db
```

#### 7. Run Backend Server

```bash
python run.py
```

Backend runs at: http://localhost:5000

### Frontend Setup

#### 1. Return to Project Root

```bash
cd ..  # If you're in backend/
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Run Development Server

```bash
pnpm run dev
```

Frontend runs at: http://localhost:5173

---

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FLASK_ENV` | Environment mode | `production` | Yes |
| `SQLALCHEMY_DATABASE_URI` | Database connection string | - | Yes |
| `JWT_SECRET_KEY` | JWT token secret | - | Yes |
| `SECRET_KEY` | Flask secret key | - | Yes |
| `CORS_ORIGINS` | Allowed origins for CORS | `*` | No |
| `MQTT_BROKER_HOST` | MQTT broker host | `localhost` | No |
| `MQTT_BROKER_PORT` | MQTT broker port | `1883` | No |
| `OPCUA_SERVER_URL` | OPC UA server URL | - | No |

### Frontend Environment Variables

Create `src/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

---

## Database Setup

### Apply Migrations

Migrations are located in `backend/migrations/`. Apply them in order:

```bash
cd backend
psql $SQLALCHEMY_DATABASE_URI -f migrations/001_initial_schema.sql
psql $SQLALCHEMY_DATABASE_URI -f migrations/002_add_roles.sql
# ... apply all migrations in sequence
```

Or use the automated script:

```bash
bash apply_migrations.sh
```

### Create First Admin User

```bash
python scripts/create_first_admin.py
```

### Verify Database

```bash
python scripts/verify_database.py
```

---

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python run.py
```

**Terminal 2 - Frontend:**
```bash
pnpm run dev
```

### Docker Mode

```bash
docker-compose up
```

### Production Mode

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment instructions.

---

## Verification

### Health Check

```bash
# Check backend health
curl http://localhost:5000/api/v1/health

# Expected response:
# {"status": "healthy", "timestamp": "..."}
```

### Test Login

```bash
cd backend
python test_login_endpoint.py http://localhost:5000 admin admin123
```

### Run Test Suite

**Backend:**
```bash
cd backend
pytest
```

**Frontend:**
```bash
pnpm test
```

---

## Common Issues

### Port Already in Use

If ports 5000 or 5173 are already in use:

**Backend:**
Edit `backend/run.py` and change port:
```python
app.run(port=5001)
```

**Frontend:**
Edit `vite.config.js`:
```js
export default {
  server: { port: 5174 }
}
```

### Database Connection Failed

**Check PostgreSQL is running:**
```bash
# Docker
docker-compose ps

# Local
sudo systemctl status postgresql
```

**Verify connection string:**
```bash
psql $SQLALCHEMY_DATABASE_URI -c "SELECT 1;"
```

### Module Not Found Errors

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
pnpm install
```

### CORS Errors

Add your frontend URL to backend CORS settings:

```python
# backend/app/config.py
CORS_ORIGINS = ['http://localhost:5173']
```

### Docker Build Fails

Clear Docker cache and rebuild:
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

---

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system design
- Review [API_REFERENCE.md](API_REFERENCE.md) for API endpoints
- Check [TESTING.md](../OPERATIONS/TESTING.md) for testing guidelines
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment

---

**Need Help?**
- Check [TROUBLESHOOTING.md](../OPERATIONS/TROUBLESHOOTING.md)
- Review existing issues on GitHub
- Consult the team documentation

*Last Updated: October 2024*
