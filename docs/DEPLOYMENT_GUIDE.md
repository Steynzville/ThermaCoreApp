# Deployment guide

## Branch and runtime choices

Deploy `Demo-App` only as an explicitly labelled demonstration. Deploy `main` for live operation. `src/config/deployment.json`, `.env.example` and `netlify.toml` preserve their branch-specific frontend defaults; `VITE_DATA_MODE=demo|live` is an explicit build-time override. Backend `DEMO_DATA_ENABLED=false` is the production default on both branches. Never enable a simulator to conceal an unavailable live integration.

Use Node 24, pnpm 11.25.0 and the frozen `pnpm-lock.yaml`. The backend Docker image and CI use Python 3.10. Install `backend/requirements.txt`; provision PostgreSQL and back up an existing database before startup migrations. TimescaleDB is useful where supported, but do not assume a hosted PostgreSQL provider includes its extension. The ORM and current historical queries do not require a fictional Drizzle migration command.

## Backend

The Render blueprint uses `rootDir: backend`, `pip install -r requirements.txt`, `/health` and:

```bash
gunicorn --worker-class gthread --workers 1 --threads 20 run:app --bind 0.0.0.0:$PORT
```

Alternatively build `backend/Dockerfile` with `backend` as the build context; it binds port 5000 and runs as `appuser`. Keep one worker because Socket.IO authorization/subscriptions are process-local. A load-balanced multiworker deployment requires additional architecture and validation.

`run.py` creates tables and seeds roles/permissions; `app/utils/auto_migration.py` applies additive compatibility changes, including account, maintenance, condition, entitlement and control/report records. Review both against the target schema in staging, preserve data and inspect startup errors. `create_all` alone is not a general schema migration system. Do not blindly execute historical SQL seed scripts: they include old demonstration/default-account behavior.

| Configuration | Actual purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection; use the provider's TLS requirements |
| `SECRET_KEY`, `JWT_SECRET_KEY` | Independent secret values, never frontend variables |
| `DEFAULT_ADMIN_PASSWORD` | Initial `Steyn_Admin` bootstrap password; change after provisioning; does not reset an existing account |
| `FLASK_ENV=production`, `DEBUG=false`, `PORT` | Production environment and process binding |
| `CORS_ORIGINS` | Comma-separated exact frontend origins |
| `WEBSOCKET_CORS_ORIGINS` | Socket.IO origins; production rejects wildcard and non-HTTPS origins |
| `DEMO_DATA_ENABLED` | Backend simulators/demo seed opt-in; false for live |
| `DEMO_CLIENT_ADMIN_PASSWORD` | At least 12 characters, only for deliberately enabled demo seeding |
| `REDIS_URL`, `RATE_LIMIT_ENABLED`, `DEFAULT_RATE_LIMIT`, `AUTH_RATE_LIMIT` | Optional shared rate-limit storage and rate-limit configuration |
| `JWT_ACCESS_TOKEN_EXPIRES` | Base config parses this value as **hours**, not seconds; login flows also set explicit lifetimes |

Do not copy the historical `JWT_ACCESS_TOKEN_EXPIRES=3600` example as though it meant seconds. Authentication returns bearer tokens in JSON; the application is not a cookie-only session implementation.

## Frontend

```bash
pnpm install --frozen-lockfile
pnpm build
```

Publish `dist` (Netlify is configured in `netlify.toml`) with SPA rewrites to `/index.html`. Set `VITE_API_BASE_URL=https://your-api.example` and the correct `VITE_DATA_MODE` before building. Socket.IO uses this API origin with `/socket.io`; `VITE_WS_URL` is not used by the current client. Changing environment after a static build does not rewrite bundled values. Configure HTTPS, restrictive CORS and deployment headers for the actual domains.

The root Docker Compose frontend service contains legacy build paths/environment names and is not the recommended frontend deployment. CI removes that service for backend container tests. Do not mistake those tests for a successful complete Compose frontend deployment.

## Google and Apple sign-in

Configure the following on the backend, with exact callback URLs registered at the provider:

| Variable | Value |
|---|---|
| `AUTH_FRONTEND_URL` | HTTPS application origin used for login completion |
| `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET` | Google web OAuth application credentials |
| `OAUTH_GOOGLE_REDIRECT_URI` | `https://your-api.example/api/v1/auth/oauth/google/callback` |
| `OAUTH_APPLE_CLIENT_ID` | Apple Services ID for the web application |
| `OAUTH_APPLE_CLIENT_SECRET` | Valid signed Apple client-secret JWT; rotate before expiry |
| `OAUTH_APPLE_REDIRECT_URI` | `https://your-api.example/api/v1/auth/oauth/apple/callback` |

