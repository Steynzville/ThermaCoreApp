"""Performance testing script for ThermaCore SCADA API using Locust."""
import random
from datetime import datetime

from locust import HttpUser, task, between


class ThermaCoreSCADAUser(HttpUser):
    """Simulates a user interacting with the ThermaCore SCADA API."""

    wait_time = between(1, 3)  # Wait 1-3 seconds between tasks

    def on_start(self):
        """Called when a user starts. Login and get auth token."""
        self.login()

    def login(self):
        """Login and store auth token."""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })

        if response.status_code == 200:
            data = response.json()
            self.auth_token = data['access_token']
            self.headers = {'Authorization': f'Bearer {self.auth_token}'}
        else:
            self.auth_token = None
            self.headers = {}

    @task(5)
    def get_units(self):
        """Get units list - most common operation."""
        self.client.get("/api/v1/units", headers=self.headers)

    @task(3)
    def get_units_with_pagination(self):
        """Get units with pagination."""
        page = random.randint(1, 3)
        per_page = random.choice([10, 25, 50])
        self.client.get(f"/api/v1/units?page={page}&per_page={per_page}", 
                       headers=self.headers)

    @task(3)
    def get_units_with_filters(self):
        """Get units with various filters."""
        filters = [
            "status=online",
            "health_status=optimal",
            "search=Unit",
            "status=online&health_status=optimal"
        ]
        filter_param = random.choice(filters)
        self.client.get(f"/api/v1/units?{filter_param}", headers=self.headers)

    @task(2)
    def get_unit_by_id(self):
        """Get specific unit by ID."""
        # Assume we have units with IDs TEST001, TC001, etc.
        unit_ids = ["TEST001", "TC001", "TC002", "TC003"]
        unit_id = random.choice(unit_ids)
        self.client.get(f"/api/v1/units/{unit_id}", headers=self.headers)

    @task(2)
    def get_unit_sensors(self):
        """Get sensors for a unit."""
        unit_ids = ["TEST001", "TC001", "TC002"]
        unit_id = random.choice(unit_ids)
        self.client.get(f"/api/v1/units/{unit_id}/sensors", headers=self.headers)

    @task(2)
    def get_unit_readings(self):
        """Get sensor readings for a unit."""
        unit_ids = ["TEST001", "TC001", "TC002"]
        unit_id = random.choice(unit_ids)
        hours = random.choice([1, 6, 12, 24])
        self.client.get(f"/api/v1/units/{unit_id}/readings?hours={hours}", 
                       headers=self.headers)

    @task(1)
    def get_unit_stats(self):
        """Get unit statistics."""
        self.client.get("/api/v1/units/stats", headers=self.headers)

    @task(1)
    def update_unit_status(self):
        """Update unit status - simulate real-time updates."""
        unit_ids = ["TEST001", "TC001", "TC002"]
        unit_id = random.choice(unit_ids)

        status_data = {
            "status": random.choice(["online", "offline", "maintenance"]),
            "health_status": random.choice(["optimal", "warning", "critical"]),
            "has_alert": random.choice([True, False]),
            "has_alarm": random.choice([True, False])
        }

        self.client.patch(f"/api/v1/units/{unit_id}/status",
                         json=status_data, headers=self.headers)

    @task(1)
    def get_users(self):
        """Get users list - admin operations."""
        self.client.get("/api/v1/users", headers=self.headers)

    @task(1)
    def get_user_stats(self):
        """Get user statistics."""
        self.client.get("/api/v1/users/stats", headers=self.headers)

    @task(1)
    def get_current_user(self):
        """Get current user info."""
        self.client.get("/api/v1/auth/me", headers=self.headers)


