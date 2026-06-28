# ThermaCore Integrated SCADA: Troubleshooting Guide
## Operational Diagnostics and Disaster Recovery Manual for Field Engineers

This guide outlines diagnostic procedures, error resolutions, and mitigation checklists for maintaining the ThermaCore SCADA Platform alongside our deployed Modular Power & Water Generators.

---

## 1. Quick Diagnostic Flowchart

If the SCADA interface displays an outage, follow this triaging order:

```
                  Telemetry/Control Interruption
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
 [ Web Portal Down? ]                      [ No Telemetry stream? ]
          │                                           │
  Check Render logs,                          Check physical Edge
 Netlify SSL, CDN, CORS                      Gateway, mTLS Certs,
          │                                   and OPC-UA connection
          ▼                                           ▼
      [RESOLVED]                                  [RESOLVED]
```

---

## 2. Common API and WebSocket Outages

### 2.1 WebSockets (Socket.io) Disconnections
* **Symptom**: Sensor graphs freeze, or the status indicator in the top-right corner switches to `🔴 DISCONNECTED`.
* **Root Causes**:
  * The reverse proxy dropped the persistent TCP handshake.
  * HMR or network noise interrupted the local socket lifecycle.
* **Resolution Steps**:
  1. Inspect browser console for WebSocket transport errors (`ERR_CONNECTION_REFUSED`).
  2. Confirm the server binds to host `0.0.0.0` on port `3000` (required for container routing).
  3. Verify that the client is pointing to the correct secure WebSocket URI (`wss://<domain>`) in `.env` under `VITE_WS_URL`.
  4. Force a hard socket reconnection in the console:
     ```javascript
     window.socket.connect();
     ```

### 2.2 API Timeout (HTTP `504 Gateway Timeout`)
* **Symptom**: Operations like loading the user list or unit histories timeout.
* **Resolution Steps**:
  1. Check database CPU utilization on Neon. If CPU is at 100%, check for slow un-indexed queries on timeseries hyper-tables.
  2. Increase the Gunicorn/Uvicorn request timeout limit in the Docker execution command:
     ```bash
     gunicorn --timeout 120 -b 0.0.0.0:3000 server:app
     ```

---

## 3. Login, Token, & Authentication Failure

### 3.1 Token Expiry Loop
* **Symptom**: User logs in but is immediately logged out or receives constant redirection to the landing screen.
* **Resolution Steps**:
  1. Open browser DevTools -> Application -> Cookies. Ensure the `refresh_token` cookie is present.
  2. If missing, verify the cookie flags on the Flask/Express response:
     * `HttpOnly`: Must be `true`
     * `Secure`: Must be `true` (in production)
     * `SameSite`: Must be `Strict` (or `Lax` if crossing domains, but preferred `Strict` to mitigate CSRF).
  3. Ensure the server system time is synchronized via NTP. Out-of-sync system times will instantly expire freshly issued JWTs.

### 3.2 Password Reset Failures
* **Symptom**: Reset links are not generating, or the email service returns `500 Internal Server Error`.
* **Resolution Steps**:
  1. Confirm the SMTP credentials are set in the environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`).
  2. Verify that port 587 (TLS) or 465 (SSL) is open in the security group rules of the hosting VPC.

---

## 4. Edge Gateways, MQTT, & OPC-UA Connections

### 4.1 mTLS Handshake Failures
* **Symptom**: Edge devices fail to publish telemetry; the gateway reports certificate handshake rejections.
* **Resolution Steps**:
  1. Run `scripts/check-security.js` to ensure certificates are valid and not expired.
  2. Confirm the CA cert (`ca.crt`) matches between the client edge node and the backend MQTT broker:
     ```bash
     openssl verify -CAfile ca.crt client.crt
     ```
  3. Check the client log for the following cipher mismatch code: `SSL_ERROR_NO_CYPHER_OVERLAP`. Update the edge node to use the required cipher suite: `ECDHE-RSA-AES256-GCM-SHA384`.

### 4.2 OPC-UA Gateway Timeout
* **Symptom**: Modular generator water/power metrics show empty values or state flags remain frozen.
* **Resolution Steps**:
  1. Ping the physical PLC address from the Edge Gateway to confirm IP network visibility.
  2. Check OPC-UA endpoint configuration. Ensure security policy is set to `Basic256Sha256` with message security mode set to `SignAndEncrypt`.

---

## 5. Database Connection Failures (TimescaleDB / Neon)

### 5.1 Pool Exhaustion (`Too many connections`)
* **Symptom**: Application logs show database errors indicating connection pool exhaustion.
* **Resolution Steps**:
  1. Verify the maximum connections threshold in Neon.
  2. Tune the SQLAlchemy/Drizzle connection pool limit in your application settings:
     ```typescript
     // For Node/Drizzle:
     const db = drizzle(pool, { max: 20, idleTimeoutMillis: 30000 });
     ```
  3. Ensure all route handlers release their connection buffers back to the pool in a `finally` block or context manager.

---

## 6. Container & Deployment Health Checks

### 6.1 Diagnostic Log File Analysis
* **Render Container Logs**: Check standard system logs via the Render dashboard command terminal:
  ```bash
  tail -n 200 /var/log/thermacore/app.log
  ```
* **Docker Container Inspection**: Run diagnostic commands locally or in the sandbox container to check status:
  ```bash
  docker ps -a
  docker logs --tail 100 <container-id>
  docker inspect --format='{{json .State.Health}}' <container-id>
  ```

---

## 7. Diagnostic Error Code Reference

| Error Code | Class | Description | Corrective Action |
| :--- | :--- | :--- | :--- |
| **TC-101** | Auth | Ephemeral JWT expired or corrupt | Re-authenticate; clear local storage cookie caches. |
| **TC-202** | Telemetry | WebSocket handshake failure | Verify CORS origins in `server.ts` and check client `.env`. |
| **TC-303** | Command | Control signature invalid | Ensure the command payload has a valid timestamp and is cryptographically signed. |
| **TC-404** | Ingestion | OPC-UA endpoint unreachable | Confirm physical PLC network routing and security certificates. |
| **TC-505** | Database | TimescaleDB pool limit exceeded | Scale the Neon database connection pool and check for unreleased connections. |
```
