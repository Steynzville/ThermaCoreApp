# Docker Setup Guide for ThermaCoreApp

This guide provides instructions for running ThermaCoreApp using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10.0 or higher
- Docker Compose 1.29.0 or higher
- At least 4GB of available RAM
- At least 10GB of available disk space

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Steynzville/ThermaCoreApp.git
cd ThermaCoreApp
```

### 2. Configure Environment Variables

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

**Important:** Edit `.env` and set secure values for:
- `SECRET_KEY` - Use a strong random string
- `JWT_SECRET_KEY` - Use a different strong random string
- `DB_PASSWORD` - Set a secure database password

To generate secure keys, you can use:

```bash
# On Linux/Mac
openssl rand -hex 32

# Or using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Build and Start Services

Build and start all services (database, backend, frontend):

```bash
docker-compose up --build -d
```

This command will:
- Build the backend Flask application
- Build the frontend React application
- Pull the TimescaleDB image
- Start all services in detached mode

### 4. Initialize the Database

After the containers are running, initialize the database schema and seed data:

```bash
docker-compose exec backend flask init-db
```

### 5. Access the Application

- **Frontend**: http://localhost (or http://localhost:80)
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/apidocs

Default login credentials:
- Username: `admin`
- Password: `admin123`

**Important:** Change the default password immediately after first login.

## Service Management

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Stop Services

```bash
# Stop all services
docker-compose stop

# Stop specific service
docker-compose stop backend
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop and Remove Containers

```bash
docker-compose down
```

### Stop and Remove Containers with Volumes (WARNING: This deletes all data)

```bash
docker-compose down -v
```

## Database Management

### Access Database Shell

```bash
docker-compose exec db psql -U postgres -d thermacore_db
```

### Backup Database

```bash
docker-compose exec db pg_dump -U postgres thermacore_db > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T db psql -U postgres thermacore_db
```

## Development Workflow

### Rebuild After Code Changes

When you make changes to the code:

```bash
# Backend changes
docker-compose up --build -d backend

# Frontend changes
docker-compose up --build -d frontend
```

### Run Backend Commands

```bash
# Create a new admin user
docker-compose exec backend flask create-admin

# Access Python shell
docker-compose exec backend python
```

## Troubleshooting

### Backend Won't Start

1. Check logs: `docker-compose logs backend`
2. Verify environment variables are set correctly in `.env`
3. Ensure database is healthy: `docker-compose ps`

### Database Connection Issues

1. Check database health:
   ```bash
   docker-compose exec db pg_isready -U postgres -d thermacore_db
   ```

2. Verify database service is running:
   ```bash
   docker-compose ps db
   ```

3. Check database logs:
   ```bash
   docker-compose logs db
   ```

### Frontend Not Loading

1. Check Nginx logs: `docker-compose logs frontend`
2. Verify the build completed successfully
3. Check if the backend API is accessible

### Port Conflicts

If ports 80, 5000, or 5432 are already in use, you can modify them in `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # Change 80 to 8080
  backend:
    ports:
      - "5001:5000"  # Change 5000 to 5001
  db:
    ports:
      - "5433:5432"  # Change 5432 to 5433
```

## Production Deployment

For production deployment:

1. **Use strong secrets**: Generate and use cryptographically secure keys
2. **Enable HTTPS**: Use a reverse proxy (nginx/traefik) with SSL certificates
3. **Limit database exposure**: Remove the database port exposure or use firewall rules
4. **Configure backups**: Set up automated database backups
5. **Monitor resources**: Use monitoring tools like Prometheus/Grafana
6. **Update CORS origins**: Set specific allowed origins instead of wildcards
7. **Review logs**: Configure log aggregation and monitoring

### Production Environment Variables

Update `.env` for production:

```bash
# Use production-grade secrets
SECRET_KEY=<generated-with-openssl-rand>
JWT_SECRET_KEY=<generated-with-openssl-rand>
DB_PASSWORD=<strong-database-password>

# Limit CORS to your frontend domain
CORS_ORIGINS=https://yourdomain.com

# Configure external services
MQTT_BROKER_HOST=your-mqtt-broker
OPCUA_SERVER_URL=opc.tcp://your-opcua-server:4840
```

## Security Considerations

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Change default passwords** - Especially the admin password
3. **Use secrets management** - Consider Docker secrets or external secret managers
4. **Regular updates** - Keep Docker images and dependencies updated
5. **Network isolation** - Use Docker networks to isolate services
6. **Read-only volumes** - Mount certificates and configs as read-only

## Validation Checklist

After deployment, verify:

- [ ] All three services are running: `docker-compose ps`
- [ ] Database is healthy and accepting connections
- [ ] Backend API responds: `curl http://localhost:5000/api/v1/health`
- [ ] Frontend loads in browser
- [ ] Can login with default credentials
- [ ] Database has been initialized with seed data
- [ ] Logs show no critical errors

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [ThermaCoreApp Deployment Instructions](docs/Deployment_Instructions.md)

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review service logs: `docker-compose logs`
3. Check the [GitHub Issues](https://github.com/Steynzville/ThermaCoreApp/issues)
