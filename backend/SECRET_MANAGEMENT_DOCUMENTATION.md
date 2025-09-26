# ThermaCore SCADA API - Secret Management Documentation

## Overview

This document provides comprehensive guidance for secure secret management in the ThermaCore SCADA API, covering environment variables, encryption keys, database credentials, and other sensitive configuration data.

## Secret Categories

### 1. Database Credentials

#### Environment Variables
```bash
# PostgreSQL/TimescaleDB Connection
DATABASE_URL=postgresql://username:password@localhost:5432/thermacore_db
DB_USERNAME=thermacore_user
DB_PASSWORD=secure_database_password_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thermacore_db
```

#### Security Requirements
- **Minimum Length**: 16 characters
- **Complexity**: Alphanumeric + special characters
- **Rotation**: Every 90 days in production
- **Encryption**: Database connections must use TLS/SSL

#### Best Practices
- Never hardcode database passwords in source code
- Use connection pooling with encrypted connections
- Implement database credential rotation
- Monitor for unauthorized access attempts

### 2. JWT and Authentication Secrets

#### JWT Configuration
```bash
# JWT Token Security
JWT_SECRET_KEY=your-super-secret-jwt-key-min-32-chars
JWT_ACCESS_TOKEN_EXPIRES=1  # hours
JWT_REFRESH_TOKEN_EXPIRES=30  # days

# Flask Application Secret
SECRET_KEY=your-flask-secret-key-for-sessions
```

#### Security Requirements
- **JWT_SECRET_KEY**: Minimum 32 characters, cryptographically random
- **SECRET_KEY**: Minimum 32 characters, unique per environment
- **Key Rotation**: Every 180 days or on security incident

#### Generation Examples
```bash
# Generate secure JWT secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate Flask secret key
python -c "import os; print(os.urandom(24).hex())"

# Using OpenSSL
openssl rand -hex 32
```

### 3. External Service Credentials

#### MQTT Broker Security
```bash
# MQTT Authentication
MQTT_BROKER_HOST=mqtt.example.com
MQTT_BROKER_PORT=8883
MQTT_USERNAME=thermacore_mqtt_user
MQTT_PASSWORD=secure_mqtt_password
MQTT_CLIENT_ID=thermacore_backend_prod
MQTT_USE_TLS=true

# MQTT TLS/SSL Certificates
MQTT_CA_CERTS=/path/to/ca-certificates.crt
MQTT_CERT_FILE=/path/to/client-certificate.pem
MQTT_KEY_FILE=/path/to/client-private-key.pem
```

#### OPC UA Security
```bash
# OPC UA Server Connection
OPCUA_SERVER_URL=opc.tcp://plc.example.com:4840
OPCUA_USERNAME=thermacore_opcua_user
OPCUA_PASSWORD=secure_opcua_password
OPCUA_SECURITY_POLICY=Basic256Sha256
OPCUA_SECURITY_MODE=SignAndEncrypt

# OPC UA Certificates
OPCUA_CERT_FILE=/path/to/opcua-client.crt
OPCUA_PRIVATE_KEY_FILE=/path/to/opcua-client.key
OPCUA_TRUST_CERT_FILE=/path/to/opcua-server.crt
```

### 4. Third-Party API Keys

#### Rate Limiting and Caching
```bash
# Redis Configuration (for rate limiting)
REDIS_URL=redis://username:password@redis.example.com:6379/0
REDIS_USERNAME=thermacore_redis_user
REDIS_PASSWORD=secure_redis_password

# External API Keys
WEATHER_API_KEY=your_weather_service_api_key
NOTIFICATION_API_KEY=your_notification_service_key
```

## Environment-Specific Configuration

### Development Environment
```bash
# .env.development
NODE_ENV=development
DEBUG=true
DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/thermacore_dev
JWT_SECRET_KEY=development-jwt-secret-not-for-production
SECRET_KEY=development-secret-key-change-me

# Allow insecure connections in development
MQTT_USE_TLS=false
OPCUA_SECURITY_MODE=None
SSL_REQUIRE=false
```

#### Development Security Notes
- Use different secrets from production
- Enable debug logging for troubleshooting
- Allow insecure connections for local testing
- Document all development-specific configurations