class ThermaCoreCRUDUser(HttpUser):
    """Simulates a user performing CRUD operations."""

    wait_time = between(2, 5)

    def on_start(self):
        """Login and get auth token."""
        self.login()
        self.created_units = []

    def login(self):
        """Login and store auth token."""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })

        if response.status_code == 200:
            data = response.json()
            self.auth_token = data['access_token']
            self.headers = {'Authorization': f'Bearer {self.auth_token}'}
        else:
            self.auth_token = None
            self.headers = {}

    @task(2)
    def create_unit(self):
        """Create a new unit."""
        unit_id = f"PERF{random.randint(1000, 9999)}"

        unit_data = {
            "id": unit_id,
            "name": f"Performance Test Unit {unit_id}",
            "serial_number": f"{unit_id}-2024-{random.randint(100, 999)}",
            "install_date": datetime.utcnow().isoformat(),
            "location": f"Test Site {random.randint(1, 10)}",
            "client_name": f"Test Client {random.randint(1, 5)}",
            "client_email": f"client{random.randint(1, 5)}@test.com"
        }

        response = self.client.post("/api/v1/units", json=unit_data, headers=self.headers)

        if response.status_code == 201:
            self.created_units.append(unit_id)

    @task(3)
    def read_random_unit(self):
        """Read a random unit."""
        if self.created_units:
            unit_id = random.choice(self.created_units)
            self.client.get(f"/api/v1/units/{unit_id}", headers=self.headers)

    @task(2)
    def update_random_unit(self):
        """Update a random unit."""
        if self.created_units:
            unit_id = random.choice(self.created_units)

            update_data = {
                "name": f"Updated Unit {unit_id}",
                "status": random.choice(["online", "offline", "maintenance"]),
                "health_status": random.choice(["optimal", "warning", "critical"]),
                "temp_outside": round(random.uniform(-10, 40), 1),
                "humidity": round(random.uniform(30, 90), 1),
                "battery_level": round(random.uniform(10, 100), 1)
            }

            self.client.put(f"/api/v1/units/{unit_id}", json=update_data, headers=self.headers)

    @task(1)
    def delete_random_unit(self):
        """Delete a random unit."""
        if self.created_units and len(self.created_units) > 2:
            unit_id = self.created_units.pop()
            self.client.delete(f"/api/v1/units/{unit_id}", headers=self.headers)

    def on_stop(self):
        """Cleanup created units when stopping."""
        for unit_id in self.created_units:
            self.client.delete(f"/api/v1/units/{unit_id}", headers=self.headers)


class ThermaCoreSensorDataUser(HttpUser):
    """Simulates sensor data operations - time-series heavy."""

    wait_time = between(0.5, 2)

    def on_start(self):
        """Login and get auth token."""
        self.login()

    def login(self):
        """Login and store auth token."""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "operator",
            "password": "operator123"
        })

        if response.status_code == 200:
            data = response.json()
            self.auth_token = data['access_token']
            self.headers = {'Authorization': f'Bearer {self.auth_token}'}
        else:
            self.auth_token = None
            self.headers = {}

    @task(10)
    def get_recent_readings(self):
        """Get recent sensor readings - most frequent operation for monitoring."""
        unit_ids = ["TEST001", "TC001", "TC002", "TC003"]
        unit_id = random.choice(unit_ids)
        hours = random.choice([1, 3, 6, 12, 24])

        self.client.get(f"/api/v1/units/{unit_id}/readings?hours={hours}", 
                       headers=self.headers)

    @task(5)
    def get_readings_by_sensor_type(self):
        """Get readings filtered by sensor type."""
        unit_ids = ["TEST001", "TC001", "TC002"]
        unit_id = random.choice(unit_ids)
        sensor_types = ["temperature", "humidity", "pressure", "level"]
        sensor_type = random.choice(sensor_types)

        self.client.get(f"/api/v1/units/{unit_id}/readings?sensor_type={sensor_type}&hours=6", 
                       headers=self.headers)

    @task(3)
    def get_unit_sensors(self):
        """Get all sensors for a unit."""
        unit_ids = ["TEST001", "TC001", "TC002"]
        unit_id = random.choice(unit_ids)

        self.client.get(f"/api/v1/units/{unit_id}/sensors", headers=self.headers)

    @task(1)
    def create_sensor(self):
        """Create a new sensor for testing."""
        unit_ids = ["TEST001"]  # Only create for test unit
        unit_id = random.choice(unit_ids)

        sensor_types = ["temperature", "humidity", "pressure", "level", "power"]
        sensor_type = random.choice(sensor_types)

        sensor_data = {
            "name": f"Perf Test {sensor_type.title()} Sensor {random.randint(100, 999)}",
            "sensor_type": sensor_type,
            "unit_of_measurement": "°C" if sensor_type == "temperature" else "%",
            "min_value": 0.0,
            "max_value": 100.0
        }

        self.client.post(f"/api/v1/units/{unit_id}/sensors",
                        json=sensor_data, headers=self.headers)


