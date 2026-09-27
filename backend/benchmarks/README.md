# Performance benchmarks

`protocol_performance.py` and `critical_path_benchmark.py` are local benchmark harnesses. Inspect their synthetic/test operations and initialization before running in a disposable environment:

```bash
cd backend/benchmarks
python protocol_performance.py
python critical_path_benchmark.py
```

The scripts produce `protocol_performance_results.json` and `critical_path_results.json`. Their in-script thresholds are benchmark targets, not measured deployment SLAs. Record machine/runtime, dataset, repetitions, load and whether real network/database/hardware boundaries were involved. Mock/simulator timing cannot establish sensor-to-browser or actuator latency.

There is no tracked `performance-quality-gate.yml` workflow. These benchmarks are not part of the current three frontend/backend/Python-quality PR workflows. Use [Testing](../../docs/TESTING.md) for actual CI commands. Investigate outliers, caching and unrealistically fast operations before presenting averages or percentiles as product evidence. Production scale and latency require an explicitly commissioned load/hardware test.
