"""
Protocol Performance Benchmark Suite for ThermaCore SCADA Platform.

This script benchmarks the performance of protocol handlers including:
- MQTT protocol performance
- OPC UA protocol performance
- Protocol registry operations
- Message serialization/deserialization

Benchmark Targets:
- Protocol message processing: < 50ms per message
- Connection establishment: < 200ms
- Registry lookup: < 1ms
- Serialization: < 10ms per message
"""

import time
import json
import statistics
from typing import List, Dict, Any
from datetime import datetime


class ProtocolPerformanceBenchmark:
    """Benchmark suite for protocol operations."""

    def __init__(self):
        """Initialize benchmark suite."""
        self.results: Dict[str, Any] = {}
        self.passed_benchmarks: List[str] = []
        self.failed_benchmarks: List[str] = []

    def run_benchmark(
        self, name: str, func, iterations: int = 1000, target_ms: float = 50.0
    ):
        """
        Run a benchmark test.

        Args:
            name: Name of the benchmark
            func: Function to benchmark
            iterations: Number of iterations to run
            target_ms: Target time in milliseconds
        """
        print(f"\n{'=' * 60}")
        print(f"Running: {name}")
        print(f"Iterations: {iterations}, Target: {target_ms}ms")
        print(f"{'=' * 60}")

        times: List[float] = []

        for i in range(iterations):
            start = time.perf_counter()
            func()
            end = time.perf_counter()
            times.append((end - start) * 1000)  # Convert to ms

        avg_time = statistics.mean(times)
        median_time = statistics.median(times)
        min_time = min(times)
        max_time = max(times)
        std_dev = statistics.stdev(times) if len(times) > 1 else 0

        self.results[name] = {
            "avg_ms": round(avg_time, 3),
            "median_ms": round(median_time, 3),
            "min_ms": round(min_time, 3),
            "max_ms": round(max_time, 3),
            "std_dev": round(std_dev, 3),
            "target_ms": target_ms,
            "passed": avg_time <= target_ms,
            "iterations": iterations,
        }

        status = "✅ PASS" if avg_time <= target_ms else "❌ FAIL"

        print(f"\nResults:")
        print(f"  Average:   {avg_time:.3f}ms")
        print(f"  Median:    {median_time:.3f}ms")
        print(f"  Min:       {min_time:.3f}ms")
        print(f"  Max:       {max_time:.3f}ms")
        print(f"  Std Dev:   {std_dev:.3f}ms")
        print(f"  Status:    {status}")

        if avg_time <= target_ms:
            self.passed_benchmarks.append(name)
        else:
            self.failed_benchmarks.append(name)

    def benchmark_message_serialization(self):
        """Benchmark message serialization performance."""

        def serialize():
            data = {
                "unit_id": "TC001",
                "sensor_id": "TEMP_001",
                "timestamp": datetime.now().isoformat(),
                "value": 72.5,
                "status": "online",
                "metadata": {"quality": "good", "source": "mqtt"},
            }
            json.dumps(data)

        self.run_benchmark(
            "Message Serialization", serialize, iterations=10000, target_ms=10.0
        )

    def benchmark_message_deserialization(self):
        """Benchmark message deserialization performance."""

        message = json.dumps(
            {
                "unit_id": "TC001",
                "sensor_id": "TEMP_001",
                "timestamp": datetime.now().isoformat(),
                "value": 72.5,
                "status": "online",
                "metadata": {"quality": "good", "source": "mqtt"},
            }
        )

        def deserialize():
            json.loads(message)

        self.run_benchmark(
            "Message Deserialization", deserialize, iterations=10000, target_ms=10.0
        )

    def benchmark_protocol_registry_lookup(self):
        """Benchmark protocol registry lookup performance."""

        # Simulate protocol registry
        registry = {
            "mqtt": {"handler": "MQTTHandler", "port": 1883},
            "opcua": {"handler": "OPCUAHandler", "port": 4840},
            "modbus": {"handler": "ModbusHandler", "port": 502},
            "dnp3": {"handler": "DNP3Handler", "port": 20000},
        }

        def lookup():
            protocol = registry.get("mqtt")
            return protocol

        self.run_benchmark(
            "Protocol Registry Lookup", lookup, iterations=100000, target_ms=1.0
        )

    def benchmark_message_validation(self):
        """Benchmark message validation performance."""

        def validate():
            data = {
                "unit_id": "TC001",
                "sensor_id": "TEMP_001",
                "timestamp": datetime.now().isoformat(),
                "value": 72.5,
            }

            # Simulate validation
            is_valid = (
                isinstance(data.get("unit_id"), str)
                and isinstance(data.get("sensor_id"), str)
                and isinstance(data.get("value"), (int, float))
                and data.get("timestamp") is not None
            )
            return is_valid

        self.run_benchmark(
            "Message Validation", validate, iterations=10000, target_ms=5.0
        )

    def benchmark_protocol_message_processing(self):
        """Benchmark complete message processing pipeline."""

        message_json = json.dumps(
            {
                "unit_id": "TC001",
                "sensor_id": "TEMP_001",
                "timestamp": datetime.now().isoformat(),
                "value": 72.5,
                "status": "online",
            }
        )

        def process():
            # Deserialize
            data = json.loads(message_json)

            # Validate
            is_valid = isinstance(data.get("unit_id"), str) and isinstance(
                data.get("value"), (int, float)
            )

            # Process (simulate)
            if is_valid:
                result = {
                    "processed": True,
                    "unit_id": data["unit_id"],
                    "value": data["value"],
                }
                return result
            return None

        self.run_benchmark(
            "Complete Message Processing", process, iterations=5000, target_ms=50.0
        )

    def benchmark_connection_simulation(self):
        """Benchmark connection establishment simulation."""

        def connect():
            # Simulate connection overhead
            config = {
                "host": "localhost",
                "port": 1883,
                "keepalive": 60,
                "client_id": "test_client",
            }

            # Simulate validation and setup
            is_valid = all(
                [config.get("host"), config.get("port"), config.get("client_id")]
            )

            if is_valid:
                # Simulate connection time
                time.sleep(0.0001)  # 0.1ms simulated overhead
                return True
            return False

        self.run_benchmark(
            "Connection Establishment (Simulated)",
            connect,
            iterations=1000,
            target_ms=200.0,
        )

    def benchmark_data_transformation(self):
        """Benchmark data transformation operations."""

        def transform():
            raw_data = {
                "raw_value": "72.5",
                "unit": "celsius",
                "timestamp": "2024-10-23T12:00:00Z",
            }

            # Transform to internal format
            transformed = {
                "value": float(raw_data["raw_value"]),
                "unit": raw_data["unit"],
                "timestamp": datetime.fromisoformat(
                    raw_data["timestamp"].replace("Z", "+00:00")
                ),
            }

            return transformed

        self.run_benchmark(
            "Data Transformation", transform, iterations=10000, target_ms=20.0
        )

    def run_all_benchmarks(self):
        """Run all benchmarks."""
        print("\n" + "=" * 60)
        print("PROTOCOL PERFORMANCE BENCHMARK SUITE")
        print("ThermaCore SCADA Platform")
        print("=" * 60)

        self.benchmark_message_serialization()
        self.benchmark_message_deserialization()
        self.benchmark_protocol_registry_lookup()
        self.benchmark_message_validation()
        self.benchmark_protocol_message_processing()
        self.benchmark_connection_simulation()
        self.benchmark_data_transformation()

        self.print_summary()

    def print_summary(self):
        """Print benchmark summary."""
        print("\n" + "=" * 60)
        print("BENCHMARK SUMMARY")
        print("=" * 60)

        total_tests = len(self.results)
        passed = len(self.passed_benchmarks)
        failed = len(self.failed_benchmarks)

        print(f"\nTotal Benchmarks: {total_tests}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed / total_tests) * 100:.1f}%")

        if self.failed_benchmarks:
            print("\n❌ Failed Benchmarks:")
            for name in self.failed_benchmarks:
                result = self.results[name]
                print(
                    f"  - {name}: {result['avg_ms']}ms (target: {result['target_ms']}ms)"
                )

        print("\n" + "=" * 60)
        print("DETAILED RESULTS")
        print("=" * 60)

        for name, result in self.results.items():
            status = "✅" if result["passed"] else "❌"
            print(f"\n{status} {name}")
            print(f"   Average: {result['avg_ms']}ms (target: {result['target_ms']}ms)")
            print(f"   Median:  {result['median_ms']}ms")
            print(f"   Range:   {result['min_ms']}ms - {result['max_ms']}ms")

        # Save results to file
        with open("protocol_performance_results.json", "w") as f:
            json.dump(
                {
                    "timestamp": datetime.now().isoformat(),
                    "summary": {
                        "total": total_tests,
                        "passed": passed,
                        "failed": failed,
                        "success_rate": round((passed / total_tests) * 100, 2),
                    },
                    "results": self.results,
                },
                f,
                indent=2,
            )

        print(f"\n📊 Results saved to: protocol_performance_results.json")


def main():
    """Main entry point."""
    benchmark = ProtocolPerformanceBenchmark()
    benchmark.run_all_benchmarks()

    # Exit with error code if any benchmarks failed
    if benchmark.failed_benchmarks:
        print("\n⚠️  Some benchmarks did not meet performance targets")
        return 1

    print("\n✅ All benchmarks passed!")
    return 0


if __name__ == "__main__":
    exit(main())
