# Developer onboarding

## Reproducible setup

Clone `https://github.com/Steynzville/ThermaCoreApp.git` and choose the appropriate branch: `Demo-App` for demonstrations, `main` for live defaults. Use Node 24 (supported range is >=20.19 and <25), pnpm 11.25.0 and Python 3.10+; CI uses Python 3.10. This is a JavaScript/JSX application, not a TypeScript project.

From the repository root:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

Set `VITE_API_BASE_URL=http://localhost:5000` for a local API. Vite runs on port 5173; there is no configured development API proxy. Frontend environment values are build-time public values. Never put provider or gateway secrets in `VITE_*` variables.

In a separate terminal:

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
# Supply backend environment as described in DEPLOYMENT_GUIDE.md.
PORT=5000 FLASK_ENV=development python run.py
```

Use a disposable PostgreSQL database with `DATABASE_URL`, independent strong `SECRET_KEY` and `JWT_SECRET_KEY`, appropriate CORS origins and an explicitly chosen `DEFAULT_ADMIN_PASSWORD` for initial bootstrap. `run.py` initializes tables/roles and a bootstrap administrator; startup logs must be checked for migration failures. The backend's direct-run default port is 10000, hence the explicit port above. Do not run legacy SQL seeds or `flask init-db` against production: historical seed data is not a current secure provisioning workflow.

Backend service configuration is independent of frontend demo mode. Configure required MQTT/OPC-UA services, or explicitly disable optional local integrations through their `SERVICE_*_ENABLED`/`SERVICE_*_REQUIRED` settings. A frontend demonstration does not simulate successful login or provider authentication. See [Deployment](DEPLOYMENT_GUIDE.md) for production validation constraints.

The root Compose file includes historical frontend build settings; use the native frontend commands above. Backend CI deliberately removes the frontend Compose service and validates the database/backend containers. Do not describe `docker compose up` as a validated full-stack production deployment without repairing and validating that deployment separately.

## Source map

| Area | Source |
|---|---|
| Runtime mode | `src/config/runtime.js`, `src/config/deployment.json` |
| Authentication/tenant/portfolio | `src/context/AuthContext.jsx`, `TenantContext.jsx`, `UnitContext.jsx` |
| Protected navigation | `src/config/routes.js`, `src/components/ProtectedRoute.jsx` |
| Portfolio normalization/calculations | `src/utils/portfolio.js`, `portfolioAnalytics.js`, `unitOutputs.js` |
| Reports | `src/services/portfolioReportService.js`, `reportExportService.js`, `src/utils/reportModel.js` |
| Backend ownership/authorization | `backend/app/middleware/tenant.py`, `authorization.py`, `entitlements.py` |
| Live contracts | `backend/app/routes/portfolio.py`, `remote_control.py`, `account.py` |
| Providers/passkeys | `backend/app/routes/external_auth.py`, `passkeys.py` |
| Ingestion, aggregation and controls | `backend/app/services/` |

Check actual role guards and permission decorators before extending a route. Never treat a tenant dropdown, email domain or array position as an authorization boundary. Shared providers clear prior-account state and reject stale asynchronous responses; preserve those protections.

## Development and review

Use [Testing](TESTING.md) for commands and coverage methodology. Add tests around observable behavior and failure contracts. Mock external boundaries when unavailable, but keep the calculation, authorization or UI behavior under test real. Do not weaken coverage measurement to pass a gate.

`pnpm lint` runs Biome; Python quality checks use Ruff and Bandit. Existing style debt means a green workflow does not prove a zero-warning repository. Inspect workflow logs and report material warnings. Avoid repository-wide formatting unrelated to the change.

Commit validated logical stages and push checkpoint branches regularly. Review changes through a PR against the intended base branch. Test both branch modes independently when changing shared behavior; preserve their explicit deployment defaults.