class ThermaCoreDNP3PerformanceUser(HttpUser):
    """Simulates DNP3 protocol operations for performance testing."""

    wait_time = between(1, 3)

    def on_start(self):
        """Login and setup test environment."""
        self.login()
        self.setup_dnp3_devices()

    def login(self):
        """Login and store auth token."""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })

        if response.status_code == 200:
            data = response.json()
            self.auth_token = data['access_token']
            self.headers = {'Authorization': f'Bearer {self.auth_token}'}
        else:
            self.auth_token = None
            self.headers = {}

    def setup_dnp3_devices(self):
        """Setup test DNP3 devices for performance testing."""
        # Create test DNP3 devices
        test_devices = [
            {
                'device_id': 'DNP3_PERF_01',
                'master_address': 1,
                'outstation_address': 10,
                'host': 'localhost',
                'port': 20000
            },
            {
                'device_id': 'DNP3_PERF_02',
                'master_address': 1,
                'outstation_address': 11,
                'host': 'localhost',
                'port': 20001
            }
        ]

        for device in test_devices:
            self.client.post("/api/v1/multiprotocol/protocols/dnp3/devices",
                           json=device, headers=self.headers)
            # Connect the device
            self.client.post(f"/api/v1/multiprotocol/protocols/dnp3/devices/{device['device_id']}/connect",
                           headers=self.headers)

    @task(8)
    def read_dnp3_device_data(self):
        """Read data from DNP3 devices - primary operation."""
        device_ids = ['DNP3_PERF_01', 'DNP3_PERF_02']
        device_id = random.choice(device_ids)

        response = self.client.get(f"/api/v1/multiprotocol/protocols/dnp3/devices/{device_id}/data",
                                 headers=self.headers)

        # Track response for performance analysis
        if hasattr(response, 'request'):
            with self.client.request_event.fire(
                request_type="GET",
                name="dnp3_device_data",
                response_time=response.elapsed.total_seconds() * 1000,
                response_length=len(response.content) if response.content else 0,
                response=response,
                context={}
            ):
                pass

    @task(3)
    def perform_dnp3_integrity_poll(self):
        """Perform integrity polls on DNP3 devices."""
        device_ids = ['DNP3_PERF_01', 'DNP3_PERF_02']
        device_id = random.choice(device_ids)

        response = self.client.post(f"/api/v1/multiprotocol/protocols/dnp3/devices/{device_id}/integrity-poll",
                                  headers=self.headers)

        # Track performance for integrity polls specifically
        if hasattr(response, 'request'):
            with self.client.request_event.fire(
                request_type="POST",
                name="dnp3_integrity_poll",
                response_time=response.elapsed.total_seconds() * 1000,
                response_length=len(response.content) if response.content else 0,
                response=response,
                context={}
            ):
                pass

    @task(2)
    def get_dnp3_performance_summary(self):
        """Get DNP3 performance metrics."""
        self.client.get("/api/v1/multiprotocol/protocols/dnp3/performance/summary",
                       headers=self.headers)

    @task(1)
    def get_dnp3_performance_metrics(self):
        """Get detailed DNP3 performance metrics."""
        self.client.get("/api/v1/multiprotocol/protocols/dnp3/performance/metrics",
                       headers=self.headers)

    @task(1)
    def get_device_performance_stats(self):
        """Get performance stats for specific DNP3 devices."""
        device_ids = ['DNP3_PERF_01', 'DNP3_PERF_02']
        device_id = random.choice(device_ids)

        self.client.get(f"/api/v1/multiprotocol/protocols/dnp3/devices/{device_id}/performance",
                       headers=self.headers)