### Staging Environment
```bash
# .env.staging
NODE_ENV=staging
DEBUG=false
DATABASE_URL=postgresql://staging_user:secure_staging_pass@staging-db:5432/thermacore_staging
JWT_SECRET_KEY=staging-specific-jwt-secret-32-chars-min
SECRET_KEY=staging-specific-secret-key-unique

# Production-like security in staging
MQTT_USE_TLS=true
OPCUA_SECURITY_MODE=SignAndEncrypt
SSL_REQUIRE=true
```

### Production Environment
```bash
# .env.production
NODE_ENV=production
DEBUG=false
DATABASE_URL=postgresql://prod_user:highly_secure_prod_password@prod-db:5432/thermacore_prod
JWT_SECRET_KEY=production-jwt-secret-cryptographically-secure-32-plus-chars
SECRET_KEY=production-secret-key-unique-per-deployment

# Maximum security in production
MQTT_USE_TLS=true
OPCUA_SECURITY_MODE=SignAndEncrypt
SSL_REQUIRE=true
FORCE_HTTPS=true

# Additional production security
AUDIT_LOG_LEVEL=INFO
SECURITY_HEADERS=true
RATE_LIMITING_STRICT=true
```

## Secret Management Best Practices

### 1. Environment Variable Management

#### File-Based Configuration
```bash
# .env files should never be committed to version control
# Add to .gitignore
.env
.env.local
.env.development
.env.staging  
.env.production
*.env.backup
```

#### Docker Secrets
```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    image: thermacore-api:latest
    environment:
      - DATABASE_URL_FILE=/run/secrets/db_url
    secrets:
      - db_url
      - jwt_secret

secrets:
  db_url:
    file: ./secrets/database_url.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

#### Kubernetes Secrets
```yaml
# k8s-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: thermacore-secrets
type: Opaque
stringData:
  database-url: postgresql://user:pass@db:5432/thermacore
  jwt-secret-key: your-secure-jwt-secret-here
  flask-secret-key: your-secure-flask-secret-here
```

### 2. Cloud Provider Secret Management

#### AWS Secrets Manager
```python
import boto3
from botocore.exceptions import ClientError

def get_secret(secret_name, region_name="us-east-1"):
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )
    try:
        response = client.get_secret_value(SecretId=secret_name)
        return response['SecretString']
    except ClientError as e:
        raise e
```

#### Azure Key Vault
```python
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential

def get_azure_secret(vault_url, secret_name):
    credential = DefaultAzureCredential()
    client = SecretClient(vault_url=vault_url, credential=credential)
    secret = client.get_secret(secret_name)
    return secret.value
```

#### Google Secret Manager
```python
from google.cloud import secretmanager

def get_google_secret(project_id, secret_id, version_id="latest"):
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")
```

### 3. Certificate Management

#### TLS/SSL Certificate Rotation
```bash
#!/bin/bash
# cert-rotation.sh

# Generate new certificates
openssl req -x509 -newkey rsa:4096 -keyout new-private-key.pem \
  -out new-certificate.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=thermacore.example.com"

# Update application configuration
export MQTT_CERT_FILE="/path/to/new-certificate.pem"
export MQTT_KEY_FILE="/path/to/new-private-key.pem"

# Restart services
systemctl restart thermacore-api
```

#### Certificate Monitoring
```python
import ssl
import socket
from datetime import datetime, timedelta

def check_certificate_expiry(hostname, port=443):
    context = ssl.create_default_context()
    with socket.create_connection((hostname, port)) as sock:
        with context.wrap_socket(sock, server_hostname=hostname) as ssock:
            cert = ssock.getpeercert()
            expiry_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
            days_until_expiry = (expiry_date - datetime.now()).days
            return days_until_expiry
```

## Security Hardening

### 1. Secret Scanning and Prevention

#### Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

#### CI/CD Pipeline Integration
```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run secret detection
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
```

### 2. Runtime Secret Protection

#### Environment Variable Validation
```python
import os
import sys
from typing import List, Optional

def validate_required_secrets(required_vars: List[str]) -> Optional[List[str]]:
    """Validate that all required environment variables are set."""
    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
    
    if missing:
        print(f"ERROR: Missing required environment variables: {missing}")
        return missing
    return None

# Application startup validation
REQUIRED_SECRETS = [
    'DATABASE_URL',
    'JWT_SECRET_KEY', 
    'SECRET_KEY'
]

if __name__ == "__main__":
    missing = validate_required_secrets(REQUIRED_SECRETS)
    if missing:
        sys.exit(1)
```

#### Secret Masking in Logs
```python
import re
import logging

