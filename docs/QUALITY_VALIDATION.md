# Documentation and test-quality validation

The application implementation and environment/data-mode defaults are unchanged by this pass. Work began from merged Demo-App `72d79ec2` and main `f214c5f6`; shared documentation/test stages were applied through separate working branches, not a wholesale branch synchronization.

## Independent local runs

| Check | Demo-App | main |
|---|---|---|
| Frontend complete suite | 1,782 passed, 104 files | 1,782 passed, 104 files |
| All-source frontend lines | **81.17% (4542/5595)** | **81.32% (4550/5595)** |
| Frontend statements | 79.89% | 80.00% |
| Backend complete suite | 1,402 passed, 12 skipped | 1,402 passed, 12 skipped |
| Backend branch-aware coverage, local Python 3.12 | 84.38% | 84.37% |
| Production frontend build + artifact security check | Passed | Passed |
| Production frontend dependency audit | Zero advisories | Zero advisories |
| Backend dependency audit | Optional OPC-UA advisory remains | Optional OPC-UA advisory remains |
| Bandit with existing workflow configuration | Five LOW, zero MEDIUM/HIGH | Five LOW, zero MEDIUM/HIGH |
| Full Ruff check | 654 existing findings | 654 existing findings |
| Full Biome check | 221 errors, 156 warnings | 221 errors, 156 warnings |

Frontend runs used Node 24/pnpm 11.25.0, fork pool, one worker, all CI coverage reporters, and independent output directories. The 80% **line** threshold was changed only after both complete runs exceeded it. Statements are shown separately to avoid conflating coverage metrics. The all-source include/exclusion configuration and denominator were not changed.

Backend runs used `--cov=app --cov-branch --cov-fail-under=60 --cov-config=.coveragerc`. Python 3.10 container/PostgreSQL GitHub results may differ from local Python 3.12 instrumentation; compare like-for-like runtime/branch-aware artifacts. No backend executable source, backend tests, dependency versions or coverage configuration changed in this pass. Backend-only documentation was updated. Fresh PR workflow logs are the source of exact CI backend totals.

Both builds retain the existing >500 kB chunk warning. Full repository lint is not clean and was not weakened or presented as clean. New test files pass targeted Biome checks. The Python quality workflow contains warning-only stages; its success is distinct from zero findings. The remaining dependency warning is `opcua==0.98.13`, PYSEC-2026-888 / CVE-2022-25304; no replacement/mock hardware behavior or audit suppression was added.

## New regression coverage

- Real advanced SCADA navigation, gauges, chart statistics/types/periods, process diagram mouse/touch/keyboard interactions, selected-unit calculations, unknown-model states and acknowledgement failures.
- OAuth secure-origin/configuration behavior, cryptographic browser verifier/challenge, one-use exchange/session cleanup, WebAuthn binary registration/assertion serialization and cancellation/rejection.
- Connected-account and passkey Settings password requirements, persistence calls, list refresh, failure and retry.
- Reports using the real configurator, permission-dependent sections, exact selected-unit query/model scoping for every format, schedule due/claim/completion/failure/resume and download cancellation after leaving.
- Live portfolio pagination, annual history chunks, command/condition pagination, gateway errors, no live fictional fallback and unchanged measured readings after acknowledged requests.
- Intentional deterministic demo output/history/control behavior and account-isolated demo schedules.
- Sales totals/growth and tenant changes with late responses; live/offline telemetry and socket-status behavior.
- Actual PDF font bytes, caching/failure/retry and CSV escaping; existing real XLSX/DOCX/PDF parsing and one-/multi-unit export tests remain intact.

The complete suites also retain login, tenant/role isolation, notifications, four-output activity, ordinary history, maintenance, exact-unit remote routing, account preferences and SCADA entitlement regressions. Tests replace external transport/browser-device boundaries where necessary, without pretending to commission physical hardware or external provider credentials.

## Documentation and delivery

All 21 original Markdown files were audited. Twenty were modified; the proprietary copyright notice was retained. Four current guides/records were added: architecture, testing methodology, the [file-by-file audit](DOCUMENTATION_AUDIT.md) and this record. Local Markdown links and whitespace checks pass on both branches. Shared documents match; README introductions correctly distinguish each branch.

Demo-App retains explicit demo defaults. main retains explicit live defaults and tested absence of fictional telemetry/tenant/hardware-success fallback. Google/Apple credentials/callbacks, WebAuthn RP/origin, SendGrid sender/key, actual brokers/sensors, authenticated gateways, camera streams and process topology remain external deployment requirements described in [Deployment](DEPLOYMENT_GUIDE.md).

Review PRs target Demo-App and main separately. No merge is performed by this task. Use the PR head SHA and fresh GitHub frontend/backend/Python-security workflow artifacts for final review status.
