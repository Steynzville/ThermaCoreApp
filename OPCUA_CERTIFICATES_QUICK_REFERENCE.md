# OPC UA Certificates - Quick Reference

## The Three Required Certificate Environment Variables

When OPC UA security is enabled (`OPCUA_SECURITY_POLICY` and `OPCUA_SECURITY_MODE` are not "None"), you **MUST** set these three environment variables:

### 1. OPCUA_CERT_FILE
Path to client certificate file (PEM or DER format)
```bash
OPCUA_CERT_FILE=/etc/opcua/certs/client_cert.pem
```

### 2. OPCUA_PRIVATE_KEY_FILE
Path to client private key file (PEM or DER format)
```bash
OPCUA_PRIVATE_KEY_FILE=/etc/opcua/certs/client_key.pem
```

### 3. OPCUA_TRUST_CERT_FILE
Path to server certificate to trust (PEM or DER format)
```bash
OPCUA_TRUST_CERT_FILE=/etc/opcua/certs/server_trust_cert.pem
```

## Error Message
If these are not set when security is enabled, you'll see:
```
ValueError: OPC UA certificate paths must be set in environment variables when security is enabled
```

This error is raised in `backend/config.py` at line 219.

## Production Defaults
In production, if not explicitly set:
- `OPCUA_SECURITY_POLICY` defaults to `Basic256Sha256`
- `OPCUA_SECURITY_MODE` defaults to `SignAndEncrypt`

This means **certificates are required by default in production**.

## Full Documentation
For complete details, see [OPCUA_CERTIFICATE_ENVIRONMENT_VARIABLES.md](./OPCUA_CERTIFICATE_ENVIRONMENT_VARIABLES.md)
