# Product and technical due-diligence briefing

This Markdown briefing describes current repository capabilities. It is not evidence of financial performance, market traction, certification or a commissioned installation.

## Product

The platform manages tenant-owned energy assets with four first-class useful outputs: electrical power, useful heat, useful chilling and AWG water where fitted. Dashboard, Units, notifications, Alerts, Alarms and ordinary Analytics use the same scoped portfolio. Unit History remains available without premium SCADA and supports longer ranges through bounded recorded-data queries. Maintenance records persist in live mode; Remote Management retains the exact selected unit and requires acknowledged device commands.

Premium SCADA is a distinct entitled area with visualization, gauges, trends, configured process flow, advanced conditions and performance/health/energy/advisory views. Missing measurements or validated models are shown as unavailable. Sales provides commercial records and charts separately from operating Analytics. Reports generate genuine XLSX, DOCX and PDF files with exact permitted selected-unit scope.

## Demonstration and live deployment

Demo-App uses clearly identified deterministic fictional portfolio/history/commercial data and simulated controls, without requiring physical units. main uses live backend defaults and does not fabricate telemetry on failure. Authentication, ownership and permission architecture are shared. Google/Apple, passkeys, password reset, camera feeds, hardware gateways and telemetry require their real external configuration.

## Commercial discussion

Equipment sales and recurring software services are potential commercial arrangements. Premium entitlement exists in code, but billing/prices, customer contracts, recurring revenue, support SLAs and market share must be established from separate business evidence. Do not infer actual sales from demonstration records or claim competitors lack equivalent capabilities without research.

Financial Analytics uses explicit editable AUD assumptions and recorded coverage. ROI/payback and diesel/emissions equivalents are conditional calculations, not promised savings. No verified +18.4% efficiency lift, 34.2% downtime reduction, equipment remaining-life model, autonomous tuning or hardware latency SLA is established by repository tests.

## Architecture and controls

React/Vite frontend; Flask/SQLAlchemy backend; PostgreSQL recorded data; authenticated Socket.IO delivery. Backend queries enforce role/permission and real client/tenant ownership. Premium entitlement is checked independently. OAuth verifies provider identity and browser-bound exchange; WebAuthn uses cryptographic credential verification. Settings updates are current-account-only and avatars are safely re-encoded.

Hardware commands require configured HTTPS gateway behavior and matching acknowledgement. The gateway must authenticate requests, enforce interlocks and adapt to physical protocols. An acknowledged request does not overwrite measured telemetry. Two-person approval, certified emergency-stop behavior and an immutable cryptographic compliance ledger are not implemented claims. The current Socket.IO deployment uses one threaded worker; larger scale needs additional shared-state architecture and load validation.

## Validation and open dependencies

Use fresh frontend all-source line coverage and backend branch-aware coverage artifacts from both branches, with the methodology in [Testing](TESTING.md). Historical percentages and test counts are not current evidence. A green warning-only quality workflow is not a zero-warning or zero-vulnerability claim. The optional `opcua==0.98.13` advisory is outstanding; see [Security](SECURITY_INCIDENT_RESPONSE.md).

Due diligence should include authorized hardware/gateway commissioning, sensor calibration/mapping, provider sign-in and email delivery, camera authorization, tenant isolation checks, restore drills and measured load/latency at the intended deployment. Backups and hosting deployment gates must be configured by the operator. Future offline buffering, additional fieldbus adapters, billing automation or predictive models should be described as proposed work until separately implemented and validated.

Supporting guides: [Architecture](ARCHITECTURE_AND_INTEGRATIONS.md), [Deployment](DEPLOYMENT_GUIDE.md), [Operator manual](OPERATOR_MANUAL.md), [API](API_REFERENCE.md), [Portfolio/reporting](PORTFOLIO_DATA_AND_REPORTING.md), [Feature matrix](FEATURE_COMPARISON_MATRIX.md).
