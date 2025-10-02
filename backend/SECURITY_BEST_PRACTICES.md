# ThermaCore SCADA API - Security Best Practices Guide

> **Last Reviewed**: October 2024  
> **Status**: Current and Accurate

## Overview

This guide provides comprehensive security best practices for the ThermaCore SCADA API, covering development, deployment, and operational security considerations. These practices complement the audit logging and secret management implementations in PR3.

## Development Security

### 1. Secure Coding Practices

#### Input Validation and Sanitization
```python
# Use Marshmallow schemas for all input validation
from marshmallow import Schema, fields, validate

class UnitCreateSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    serial_number = fields.Str(required=True, validate=validate.Regexp(r'^[A-Z0-9\-]+$'))
    location = fields.Str(validate=validate.Length(max=200))
    
    @validates('name')
    def validate_name(self, value):
        # Custom validation logic
        if not value or value.isspace():
            raise ValidationError('Name cannot be empty or whitespace')
```

#### SQL Injection Prevention
```python
# Always use SQLAlchemy ORM or parameterized queries
from sqlalchemy import text

# GOOD: Using ORM
units = Unit.query.filter_by(status=status).all()

# GOOD: Using parameterized query if raw SQL is needed
query = text("SELECT * FROM units WHERE status = :status")
result = db.session.execute(query, {'status': status})

# BAD: Never do this
# query = f"SELECT * FROM units WHERE status = '{status}'"  # SQL injection risk
```

#### Password Security
```python
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

# Strong password hashing
def set_password(self, password):
    # Validate password strength first
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    
    # Use bcrypt with work factor of 12+ for production
    self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

# Secure password generation
def generate_secure_password(length=16):
    """Generate cryptographically secure password."""
    alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))
```

### 2. Authentication and Authorization

#### JWT Token Security
```python
import jwt
from datetime import datetime, timedelta, timezone

class JWTManager:
    @staticmethod
    def create_secure_token(user_id, role=None, expires_in=3600):
        """Create JWT token with secure claims."""
        payload = {
            'user_id': str(user_id),
            'role': role,
            'iat': datetime.now(timezone.utc),
            'exp': datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            'jti': secrets.token_urlsafe(16)  # JWT ID for token blacklisting
        }
        
        return jwt.encode(
            payload, 
            current_app.config['JWT_SECRET_KEY'],
            algorithm='HS256'
        )
```

#### Session Security
```python
# Secure session configuration
app.config.update(
    SESSION_COOKIE_SECURE=True,        # HTTPS only
    SESSION_COOKIE_HTTPONLY=True,      # No JavaScript access
    SESSION_COOKIE_SAMESITE='Lax',     # CSRF protection
    PERMANENT_SESSION_LIFETIME=timedelta(hours=1)
)
```

### 3. Error Handling and Information Disclosure

#### Secure Error Responses
```python
from app.utils.error_handler import SecurityAwareErrorHandler

def secure_error_response(error, user_message="An error occurred"):
    """Return generic error message to users, log detailed info."""
    # Log detailed error for debugging
    logger.error(f"Application error: {str(error)}", exc_info=True)
    
    # Return generic message to user
    return SecurityAwareErrorHandler.handle_service_error(
        error, 'internal_error', user_message, 500
    )
```

#### Logging Security
```python
import re

class SecureLogger:
    # Patterns to redact from logs
    SENSITIVE_PATTERNS = [
        (re.compile(r'password["\']?\s*[:=]\s*["\']?([^"\'\s,}]+)', re.IGNORECASE), 'password=***'),
        (re.compile(r'token["\']?\s*[:=]\s*["\']?([^"\'\s,}]+)', re.IGNORECASE), 'token=***'),
        (re.compile(r'api[_-]?key["\']?\s*[:=]\s*["\']?([^"\'\s,}]+)', re.IGNORECASE), 'api_key=***'),
    ]
    
    @classmethod
    def sanitize_log_message(cls, message):
        """Remove sensitive information from log messages."""
        for pattern, replacement in cls.SENSITIVE_PATTERNS:
            message = pattern.sub(replacement, message)
        return message
```

## Infrastructure Security

### 1. Network Security

#### HTTPS Enforcement
```python
from flask_talisman import Talisman

# Force HTTPS in production
if app.config['ENV'] == 'production':
    Talisman(
        app,
        force_https=True,
        strict_transport_security=True,
        content_security_policy={
            'default-src': "'self'",
            'script-src': "'self' 'unsafe-inline'",
            'style-src': "'self' 'unsafe-inline'"
        }
    )
```

#### Network Segmentation
```yaml
# Docker network configuration
version: '3.8'
services:
  api:
    networks:
      - api-network
      - database-network
    ports:
      - "5000:5000"  # Only expose API port
  
  database:
    networks:
      - database-network  # Isolated from public network
    # No external ports exposed

networks:
  api-network:
    driver: bridge
  database-network:
    driver: bridge
    internal: true  # No external access
```

