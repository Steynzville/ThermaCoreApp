# Repository scripts

The tracked script here is `check-security.js`. `pnpm build` runs it after Vite builds `dist`:

```bash
node scripts/check-security.js --build
```

It scans source/build text for configured sensitive-pattern and build issues. It is a heuristic check, not certificate validation, an authentication integration test or a substitute for dependency/static security analysis. Read the implementation and [Testing](../docs/TESTING.md) for its scope.

Older documentation listed `diagnose-api-endpoints.sh`, `debug-security.js` and `test-security-guards.js`; those scripts are not present here. Historical Python diagnostics are under [dev_tools](../dev_tools/README.md). Prefer the current automated suites and sanitized browser/API request evidence to scripts that accept passwords as command-line arguments.
