# ThermaCore Integrated SCADA: Deployment Guide
## Step-by-Step Production Setup and Infrastructure Orchestration Manual

This document outlines the deployment configuration for the ThermaCore SCADA Platform in secure cloud environments.

---

## 1. Prerequisites and Local Environment
* **Runtime**: Node.js v20+ and Python v3.9+
* **Package Managers**: `pnpm` (or `npm`) and `pip`
* **Infrastructure Accounts**:
  * **Render.com** (to host the backend API container)
  * **Netlify.com** (to host the static React 19 frontend SPA)
  * **Neon.tech** (serverless PostgreSQL with TimescaleDB)

> [!IMPORTANT]
> Prior to deploying or initializing your environment, ensure you copy the `.env.example` template file to `.env` in the root directory and populate all required environment and credential variables.


---

## 2. Database Provisioning & Schema Migration

ThermaCore uses **Neon Serverless PostgreSQL** equipped with **TimescaleDB** extensions for time-series hyper-tables.

### 2.1 Database Setup Steps
1. Log into your Neon console and create a new PostgreSQL database.
2. Under the *SQL Editor*, run the following commands to initialize the required extensions:
   ```sql
   CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
   ```
3. Copy the database connection string:
   ```
   postgres://[user]:[password]@[host]/[dbname]?sslmode=require
   ```

### 2.2 Migrations Execution
On your deployment environment or local system, run the schema migration:
```bash
# Run migration queries directly via Drizzle
npx drizzle-kit push:pg
```

---

## 3. Backend Deployment (Render.com Container)

The backend Flask application is encapsulated in a secure, non-root Docker container.

### 3.1 Render Web Service Settings
1. Create a new **Web Service** on Render from your GitHub repository.
2. Select **Docker** as the Runtime.
3. Configure the following environment variables:

| Environment Variable | Required Value | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgres://...` | Secure connection string to database |
| `JWT_SECRET_KEY` | `[Random cryptographic string]` | Used to sign JWT session structures |
| `MQTT_BROKER_URL` | `[Broker address]` | Industrial MQTT endpoint url |
| `MQTT_TLS_CERT` | `[Base64 Encoded Certificate]` | client certificate for mTLS broker |
| `NODE_ENV` | `production` | Sets execution state to production |
| `PORT` | `3000` | Port required by reverse proxy |

---

## 4. Frontend Deployment (Netlify.com Static CDN)

The presentation tier is compiled into static assets via Vite and hosted on Netlify's globally distributed Edge network.

### 4.1 Netlify Build Configuration
1. Link your GitHub repository in Netlify.
2. Configure the following Build settings:
   * **Build Command**: `pnpm run build`
   * **Publish Directory**: `dist`
3. Configure the following environment variables:

| Environment Variable | Production Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com` | Base path for REST API calls |
| `VITE_WS_URL` | `wss://your-backend.onrender.com` | Base path for Socket.io web sockets |

### 4.2 URL Routing Rewrite Guard (`netlify.toml`)
To prevent `404 Not Found` errors when refreshing routes on the React Router single-page application (SPA), ensure a `netlify.toml` file exists in the project root with the following rewrite rules:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = false
```

---

## 5. Local Docker Deployment (Development and Validation)

To simulate the entire container environment locally prior to production deployment, use Docker:

```bash
# Build the production container
docker build -t thermacore-scada:latest .

# Run the container locally mapping host port 3000
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://..." \
  -e JWT_SECRET_KEY="supersecret" \
  thermacore-scada:latest
```

---

## 6. Post-Deployment Verification Steps

Once deployment has completed successfully, execute these validation checks:

### Verification Checklist
* [ ] **SSL Verification**: Open `https://your-frontend.netlify.app` and confirm the padlock icon is active (HTTPS).
* [ ] **CORS Check**: Open browser DevTools. Navigate to the Console tab and verify that there are no cross-origin policy block notices.
* [ ] **API Loop Check**: Confirm you can successfully register a user and that the registration writes successfully to the database.
* [ ] **WebSocket Connectivity**: Verify the status indicator displays `🟢 ONLINE` (indicating the persistent Socket.io channel is connected).