### 2. Database Security

#### Connection Security
```python
# Secure database configuration
DATABASE_CONFIG = {
    'postgresql': {
        'sslmode': 'require',
        'sslcert': '/path/to/client.crt',
        'sslkey': '/path/to/client.key',
        'sslrootcert': '/path/to/ca.crt'
    }
}

# Connection string with SSL
DATABASE_URL = (
    "postgresql://user:pass@host:5432/db"
    "?sslmode=require&sslcert=client.crt&sslkey=client.key"
)
```

#### Database Access Controls
```sql
-- Create dedicated database user with minimal permissions
CREATE USER thermacore_api WITH PASSWORD 'secure_password_here';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE thermacore_db TO thermacore_api;
GRANT USAGE ON SCHEMA public TO thermacore_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO thermacore_api;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO thermacore_api;

-- Revoke dangerous permissions
REVOKE ALL ON SCHEMA public FROM public;
REVOKE CREATE ON SCHEMA public FROM thermacore_api;
```

### 3. Container Security

#### Dockerfile Security
```dockerfile
# Use non-root user
FROM python:3.11-slim

# Create non-root user
RUN groupadd -r thermacore && useradd -r -g thermacore thermacore

# Install dependencies as root
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY --chown=thermacore:thermacore . /app
WORKDIR /app

# Switch to non-root user
USER thermacore

# Run application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "wsgi:app"]
```

#### Container Runtime Security
```yaml
# docker-compose.yml with security settings
version: '3.8'
services:
  api:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Only if binding to port 80/443
```

## Operational Security

### 1. Monitoring and Alerting

#### Security Event Monitoring
```python
# Security monitoring configuration
SECURITY_ALERTS = {
    'failed_login_threshold': 5,      # Failed logins per IP per hour
    'permission_denied_threshold': 10, # Permission denials per user per hour
    'unusual_access_patterns': True,   # ML-based anomaly detection
    'admin_actions': True,             # Alert on all admin actions
    'configuration_changes': True,     # Alert on system config changes
}

def check_security_thresholds():
    """Monitor for security threshold violations."""
    from app.middleware.audit import AuditLogger
    
    # Check for excessive failed logins
    recent_failures = get_recent_login_failures(hours=1)
    for ip, count in recent_failures.items():
        if count >= SECURITY_ALERTS['failed_login_threshold']:
            send_security_alert(
                f"Multiple login failures from IP {ip}: {count} attempts"
            )
```

#### Log Analysis and SIEM Integration
```python
import json
from datetime import datetime

class SIEMIntegration:
    """Integration with Security Information and Event Management systems."""
    
    @staticmethod
    def format_audit_event_for_siem(audit_record):
        """Format audit event for SIEM consumption."""
        return {
            'timestamp': audit_record['timestamp'],
            'source': 'thermacore-api',
            'event_type': audit_record['event_type'],
            'severity': audit_record['severity'],
            'user': audit_record['username'],
            'source_ip': audit_record['ip_address'],
            'action': audit_record['action'],
            'resource': audit_record['resource'],
            'outcome': audit_record['outcome'],
            'details': audit_record['details']
        }
    
    @staticmethod
    def send_to_siem(audit_record):
        """Send audit event to SIEM system."""
        siem_event = SIEMIntegration.format_audit_event_for_siem(audit_record)
        # Implementation would depend on SIEM system (Splunk, ELK, etc.)
        pass
```

### 2. Incident Response

#### Security Incident Playbook
```python
class IncidentResponse:
    """Security incident response procedures."""
    
    @staticmethod
    def handle_security_incident(incident_type, details):
        """Coordinate incident response."""
        incident_id = generate_incident_id()
        
        # Log incident
        logger.critical(
            f"Security incident {incident_id}: {incident_type}",
            extra={'incident_details': details}
        )
        
        # Immediate actions based on incident type
        if incident_type == 'brute_force_attack':
            IncidentResponse.block_suspicious_ips(details['ip_addresses'])
        elif incident_type == 'privilege_escalation':
            IncidentResponse.disable_affected_users(details['user_ids'])
        elif incident_type == 'data_breach':
            IncidentResponse.enable_enhanced_monitoring()
        
        # Notify incident response team
        send_incident_notification(incident_id, incident_type, details)
    
    @staticmethod
    def block_suspicious_ips(ip_addresses):
        """Block suspicious IP addresses."""
        for ip in ip_addresses:
            # Add to firewall/WAF block list
            add_to_blocklist(ip)
            logger.warning(f"Blocked suspicious IP: {ip}")
    
    @staticmethod
    def disable_affected_users(user_ids):
        """Disable potentially compromised user accounts."""
        for user_id in user_ids:
            user = User.query.get(user_id)
            if user:
                user.is_active = False
                db.session.commit()
                logger.warning(f"Disabled user account: {user.username}")
```