class ThermaCoreDNP3OptimizationUser(HttpUser):
    """Tests DNP3 optimization features specifically."""

    wait_time = between(2, 5)  # Longer wait for optimization tests

    def on_start(self):
        """Login and setup optimization test environment."""
        self.login()
        self.setup_optimization_test()

    def login(self):
        """Login and store auth token."""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })

        if response.status_code == 200:
            data = response.json()
            self.auth_token = data['access_token']
            self.headers = {'Authorization': f'Bearer {self.auth_token}'}
        else:
            self.auth_token = None
            self.headers = {}

    def setup_optimization_test(self):
        """Setup devices for testing optimization features."""
        # Enable all optimizations
        self.client.post("/api/v1/multiprotocol/protocols/dnp3/performance/config",
                        json={'enable_caching': True, 'enable_bulk_operations': True},
                        headers=self.headers)

        # Create test device
        device = {
            'device_id': 'DNP3_OPT_TEST',
            'master_address': 1,
            'outstation_address': 20,
            'host': 'localhost',
            'port': 20002
        }

        self.client.post("/api/v1/multiprotocol/protocols/dnp3/devices",
                       json=device, headers=self.headers)
        self.client.post(f"/api/v1/multiprotocol/protocols/dnp3/devices/{device['device_id']}/connect",
                       headers=self.headers)

    @task(10)
    def test_caching_performance(self):
        """Test performance with caching - rapid repeated reads."""
        device_id = 'DNP3_OPT_TEST'

        # Perform multiple rapid reads to test cache effectiveness
        import time
        for _ in range(3):
            self.client.get(f"/api/v1/multiprotocol/protocols/dnp3/devices/{device_id}/data",
                                     headers=self.headers)
            time.sleep(0.1)  # Short delay between reads

    @task(5)
    def test_bulk_operations(self):
        """Test bulk operation performance."""
        device_id = 'DNP3_OPT_TEST'

        # Perform integrity poll which uses bulk operations
        self.client.post(f"/api/v1/multiprotocol/protocols/dnp3/devices/{device_id}/integrity-poll",
                       headers=self.headers)

    @task(3)
    def toggle_optimization_features(self):
        """Test toggling optimization features."""
        # Randomly enable/disable optimizations to test impact
        config = {
            'enable_caching': random.choice([True, False]),
            'enable_bulk_operations': random.choice([True, False])
        }

        self.client.post("/api/v1/multiprotocol/protocols/dnp3/performance/config",
                        json=config, headers=self.headers)

    @task(1)
    def clear_metrics_for_fresh_test(self):
        """Clear metrics to start fresh performance measurements."""
        self.client.delete("/api/v1/multiprotocol/protocols/dnp3/performance/metrics",
                         headers=self.headers)


# Performance test scenarios
if __name__ == "__main__":
    print("""
    Performance Testing Scripts for ThermaCore SCADA API

    To run these tests, use Locust:

    1. Install Locust: pip install locust

    2. Run basic read-heavy test:
       locust -f performance_tests.py --host=http://localhost:5000 ThermaCoreSCADAUser

    3. Run CRUD operations test:
       locust -f performance_tests.py --host=http://localhost:5000 ThermaCoreCRUDUser

    4. Run sensor data heavy test:
       locust -f performance_tests.py --host=http://localhost:5000 ThermaCoreSensorDataUser

    5. Run all user types together:
       locust -f performance_tests.py --host=http://localhost:5000

    Recommended test parameters:
    - Start with 10 users, spawn rate 2/sec
    - Monitor response times, especially for:
      - GET /api/v1/units (should be < 200ms)
      - GET /api/v1/units/{id} (should be < 100ms)
      - GET /api/v1/units/{id}/readings (should be < 500ms for 24h data)

    Performance targets:
    - 95th percentile response time < 1000ms
    - Throughput > 100 requests/second
    - Error rate < 1%
    - Database query time < 100ms for simple reads
    """)