Google uses PKCE; Apple returns through a `form_post` callback. The application validates provider signatures/issuer/audience/nonce and exchanges a short-lived single-use browser-bound ticket; application JWTs are not put in callback URLs. Existing approved users link providers in Settings using their current password. A matching email is not sufficient to link an account. Missing/invalid configuration must remain an explicit error, including in demo mode.

## Passkeys and email

Set `WEBAUTHN_RP_ID` to the application hostname (no scheme/path) and `WEBAUTHN_ORIGIN` to the exact HTTPS frontend origin. Localhost HTTP is a development exception. Browser/device WebAuthn support and user verification are required. Registration and deletion require the current account password; challenges are single-use. Changing the RP ID affects existing credentials and needs a planned migration.

Password-reset delivery uses **SendGrid**, with `SENDGRID_API_KEY`, a verified `EMAIL_FROM` sender and `FRONTEND_URL` for reset links. Legacy SMTP fields are not the current reset route's delivery configuration. Missing delivery config returns an explicit service-unavailable response without inventing an email send. Provider credentials, DNS/sender verification and delivery are external deployment responsibilities.

## Telemetry and hardware

MQTT: `MQTT_BROKER_HOST`, `MQTT_BROKER_PORT`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_CLIENT_ID`, `MQTT_KEEPALIVE`, `MQTT_USE_TLS`, `MQTT_CA_CERTS`, `MQTT_CERT_FILE`, `MQTT_KEY_FILE`.

OPC-UA: `OPCUA_SERVER_URL`, `OPCUA_USERNAME`, `OPCUA_PASSWORD`, `OPCUA_SECURITY_POLICY`, `OPCUA_SECURITY_MODE`, `OPCUA_CERT_FILE`, `OPCUA_PRIVATE_KEY_FILE`, `OPCUA_TRUST_CERT_FILE`, `OPCUA_TIMEOUT`. Production configuration enforces MQTT certificate paths and secured OPC-UA certificate paths; do not assume disabling an optional service bypasses configuration validation. Production OPC-UA is optional (`SERVICE_OPCUA_REQUIRED=false` default), while MQTT is required by default. Review `SERVICE_MQTT_ENABLED/REQUIRED` and `SERVICE_OPCUA_ENABLED/REQUIRED` for the intended installation. Use trusted, provisioned certificates; generated development certificates are not automatically trusted by hardware.

Configure actual unit ownership, sensor/channel identifiers, units and thresholds. Do not claim Modbus/DNP3 simulator services are live adapters. The optional `opcua==0.98.13` advisory remains outstanding; see [Security](SECURITY_INCIDENT_RESPONSE.md).

`UNIT_CONTROL_GATEWAYS` is server-side JSON keyed by unit ID:

```json
{"UNIT-ID":{"url":"https://gateway.example/commands","token":"SECRET_FROM_SECRET_STORE","limits":{"powerSetpoint":25,"waterSetpoint":10},"operation_modes":["Balanced"],"water_trigger_percent":25}}
```

Setpoints are kW and L/h, not percentages. Use installation-specific limits/mode names. Require the bearer token at the gateway; never publish it in frontend configuration. The gateway receives `{command_id, unit_id, controls}` and `Idempotency-Key`, and must return `{command_id, acknowledged: true, controls}` with exact matching values. It must enforce physical interlocks independently. Timeouts are not automatically retried; verify physical state first.

`UNIT_CAMERA_FEEDS` is JSON such as `{"UNIT-ID":[{"id":"external","name":"External camera","url":"https://camera.example/stream","resolution":"1080p","fps":25}]}`. Only HTTPS URLs without embedded credentials are exposed. Configure stream authorization, compatible playback, CORS and expiring URLs as needed; the application does not provide a camera proxy/transcoder.

`UNIT_PROCESS_DIAGRAMS` is per-unit JSON with `nodes` (`id`, `label`, `icon`, `x`, `y`, `field`, `unit`) and `connections` (`id`, `from`, `to`). Coordinates must be finite 0–2000 and fields must be in the allowlist in `process_diagrams.py`. Configure actual topology; demo diagrams are illustrative.

## Release verification

Run the complete [validation commands](TESTING.md) independently for each branch. Verify HTTPS login and `/auth/me`, correct tenant portfolios, missing-data states, a real recorded telemetry sample, scoped Socket.IO delivery and gateway rejection/acknowledgement in an authorized staging installation. Verify main has no fictional fallback on API failure. Verify Demo-App remains labelled and can demonstrate outputs without hardware. Test real providers/cameras/gateways when credentials and equipment are supplied; contract tests alone do not establish commissioning.

Backups, monitoring, certificates, provider secrets, camera access and hardware safety are deployment-owned. No repository workflow guarantees a hosting provider will wait for PR checks before deploying; configure deployment gates explicitly.