class SecretMaskingFormatter(logging.Formatter):
    """Custom log formatter that masks sensitive information."""
    
    SENSITIVE_PATTERNS = [
        (re.compile(r'password["\']?\s*[:=]\s*["\']?([^"\'\s,}]+)', re.IGNORECASE), 'password=***'),
        (re.compile(r'token["\']?\s*[:=]\s*["\']?([^"\'\s,}]+)', re.IGNORECASE), 'token=***'),
        (re.compile(r'key["\']?\s*[:=]\s*["\']?([^"\'\s,}]+)', re.IGNORECASE), 'key=***'),
        (re.compile(r'secret["\']?\s*[:=]\s*["\']?([^"\'\s,}]+)', re.IGNORECASE), 'secret=***'),
    ]
    
    def format(self, record):
        message = super().format(record)
        for pattern, replacement in self.SENSITIVE_PATTERNS:
            message = pattern.sub(replacement, message)
        return message
```

## Incident Response

### 1. Secret Compromise Response

#### Immediate Actions
1. **Rotate Compromised Secrets**: Change all potentially compromised credentials
2. **Revoke Access**: Invalidate existing tokens and sessions
3. **Audit Logs**: Review audit logs for unauthorized access
4. **Notify Stakeholders**: Inform relevant teams and management

#### Secret Rotation Checklist
- [ ] Generate new secrets with proper complexity
- [ ] Update all deployment environments
- [ ] Restart affected services
- [ ] Verify service functionality
- [ ] Update documentation and procedures
- [ ] Review access logs for suspicious activity

### 2. Monitoring and Alerting

#### Secret-Related Alerts
```python
# Alert conditions
ALERT_CONDITIONS = {
    'failed_authentication_threshold': 5,  # Failed logins per minute
    'certificate_expiry_warning': 30,      # Days before expiry
    'unusual_access_patterns': True,       # Detect anomalous behavior
    'config_changes': True,                # Alert on secret changes
}
```

#### Automated Monitoring
```bash
#!/bin/bash
# monitor-secrets.sh

# Check certificate expiry
find /etc/ssl/certs -name "*.pem" -exec openssl x509 -in {} -noout -dates \; | \
  awk '/notAfter/ { 
    cmd = "date -d \"" substr($0, index($0, "=") + 1) "\" +%s";
    cmd | getline expiry;
    close(cmd);
    now = systime();
    days = (expiry - now) / 86400;
    if (days < 30) print "Certificate expires in " days " days: " FILENAME
  }'

# Check environment variables
python3 -c "
import os
required = ['DATABASE_URL', 'JWT_SECRET_KEY', 'SECRET_KEY']
missing = [var for var in required if not os.getenv(var)]
if missing:
    print('Missing environment variables:', missing)
    exit(1)
print('All required environment variables are set')
"
```

## Compliance and Auditing

### 1. Regulatory Requirements

#### Data Protection Compliance
- **GDPR**: Encryption of personal data at rest and in transit
- **HIPAA**: Secure handling of health-related sensor data
- **SOX**: Financial data protection and audit trails
- **Industry Standards**: IEC 62443 for industrial automation security

#### Audit Documentation
- Secret management procedures and policies
- Access control matrices and role definitions
- Incident response plans and procedures
- Regular security assessments and penetration testing

### 2. Continuous Improvement

#### Regular Security Reviews
- **Quarterly**: Secret rotation and access review
- **Annual**: Comprehensive security assessment
- **Ad-hoc**: Post-incident reviews and improvements
- **Continuous**: Automated security scanning and monitoring

#### Training and Awareness
- Developer training on secure coding practices
- Operations team training on secret management
- Security awareness for all team members
- Regular updates on emerging threats and best practices

## Tools and Resources

### Secret Management Tools
- **HashiCorp Vault**: Centralized secret management
- **AWS Secrets Manager**: Cloud-native secret storage
- **Azure Key Vault**: Microsoft cloud secret management
- **Google Secret Manager**: Google Cloud secret storage
- **Kubernetes Secrets**: Container orchestration secret management

### Security Testing Tools
- **TruffleHog**: Git repository secret scanning
- **GitLeaks**: SAST tool for detecting secrets
- **Detect-secrets**: Pre-commit hook for secret detection
- **OWASP ZAP**: Web application security testing
- **Bandit**: Python security linter

This comprehensive secret management approach ensures the security and integrity of the ThermaCore SCADA API while maintaining operational efficiency and regulatory compliance.