### 3. Compliance and Auditing

#### Regulatory Compliance
```python
class ComplianceManager:
    """Manage regulatory compliance requirements."""
    
    RETENTION_POLICIES = {
        'audit_logs': 2557,     # 7 years in days (SOX requirement)
        'access_logs': 1095,    # 3 years (GDPR requirement)
        'error_logs': 365,      # 1 year (operational requirement)
    }
    
    @staticmethod
    def ensure_log_retention():
        """Ensure logs are retained per compliance requirements."""
        current_time = datetime.now(timezone.utc)
        
        for log_type, retention_days in ComplianceManager.RETENTION_POLICIES.items():
            cutoff_date = current_time - timedelta(days=retention_days)
            
            # Archive old logs
            ComplianceManager.archive_old_logs(log_type, cutoff_date)
    
    @staticmethod
    def generate_compliance_report(start_date, end_date):
        """Generate compliance audit report."""
        return {
            'reporting_period': f"{start_date} to {end_date}",
            'total_audit_events': get_audit_event_count(start_date, end_date),
            'authentication_events': get_auth_event_summary(start_date, end_date),
            'authorization_failures': get_authz_failure_summary(start_date, end_date),
            'data_access_events': get_data_access_summary(start_date, end_date),
            'security_incidents': get_security_incidents(start_date, end_date)
        }
```

## Security Testing

### 1. Automated Security Testing

#### Security Test Suite
```python
import pytest
from unittest.mock import patch

class TestSecurityFeatures:
    """Automated security tests."""
    
    def test_password_strength_enforcement(self):
        """Test password complexity requirements."""
        user = User(username='test', email='test@example.com')
        
        # Test weak passwords are rejected
        with pytest.raises(ValueError):
            user.set_password('weak')
        
        # Test strong passwords are accepted
        user.set_password('StrongP@ssw0rd123')
        assert user.password_hash is not None
    
    def test_rate_limiting(self, client):
        """Test rate limiting prevents brute force attacks."""
        # Make multiple requests rapidly
        for _ in range(10):
            response = client.post('/api/v1/auth/login', json={
                'username': 'test',
                'password': 'wrong'
            })
        
        # Should be rate limited
        assert response.status_code == 429
    
    def test_sql_injection_prevention(self, client):
        """Test SQL injection prevention."""
        malicious_input = "'; DROP TABLE users; --"
        
        response = client.get(f'/api/v1/users?search={malicious_input}')
        
        # Should not cause database error
        assert response.status_code in [200, 400]  # Normal response or validation error
    
    def test_audit_logging_coverage(self, client):
        """Test that all security-relevant actions are audited."""
        with patch('app.middleware.audit.AuditLogger.log_event') as mock_audit:
            # Perform various operations
            client.post('/api/v1/auth/login', json={'username': 'test', 'password': 'test'})
            
            # Verify audit logging was called
            assert mock_audit.called
```

### 2. Penetration Testing Guidelines

#### Security Assessment Checklist
- [ ] Authentication bypass attempts
- [ ] Authorization boundary testing  
- [ ] Input validation and injection testing
- [ ] Session management security
- [ ] Error handling and information disclosure
- [ ] Rate limiting and DoS protection
- [ ] API security (OWASP API Top 10)
- [ ] Infrastructure security assessment

## Deployment Security Checklist

### Production Deployment
- [ ] All secrets stored in secure secret management system
- [ ] HTTPS enforced with valid TLS certificates
- [ ] Database connections encrypted with SSL/TLS
- [ ] Network segmentation implemented
- [ ] Monitoring and alerting configured
- [ ] Backup and disaster recovery procedures tested
- [ ] Security patches and updates current
- [ ] Audit logging enabled and configured
- [ ] Rate limiting and DDoS protection active
- [ ] Security headers configured
- [ ] Error pages don't expose sensitive information
- [ ] Default credentials changed
- [ ] Unnecessary services disabled
- [ ] File permissions properly configured
- [ ] Security scanning tools integrated into CI/CD

### Security Maintenance
- [ ] Regular security assessments and penetration testing
- [ ] Vulnerability scanning and patch management
- [ ] Security awareness training for development team
- [ ] Incident response procedures documented and tested
- [ ] Compliance audits and reporting
- [ ] Security metrics monitoring and analysis
- [ ] Third-party security assessments
- [ ] Business continuity and disaster recovery testing

This comprehensive security guide ensures the ThermaCore SCADA API maintains enterprise-grade security throughout its lifecycle, from development to production operations.