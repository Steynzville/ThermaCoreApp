# ThermaCore backend

Flask, SQLAlchemy, JWT authorization and authenticated Socket.IO provide tenant-scoped recorded data and acknowledged controls. Python 3.10+ is required; the Docker image/CI use 3.10. Dependencies are pinned in `requirements.txt`.

From this directory, create a virtual environment, install `requirements.txt`, configure a disposable PostgreSQL database and the required environment, then run `PORT=5000 FLASK_ENV=development python run.py`. See [Developer onboarding](../docs/DEVELOPER_ONBOARDING.md) for full setup and [Deployment](../docs/DEPLOYMENT_GUIDE.md) for production constraints. The production entry point is `run:app`, one Gunicorn gthread worker with 20 threads.

Startup initializes roles/permissions/tables and applies additive compatibility migrations. Supply an initial `DEFAULT_ADMIN_PASSWORD` securely; there is no recommended `admin/admin123` login. Historical SQL seeds and `flask init-db` are not a safe live provisioning recipe. No fictional live portfolio is seeded by default; backend simulation requires explicit `DEMO_DATA_ENABLED` opt-in.

## Source and contracts

- `app/routes/auth.py`, `external_auth.py`, `passkeys.py`: password, provider and WebAuthn authentication.
- `app/middleware/tenant.py`, `authorization.py`, `entitlements.py`: independent ownership, permissions and premium access checks.
- `app/routes/units.py`, `portfolio.py`: assets, historical aggregation, conditions, maintenance, report schedules, sales and entitlements.
- `app/routes/account.py`: own profile/preferences and securely processed avatar uploads.
- `app/services/unit_outputs.py`, `portfolio_history.py`, `unit_history.py`: four useful output channels and recorded historical metrics.
- `app/services/unit_controls.py`: configured HTTPS command acknowledgement and safe public control/camera metadata.
- `app/services/websocket_service.py`: authenticated scoped delivery; process-local state.

See the [API reference](../docs/API_REFERENCE.md), [architecture](../docs/ARCHITECTURE_AND_INTEGRATIONS.md) and [portfolio methodology](../docs/PORTFOLIO_DATA_AND_REPORTING.md). Generated/legacy route docstrings may not cover all current contracts; do not treat an old Swagger example as proof of behavior.

## Tests and operations

```bash
python -m pytest --cov=app --cov-branch --cov-report=json --cov-report=term --cov-fail-under=60
```

Follow [Testing](../docs/TESTING.md) for CI-equivalent flags and fresh coverage interpretation. A `/health` response indicates service reachability, not commissioned hardware or current test results. See [Troubleshooting](../docs/TROUBLESHOOTING.md) and [Security response](../docs/SECURITY_INCIDENT_RESPONSE.md), including the outstanding optional OPC-UA dependency advisory.

This repository is proprietary; the root copyright notice applies. Historical MIT-license claims in earlier backend documentation were incorrect.
