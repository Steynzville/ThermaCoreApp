# Historical development tools

`diagnostic_scripts/` contains earlier diagnostic, demonstration and validation scripts. They are not the current CI suite, deployment provisioning process or evidence of live hardware capability. Some scripts use historical endpoints, fixtures, account assumptions or command-line credentials; inspect source before any use and restrict them to an isolated disposable environment. Do not point them at production by default.

Examples include `diagnose_api_endpoints.py`, `diagnose_auth_issue.py`, `demo_service_manager.py`, `validate_pr2.py` and standalone `test_*.py` scripts. Their filenames describe historical development work; they do not override current API/security contracts.

Use [Developer onboarding](../docs/DEVELOPER_ONBOARDING.md), [API reference](../docs/API_REFERENCE.md), [Testing](../docs/TESTING.md) and [Troubleshooting](../docs/TROUBLESHOOTING.md) for current procedures. The authoritative regression suites are Vitest under `src` and Pytest under `backend/app/tests`. Do not count these historical scripts as additional passing production tests without actually running and validating their contracts.
