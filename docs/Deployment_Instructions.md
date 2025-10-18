# Deployment Instructions

> **Last Reviewed**: October 2024  
> **Status**: Current and Accurate  
> **Note**: Dockerfiles referenced in this document need to be created based on the examples provided.

This document provides comprehensive instructions for deploying the ThermaCoreApp, which comprises a Python Flask backend and a React frontend, within an industrial environment. The deployment strategy emphasizes containerization using Docker and Docker Compose for consistency, scalability, and ease of management, aligning with the project's SCADA integration objectives.

## 1. Prerequisites

Ensure the deployment server has the following software installed:

*   **Docker Engine**: Version 20.10.0 or higher.
*   **Docker Compose**: Version 1.29.0 or higher.
*   **Git**: For cloning the application repository.
*   **Python 3.9+**: Required for building the Flask backend image.
*   **Node.js 18+**: Required for building the React frontend image.
*   **pnpm**: For frontend dependency management during image build.

## 2. Environment Setup

### 2.1. Clone the Repository

Begin by cloning the ThermaCoreApp repository to your deployment server:

```bash
gh repo clone Steynzville/ThermaCoreApp
cd ThermaCoreApp
```

### 2.2. Environment Variables

Create a `.env` file in the root of the `backend` directory. This file will contain sensitive information and production-specific configurations. **This file must be secured and never committed to version control.**

Example `.env` for production:

```env
FLASK_ENV=production
SQLALCHEMY_DATABASE_URI=postgresql://<db_user>:<db_password>@db:5432/<db_name> # 'db' is the service name in docker-compose
JWT_SECRET_KEY=<a_strong_randomly_generated_secret_key_for_jwt>
MQTT_BROKER_HOST=<mqtt_broker_host>
MQTT_BROKER_PORT=1883
MQTT_USERNAME=<mqtt_username>
MQTT_PASSWORD=<mqtt_password>
MQTT_USE_TLS=true
MQTT_CA_CERTS=/path/to/ca.crt # Path within the backend container
MQTT_CERT_FILE=/path/to/client.crt # Path within the backend container
MQTT_KEY_FILE=/path/to/client.key # Path within the backend container
OPCUA_SERVER_URL=opc.tcp://<opcua_server_host>:4840
OPCUA_USERNAME=<opcua_username>
OPCUA_PASSWORD=<opcua_password>
OPCUA_SECURITY_POLICY=Basic256Sha256 # Or other strong policy
OPCUA_SECURITY_MODE=SignAndEncrypt # Or other strong mode
OPCUA_CERT_FILE=/path/to/opcua_client.crt # Path within the backend container
OPCUA_PRIVATE_KEY_FILE=/path/to/opcua_client.key # Path within the backend container
OPCUA_TRUST_CERT_FILE=/path/to/opcua_server_trust.crt # Path within the backend container
WEBSOCKET_CORS_ORIGINS=https://yourdomain.com # Comma-separated list of allowed origins
```

**Important**: Ensure `JWT_SECRET_KEY` is a strong, randomly generated key. For MQTT and OPC UA, configure TLS/security settings as appropriate for your production environment, ensuring certificate paths are correct within the container context.

## 3. Containerized Deployment with Docker Compose

The ThermaCoreApp is designed for containerized deployment using Docker Compose, which orchestrates the backend, frontend, and database services.

### 3.1. Create `docker-compose.yml`

Create a `docker-compose.yml` file in the root directory of the `ThermaCoreApp` repository. This file defines the services, networks, and volumes for your application stack.

