# Render.yaml Deployment Configuration

## Overview

This document describes the `render.yaml` configuration file used for deploying the ThermaCore Flask backend application on Render.com.

## Configuration Summary

The `render.yaml` file in the repository root defines the complete deployment configuration for:
- **Flask Backend Service**: Python web service running the ThermaCore API
- **PostgreSQL Database**: TimescaleDB-compatible database for time-series data

**Important**: The `render.yaml` file must be located in the repository root so that Render can automatically detect and use it for deployment. The service is configured with `rootDir: backend` to ensure all build and start commands run from the backend directory.

## Service Configuration

### Backend Web Service

```yaml
services:
  - type: web
    name: thermacore-backend
    env: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn run:app --bind 0.0.0.0:$PORT
```

**Key Points:**
- **Type**: `web` - HTTP service that responds to web requests
- **Name**: `thermacore-backend` - Service identifier on Render
- **Environment**: `python` - Python runtime environment
- **Root Directory**: `backend` - All commands run from the backend directory
- **Build Command**: Installs Python dependencies from `requirements.txt`
- **Start Command**: Runs Gunicorn WSGI server (4 workers by default)

### Environment Variables

The service uses three critical environment variables:

#### 1. DATABASE_URL
```yaml
- key: DATABASE_URL
  fromDatabase:
    name: thermacore-db
    property: connectionString
```
- Automatically injected by Render from the database connection string
- Format: `postgresql://user:password@host:port/database`
- Used by SQLAlchemy to connect to the database

#### 2. SECRET_KEY
```yaml
- key: SECRET_KEY
  generateValue: true
```
- Automatically generated secure random value by Render
- Used by Flask for session signing and CSRF protection
- Never hardcoded or committed to version control

#### 3. DEBUG
```yaml
- key: DEBUG
  value: "False"
```
- Set to `"False"` for production deployment
- Disables Flask debug mode for security
- Prevents detailed error messages from leaking sensitive information

## Database Configuration

```yaml
databases:
  - name: thermacore-db
    databaseName: thermacore
    user: thermacore_user
    plan: free
```

**Key Points:**
- **Name**: `thermacore-db` - Referenced by the web service
- **Database Name**: `thermacore` - Name of the PostgreSQL database
- **User**: `thermacore_user` - Database user account
- **Plan**: `free` - Render's free tier (can be upgraded)

## Deployment Process

### Automatic Deployment

When you push to the connected Git branch, Render will:

1. **Clone Repository**: Pull the latest code
2. **Navigate to Backend**: Change to the `backend` directory
3. **Install Dependencies**: Run `pip install -r requirements.txt`
4. **Set Environment Variables**: Inject DATABASE_URL, SECRET_KEY, and DEBUG
5. **Start Service**: Run `gunicorn run:app --bind 0.0.0.0:$PORT`

### Database Setup

The database is created automatically with:
- PostgreSQL (compatible with TimescaleDB)
- Connection string automatically provided to the web service
- Free tier includes 256 MB storage

## Important Notes

### Gunicorn Configuration

Gunicorn is included in `backend/requirements.txt` (version 23.0.0):
```
gunicorn==23.0.0
```

This means:
- ✅ No separate installation needed in buildCommand
- ✅ Version is locked and reproducible
- ✅ Included in all dependency installations

### Security Best Practices

1. **DEBUG=False**: Production mode disabled debug features
2. **SECRET_KEY Auto-Generated**: No hardcoded secrets
3. **DATABASE_URL Injected**: No credentials in code
4. **HTTPS**: All Render services use HTTPS by default

### Environment-Specific Configuration

The Flask application uses `backend/config.py` to handle different environments:
- Development: Local development with debug enabled
- Testing: Isolated test database
- Production: Production-optimized settings (used on Render)

The `DEBUG` environment variable helps Flask automatically select the production configuration.

## Validation

You can validate the render.yaml configuration using the included validation script:

```bash
# Run validation script
python validate_render_config.py

# Run as pytest test
pytest validate_render_config.py -v
```

This validates:
- ✅ Service type and name
- ✅ Environment and directory settings
- ✅ Build and start commands
- ✅ Environment variable configuration
- ✅ Database configuration
- ✅ Gunicorn in requirements.txt

## Troubleshooting

### Common Issues

1. **Build Fails**: Check `requirements.txt` for incompatible versions
2. **Database Connection**: Verify DATABASE_URL is injected correctly
3. **Application Won't Start**: Check Gunicorn logs for import errors
4. **500 Errors**: Verify DEBUG is set to "False" and check application logs

### Viewing Logs

On Render dashboard:
1. Navigate to your service
2. Click "Logs" tab
3. View real-time application logs
4. Check for startup errors or runtime exceptions

## Upgrading

To upgrade from free tier:
1. Go to Render dashboard
2. Select the database or web service
3. Choose "Settings" → "Plan"
4. Select desired plan tier

## Related Documentation

- [Backend README](backend/README.md) - Flask application documentation
- [Deployment Instructions](docs/Deployment_Instructions.md) - Docker deployment
- [Docker Setup](DOCKER_SETUP.md) - Local development with Docker

## Changes History

### Latest Configuration
- ✅ Added DEBUG environment variable (value: "False")
- ✅ Confirmed gunicorn in requirements.txt
- ✅ DATABASE_URL and SECRET_KEY properly configured
- ✅ Optimized for production deployment

This configuration resolves known deployment issues and follows Render best practices for Python/Flask applications.
