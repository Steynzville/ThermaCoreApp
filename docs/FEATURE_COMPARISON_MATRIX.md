# Current capability matrix

This is a comparison of implemented product areas/modes, not an unsupported competitive benchmark. Hardware commissioning, credentials and commercial terms are external to repository code.

| Capability | Shared application | Demo-App default | main default / dependency |
|---|---|---|---|
| Tenant portfolio | Actual account/client/tenant identifiers; backend checks | Fictional fixture ownership explicitly labelled | Authenticated persisted ownership; no fictional fallback |
| Four outputs | Electrical power, useful heat, useful chill, AWG water; capability distinct from activity | Examples of different fitted/active outputs | Fresh GOOD measured channels required |
| Dashboard/notifications | Shared counts; alert/alarm colors and contextual destinations | Demonstration conditions | Recorded current conditions/events |
| Unit History | Machine/output graphs, daily long-range queries; no premium requirement | Deterministic requested-date history | Recorded GOOD samples, bounded queries |
| Maintenance | Permission and unit scope | Account/tenant/unit-local demonstration persistence | Backend maintenance records |
| Remote Management | Exact-unit routing and permission checks | Explicit simulated controls | HTTPS gateway authentication, configured limits/modes and exact ACK |
| Ordinary Analytics | Scoped operating/financial calculations and assumptions | Estimated demonstration production | Metered coverage; unsupported values unavailable |
| Premium SCADA | Separate views, protected routes/API entitlement | Illustrative topology and scoped demo metrics | Actual configured topology and bounded premium history |
| Sales | Commercial records and product/monthly charts | Illustrative records derived from permitted demo units | Persisted sale records; system-admin screen |
| Reports | Real XLSX/DOCX/PDF with exact selected-unit collections | Clearly labelled demo source | Real recorded data; no synthetic missing history |
| Report scheduling | Persisted configuration, pause/resume | Own browser storage | Own backend records; execution still requires open Reports page |
| Account settings | Persisted own profile/preferences/avatar | Real account API | Real account API |
| Google/Apple/passkeys | Real authenticated integration | No fake authentication | Provider credentials, HTTPS and WebAuthn RP/origin |
| Cameras | Configured media panels | No claim of real hardware feed | Authorized HTTPS browser-compatible stream |
| Field protocols | Real MQTT/OPC-UA integration architecture | Optional explicit legacy simulators | Configure secure adapters; Modbus/DNP3 simulators are blocked |

Not established by this repository: two-operator command approval, autonomous safety shutdown, guaranteed offline edge buffering/replay, unattended email reports, validated equipment remaining-life models, regulatory certification, competitor inferiority, field efficiency gains or latency SLAs. SCADA trend extrapolation is advisory; physical safety and commissioned gateway behavior remain installation responsibilities.

See [Architecture](ARCHITECTURE_AND_INTEGRATIONS.md), [Operator manual](OPERATOR_MANUAL.md), [Deployment](DEPLOYMENT_GUIDE.md) and [Testing](TESTING.md).
