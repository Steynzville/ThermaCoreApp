# Testing, CI and coverage methodology

## Frontend

Use the pinned pnpm version and Node 24, then install with `pnpm install --frozen-lockfile`. Install Poppler's `pdftotext` (Ubuntu: `poppler-utils`) for tests that inspect actual generated PDFs.

```bash
pnpm test
pnpm run test:coverage:frontend
pnpm build
```

Vitest/V8 includes **all `src/**/*.{js,jsx}` files**, including unimported components, with the existing Vitest default exclusions and `src/setupTests.js` exclusion. Test utility/fixture source that falls inside that include also remains in the denominator. Do not compare an imported-files-only report with all-source coverage. Do not broaden exclusions, delete useful code or mock the behavior being measured to obtain a percentage.

The frontend line gate is **80%**. It was raised from 60% only after complete independent CI-equivalent runs passed on both branch defaults: Demo-App 81.17% (4542/5595 lines), main 81.32% (4550/5595 lines), 1,782 tests in 104 files each. Read `package.json` and `.github/workflows/frontend-coverage.yml` for the enforced value. Historical 90%+ claims used different/stale measurements and are not current evidence.

The CI-equivalent command uses `--pool=forks --maxWorkers=1 --coverage` with text, json-summary, json, lcov and html reporters. Exact line coverage is `total.lines.pct` in the fresh `coverage/coverage-summary.json`, not statements or a committed old artifact. Record passing test cases separately from assertions, skipped tests and test files. Do not edit sources during an active full run or run multiple writers against one coverage directory.

Tests use jsdom and Testing Library. `src/setupTests.js` rejects unmocked HTTP requests; mock the network/provider/device boundary deliberately. Preserve real UI interactions, tenant selection, calculations, report models and export libraries where those are the subject. Verify generated XLSX/DOCX archive content and PDF text for selected-unit isolation, not just a mocked download callback. Contract tests cannot certify external provider configuration or physical hardware response.

## Backend

From `backend`, with `requirements.txt` installed:

```bash
python -m pytest -v --tb=short --cov=app --cov-branch \
  --cov-report=json --cov-report=term --cov-config=.coveragerc
```

The backend workflow uses the Python 3.10 Docker image and PostgreSQL/TimescaleDB service. Its branch-aware `coverage.json` total combines statement and branch coverage; a local statement-only percentage is not comparable. The workflow enforces `--cov-fail-under=60`; preserve meaningful tests and measurement. It passes the conventional `.coveragerc` filename although no such file is tracked; do not invent additional exclusions. Isolated rate-limit fixtures prevent unrelated tests exhausting one shared limiter; rate-limit-specific tests still exercise 429 responses.

## Quality and security

```bash
pnpm lint
pnpm audit --prod
node scripts/check-security.js --build
# In the backend virtual environment:
ruff check backend
bandit -r backend/app -x backend/app/tests
pip-audit -r backend/requirements.txt
```

Inspect `.github/workflows/python-security.yml` for exact workflow flags and warning-only stages. Broad legacy formatting/lint findings remain distinct from test failures. A successful workflow is not a claim that every warning has been fixed. The build includes the repository artifact security check, which is a heuristic scanner, not a full penetration test. Record the optional OPC-UA advisory separately; do not suppress it or call the dependency vulnerability-free.

## Branch validation

Run complete suites, coverage and builds separately from the current Demo-App and main trees. Demo tests must exercise deterministic labelled fixtures and simulated local controls without requiring physical units; authentication remains real. Live tests must prove empty/error/offline responses never manufacture tenants, output metrics, alarms or successful hardware actions. Explicitly test provider configuration errors and gateway rejection/timeout contracts.

Keep validation tied to a commit and fresh artifacts. PR workflows provide review evidence; never merge automatically as part of validation. Historical results in restoration notes describe their original checkpoint only.

The documentation/test-quality pass added 57 tests across nine behavior/contract test files. See [Validation record](QUALITY_VALIDATION.md) for independently run checks and known warnings.
