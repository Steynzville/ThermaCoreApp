# ThermaCoreApp Deployment Guide

> **Last Updated**: October 2024  
> **Status**: Production-Ready

Complete guide for deploying ThermaCoreApp to various environments including Render.com, Docker, and traditional VPS hosting.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment to Render.com](#deployment-to-rendercom)
4. [Deployment to Netlify (Frontend)](#deployment-to-netlify-frontend)
5. [Docker Deployment](#docker-deployment)
6. [Traditional VPS Deployment](#traditional-vps-deployment)
7. [Environment Configuration](#environment-configuration)
8. [Database Setup](#database-setup)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Troubleshooting](#troubleshooting)

---

## Overview

ThermaCoreApp deployment architecture:

```
┌─────────────────────────────────────────────────┐
│          Frontend (Netlify/Vercel)              │
│       React SPA - Static Site Hosting           │
└────────────────┬────────────────────────────────┘
                 │
                 │ HTTPS/WSS
                 │
┌────────────────▼────────────────────────────────┐
│         Backend API (Render.com/VPS)            │
│     Flask + Gunicorn + PostgreSQL               │
└────────────────┬────────────────────────────────┘
                 │
                 │
┌────────────────▼────────────────────────────────┐
│      Database (Neon PostgreSQL - Sydney)        │
│         TimescaleDB-compatible                  │
└─────────────────────────────────────────────────┘
```

**Recommended Setup:**
- **Frontend**: Netlify or Vercel (free tier)
- **Backend**: Render.com (free or starter tier)
- **Database**: Neon PostgreSQL (free tier for development, Sydney region)

---

## Prerequisites

### Required Accounts

- [ ] GitHub account (for repository access)
- [ ] Render.com account (for backend hosting)
- [ ] Netlify account (for frontend hosting)
- [ ] Domain name (optional, for custom domain)

### Required Files

Ensure these files are in your repository:
- `render.yaml` - Render deployment configuration
- `backend/requirements.txt` - Python dependencies
- `backend/runtime.txt` - Python version
- `package.json` - Frontend dependencies
- `netlify.toml` - Netlify configuration

---

## Deployment to Render.com

### Step 1: Prepare Repository

Ensure `render.yaml` is in the repository root:

```yaml
services:
  - type: web
    name: thermacore-backend
    env: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn run:app --bind 0.0.0.0:$PORT --workers 4
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: thermacore-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: JWT_SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: "False"
      - key: CORS_ORIGINS
        value: "https://your-frontend.netlify.app"

databases:
  - name: thermacore-db
    databaseName: thermacore
    user: thermacore_user
    plan: free  # or starter for production
```

### Step 2: Connect to Render

1. Log in to [Render.com](https://render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Select the repository: `ThermaCoreRenewableTechnologies/ThermaCoreApp`
5. Render will detect `render.yaml` automatically

### Step 3: Configure Environment Variables

Render will auto-configure most variables, but verify:

**Required Variables:**
- `DATABASE_URL` - Auto-configured from database
- `SECRET_KEY` - Auto-generated
- `JWT_SECRET_KEY` - Auto-generated
- `DEBUG` - Set to `False`
- `CORS_ORIGINS` - Your frontend URL

**Optional Variables:**
```
MQTT_BROKER_HOST=your-mqtt-broker.com
MQTT_BROKER_PORT=1883
OPCUA_SERVER_URL=opc.tcp://your-server:4840
```

### Step 4: Deploy

1. Click **"Apply"** to create services
2. Render will:
   - Create PostgreSQL database
   - Build and deploy backend service
   - Run migrations automatically

**Deployment time**: ~5-10 minutes

### Step 5: Initialize Database

Once deployed, run database initialization:

```bash
# Method 1: Using Render Shell
# In Render Dashboard → Service → Shell
flask init-db

# Method 2: Using Render CLI
render shell thermacore-backend
flask init-db
```

### Step 6: Create First Admin User

```bash
# In Render shell
python scripts/create_first_admin.py
```

**Note the credentials** - you'll need them for first login.

### Step 7: Verify Backend Deployment

Check backend health:

```bash
curl https://your-backend.onrender.com/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-10-23T10:45:00Z"
}
```

---

## Neon PostgreSQL Database Setup

### Overview

ThermaCore uses Neon PostgreSQL for cloud database hosting. Neon provides serverless PostgreSQL with the following benefits:
- **Serverless**: Auto-scaling and auto-suspend during inactivity
- **Sydney Region**: Low latency for Australian deployments
- **Branching**: Database branching for development/staging
- **Free Tier**: Generous free tier for development

### Step 1: Create Neon Account and Project

1. Sign up at [Neon.tech](https://neon.tech)
2. Create a new project:
   - **Project Name**: ThermaCore SCADA
   - **Region**: AWS Sydney (ap-southeast-2) - recommended for Australian deployments
   - **PostgreSQL Version**: 15 or higher

### Step 2: Get Connection String

After creating your project, Neon will provide a connection string:

```
postgres://[user]:[password]@[endpoint].ap-southeast-2.aws.neon.tech/[dbname]?sslmode=require
```

**Example:**
```
postgres://[YOUR_DB_USER]:[YOUR_DB_PASSWORD]@[your-endpoint].ap-southeast-2.aws.neon.tech/thermacore_db?sslmode=require
```

**Important Notes:**
- Always use `?sslmode=require` for secure connections
- The endpoint hostname includes the region (e.g., `ap-southeast-2`)
- Store connection strings securely (environment variables, secrets manager)

### Step 3: Configure Backend for Neon

Update your backend environment configuration:

**For Render.com:**
1. Go to Render Dashboard → Service → Environment
2. Update `DATABASE_URL` environment variable:
   ```
   postgres://[user]:[password]@[endpoint].ap-southeast-2.aws.neon.tech/[dbname]?sslmode=require
   ```
3. Save (triggers auto-redeploy)

**For Local Development:**
Create/update `.env` file in backend directory:
```env
DATABASE_URL=postgres://[user]:[password]@[endpoint].ap-southeast-2.aws.neon.tech/[dbname]?sslmode=require
```

### Step 4: Initialize Database Schema

```bash
# Using Render Shell
render shell thermacore-backend
flask init-db

# Or using local connection
export DATABASE_URL="postgres://[user]:[password]@[endpoint].ap-southeast-2.aws.neon.tech/[dbname]?sslmode=require"
cd backend
flask init-db
```

### Step 5: Verify Connection

```bash
# Test connection from backend
python -c "
import psycopg2
import os
conn = psycopg2.connect(os.environ['DATABASE_URL'])
print('Connection successful!')
conn.close()
"
```

### Neon-Specific Features

**Database Branching:**
- Create branches for staging/testing
- Branches are isolated copies of your database
- Useful for testing migrations before production

**Connection Pooling:**
- Neon uses connection pooling by default
- No need for additional connection pooling setup
- Handles scaling automatically

**Monitoring:**
- View database metrics in Neon dashboard
- Monitor query performance
- Track connection usage

### Troubleshooting Neon Connection

**Issue: Connection timeout**
```bash
# Ensure sslmode=require is included
DATABASE_URL="postgres://user:pass@endpoint.neon.tech/db?sslmode=require"
```

**Issue: SSL certificate verification failed**
```bash
# Neon requires SSL - never use sslmode=disable in production
# For development testing only, you can use:
DATABASE_URL="postgres://user:pass@endpoint.neon.tech/db?sslmode=prefer"
```

**Issue: Too many connections**
- Neon free tier has connection limits
- Check active connections in Neon dashboard
- Ensure application properly closes connections
- Consider upgrading to paid tier for higher limits

### Migration from Render PostgreSQL to Neon

If migrating from Render PostgreSQL:

```bash
# 1. Backup existing Render database
pg_dump $RENDER_DATABASE_URL > backup.sql

# 2. Restore to Neon
psql "$NEON_DATABASE_URL" < backup.sql

# 3. Update environment variables
# Update DATABASE_URL in Render service to point to Neon

# 4. Verify migration
psql "$NEON_DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
```

---

## Deployment to Netlify (Frontend)

### Step 1: Prepare Build Configuration

Ensure `netlify.toml` exists in repository root:

```toml
[build]
  command = "pnpm install && pnpm run build"
  publish = "dist"
  
[build.environment]
  NODE_VERSION = "18"
  
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Step 2: Configure Environment Variables

Create `.env.production` in project root:

```env
VITE_API_BASE_URL=https://your-backend.onrender.com
VITE_WS_URL=wss://your-backend.onrender.com
```

### Step 3: Deploy to Netlify

**Option A: Netlify Dashboard**

1. Log in to [Netlify](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect to GitHub
4. Select repository: `ThermaCoreRenewableTechnologies/ThermaCoreApp`
5. Configure:
   - **Build command**: `pnpm install && pnpm run build`
   - **Publish directory**: `dist`
   - **Environment variables**: Add `VITE_API_BASE_URL` and `VITE_WS_URL`
6. Click **"Deploy site"**

**Option B: Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify init
netlify deploy --prod
```

### Step 4: Update CORS on Backend

After frontend deployment, update backend CORS:

1. Go to Render Dashboard → Service → Environment
2. Update `CORS_ORIGINS`:
   ```
   https://your-actual-site.netlify.app
   ```
3. Save (triggers auto-redeploy)

### Step 5: Verify Frontend Deployment

1. Visit your Netlify URL
2. Try logging in with admin credentials
3. Check console for any CORS errors
4. Verify WebSocket connection

---

## Docker Deployment

### Using Docker Compose (Recommended)

**Step 1: Configure Environment**

Create `.env` file:

```env
# Database
POSTGRES_DB=thermacore_db
POSTGRES_USER=thermacore_user
POSTGRES_PASSWORD=secure_password_here

# Flask Backend
SECRET_KEY=your-super-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
FLASK_ENV=production
DEBUG=False
DATABASE_URL=postgresql://thermacore_user:secure_password_here@db:5432/thermacore_db

# CORS
CORS_ORIGINS=http://localhost:5173

# MQTT (optional)
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883

# OPC UA (optional)
OPCUA_SERVER_URL=opc.tcp://localhost:4840
```

**Step 2: Start Services**

```bash
# Build and start all services
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

**Step 3: Initialize Database**

```bash
# Run migrations
docker-compose exec backend flask init-db

# Create admin user
docker-compose exec backend python scripts/create_first_admin.py
```

**Step 4: Access Application**

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000
- **Database**: localhost:5432

### Using Docker Standalone

**Build Images:**

```bash
# Backend
cd backend
docker build -t thermacore-backend .

# Frontend
cd ..
docker build -f Dockerfile.frontend -t thermacore-frontend .
```

**Run Containers:**

```bash
# Database
docker run -d \
  --name thermacore-db \
  -e POSTGRES_DB=thermacore_db \
  -e POSTGRES_USER=thermacore_user \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  postgres:13

# Backend
docker run -d \
  --name thermacore-backend \
  --link thermacore-db:db \
  -e DATABASE_URL=postgresql://thermacore_user:secure_password@db:5432/thermacore_db \
  -e SECRET_KEY=your-secret-key \
  -e JWT_SECRET_KEY=your-jwt-key \
  -p 5000:5000 \
  thermacore-backend

# Frontend
docker run -d \
  --name thermacore-frontend \
  -p 5173:5173 \
  thermacore-frontend
```

---

## Traditional VPS Deployment

### Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access
- Domain name pointed to server IP

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3.9 python3-pip python3-venv \
  postgresql postgresql-contrib nginx certbot \
  python3-certbot-nginx git curl
```

### Step 2: Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE thermacore_db;
CREATE USER thermacore_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE thermacore_db TO thermacore_user;
\q
```

### Step 3: Application Setup

```bash
# Create application user
sudo useradd -m -s /bin/bash thermacore
sudo su - thermacore

# Clone repository
git clone https://github.com/ThermaCoreRenewableTechnologies/ThermaCoreApp.git
cd ThermaCoreApp/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt gunicorn

# Configure environment
cat > .env << EOF
FLASK_ENV=production
DEBUG=False
DATABASE_URL=postgresql://thermacore_user:secure_password@localhost:5432/thermacore_db
SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
JWT_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
EOF

# Initialize database
flask init-db
python scripts/create_first_admin.py
```

### Step 4: Configure Systemd Service

```bash
# Exit to root
exit

# Create systemd service
sudo nano /etc/systemd/system/thermacore-backend.service
```

Add this content:

```ini
[Unit]
Description=ThermaCore Backend API
After=network.target postgresql.service

[Service]
Type=notify
User=thermacore
Group=thermacore
WorkingDirectory=/home/thermacore/ThermaCoreApp/backend
Environment="PATH=/home/thermacore/ThermaCoreApp/backend/venv/bin"
ExecStart=/home/thermacore/ThermaCoreApp/backend/venv/bin/gunicorn \
  --workers 4 \
  --bind 0.0.0.0:5000 \
  --access-logfile /var/log/thermacore/access.log \
  --error-logfile /var/log/thermacore/error.log \
  run:app

[Install]
WantedBy=multi-user.target
```

**Start service:**

```bash
# Create log directory
sudo mkdir -p /var/log/thermacore
sudo chown thermacore:thermacore /var/log/thermacore

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable thermacore-backend
sudo systemctl start thermacore-backend

# Check status
sudo systemctl status thermacore-backend
```

### Step 5: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/thermacore
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/thermacore /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: SSL Certificate

```bash
sudo certbot --nginx -d api.yourdomain.com
```

### Step 7: Deploy Frontend

```bash
# Build frontend
cd /home/thermacore/ThermaCoreApp
npm install -g pnpm
pnpm install
pnpm run build

# Move to web root
sudo mkdir -p /var/www/thermacore
sudo cp -r dist/* /var/www/thermacore/
sudo chown -R www-data:www-data /var/www/thermacore
```

**Configure Nginx for frontend:**

```bash
sudo nano /etc/nginx/sites-available/thermacore-frontend
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/thermacore;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Enable and get SSL:**

```bash
sudo ln -s /etc/nginx/sites-available/thermacore-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Environment Configuration

### Production Environment Variables

**Backend (.env):**
```env
# Core
FLASK_ENV=production
DEBUG=False
SECRET_KEY=<64-char-random-hex>
JWT_SECRET_KEY=<64-char-random-hex>

# Database (Neon PostgreSQL)
# Example connection string (replace placeholders):
# postgres://[user]:[password]@[endpoint].ap-southeast-2.aws.neon.tech/[dbname]?sslmode=require
DATABASE_URL=postgres://[YOUR_DB_USER]:[YOUR_DB_PASSWORD]@[your-endpoint].ap-southeast-2.aws.neon.tech/thermacore_db?sslmode=require

# CORS (comma-separated)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# MQTT
MQTT_BROKER_HOST=broker.example.com
MQTT_BROKER_PORT=8883
MQTT_USE_TLS=True
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password

# OPC UA
OPCUA_SERVER_URL=opc.tcp://server.example.com:4840
OPCUA_SECURITY_POLICY=Basic256Sha256

# Email (for password reset)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=app-specific-password
```

**Frontend (.env.production):**
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

---

## Database Setup

### Apply Migrations

```bash
cd backend

# List migration files
ls migrations/*.sql

# Apply all migrations in order
for file in migrations/*.sql; do
  psql $DATABASE_URL -f $file
done

# Or use automated script
bash apply_migrations.sh
```

### Backup Database

```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore backup
psql $DATABASE_URL < backup_20241023.sql
```

---

## Post-Deployment Verification

### Backend Health Checks

```bash
# Health endpoint
curl https://api.yourdomain.com/api/v1/health

# Test login
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Frontend Checks

1. ✅ Site loads without errors
2. ✅ Login page displays correctly
3. ✅ Can log in successfully
4. ✅ Dashboard displays data
5. ✅ WebSocket connection established
6. ✅ No console errors
7. ✅ All navigation works

### Database Checks

```bash
# Connect to database
psql $DATABASE_URL

# Verify tables
\dt

# Check user count
SELECT COUNT(*) FROM users;

# Verify roles
SELECT * FROM roles;

# Exit
\q
```

---

## Troubleshooting

### Common Issues

**1. CORS Errors**

**Symptom**: Browser console shows CORS errors

**Solution**:
```bash
# Update CORS_ORIGINS on backend
# Render: Dashboard → Service → Environment
# VPS: Edit .env file
CORS_ORIGINS=https://your-actual-domain.com

# Restart backend
```

**2. Database Connection Failed**

**Symptom**: Backend logs show "could not connect to database"

**Solution**:
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:5432/database

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check database is running
# Render: Check database service status
# VPS: sudo systemctl status postgresql
```

**3. 500 Internal Server Error**

**Symptom**: API returns 500 errors

**Solution**:
```bash
# Check backend logs
# Render: Dashboard → Logs
# VPS: sudo journalctl -u thermacore-backend -f

# Common causes:
# - Missing environment variables
# - Database not initialized
# - Missing migrations
```

**4. Frontend Build Fails**

**Symptom**: Netlify/Vercel build fails

**Solution**:
```bash
# Check build logs for specific error
# Common fixes:

# Ensure correct Node version
# netlify.toml or vercel.json:
# NODE_VERSION = "18"

# Clear cache and retry
# Netlify: Deploys → Trigger Deploy → Clear cache and deploy
```

**5. WebSocket Connection Fails**

**Symptom**: Real-time updates don't work

**Solution**:
```bash
# Ensure WebSocket URL uses wss:// (not ws://) in production
VITE_WS_URL=wss://api.yourdomain.com

# Check Nginx WebSocket config (VPS deployments)
# Ensure proxy_set_header Upgrade and Connection are set
```

### Getting Help

1. Check application logs
2. Review [TROUBLESHOOTING.md](../OPERATIONS/TROUBLESHOOTING.md)
3. Search existing GitHub issues
4. Contact support team

---

**Related Documentation:**
- [Setup Guide](SETUP_GUIDE.md)
- [Architecture](ARCHITECTURE.md)
- [Troubleshooting](../OPERATIONS/TROUBLESHOOTING.md)

*Last Updated: October 2024*