```yaml
version: '3.8'

services:
  db:
    image: timescale/timescaledb-ha:pg13-latest # Using TimescaleDB for time-series data
    environment:
      POSTGRES_DB: ${DB_NAME:-thermacore_db}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: always

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      FLASK_ENV: production
      SQLALCHEMY_DATABASE_URI: ${SQLALCHEMY_DATABASE_URI}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      MQTT_BROKER_HOST: ${MQTT_BROKER_HOST}
      MQTT_BROKER_PORT: ${MQTT_BROKER_PORT}
      MQTT_USERNAME: ${MQTT_USERNAME}
      MQTT_PASSWORD: ${MQTT_PASSWORD}
      MQTT_USE_TLS: ${MQTT_USE_TLS}
      MQTT_CA_CERTS: ${MQTT_CA_CERTS}
      MQTT_CERT_FILE: ${MQTT_CERT_FILE}
      MQTT_KEY_FILE: ${MQTT_KEY_FILE}
      OPCUA_SERVER_URL: ${OPCUA_SERVER_URL}
      OPCUA_USERNAME: ${OPCUA_USERNAME}
      OPCUA_PASSWORD: ${OPCUA_PASSWORD}
      OPCUA_SECURITY_POLICY: ${OPCUA_SECURITY_POLICY}
      OPCUA_SECURITY_MODE: ${OPCUA_SECURITY_MODE}
      OPCUA_CERT_FILE: ${OPCUA_CERT_FILE}
      OPCUA_PRIVATE_KEY_FILE: ${OPCUA_PRIVATE_KEY_FILE}
      OPCUA_TRUST_CERT_FILE: ${OPCUA_TRUST_CERT_FILE}
      WEBSOCKET_CORS_ORIGINS: ${WEBSOCKET_CORS_ORIGINS}
    volumes:
      - ./backend/certs:/app/certs # Mount certificates if needed
    ports:
      - "5000:5000"
    depends_on:
      - db
    restart: always

  frontend:
    build:
      context: ./src
      dockerfile: Dockerfile
    ports:
      - "80:80" # Or desired public port
    depends_on:
      - backend
    restart: always

volumes:
  pgdata:
```

**Note**: The `Dockerfile` for the backend should be in `backend/Dockerfile` and for the frontend in `src/Dockerfile`. These Dockerfiles need to be created if they don't exist, to build the respective application images. Example Dockerfiles are provided in sections 3.2 and 3.3 below.

### 3.2. Create Backend `Dockerfile` (`backend/Dockerfile`)

```dockerfile
# Use an official Python runtime as a parent image
FROM python:3.9-slim-buster

# Set the working directory in the container
WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y libpq-dev gcc

# Copy the current directory contents into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 5000 for the Flask app
EXPOSE 5000

# Run Gunicorn to serve the Flask application
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "run:app"]
```

### 3.3. Create Frontend `Dockerfile` (`src/Dockerfile`)

```dockerfile
# Use an official Node.js runtime as a parent image
FROM node:18-alpine as builder

# Set the working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the React app
RUN pnpm run build

# Use Nginx to serve the static files
FROM nginx:stable-alpine

# Copy the built React app to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (if any)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 3.4. Build and Run the Application

From the root directory of the `ThermaCoreApp` repository, build and start all services:

```bash
docker-compose up --build -d
```

*   `--build`: Rebuilds images if changes are detected in Dockerfiles or context.
*   `-d`: Runs containers in detached mode.

### 3.5. Initialize Database Schema and Seed Data

After the database and backend containers are running, initialize the schema and seed data. This should be done once.

```bash
docker-compose exec backend flask init-db
```

## 4. External Services

### 4.1. MQTT Broker

Ensure an MQTT broker (e.g., Mosquitto) is installed, configured, and running, accessible from the backend container. For production, configure TLS and authentication for the MQTT broker.

### 4.2. OPC UA Server

If using OPC UA, ensure your OPC UA server is running and accessible from the backend container. Configure security settings (certificates, policies) as defined in your `.env` file.

## 5. Monitoring and Logging

Set up robust monitoring and logging for all containerized services. Utilize Docker's logging drivers to send container logs to a centralized logging solution (e.g., ELK stack, Splunk, cloud-native logging services). Integrate the backend's audit logging and error handling with your chosen logging infrastructure for comprehensive operational insights and security event tracking.

## 6. Scaling and High Availability

For high-availability and scalability in production, consider deploying the Docker Compose stack using an orchestration platform like Kubernetes or Docker Swarm. This allows for easier management of multiple instances, load balancing, and automated failover.
