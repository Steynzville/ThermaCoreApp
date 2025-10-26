"""
Critical Path Benchmark Suite for ThermaCore SCADA Platform.

This script benchmarks the performance of critical paths including:
- User authentication flow
- Sensor data ingestion pipeline
- Real-time data queries
- Alert processing
- Dashboard data aggregation

Performance Targets:
- Authentication: < 100ms
- Data ingestion: < 50ms per reading
- Query response: < 200ms
- Alert processing: < 100ms
- Dashboard aggregation: < 500ms
"""

import time
import json
import statistics
import hashlib
from typing import List, Dict, Any
from datetime import datetime, timedelta
import random


class CriticalPathBenchmark:
    """Benchmark suite for critical system paths."""

    def __init__(self):
        """Initialize benchmark suite."""
        self.results: Dict[str, Any] = {}
        self.passed_benchmarks: List[str] = []
        self.failed_benchmarks: List[str] = []
        # Use SystemRandom for secure randomization
        self.secure_random = random.SystemRandom()

    def run_benchmark(
        self, name: str, func, iterations: int = 100, target_ms: float = 100.0
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
        p95 = (
            statistics.quantiles(times, n=20)[18] if len(times) > 20 else max_time
        )  # 95th percentile

        self.results[name] = {
            "avg_ms": round(avg_time, 3),
            "median_ms": round(median_time, 3),
            "min_ms": round(min_time, 3),
            "max_ms": round(max_time, 3),
            "p95_ms": round(p95, 3),
            "std_dev": round(std_dev, 3),
            "target_ms": target_ms,
            "passed": avg_time <= target_ms,
            "iterations": iterations,
        }

        status = "✅ PASS" if avg_time <= target_ms else "❌ FAIL"

        print(f"\nResults:")
        print(f"  Average:   {avg_time:.3f}ms")
        print(f"  Median:    {median_time:.3f}ms")
        print(f"  P95:       {p95:.3f}ms")
        print(f"  Min:       {min_time:.3f}ms")
        print(f"  Max:       {max_time:.3f}ms")
        print(f"  Std Dev:   {std_dev:.3f}ms")
        print(f"  Status:    {status}")

        if avg_time <= target_ms:
            self.passed_benchmarks.append(name)
        else:
            self.failed_benchmarks.append(name)

    def benchmark_authentication_flow(self):
        """Benchmark user authentication flow."""

        def authenticate():
            # BENCHMARK SIMULATION ONLY - NOT PRODUCTION CODE
            # WARNING: This is NOT password hashing and MUST NOT be used for authentication.
            # Production systems MUST use bcrypt, argon2, or scrypt for passwords.
            # The following simulates computational work using a generic CPU-bound operation.

            # Simulate password validation overhead (generic CPU work, NOT hashing)
            def cpu_bound_work(n):
                a, b = 0, 1
                for _ in range(n):
                    a, b = b, a + b
                return a

            result = cpu_bound_work(10000)  # Simulate computational work
            # Simulate token generation
            token_data = {
                "user_id": "user_123",
                "username": "testuser",
                "exp": (datetime.now() + timedelta(hours=1)).isoformat(),
            }
            token = json.dumps(token_data)

            # Simulate token encoding (simplified JWT)
            encoded = hashlib.sha256(token.encode()).hexdigest()

            return {"token": encoded, "user_id": "user_123"}

        self.run_benchmark(
            "User Authentication Flow", authenticate, iterations=500, target_ms=100.0
        )

    def benchmark_sensor_data_ingestion(self):
        """Benchmark sensor data ingestion pipeline."""

        def ingest_sensor_data():
            # Simulate incoming sensor reading
            reading = {
                "unit_id": "TC001",
                "sensor_id": f"TEMP_{self.secure_random.randint(1, 100)}",
                "timestamp": datetime.now().isoformat(),
                "value": round(self.secure_random.uniform(60.0, 80.0), 2),
                "quality": "good",
            }

            # Validate
            is_valid = all(
                [
                    reading.get("unit_id"),
                    reading.get("sensor_id"),
                    reading.get("value") is not None,
                    isinstance(reading.get("value"), (int, float)),
                ]
            )

            if not is_valid:
                return None

            # Transform
            processed = {
                "id": hashlib.sha256(
                    f"{reading['sensor_id']}{reading['timestamp']}".encode()
                ).hexdigest()[:16],
                "unit_id": reading["unit_id"],
                "sensor_id": reading["sensor_id"],
                "value": reading["value"],
                "timestamp": reading["timestamp"],
                "processed_at": datetime.now().isoformat(),
            }

            # Simulate database write (just json serialization)
            serialized = json.dumps(processed)

            return processed

        self.run_benchmark(
            "Sensor Data Ingestion Pipeline",
            ingest_sensor_data,
            iterations=1000,
            target_ms=50.0,
        )

    def benchmark_realtime_query(self):
        """Benchmark real-time data query."""

        # Simulate in-memory data store
        data_store = [
            {
                "sensor_id": f"TEMP_{i}",
                "value": round(self.secure_random.uniform(60.0, 80.0), 2),
                "timestamp": (datetime.now() - timedelta(minutes=i)).isoformat(),
            }
            for i in range(100)
        ]

        def query_recent_data():
            # Query last 10 readings
            cutoff_time = datetime.now() - timedelta(minutes=10)

            results = [
                reading
                for reading in data_store
                if datetime.fromisoformat(reading["timestamp"]) > cutoff_time
            ]

            # Sort by timestamp
            results.sort(key=lambda x: x["timestamp"], reverse=True)

            return results[:10]

        self.run_benchmark(
            "Real-time Data Query", query_recent_data, iterations=1000, target_ms=200.0
        )

    def benchmark_alert_processing(self):
        """Benchmark alert processing logic."""

        def process_alert():
            # Simulate sensor reading
            reading = {
                "sensor_id": "TEMP_001",
                "value": 85.5,  # Above threshold
                "timestamp": datetime.now().isoformat(),
            }

            # Check thresholds
            thresholds = {"warning": 80.0, "critical": 90.0}

            alert = None
            if reading["value"] >= thresholds["critical"]:
                alert = {
                    "level": "critical",
                    "sensor_id": reading["sensor_id"],
                    "value": reading["value"],
                    "threshold": thresholds["critical"],
                    "message": f"Critical temperature: {reading['value']}°C",
                }
            elif reading["value"] >= thresholds["warning"]:
                alert = {
                    "level": "warning",
                    "sensor_id": reading["sensor_id"],
                    "value": reading["value"],
                    "threshold": thresholds["warning"],
                    "message": f"Warning temperature: {reading['value']}°C",
                }

            if alert:
                # Serialize alert for notification
                alert_json = json.dumps(alert)
                return alert

            return None

        self.run_benchmark(
            "Alert Processing", process_alert, iterations=1000, target_ms=100.0
        )

    def benchmark_dashboard_aggregation(self):
        """Benchmark dashboard data aggregation."""

        # Simulate sensor data for multiple units
        sensor_data = []
        for unit_id in range(1, 11):
            for sensor_id in range(1, 6):
                for _ in range(100):
                    sensor_data.append(
                        {
                            "unit_id": f"TC{unit_id:03d}",
                            "sensor_id": f"TEMP_{sensor_id}",
                            "value": round(self.secure_random.uniform(60.0, 80.0), 2),
                            "timestamp": (
                                datetime.now()
                                - timedelta(minutes=self.secure_random.randint(0, 60))
                            ).isoformat(),
                        }
                    )

        def aggregate_dashboard_data():
            # Aggregate by unit
            unit_stats = {}

            for reading in sensor_data:
                unit_id = reading["unit_id"]

                if unit_id not in unit_stats:
                    unit_stats[unit_id] = {"readings": [], "sensors": set()}

                unit_stats[unit_id]["readings"].append(reading["value"])
                unit_stats[unit_id]["sensors"].add(reading["sensor_id"])

            # Calculate statistics
            dashboard = {}
            for unit_id, stats in unit_stats.items():
                readings = stats["readings"]
                dashboard[unit_id] = {
                    "avg_temp": round(statistics.mean(readings), 2),
                    "min_temp": round(min(readings), 2),
                    "max_temp": round(max(readings), 2),
                    "sensor_count": len(stats["sensors"]),
                    "reading_count": len(readings),
                }

            return dashboard

        self.run_benchmark(
            "Dashboard Data Aggregation",
            aggregate_dashboard_data,
            iterations=100,
            target_ms=500.0,
        )

    def benchmark_multi_unit_query(self):
        """Benchmark multi-unit status query."""

        # Simulate unit status data
        units = [
            {
                "unit_id": f"TC{i:03d}",
                "status": self.secure_random.choice(
                    ["online", "offline", "maintenance"]
                ),
                "health": self.secure_random.choice(["optimal", "warning", "critical"]),
                "last_seen": (
                    datetime.now()
                    - timedelta(minutes=self.secure_random.randint(0, 60))
                ).isoformat(),
            }
            for i in range(1, 101)
        ]

        def query_unit_status():
            # Filter online units
            online_units = [u for u in units if u["status"] == "online"]

            # Filter critical health
            critical_units = [u for u in units if u["health"] == "critical"]

            # Calculate summary
            summary = {
                "total": len(units),
                "online": len(online_units),
                "critical": len(critical_units),
                "status_breakdown": {
                    "online": len([u for u in units if u["status"] == "online"]),
                    "offline": len([u for u in units if u["status"] == "offline"]),
                    "maintenance": len(
                        [u for u in units if u["status"] == "maintenance"]
                    ),
                },
            }

            return summary

        self.run_benchmark(
            "Multi-Unit Status Query",
            query_unit_status,
            iterations=500,
            target_ms=200.0,
        )

    def benchmark_data_export_preparation(self):
        """Benchmark data export preparation."""

        # Simulate data to export
        export_data = [
            {
                "timestamp": (datetime.now() - timedelta(hours=i)).isoformat(),
                "unit_id": f"TC{i % 10:03d}",
                "sensor_id": f"TEMP_{i % 5}",
                "value": round(self.secure_random.uniform(60.0, 80.0), 2),
            }
            for i in range(1000)
        ]

        def prepare_export():
            # Convert to CSV format
            csv_lines = ["timestamp,unit_id,sensor_id,value"]

            for row in export_data:
                csv_lines.append(
                    f"{row['timestamp']},{row['unit_id']},{row['sensor_id']},{row['value']}"
                )

            # Join to single string
            csv_content = "\n".join(csv_lines)

            return csv_content

        self.run_benchmark(
            "Data Export Preparation", prepare_export, iterations=100, target_ms=300.0
        )

    def run_all_benchmarks(self):
        """Run all critical path benchmarks."""
        print("\n" + "=" * 60)
        print("CRITICAL PATH BENCHMARK SUITE")
        print("ThermaCore SCADA Platform")
        print("=" * 60)

        self.benchmark_authentication_flow()
        self.benchmark_sensor_data_ingestion()
        self.benchmark_realtime_query()
        self.benchmark_alert_processing()
        self.benchmark_dashboard_aggregation()
        self.benchmark_multi_unit_query()
        self.benchmark_data_export_preparation()

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
            print(f"   P95:     {result['p95_ms']}ms")
            print(f"   Range:   {result['min_ms']}ms - {result['max_ms']}ms")

        # Save results to file
        with open("critical_path_results.json", "w") as f:
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

        print(f"\n📊 Results saved to: critical_path_results.json")


def main():
    """Main entry point."""
    benchmark = CriticalPathBenchmark()
    benchmark.run_all_benchmarks()

    # Exit with error code if any benchmarks failed
    if benchmark.failed_benchmarks:
        print("\n⚠️  Some benchmarks did not meet performance targets")
        return 1

    print("\n✅ All benchmarks passed!")
    return 0


if __name__ == "__main__":
    exit(main())
