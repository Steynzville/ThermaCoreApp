# Certificate Generation Deployment Guide

This guide explains how to deploy the ThermaCore backend with automatic certificate generation for MQTT and OPC-UA services.

## Overview

The application now includes an automatic certificate generation system that creates self-signed certificates during deployment. This ensures that TLS/SSL certificates are always available for MQTT and OPC-UA connections, both in development and production environments.

## Components

### 1. Certificate Generation Script (`backend/generate_certs.py`)

This script automatically generates self-signed certificates for:
- **MQTT certificates**: CA, client, and server trust certificates
- **OPC-UA certificates**: Client and trust certificates

The script generates certificates in two locations:
- `/tmp/` - For production deployment (ephemeral storage on Render)
- `certs/` - For local development (git-ignored)

### 2. Updated MQTT Service (`backend/app/services/mqtt_service.py`)

The MQTT service now:
- Checks for certificate existence before configuring TLS
- Logs certificate paths for debugging
- Handles missing certificates gracefully in development
- Enforces certificate requirements in production

### 3. Dependencies (`backend/requirements.txt`)

Added `pyopenssl>=23.2.0` for certificate generation.

## Deployment Instructions

### For Render Deployment

1. **Update Build Command**

   In your Render service settings, update the build command to:
   ```bash
   pip install pyopenssl && python backend/generate_certs.py && pip install -r backend/requirements.txt
   ```

2. **Environment Variables**

   The following environment variables should be set in Render:
   
   ```env
   # MQTT Configuration
   MQTT_BROKER_HOST=your-mqtt-broker-host
   MQTT_BROKER_PORT=8883
   MQTT_USERNAME=your-mqtt-username
   MQTT_PASSWORD=your-mqtt-password
   MQTT_USE_TLS=true
   MQTT_CA_CERTS=/tmp/ca.crt
   MQTT_CERT_FILE=/tmp/client.crt
   MQTT_KEY_FILE=/tmp/client.key
   
   # OPC-UA Configuration (if using OPC-UA)
   OPCUA_SERVER_URL=opc.tcp://your-opcua-server:4840
   OPCUA_USERNAME=your-opcua-username
   OPCUA_PASSWORD=your-opcua-password
   OPCUA_SECURITY_POLICY=Basic256Sha256
   OPCUA_SECURITY_MODE=SignAndEncrypt
   OPCUA_CERT_FILE=/tmp/opcua_cert.pem
   OPCUA_PRIVATE_KEY_FILE=/tmp/opcua_key.pem
   OPCUA_TRUST_CERT_FILE=/tmp/opcua_trust.pem
   ```

3. **Deploy**

   After updating the build command and environment variables, trigger a new deployment. You should see the following in your build logs:
   
   ```
   🔐 Generating MQTT and OPC-UA certificates...
   ✓ Generated certificate: /tmp/ca.crt
   ✓ Generated private key: /tmp/ca.key
   ✓ Generated certificate: /tmp/client.crt
   ✓ Generated private key: /tmp/client.key
   ...
   🎉 Successfully generated 9/9 certificate pairs
   ```

### For Local Development

1. **Install Dependencies**

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Generate Certificates**

   ```bash
   python generate_certs.py
   ```

3. **Update `.env` File**

   Create or update your `.env` file with certificate paths:
   
   ```env
   MQTT_USE_TLS=true
   MQTT_CA_CERTS=certs/ca.crt
   MQTT_CERT_FILE=certs/client.crt
   MQTT_KEY_FILE=certs/client.key
   ```

4. **Run the Application**

   ```bash
   python run.py
   ```

## Certificate Details

### Generated Certificates

All certificates are generated with the following properties:
- **Key Type**: RSA 2048-bit
- **Signature Algorithm**: SHA256
- **Validity Period**: 1 year
- **Organization**: ThermaCore, IoT Division
- **Common Name**: thermacore.local

### Certificate Files

| File | Purpose | Location (Production) | Location (Development) |
|------|---------|---------------------|---------------------|
| ca.crt | Certificate Authority | /tmp/ca.crt | certs/ca.crt |
| ca.key | CA Private Key | /tmp/ca.key | certs/ca.key |
| client.crt | MQTT Client Certificate | /tmp/client.crt | certs/client.crt |
| client.key | MQTT Client Key | /tmp/client.key | certs/client.key |
| client_cert.pem | Alternative Client Cert | /tmp/client_cert.pem | certs/client_cert.pem |
| client_key.pem | Alternative Client Key | /tmp/client_key.pem | certs/client_key.pem |
| server_trust.pem | Server Trust Certificate | /tmp/server_trust.pem | N/A |
| server_trust.key | Server Trust Key | /tmp/server_trust.key | N/A |
| opcua_cert.pem | OPC-UA Client Certificate | /tmp/opcua_cert.pem | N/A |
| opcua_key.pem | OPC-UA Client Key | /tmp/opcua_key.pem | N/A |
| opcua_trust.pem | OPC-UA Trust Certificate | /tmp/opcua_trust.pem | N/A |
| opcua_trust.key | OPC-UA Trust Key | /tmp/opcua_trust.key | N/A |

## Verification

### Test the Health Endpoint

After deployment, test the health endpoint to verify the application is running:

```bash
curl https://thermacoreapp-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-11T11:46:46Z"
}
```

### Check Logs

Monitor the deployment logs for certificate generation messages and MQTT connection status:

```
🔐 Generating MQTT and OPC-UA certificates...
✓ Generated certificate: /tmp/ca.crt
...
MQTT Certificate paths - CA: /tmp/ca.crt, Cert: /tmp/client.crt, Key: /tmp/client.key
MQTT certificates found, configuring TLS...
MQTT TLS enabled with production security hardening (certificates, hostname verification, secure ciphers)
```

## Troubleshooting

### Certificates Not Generated

If certificates are not being generated:

1. Verify the build command includes `python backend/generate_certs.py`
2. Check that `pyopenssl` is installed before running the script
3. Review build logs for any error messages

### MQTT Connection Fails

If MQTT connection fails:

1. Verify environment variables are set correctly
2. Check that certificate paths match the generated files
3. Ensure `MQTT_USE_TLS=true` is set
4. Verify the MQTT broker is accessible and accepts the certificates

### Certificate Validation Errors

If you see certificate validation errors:

1. Ensure the MQTT broker is configured to accept self-signed certificates
2. Check that the broker's certificate is trusted (for production, use proper CA-signed certificates)
3. Verify certificate files are not empty: `ls -lh /tmp/*.crt`

## Security Considerations

### Production Environment

- Self-signed certificates are suitable for development and testing
- For production, consider using proper CA-signed certificates
- Certificate rotation should be implemented (certificates expire after 1 year)
- Store production certificates securely (use Render secrets or environment variables)

### Development Environment

- Local certificates are git-ignored to prevent accidental commits
- Development mode allows running without TLS if certificates are missing
- Always use TLS in production environments

## Certificate Renewal

Since certificates expire after 1 year, you should:

1. **Automatic Renewal**: Redeploy the application to regenerate certificates
2. **Manual Renewal**: Run `python backend/generate_certs.py` locally or on the server
3. **Monitoring**: Set up monitoring to alert before certificate expiration

## Support

For issues or questions:
- Check the application logs for error messages
- Review the MQTT broker logs for connection issues
- Consult the main deployment documentation in `docs/Deployment_Instructions.md`
