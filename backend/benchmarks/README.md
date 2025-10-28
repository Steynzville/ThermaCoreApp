# Performance Benchmarks

This directory contains performance benchmark suites for the ThermaCore SCADA platform.

## Overview

The benchmark suites validate that the platform meets performance requirements across critical operations and protocol implementations.

## Benchmark Scripts

### 1. Protocol Performance Benchmarks

**File**: `protocol_performance.py`

**Purpose**: Validates performance of protocol operations including message processing, serialization, and registry lookups.

**Benchmarks**:
- Message Serialization (< 10ms)
- Message Deserialization (< 10ms)
- Protocol Registry Lookup (< 1ms)
- Message Validation (< 5ms)
- Complete Message Processing (< 50ms)
- Connection Establishment (< 200ms)
- Data Transformation (< 20ms)

**Usage**:
```bash
python protocol_performance.py
```

**Output**: `protocol_performance_results.json`

### 2. Critical Path Benchmarks

**File**: `critical_path_benchmark.py`

**Purpose**: Validates performance of critical system paths that directly impact user experience.

**Benchmarks**:
- User Authentication (< 100ms)
- Sensor Data Ingestion (< 50ms)
- Real-time Data Query (< 200ms)
- Alert Processing (< 100ms)
- Dashboard Data Aggregation (< 500ms)
- Multi-Unit Status Query (< 200ms)
- Data Export Preparation (< 300ms)

**Usage**:
```bash
python critical_path_benchmark.py
```

**Output**: `critical_path_results.json`

## Running All Benchmarks

To run both benchmark suites:

```bash
# Run protocol benchmarks
python protocol_performance.py

# Run critical path benchmarks
python critical_path_benchmark.py
```

Or use the enterprise validation script:

```bash
cd ../scripts
./run_enterprise_validation.sh
```

## Interpreting Results

Each benchmark reports:
- **Average**: Mean execution time
- **Median**: 50th percentile execution time
- **P95**: 95th percentile execution time (critical path only)
- **Min**: Fastest execution time
- **Max**: Slowest execution time
- **Std Dev**: Standard deviation
- **Status**: ✅ PASS or ❌ FAIL

### Success Criteria

A benchmark passes if:
1. **Average execution time is below target** (primary criterion)
2. **95th percentile (P95) is within 2x target** (for critical paths)
3. **Maximum execution time is reasonable** (no extreme outliers)

Benchmarks are evaluated primarily on average performance, as this represents typical system behavior. Occasional outliers are acceptable but are monitored to ensure they don't indicate underlying issues.

### Performance Targets

#### Protocol Performance
- **Message Processing**: < 50ms per message
- **Serialization/Deserialization**: < 10ms per operation
- **Registry Operations**: < 1ms per lookup
- **Connection Setup**: < 200ms

#### Critical Paths
- **Authentication**: < 100ms
- **Data Operations**: < 50ms for writes, < 200ms for reads
- **Alert Processing**: < 100ms
- **Dashboard Operations**: < 500ms

## Continuous Monitoring

The benchmark suites are integrated into:

1. **Performance Quality Gate**: `.github/workflows/performance-quality-gate.yml`
   - Runs on every PR and push to main
   - Daily scheduled runs

2. **Local Development**: 
   - Run before committing major changes
   - Run after performance optimizations
   - Compare results over time

## Troubleshooting

### Benchmark Failures

If benchmarks fail:

1. **Check System Load**: Ensure the system is not under heavy load
2. **Run Multiple Times**: Performance can vary; run 3-5 times to confirm
3. **Review Changes**: Identify recent code changes that may impact performance
4. **Profile Code**: Use profiling tools to identify bottlenecks

### Unusually Fast Results

If results seem too fast (< 0.001ms):

- May indicate the operation is being cached or optimized away
- Ensure benchmarks are testing actual operations
- Consider adding more realistic test data

### Inconsistent Results

High standard deviation indicates inconsistent performance:

- May be due to system load variations
- Consider running benchmarks in isolated environment
- Review for race conditions or resource contention

## Contributing

When adding new benchmarks:

1. Follow the existing patterns in the benchmark files
2. Set realistic performance targets based on requirements
3. Include appropriate test data and scenarios
4. Document the benchmark in this README
5. Update the enterprise validation script if needed

## Related Documentation

- [Testing Guide](../../docs/OPERATIONS/TESTING.md)
- [Enterprise Readiness Report](../../docs/OPERATIONS/ENTERPRISE_READINESS_REPORT.md)
- [Production Readiness Script](../scripts/production_readiness.py)
- [Static Analysis Suite](../scripts/static_analysis_suite.py)
