# ThermaCoreApp

ThermaCoreApp monitors tenant-owned energy units, their electrical power, useful heat, useful chilling and AWG water outputs. The React application shares portfolio data across monitoring, ordinary Analytics, premium SCADA, operational events and real document exports. A Flask backend provides authentication, authorization, recorded telemetry and acknowledged hardware controls.

**This branch: main.** Its frontend defaults to live API data. `Demo-App` defaults to explicitly identified demonstration data. Both use the same security and application architecture. Demo telemetry is fictional and does not establish hardware performance. Authentication is real in both modes.

## Start here

Use Node 24 and pnpm 11.25.0 (the pinned package manager), plus Python 3.10 or later. From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Vite serves port 5173. Configure `VITE_API_BASE_URL` before building; it is also the Socket.IO origin. See [Developer onboarding](docs/DEVELOPER_ONBOARDING.md) for backend/database setup. Do not use historical seed passwords or production accounts in local diagnostics.

## Product and engineering documentation

| Guide | Purpose |
|---|---|
| [Operator manual](docs/OPERATOR_MANUAL.md) | Screens, outputs, history, maintenance, controls and account settings |
| [Architecture and integrations](docs/ARCHITECTURE_AND_INTEGRATIONS.md) | Ownership, permissions, demo/live boundaries and external systems |
| [API reference](docs/API_REFERENCE.md) | Implemented REST and Socket.IO contracts |
| [Portfolio and reporting](docs/PORTFOLIO_DATA_AND_REPORTING.md) | Metering, calculations and selected-unit exports |
| [Deployment](docs/DEPLOYMENT_GUIDE.md) | Runtime, environment, providers, gateways and rollout |
| [Developer onboarding](docs/DEVELOPER_ONBOARDING.md) | Local setup and source map |
| [Testing](docs/TESTING.md) | All-source coverage, CI and meaningful regression tests |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Configuration and operational failure diagnosis |
| [Backup and recovery](docs/BACKUP_RECOVERY.md) | Deployment-owned backups and restore validation |
| [Security response](docs/SECURITY_INCIDENT_RESPONSE.md) | Current controls, limitations and incident handling |
| [FAQ](docs/FAQ.md) | Common product questions |
| [Feature matrix](docs/FEATURE_COMPARISON_MATRIX.md) | Implemented capabilities and dependencies |
| [Sales demo](docs/SALES_DEMO_SCRIPT.md) | Honest demonstration walkthrough |
| [Investor summary](docs/INVESTOR_SUMMARY.md), [briefing](docs/INVESTOR_DECK.md) | Commercial discussion boundaries |
| [Changelog](docs/CHANGELOG.md) | Current changes and historical release notes |
| [Documentation audit](docs/DOCUMENTATION_AUDIT.md) | File-by-file review and code evidence |

Reports download genuine XLSX, DOCX or PDF files for the selected permitted units. Unit History is available without premium SCADA. Remote controls require backend permission, actual tenant ownership and a matching gateway acknowledgement; an acknowledgement is not proof of a physical state change.

## Validation

```bash
pnpm test
pnpm run test:coverage:frontend
pnpm build
cd backend
python -m pytest --cov=app --cov-branch --cov-config=.coveragerc
```

Use fresh workflow artifacts for exact test counts and coverage, not old badges or committed reports. The optional `opcua` dependency has a known outstanding advisory; see the security guide. Automated checks do not certify field hardware, financial outcomes or regulatory compliance.

This repository is proprietary to ThermaCore Renewable Technologies Pty Ltd. See the [copyright notice](docs/Copyright%20(c)%202026%20ThermaCore%20Renewable%20Technologies%20Pty%20Ltd.md).
