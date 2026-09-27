# Documentation audit

Reviewed against the current merged application on both Demo-App and main, starting at `72d79ec2` and `f214c5f6` respectively. This pass changes documentation and tests, not the restored product design. Branch-specific README descriptions retain demo/live defaults; shared behavior is documented consistently. The branch configuration itself is not overwritten.

## Inventory and disposition

Every tracked Markdown document present at the start of the pass is listed below. Historical logs remain explicitly historical; they are not normal operating instructions.

| File | Disposition | Code/evidence checked |
|---|---|---|
| `README.md` | Updated; branch-specific introduction | package.json, runtime/deployment config, routes, current workflows |
| `backend/README.md` | Updated | run.py, config.py, Dockerfile, routes/services, requirements |
| `backend/benchmarks/README.md` | Updated | Existing benchmark scripts; actual workflow inventory; synthetic timing limitations |
| `dev_tools/README.md` | Updated | Actual diagnostic_scripts inventory and historical scope |
| `scripts/README.md` | Updated | Actual check-security.js; removed references to absent scripts |
| `docs/API_REFERENCE.md` | Updated | auth/external_auth/passkeys/account/units/portfolio/remote_control routes and Socket.IO service |
| `docs/BACKUP_RECOVERY.md` | Updated | Models, startup migrations, browser-local demo persistence; absence of claimed cloud backup workflows |
| `docs/CHANGELOG.md` | Updated current entry and explicit historical boundary | Merged architecture and current routes; old entries retained as records |
| `docs/DEPLOYMENT_GUIDE.md` | Updated | Render/Netlify/Docker/Compose, runtime/env readers, bootstrap, gateways and providers |
| `docs/DEVELOPER_ONBOARDING.md` | Updated | Actual repository paths, runtimes, scripts and authorization model |
| `docs/FAQ.md` | Updated | Current screen/service behavior and external failure contracts |
| `docs/FEATURE_COMPARISON_MATRIX.md` | Updated | Implemented product/mode boundaries; removed unsupported competitive/performance claims |
| `docs/INVESTOR_DECK.md` | Updated | Product capabilities versus unverified commercial, hardware and certification claims |
| `docs/INVESTOR_SUMMARY.md` | Updated | Same evidence boundaries; current entitlement rather than invented billing tiers |
| `docs/OPERATOR_MANUAL.md` | Updated | Dashboard/notifications/condition views, output icons, history, maintenance, remote UI, Reports, SCADA, Sales, Settings |
| `docs/PORTFOLIO_DATA_AND_REPORTING.md` | Updated | UnitContext, runtime, unitService, portfolio_history, reportModel/export/schedule services |
| `docs/POST_267_RESTORATION.md` | Historical banner added; chronology retained | Merged restoration status; checkpoint figures explicitly non-current |
| `docs/SALES_DEMO_SCRIPT.md` | Updated | Explicit demo mode, actual screens and external commissioning boundaries |
| `docs/SECURITY_INCIDENT_RESPONSE.md` | Updated | Auth/storage, middleware, gateway ACK, upload validation, workflows and optional OPC-UA warning |
| `docs/TROUBLESHOOTING.md` | Updated | Actual configuration names, route/status behavior and missing-integration states |
| `docs/Copyright (c) 2026 ThermaCore Renewable Technologies Pty Ltd.md` | Reviewed and retained unchanged | Proprietary notice; conflicting old backend MIT claim removed |

Added current shared guides: `ARCHITECTURE_AND_INTEGRATIONS.md` and `TESTING.md`, plus this audit inventory and `QUALITY_VALIDATION.md` for reproducible verification evidence. No application source is excluded from coverage as part of this documentation audit.

## Corrections that matter operationally

Removed obsolete normal-guide claims about pressure proving an NH3 leak, automatic safety shutdown, two-person approval, percentage setpoints, fictional live tenant fallback, default public passwords, cookie-only sessions, SMTP reset delivery, arbitrary Socket.IO rooms, unattended report emailing, automatic cloud backups, non-existent scripts/workflows and unverified performance/coverage/certification figures.

Documented the actual four-output quality/activity contract, tenant/permission boundaries, exact report subsets, ten-year bounded ordinary history, persistent live maintenance, premium entitlement, browser-running report schedules, provider/passkey requirements, account preferences, live gateways/cameras/topology and the unpatched optional OPC-UA advisory.

## Validation method

Read each document and compare its operational claims with current configuration, route decorators, service/model logic and screen code. Check local Markdown targets and `git diff --check`. Use fresh independent frontend/backend suite, build and quality results for each branch; [Testing](TESTING.md) explains the coverage denominator and workflow limitations. Final review PRs supply commit-specific results, rather than freezing an unverifiable test badge into product documentation.
